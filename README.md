# Sabi Core Take-Home Assessment

## AI Context File — SDLC Execution Blueprint

---

# PROJECT PROGRESS SUMMARY

## What Has Been Achieved

### F1 — Frontend (Study Screener) ✅ Complete
- Scaffolded with Vite + React (JavaScript/JSX)
- `StudyList`, `StudyCard`, `DecisionControls`, `ProgressBar` components built
- 50 mock study records in `/F1/src/data/studies.json`
- Decision state management with localStorage persistence (`sabi_decisions` key)
- Keyboard navigation: I / E / U / ArrowLeft / ArrowRight
- Progress indicator (Study X of 50 — Y decided)
- Module-level `README.md` and functional CSS styling

### B2 — Backend (Research Data Ingestion API) ✅ Complete
- Express.js app (`src/app.js`) with Vercel-serverless-compatible default export
- Local dev entry point (`server.js`) with `app.listen()`
- Prisma `Study` model defined in `prisma/schema.prisma` with all required fields (`id`, `title`, `doi`, `abstract`, `year`, `authors`, `source`, `openAccessUrl`, `embedding`, `createdAt`, indexed on `source` and `year`)
- All three REST routes implemented:
  - `GET /api/search?query=&source=openalex|pubmed&limit=500`
  - `POST /api/studies` and `GET /api/studies`
  - `POST /api/screen`
- OpenAlex client with cursor-based pagination, 1s page delay, 10s timeout, exponential backoff (max 3 retries)
- PubMed client with `esearch` → `efetch` flow, same timeout + retry pattern
- Shared `normalizer.js` producing unified `{ title, doi, abstract, year, authors, source, openAccessUrl }` shape
- Shared utilities: `retry.js` (exponential backoff), `logger.js` (structured JSON), `prismaClient.js` (singleton), `openaiClient.js`
- `vercel.json` serverless config, `.env.example`, and module-level `README.md`

### A1 — AI Integration ✅ Complete (standalone module + mirrored in B2)
- `screener.js`: OpenAI chat completion (`gpt-4o-mini`, temperature 0) with strict criteria-only system prompt, returning `{ decision, reason }`
- `embedder.js`: OpenAI `text-embedding-3-small` producing 1536-dimension `Float[]` vector
- Structured JSON logging on every AI call (prompt, model, decision, timestamp)
- Output contract fully implemented: `{ decision, reason, embedding, metadata }` with `promptVersion`, `model`, `embeddingModel`, `timestamp`
- A1 logic duplicated within `B2/src/services/` as designed; standalone `A1/` module also present for isolated testing
- `.env.example` and module-level `README.md`

---

## Remaining Work to Fully Accomplish the Task

### 1. Database Setup (Blocker for B2 + A1 live testing)
- Run `npx prisma migrate dev --name init` inside `/B2` against a live PostgreSQL instance
- Confirm `DATABASE_URL` is set in `/B2/.env` before migrating
- Verify the `postinstall` script in `B2/package.json` runs `prisma generate` (required for Vercel build)

### 2. Root-Level Vercel Config for F1 (Missing)
- Add a root `vercel.json` (or configure the Vercel project dashboard) to deploy F1 as a static Vite site
- Set build command: `npm run build`, output directory: `dist`
- The current `vercel.json` in `/B2` only covers the backend serverless deployment

### 3. End-to-End Testing (Phase 4 — Not Started)
- **F1:** Verify localStorage persistence survives page reload; confirm all keyboard shortcuts work; confirm all 50 studies are navigable
- **B2:** Smoke-test all three endpoints (`/api/search`, `/api/studies`, `/api/screen`) with `curl` or Postman
- **B2:** Test OpenAlex + PubMed pagination, timeout handling, and retry logic
- **A1:** Validate embedding dimensionality (1536), confirm decision output matches contract, verify logs emit on every call

### 4. Consolidation of A1 Module
- Decide whether the standalone `A1/` directory is a deliverable or only the embedded `B2/src/services/screener.js` + `embedder.js`
- If standalone A1 is a separate deliverable, ensure it is documented and its README is current
- If not, clean up the `A1/` directory to avoid confusion with the design spec (which placed AI logic inside B2)

### 5. Deployment to Vercel (Phase 6 — Not Started)
- Set `DATABASE_URL` and `OPENAI_API_KEY` in the Vercel project dashboard environment variables
- Deploy B2 via Vercel CLI (`vercel --prod` from `/B2`)
- Deploy F1 via Vercel CLI (`vercel --prod` from `/F1`) or configure as a separate Vercel project
- Confirm Prisma client is generated at Vercel build time (`postinstall` in `package.json`)

