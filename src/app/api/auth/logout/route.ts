import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * Purpose: API route to handle user logout and clear session.
 * Method: POST /api/auth/logout
 * Headers:
 *   - Cookie: session — The session cookie to be revoked
 * Response:
 *   - 200: { success: true } — Logout successful
 *   - 500: { error: string } — Logout failed
 * Throws:
 *   - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
        await adminAuth.revokeRefreshTokens(decodedClaims.sub);
      } catch (error) {
        /** Session already invalid, continue with logout */
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}