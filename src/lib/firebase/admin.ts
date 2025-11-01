import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Purpose: Firebase Admin SDK configuration for server-side operations.
 */
const adminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
};

/**
 * Purpose: Initialize Firebase Admin app (singleton pattern).
 * Returns:
 *   - App — Firebase admin app instance.
 */
const adminApp = !getApps().length ? initializeApp(adminConfig) : getApps()[0];

/**
 * Purpose: Initialize Firebase Admin Auth service.
 * Returns:
 *   - Auth — Firebase admin auth instance for server-side operations.
 */
const adminAuth = getAuth(adminApp);

export { adminAuth };