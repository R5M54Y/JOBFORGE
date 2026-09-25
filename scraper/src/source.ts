// JOBFORGE Scraper - Source Module (RemoteOK)
import { RemoteOKJob } from './types';

export class Source {
  static async fetchRemoteOK(): Promise<RemoteOKJob[]> {
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
        'title' in (item as Record<string, unknown>)
    );

    console.log(`Fetched ${jobs.length} raw jobs from RemoteOK (filtered from ${data.length} items)`);
    return jobs;
  }
}
