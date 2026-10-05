import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobById, getJobBySlug, getRelatedJobs } from '@/lib/job-service';
import { JobList } from '@/app/components/JobList';
import type { Job } from '@/lib/types';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let job = await getJobById(params.id);
  
  // Fallback to slug lookup if canonical ID not found
  if (!job) {
    job = await getJobBySlug(params.id);
  }
  
  if (!job) return { title: 'Job Not Found | JOBFORGE' };
  
  return {
    title: `${job.title} at ${job.company} | JOBFORGE`,
    description: job.description?.substring(0, 160) || `Apply for ${job.title} position at ${job.company}`,
  };
}

// Map employment types to Schema.org standards
function mapEmploymentType(type: string): string {
  const mapping: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    'contract': 'CONTRACTOR',
    'freelance': 'CONTRACTOR',
    'temporary': 'TEMPORARY',
    'intern': 'INTERN',
    'volunteer': 'VOLUNTEER',
    'per-diem': 'PER_DIEM',
    'other': 'OTHER'
  };
  return mapping[type.toLowerCase()] || 'OTHER';
}

// Generate JobPosting structured data
function generateJobPostingSchema(job: Job, url: string) {
  // Parse location - handle "City, Country" format
  const locations = job.location.split(',').map(l => l.trim());
  
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `${job.title} position at ${job.company}`,
    datePosted: new Date(job.posted_at).toISOString().split('T')[0],
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company
    },
    jobLocation: locations.map(loc => ({
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: loc,
        addressCountry: loc
      }
    })),
    employmentType: mapEmploymentType(job.employment_type),
    url: url,
    identifier: {
      '@type': 'PropertyValue',
      name: job.source,
      value: job.source_job_id
    },
    applicantLocationRequirements: locations.length > 0 ? {
      '@type': 'Country',
      name: locations[locations.length - 1]
    } : undefined,
    jobLocationType: job.location.toLowerCase().includes('remote') ? 'TELECOMMUTE' : undefined
  };

  // Remove undefined fields
  return JSON.parse(JSON.stringify(schema));
}

export default async function JobDetailPage({ params }: Props) {
  let job = await getJobById(params.id);
  
  // Fallback to slug lookup if canonical ID not found
  if (!job) {
    job = await getJobBySlug(params.id);
  }
  
  if (!job) notFound();

  const relatedJobs = await getRelatedJobs(job.id, job.category || '', 3);
  
  // Generate canonical URL using actual accessed URL (params.id can be ID or slug-id)
  const canonicalUrl = `https://remoteworkers.vercel.app/jobs/${params.id}`;
  
  // Generate structured data
  const structuredData = generateJobPostingSchema(job, canonicalUrl);

  return (
    <>
      {/* Structured Data for Google Jobs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      <main className="container py-5" id="job-detail-main">
      <div className="mb-4" id="job-detail-back-button-wrapper">
        <Link href="/" className="btn btn-link text-decoration-none p-0 text-primary fw-medium">
          &larr; Back to all jobs
        </Link>
      </div>

      <div className="card shadow-sm border-0 mb-5" id="job-detail-card">
        <div className="card-body p-4 p-lg-5" id="job-detail-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-4" id="job-detail-header">
            <div className="mb-3 mb-md-0" id="job-detail-title-section">
              <h1 className="display-6 fw-bold mb-1 text-dark" id="job-title">{job.title}</h1>
              <p className="lead text-muted mb-0" id="job-company">{job.company}</p>
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg fw-bold px-4 rounded-pill shadow-sm"
              id="job-apply-button"
            >
              Apply for this position &rarr;
            </a>
          </div>

          <hr className="my-4" id="job-detail-divider" />

          <div className="row g-4 mb-5" id="job-detail-info-section">
            <div className="col-12 col-md-6" id="job-overview-column">
              <h5 className="fw-bold text-dark mb-3">Job Overview</h5>
              <ul className="list-unstyled" id="job-overview-list">
                <li className="mb-2" id="job-location-item">
                  <span className="fw-bold text-secondary text-uppercase small me-2">📍 Location:</span>
                  <span className="text-dark" id="job-location-value">{job.location}</span>
                </li>
                <li className="mb-2" id="job-type-item">
                  <span className="fw-bold text-secondary text-uppercase small me-2">⏰ Type:</span>
                  <span className="text-dark" id="job-type-value">{job.employment_type}</span>
                </li>
                <li className="mb-2" id="job-category-item">
                  <span className="fw-bold text-secondary text-uppercase small me-2">📁 Category:</span>
                  <span className="text-dark" id="job-category-value">{job.category}</span>
                </li>
              </ul>
            </div>
            <div className="col-12 col-md-6" id="job-details-column">
              <h5 className="fw-bold text-dark mb-3">Post Details</h5>
              <ul className="list-unstyled" id="job-details-list">
                <li className="mb-2" id="job-source-item">
                  <span className="fw-bold text-secondary text-uppercase small me-2">🏷️ Source:</span>
                  <span className="text-dark" id="job-source-value">{job.source}</span>
                </li>
                <li className="mb-2" id="job-posted-item">
                  <span className="fw-bold text-secondary text-uppercase small me-2">📅 Posted:</span>
                  <span className="text-dark" id="job-posted-value">{new Date(job.posted_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                </li>
                <li className="mb-2" id="job-scraped-item">
                  <span className="fw-bold text-secondary text-uppercase small me-2">🔄 Scraped:</span>
                  <span className="text-dark" id="job-scraped-value">{new Date(job.scraped_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Ad placement before job description */}
          <div className="mb-5" id="job-detail-ad-container">
            <div
              dangerouslySetInnerHTML={{
                __html: '<script async="async" data-cfasync="false" src="https://pl31517494.profitableratecpmnetwork.com/93be112345a2807dbde6fc7c69a63baf/invoke.js"></script><div id="container-93be112345a2807dbde6fc7c69a63baf"></div>'
              }}
            />
          </div>

          {job.description && (
            <div id="job-description-section">
              <h5 className="fw-bold text-dark mb-3">Job Description</h5>
              <div 
                className="job-description-content text-muted lh-lg"
                id="job-description-content"
                style={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </div>
          )}
        </div>
      </div>

      {relatedJobs.length > 0 && (
        <section className="mt-5 pt-4" id="related-jobs-section">
          <h3 className="fw-bold text-dark mb-4">Similar Opportunities</h3>
          <div id="related-jobs-list-wrapper">
            <JobList jobs={relatedJobs} />
          </div>
        </section>
      )}
    </main>
    </>
  );
}
