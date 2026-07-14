/**
 * Structured JSON logger. Writes single-line JSON to stdout so downstream
 * log processors can parse each event reliably. Every entry includes
 * `event` and `timestamp`.
 *
 * @param {string} event  Short event name (e.g. "screen", "embed").
 * @param {object} [data] Additional JSON-serialisable fields.
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
 * Log a structured error entry. Extracts safe fields from Error instances.
 */
export function logError(event, error, data = {}) {
  const message = error?.message ?? String(error);
  const name = error?.name ?? 'Error';
  log(event, { level: 'error', errorName: name, errorMessage: message, ...data });
}

export default { log, logError };
