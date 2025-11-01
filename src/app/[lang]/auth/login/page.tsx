import LoginForm from '@/components/auth/login-form';
import { use } from 'react';

interface LoginPageProps {
  params: Promise<{ lang: 'vi' | 'en' }>;
}

/**
 * Purpose: Login page route with language support.
 */
export default function LoginPage({ params }: LoginPageProps) {
  const resolvedParams = use(params);
  return <LoginForm />;
}