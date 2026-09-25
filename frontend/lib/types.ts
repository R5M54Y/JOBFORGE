// JOBFORGE Frontend - Type Definitions

export interface Job {
  id: string;
  source: string;
  source_job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  category: string;
  employment_type: string;
  posted_at: string;
  scraped_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobFilters {
  keyword: string;
  location: string;
  category: string;
  employmentType: string;
}
