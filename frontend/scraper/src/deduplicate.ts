// JOBFORGE Scraper - Deduplicate Module
import { Job } from './types';

export class Deduplicate {
  static bySourceAndId(jobs: Job[]): { unique: Job[]; duplicatesRemoved: number } {
    const seen = new Set<string>();
    const unique: Job[] = [];
    let duplicatesRemoved = 0;

    for (const job of jobs) {
      const key = `${job.source}::${job.sourceJobId}`;
      if (seen.has(key)) {
        duplicatesRemoved++;
        console.warn(`Duplicate removed: ${key}`);
      } else {
        seen.add(key);
        unique.push(job);
      }
    }

    return { unique, duplicatesRemoved };
  }
}
