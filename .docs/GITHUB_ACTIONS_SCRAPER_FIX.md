# JOBFORGE GITHUB ACTIONS SCRAPER - DIAGNOSIS & FIX

**Diagnosis Time:** 2026-09-26T03:36:53.808Z

---

## ROOT CAUSE

GitHub Actions secret `DATABASE_URL` is **malformed/incorrect**.

**Evidence from workflow run 36214581210:**
```
Scraper fatal error: Error: getaddrinfo EAI_AGAIN base
  hostname: 'base'
  at Database.initSchema()
  at pg-pool connection attempt
```

PostgreSQL connection string parser is extracting hostname as just `base` (invalid).

This indicates the `DATABASE_URL` secret value is not a valid PostgreSQL connection string.

---

## WHAT IS EXPECTED

Scraper expects `DATABASE_URL` environment variable to be a **valid PostgreSQL connection string** for the production Neon database.

**Format:**
```
postgresql://username:password@hostname:port/database
```

**For Neon production:**
```
postgresql://username:password@[neon-hostname].neon.tech:5432/database
```

The connection string must match the **same Neon production database** used by Vercel (`REMOTEJOBSDB_POSTGRES_URL`).

---

## SCRAPER CONFIGURATION CHAIN

Scraper resolves database via `scraper/src/config/database.ts`:

1. Check `process.env.DATABASE_URL` (GitHub Actions passes this)
2. Fallback to `process.env.REMOTEJOBSDB_POSTGRES_URL` (not available in Actions)
3. If neither: throw error

**Current State:** `DATABASE_URL` is set but malformed, so connection fails immediately.

---

## MANUAL FIX REQUIRED

**GitHub Actions does not allow secret updates via API token (HTTP 403).**

You must manually update the secret via GitHub web UI:

### Steps:

1. Go to: `https://github.com/R5M54Y/JOBFORGE/settings/secrets/actions`

2. Find secret: `DATABASE_URL`

3. Click "Update"

4. In the "Secret" field, paste the **production Neon database connection string**

   **Source:** Copy from Vercel project settings
   - Vercel dashboard → JOBFORGE project → Settings → Environment Variables
   - Find: `REMOTEJOBSDB_POSTGRES_URL`
   - Copy that value

5. Click "Update secret"

6. Verify by checking GitHub Actions workflow runs (should connect successfully)

---

## WORKFLOW EXECUTION (AFTER SECRET IS FIXED)

Once the secret is corrected:

1. GitHub Actions will pass valid `DATABASE_URL` to scraper
2. Scraper will connect to Neon production database
3. Scraper execution flow:
   ```
   database.initSchema() ✓
   RemoteOK.fetch() ✓
   Remotive.fetch() ✓
   Normalize ✓
   Validate ✓
   Deduplicate ✓
   Database.upsert() ✓
   Exit code 0 ✓
   ```

4. Production `/api/jobs` will return scraped jobs (total > 0)

---

## VERIFICATION STEPS (AFTER SECRET UPDATE)

1. **Manually trigger workflow:**
   ```bash
   gh workflow run scrape.yml --repo R5M54Y/JOBFORGE
   ```

2. **Check run status:**
   ```bash
   gh run list --workflow=scrape.yml --limit 1
   ```

3. **Verify exit code is 0:**
   ```bash
   gh run view [run-id] --exit-status
   ```

4. **Check logs for success:**
   ```bash
   gh run view [run-id] --log | grep -E "Fetched|Upserted|Jobs in DB"
   ```

5. **Test production API:**
   ```bash
   curl https://usajobs-teal.vercel.app/api/jobs
   ```
   Should return jobs array with `total > 0`

---

## SECURITY NOTES

- ✅ No credentials are exposed in logs (GitHub masks `***`)
- ✅ No credentials need to be pasted into chat
- ✅ Secret is taken from existing Vercel configuration
- ✅ No new secrets created
- ✅ Scraper code is not modified
- ✅ Workflow is not modified

---

## SUMMARY

| Aspect | Status |
|--------|--------|
| **Root Cause** | DATABASE_URL secret is malformed |
| **Scraper Code** | ✓ Correct (uses portable config) |
| **Workflow YAML** | ✓ Correct (passes DATABASE_URL) |
| **Configuration Layer** | ✓ Correct (resolves DATABASE_URL) |
| **Required Action** | Manual: Update GitHub secret via web UI |
| **Secret Source** | Copy from Vercel (`REMOTEJOBSDB_POSTGRES_URL`) |
| **Manual Effort** | ~2 minutes (web UI update) |
| **Risk Level** | None (only updating existing secret) |

---

**Status:** Diagnosis complete, awaiting manual GitHub secret update.
