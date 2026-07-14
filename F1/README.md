# F1 — Study Screener

Human-in-the-loop evidence screening interface for the Sabi Core assessment.

## Overview

A React + Vite single-page application that presents 50 mock research studies
one at a time and lets the reviewer mark each as **Include**, **Exclude**, or
**Undecided**. Decisions are persisted to `localStorage` and survive page
reloads. The app is fully keyboard-navigable.

## Stack

- React (JavaScript/JSX)
- Vite
- Vanilla CSS (no UI framework)
- No backend calls — data is a static JSON file

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer

## Setup

```bash
cd F1
npm install
```

## Run (development)

```bash
npm run dev
```

Then open http://localhost:5173 in a browser.

## Build (production)

```bash
npm run build
npm run preview  # optional local preview of the production build
```

Vercel auto-detects Vite. Build command: `npm run build`, output directory: `dist`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `I` | Include current study (auto-advances) |
| `E` | Exclude current study (auto-advances) |
| `U` | Mark undecided |
| `→` | Next study |
| `←` | Previous study |

## Project structure

```
F1/
├── src/
│   ├── App.jsx              # Root component
│   ├── App.css              # App-specific styles
│   ├── index.css            # Global reset + typography
│   ├── main.jsx             # React entry point
│   ├── components/
│   │   ├── StudyList.jsx    # State + keyboard handling
│   │   ├── StudyCard.jsx    # Displays one study
│   │   ├── DecisionControls.jsx
│   │   └── ProgressBar.jsx
│   └── data/
│       └── studies.json     # 50 mock records
├── index.html
├── package.json
└── vite.config.js
```

## State model

```js
decisions = {
  [studyId]: "include" | "exclude" | "undecided"
}
```

The `decisions` object is loaded from `localStorage` under the key
`sabi_decisions` on mount and synced back on every change.

## Assumptions

- 50 mock studies are sufficient for the assessment — no pagination is needed
- One reviewer per browser (no multi-user support)
- Decisions do not sync to a backend

## Limitations

- No search or filter within the study list
- No export of the decision set
- No connection to B2 (this is by design — F1 is UI-only)

## Future improvements

- Persist decisions to the B2 backend via `POST /api/decisions`
- Add a filter/search toolbar
- Add a summary view showing all decisions at once
- Optional AI-assist button that calls `POST /api/screen` (A1)
