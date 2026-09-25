// JOBFORGE API - Job listing endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getJobs } from '@/lib/job-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      keyword: searchParams.get('keyword') || '',
      location: searchParams.get('location') || '',
      category: searchParams.get('category') || '',
      employmentType: searchParams.get('employmentType') || '',
    };

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    const result = await getJobs(filters, page);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', jobs: [], total: 0, page: 1, limit: 12, totalPages: 0 },
      { status: 500 }
    );
  }
}
