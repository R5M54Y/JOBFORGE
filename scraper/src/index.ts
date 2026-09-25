// JOBFORGE Scraper - Main Entry Point
import * as dotenv from 'dotenv';
dotenv.config();

import { Source } from './source';
import { Normalize } from './normalize';
import { Validate } from './validate';
import { Deduplicate } from './deduplicate';
import { Database } from './db';
import { ScrapeResult } from './types';

async function run(): Promise<ScrapeResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const result: ScrapeResult = {
    fetched: 0,
    normalized: 0,
    valid: 0,
    rejected: 0,
    duplicatesRemoved: 0,
    upserted: 0,
    failed: 0,
  };

  const db = new Database(databaseUrl);

  try {
    // Step 0: Initialize schema (idempotent)
    console.log('\n=== JOBFORGE Scraper ===\n');
    await db.initSchema();

    const countBefore = await db.getJobCount();
    console.log(`Jobs in DB before scrape: ${countBefore}`);

    // Step 1: FETCH
    console.log('\n--- Step 1: FETCH ---');
    const rawJobs = await Source.fetchRemoteOK();
    result.fetched = rawJobs.length;
    console.log(`Fetched: ${result.fetched}`);

    // Step 2: NORMALIZE
    console.log('\n--- Step 2: NORMALIZE ---');
    const normalized = Normalize.fromRemoteOKMany(rawJobs);
    result.normalized = normalized.length;
    console.log(`Normalized: ${result.normalized}`);

    // Step 3: VALIDATE
    console.log('\n--- Step 3: VALIDATE ---');
    const { valid, rejected } = Validate.filterValid(normalized);
    result.valid = valid.length;
    result.rejected = rejected.length;
    console.log(`Valid: ${result.valid}, Rejected: ${result.rejected}`);

    // Step 4: DEDUPLICATE
    console.log('\n--- Step 4: DEDUPLICATE ---');
    const { unique, duplicatesRemoved } = Deduplicate.bySourceAndId(valid);
    result.duplicatesRemoved = duplicatesRemoved;
    console.log(`Unique: ${unique.length}, Duplicates removed: ${duplicatesRemoved}`);

    // Step 5: UPSERT
    console.log('\n--- Step 5: UPSERT ---');
    const { upserted, failed } = await db.upsertMany(unique);
    result.upserted = upserted;
    result.failed = failed;
    console.log(`Upserted: ${upserted}, Failed: ${failed}`);

    const countAfter = await db.getJobCount();
    console.log(`\nJobs in DB after scrape: ${countAfter}`);

    console.log('\n=== Scrape Summary ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.failed > 0) {
      console.error(`\nWARNING: ${result.failed} jobs failed to upsert`);
      process.exitCode = 1;
    }

    return result;
  } finally {
    await db.close();
  }
}

run().catch((err) => {
  console.error('Scraper fatal error:', err);
  process.exit(1);
});
