import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobById } from '@/lib/job-service';
import type { Job } from '@/lib/types';

interface JobDetailPageProps {
  params: { id: string };
}

async function getJob(id: string): Promise<Job | null> {
  return await getJobById(id);
}

export async function generateMetadata({ params }: JobDetailPageProps): Promise<Metadata> {
  const job = await getJob(params.id);

  if (!job) {
    return {
      title: 'Job Not Found',
      description: 'The job you are looking for does not exist.',
    };
  }

  return {
    title: `${job.title} at ${job.company} - JOBFORGE`,
    description: `${job.title} position at ${job.company} in ${job.location}. ${job.description?.substring(0, 150)}...`,
    alternates: {
      canonical: `/jobs/${job.id}`,  // ← Using canonical ID
    },
    openGraph: {
      title: `${job.title} at ${job.company}`,
      description: job.description?.substring(0, 150) || '',
      type: 'website',
      url: `/jobs/${job.id}`,  // ← Using canonical ID
    },
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const job = await getJob(params.id);

  if (!job) {
    notFound();
  }

  // Build JobPosting structured data
  const jobPosting = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.posted_at,
    validThrough: job.expires_at || undefined,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressRegion: job.location,
      },
    },
    employmentType: job.employment_type?.toUpperCase() || 'FULL_TIME',
    url: job.url,
    identifier: {
      '@type': 'PropertyValue',
      name: `${job.source}`,
      value: job.source_job_id,  // ← External identifier
    },
  };

  // Clean up undefined properties
  Object.keys(jobPosting).forEach(key => {
    if (jobPosting[key as keyof typeof jobPosting] === undefined) {
      delete jobPosting[key as keyof typeof jobPosting];
    }
  });

  const postedDate = job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) : 'Unknown';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }}
      />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <a
            href="/"
            style={{
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              display: 'inline-block',
            }}
          >
            ← Back to listings
          </a>
        </div>

        <article style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '2rem' }}>
          <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{job.title}</h1>
            <p style={{ fontSize: '1.2rem', color: '#555', margin: '0 0 1rem 0' }}>{job.company}</p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.95rem', color: '#666' }}>
              <div>📍 {job.location}</div>
              <div>💼 {job.employment_type}</div>
              <div>📁 {job.category}</div>
              <div>📅 Posted {postedDate}</div>
              {job.expires_at && (
                <div>⏳ Expires {new Date(job.expires_at).toLocaleDateString()}</div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#0070f3',
                  color: '#fff',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply Now →
              </a>
              <div style={{ fontSize: '0.85rem', color: '#999', padding: '0.75rem 0' }}>
                Source: {job.source} · ID: {job.id}  {/* FIXED: using canonical ID */}
              </div>
            </div>
          </header>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1rem' }}>Job Description</h2>
            <div
              style={{
                lineHeight: 1.6,
                color: '#333',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
            >
              {job.description}
            </div>
          </section>

          <footer style={{ borderTop: '1px solid #eee', paddingTop: '1rem', fontSize: '0.85rem', color: '#999' }}>
            <p>Posted on {new Date(job.posted_at).toLocaleString()} · Last updated {new Date(job.updated_at).toLocaleString()}</p>
          </footer>
        </article>
      </main>
    </>
  );
}