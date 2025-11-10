import { NextRequest } from 'next/server';
import { importShopifyProducts } from '@/lib/services/shopify-import.service';
import type { DuplicateStrategy } from '@/lib/services/shopify-import.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, startPage, endPage, duplicateStrategy = 'skip' } = body;

    if (!url || !startPage || !endPage) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Starting import...' })}\n\n`)
          );

          // Start import with progress callback
          const result = await importShopifyProducts(
            url,
            startPage,
            endPage,
            (progress) => {
              // Send progress update
              const progressData = {
                type: 'progress',
                data: {
                  total: progress.total,
                  current: progress.current,
                  success: progress.success,
                  failed: progress.failed,
                  skipped: progress.skipped,
                  logs: progress.logs,
                },
              };
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
              );

              // Send each log entry separately for real-time display
              if (progress.logs.length > 0) {
                const lastLog = progress.logs[progress.logs.length - 1];
                const logData = {
                  type: 'log',
                  message: lastLog,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(logData)}\n\n`)
                );
              }
            },
            duplicateStrategy as DuplicateStrategy
          );

          // Send completion message
          const completeData = {
            type: 'complete',
            data: result,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`)
          );

          // Close the stream
          controller.close();
        } catch (error: any) {
          console.error('Import stream error:', error);
          
          // Send error message
          const errorData = {
            type: 'error',
            message: error.message || 'Import failed',
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
          );
          
          controller.close();
        }
      },
    });

    // Return the stream as Server-Sent Events
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Import stream initialization error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to start import' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
