'use client';'use client';



import { useAuth } from '@/lib/auth/auth-context';import { useAuth } from '@/lib/auth/auth-context';

import { useLang } from '@/lib/hooks/useLang';import { Button } from '@/components/ui/button';

import { Breadcrumb } from '@/components/layout/breadcrumb';import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';import { Loader2, LogOut, User, Shield } from 'lucide-react';

import { User, Shield, BarChart3, Clock } from 'lucide-react';

export default function DashboardPage() {

/**  const { user, loading, logout } = useAuth();

 * Purpose: Dashboard home page showing overview statistics and user information.

 * Returns:  if (loading) {

 *   - React.ReactNode — Dashboard homepage with statistics cards.    return (

 */      <div className="min-h-screen flex items-center justify-center">

export default function DashboardPage() {        <Loader2 className="h-8 w-8 animate-spin" />

  const { user } = useAuth();      </div>

  const { t } = useLang();    );

  }

  return (

    <main>  const handleLogout = async () => {

      <Breadcrumb />    await logout();

    window.location.href = '/auth/login';

      <div className="space-y-8">  };

        {/* Welcome Section */}

        <section>  return (

          <h1 className="text-4xl font-bold text-foreground">    <main className="p-6 max-w-4xl mx-auto">

            {t('common.welcome')}, {user?.name || user?.email}!      <div className="flex items-center justify-between mb-6">

          </h1>        <div>

          <p className="text-lg text-muted-foreground mt-2">          <h1 className="text-3xl font-bold">Simple CRM Dashboard</h1>

            {t('dashboard.subtitle') || 'Here\'s your business overview'}          <p className="text-muted-foreground mt-1">

          </p>            Chào mừng trở lại, {user?.name || user?.email}

        </section>          </p>

        </div>

        {/* Stats Grid */}        <Button variant="outline" onClick={handleLogout}>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">          <LogOut className="mr-2 h-4 w-4" />

          <Card className="hover:shadow-lg transition-shadow">          Đăng xuất

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">        </Button>

              <CardTitle className="text-sm font-medium">      </div>

                {t('dashboard.totalOrders') || 'Total Orders'}

              </CardTitle>      <div className="grid gap-6 md:grid-cols-2">

              <BarChart3 className="h-4 w-4 text-muted-foreground" />        {/* User Info Card */}

            </CardHeader>        <Card>

            <CardContent>          <CardHeader>

              <div className="text-2xl font-bold">0</div>            <CardTitle className="flex items-center">

              <p className="text-xs text-muted-foreground">              <User className="mr-2 h-5 w-5" />

                {t('dashboard.thisMonth') || 'This month'}              Thông tin tài khoản

              </p>            </CardTitle>

            </CardContent>            <CardDescription>

          </Card>              Chi tiết tài khoản của bạn

            </CardDescription>

          <Card className="hover:shadow-lg transition-shadow">          </CardHeader>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">          <CardContent className="space-y-3">

              <CardTitle className="text-sm font-medium">            <div>

                {t('dashboard.totalCustomers') || 'Total Customers'}              <span className="text-sm font-medium">Email:</span>

              </CardTitle>              <p className="text-sm text-muted-foreground">{user?.email}</p>

              <User className="h-4 w-4 text-muted-foreground" />            </div>

            </CardHeader>            <div>

            <CardContent>              <span className="text-sm font-medium">Tên:</span>

              <div className="text-2xl font-bold">0</div>              <p className="text-sm text-muted-foreground">{user?.name}</p>

              <p className="text-xs text-muted-foreground">            </div>

                {t('dashboard.registered') || 'Registered'}            <div>

              </p>              <span className="text-sm font-medium">ID:</span>

            </CardContent>              <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>

          </Card>            </div>

            <div>

          <Card className="hover:shadow-lg transition-shadow">              <span className="text-sm font-medium">Trạng thái:</span>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">              <p className="text-sm">

              <CardTitle className="text-sm font-medium">                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${

                {t('dashboard.revenue') || 'Revenue'}                  user?.isActive 

              </CardTitle>                    ? 'bg-green-100 text-green-800' 

              <BarChart3 className="h-4 w-4 text-muted-foreground" />                    : 'bg-red-100 text-red-800'

            </CardHeader>                }`}>

            <CardContent>                  {user?.isActive ? 'Hoạt động' : 'Không hoạt động'}

              <div className="text-2xl font-bold">$0</div>                </span>

              <p className="text-xs text-muted-foreground">              </p>

                {t('dashboard.thisMonth') || 'This month'}            </div>

              </p>          </CardContent>

            </CardContent>        </Card>

          </Card>

        {/* Roles Card */}

          <Card className="hover:shadow-lg transition-shadow">        <Card>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">          <CardHeader>

              <CardTitle className="text-sm font-medium">            <CardTitle className="flex items-center">

                {t('dashboard.pendingOrders') || 'Pending Orders'}              <Shield className="mr-2 h-5 w-5" />

              </CardTitle>              Quyền hạn

              <Clock className="h-4 w-4 text-muted-foreground" />            </CardTitle>

            </CardHeader>            <CardDescription>

            <CardContent>              Các vai trò được phân quyền

              <div className="text-2xl font-bold">0</div>            </CardDescription>

              <p className="text-xs text-muted-foreground">          </CardHeader>

                {t('dashboard.awaiting') || 'Awaiting action'}          <CardContent>

              </p>            {user?.roles && user.roles.length > 0 ? (

            </CardContent>              <div className="flex flex-wrap gap-2">

          </Card>                {user.roles.map((role) => (

        </section>                  <span

                    key={role}

        {/* User Role Information */}                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"

        <section>                  >

          <Card>                    {role}

            <CardHeader>                  </span>

              <CardTitle className="flex items-center gap-2">                ))}

                <Shield className="h-5 w-5" />              </div>

                {t('dashboard.accountInfo') || 'Account Information'}            ) : (

              </CardTitle>              <p className="text-sm text-muted-foreground">

              <CardDescription>                Chưa được phân quyền. Liên hệ admin để được cấp quyền.

                {t('dashboard.accountDetails') || 'Your account details and permissions'}              </p>

              </CardDescription>            )}

            </CardHeader>          </CardContent>

            <CardContent className="space-y-4">        </Card>

              <div className="grid md:grid-cols-2 gap-4">

                <div>        {/* System Status Card */}

                  <p className="text-sm text-muted-foreground">        <Card className="md:col-span-2">

                    {t('common.email') || 'Email'}          <CardHeader>

                  </p>            <CardTitle>Trạng thái hệ thống</CardTitle>

                  <p className="text-lg font-medium">{user?.email}</p>            <CardDescription>

                </div>              Authentication system đã được thiết lập thành công

                <div>            </CardDescription>

                  <p className="text-sm text-muted-foreground">          </CardHeader>

                    {t('dashboard.name') || 'Name'}          <CardContent>

                  </p>            <div className="grid gap-4 md:grid-cols-3">

                  <p className="text-lg font-medium">{user?.name || 'N/A'}</p>              <div className="space-y-1">

                </div>                <p className="text-sm font-medium">Firebase Auth</p>

                <div>                <p className="text-xs text-green-600">✅ Hoạt động</p>

                  <p className="text-sm text-muted-foreground">              </div>

                    {t('dashboard.roles') || 'Roles'}              <div className="space-y-1">

                  </p>                <p className="text-sm font-medium">Database</p>

                  <div className="flex gap-2 mt-1">                <p className="text-xs text-green-600">✅ Kết nối</p>

                    {user?.roles?.map((role) => (              </div>

                      <span              <div className="space-y-1">

                        key={role}                <p className="text-sm font-medium">Session</p>

                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"                <p className="text-xs text-green-600">✅ Hợp lệ</p>

                      >              </div>

                        {role}            </div>

                      </span>          </CardContent>

                    ))}        </Card>

                  </div>      </div>

                </div>    </main>

                <div>  );

                  <p className="text-sm text-muted-foreground">}
                    {t('dashboard.status') || 'Status'}
                  </p>
                  <p className="text-lg font-medium">
                    {user?.isActive ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('common.active') || 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {t('common.inactive') || 'Inactive'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
