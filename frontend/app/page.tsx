"use client";

import { siteConfig } from '@/lib/siteConfig';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { JobFilters } from './components/JobFilters';
import { JobList } from './components/JobList';
import { Pagination } from './components/Pagination';
import type { Job, JobsResponse } from '@/lib/types';

function HomeContent() {
  const searchParams = useSearchParams();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    category: searchParams.get('category') || '',
    employmentType: searchParams.get('employmentType') || '',
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.keyword) params.set('keyword', filters.keyword);
      if (filters.location) params.set('location', filters.location);
      if (filters.category) params.set('category', filters.category);
      if (filters.employmentType) params.set('employmentType', filters.employmentType);
      params.set('page', String(page));

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data: JobsResponse = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }} id="home-main">
      <JobFilters filters={filters} onChange={handleFilterChange} />

      {error && (
        <div id="home-error-alert" style={{ padding: '1rem', background: '#fee', color: '#c00', borderRadius: 8, margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p id="home-loading-message" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Loading jobs...</p>
      ) : (
        <>
          {/* Ad placement before job list */}
          <div id="homepage-ad-container" style={{ marginBottom: '2rem' }}>
            <div
              dangerouslySetInnerHTML={{
                __html: '<script async="async" data-cfasync="false" src="https://pl31517494.profitableratecpmnetwork.com/93be112345a2807dbde6fc7c69a63baf/invoke.js"></script><div id="container-93be112345a2807dbde6fc7c69a63baf"></div>'
              }}
            />
          </div>

          <div id="homepage-job-list-wrapper">
            <JobList jobs={jobs} />
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
