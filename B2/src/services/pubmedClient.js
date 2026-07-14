import { log, logError } from '../lib/logger.js';
import { withRetry, sleep } from '../lib/retry.js';

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const BATCH_SIZE = 200;
const BATCH_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fetch PubMed articles matching a query.
 * Two-step E-utilities flow:
 *   1. `esearch` (JSON) → PMIDs (via WebEnv/QueryKey history)
 *   2. `efetch` (XML)   → article records, in batches of BATCH_SIZE
 *
 * @param {string} query
 * @param {number} [maxResults=500]
 * @returns {Promise<object[]>} Array of raw PubMed article objects.
 */
export async function fetchFromPubMed(query, maxResults = 500) {
  if (!query || typeof query !== 'string') {
    throw new Error('fetchFromPubMed: query must be a non-empty string');
  }

  const searchResult = await withRetry(() => esearch(query, maxResults), {
    maxAttempts: 3,
    baseDelayMs: 1000,
    label: 'pubmed esearch',
  });

  const { webEnv, queryKey, count } = searchResult;
  const targetCount = Math.min(count, maxResults);
  log('pubmed_esearch', { query, count, targetCount });

  if (targetCount === 0) return [];

  const articles = [];
  let retstart = 0;
  while (retstart < targetCount) {
    const retmax = Math.min(BATCH_SIZE, targetCount - retstart);
    const xml = await withRetry(
      () => efetchXml(webEnv, queryKey, retstart, retmax),
      { maxAttempts: 3, baseDelayMs: 1000, label: `pubmed efetch ${retstart}` },
    );
    const batch = parsePubMedXml(xml);
    articles.push(...batch);
    log('pubmed_batch', { retstart, retmax, batchCount: batch.length });

    retstart += retmax;
    if (retstart < targetCount) await sleep(BATCH_DELAY_MS);
  }

  return articles.slice(0, maxResults);
}

async function esearch(query, maxResults) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: String(maxResults),
    retmode: 'json',
    usehistory: 'y',
  });
  applyCredentials(params);
  const url = `${EUTILS_BASE}/esearch.fcgi?${params.toString()}`;
  const body = await fetchJson(url);
  const info = body?.esearchresult;
  if (!info) throw new Error('PubMed esearch: unexpected response shape');
  return {
    webEnv: info.webenv,
    queryKey: info.querykey,
    count: parseInt(info.count, 10) || 0,
    ids: info.idlist ?? [],
  };
}

async function efetchXml(webEnv, queryKey, retstart, retmax) {
  const params = new URLSearchParams({
    db: 'pubmed',
    WebEnv: webEnv,
    query_key: queryKey,
    retstart: String(retstart),
    retmax: String(retmax),
    retmode: 'xml',
  });
  applyCredentials(params);
  const url = `${EUTILS_BASE}/efetch.fcgi?${params.toString()}`;
  return fetchText(url);
}

function applyCredentials(params) {
  const apiKey = process.env.PUBMED_API_KEY;
  const email = process.env.PUBMED_EMAIL;
  if (apiKey) params.set('api_key', apiKey);
  if (email) params.set('email', email);
  params.set('tool', 'sabi-core-b2');
}

async function fetchJson(url) {
  const text = await fetchText(url, { Accept: 'application/json' });
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`PubMed JSON parse error: ${error.message}`);
  }
}

async function fetchText(url, extraHeaders = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/xml', ...extraHeaders },
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `PubMed request failed: ${response.status} ${response.statusText} ${errorBody}`,
      );
    }
    return await response.text();
  } catch (error) {
    logError('pubmed_fetch_error', error, { url });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* -----------------------------------------------------------------------
 * XML parsing (no external parser dependency)
 * We extract only the fields we care about via targeted regexes. This is
 * intentionally conservative: unknown/nested markup is preserved as raw text
 * where possible so the normalizer can still work with malformed inputs.
 * -------------------------------------------------------------------- */

function parsePubMedXml(xml) {
  const articles = [];
  const articleRegex = /<PubmedArticle\b[\s\S]*?<\/PubmedArticle>/g;
  const matches = xml.match(articleRegex) ?? [];
  for (const raw of matches) {
    articles.push({
      pmid: extractText(raw, /<PMID\b[^>]*>([\s\S]*?)<\/PMID>/),
      title: decodeEntities(
        stripTags(extractText(raw, /<ArticleTitle\b[^>]*>([\s\S]*?)<\/ArticleTitle>/)),
      ),
      abstract: extractAbstract(raw),
      year: extractYear(raw),
      authors: extractAuthors(raw),
      doi: extractDoi(raw),
    });
  }
  return articles;
}

function extractText(source, regex) {
  const match = source.match(regex);
  return match ? match[1].trim() : '';
}

function extractAbstract(source) {
  // Abstract may contain multiple <AbstractText> segments (e.g. structured
  // abstracts with Label attributes). Concatenate them in document order.
  const segmentRegex = /<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/g;
  const segments = [];
  let match;
  while ((match = segmentRegex.exec(source)) !== null) {
    const attrs = match[1];
    const content = decodeEntities(stripTags(match[2])).trim();
    if (!content) continue;
    const labelMatch = attrs.match(/Label="([^"]+)"/);
    segments.push(labelMatch ? `${labelMatch[1]}: ${content}` : content);
  }
  return segments.length ? segments.join(' ') : null;
}

function extractYear(source) {
  const pubDate = extractText(
    source,
    /<PubDate\b[^>]*>([\s\S]*?)<\/PubDate>/,
  );
  const yearMatch = pubDate.match(/<Year\b[^>]*>(\d{4})<\/Year>/);
  if (yearMatch) return parseInt(yearMatch[1], 10);
  const medlineDate = pubDate.match(/(\d{4})/);
  return medlineDate ? parseInt(medlineDate[1], 10) : null;
}

function extractAuthors(source) {
  const authors = [];
  const authorBlockRegex = /<Author\b[\s\S]*?<\/Author>/g;
  const blocks = source.match(authorBlockRegex) ?? [];
  for (const block of blocks) {
    const lastName = extractText(block, /<LastName\b[^>]*>([\s\S]*?)<\/LastName>/);
    const initials = extractText(block, /<Initials\b[^>]*>([\s\S]*?)<\/Initials>/);
    const collective = extractText(
      block,
      /<CollectiveName\b[^>]*>([\s\S]*?)<\/CollectiveName>/,
    );
    if (lastName) {
      authors.push(initials ? `${lastName}, ${initials}` : lastName);
    } else if (collective) {
      authors.push(decodeEntities(collective));
    }
  }
  return authors;
}

function extractDoi(source) {
  const doiRegex =
    /<ArticleId\b[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i;
  const match = source.match(doiRegex);
  return match ? match[1].trim() : null;
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, '');
}

function decodeEntities(input) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

export default fetchFromPubMed;
