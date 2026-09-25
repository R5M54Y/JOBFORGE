// JOBFORGE - Database Schema Initialization Utility
// Safe, idempotent schema initialization for production deployment
// Uses the canonical schema from scraper/src/db.ts

import { Pool } from 'pg';
import { getDatabaseConfig } from '../src/config/database';

/**
 * Initialize the JOBFORGE database schema.
 * This is idempotent and safe to run multiple times.
 *
 * Creates the canonical jobs table with:
 * - All required JOBFORGE fields
 * - UNIQUE(source, source_job_id) constraint for deduplication
 * - Indexes for query performance
 * - Full-text search support on job titles
 *
 * @throws Error if database connection or schema creation fails (without exposing credentials)
 */
export async function initializeSchema(): Promise<void> {
  let pool: Pool | null = null;

  try {
    const dbConfig = getDatabaseConfig();
    pool = new Pool({ connectionString: dbConfig.connectionString, max: 1 });

    const sql = `
      CREATE TABLE IF NOT EXISTS jobs (
        id              TEXT PRIMARY KEY,
        source          TEXT NOT NULL,
        source_job_id   TEXT NOT NULL,
        title           TEXT NOT NULL,
        company         TEXT NOT NULL,
        location        TEXT NOT NULL DEFAULT 'Remote',
        description     TEXT DEFAULT '',
        url             TEXT NOT NULL,
        category        TEXT DEFAULT 'other',
        employment_type TEXT DEFAULT 'full-time',
        posted_at       TIMESTAMPTZ DEFAULT NOW(),
        scraped_at      TIMESTAMPTZ DEFAULT NOW(),
        expires_at      TIMESTAMPTZ,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (source, source_job_id)
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source);
      CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
      CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs (employment_type);
      CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);
      CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs (is_active);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_jobs_title_search ON jobs USING gin (to_tsvector('english', title));
    `;

    console.log('Initializing JOBFORGE database schema...');
    await pool.query(sql);
    console.log('✓ Database schema initialized successfully');
  } catch (err) {
    // Do not expose connection string or credentials in error
    const errorMessage = err instanceof Error ? err.message : String(err);
    const safeMessage = errorMessage
      .replace(/postgresql:\/\/[^@]+@[^\/]+\//g, 'postgresql://***@***/') // Hide credentials
      .replace(/password=[^&]*/gi, 'password=***'); // Hide any password params

    console.error('✗ Schema initialization failed:', safeMessage);
    throw new Error(`Database schema initialization failed. Check database connection and permissions.`);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * CLI entry point for schema initialization.
 * Can be run as: npx ts-node scripts/init-db.ts
 */
if (require.main === module) {
  initializeSchema()
    .then(() => {
      console.log('Schema initialization complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error:', err.message);
      process.exit(1);
    });
}

export default initializeSchema;
