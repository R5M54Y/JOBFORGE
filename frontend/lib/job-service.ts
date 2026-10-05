import { getPool } from './db';
import { Job, JobsResponse, JobFilters } from './types';
import { APP_CONFIG } from '@/config/siteConfig';

export async function getJobs(
  filters: Partial<JobFilters>,
  page: number = APP_CONFIG.pagination.defaultPage,
  limit: number = APP_CONFIG.pagination.defaultLimit
): Promise<JobsResponse> {
  const pool = getPool();
  const conditions: string[] = ['is_active = TRUE'];
  const values: (string | number)[] = [];
  let idx = 1;

  if (filters.keyword && filters.keyword.length >= APP_CONFIG.filters.keyword.minLength) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    values.push(`%${filters.keyword}%`);
    idx++;
  }

  if (filters.location) {
    conditions.push(`location ILIKE $${idx}`);
    values.push(`%${filters.location}%`);
    idx++;
  }

  if (filters.category) {
    conditions.push(`category = $${idx}`);
    values.push(filters.category);
    idx++;
  }

  if (filters.employmentType) {
    conditions.push(`employment_type = $${idx}`);
    values.push(filters.employmentType);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM jobs ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const dataValues = [...values, safeLimit, offset];
  const selectColumns = [
    'id', 'source', 'source_job_id', 'title', 'company', 
    'location', 'description', 'url', 'category', 'employment_type', 
    'posted_at', 'scraped_at', 'expires_at', 'is_active', 
    'created_at', 'updated_at'
  ];
  const result = await pool.query(
    `SELECT ${selectColumns.join(', ')} FROM jobs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    dataValues
  );

  return {
    jobs: result.rows as Job[],
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}
export async function getJobById(id: string): Promise<Job | null> {
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT id, source, source_job_id, title, company, location, 
          description, url, category, employment_type, 
          posted_at, scraped_at, expires_at, is_active, 
          created_at, updated_at 
       FROM jobs 
       WHERE id = $1 AND is_active = TRUE 
       LIMIT 1`,
      [id]
    );
    return result.rows[0] as Job | null;
  } catch (error) {
    console.error('Error fetching job by ID:', error);
    return null;
  }
}

export async function findBySourceAndJobId(source: string, sourceJobId: string): Promise<Job | null> {
  const pool = getPool();
  try {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE source = $1 AND source_job_id = $2 AND is_active = TRUE LIMIT 1',
      [source, sourceJobId]
    );
    return result.rows[0] as Job | null;
  } catch (error) {
    console.error('Error fetching job by source and source_job_id:', error);
    return null;
  }
}

export async function findAll(): Promise<Job[]> {
  const pool = getPool();
  try {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    return result.rows as Job[];
  } catch (error) {
    console.error('Error fetching all jobs:', error);
    return [];
  }
}

export async function getRelatedJobs(currentJobId: string, category: string, limit: number = 6): Promise<Job[]> {
  const pool = getPool();
  try {
    // Find related jobs by category, excluding current job
    const result = await pool.query(
      `SELECT * FROM jobs 
       WHERE is_active = TRUE 
       AND id != $1 
       AND category = $2 
       ORDER BY created_at DESC 
       LIMIT $3`,
      [currentJobId, category, limit]
    );
    return result.rows as Job[];
  } catch (error) {
    console.error('Error fetching related jobs:', error);
    return [];
  }
}

export async function getCategoriesWithCounts(): Promise<Array<{ category: string; count: number }>> {
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count 
       FROM jobs 
       WHERE is_active = TRUE AND category IS NOT NULL AND category != '' 
       GROUP BY category 
       ORDER BY count DESC, category ASC`
    );
    return result.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count, 10)
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function getLocationsWithCounts(): Promise<Array<{ location: string; count: number }>> {
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT location, COUNT(*) as count 
       FROM jobs 
       WHERE is_active = TRUE AND location IS NOT NULL AND location != '' 
       GROUP BY location 
       ORDER BY count DESC, location ASC`
    );
    return result.rows.map(row => ({
      location: row.location,
      count: parseInt(row.count, 10)
    }));
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  const pool = getPool();
  try {
    // Search for job where the slug generated from title matches the requested slug
    const result = await pool.query(
      `SELECT id, source, source_job_id, title, company, location, 
              description, url, category, employment_type, 
              posted_at, scraped_at, expires_at, is_active, 
              created_at, updated_at 
       FROM jobs 
       WHERE is_active = TRUE 
       LIMIT 100`
    );

    // Find job where generated slug matches requested slug
    for (const row of result.rows) {
      const job: Job = {
        id: row.id,
        source: row.source,
        source_job_id: row.source_job_id,
        title: row.title,
        company: row.company,
        location: row.location,
        description: row.description,
        url: row.url,
        category: row.category,
        employment_type: row.employment_type,
        posted_at: row.posted_at,
        scraped_at: row.scraped_at,
        expires_at: row.expires_at,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        slug: generateSlug(row.title)
      };
      
      if (job.slug === slug) {
        return job;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching job by slug:', error);
    return null;
  }
}
