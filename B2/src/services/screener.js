import { getOpenAIClient } from '../lib/openaiClient.js';
import { log, logError } from '../lib/logger.js';

export const SCREENER_MODEL = 'gpt-4o-mini';
export const PROMPT_VERSION = '1.0';

const SYSTEM_PROMPT =
  'You are a systematic review screener. Evaluate only the abstract provided. ' +
  'Apply ONLY the criteria listed below. Do not invent additional criteria. ' +
  'Respond with valid JSON only — no prose, no markdown fences. ' +
  "If the abstract is insufficient to decide, output 'uncertain'. " +
  'JSON schema: { "decision": "include" | "exclude" | "uncertain", "reason": string }. ' +
  '`reason` must be a single concise sentence citing which criterion drove the decision.';

const VALID_DECISIONS = new Set(['include', 'exclude', 'uncertain']);

/**
 * @typedef {object} ScreenCriteria
 * @property {string[]} include  Inclusion criteria as plain-language statements.
 * @property {string[]} exclude  Exclusion criteria as plain-language statements.
 */

/**
 * @typedef {object} ScreenResult
 * @property {"include"|"exclude"|"uncertain"} decision
 * @property {string} reason
 * @property {object} metadata
 * @property {string} metadata.model
 * @property {string} metadata.promptVersion
 * @property {string} metadata.prompt   The rendered user prompt (excluding system prompt).
 * @property {string} metadata.timestamp
 */

/**
 * Screen an abstract against inclusion / exclusion criteria using the
 * configured OpenAI chat completion model.
 *
 * Deterministic (temperature: 0). Response is enforced to JSON via
 * `response_format: { type: 'json_object' }`. Throws on any API error or
 * malformed response — never returns a silent default.
 *
 * @param {string} abstract
 * @param {ScreenCriteria} criteria
 * @returns {Promise<ScreenResult>}
 */
export async function screenAbstract(abstract, criteria) {
  if (typeof abstract !== 'string' || abstract.trim().length === 0) {
    throw new Error('screenAbstract: abstract must be a non-empty string');
  }
  if (
    !criteria ||
    !Array.isArray(criteria.include) ||
    !Array.isArray(criteria.exclude)
  ) {
    throw new Error(
      'screenAbstract: criteria must be { include: string[], exclude: string[] }',
    );
  }

  const userPrompt = buildUserPrompt(abstract, criteria);
  const timestamp = new Date().toISOString();
  const client = getOpenAIClient();

  let response;
  try {
    response = await client.chat.completions.create({
      model: SCREENER_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
  } catch (error) {
    logError('screen_api_error', error);
    throw error;
  }

  const content = response?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('screenAbstract: OpenAI returned no content');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`screenAbstract: JSON parse failed — ${error.message}`);
  }

  const decision = parsed?.decision;
  const reason = parsed?.reason;
  if (!VALID_DECISIONS.has(decision)) {
    throw new Error(
      `screenAbstract: unexpected decision "${decision}" (expected include|exclude|uncertain)`,
    );
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error('screenAbstract: response missing a non-empty "reason"');
  }

  log('screen', {
    model: SCREENER_MODEL,
    decision,
    promptVersion: PROMPT_VERSION,
  });

  return {
    decision,
    reason: reason.trim(),
    metadata: {
      model: SCREENER_MODEL,
      promptVersion: PROMPT_VERSION,
      prompt: userPrompt,
      timestamp,
    },
  };
}

function buildUserPrompt(abstract, criteria) {
  const includeBlock = criteria.include.length
    ? criteria.include.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '(none provided)';
  const excludeBlock = criteria.exclude.length
    ? criteria.exclude.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '(none provided)';

  return [
    'Inclusion criteria:',
    includeBlock,
    '',
    'Exclusion criteria:',
    excludeBlock,
    '',
    'Abstract:',
    abstract,
    '',
    'Return a JSON object of the form: {"decision": "include"|"exclude"|"uncertain", "reason": string}.',
  ].join('\n');
}

export default screenAbstract;
