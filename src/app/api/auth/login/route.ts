import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { RepositoryFactory } from '@/lib/repositories';
import { cookies } from 'next/headers';

/**
 * Purpose: API route to handle login with Firebase ID token.
 * Method: POST /api/auth/login
 * Body:
 *   - idToken: string — Firebase ID token from client
 * Response:
 *   - 200: { success: true, user: UserInfo } — Login successful
 *   - 400: { error: string } — Missing or invalid token
 *   - 401: { error: string } — Authentication failed
 * Throws:
 *   - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const userRepository = RepositoryFactory.getUserRepository();
    let user = await userRepository.findByFirebaseUid(uid);

    if (!user) {
      user = await userRepository.create({
        email,
        name: name || email.split('@')[0],
        firebaseUid: uid,
        roleIds: [],
      });
    }

    const customClaims = {
      userId: user.id,
      roles: user.userRoles.map(ur => ur.role.name),
    };

    await adminAuth.setCustomUserClaims(uid, customClaims);

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.userRoles.map(ur => ur.role.name),
      },
    });

    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}