### 6. Pre-Delivery Checklist
- No hardcoded secrets in any source file
- `.env` files are in `.gitignore`
- All `.env.example` files are complete and accurate
- All module `README.md` files reflect final implemented state

---

**Author:** Senior Software Engineer (20+ Years Experience)
**Scope:** F1 (Frontend), B2 (Backend), A1 (AI Integration)
**Objective:** Provide a complete execution roadmap enabling consistent, high-quality implementation aligned with Sabi Core architecture and expectations.

---

# 1. SYSTEM OVERVIEW

This assessment simulates core components of the Sabi Core platform:

* **F1 (Frontend):** Human-in-the-loop evidence screening interface
* **B2 (Backend):** External research data ingestion via REST API (OpenAlex + PubMed), persisted to PostgreSQL via Prisma
* **A1 (AI):** Assistive AI decision support — LLM screening + embedding generation — with strict provenance tracking

The system reflects a **human-led, AI-assisted research workflow**, emphasizing:

* Transparency
* Determinism
* Auditability
* Reliability over novelty

## Confirmed Technology Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | React (JavaScript/JSX) + Vite                 |
| Backend    | Node.js + Express + Prisma + PostgreSQL       |
| AI         | OpenAI (chat completions + text embeddings)   |
| Data       | OpenAlex API + PubMed E-utilities API         |
| Deployment | Vercel (frontend static + backend serverless) |

> This is the production stack Sabi Core runs on. All implementation must reflect code you would actually contribute to this repository.

---

# 2. ARCHITECTURAL PRINCIPLES

1. **Separation of Concerns**

   * UI (F1) communicates with B2 only through HTTP — no direct DB or AI access
   * Backend (B2) owns all data persistence, external API calls, and AI orchestration
   * AI logic (A1) is encapsulated in dedicated service modules within B2

2. **Deterministic Behavior**

   * No hidden logic
   * No silent failures
   * All outputs traceable (logged prompt, model, version, timestamp)

3. **Mock-First Development**

   * F1 uses static JSON mock data during development
   * B2 API endpoints return consistent shapes regardless of upstream source
   * Avoid premature integration

4. **Progressive Enhancement**

   * Start simple → iterate
   * Deliver working baseline early

5. **Observability**

   * Log key operations (all AI calls, all external API calls, all DB writes)
   * Structured JSON logs throughout

6. **Deployment-Aware Design**

   * All secrets via environment variables
   * Express app must be Vercel-serverless compatible (`vercel.json` rewrites)
   * Prisma client generated at build time (`prisma generate`)

---

# 3. SDLC PHASES

---

## PHASE 1: REQUIREMENTS ANALYSIS

### F1 — Study Screener

* Display list of studies (50 mock records served from static JSON)
* Show metadata: title, authors, year, abstract
* Allow decisions:

  * Include
  * Exclude
  * Undecided
* Persist decisions via localStorage (no backend calls required for F1)
* Fully keyboard accessible (I / E / U keys + arrow navigation)

### B2 — Research Data Ingestion API

* Express REST API with the following endpoints:

  * `GET /api/search?query=&source=openalex|pubmed&limit=500`
  * `POST /api/studies` — persist normalized studies to PostgreSQL
  * `GET /api/studies` — retrieve stored studies
* Data sources:

  * **OpenAlex** — cursor-based pagination, up to 500 results
  * **PubMed E-utilities** — `esearch` + `efetch`, up to 500 results
* Handle for both sources:

  * Rate limiting (request delays)
  * Timeouts (AbortController)
  * Retries (exponential backoff, max 3 attempts)
* Normalize output to a shared schema:

  * `{ title, doi, abstract, year, authors, source, openAccessUrl }`
* Prisma schema for `Study` model persisted to PostgreSQL

### A1 — Abstract Screening AI (within B2)

* Endpoint: `POST /api/screen`
* Input: `{ abstract, criteria: { include: [], exclude: [] } }`
* LLM call (OpenAI chat completion):

  * decision: `include | exclude | uncertain`
  * one-line justification (no hallucination beyond given criteria)
* Embedding call (OpenAI text-embedding):

  * Generate embedding vector for the abstract
  * Store embedding alongside the study record in PostgreSQL
* Output contract:

  ```json
  {
    "decision": "include" | "exclude" | "uncertain",
    "reason": "string",
    "embedding": [0.012, ...],
    "metadata": {
      "model": "gpt-4o-mini",
      "embeddingModel": "text-embedding-3-small",
      "promptVersion": "1.0",
      "prompt": "string",
      "timestamp": "ISO 8601"
    }
  }
  ```
