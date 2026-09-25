# JOBFORGE

Remote job aggregation platform. Automatically collects job listings from multiple sources and presents them in a clean, searchable web interface.

## Architecture

```
RemoteOK API ──┐
               ├──→ Scraper → PostgreSQL → Next.js API → Frontend
Remotive API ──┘
```

## Job Sources

- **RemoteOK** (https://remoteok.com/api)
- **Remotive** (https://remotive.com/api/remote-jobs)

## Setup

### 1. Database

```bash
# Set DATABASE_URL
export DATABASE_URL=postgresql://user:password@localhost:5432/jobforge

# Initialize schema
cd frontend && npm install && npm run db:init
```

### 2. Scraper

```bash
cd scraper
npm install
npm run build
npm run scrape
```

### 3. Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |

## GitHub Actions

The scraper runs automatically every 6 hours via GitHub Actions. Set `DATABASE_URL` as a repository secret.
