# UNE Engine — frontend and backend setup

This repository is the **only** source repository: https://github.com/unedev00/uneengine.

## Applications and services

- Frontend: `apps/web` (React 18 + Vite), port **5173** in development.
- Backend API: `apps/server` (Node.js + Express + TypeScript), port **10000** by default.
- SQL: PostgreSQL, configured using `DATABASE_URL`.
- Worker: `npm run start:worker --workspace apps/server` after building; jobs require the same SQL database and authorized configuration.
- App modules live independently under `apps/*`. Do not start or seed optional apps globally.

## Local setup (Windows PowerShell)

Install Node.js **22 LTS**, npm, PostgreSQL, and Git. Clone the repo and run:

```powershell
git clone https://github.com/unedev00/uneengine.git
cd uneengine
npm ci
```

Set up a local PostgreSQL database and supply its connection string to the backend in your current terminal. Do **not** commit credentials.

```powershell
$env:DATABASE_URL = "postgresql://LOCAL_USER:LOCAL_PASSWORD@127.0.0.1:5432/uneengine"
$env:PORT = "10000"
npm run dev:server
```

In **another PowerShell terminal**:

```powershell
cd uneengine
npm run dev:web
```

Visit http://localhost:5173. Vite proxies `/api` and `/health` to http://127.0.0.1:10000; alternatively use `METADRIVE_API_PROXY_TARGET` to override the backend target when running Vite.

Backend startup applies SQL migrations and validates schema. Use a disposable local database initially: do not point development at production or run bootstrap operations without checking their effects. Some first-run tenant provisioning may need separately supplied bootstrap variables. Never place secrets in Git or frontend `VITE_*` variables.

## Build and verification

```powershell
npm run build
npm run check
```

After building, the backend runs with `npm run start:server`. For local production-style inspection, `npm run start:web` runs Vite preview (port **4173**). Vite preview is **not** a production HTTP server.

## Production separation

- Build `apps/web` into static assets; serve through a production web server/CDN with SPA/route fallback as applicable.
- Run the compiled backend `apps/server/dist-system/system-support/entrypoint.js` as a separate process/service with its own environment and SQL permissions.
- Keep `DATABASE_URL`, bootstrap credentials, HTTP callout credentials and all other secrets on the backend only.
- Use a reverse proxy to forward frontend `/api` and `/health` requests to the backend, or configure a properly secured API origin. Deploy worker separately only when required.
- Test tenant isolation, central RBAC, SQL migrations and app lifecycle before deployment. Do not migrate or overwrite the existing Oracle VM merely because this repository changed.
- The existing GitHub Pages base now defaults to `/uneengine/`; set `GITHUB_PAGES=true` and `GITHUB_PAGES_BASE_PATH=/` only when deploying behind a verified custom root domain. GitHub Pages serves static frontend files **only**, not the Node.js backend.

## Current deployment status

This repository contains the source and local setup, **not proof of a running frontend/backend deployment**. Configure the actual deployment host, DNS/TLS, environment secrets, and database access before claiming production is live.

See `DEVELOPER_POLICY.md` and `AGENTS.md` for mandatory architecture, security, and development rules.
