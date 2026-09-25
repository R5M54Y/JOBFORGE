// JOBFORGE Scraper - Abstract Source Interface
import { RemoteOKJob, RemotiveJob } from './types';

export interface IJobSource {
  name: string;
  fetchJobs(): Promise<unknown[]>;
}

export class RemoteOKSource implements IJobSource {
  name = 'remoteok';

  async fetchJobs(): Promise<RemoteOKJob[]> {
    const url = 'https://remoteok.com/api';

    console.log(`Fetching from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JOBFORGE-Scraper/1.0 (+https://github.com/jobforge)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`RemoteOK API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('RemoteOK API returned non-array response');
    }

    // RemoteOK returns a "legal" notice as first element — skip non-job objects
    const jobs = data.filter(
      (item: unknown): item is RemoteOKJob =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        ('position' in (item as Record<string, unknown>) || 'title' in (item as Record<string, unknown>))
    );

    console.log(`Fetched ${jobs.length} raw jobs from RemoteOK (filtered from ${data.length} items)`);
    return jobs;
  }
}

export class RemotiveSource implements IJobSource {
  name = 'remotive';

  async fetchJobs(): Promise<RemotiveJob[]> {
    const url = 'https://remotive.com/api/remote-jobs';

    console.log(`Fetching from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JOBFORGE-Scraper/1.0 (+https://github.com/jobforge)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Remotive API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Remotive returns an object with "jobs" array
    if (
      typeof data === 'object' &&
      data !== null &&
      'jobs' in data &&
      Array.isArray((data as Record<string, unknown>).jobs)
    ) {
      const jobs = (data as Record<string, unknown>).jobs as RemotiveJob[];
      console.log(`Fetched ${jobs.length} raw jobs from Remotive`);
      return jobs;
    }

    throw new Error('Remotive API returned unexpected response format');
  }
}
