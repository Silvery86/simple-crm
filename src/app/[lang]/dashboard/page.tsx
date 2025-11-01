'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useLang } from '@/lib/hooks/useLang';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User, Shield } from 'lucide-react';
import { use } from 'react';

interface DashboardPageProps {
  params: Promise<{ lang: 'vi' | 'en' }>;
}

/**
 * Purpose: Dashboard page with language support.
 */
export default function DashboardPage({ params }: DashboardPageProps) {
  const { user, loading, logout } = useAuth();
  const { t, isLoading: langLoading } = useLang();
  const toast = useToast();
  const resolvedParams = use(params);

  if (loading || langLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('toast.success.title', 'toast.success.logoutSuccess');
      window.location.href = `/${resolvedParams.lang}/auth/login`;
    } catch (error) {
      toast.error('toast.error.title', 'toast.error.unknownError');
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t('page.dashboard.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('page.dashboard.welcome')}, <span className="font-semibold text-foreground">{user?.name || user?.email}</span>
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="transition-all duration-200 hover:scale-105"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('page.dashboard.logoutButton')}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              {t('page.dashboard.userInfo.title')}
            </CardTitle>
            <CardDescription>
              {t('page.dashboard.userInfo.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">{t('page.dashboard.userInfo.email')}:</span>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium">{t('page.dashboard.userInfo.name')}:</span>
              <p className="text-sm text-muted-foreground">{user?.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium">{t('page.dashboard.userInfo.id')}:</span>
              <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
            </div>
            <div>
              <span className="text-sm font-medium">{t('page.dashboard.userInfo.status')}:</span>
              <p className="text-sm">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user?.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? t('page.dashboard.userInfo.active') : t('page.dashboard.userInfo.inactive')}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Roles Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              {t('page.dashboard.roles.title')}
            </CardTitle>
            <CardDescription>
              {t('page.dashboard.roles.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.roles && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('page.dashboard.roles.noRoles')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Status Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('page.dashboard.systemStatus.title')}</CardTitle>
            <CardDescription>
              {t('page.dashboard.systemStatus.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('page.dashboard.systemStatus.firebaseAuth')}</p>
                <p className="text-xs text-green-600">{t('page.dashboard.systemStatus.active')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('page.dashboard.systemStatus.database')}</p>
                <p className="text-xs text-green-600">{t('page.dashboard.systemStatus.connected')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('page.dashboard.systemStatus.session')}</p>
                <p className="text-xs text-green-600">{t('page.dashboard.systemStatus.valid')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </main>
  );
}