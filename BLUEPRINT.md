// JOBFORGE - Project Blueprint
// This file should exist but appears to be missing. I need to create it from the specification.

## Product Definition

JOBFORGE is a deliberately simple, cloneable job aggregation website.

**Core Purpose:** Automatically collect job listings from external sources and present them in a clean, searchable web interface.

**Solution:** Find relevant job opportunities from multiple sources in one place without manually checking each source.

## Instance Architecture

The repository is a **single-instance template** that can be duplicated to create independent JOBFORGE instances.

```
JOBFORGE TEMPLATE
        |
        +--> INSTANCE A
        |      +--> Repository A
        |      +--> GitHub Actions A
        |      +--> PostgreSQL DB A
        |      +--> Vercel Project A
        |      +--> Domain A
        |      +--> Branding A
        |
        +--> INSTANCE B
        |
        +--> INSTANCE N
```

Each instance operates independently with:
|- its own GitHub repository
|- its own GitHub Actions workflow
|- its own PostgreSQL database
|- its own Vercel deployment
|- its own environment variables
|- its own branding
|- its own domain

**CRITICAL CONSTRAINT:** No central JOBFORGE services, multi-tenancy, or shared resources between instances.

## Core Data Flow

```
External Job Source
        ↓
Instance Scraper
        ↓
Fetch
        ↓
Normalize
        ↓
Validate
        ↓
Deduplicate
        ↓
Upsert
        ↓
PostgreSQL
        ↓
Next.js
        ↓
Job Search / Filtering
        ↓
Original Job URL
```

## Job Sources

**Current Production Sources:**

```
RemoteOK (https://remoteok.com/api)
Remotive (https://remotive.com/api/remote-jobs)
```

**Architecture:** Multi-source with extensible IJobSource interface. Each source normalizes into the common Job model.

**Historical Note:** MVP baseline (commit 3aea164) was RemoteOK only. Remotive was added in commit fd03243 as the second source, preserving full backward compatibility.

## Database Requirements

**Technology:** PostgreSQL

**Job Table Schema Requirements:**
- `id` - Unique job identifier
- `source` - Source identifier ('remoteok' or 'remotive')
- `sourceJobId` - Source-native job ID
- `title` - Job title
- `company` - Company name
- `location` - Job location
- `description` - Job description
- `url` - Job application URL
- `category` - Job category
- `employmentType` - Employment type (full-time, part-time, etc.)
- `postedAt` - Job posting date
- `scrapedAt` - When job was scraped
- `expiresAt` - Job expiration date
- `isActive` - Job active status
- `createdAt` - Record creation timestamp
- `updatedAt` - Record last update timestamp

**Required Constraint:** UNIQUE(source, sourceJobId) to prevent duplicate jobs from the same source

**Scraper Requirement:** Must use upsert strategy compatible with the uniqueness rule

## Job Data Model

### Required Fields:
- `id` (string, required)
- `source` (string, required, 'remoteok' or 'remotive')
- `sourceJobId` (string, required)
- `title` (string, required)
- `company` (string, required)
- `location` (string, required)
- `description` (string, optional)
- `url` (string, required)
- `category` (string, optional)
- `employmentType` (string, optional)
- `postedAt` (Date, required)
- `scrapedAt` (Date, required)
- `expiresAt` (Date, optional)
- `isActive` (boolean, required, default: true)
- `createdAt` (Date, required)
- `updatedAt` (Date, required)

## Job Deduplication

**Primary Identity:** `(source, sourceJobId)`

**Fallback Identity:** If no stable source job ID exists, use `title + company + location`

**Deduplication Service:** Local deduplication, no external services

## Scraper Pipeline

```
FOR EACH SOURCE (RemoteOK, Remotive):
  FETCH
  → NORMALIZE
  → VALIDATE
  → DEDUPLICATE
  → UPSERT
```

### Responsibilities:

