// JOBFORGE API - Individual job endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

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

    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = result.rows[0];

    return NextResponse.json(job);
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
