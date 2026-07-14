import OpenAI from 'openai';

let cachedClient = null;

/**
 * Lazily construct a singleton OpenAI SDK client. Throws immediately when
 * `OPENAI_API_KEY` is missing so callers cannot silently produce misleading
 * "default" AI outputs.
 */
export function getOpenAIClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Copy .env.example to .env and provide a key, ' +
        'or export it in your shell (e.g. `export OPENAI_API_KEY=sk-...`).',
    );
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export default getOpenAIClient;