#### Fetch
- Retrieve jobs from RemoteOK API (https://remoteok.com/api)
- Retrieve jobs from Remotive API (https://remotive.com/api/remote-jobs)
- Configure proper User-Agent for API compliance
- Handle API errors and network issues
- Source failures are isolated (one source failure doesn't stop the other)

#### Normalize
- Convert RemoteOK records into JOBFORGE job model
- Convert Remotive records into JOBFORGE job model
- Map source-specific fields to JOBFORGE schema
- Generate consistent job IDs: `{source}-{sourceJobId}`

#### Validate
|- Reject records missing required fields:
|  - `title`
|  - `company`
|  - `url`
|  - `source`
|- Validate data types and URL format

#### Deduplicate
|- Remove duplicate records using source + sourceJobId identity
|- Implement deterministic fallback for missing IDs

#### Upsert
|- Insert new jobs to PostgreSQL
|- Update existing jobs using conflict handling
|- Maintain data integrity

## Frontend Requirements

**Technology:** Next.js, TypeScript

**Architecture:** Frontend reads from application data layer, not directly from database

**UI Requirements:**
|- Display at minimum: `title`, `company`, `location`, `employmentType`, `original job URL`
|- Enable discovery through:
|  - `keyword` (minimum 2 characters)
|  - `location`
|  - `category`
|  - `employmentType`
|- Job details view with full information
|- Functional original job links

**Security:** Never expose database credentials to browser

## Deployment

### Frontend Deployment:
**Platform:** Vercel

### Scraper Deployment:
**Platform:** GitHub Actions

**Workflow Requirements:**
|- Scheduled execution (every 6 hours)
|- `workflow_dispatch` support
|- `DATABASE_URL` from GitHub secrets
|- Proper error handling and logging

### Database:
**Connection:** PostgreSQL
**Configuration:** Environment variable `DATABASE_URL`
**Security:** Never hard-code credentials

## Environment Isolation

**Per-Instance Configuration:**
|- `DATABASE_URL` (unique to each instance)
|- GitHub Actions secrets
|- Vercel environment variables
|- Branding configuration
|- Domain assignment

**No shared resources** between instances.

## MVP Non-Goals (EXPLICITLY OUTSIDE SCOPE)

❌ **NOT included:**
|- User authentication
|- User accounts
|- Employer accounts
|- Job posting
|- ATS (Applicant Tracking System)
|- Admin dashboard
|- Payments
|- Subscriptions
|- Messaging
|- Notifications
|- Multi-tenancy
|- Central services
|- Additional job sources
|- Redis
|- Microservices
|- Elasticsearch/Algolia
|- AI matching
|- Recommendation systems
|- Analytics
|- WebSockets
|- Mobile applications

## Quality Requirements

### Implementation Verification vs Existence

A component is NOT complete merely because:
|- The file exists
|- The code compiles

### Verification Categories

```text
EXISTS ≠ COMPILES ≠ EXECUTES ≠ INTEGRATED ≠ VERIFIED
```

### Example Failures:

```text
PostgreSQL source code exists ≠ PostgreSQL runtime verified
Scraper builds ≠ Scraper successfully fetched and persisted jobs
```

### Missing Dependencies

If a runtime dependency is unavailable, report:
```text
NOT VERIFIED
```

NEVER report:
```text
PASS
```

without evidence.

## Definition of Done

### Frontend:
|- ✅ Next.js application builds successfully
|- ✅ TypeScript typecheck passes
|- ✅ Required job discovery UI exists
|- ✅ Required filters work
|- ✅ Jobs retrieved from application data layer
|- ✅ Original job URLs function

### PostgreSQL:
|- ✅ PostgreSQL connection works
|- ✅ Schema can be initialized
|- ✅ Required fields exist
|- ✅ `(source, sourceJobId)` uniqueness constraint exists
|- ✅ Insert operations work
|- ✅ Upsert operations work
|- ✅ Duplicate prevention works
|- ✅ Query operations work

### Scraper:
|- ✅ RemoteOK fetch executes successfully
|- ✅ Records are normalized
|- ✅ Invalid records are rejected
|- ✅ Duplicate records are handled
|- ✅ Jobs are persisted to PostgreSQL
|- ✅ Re-running scraper doesn't create duplicate jobs

### GitHub Actions:
|- ✅ Workflow file exists
|- ✅ Scheduled execution configured
|- ✅ `workflow_dispatch` exists
|- ✅ `DATABASE_URL` from GitHub Secrets
|- ✅ Scraper execution can complete successfully

### End-to-End Verification:
A real job must successfully travel through:
```text
RemoteOK → scraper → PostgreSQL → Next.js → browser → original job URL
```

**Requirements must be verified before declaring MVP complete.**