// JOBFORGE Scraper - Main Entry Point
import * as dotenv from 'dotenv';
dotenv.config();

import { RemoteOKSource, RemotiveSource, IJobSource } from './sources';
import { Normalize } from './normalize';
import { Validate } from './validate';
import { Deduplicate } from './deduplicate';
import { Database } from './db';
import { ScrapeResult, SourceResult, RemoteOKJob, RemotiveJob } from './types';
import { getDatabaseConfig } from './config/database';

async function runSource(
  source: IJobSource,
  db: Database
): Promise<SourceResult> {
  const result: SourceResult = {
    source: source.name,
    fetched: 0,
    normalized: 0,
    valid: 0,
    rejected: 0,
    duplicatesRemoved: 0,
    upserted: 0,
    failed: 0,
  };

  try {
    console.log(`\n--- ${source.name.toUpperCase()} ---`);

    // Step 1: FETCH
    const rawJobs = await source.fetchJobs();
    result.fetched = rawJobs.length;
    console.log(`Fetched: ${result.fetched}`);

    // Step 2: NORMALIZE
    let normalized;
    if (source.name === 'remoteok') {
      normalized = Normalize.fromRemoteOKMany(rawJobs as RemoteOKJob[]);
    } else if (source.name === 'remotive') {
      normalized = Normalize.fromRemotiveMany(rawJobs as RemotiveJob[]);
    } else {
      throw new Error(`Unknown source: ${source.name}`);
    }
    result.normalized = normalized.length;
    console.log(`Normalized: ${result.normalized}`);

    // Step 3: VALIDATE
    const { valid, rejected } = Validate.filterValid(normalized);
    result.valid = valid.length;
    result.rejected = rejected.length;
    console.log(`Valid: ${result.valid}, Rejected: ${result.rejected}`);

    // Step 4: DEDUPLICATE
    const { unique, duplicatesRemoved } = Deduplicate.bySourceAndId(valid);
    result.duplicatesRemoved = duplicatesRemoved;
    console.log(`Unique: ${unique.length}, Duplicates removed: ${duplicatesRemoved}`);

    // Step 5: UPSERT
    const { upserted, failed } = await db.upsertMany(unique);
    result.upserted = upserted;
    result.failed = failed;
    console.log(`Upserted: ${upserted}, Failed: ${failed}`);

    return result;
  } catch (err) {
    console.error(`${source.name} ERROR:`, err);
    throw err;
  }
}

async function run(): Promise<ScrapeResult> {
  const dbConfig = getDatabaseConfig();

  const sources: IJobSource[] = [
    new RemoteOKSource(),
    new RemotiveSource(),
  ];

  const sourceResults: SourceResult[] = [];
  const db = new Database(dbConfig.connectionString);

  try {
    console.log('\n=== JOBFORGE Scraper ===\n');
    await db.initSchema();

    const countBefore = await db.getJobCount();
    console.log(`Jobs in DB before scrape: ${countBefore}`);

    // Run each source independently
    for (const source of sources) {
      try {
        const result = await runSource(source, db);
        sourceResults.push(result);
      } catch (err) {
        console.error(`\nFATAL: ${source.name} failed:`, err);
        // Record failure but continue with other sources
        sourceResults.push({
          source: source.name,
          fetched: 0,
          normalized: 0,
          valid: 0,
          rejected: 0,
          duplicatesRemoved: 0,
          upserted: 0,
          failed: 0,
        });
      }
    }

    const countAfter = await db.getJobCount();
    console.log(`\nJobs in DB after scrape: ${countAfter}`);

    // Aggregate results
    const totalResult: ScrapeResult = {
      fetched: 0,
      normalized: 0,
      valid: 0,
      rejected: 0,
      duplicatesRemoved: 0,
      upserted: 0,
      failed: 0,
    };

    console.log('\n=== Source Results ===');
    for (const sr of sourceResults) {
      console.log(`\n${sr.source.toUpperCase()}:`);
      console.log(`  Fetched: ${sr.fetched}`);
      console.log(`  Normalized: ${sr.normalized}`);
      console.log(`  Valid: ${sr.valid}`);
      console.log(`  Rejected: ${sr.rejected}`);
      console.log(`  Duplicates removed: ${sr.duplicatesRemoved}`);
      console.log(`  Upserted: ${sr.upserted}`);
      console.log(`  Failed: ${sr.failed}`);

      totalResult.fetched += sr.fetched;
      totalResult.normalized += sr.normalized;
      totalResult.valid += sr.valid;
      totalResult.rejected += sr.rejected;
      totalResult.duplicatesRemoved += sr.duplicatesRemoved;
      totalResult.upserted += sr.upserted;
      totalResult.failed += sr.failed;
    }

    console.log('\n=== TOTAL ===');
    console.log(JSON.stringify(totalResult, null, 2));

    if (totalResult.failed > 0) {
      console.error(`\nWARNING: ${totalResult.failed} jobs failed to upsert`);
      process.exitCode = 1;
    }

    return totalResult;
  } finally {
    await db.close();
  }
}

run().catch((err) => {
  console.error('Scraper fatal error:', err);
  process.exit(1);
});
