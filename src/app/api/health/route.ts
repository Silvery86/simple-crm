import { NextResponse } from 'next/server';

/**
 * Purpose: Health check endpoint to verify API availability and service status.
 * Method: GET /api/health
 * Response:
 *   - 200: { success: true, data: { timestamp: string, version: string }, error: null, meta: { service: 'simple-crm' } } — API is healthy
 * Returns:
 *   - Promise<NextResponse> — Health status with timestamp and service version.
 * Throws:
 *   - N/A (never throws, always returns 200)
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'simple-crm-api',
      },
      error: null,
      meta: {
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
      },
    },
    { status: 200 }
  );
}