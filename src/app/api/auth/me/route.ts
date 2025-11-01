import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { RepositoryFactory } from '@/lib/repositories';

/**
 * Purpose: API route to retrieve current authenticated user information.
 * Method: GET /api/auth/me
 * Headers:
 *   - Cookie: session — The session cookie for authentication
 * Response:
 *   - 200: { success: true, user: UserInfo } — User info retrieved successfully
 *   - 401: { error: string } — No session or authentication failed
 *   - 404: { error: string } — User not found
 * Throws:
 *   - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const { uid } = decodedClaims;

    const userRepository = RepositoryFactory.getUserRepository();
    const user = await userRepository.findByFirebaseUid(uid);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        roles: user.userRoles.map(ur => ur.role.name),
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}