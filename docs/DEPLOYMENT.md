# Deployment Readiness

## Environment files

- Frontend: copy [/.env.example](/Users/kwame/Downloads/premium-art-studio-website/.env.example)
- Backend: copy [backend/.env.example](/Users/kwame/Downloads/premium-art-studio-website/backend/.env.example)
- Secret reference: [docs/SECRETS.md](/Users/kwame/Downloads/premium-art-studio-website/docs/SECRETS.md)

## Upload storage strategy

Use `UPLOAD_STORAGE=local` for development and `UPLOAD_STORAGE=cloudinary` for production-grade media delivery.

- `local`
  - stores uploads inside `backend/uploads`
  - serves media from `/uploads/...`
  - recommended only for local development or single-node testing
- `cloudinary`
  - uploads binaries to Cloudinary
  - returned product/blog/media URLs become Cloudinary HTTPS assets
  - recommended for production and multi-instance deployments

If you stay on local storage in production, you must mount a persistent volume and set `BACKEND_PUBLIC_URL` so media URLs resolve correctly outside localhost.

## Backup strategy

There are two layers to back up:

1. Runtime file-backed state
   - run `npm run backup:runtime` from the repo root
   - this snapshots the persistent JSON store and local uploads into `backend/backups/<timestamp>`
2. Production services
   - if Postgres is enabled, use managed snapshots or scheduled `pg_dump`
   - if Cloudinary is enabled, rely on Cloudinary retention/export policies for asset backup

The local backup script is a safety net for file-backed runtime data, not a replacement for managed database backups.

## Monitoring and analytics

- Backend logging
  - set `LOG_FILE_PATH` to persist structured logs to disk
  - set `ALERT_WEBHOOK_URL` to receive error-level alert POSTs
- Frontend analytics
  - set `VITE_GA_MEASUREMENT_ID` to enable Google Analytics page view tracking
- Optional vendor hooks
  - `SENTRY_DSN` and `GOOGLE_ANALYTICS_ID` are documented in env examples for future provider integrations

Use `/api/health` for uptime checks and `/api/health/detailed` for infrastructure monitoring.

## CI/CD baseline

The repo includes [ci.yml](/Users/kwame/Downloads/premium-art-studio-website/.github/workflows/ci.yml) to:

- install frontend dependencies
- build the Vite app
- install backend dependencies
- run backend tests

Recommended production pipeline:

1. Run CI on every push/PR
2. Build frontend static assets
3. Run backend tests
4. Apply database migrations
5. Deploy backend with persistent env vars and storage mode
6. Deploy frontend with `VITE_API_BASE_URL` pointing at the live backend

## Firebase Hosting

The frontend can be deployed to Firebase Hosting with the included config:

- project id: `sinipo-art-studio-627c1`
- hosting config: [firebase.json](/Users/kwame/Downloads/premium-art-studio-website/firebase.json)
- project mapping: [.firebaserc](/Users/kwame/Downloads/premium-art-studio-website/.firebaserc)

Recommended flow:

1. Set `VITE_API_BASE_URL` to your live backend URL before deploy
2. Run `npm run deploy:firebase`

Notes:

- this deploys the Vite frontend only
- the Express backend should be deployed separately, ideally to Cloud Run
- keep production media on Cloudinary instead of local uploads

## Containers

Container artifacts are included for a baseline deployment:

- Backend image: [backend/Dockerfile](/Users/kwame/Downloads/premium-art-studio-website/backend/Dockerfile)
- Frontend image: [Dockerfile.frontend](/Users/kwame/Downloads/premium-art-studio-website/Dockerfile.frontend)
- Nginx SPA config: [nginx.conf](/Users/kwame/Downloads/premium-art-studio-website/nginx.conf)
- Compose stack: [docker-compose.production.yml](/Users/kwame/Downloads/premium-art-studio-website/docker-compose.production.yml)

Before deploying, run:

```bash
cd backend && npm run verify:env
```
