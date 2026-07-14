import express from 'express';
import prisma from '../lib/prismaClient.js';
import { log } from '../lib/logger.js';

const router = express.Router();

/**
 * GET /api/studies
 * Query params:
 *   limit  (number, default 100)
 *   source (optional filter: "openalex" | "pubmed")
 * Response:
 *   { count, studies: Study[] }  (embedding field omitted from response)
 */
router.get('/', async (req, res, next) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
    const take = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;

    const studies = await prisma.study.findMany({
      where: source ? { source } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      // Explicitly omit `embedding` (potentially 1536 floats per row).
      select: {
        id: true,
        title: true,
        doi: true,
        abstract: true,
        year: true,
        authors: true,
        source: true,
        openAccessUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ count: studies.length, studies });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/studies
 * Body: NormalizedStudy | NormalizedStudy[]
 * Response: { created: number, updated: number }
 *
 * Upserts by DOI when present. Records without a DOI are always created.
 */
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : body ? [body] : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Request body must be a study or an array of studies' });
    }

    let created = 0;
    let updated = 0;

    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const data = sanitizeStudy(raw);
      if (!data.title) continue;

      if (data.doi) {
        const existing = await prisma.study.findUnique({ where: { doi: data.doi } });
        if (existing) {
          await prisma.study.update({ where: { doi: data.doi }, data });
          updated += 1;
        } else {
          await prisma.study.create({ data });
          created += 1;
        }
      } else {
        await prisma.study.create({ data });
        created += 1;
      }
    }

    log('studies_upsert', { total: items.length, created, updated });
    res.status(201).json({ created, updated });
  } catch (error) {
    next(error);
  }
});

function sanitizeStudy(raw) {
  return {
    title: typeof raw.title === 'string' ? raw.title : 'Untitled',
    doi: typeof raw.doi === 'string' && raw.doi.length > 0 ? raw.doi : null,
    abstract: typeof raw.abstract === 'string' ? raw.abstract : null,
    year: Number.isFinite(raw.year) ? raw.year : null,
    authors: Array.isArray(raw.authors) ? raw.authors.filter((a) => typeof a === 'string') : [],
    source: typeof raw.source === 'string' ? raw.source : 'unknown',
    openAccessUrl:
      typeof raw.openAccessUrl === 'string' && raw.openAccessUrl.length > 0
        ? raw.openAccessUrl
        : null,
    embedding: Array.isArray(raw.embedding) ? raw.embedding : [],
  };
}

export default router;
