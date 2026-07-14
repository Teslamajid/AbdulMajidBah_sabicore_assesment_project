# A1 — Assistive AI Abstract Screener

Standalone Node.js module that provides AI-assisted decision support for
systematic-review-style abstract screening, plus text embedding generation.
Uses the **OpenAI API** for both capabilities. Fully isolated — importable
as a library or runnable as a CLI demo.

## Overview

A1 exposes two pure async functions and a CLI demo:

- `screenAbstract(abstract, criteria)` — takes an abstract and
  `{ include: string[], exclude: string[] }` criteria; returns a strict
  `{ decision, reason, metadata }` object.
- `embedText(text)` — returns a `Float[]` embedding vector for the input
  text (1536 dimensions with the default model).

## Stack

- **Runtime:** Node.js 18+ (ES Modules — `"type": "module"`)
- **AI:** OpenAI SDK v4
  - Screening: `gpt-4o-mini` (temperature 0, JSON response format)
  - Embeddings: `text-embedding-3-small` (1536 dims)
- **Zero runtime dependencies beyond `openai`.**

This matches the AI layer of the Sabi Core production stack. In the full
stack A1 is embedded inside the B2 Express backend (see `../B2/src/services/`);
this standalone A1 module is functionally equivalent and can be reused as a
library.

## Prerequisites

- Node.js 18 or newer
- An OpenAI API key

## Setup

```bash
cd A1
npm install
cp .env.example .env      # add OPENAI_API_KEY
```

## Run the CLI demo

Make sure `OPENAI_API_KEY` is available in your shell (either via `.env`
loaded by your process manager or an explicit `export`). Node 18+ does not
auto-load `.env` files, so either:

```bash
# Option 1 — export in the shell for the current session
export OPENAI_API_KEY=sk-...
npm run demo

# Option 2 — one-shot inline
OPENAI_API_KEY=sk-... npm run demo
```

Available scripts:

```bash
npm run demo          # runs screening + embedding demos
npm run demo:screen   # only the screening demo
npm run demo:embed    # only the embedding demo
```

Example output (structured logs to stdout as JSON, human-readable demo
sections to console):

```
--- Screening demo ---
{"event":"screen","timestamp":"2026-07-14T05:00:00.000Z","model":"gpt-4o-mini","decision":"include","promptVersion":"1.0","inputLength":812}
{
  "decision": "include",
  "reason": "Randomised trial of CBT in adults with major depressive disorder reporting symptom scores.",
  "metadata": {
    "model": "gpt-4o-mini",
    "promptVersion": "1.0",
    "prompt": "Inclusion criteria: ...",
    "systemPrompt": "You are a systematic review screener...",
    "timestamp": "2026-07-14T05:00:00.000Z"
  }
}
```

## Environment variables

| Name | Required | Purpose |
| ---- | -------- | ------- |
| `OPENAI_API_KEY`      | ✅ | OpenAI credential for both screening and embedding |
| `A1_SCREENER_MODEL`   |    | Override the default screening model (default `gpt-4o-mini`) |
| `A1_EMBEDDING_MODEL`  |    | Override the default embedding model (default `text-embedding-3-small`) |

## Public API

Import from `./src/index.js`:

```js
import { screenAbstract, embedText } from './src/index.js';

const result = await screenAbstract(abstract, {
  include: ['Adults with type 2 diabetes', 'Randomised controlled trial'],
  exclude: ['Pregnancy', 'Animal studies'],
});
// → { decision, reason, metadata }

const vector = await embedText(abstract);
// → Float[] (length 1536 with the default model)
```

### `screenAbstract(abstract, criteria, options?)`

Deterministic JSON-only screening.

- **Input**
  - `abstract` `string` — non-empty
  - `criteria` `{ include: string[]; exclude: string[] }`
  - `options.model` `string` — override the screening model
- **Output** — `{ decision, reason, metadata }`
  - `decision` `"include" | "exclude" | "uncertain"`
  - `reason` `string` — one concise sentence
  - `metadata` `{ model, promptVersion, prompt, systemPrompt, timestamp }`
- **Behaviour**
  - `temperature: 0` and `response_format: { type: "json_object" }`
  - Rejects any response whose `decision` is not one of the three allowed
    values or whose `reason` is empty
  - Never returns a "default" decision on failure — always throws

### `embedText(text, options?)`

- **Input**
  - `text` `string` — non-empty
  - `options.model` `string` — override the embedding model
- **Output** — `number[]` (1536 floats for the default model)
- **Behaviour** — throws on any API error or empty response

## Project structure

```
A1/
├── index.js               # CLI demo entry
├── src/
│   ├── index.js           # Barrel — public exports
│   ├── screener.js        # screenAbstract()
│   ├── embedder.js        # embedText()
│   ├── openaiClient.js    # Singleton OpenAI SDK client + key validation
│   └── logger.js          # Structured JSON logger
├── package.json
├── .env.example
└── README.md
```

## Design decisions

- **Deterministic screening** — `temperature: 0` + `response_format: json_object`
  produces reproducible outputs and eliminates prose leakage.
- **Strict output validation** — decision enum + non-empty reason are
  enforced; on any deviation the function throws so callers cannot silently
  ship a wrong classification.
- **Provenance in metadata** — every result carries the exact user prompt,
  system prompt, model name, prompt version, and ISO timestamp. This makes
  the AI-assisted decision auditable and reproducible.
- **Structured JSON logging** — every LLM/embedding call emits a
  single-line JSON entry to stdout so downstream systems can ingest logs
  without regex parsing.
- **Fail-loud on missing credentials** — `getOpenAIClient()` throws
  immediately if `OPENAI_API_KEY` is not set, rather than making a
  misleading API call.

## Assumptions

- The abstract fits within the model's context window (safe for typical
  research abstracts of a few hundred words).
- The caller supplies criteria in plain natural language — no schema
  translation is attempted.
- Embeddings are consumed downstream (e.g. persisted in PostgreSQL with
  `pgvector`) — A1 itself does not store them.

## Limitations

- Single-abstract at a time — no batch API for now.
- No caching — repeated calls with the same abstract will spend tokens
  again. Add an LRU or persistent cache when high-volume screening is
  needed.
- Prompt version is manually maintained — bump `PROMPT_VERSION` in
  `src/screener.js` when the system prompt changes.

## Future improvements

- Batch screening endpoint (`Promise.all` with concurrency limiter).
- On-disk result cache keyed by `sha256(abstract + criteria + model)`.
- Optional streaming (`stream: true`) for large-context screening tasks.
- Confidence-calibrated scoring by requesting top-logprob values.
- Prompt evaluation harness comparing multiple prompt versions on a
  labelled test set.
