import { NextRequest, NextResponse } from 'next/server';

/**
 * Purpose: Middleware to handle internationalization and authentication.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Handle root path - redirect to Vietnamese by default
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/vi', request.url));
  }

  // Check if path has language prefix
  const langMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  
  if (!langMatch) {
    // No language prefix, redirect to Vietnamese
    return NextResponse.redirect(new URL(`/vi${pathname}`, request.url));
  }

  const lang = langMatch[1];
  const pathWithoutLang = langMatch[2] || '/';

  // Only support 'vi' and 'en'
  if (!['vi', 'en'].includes(lang)) {
    return NextResponse.redirect(new URL(`/vi${pathname.substring(3)}`, request.url));
  }

  // Check authentication for protected routes
  const isAuthRoute = pathWithoutLang.startsWith('/auth/');
  const isPublicRoute = ['/', '/auth/login', '/auth/register'].includes(pathWithoutLang);

  if (!isPublicRoute && !isAuthRoute) {
    // This is a protected route, check for session
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      // No session, redirect to login
      const loginUrl = new URL(`/${lang}/auth/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // You could verify the session here with Firebase Admin SDK if needed
    // For now, just check if cookie exists
  } else if (pathWithoutLang === '/') {
    // Root path without authentication, redirect to login
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL(`/${lang}/auth/login`, request.url));
    } else {
      // Has session, redirect to dashboard
      return NextResponse.redirect(new URL(`/${lang}/dashboard`, request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Purpose: Configure which routes the middleware should run on.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};