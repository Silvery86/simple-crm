'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useLang } from '@/lib/hooks/useLang';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Shield } from 'lucide-react';

/**
 * Purpose: Dashboard page with language support.
 */
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t, isLoading: langLoading } = useLang();

  if (loading || langLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {t('page.dashboard.welcome')}, {user?.name || user?.email}!
        </h1>
        <p className="text-muted-foreground">
          {t('page.dashboard.subtitle')}
        </p>
      </div>

      {/* Dashboard Cards */}
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
              {t('page.dashboard.roleDetails.title')}
            </CardTitle>
            <CardDescription>
              {t('page.dashboard.roleDetails.description')}
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
                {t('page.dashboard.roleDetails.noRoles')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Status Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('page.dashboard.systemStatusDetail.title')}</CardTitle>
            <CardDescription>
              {t('page.dashboard.systemStatusDetail.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('page.dashboard.systemStatusDetail.firebaseAuth')}</p>
                <p className="text-xs text-green-600">{t('page.dashboard.systemStatusDetail.active')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('page.dashboard.systemStatusDetail.database')}</p>
                <p className="text-xs text-green-600">{t('page.dashboard.systemStatusDetail.connected')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('page.dashboard.systemStatusDetail.session')}</p>
                <p className="text-xs text-green-600">{t('page.dashboard.systemStatusDetail.valid')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}