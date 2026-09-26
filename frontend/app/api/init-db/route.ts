// JOBFORGE - Database Initialization Endpoint
// GET /api/init-db
// Safe, idempotent endpoint to initialize production schema
// Returns status and creates jobs table if needed

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Create jobs table with canonical schema (idempotent)
      await client.query(`
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

      // Create indexes (idempotent)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source);
        CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
        CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs (employment_type);
        CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);
        CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs (is_active);
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_jobs_title_search ON jobs USING gin (to_tsvector('english', title));
      `);

      // Get row count
      const countResult = await client.query('SELECT COUNT(*) FROM jobs');
      const jobCount = parseInt(countResult.rows[0].count, 10);

      return NextResponse.json({
        status: 'success',
        message: 'Database schema initialized',
        jobCount: jobCount,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
