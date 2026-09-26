// JOBFORGE - Slug Generation Utility
// Deterministic slug generation from job titles

/**
 * Generate URL-safe slug from job title
 * 
 * Rules:
 * - lowercase
 * - trim whitespace
 * - replace whitespace runs with single hyphen
 * - remove punctuation except hyphens
 * - collapse repeated hyphens
 * - remove leading/trailing hyphens
 * 
 * @param title Job title
 * @returns URL-safe slug
 * 
 * @example
 * slugify("Senior Shopify Developer") → "senior-shopify-developer"
 * slugify("React / Next.js Engineer!") → "react-nextjs-engineer"
 * slugify("Senior Developer, Remote") → "senior-developer-remote"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace whitespace runs with single hyphen
    .replace(/\s+/g, '-')
    // Remove all punctuation except hyphens
    .replace(/[^\w-]/g, '')
    // Collapse repeated hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate canonical job permalink
 * 
 * Format: /jobs/{slug}-{id}
 * 
 * @param job Job object with title and id
 * @returns Canonical permalink path
 * 
 * @example
 * getJobPermalink({ title: "Senior Dev", id: "15654622" })
 * → "/jobs/senior-dev-15654622"
 */
export function getJobPermalink(job: { title: string; id: string | number }): string {
  const slug = slugify(job.title);
  return `/jobs/${slug}-${job.id}`;
}

/**
 * Parse job ID from permalink
 * 
 * Extracts numeric ID from slug-id format
 * 
 * @param permalink Path segment (e.g., "senior-dev-15654622")
 * @returns Numeric ID or null if invalid
 * 
 * @example
 * parseJobId("senior-dev-15654622") → "15654622"
 * parseJobId("15654622") → "15654622"
 * parseJobId("invalid") → null
 */
export function parseJobId(permalink: string): string | null {
  // Extract last segment after final hyphen
  const match = permalink.match(/-(\d+)$/);
  if (match) {
    return match[1];
  }
  
  // Fallback: if entire string is numeric (direct ID)
  if (/^\d+$/.test(permalink)) {
    return permalink;
  }
  
  return null;
}

/**
 * Parse legacy job ID from old permalink format
 * 
 * Extracts source and source_job_id from source-id format
 * 
 * @param permalink Path segment (e.g., "remotive-2091140")
 * @returns { source, sourceJobId } or null
 * 
 * @example
 * parseLegacyJobId("remotive-2091140") → { source: "remotive", sourceJobId: "2091140" }
 */
export function parseLegacyJobId(permalink: string): { source: string; sourceJobId: string } | null {
  // Match pattern: {source}-{numeric_id}
  const match = permalink.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    return {
      source: match[1],
      sourceJobId: match[2],
    };
  }
  return null;
}
