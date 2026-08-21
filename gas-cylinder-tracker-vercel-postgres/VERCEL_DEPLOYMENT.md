# Vercel + persistent PostgreSQL deployment

This version uses PostgreSQL instead of the local SQLite file. Your records live in the hosted database and remain there when you close Safari, turn off your phone, or redeploy the web app.

## 1. Upload the project to GitHub

1. Create a new GitHub repository (for example `gas-cylinder-tracker`).
2. Upload all files from this project folder to that repository.
3. Do not upload a real `.env` file. `.env` is already excluded by `.gitignore`.

## 2. Create the Vercel project

1. Sign in to Vercel.
2. Choose **Add New → Project**.
3. Import the GitHub repository.
4. Framework should be detected as **Next.js**.
5. Deploying before the database is connected may fail. If possible, connect the database before the final production deploy.

## 3. Create persistent PostgreSQL

In the Vercel project:

1. Open **Storage**.
2. Choose **Create Database**.
3. Select **Prisma Postgres**.
4. Pick a nearby region and a suitable plan.
5. Create the database.
6. Connect it to this Vercel project.

The integration supplies `DATABASE_URL` automatically.

## 4. Add application environment variables

In **Project → Settings → Environment Variables**, add:

- `APP_TIME_ZONE` = `Asia/Kuala_Lumpur`
- `APP_TIMEZONE_OFFSET` = `+08:00`

`DATABASE_URL` should already exist after connecting Prisma Postgres. Do not replace it with `file:./dev.db`.

## 5. Deploy the schema

This project contains a PostgreSQL migration and `vercel.json` tells Vercel to run:

`npm run vercel-build`

That command runs `prisma generate`, `prisma migrate deploy`, and `next build`. Migrations change the schema but do not erase normal application data.

Redeploy from **Deployments** after the database is connected.

## 6. Seed the initial eight cylinders once

On a computer used only for setup (it does NOT need to stay running):

1. Install Node.js and the Vercel CLI: `npm install -g vercel`
2. In this project folder run: `npm install`
3. Run: `vercel login`
4. Run: `vercel link` and select the Vercel project.
5. Pull the production database environment variables: `vercel env pull .env.production.local --environment=production`
6. Run the one-time seed against production:

   - macOS/Linux: `DATABASE_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2- | sed 's/^"//;s/"$//')" npm run db:seed`
   - Windows PowerShell: `$env:DATABASE_URL=(Get-Content .env.production.local | Where-Object { $_ -like 'DATABASE_URL=*' }).Substring(13).Trim('"'); npm run db:seed`

The seed uses upserts, so accidentally running it again will not duplicate the standard cylinder IDs or operators.

## 7. Open on iPhone

1. Open the production `https://...vercel.app` address in Safari.
2. Confirm the eight cylinders appear.
3. Add or change a record, close Safari, reopen the app, and confirm the data remains.
4. For an app-like icon: Safari **Share → Add to Home Screen**.

## Important data behavior

- Closing Safari does not delete data.
- Turning off your computer does not affect the hosted app.
- Normal Vercel redeployments do not create a fresh database.
- Keep the same Prisma Postgres database connected to the Vercel project.
- Do not run `prisma migrate reset` against production.
- Deleting the database/storage resource itself will delete the database.

## Future schema changes

Create a new Prisma migration for each schema change and deploy it. Do not replace the production database merely to deploy a newer version of the website.
