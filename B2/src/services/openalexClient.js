import { log, logError } from '../lib/logger.js';
import { withRetry, sleep } from '../lib/retry.js';

const OPENALEX_BASE = 'https://api.openalex.org/works';
const PER_PAGE = 200;                // OpenAlex max per page
const PAGE_DELAY_MS = 1000;          // Politeness delay between pages
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fetch works from OpenAlex using cursor-based pagination.
 *
 * @param {string} query          Full-text search query.
 * @param {number} [maxResults=500] Maximum number of raw works to collect.
 * @returns {Promise<object[]>}   Array of raw OpenAlex `Work` objects.
 */
export async function fetchFromOpenAlex(query, maxResults = 500) {
  if (!query || typeof query !== 'string') {
    throw new Error('fetchFromOpenAlex: query must be a non-empty string');
  }

  const collected = [];
  let cursor = '*';
  let page = 0;

  while (cursor && collected.length < maxResults) {
    page += 1;
    const remaining = maxResults - collected.length;
    const perPage = Math.min(PER_PAGE, remaining);

    const url = buildUrl(query, cursor, perPage);
    const body = await withRetry(() => fetchJson(url), {
      maxAttempts: 3,
      baseDelayMs: 1000,
      label: `openalex page ${page}`,
    });

    const results = Array.isArray(body?.results) ? body.results : [];
    collected.push(...results);
    log('openalex_page', {
      page,
      cursor,
      pageCount: results.length,
      collected: collected.length,
    });

    cursor = body?.meta?.next_cursor ?? null;
    if (cursor && collected.length < maxResults) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return collected.slice(0, maxResults);
}

function buildUrl(query, cursor, perPage) {
  const params = new URLSearchParams({
    search: query,
    'per-page': String(perPage),
    cursor,
  });
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) params.set('mailto', mailto);
  return `${OPENALEX_BASE}?${params.toString()}`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `OpenAlex request failed: ${response.status} ${response.statusText} ${text}`,
      );
    }
    return await response.json();
  } catch (error) {
    logError('openalex_fetch_error', error, { url });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default fetchFromOpenAlex;
