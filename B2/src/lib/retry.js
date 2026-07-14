import { log } from './logger.js';

/**
 * Wait for `ms` milliseconds.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute `fn` with exponential backoff between failed attempts.
 *
 * @template T
 * @param {() => Promise<T>} fn         The async function to invoke.
 * @param {object}   [options]
 * @param {number}   [options.maxAttempts=3]   Total attempts (initial + retries).
 * @param {number}   [options.baseDelayMs=1000] Backoff base delay in ms.
 * @param {string}   [options.label]           Optional label used for logging.
 * @param {(err: unknown, attempt: number) => boolean} [options.shouldRetry]
 *        Predicate to decide whether a given error is retryable. Defaults to
 *        retrying every error.
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    label = 'operation',
    shouldRetry = () => true,
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable = shouldRetry(error, attempt);
      const isLastAttempt = attempt === maxAttempts;
      if (!isRetryable || isLastAttempt) break;

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      log('retry_backoff', {
        label,
        attempt,
        maxAttempts,
        delayMs,
        errorMessage: error?.message ?? String(error),
      });
      await sleep(delayMs);
    }
  }

  const message = lastError?.message ?? String(lastError);
  throw new Error(`${label} failed after ${maxAttempts} attempts: ${message}`);
}

export default withRetry;
