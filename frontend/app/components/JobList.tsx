import Link from 'next/link';
import type { Job } from '@/lib/types';

interface Props {
  jobs: Job[];
}

export function JobList({ jobs }: Props) {
  if (jobs.length === 0) {
    return <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No jobs found</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}`}
          style={{
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: 8,
              padding: '1.25rem',
              cursor: 'pointer',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0070f3';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,112,243,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#eee';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#0070f3' }}>{job.title}</h2>
                <p style={{ color: '#555', margin: '0.25rem 0' }}>{job.company}</p>
              </div>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(job.url, '_blank');
                }}
                style={{
                  padding: '0.4rem 1rem',
                  background: '#0070f3',
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                Apply &rarr;
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.85rem', color: '#777' }}>
              <span>📍 {job.location}</span>
              <span>📁 {job.category}</span>
              <span>⏰ {job.employment_type}</span>
              <span>🏷️ {job.source}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
