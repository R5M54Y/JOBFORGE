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
        <div
          key={job.id}
          style={{
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 8,
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{job.title}</h2>
              <p style={{ color: '#555', margin: '0.25rem 0' }}>{job.company}</p>
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.4rem 1rem',
                background: '#0070f3',
                color: '#fff',
                borderRadius: 6,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
              }}
            >
              Apply &rarr;
            </a>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.85rem', color: '#777' }}>
            <span>📍 {job.location}</span>
            <span>📁 {job.category}</span>
            <span>⏰ {job.employment_type}</span>
            <span>🏷️ {job.source}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
