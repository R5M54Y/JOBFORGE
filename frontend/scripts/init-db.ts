// JOBFORGE - Database Initialization Script
// Usage: npm run db:init
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { getDatabaseConfig } from '../lib/database-config';

async function initDatabase() {
  let pool: Pool | null = null;

  try {
    console.log('Resolving database configuration...');
    const dbConfig = getDatabaseConfig();
    
    pool = new Pool({ connectionString: dbConfig.connectionString, max: 1 });

    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✓ Connected successfully');
    client.release();

    console.log('Creating jobs table (idempotent)...');
    await pool.query(`
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
    `);
    console.log('✓ Table created/verified');

    console.log('Creating indexes (idempotent)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source);
      CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
      CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs (employment_type);
      CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);
      CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs (is_active);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_jobs_title_search ON jobs USING gin (to_tsvector('english', title));
    `);
    console.log('✓ Indexes created/verified');

    const countResult = await pool.query('SELECT COUNT(*) FROM jobs');
    console.log(`Current job count: ${countResult.rows[0].count}`);

    console.log('\n✓ Database initialization complete!');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

initDatabase();
