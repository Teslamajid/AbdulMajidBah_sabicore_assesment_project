import { getOpenAIClient } from '../lib/openaiClient.js';
import { log, logError } from '../lib/logger.js';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for the provided text.
 *
 * Throws on any API error or malformed response — no silent defaults.
 *
 * @param {string} text  Non-empty text to embed.
 * @returns {Promise<number[]>} Float array of length {@link EMBEDDING_DIMENSIONS}.
 */
export async function embedText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('embedText: text must be a non-empty string');
  }
  const client = getOpenAIClient();

  let response;
  try {
    response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
  } catch (error) {
    logError('embed_api_error', error, { inputLength: text.length });
    throw error;
  }

  const embedding = response?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('embedText: OpenAI returned no embedding vector');
  }

  log('embed', {
    model: EMBEDDING_MODEL,
    inputLength: text.length,
    dimensions: embedding.length,
  });

  return embedding;
}

export default embedText;
