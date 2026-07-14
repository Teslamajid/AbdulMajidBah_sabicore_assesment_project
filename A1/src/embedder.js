import { getOpenAIClient } from './openaiClient.js';
import { log, logError } from './logger.js';

/** Default embedding model. Overridable via A1_EMBEDDING_MODEL. */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

/** Expected dimensionality for text-embedding-3-small. */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for the provided text.
 *
 * Throws on any API error or malformed response — no silent defaults.
 *
 * @param {string} text  Non-empty input text.
 * @param {object} [options]
 * @param {string} [options.model]  Override the default embedding model.
 * @returns {Promise<number[]>} Float vector (length {@link EMBEDDING_DIMENSIONS}
 *                              for the default model).
 */
export async function embedText(text, options = {}) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('embedText: `text` must be a non-empty string');
  }

  const model =
    options.model ?? process.env.A1_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const client = getOpenAIClient();

  let response;
  try {
    response = await client.embeddings.create({ model, input: text });
  } catch (error) {
    logError('embed_api_error', error, { model, inputLength: text.length });
    throw error;
  }

  const embedding = response?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('embedText: OpenAI returned no embedding vector');
  }

  log('embed', {
    model,
    inputLength: text.length,
    dimensions: embedding.length,
  });

  return embedding;
}

export default embedText;