* Log every call: prompt, model, decision, timestamp (structured JSON)

---

## PHASE 2: SYSTEM DESIGN

### F1 DESIGN

* Component-based architecture:

  * `StudyList` — renders full list, tracks current index
  * `StudyCard` — displays one study's metadata
  * `DecisionControls` — Include / Exclude / Undecided buttons
  * `ProgressBar` — "Study X of 50 — Y decided"
* State:

  * In-memory (React state)
  * Persistent (localStorage key: `sabi_decisions`)
* Navigation:

  * Keyboard shortcuts: I / E / U / ArrowLeft / ArrowRight
* Data:

  * Static JSON (`/src/data/studies.json`, 50 records)
* Vercel deployment: root `vercel.json` routes F1 as static site

---

### B2 DESIGN

* **Framework:** Express.js (Node.js 18+, ES Modules)
* **ORM:** Prisma with PostgreSQL adapter
* **File structure:**

  ```
  /B2
    /prisma
      schema.prisma       ← Study model + migrations
    /src
      app.js              ← Express app (export default for Vercel)
      /routes
        search.js         ← GET /api/search
        studies.js        ← GET|POST /api/studies
        screen.js         ← POST /api/screen
      /services
        openalexClient.js ← OpenAlex fetch + pagination + retry
        pubmedClient.js   ← PubMed esearch/efetch + pagination + retry
        normalizer.js     ← Unified shape from both sources
        screener.js       ← OpenAI LLM screening function
        embedder.js       ← OpenAI embedding function
      /lib
        prismaClient.js   ← Singleton Prisma client
        logger.js         ← Structured JSON logger
        retry.js          ← Shared exponential backoff utility
    server.js             ← Local dev entry point (listens on PORT)
    vercel.json           ← Serverless config (routes /api/* → app.js)
    .env.example
    package.json
    README.md
  ```

* **Prisma `Study` model:**

  ```prisma
  model Study {
    id            String   @id @default(cuid())
    title         String
    doi           String?  @unique
    abstract      String?
    year          Int?
    authors       String[]
    source        String   // "openalex" | "pubmed"
    openAccessUrl String?
    embedding     Float[]  // text-embedding-3-small (1536 dims)
    createdAt     DateTime @default(now())
  }
  ```

---

### A1 DESIGN (within B2 `/services`)

* `screener.js` — exports `screenAbstract(abstract, criteria)`

  * Uses `gpt-4o-mini`, temperature 0
  * System prompt enforces strict criteria-only reasoning
  * Response parsed to `{ decision, reason }`

* `embedder.js` — exports `embedText(text)`

  * Uses `text-embedding-3-small`
  * Returns `Float[]` vector (1536 dimensions)

* Both functions log structured JSON on every call

---

## PHASE 3: IMPLEMENTATION

### General Standards

* Node.js 18+
* ES Modules (`"type": "module"` in package.json)
* Clean, readable code (no clever hacks)
* Meaningful, explicit naming
* All environment variables documented in `.env.example`

---

### F1 IMPLEMENTATION STEPS

1. Scaffold: `npm create vite@latest F1 -- --template react`
2. Create `/F1/src/data/studies.json` — 50 mock study records
3. Build `StudyList`, `StudyCard`, `DecisionControls`, `ProgressBar` components
4. Implement decision state + localStorage persistence
5. Add keyboard navigation (window event listener)
6. Basic functional CSS (no external framework)
7. Add `/F1/README.md`

---

### B2 IMPLEMENTATION STEPS

1. Init project: `npm init`, install `express`, `prisma`, `@prisma/client`, `openai`
2. Configure Prisma: `npx prisma init`, write `Study` schema, run `npx prisma migrate dev`
3. Build singleton `prismaClient.js` and shared `retry.js` + `logger.js`
4. Implement `openalexClient.js`:

   * Cursor-based pagination
   * 1s delay between pages
   * AbortController (10s timeout)
   * Exponential backoff (max 3 retries)
5. Implement `pubmedClient.js`:

   * `esearch` to get PMIDs, `efetch` to get XML/JSON records
   * Same timeout + retry pattern
6. Implement `normalizer.js` — unified output shape from both sources
7. Build Express routes: `search.js`, `studies.js`
8. Implement `screener.js` — OpenAI chat completion (LLM screening)
9. Implement `embedder.js` — OpenAI text embedding
10. Build `screen.js` route — calls screener + embedder, persists result
11. Write `server.js` (local dev) and Vercel-compatible `app.js` export
12. Add `vercel.json`, `.env.example`, `/B2/README.md`

