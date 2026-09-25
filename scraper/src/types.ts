// JOBFORGE Scraper - Type Definitions

export interface RemoteOKJob {
  id: string | number;
  url?: string;
  position?: string;
  title?: string;
  company: string;
  company_logo: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  // RemoteOK may also send these fields
  slug?: string;
  location?: string;
  created_at?: string;
  date?: string;
  company_logo_url?: string;
  epoch?: number;
  [key: string]: unknown;
}

export interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  description: string;
  [key: string]: unknown;
}

export interface Job {
  id: string;
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  category: string;
  employmentType: string;
  postedAt: Date;
  scrapedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapeResult {
  fetched: number;
  normalized: number;
  valid: number;
  rejected: number;
  duplicatesRemoved: number;
  upserted: number;
  failed: number;
}

export interface SourceResult {
  source: string;
  fetched: number;
  normalized: number;
  valid: number;
  rejected: number;
  duplicatesRemoved: number;
  upserted: number;
  failed: number;
}
