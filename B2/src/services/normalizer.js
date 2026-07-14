/**
 * Normalize an OpenAlex `Work` into the shared study shape.
 *
 * @param {object} rawWork  Raw OpenAlex work object.
 * @returns {NormalizedStudy}
 */
export function normalizeOpenAlex(rawWork) {
  return {
    title: rawWork?.title ?? rawWork?.display_name ?? 'Untitled',
    doi: extractOpenAlexDoi(rawWork?.doi),
    abstract: reconstructAbstract(rawWork?.abstract_inverted_index),
    year: typeof rawWork?.publication_year === 'number'
      ? rawWork.publication_year
      : null,
    authors: extractOpenAlexAuthors(rawWork?.authorships),
    source: 'openalex',
    openAccessUrl: rawWork?.open_access?.oa_url ?? null,
  };
}

/**
 * Normalize a raw PubMed article (as produced by pubmedClient.parsePubMedXml)
 * into the shared study shape.
 *
 * @param {object} article
 * @returns {NormalizedStudy}
 */
export function normalizePubMed(article) {
  return {
    title: article?.title || 'Untitled',
    doi: article?.doi ?? null,
    abstract: article?.abstract ?? null,
    year: typeof article?.year === 'number' ? article.year : null,
    authors: Array.isArray(article?.authors) ? article.authors : [],
    source: 'pubmed',
    // PubMed E-utilities does not expose open-access URLs directly.
    openAccessUrl: null,
  };
}

/* ------------------------------------------------------------------------ */

function extractOpenAlexDoi(doi) {
  if (!doi) return null;
  // OpenAlex returns DOIs as full URLs (e.g. "https://doi.org/10.xxxx/yyyy").
  // Strip the URL prefix so we store the bare DOI.
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
}

function extractOpenAlexAuthors(authorships) {
  if (!Array.isArray(authorships)) return [];
  return authorships
    .map((a) => a?.author?.display_name)
    .filter((name) => typeof name === 'string' && name.length > 0);
}

/**
 * OpenAlex delivers abstracts as an inverted index:
 *   { "word": [position1, position2, ...], ... }
 * Reconstruct the plain-text abstract by placing each word at its position(s).
 */
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const positions = [];
  for (const [word, indices] of Object.entries(invertedIndex)) {
    if (!Array.isArray(indices)) continue;
    for (const idx of indices) {
      if (Number.isInteger(idx) && idx >= 0) positions.push([idx, word]);
    }
  }
  if (positions.length === 0) return null;
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, word]) => word).join(' ');
}

/**
 * @typedef {object} NormalizedStudy
 * @property {string}       title
 * @property {string|null}  doi
 * @property {string|null}  abstract
 * @property {number|null}  year
 * @property {string[]}     authors
 * @property {"openalex"|"pubmed"} source
 * @property {string|null}  openAccessUrl
 */

export default { normalizeOpenAlex, normalizePubMed };
