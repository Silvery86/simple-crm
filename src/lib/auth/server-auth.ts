import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { RepositoryFactory } from '@/lib/repositories';

export interface ServerSession {
  uid: string;
  userId: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
}

/**
 * Purpose: Verify the server-side session cookie and return the authenticated user session.
 * Used inside Server Actions to guard against unauthorized access.
 * Params: none — reads cookie automatically from Next.js cookie store.
 * Returns:
 *   - Promise<ServerSession | null> — Session data if authenticated, null otherwise.
 * Throws:
 *   - Never — All errors are caught and return null.
 */
export async function verifyServerSession(): Promise<ServerSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const { uid } = decodedClaims;

    const userRepository = RepositoryFactory.getUserRepository();
    const user = await userRepository.findByFirebaseUid(uid);

    if (!user || !user.isActive) {
      return null;
    }

    return {
      uid,
      userId: user.id,
      email: user.email ?? '',
      name: user.name ?? '',
      roles: user.userRoles.map((ur: any) => ur.role.name),
      isActive: user.isActive,
    };
  } catch (error) {
    console.error('[verifyServerSession] Auth verification failed:', error);
    return null;
  }
}

/**
 * Purpose: Check if the session has at least one of the specified roles.
 * Params:
 *   - session: ServerSession — Verified session object.
 *   - roles: string[] — Required role names.
 * Returns:
 *   - boolean — True if session has any of the required roles.
 */
export function hasRole(session: ServerSession, roles: string[]): boolean {
  return roles.some((role) => session.roles.includes(role));
}
