'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useLang } from '@/lib/hooks/useLang';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { handleApiError } from '@/lib/utils/error-translator';

/**
 * Purpose: Login form component with Google and Email/Password authentication.
 */
export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, isLoading: langLoading } = useLang();
  const toast = useToast();
  const provider = new GoogleAuthProvider();

  /**
   * Purpose: Handle redirect after successful login.
   */
  const handleLoginSuccess = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get('redirect') || `/${lang}/dashboard`;
    router.push(redirectTo);
  };

  /**
   * Purpose: Handle email/password authentication with Firebase and session creation.
   * Params:
   *   - e: React.FormEvent — Form submission event.
   * Returns:
   *   - Promise<void> — Resolves when login is complete or error is caught.
   * Throws:
   *   - Shows error toast on authentication failure.
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        toast.success('toast.success.title', 'toast.success.loginSuccess');
        handleLoginSuccess();
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      const errorMessage = handleApiError(error, t);
      toast.error('toast.error.title', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Purpose: Handle Google OAuth login with Firebase and session creation.
   * Returns:
   *   - Promise<void> — Resolves when login is complete or error is caught.
   * Throws:
   *   - Shows error toast on authentication failure.
   */
  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        toast.success('toast.success.title', 'toast.success.loginSuccess');
        handleLoginSuccess();
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      const errorMessage = handleApiError(error, t);
      toast.error('toast.error.title', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (langLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-muted/20 to-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Language Switcher positioned above card */}
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        
        <Card className="backdrop-blur-sm bg-card/95 shadow-xl border-0 animate-scale-in">
          <CardHeader className="space-y-4 pb-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {t('page.login.title')}
              </CardTitle>
              <CardDescription className="text-base">
                {t('page.login.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {t('page.login.googleButton')}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('page.login.orText')}</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('page.login.emailLabel')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('page.login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 text-sm transition-all duration-200 focus:scale-[1.02]"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('page.login.passwordLabel')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('page.login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11 text-sm transition-all duration-200 focus:scale-[1.02]"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('page.login.loggingIn')}
                </>
              ) : (
                t('page.login.loginButton')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}