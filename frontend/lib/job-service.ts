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

  // Count query
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM jobs ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Sanitize pagination
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  // Data query
  const dataValues = [...values, safeLimit, offset];
  const result = await pool.query(
    `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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

// Add the findAll() function for sitemap routes
export async function findAll(): Promise<Job[]> {
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
