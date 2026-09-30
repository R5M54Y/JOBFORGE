import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobById, getRelatedJobs } from '@/lib/job-service';
import { JobList } from '@/app/components/JobList';
import type { Job } from '@/lib/types';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getJobById(params.id);
  if (!job) return { title: 'Job Not Found | JOBFORGE' };
  
  return {
    title: `${job.title} at ${job.company} | JOBFORGE`,
    description: job.description?.substring(0, 160) || `Apply for ${job.title} position at ${job.company}`,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const job = await getJobById(params.id);
  if (!job) notFound();

  const relatedJobs = await getRelatedJobs(job.id, job.category, 3);

  const detailStyle: React.CSSProperties = {
    padding: '0.75rem 0',
    borderBottom: '1px solid #eee',
    display: 'flex',
    gap: '1rem',
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    width: '140px',
    flexShrink: 0,
    color: '#666',
  };

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <a href="/" style={{ color: '#0070f3', textDecoration: 'none', fontSize: '0.9rem' }}>&larr; Back to all jobs</a>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '2rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#333' }}>{job.title}</h1>
            <p style={{ fontSize: '1.25rem', color: '#555', margin: '0.5rem 0' }}>{job.company}</p>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#0070f3',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
          >
            Apply for this position &rarr;
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={detailStyle}>
              <span style={labelStyle}>📍 Location</span>
              <span>{job.location}</span>
            </div>
            <div style={detailStyle}>
              <span style={labelStyle}>⏰ Type</span>
              <span>{job.employment_type}</span>
            </div>
            <div style={detailStyle}>
              <span style={labelStyle}>📁 Category</span>
              <span>{job.category}</span>
            </div>
          </div>
          <div>
            <div style={detailStyle}>
              <span style={labelStyle}>🏷️ Source</span>
              <span>{job.source}</span>
            </div>
            <div style={detailStyle}>
              <span style={labelStyle}>📅 Posted</span>
              <span>{new Date(job.posted_at).toLocaleDateString()}</span>
            </div>
            <div style={detailStyle}>
              <span style={labelStyle}>🔄 Scraped</span>
              <span>{new Date(job.scraped_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {job.description && (
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#333' }}>Description</h2>
            <div 
              style={{ lineHeight: 1.6, color: '#444', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>
        )}
      </div>

      {relatedJobs.length > 0 && (
        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#333' }}>Related Jobs</h2>
          <JobList jobs={relatedJobs} />
        </section>
      )}
    </main>
  );
}