# Project instructions

- After creating a commit on `main`, push to `origin/main` automatically without asking for confirmation first. This repo auto-deploys to Railway on push, so pushing is the expected next step after every commit.

## About

FarmPulse is a multi-tenant SaaS platform for farm operations: loads, commodities, fields, customers, income and expenses. Background and roles are in @README.md.

## Stack

- npm workspaces: `server/` (Express, `pg` with plain SQL, Clerk) and `client/` (React, Vite, Tailwind, Leaflet, Recharts).
- Each farm is one Clerk Organization. Roles: Admin, Employee, Trucker.
- Hosted on Railway (`railway.json`). Pushes to `main` on GitHub deploy to production. Health check is `/health`.

## Commands (run from the repo root)

- `npm install` installs both workspaces.
- `npm run dev` runs the API and the client (client on :5173).
- `npm run build` builds the client.
- Database changes are scripts in `server/src/db/` named `migrate_<feature>.js`. Add a new script for each change; do not edit old ones.
- There is no automated test suite yet. Check syntax with `node --check <file>` and verify changes by running the app.

## Rules

- Every query must be scoped to the signed-in user's farm (Clerk Organization). One farm must never see another farm's data. Check this on every new or changed route.
- Enforce role limits in the API, not only in the interface.
- Never commit `.env` files or real keys. Real values live in Railway and in local `server/.env` and `client/.env`.
