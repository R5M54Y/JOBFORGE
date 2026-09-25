// JOBFORGE Scraper - Validate Module
import { Job } from './types';

export class Validate {
  static isValid(job: Job): boolean {
    if (!job.title || job.title.length === 0) return false;
    if (!job.company || job.company.length === 0) return false;
    if (!job.url || !job.url.startsWith('http')) return false;
    if (!job.source) return false;
    if (!job.sourceJobId) return false;
    return true;
  }

  static filterValid(jobs: Job[]): { valid: Job[]; rejected: Job[] } {
    const valid: Job[] = [];
    const rejected: Job[] = [];
    for (const job of jobs) {
      if (this.isValid(job)) {
        valid.push(job);
      } else {
        rejected.push(job);
        console.warn(`Rejected: id=${job.id} title="${job.title}" reason=missing_required_fields`);
      }
    }
    return { valid, rejected };
  }
}
