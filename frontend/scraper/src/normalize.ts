// JOBFORGE Scraper - Normalize Module
import { RemoteOKJob, RemotiveJob, JobicyJob, Job } from './types';

export class Normalize {
  static fromRemoteOK(raw: RemoteOKJob): Job {
    const now = new Date();
    const sourceJobId = String(raw.id);

    // RemoteOK date field can come in several names
    const dateStr =
      raw.date || raw.created_at || raw.publication_date || '';
    let postedAt: Date;
    try {
      postedAt = dateStr ? new Date(dateStr) : now;
      if (isNaN(postedAt.getTime())) postedAt = now;
    } catch {
      postedAt = now;
    }

    const location =
      raw.candidate_required_location ||
      raw.location ||
      'Remote';

    // RemoteOK uses 'position' field, fallback to 'title'
    const title = (raw.position || raw.title || '').trim();

    return {
      id: `remoteok-${sourceJobId}`,
      source: 'remoteok',
      sourceJobId,
      title,
      company: (raw.company || '').trim(),
      location: location.trim(),
      description: (raw.description || '').trim(),
      url: raw.url && raw.url.startsWith('http')
        ? raw.url
        : `https://remoteok.com/remote-jobs/${raw.slug || raw.id}`,
      category: (raw.category || raw.tags?.[0] || 'other').trim(),
      employmentType: (raw.job_type || 'full-time').trim().toLowerCase(),
      postedAt,
      scrapedAt: now,
      expiresAt: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  static fromRemoteOKMany(rawJobs: RemoteOKJob[]): Job[] {
    const results: Job[] = [];
    for (const raw of rawJobs) {
      try {
        results.push(this.fromRemoteOK(raw));
      } catch (err) {
        console.warn(`Normalize skip RemoteOK job id=${raw.id}: ${err}`);
      }
    }
    return results;
  }

  static fromRemotive(raw: RemotiveJob): Job {
    const now = new Date();
    const sourceJobId = String(raw.id);

    let postedAt: Date;
    try {
      postedAt = raw.publication_date ? new Date(raw.publication_date) : now;
      if (isNaN(postedAt.getTime())) postedAt = now;
    } catch {
      postedAt = now;
    }

    const location = raw.candidate_required_location || 'Remote';

    return {
      id: `remotive-${sourceJobId}`,
      source: 'remotive',
      sourceJobId,
      title: (raw.title || '').trim(),
      company: (raw.company_name || '').trim(),
      location: location.trim(),
      description: (raw.description || '').trim(),
      url: raw.url || '',
      category: (raw.category || raw.tags?.[0] || 'other').trim(),
      employmentType: (raw.job_type || 'full_time').trim().toLowerCase().replace('_', '-'),
      postedAt,
      scrapedAt: now,
      expiresAt: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  static fromRemotiveMany(rawJobs: RemotiveJob[]): Job[] {
    const results: Job[] = [];
    for (const raw of rawJobs) {
      try {
        results.push(this.fromRemotive(raw));
      } catch (err) {
        console.warn(`Normalize skip Remotive job id=${raw.id}: ${err}`);
      }
    }
    return results;
  }

  static fromJobicy(raw: JobicyJob): Job {
    const now = new Date();
    const sourceJobId = String(raw.id);

    let postedAt: Date;
    try {
      postedAt = raw.pubDate ? new Date(raw.pubDate) : now;
      if (isNaN(postedAt.getTime())) postedAt = now;
    } catch {
      postedAt = now;
    }

    const location = raw.jobGeo || 'Remote';
    
    // Build salary string if available
    let salary = '';
    if (raw.annualSalaryMin || raw.annualSalaryMax) {
      const currency = raw.salaryCurrency || 'USD';
      if (raw.annualSalaryMin && raw.annualSalaryMax) {
        salary = `${currency} ${raw.annualSalaryMin}-${raw.annualSalaryMax}`;
      } else if (raw.annualSalaryMin) {
        salary = `${currency} ${raw.annualSalaryMin}+`;
      } else if (raw.annualSalaryMax) {
        salary = `${currency} up to ${raw.annualSalaryMax}`;
      }
    }

    // Use first industry as category, fallback to 'other'
    const category = (raw.jobIndustry && raw.jobIndustry.length > 0)
      ? raw.jobIndustry[0].trim()
      : 'other';

    // Use first jobType, fallback to 'full-time'
    const employmentType = (raw.jobType && raw.jobType.length > 0)
      ? raw.jobType[0].trim().toLowerCase().replace(/_/g, '-')
      : 'full-time';

    // FIXED: HTML sanitization for Jobicy descriptions
    // FIXED: HTML sanitization for Jobicy descriptions
    let description = (raw.jobDescription || raw.description || '').trim();
    // Remove HTML tags, preserve readable text structure
    description = description
      .replace(/<[^>]*>/g, ' ')  // Replace tags with single space
      .replace(/\s+/g, ' ')      // Collapse whitespace
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\s*<\/\s*/g, ' '); // Clean up tag closing patterns
    // Remove HTML tags, preserve readable text structure
    description = description
      .replace(/<[^>]*>/g, ' ')  // Replace tags with single space
      .replace(/\s+/g, ' ')      // Collapse whitespace
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\s*<\/\s*/g, ' '); // Clean up tag closing patterns

    return {
      id: `jobicy-${sourceJobId}`,
      source: 'jobicy',
      sourceJobId,
      title: (raw.jobTitle || raw.title || '').trim(),
      company: (raw.companyName || '').trim(),
      location: location.trim(),
      description,
      url: raw.url || '',
      category,
      employmentType,
      postedAt,
      scrapedAt: now,
      expiresAt: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  static fromJobicyMany(rawJobs: JobicyJob[]): Job[] {
    const results: Job[] = [];
    for (const raw of rawJobs) {
      try {
        results.push(this.fromJobicy(raw));
      } catch (err) {
        console.warn(`Normalize skip Jobicy job id=${raw.id}: ${err}`);
      }
    }
    return results;
  }
}