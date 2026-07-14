// Public API surface for consumers importing A1 as a library.
export {
  screenAbstract,
  DEFAULT_SCREENER_MODEL,
  PROMPT_VERSION,
} from './screener.js';

export {
  embedText,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from './embedder.js';

export { log, logError } from './logger.js';
export { getOpenAIClient } from './openaiClient.js';
