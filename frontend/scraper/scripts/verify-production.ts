// JOBFORGE Production Verification Script
// Verify post-migration database state and application behavior

import { Pool } from 'pg';

async function verify() {
  const connectionString = process.env.DATABASE_URL || process.env.REMOTEJOBSDB_POSTGRES_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not configured');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });

  try {
    console.log('=== PRODUCTION VERIFICATION ===');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // 1. DATABASE IDENTITY VERIFICATION
    console.log('[1] Database Schema Verification');
    
    const idColInfo = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'jobs' AND column_name = 'id'
    `);
    console.log('jobs.id column:', JSON.stringify(idColInfo.rows[0], null, 2));

    const pkInfo = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'jobs' AND constraint_type = 'PRIMARY KEY'
    `);
    console.log('Primary key:', JSON.stringify(pkInfo.rows[0], null, 2));

    // Check for identity/sequence
    const seqInfo = await pool.query(`
      SELECT pg_get_serial_sequence('jobs', 'id') as sequence_name
    `);
    console.log('Sequence:', JSON.stringify(seqInfo.rows[0], null, 2));

    // 2. DATA INTEGRITY
    console.log('\n[2] Data Integrity Checks');
    
    const counts = await pool.query(`
      SELECT
        COUNT(*) as total_jobs,
        COUNT(DISTINCT id) as unique_ids,
        COUNT(DISTINCT source || ':' || source_job_id) as unique_sources,
        COUNT(*) FILTER (WHERE id IS NULL) as null_ids
      FROM jobs
    `);
    console.log('Counts:', JSON.stringify(counts.rows[0], null, 2));

    // Check for duplicate IDs
    const dupIds = await pool.query(`
      SELECT id, COUNT(*) as cnt
      FROM jobs
      GROUP BY id
      HAVING COUNT(*) > 1
    `);
    console.log(`Duplicate IDs: ${dupIds.rows.length}`);

    // Check for duplicate (source, source_job_id)
    const dupSources = await pool.query(`
      SELECT source, source_job_id, COUNT(*) as cnt
      FROM jobs
      GROUP BY source, source_job_id
      HAVING COUNT(*) > 1
    `);
    console.log(`Duplicate (source, source_job_id): ${dupSources.rows.length}`);

    // 3. SAMPLE JOB (remotive-2091140)
    console.log('\n[3] Sample Job Verification');
    
    const sampleJob = await pool.query(`
      SELECT id, old_id, source, source_job_id, title, url
      FROM jobs
      WHERE source = 'remotive' AND source_job_id = '2091140'
      LIMIT 1
    `);

    if (sampleJob.rows.length === 0) {
      console.log('❌ Sample job (remotive-2091140) NOT FOUND');
    } else {
      console.log('Sample job:', JSON.stringify(sampleJob.rows[0], null, 2));
      
      // Generate permalink
      const job = sampleJob.rows[0];
      const slug = job.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const permalink = `/jobs/${slug}-${job.id}`;
      console.log(`Generated permalink: ${permalink}`);
    }

    // 4. UNIQUE CONSTRAINT VERIFICATION
    console.log('\n[4] Constraint Verification');
    
    const uniqueConstraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'jobs' AND constraint_type = 'UNIQUE'
    `);
    console.log('UNIQUE constraints:', JSON.stringify(uniqueConstraints.rows, null, 2));

    // 5. ID RANGE CHECK
    console.log('\n[5] ID Range');
    
    const idRange = await pool.query(`
      SELECT MIN(id) as min_id, MAX(id) as max_id
      FROM jobs
    `);
    console.log('ID range:', JSON.stringify(idRange.rows[0], null, 2));

    console.log('\n✅ VERIFICATION COMPLETE');

  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
