'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useLang } from '@/lib/hooks/useLang';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User, Shield, BarChart3, Clock } from 'lucide-react';

/**
 * Purpose: Dashboard home page showing overview statistics and user information.
 * Returns: React.ReactNode — Dashboard homepage with statistics cards.
 */
export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const { t } = useLang();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <Breadcrumb />

      <div className="space-y-8 mt-6">
        {/* Welcome Section */}
        <section>
          <h1 className="text-4xl font-bold text-foreground">
            {t('common.welcome')}, {user?.name || user?.email}!
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            {t('dashboard.subtitle') || "Here's your business overview"}
          </p>
          <Button variant="outline" onClick={handleLogout} className="mt-4">
            <LogOut className="mr-2 h-4 w-4" />
            {t('common.logout') || 'Logout'}
          </Button>
        </section>

        {/* Stats Grid */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.totalOrders') || 'Total Orders'}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.thisMonth') || 'This month'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.totalCustomers') || 'Total Customers'}
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.registered') || 'Registered'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.revenue') || 'Revenue'}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.thisMonth') || 'This month'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.pendingOrders') || 'Pending Orders'}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.awaiting') || 'Awaiting action'}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Details Grid */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                {t('dashboard.accountInfo') || 'Account Information'}
              </CardTitle>
              <CardDescription>
                {t('dashboard.accountDetails') || 'Your account details and permissions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">{t('common.email') || 'Email'}:</span>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium">{t('dashboard.name') || 'Name'}:</span>
                <p className="text-sm text-muted-foreground">{user?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium">ID:</span>
                <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
              </div>
              <div>
                <span className="text-sm font-medium">{t('common.status') || 'Status'}:</span>
                <p className="text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user?.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
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
                {t('dashboard.roles') || 'Roles'}
              </CardTitle>
              <CardDescription>
                {t('dashboard.roleDescription') || 'Your assigned roles and permissions'}
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
                  {t('dashboard.noRoles') || 'No roles assigned. Contact admin to request access.'}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* System Status Card */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.systemStatus') || 'System Status'}</CardTitle>
              <CardDescription>
                {t('dashboard.systemStatusDesc') || 'Authentication and database status'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Firebase Auth</p>
                  <p className="text-xs text-green-600">✅ {t('common.active') || 'Active'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('common.database') || 'Database'}</p>
                  <p className="text-xs text-green-600">✅ {t('common.connected') || 'Connected'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('common.session') || 'Session'}</p>
                  <p className="text-xs text-green-600">✅ {t('common.valid') || 'Valid'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

