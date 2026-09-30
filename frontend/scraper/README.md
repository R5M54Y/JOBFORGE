// README for the new frontend scraper structure
This directory contains the canonical scraper implementation for the Vercel Cron integration.

The scraper provides:
- RemoteOK job source
- Remotive job source
- Jobicy job source
- Job normalization and validation
- Duplicate detection
- PostgreSQL database operations

This scraper is bundled with the Next.js frontend for Vercel Cron deployments.
The cron endpoint at /api/cron/scrape imports and executes this scraper.

To build:
1. From /d/JOBFORGE/frontend/scraper: npm run build
2. From /d/JOBFORGE/frontend: npm run build
