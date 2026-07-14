import OpenAI from 'openai';

let cachedClient = null;

/**
 * Lazily instantiate a shared OpenAI SDK client. Throws immediately if the
 * `OPENAI_API_KEY` environment variable is missing so callers do not proceed
 * silently and produce misleading "default" AI outputs.
 */
export function getOpenAIClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Configure it in your .env file or Vercel dashboard.',
    );
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export default getOpenAIClient;
