# Offside XI — Project Notes (Frontend + Backend)

Repo layout:
- Frontend (React + Vite): `fpl-app/frontend/`
- Backend (FastAPI): `fpl-app/backend/main.py`

## Running Locally

Backend:
- From `fpl-app/backend/` run:
  - `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000`

Frontend:
- From `fpl-app/frontend/` run:
  - `npm install`
  - `npm run dev`

Frontend talks to backend via:
- `VITE_API_URL` (defaults to `http://localhost:8000`), then the app uses `.../api`

## Vercel (Frontend) Notes

Recommended Vercel settings for this monorepo:
- Root Directory: `fpl-app/frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables (Vercel → Project → Settings → Environment Variables):
- `VITE_API_URL`
  - Example: `https://<your-backend-domain>`

## Current UI Features Added/Changed

### Optimal Squad — Team Analysis Panel

File:
- `fpl-app/frontend/src/pages/OptimalSquad.jsx`

Behavior:
- After generating a squad, a “Team Analysis” panel appears below the Starting XI + Bench section.
- It produces a rule-based explanation using:
  - Formation (DEF/MID/FWD counts)
  - Premium vs value mix
  - Captain choice + predicted points
  - Bench / budget notes

### Transfer Planner

File:
- `fpl-app/frontend/src/pages/TransferPlanner.jsx`

Behavior:
- Standard transfer optimisation UI remains (lock players, run optimiser, view transfer out/in + new squad).

### India FC — Clickable Player Stats Panel + Compare

File:
- `fpl-app/frontend/src/pages/IndianFootballCommunity.jsx`

Behavior:
- ISL Top Scorers rows are clickable and open a right-side stats panel.
- “Pin to Compare” lets you pin one scorer and then open another to compare side-by-side.
- Includes visual elements (bars + donut/ring) for a more “Top Picks style” feel.

### Model Insights — Feature Guide

File:
- `fpl-app/frontend/src/pages/ModelInsights.jsx`

Behavior:
- “Feature Guide” card sits directly under “Feature Importance”.
- Collapsible (+/−) and includes a small scrollable table:
  - Feature
  - Type
  - What it captures

### Topbar — Overall Rank Highlight

File:
- `fpl-app/frontend/src/AppLayout.jsx`

Behavior:
- The “Overall Rank” display is larger, brighter, and sits in a subtle highlighted pill without breaking alignment.

## Notes on Claude/Anthropic Explanations

If you later want true Claude-powered explanations on Vercel:
- You generally need a server-side proxy (serverless function / backend) to avoid browser CORS and to keep keys private.
- The Anthropic account must have sufficient credits.

This repo currently uses rule-based explanations in the UI where needed, which works even when AI credits are unavailable.

