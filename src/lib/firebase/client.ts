import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Purpose: Firebase client configuration for frontend authentication.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Purpose: Initialize Firebase app (singleton pattern).
 * Returns:
 *   - FirebaseApp — Initialized Firebase app instance.
 */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Purpose: Initialize Firebase Authentication service.
 * Returns:
 *   - Auth — Firebase auth instance for client-side operations.
 */
const auth = getAuth(app);

export { auth };