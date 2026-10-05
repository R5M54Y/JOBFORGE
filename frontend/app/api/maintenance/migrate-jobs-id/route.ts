"use server";

import { NextRequest, NextResponse } from 'next/server';
import { Pool, QueryResult, PoolClient } from 'pg';
import { getPool } from '@/lib/db';

// Authentication using existing Vercel secrets
const CRON_SECRET = process.env.CRON_SECRET;

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
  const providedSecret = request.headers.get('x-cron-secret') || 
                        new URL(request.url).searchParams.get('cron_secret');
  return providedSecret === CRON_SECRET;
}

async function migrateJobsId(request: NextRequest): Promise<void> {
  const pool = getPool();
  
  try {
    console.log('Starting Jobs table ID migration in Vercel runtime...');
    
    // Phase 1: Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Phase 2: Inspect current schema
      console.log('Phase 2: Inspecting current schema...');
      
      // Check if jobs table exists
      const tableExists = await client.query(
        `SELECT to_regclass('jobs') as exists`
      );
      if (!tableExists.rows[0].exists) {
        console.log('Jobs table does not exist - migration not needed');
        await client.query('COMMIT');
        return;
      }
      
      // Check if old_id column exists (legacy column)
      const oldIdColumnInfo = await client.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'jobs' AND column_name = 'old_id'
         AND table_schema = 'public'`
      );
      const hasOldId = oldIdColumnInfo.rows.length > 0;
      console.log(`has old_id column: ${hasOldId}`);
      
      // If old_id doesn't exist, migration is not needed
      if (!hasOldId) {
        console.log('Jobs table does not have old_id column - migration not needed');
        await client.query('COMMIT');
        return;
      }
      
      // Phase 3: Capture current state
      console.log('Phase 3: Capturing current state...');
      const currentJobs = await client.query(
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
        await client.query('ROLLBACK');
        return;
      }
      
      // Check for foreign key dependencies
      console.log('Phase 5: Checking foreign key dependencies...');
      const foreignKeyCheck = await client.query(
        `SELECT conname, table_name, column_name 
         FROM pg_constraint 
         WHERE conrelid = 'jobs'::regclass 
         AND confrelid <> 'jobs'::regclass
         AND confkey IS NOT NULL`
      );
      
      if (foreignKeyCheck.rows.length > 0) {
        console.error('CRITICAL: Foreign key dependencies detected! Migration aborted.');
        await client.query('ROLLBACK');
        return;
      }
      
      // Phase 6: Safe migration sequence
      console.log('Phase 6: Starting safe migration sequence...');
      
      // STEP 1: Check if id is an identity column and handle accordingly
      console.log('Step 1a: Checking if id is an identity column...');
      const identityCheck = await client.query(
        `SELECT 
           column_name,
           is_identity
         FROM information_schema.columns 
         WHERE table_name = 'jobs' 
           AND column_name = 'id'
         AND table_schema = 'public'
       `);
      
      const isIdentityColumn = identityCheck.rows[0]?.is_identity === 'YES';
      
      if (isIdentityColumn) {
        console.log('Step 1b: Dropping identity from id column before TEXT conversion...');
        await client.query('ALTER TABLE public.jobs ALTER COLUMN id DROP IDENTITY IF EXISTS');
        
        // Verify identity was dropped
        const verifyIdentityDrop = await client.query(
          `SELECT 
             column_name,
             is_identity
           FROM information_schema.columns 
           WHERE table_name = 'jobs' 
             AND column_name = 'id'
           AND table_schema = 'public'
         `);
        
        const isStillIdentity = verifyIdentityDrop.rows[0]?.is_identity === 'YES';
        if (isStillIdentity) {
          throw new Error('CRITICAL: Failed to drop identity from jobs.id - column is still an identity after DROP IDENTITY attempt');
        }
      }
      
      // STEP 2: Add backup column before type conversion
      console.log('Step 2: Adding backup column backup_id...');
      await client.query('ALTER TABLE jobs ADD COLUMN backup_id TEXT');
      
      // Step 3: Populate backup column with current id values
      console.log('Step 3: Populating backup column with current id values...');
      await client.query('UPDATE jobs SET backup_id = id');
      
      console.log('Step 4: Converting id column to TEXT type...');
      await client.query('ALTER TABLE jobs ALTER COLUMN id TYPE TEXT');
      
      // Step 4: Populate id column with new composite IDs
      console.log('Step 4: Populating id column with new composite IDs...');
      const updateIdQuery = `UPDATE jobs SET id = source || '-' || source_job_id WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0`;
      const updateIdResult = await client.query(updateIdQuery);
      console.log(`Updated ${updateIdResult.rowCount} legacy rows with new composite IDs`);
      
      // Step 5: Verify id column population
      console.log('Step 5: Verifying id column population...');
      const verifyId = await client.query(
        'SELECT COUNT(*) FROM jobs WHERE old_id IS NOT NULL AND LENGTH(old_id) > 0 AND id IS NULL'
      );
      if (verifyId.rows[0].count > 0) {
        throw new Error(`Error: Some legacy jobs still missing id (${verifyId.rows[0].count} rows)`);
      }
      
      // Step 6: Create new primary key on id
      console.log('Step 6: Creating primary key on id...');
      await client.query('ALTER TABLE jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id)');
      
      // Step 7: Create new unique constraint for (source, source_job_id)
      console.log('Step 7: Creating new source+source_job_id unique constraint...');
      await client.query('ALTER TABLE jobs ADD CONSTRAINT jobs_source_sourcejobid_unique UNIQUE (source, source_job_id)');
      
      // Step 8: Verify migration completeness
      console.log('Step 8: Verifying migration completeness...');
      const verifyMigration = await client.query(
        `SELECT COUNT(*) FROM jobs 
         WHERE (old_id IS NULL OR LENGTH(old_id) = 0) 
         AND id IS NOT NULL 
         AND id LIKE '%-%'
        `);
      
      const validFinalIds = verifyMigration.rows[0].count;
      console.log(`Valid final IDs after migration: ${validFinalIds} (expected: ${currentJobs.rows.length})`);
      
      // Verify no duplicate final IDs
      console.log('Step 9: Verifying no duplicate final IDs...');
      const finalIdCheck = await client.query(
        `SELECT id, COUNT(*) as duplicates 
         FROM jobs 
         GROUP BY id 
         HAVING COUNT(*) > 1 
         ORDER BY duplicates DESC`
      );
      
      if (finalIdCheck.rows.length > 0) {
        throw new Error(`CRITICAL: Duplicate final IDs found! Migration aborted.`);
      }
      
      // Step 10: Remove old_id column (legacy column)
      console.log('Step 10: Removing legacy old_id column...');
      await client.query('ALTER TABLE jobs DROP COLUMN old_id');
      
      // Step 11: Remove backup column
      console.log('Step 11: Removing backup column...');
      await client.query('ALTER TABLE jobs DROP COLUMN backup_id');
      
      // Step 12: Final validation
      console.log('Step 12: Performing final validation...');
      const finalValidation = await client.query(
        `SELECT 
         COUNT(*) as total_rows,
         COUNT(DISTINCT id) as unique_ids,
         COUNT(*) FILTER (WHERE id IS NULL) as null_ids,
         COUNT(*) FILTER (WHERE id IS NOT NULL AND id NOT LIKE '%-%') as invalid_format_ids
         FROM jobs`
      );
      
      const finalStats = finalValidation.rows[0];
      console.log(`Final stats: ${finalStats.total_rows} total rows, ${finalStats.unique_ids} unique IDs, ${finalStats.null_ids} null IDs, ${finalStats.invalid_format_ids} invalid format IDs`);
      
      if (finalStats.null_ids > 0) {
        throw new Error(`Migration incomplete: ${finalStats.null_ids} rows have NULL id`);
      }
      
      if (finalStats.invalid_format_ids > 0) {
        throw new Error(`Migration incomplete: ${finalStats.invalid_format_ids} rows have invalid ID format`);
      }
      
      // Step 13: Commit the transaction
      console.log('Step 13: Committing transaction...');
      await client.query('COMMIT');
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`Migrated ${currentJobs.rows.length} legacy jobs to composite format`);
      console.log('All job data preserved with source_job_id relationships maintained');
      
    } catch (error) {
      console.error('Migration failed:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database migration failed:', error);
    return;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authentication check
  if (!await verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Execute migration
    await migrateJobsId(request);
    
    return NextResponse.json({
      success: true,
      status: 'migrated',
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