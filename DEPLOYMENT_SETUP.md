# JOBFORGE - Deployment Configuration Guide (Phase 7)

This document provides instructions for deploying a JOBFORGE instance to production on Vercel.

## 1. Prerequisites

- **GitHub Repository:** The project must be pushed to a GitHub repository.
- **PostgreSQL Database:** A production PostgreSQL instance (e.g., Neon.tech, Supabase, or AWS RDS).
- **Vercel Account:** For hosting the Next.js frontend and scheduled scraper.

## 2. Infrastructure Setup

### PostgreSQL Database
1. Provision a PostgreSQL database.
2. Copy the connection string.
3. (Optional but recommended) Run schema initialization locally against your production DB:
   ```bash
   cd frontend
   export DATABASE_URL="your-connection-string"
   npm run db:init
   ```

## 3. Vercel Deployment

1. **Create New Project:** Connect your JOBFORGE repository to Vercel.
2. **Root Directory:** Set the root directory to `frontend`.
3. **Environment Variables:** Configure the following in Vercel Project Settings:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `CRON_SECRET`: A secure random string used to authorize scraper runs.
   - `SITE_TITLE`: (Optional) Custom title for your instance.
4. **Deploy:** Run the initial deployment.

## 4. Vercel Cron Configuration

The project includes a `vercel.json` file in the root that defines the scraper schedule.

```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- **Endpoint:** `/api/cron/scrape`
- **Schedule:** Daily at 00:00 UTC.
- **Authentication:** Vercel automatically includes `CRON_SECRET` in the Authorization header when calling the cron route. Our internal scraper verifies this secret.

## 5. Scraper Architecture

JOBFORGE uses an **Internal Scraper Architecture**.

- **Runtime:** The scraper is bundled directly into the Vercel Serverless Function artifact.
- **Trigger:** Vercel Cron triggers the `/api/cron/scrape` endpoint.
- **Source:** `frontend/scraper/src/index.ts` is imported directly by the API route.
- **Independence:** Each Vercel deployment is fully self-contained and manages its own scraping schedule and database.

## 6. Monitoring and Logging

### Runtime Logs
Vercel captures all `console.log` output from the scraper.
1. Navigate to your project in the Vercel Dashboard.
2. Go to **Logs**.
3. Filter by **Cron** or search for "Scraper" to see results of production runs.

### Scraper Results
Successful runs return a JSON summary:
```json
{
  "status": "success",
  "message": "Cron scrape completed successfully",
  "totalJobs": 120,
  "upserted": 15
}
```

## 7. GitHub Actions (CI/Verification Only)

GitHub Actions is configured for **Continuous Integration only**.
- It verifies that the scraper code compiles and passes type checks.
- It **does not** run production scraping.
- No production secrets (like `DATABASE_URL`) are required in GitHub Secrets for standard CI, unless explicitly adding automated E2E tests later.

## 8. Multi-Instance Deployment

To create another JOBFORGE instance:
1. Fork/Clone the repository.
2. Repeat the Vercel setup with a **new database** and **new secrets**.
3. Each instance will operate independently without shared resources.
