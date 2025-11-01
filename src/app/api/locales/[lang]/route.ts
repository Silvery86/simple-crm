import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Purpose: API route to serve translated language files.
 * Method: GET /api/locales/[lang]
 * Params:
 *   - lang: string — Language code ('vi' or 'en')
 * Response:
 *   - 200: { translations object } — Translation data
 *   - 400: { error: string } — Unsupported language
 *   - 500: { error: string } — Failed to load translations
 * Throws:
 *   - 500: File not found or parsing error
 * Cache:
 *   - 1 hour public cache
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;

    if (!['vi', 'en'].includes(lang)) {
      return NextResponse.json(
        { error: 'Unsupported language' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'src', 'lib', 'locales', `${lang}.json`);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const translations = JSON.parse(fileContent);

    const response = NextResponse.json(translations);
    response.headers.set('Cache-Control', 'public, max-age=3600');

    return response;
  } catch (error) {
    console.error('Error loading translations:', error);
    return NextResponse.json(
      { error: 'Failed to load translations' },
      { status: 500 }
    );
  }
}