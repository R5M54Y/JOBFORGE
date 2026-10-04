"use server";

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDatabaseConfig } from '@/lib/database-config';

// Authentication using existing Vercel secrets
const CRON_SECRET = process.env.CRON_SECRET;

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
  const providedSecret = request.headers.get('x-cron-secret') || 
                        new URL(request.url).searchParams.get('cron_secret');
  return providedSecret === CRON_SECRET;
}

async function migrateJobsId(): Promise<void> {
  let pool: Pool | null = null;
  
  try {
    console.log('Starting Jobs table ID migration in Vercel runtime...');
    
    const dbConfig = getDatabaseConfig();
    pool = new Pool({ 
      connectionString: dbConfig.connectionString, 
      max: 1 
    });
    console.log('Connected to PostgreSQL via Vercel runtime');
    
    // Phase 1: Verify legacy structure
    const tableCheck = await pool.query(
      `SELECT to_regclass('jobs') as table_exists,
              column_name 
       FROM information_schema.columns 
       WHERE table_name = 'jobs' AND column_name = 'old_id'`
    );
    
    const hasOldId = tableCheck.rows[0]?.table_exists && 
                    tableCheck.rows[0]?.column_name === 'old_id';
    
    if (!hasOldId) {
      console.log('Jobs table does not have old_id column - migration not needed');
      return;
    }
    
    console.log('Legacy jobs table detected with old_id column');
    
    // Phase 2: Verify legacy data structure - IDENTIFY ALL ROWS
    const legacyJobs = await pool.query(
      `SELECT id, old_id, source, source_job_id 
       FROM jobs 
       WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0`
    );
    
    if (legacyJobs.rows.length === 0) {
      console.log('No legacy jobs found with old_id - migration may already be complete');
      return;
    }
    
    console.log(`Found ${legacyJobs.rows.length} legacy jobs to migrate`);
    legacyJobs.rows.forEach((row: any) => {
      console.log(`  Legacy ID: ${row.id} -> Composite: ${row.old_id} (source: ${row.source}, source_job_id: ${row.source_job_id})`);
    });
    
    // Phase 3: Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Step 1: Add temporary composite_id column
      console.log('Step 1: Adding temporary composite_id column...');
      await pool.query('ALTER TABLE jobs ADD COLUMN composite_id TEXT');
      
      // Step 2: Populate composite_id from old_id for legacy rows
      console.log('Step 2: Populating composite_id from old_id...');
      await pool.query(
        'UPDATE jobs SET composite_id = old_id WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0'
      );
      
      // Step 3: Populate composite_id from source+source_job_id for all rows
      console.log('Step 3: Populating composite_id from source+source_job_id for all rows...');
      await pool.query(
        'UPDATE jobs SET composite_id = source || "-" || source_job_id WHERE composite_id IS NULL'
      );
      
      // Step 4: Verify composite_id is populated for all rows
      const verifyCount = await pool.query(
        'SELECT COUNT(*) FROM jobs WHERE composite_id IS NULL'
      );
      
      if (verifyCount.rows[0].count > 0) {
        throw new Error(`Error: Some jobs still missing composite_id (${verifyCount.rows[0].count} rows)`);
      }
      
      // Step 5: Check for duplicate target IDs
      console.log('Step 4: Checking for duplicate target IDs...');
      const duplicateCheck = await pool.query(
        `SELECT composite_id, COUNT(*) as duplicates
         FROM jobs
         GROUP BY composite_id
         HAVING COUNT(*) > 1
         ORDER BY duplicates DESC`
      );
      
      if (duplicateCheck.rows.length > 0) {
        console.error('CRITICAL: Duplicate target IDs found! Migration aborted to prevent data loss.');
        duplicateCheck.rows.forEach((row: any) => {
          console.error(`Target ID '${row.composite_id}' conflicts with ${row.duplicates} rows`);
        });
        await pool.query('ROLLBACK');
        process.exit(1);
      }
      
      // Step 6: Temporarily drop existing primary key
      console.log('Step 5: Temporarily dropping existing primary key...');
      await pool.query('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_pkey');
      
      // Step 7: Create composite_id as primary key for migration
      console.log('Step 6: Creating temporary composite_id primary key...');
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT jobs_composite_pk PRIMARY KEY (composite_id)');
      
      // Step 8: Create new unique constraint for (source, source_job_id)
      console.log('Step 7: Creating new source+source_job_id unique constraint...');
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT jobs_source_sourcejobid_unique UNIQUE (source, source_job_id)');
      
      // Step 9: Migrate legacy rows from old_id to composite_id
      console.log('Step 8: Migrating legacy rows from old_id to composite_id...');
      const updateResult = await pool.query(
        'UPDATE jobs SET id = composite_id WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0'
      );
      console.log(`Updated ${updateResult.rowCount} legacy rows to use composite IDs`);
      
      // Step 10: Verify migration success
      const verifyMigration = await pool.query(
        'SELECT COUNT(*) FROM jobs WHERE id = composite_id AND (old_id IS NULL OR LENGTH(old_id) = 0)'
      );
      
      if (verifyMigration.rows[0].count < legacyJobs.rows.length) {
        throw new Error('Migration incomplete - some rows not properly updated');
      }
      
      // Step 11: Remove old_id column
      console.log('Step 9: Removing old_id column...');
      await pool.query('ALTER TABLE jobs DROP COLUMN old_id');
      
      // Step 12: Set composite_id as the primary key and remove temporary column
      console.log('Step 10: Finalizing schema...');
      await pool.query('ALTER TABLE jobs DROP CONSTRAINT jobs_composite_pk');
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id)');
      await pool.query('ALTER TABLE jobs DROP COLUMN composite_id');
      
      // Step 13: Commit the transaction
      await pool.query('COMMIT');
      
      console.log('\n✅ Migration completed successfully!');
      console.log('Legacy numeric IDs converted to composite format (jobicy-{source_job_id})');
      console.log('All job data preserved with source_job_id relationships maintained');
      
    } catch (error) {
      console.error('Migration failed:', error);
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authentication check
  if (!await verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await migrateJobsId();
    return NextResponse.json({ 
      message: 'Migration completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration execution failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Simple status check (no authentication required)
  return NextResponse.json({
    status: 'Migration service ready',
    timestamp: new Date().toISOString(),
    instructions: 'POST to execute migration with x-cron-secret header'
  });
}