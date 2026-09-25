'use client';

import { useState, useEffect, useCallback } from 'react';
import { JobFilters } from './components/JobFilters';
import { JobList } from './components/JobList';
import { Pagination } from './components/Pagination';
import type { Job, JobsResponse } from '@/lib/types';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    keyword: '',
    location: '',
    category: '',
    employmentType: '',
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
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>JOBFORGE</h1>
        <p style={{ color: '#666' }}>Remote job aggregator &mdash; {total} jobs available</p>
      </header>

      <JobFilters filters={filters} onChange={handleFilterChange} />

      {error && (
        <div style={{ padding: '1rem', background: '#fee', color: '#c00', borderRadius: 8, margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Loading jobs...</p>
      ) : (
        <>
          <JobList jobs={jobs} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}
