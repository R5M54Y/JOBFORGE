'use client';

import Link from 'next/link';
import { getJobPermalink } from '@/lib/slugify'; // Assuming this helper exists and works correctly
import type { Job } from '@/lib/types';

interface Props {
  jobs: Job[];
}

export function JobList({ jobs }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <p>No jobs found matching your criteria.</p>
        <p className="small">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      {jobs.map((job) => (
        <div key={job.id} className="col">
          <Link
            href={getJobPermalink(job)}
            className="text-decoration-none text-dark"
          >
            <div className="card h-100 shadow-sm border-0 job-card">
              <div className="card-body d-flex flex-column">
                <h2 className="h5 fw-bold mb-1 text-primary">
                  {job.title}
                </h2>
                <p className="text-muted mb-2">
                  {job.company} <span className="text-secondary">•</span> {job.location}
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3 small text-secondary">
                  {job.category && <span>📁 {job.category}</span>}
                  {job.employment_type && <span>⏰ {job.employment_type}</span>}
                  {job.source && <span>🏷️ {job.source}</span>}
                </div>
                {job.description && (
                  <p className="card-text text-muted flex-grow-1 mb-3">
                    {job.description.substring(0, 150)}...
                  </p>
                )}
                <div className="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                  <small className="text-muted">
                    Posted: {new Date(job.posted_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                  </small>
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(job.url, '_blank', 'noopener noreferrer');
                    }}
                    className="btn btn-outline-primary btn-sm fw-medium px-3 rounded-pill"
                  >
                    Apply &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
