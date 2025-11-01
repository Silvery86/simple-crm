'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();

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
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Simple CRM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Chào mừng trở lại, {user?.name || user?.email}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Đăng xuất
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Thông tin tài khoản
            </CardTitle>
            <CardDescription>
              Chi tiết tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">Email:</span>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Tên:</span>
              <p className="text-sm text-muted-foreground">{user?.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium">ID:</span>
              <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Trạng thái:</span>
              <p className="text-sm">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user?.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? 'Hoạt động' : 'Không hoạt động'}
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
              Quyền hạn
            </CardTitle>
            <CardDescription>
              Các vai trò được phân quyền
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
                Chưa được phân quyền. Liên hệ admin để được cấp quyền.
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Status Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Trạng thái hệ thống</CardTitle>
            <CardDescription>
              Authentication system đã được thiết lập thành công
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Firebase Auth</p>
                <p className="text-xs text-green-600">✅ Hoạt động</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-green-600">✅ Kết nối</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Session</p>
                <p className="text-xs text-green-600">✅ Hợp lệ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}