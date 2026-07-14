/**
 * Structured JSON logger. Writes single-line JSON to stdout for easy ingestion
 * by log aggregators. Every entry includes `event` and `timestamp`.
 *
 * @param {string} event  A short event name (e.g. "openalex_page", "screen").
 * @param {object} [data] Additional structured fields (must be JSON-serialisable).
 */
export function log(event, data = {}) {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

/**
 * Log an error with structured fields. Extracts useful properties from Error
 * instances without leaking full stack traces to production logs.
 */
export function logError(event, error, data = {}) {
  const message = error?.message ?? String(error);
  const name = error?.name ?? 'Error';
  log(event, { level: 'error', errorName: name, errorMessage: message, ...data });
}

export default { log, logError };
