// JOBFORGE Vercel Cron Scrape Endpoint
// GET /api/cron/scrape - Daily scraping for independent Vercel deployments
// Uses Vercel Cron with Hobby plan compatible daily schedule (00:00 UTC)
// Invokes the canonical scraper implementation for RemoteOK, Remotive, and Jobicy

import { NextRequest, NextResponse } from 'next/server';

// Vercel cron authentication
const validateCronSecret = (req: NextRequest): boolean => {
  const vercelCronSecret = req.headers.get('x-vercel-cron-secret');
  const bearerSecret = req.headers.get('authorization');
  
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.warn('CRON_SECRET not set - skipping authentication (development)');
    return true;
  }
  
  return (
    vercelCronSecret === expectedSecret ||
    bearerSecret === `Bearer ${expectedSecret}`
  );
};

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid Cron secret' },
      { status: 401 }
    );
  }

  try {
    // Import the canonical scraper - ES modules for Vercel compatibility
    // This ensures the scraper is properly bundled in the deployment artifact
    const { run } = await import('../../../../scraper/src/index');
    const scrapeResult = await run();
    
    return NextResponse.json({
      status: 'success',
      message: 'Cron scrape completed successfully',
      timestamp: new Date().toISOString(),
      totalJobs: scrapeResult.fetched,
      normalized: scrapeResult.normalized,
      valid: scrapeResult.valid,
      rejected: scrapeResult.rejected,
      duplicatesRemoved: scrapeResult.duplicatesRemoved,
      upserted: scrapeResult.upserted,
      failed: scrapeResult.failed,
    });
  } catch (error) {
    console.error('Cron scrape error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}