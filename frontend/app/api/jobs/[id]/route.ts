// JOBFORGE API - Individual job endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getJobById, getJobBySlug } from '@/lib/job-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    let job = await getJobById(id);
    
    // Fallback to slug lookup if canonical ID not found
    if (!job) {
      job = await getJobBySlug(id);
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
