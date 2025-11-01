'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

type Language = 'vi' | 'en';

interface HomePageProps {
  params: Promise<{ lang: Language }>;
}

/**
 * Purpose: Root page that redirects based on user authentication status.
 * Logic:
 *   - If session cookie exists → redirect to dashboard
 *   - If no session → redirect to login page
 * Params:
 *   - params: Promise<{ lang: Language }> — Current language from URL.
 */
export default function HomePage({ params }: HomePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    const sessionCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('session='));

    if (sessionCookie) {
      router.replace(`/${resolvedParams.lang}/dashboard`);
    } else {
      router.replace(`/${resolvedParams.lang}/auth/login`);
    }
  }, [router, resolvedParams.lang]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  );
}