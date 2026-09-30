// TEMPORARY ADMIN ENDPOINT - DO NOT TRACK PERMANENTLY
// GET /api/admin/reset-jobs
// Clears the production jobs table for verification purposes

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  // Simple safety check using a temporary secret
  const authHeader = req.headers.get('authorization');
  const tempSecret = 'hermes-one-time-reset-2026';
  
  if (authHeader !== `Bearer ${tempSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      console.log('Resetting jobs table...');
      const beforeResult = await client.query('SELECT COUNT(*) FROM jobs');
      const countBefore = parseInt(beforeResult.rows[0].count, 10);
      
      await client.query('TRUNCATE TABLE jobs');
      
      const afterResult = await client.query('SELECT COUNT(*) FROM jobs');
      const countAfter = parseInt(afterResult.rows[0].count, 10);

      return NextResponse.json({
        status: 'success',
        message: 'Jobs table reset',
        countBefore,
        countAfter,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
