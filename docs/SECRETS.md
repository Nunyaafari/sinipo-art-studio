# Secrets Reference

## Frontend

Set these in the frontend build environment:

- `VITE_API_BASE_URL`
- `VITE_GA_MEASUREMENT_ID` optional

## Backend

Set these in the backend runtime environment:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `BACKEND_PUBLIC_URL`
- `JWT_SECRET`
- `ADMIN_SECRET_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYMENT_MODE`
- `DATABASE_URL` or the `DB_*` variables
- `UPLOAD_STORAGE`

If `UPLOAD_STORAGE=cloudinary`, also set:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional but recommended:

- `LOG_FILE_PATH`
- `ALERT_WEBHOOK_URL`
- `SENTRY_DSN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `BACKUP_DIR`

## CI / GitHub Actions

The current CI workflow only builds and tests. It does not deploy.

If you add a deploy workflow later, map repository or environment secrets directly to the variables above. The safest split is:

- frontend hosting secrets for frontend-only build vars
- backend hosting secrets for API/database/payment/media vars
- production environment secrets separated from staging
