# B2 — Research Ingestion & AI Screening Backend

Express + Prisma + PostgreSQL backend for the Sabi Core assessment. Ingests
research metadata from **OpenAlex** and **PubMed**, persists it to PostgreSQL,
and provides AI-assisted abstract screening + embedding generation via
**OpenAI**.

## Overview

Endpoints:

| Method | Path                | Description |
| ------ | ------------------- | ----------- |
| `GET`  | `/api/health`       | Liveness probe |
| `GET`  | `/api/search`       | Search OpenAlex or PubMed for studies |
| `GET`  | `/api/studies`      | List persisted studies |
| `POST` | `/api/studies`      | Upsert normalized studies (by DOI) |
| `POST` | `/api/screen`       | Screen an abstract + generate embedding |

## Stack

- **Runtime:** Node.js 18+ (ES Modules)
- **Framework:** Express 4
- **ORM:** Prisma 5 → PostgreSQL
- **AI:** OpenAI SDK v4 (`gpt-4o-mini` for screening, `text-embedding-3-small` for embeddings)
- **HTTP:** Built-in `fetch` (no external HTTP client)
- **Deployment:** Vercel serverless functions (`@vercel/node`)

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14+ (any hosted or local instance)
- OpenAI API key
- Optional: OpenAlex mailto and PubMed API key for higher upstream rate limits

## Setup

```bash
cd B2
npm install
cp .env.example .env       # then fill in DATABASE_URL and OPENAI_API_KEY
npm run prisma:migrate     # first time only — creates the `Study` table
```

`postinstall` runs `prisma generate` automatically to produce the Prisma
Client. This means Vercel deployments regenerate the client on every install.

## Environment variables

| Name | Required | Purpose |
| ---- | -------- | ------- |
| `DATABASE_URL`     | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY`   | ✅ | Required by `/api/screen` |
| `PORT`             |    | Local dev port (default 3001) |
| `OPENALEX_MAILTO`  |    | Sent to OpenAlex for polite pool access |
| `PUBMED_API_KEY`   |    | Higher PubMed rate limit |
| `PUBMED_EMAIL`     |    | Identifies caller to NCBI |

## Run (local development)

```bash
npm run dev
# → sabi-core-b2 listening on http://localhost:3001
```

`npm run dev` uses `node --watch server.js` for auto-restart on file change.
For a hardened start (no watcher): `npm start`.

## Try the endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Search OpenAlex
curl "http://localhost:3001/api/search?query=diabetes&source=openalex&limit=5"

# Search PubMed
curl "http://localhost:3001/api/search?query=diabetes&source=pubmed&limit=5"

# Persist studies
curl -X POST http://localhost:3001/api/studies \
  -H 'Content-Type: application/json' \
  -d '[{"title":"Example","doi":"10.1/x","source":"openalex"}]'

# List persisted studies
curl http://localhost:3001/api/studies

# Screen an abstract
curl -X POST http://localhost:3001/api/screen \
  -H 'Content-Type: application/json' \
  -d '{
    "abstract": "This RCT of 500 adults with T2D...",
    "criteria": {
      "include": ["Adults with type 2 diabetes", "Randomised controlled trial"],
      "exclude": ["Pregnancy", "Animal studies"]
    }
  }'
```

## Deploy to Vercel

1. Push the `B2` directory to Git (Vercel treats it as its own project).
2. In the Vercel dashboard, set the **Root Directory** to `B2`.
3. Add environment variables in the project settings:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - Optionally `OPENALEX_MAILTO`, `PUBMED_API_KEY`, `PUBMED_EMAIL`
4. Deploy. `vercel.json` routes `/api/*` to `src/app.js`, which exports the
   Express app as the serverless handler.

The `postinstall` script runs `prisma generate` on every Vercel build so the
Prisma Client is always in sync with the schema.

## Project structure

```
B2/
├── prisma/
│   └── schema.prisma       # Study model
├── src/
│   ├── app.js              # Express app (export default — Vercel entry)
│   ├── routes/
│   │   ├── search.js       # GET  /api/search
│   │   ├── studies.js      # GET+POST /api/studies
│   │   └── screen.js       # POST /api/screen
│   ├── services/
│   │   ├── openalexClient.js  # OpenAlex fetch + pagination + retry
│   │   ├── pubmedClient.js    # PubMed esearch/efetch + XML parse
│   │   ├── normalizer.js      # Unified study shape
│   │   ├── screener.js        # OpenAI LLM screening
│   │   └── embedder.js        # OpenAI embedding
│   └── lib/
│       ├── prismaClient.js    # Singleton PrismaClient
│       ├── openaiClient.js    # Singleton OpenAI SDK client
│       ├── logger.js          # Structured JSON logger
│       └── retry.js           # Exponential backoff
├── server.js                  # Local dev entry point (app.listen)
├── vercel.json                # Serverless routing config
├── .env.example
└── package.json
```

## Normalized study shape

All external sources are mapped to a single output shape before persistence:

```js
{
  title:         string,
  doi:           string | null,
  abstract:      string | null,
  year:          number | null,
  authors:       string[],
  source:        "openalex" | "pubmed",
  openAccessUrl: string | null
}
```

## Design decisions

- **No external HTTP client** — Node 18+ ships with `fetch`, keeping the
  dependency tree small.
- **No external XML parser** — PubMed XML is parsed with targeted regexes,
  extracting only the fields we use. This trades tolerance for zero deps.
- **Singleton Prisma & OpenAI clients** — critical for Vercel serverless to
  avoid exhausting DB connection pools and slowing cold starts.
- **Strict AI validation** — `screener.js` throws on any unexpected model
  output rather than defaulting; the client must handle failures.
- **Deterministic screening** — `temperature: 0` and
  `response_format: json_object` for reproducible outputs.

## Assumptions

- Every `Study` row is unique by DOI when present; DOI-less studies are always
  inserted as new rows.
- OpenAlex delivers ≤200 records per page; PubMed `efetch` batches at 200.
- Vercel supplies `DATABASE_URL` with connection pooling appropriate for
  serverless (e.g. Neon pooled, Prisma Accelerate, Supabase pooler).

## Limitations

- No authentication or rate limiting (per assessment scope).
- No pgvector index — `embedding` is stored as `Float[]`, suitable for
  storage and later retrieval, not fast similarity search.
- PubMed clients cannot resolve open-access URLs.
- No batch embedding endpoint (single-abstract at a time).

## Future improvements

- Add `pgvector` for semantic search over stored `Study.embedding`.
- Add a `Decision` model to persist F1 screening decisions.
- Add authentication (JWT or Vercel Edge middleware).
- Batch embedding job for large ingestion runs.
- Structured metric emission (OpenTelemetry) alongside JSON logs.
