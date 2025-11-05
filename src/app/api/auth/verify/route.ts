import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * GET /api/auth/verify
 * Purpose: Verify if current session token is valid
 * Used by: Middleware to validate sessions
 * Returns: { success: boolean; data?: { uid, email } }
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_SESSION',
            key: 'errors.auth.noSession',
            message: 'No session cookie found',
          },
        },
        { status: 401 }
      );
    }

    // Verify session cookie with Firebase Admin SDK
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (!decodedClaims) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SESSION',
            key: 'errors.auth.invalidSession',
            message: 'Session cookie is invalid',
          },
        },
        { status: 401 }
      );
    }

    // Session is valid
    return NextResponse.json(
      {
        success: true,
        data: {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[AUTH_VERIFY] Error verifying session:', error.message);

    // Session is invalid or expired
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SESSION_VERIFICATION_FAILED',
          key: 'errors.auth.sessionVerificationFailed',
          message: error.message || 'Failed to verify session',
        },
      },
      { status: 401 }
    );
  }
}
