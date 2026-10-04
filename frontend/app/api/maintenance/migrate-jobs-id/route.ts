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

async function migrateJobsId(request: NextRequest): Promise<void> {
  let pool: Pool | null = null;
  
  try {
    console.log('Starting Jobs table ID migration in Vercel runtime...');
    
    const dbConfig = getDatabaseConfig();
    pool = new Pool({ 
      connectionString: dbConfig.connectionString, 
      max: 1 
    });
    console.log('Connected to PostgreSQL via Vercel runtime');
    
    // Phase 1: Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Phase 2: Inspect current schema
      console.log('Phase 2: Inspecting current schema...');
      
      // Check if jobs table exists
      const tableExists = await pool.query(
        `SELECT to_regclass('jobs') as exists`
      );
      if (!tableExists.rows[0].exists) {
        console.log('Jobs table does not exist - migration not needed');
        await pool.query('COMMIT');
        return;
      }
      
      // Check if old_id column exists (legacy column)
      const oldIdColumnInfo = await pool.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'jobs' AND column_name = 'old_id'
         AND table_schema = 'public'`
      );
      const hasOldId = oldIdColumnInfo.rows.length > 0;
      console.log(`has old_id column: ${hasOldId}`);
      
      // If old_id doesn't exist, migration is not needed
      if (!hasOldId) {
        console.log('Jobs table does not have old_id column - migration not needed');
        await pool.query('COMMIT');
        return;
      }
      
      // Phase 3: Capture current state
      console.log('Phase 3: Capturing current state...');
      const currentRowCount = await pool.query('SELECT COUNT(*) FROM jobs');
      const currentJobs = await pool.query(
        `SELECT id, old_id, source, source_job_id 
         FROM jobs 
         WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0
         ORDER BY id`
      );
      console.log(`Current jobs with legacy old_id: ${currentJobs.rows.length}`);
      
      // Early validation: Check for required fields
      console.log('Phase 4: Validating required fields...');
      for (const job of currentJobs.rows) {
        if (!job.source || job.source.trim() === '') {
          throw new Error(`Job with ID ${job.id} is missing source`);
        }
        if (!job.source_job_id || job.source_job_id.trim() === '') {
          throw new Error(`Job with ID ${job.id} (source: ${job.source}) is missing source_job_id`);
        }
      }
      
      // Calculate target composite IDs
      const targetIds: string[] = [];
      for (const job of currentJobs.rows) {
        const targetId = `${job.source.trim()}-${job.source_job_id.trim()}`;
        targetIds.push(targetId);
        console.log(`Job ID: ${job.id} -> Target ID: ${targetId}`);
      }
      
      // Check for duplicate target IDs
      const uniqueTargetIds = new Set(targetIds);
      if (targetIds.length !== uniqueTargetIds.size) {
        console.error('CRITICAL: Duplicate target IDs found! Migration aborted to prevent data loss.');
        const duplicates: { [key: string]: number } = {};
        for (const targetId of targetIds) {
          duplicates[targetId] = (duplicates[targetId] || 0) + 1;
        }
        for (const [targetId, count] of Object.entries(duplicates)) {
          if (count > 1) {
            console.error(`Target ID '${targetId}' conflicts with ${count} jobs`);
          }
        }
        await pool.query('ROLLBACK');
        return;
      }
      
      // Check for foreign key dependencies
      console.log('Phase 5: Checking foreign key dependencies...');
      const foreignKeyCheck = await pool.query(
        `SELECT conname, table_name, column_name 
         FROM pg_constraint 
         WHERE conrelid = 'jobs'::regclass 
         AND confrelid <> 'jobs'::regclass
         AND confkey IS NOT NULL`
      );
      
      if (foreignKeyCheck.rows.length > 0) {
        console.error('CRITICAL: Foreign key dependencies detected! Migration aborted.');
        foreignKeyCheck.rows.forEach((row: any) => {
          console.error(`Constraint: ${row.conname}, References: ${row.table_name}.${row.column_name}`);
        });
        await pool.query('ROLLBACK');
        return;
      }
      
      // Phase 6: Safe migration sequence
      console.log('Phase 6: Starting safe migration sequence...');
      
      // Step 1: Ensure id column is TEXT
      console.log('Step 1: Ensuring id column is TEXT type...');
      try {
        await pool.query('ALTER TABLE jobs ALTER COLUMN id TYPE TEXT');
      } catch (error) {
        console.log('Note: id type conversion may require manual intervention');
      }
      
      // Step 2: Add temporary column for migration
      console.log('Step 2: Adding temporary temp_id column...');
      await pool.query('ALTER TABLE jobs ADD COLUMN temp_id TEXT');
      
      // Step 3: Populate temp_id with new composite IDs
      console.log('Step 3: Populating temp_id with new composite IDs...');
      const tempIdQuery = `UPDATE jobs SET temp_id = source || '-' || source_job_id WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0`;
      const tempIdResult = await pool.query(tempIdQuery);
      console.log(`Updated ${tempIdResult.rowCount} legacy rows with new temp_id`);
      
      // Step 4: Verify temp_id population for all legacy rows
      console.log('Step 4: Verifying temp_id population...');
      const verifyTempId = await pool.query(
        'SELECT COUNT(*) FROM jobs WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0 AND temp_id IS NULL'
      );
      if (verifyTempId.rows[0].count > 0) {
        throw new Error(`Error: Some legacy jobs still missing temp_id (${verifyTempId.rows[0].count} rows)`);
      }
      
      // Step 5: Create new primary key on temp_id for temporary uniqueness
      console.log('Step 5: Creating temporary primary key on temp_id...');
      await pool.query('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_pkey');
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT jobs_temp_id_pk PRIMARY KEY (temp_id)');
      
      // Step 6: Create new unique constraint for (source, source_job_id)
      console.log('Step 6: Creating new source+source_job_id unique constraint...');
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT jobs_source_sourcejobid_unique UNIQUE (source, source_job_id)');
      
      // Step 7: Migrate id column to use temp_id
      console.log('Step 7: Migrating id column to use temp_id...');
      const updateIdQuery = `UPDATE jobs SET id = temp_id WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0`;
      const updateIdResult = await pool.query(updateIdQuery);
      console.log(`Migrated ${updateIdResult.rowCount} legacy rows from temp_id to id`);
      
      // Step 8: Verify migration completeness
      console.log('Step 8: Verifying migration completeness...');
      const verifyMigration = await pool.query(
        `SELECT COUNT(*) FROM jobs 
         WHERE (old_id IS NULL OR LENGTH(old_id) = 0) 
         AND id IS NOT NULL 
         AND id LIKE '%-%'
      `);
      
      const validFinalIds = verifyMigration.rows[0].count;
      console.log(`Valid final IDs after migration: ${validFinalIds} (expected: ${currentJobs.rows.length})`);
      
      // Verify no duplicate final IDs
      console.log('Step 9: Verifying no duplicate final IDs...');
      const finalIdCheck = await pool.query(
        `SELECT id, COUNT(*) as duplicates 
         FROM jobs 
         GROUP BY id 
         HAVING COUNT(*) > 1 
         ORDER BY duplicates DESC`
      );
      
      if (finalIdCheck.rows.length > 0) {
        throw new Error(`CRITICAL: Duplicate final IDs found! Migration aborted.`);
      }
      
      // Step 10: Remove temporary column
      console.log('Step 10: Removing temporary temp_id column...');
      await pool.query('ALTER TABLE jobs DROP CONSTRAINT jobs_temp_id_pk');
      await pool.query('ALTER TABLE jobs DROP COLUMN temp_id');
      
      // Step 11: Recreate the correct primary key
      console.log('Step 11: Recreating primary key on id...');
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id)');
      
      // Step 12: Final validation
      console.log('Step 12: Performing final validation...');
      const finalValidation = await pool.query(
        `SELECT 
         COUNT(*) as total_rows,
         COUNT(DISTINCT id) as unique_ids,
         COUNT(*) FILTER (WHERE id IS NULL) as null_ids,
         COUNT(*) FILTER (WHERE id IS NOT NULL AND id NOT LIKE '%-%') as invalid_format_ids,
         COUNT(*) FILTER (WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0) as legacy_still_present
         FROM jobs`
      );
      
      const finalStats = finalValidation.rows[0];
      console.log(`Final stats: ${finalStats.total_rows} total rows, ${finalStats.unique_ids} unique IDs, ${finalStats.null_ids} null IDs, ${finalStats.invalid_format_ids} invalid format IDs, ${finalStats.legacy_still_present} legacy rows still present`);
      
      if (finalStats.legacy_still_present > 0) {
        throw new Error(`Migration incomplete: ${finalStats.legacy_still_present} legacy rows still have old_id`);
      }
      
      if (finalStats.null_ids > 0) {
        throw new Error(`Migration incomplete: ${finalStats.null_ids} rows have NULL id`);
      }
      
      if (finalStats.invalid_format_ids > 0) {
        throw new Error(`Migration incomplete: ${finalStats.invalid_format_ids} rows have invalid ID format`);
      }
      
      // Step 13: Commit the transaction
      console.log('Step 13: Committing transaction...');
      await pool.query('COMMIT');
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`Migrated ${currentJobs.rows.length} legacy jobs to composite format`);
      console.log('All job data preserved with source_job_id relationships maintained');
      
    } catch (error) {
      console.error('Migration failed:', error);
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Database migration failed:', error);
    return;
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
  
  // Capture row count before migration for reporting
  let beforeCount = 0;
  let pool: Pool | null = null;
  
  try {
    // Get current row count
    const tempPool = new Pool({ 
      connectionString: getDatabaseConfig().connectionString, 
      max: 1 
    });
    const countResult = await tempPool.query('SELECT COUNT(*) FROM jobs');
    beforeCount = parseInt(countResult.rows[0].count, 10);
    await tempPool.end();
    
    // Execute migration
    await migrateJobsId(request);
    
    // Get row count after migration
    const afterPool = new Pool({ 
      connectionString: getDatabaseConfig().connectionString, 
      max: 1 
    });
    const afterCountResult = await afterPool.query('SELECT COUNT(*) FROM jobs');
    const afterCount = parseInt(afterCountResult.rows[0].count, 10);
    await afterPool.end();
    
    // Calculate stats
    const updated = beforeCount;
    
    return NextResponse.json({
      success: true,
      status: 'migrated',
      rowsBefore: beforeCount,
      rowsAfter: afterCount,
      updated,
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