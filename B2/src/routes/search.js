import express from 'express';
import { fetchFromOpenAlex } from '../services/openalexClient.js';
import { fetchFromPubMed } from '../services/pubmedClient.js';
import { normalizeOpenAlex, normalizePubMed } from '../services/normalizer.js';
import { log } from '../lib/logger.js';

const router = express.Router();

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;
const VALID_SOURCES = new Set(['openalex', 'pubmed']);

/**
 * GET /api/search
 * Query params:
 *   query  (required)
 *   source ("openalex" | "pubmed"; default "openalex")
 *   limit  (number, default 50, max 500)
 * Response:
 *   { source, count, studies: NormalizedStudy[] }
 */
router.get('/', async (req, res, next) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (!query) {
      return res
        .status(400)
        .json({ error: 'Missing required "query" parameter' });
    }

    const source = (req.query.source ?? 'openalex').toString().toLowerCase();
    if (!VALID_SOURCES.has(source)) {
      return res
        .status(400)
        .json({ error: `Invalid source "${source}". Must be one of: openalex, pubmed` });
    }

    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    log('search_request', { query, source, limit });

    let studies;
    if (source === 'openalex') {
      const raw = await fetchFromOpenAlex(query, limit);
      studies = raw.map(normalizeOpenAlex);
    } else {
      const raw = await fetchFromPubMed(query, limit);
      studies = raw.map(normalizePubMed);
    }

    return res.json({ source, count: studies.length, studies });
  } catch (error) {
    next(error);
  }
});

export default router;