---

### A1 IMPLEMENTATION STEPS (within B2)

1. Define strict system prompt (criteria-only, JSON-only response)
2. Call `openai.chat.completions.create` with `temperature: 0`
3. Parse and validate `{ decision, reason }` from response
4. Call `openai.embeddings.create` with `text-embedding-3-small`
5. Extract embedding vector from response
6. Log every call: `{ event, model, decision, timestamp }`
7. Throw on any API error — no silent defaults

---

## PHASE 4: TESTING

### F1

* Verify state persistence across page reload
* Verify keyboard navigation (I / E / U / arrows)
* Verify progress indicator updates correctly
* Verify all 50 studies render and are navigable

### B2

* Test OpenAlex pagination with low `limit` value
* Test PubMed esearch → efetch flow
* Test timeout handling (mock a slow response)
* Test retry behavior (mock transient failures)
* Test Prisma `Study` create and retrieve
* Test `/api/search`, `/api/studies`, `/api/screen` endpoints with curl or Postman

### A1

* Validate output structure matches contract exactly
* Confirm no criteria are introduced beyond what was passed
* Confirm embedding vector has correct dimensionality (1536)
* Verify structured log is emitted on every call

---

## PHASE 5: DOCUMENTATION

Each module must include a `README.md` covering:

* Overview and responsibility
* Prerequisites (Node version, PostgreSQL, env vars)
* Setup instructions (`npm install`, `prisma migrate dev`, etc.)
* How to run locally
* How to deploy to Vercel
* Environment variables reference (keys only, no values)
* Assumptions and limitations
* Future improvements

---

## PHASE 6: DEPLOYMENT PREP (VERCEL)

### F1 — Static Site

* Vercel auto-detects Vite; set build command `npm run build`, output dir `dist`
* No backend calls at deploy time

### B2 — Serverless Functions

* `vercel.json` at `/B2` root:

  ```json
  {
    "version": 2,
    "builds": [{ "src": "src/app.js", "use": "@vercel/node" }],
    "routes": [{ "src": "/api/(.*)", "dest": "src/app.js" }]
  }
  ```

* `app.js` must `export default app` (no `app.listen()` — handled by Vercel)
* `server.js` handles `app.listen()` for local dev only

### Environment Variables (set in Vercel dashboard)

```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### Repo structure at delivery:

```
/F1
/B2
README.md
```

### Pre-deploy checklist:

* No hardcoded secrets anywhere
* `.env` is in `.gitignore`
* `prisma generate` runs on Vercel build (`postinstall` script)
* All environment variables documented in `.env.example`

---

# 4. RISK MANAGEMENT

| Risk                   | Mitigation                                      |
| ---------------------- | ----------------------------------------------- |
| API rate limits        | Delays between pages + exponential backoff      |
| AI hallucination       | Strict system prompt, temperature 0             |
| State loss (F1)        | localStorage persistence                        |
| DB connection in prod  | Prisma connection pooling, DATABASE_URL via env |
| PubMed XML parsing     | Use JSON mode (`retmode=json`) where available  |
| Overengineering        | Keep scope minimal — no auth, no UI for B2      |
| Vercel cold starts     | Singleton Prisma client, minimal dependencies   |

---

# 5. SUCCESS CRITERIA

* Functional completeness across all three modules
* Clean, readable code that matches Sabi Core's actual stack
* Clear documentation (each module self-contained)
* Demonstrated understanding of:

  * React component patterns and state management
  * Express API design and middleware
  * Prisma ORM and PostgreSQL schema design
  * External API integration (OpenAlex + PubMed)
  * Responsible OpenAI usage (LLM + embeddings)
  * Vercel deployment configuration

---

# 6. FUTURE IMPROVEMENTS (NOT REQUIRED NOW)

* Add pgvector extension to PostgreSQL for semantic similarity search
* Replace localStorage with backend-persisted decisions (new `Decision` Prisma model)
* Add authentication layer (JWT or Vercel Edge Middleware)
* Integrate B2 search directly into F1 UI
* Add multi-user collaboration and audit trail
* Introduce PubMed full-text retrieval (PMC Open Access)

---

# FINAL NOTE

This assessment is not about complexity — it is about **clarity of thought, discipline in execution, and respect for constraints**.

Deliver a **simple, correct, and well-structured solution** over an ambitious but incomplete one.

The stack is fixed: **React + Vite / Express + Prisma + PostgreSQL / OpenAI / OpenAlex + PubMed / Vercel**. Do not substitute or simplify any layer.
