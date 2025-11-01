import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Middleware configuration
const PROTECTED_ROUTES = ['/[lang]/dashboard'];
const AUTH_ROUTES = ['/[lang]/auth/login', '/[lang]/auth/signup'];
const PUBLIC_ROUTES = ['/'];
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['vi', 'en'];

// JWT secret for session validation
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || 'development-secret-key-change-in-production'
);

type Language = 'vi' | 'en';

/**
 * Purpose: Validate session token from cookies
 * Returns: Promise<{ valid: boolean; payload?: any; }>
 */
async function validateSession(token: string | undefined): Promise<{
  valid: boolean;
  payload?: any;
}> {
  if (!token) {
    return { valid: false };
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return { valid: true, payload: verified.payload };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Purpose: Extract language from pathname or cookies
 * Returns: Language
 */
function extractLanguage(pathname: string, cookies: any): Language {
  // Try to extract from pathname pattern: /[lang]/...
  const langMatch = pathname.match(/^\/([a-z]{2})\//);
  if (langMatch && SUPPORTED_LANGUAGES.includes(langMatch[1])) {
    return langMatch[1] as Language;
  }

  // Try to get from cookie
  const cookieLang = cookies.get('NEXT_LOCALE')?.value;
  if (cookieLang && SUPPORTED_LANGUAGES.includes(cookieLang)) {
    return cookieLang as Language;
  }

  // Default to English
  return DEFAULT_LANGUAGE as Language;
}

/**
 * Purpose: Check if route is protected
 * Returns: boolean
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    // Replace [lang] with actual language pattern
    const pattern = route.replace('[lang]', '[a-z]{2}');
    const regex = new RegExp(`^${pattern}`);
    return regex.test(pathname);
  });
}

/**
 * Purpose: Check if route is auth route
 * Returns: boolean
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => {
    const pattern = route.replace('[lang]', '[a-z]{2}');
    const regex = new RegExp(`^${pattern}`);
    return regex.test(pathname);
  });
}

/**
 * Purpose: Get redirect URL based on language and target
 * Returns: string
 */
function getRedirectUrl(
  request: NextRequest,
  targetPath: string,
  language: Language
): string {
  const baseUrl = request.nextUrl.clone();
  baseUrl.pathname = `/${language}${targetPath}`;
  return baseUrl.toString();
}

/**
 * Purpose: Next.js middleware for route protection and language handling
 * Features:
 *   - Session validation on protected routes
 *   - Language detection and persistence
 *   - Role-based route access
 *   - Automatic redirects for unauthenticated users
 *   - Language cookie management
 *
 * Returns: NextResponse
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookies = request.cookies;

  // Extract language from pathname or cookie
  const language = extractLanguage(pathname, cookies);

  // Initialize response
  let response = NextResponse.next();

  // Set language cookie for persistence
  response.cookies.set('NEXT_LOCALE', language, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    const sessionToken = cookies.get('session')?.value;
    const { valid, payload } = await validateSession(sessionToken);

    if (!valid) {
      // Redirect to login
      const loginUrl = getRedirectUrl(request, '/auth/login', language);
      return NextResponse.redirect(loginUrl);
    }

    // Validate user role for dashboard access
    const userRole = (payload?.role as string) || 'PARTNER';

    // Allowed roles for dashboard: ADMIN, MANAGER, PARTNER
    const allowedRoles = ['ADMIN', 'MANAGER', 'PARTNER'];
    if (!allowedRoles.includes(userRole)) {
      // Redirect to unauthorized page (will be handled by error page)
      const baseUrl = request.nextUrl.clone();
      baseUrl.pathname = `/${language}/unauthorized`;
      return NextResponse.redirect(baseUrl.toString());
    }

    // Attach user info to request headers for use in page/components
    response = NextResponse.next();
    response.headers.set('x-user-id', payload?.sub || '');
    response.headers.set('x-user-role', userRole);
    response.headers.set('x-user-email', payload?.email || '');
  }

  // Handle auth routes - if user is logged in, redirect to dashboard
  if (isAuthRoute(pathname)) {
    const sessionToken = cookies.get('session')?.value;
    const { valid } = await validateSession(sessionToken);

    if (valid) {
      // User is already logged in, redirect to dashboard
      const dashboardUrl = getRedirectUrl(request, '/dashboard', language);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Handle root path - redirect to default language
  if (pathname === '/') {
    const baseUrl = request.nextUrl.clone();
    baseUrl.pathname = `/${language}`;
    return NextResponse.redirect(baseUrl.toString());
  }

  return response;
}

/**
 * Middleware configuration
 * Specifies which routes should be processed by middleware
 */
export const config = {
  matcher: [
    // Include all routes except these patterns
    '/((?!_next|api|public|favicon.ico).*)',
    // Explicitly include API routes that need language detection
    '/api/locales/:path*',
  ],
};
