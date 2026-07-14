import express from 'express';
import prisma from '../lib/prismaClient.js';
import { screenAbstract, SCREENER_MODEL, PROMPT_VERSION } from '../services/screener.js';
import { embedText, EMBEDDING_MODEL } from '../services/embedder.js';
import { log } from '../lib/logger.js';

const router = express.Router();

/**
 * POST /api/screen
 * Body:
 *   {
 *     abstract: string,
 *     criteria: { include: string[], exclude: string[] },
 *     studyId?: string     // optional — persist embedding to that Study
 *   }
 * Response:
 *   {
 *     decision, reason, embedding,
 *     metadata: { model, embeddingModel, promptVersion, prompt, timestamp }
 *   }
 */
router.post('/', async (req, res, next) => {
  try {
    const { abstract, criteria, studyId } = req.body ?? {};

    if (typeof abstract !== 'string' || abstract.trim().length === 0) {
      return res
        .status(400)
        .json({ error: '`abstract` must be a non-empty string' });
    }
    if (
      !criteria ||
      !Array.isArray(criteria.include) ||
      !Array.isArray(criteria.exclude)
    ) {
      return res.status(400).json({
        error: '`criteria` must be { include: string[], exclude: string[] }',
      });
    }

    // Run screening + embedding in parallel for speed.
    const [screen, embedding] = await Promise.all([
      screenAbstract(abstract, criteria),
      embedText(abstract),
    ]);

    if (typeof studyId === 'string' && studyId.length > 0) {
      try {
        await prisma.study.update({
          where: { id: studyId },
          data: { embedding },
        });
        log('screen_persist_embedding', { studyId, dimensions: embedding.length });
      } catch (error) {
        // Non-fatal: log and continue. The client still receives the AI output.
        log('screen_persist_embedding_failed', {
          studyId,
          errorMessage: error?.message ?? String(error),
        });
      }
    }

    res.json({
      decision: screen.decision,
      reason: screen.reason,
      embedding,
      metadata: {
        model: SCREENER_MODEL,
        embeddingModel: EMBEDDING_MODEL,
        promptVersion: PROMPT_VERSION,
        prompt: screen.metadata.prompt,
        timestamp: screen.metadata.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
