// app/admin/_layout.tsx
import { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import DashboardShell from '@/components/DashboardShell';
import { useTheme } from '@/contexts/ThemeContext';

const ADMIN_NAV = [
  { icon: '🏠', label: 'Dashboard', path: '/admin' },
  { icon: '📦', label: 'Products',  path: '/admin/products' },
  { icon: '🛒', label: 'Orders',    path: '/admin/orders' },
  { icon: '🏪', label: 'Vendors',   path: '/admin/vendors' },
  { icon: '👥', label: 'Users',     path: '/admin/users' },
];

export default function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const isLoginPage = (segments as string[]).includes('login');

  useEffect(() => {
    if (loading) return;
    if (!isAdmin && !isLoginPage) {
      router.replace('/admin/login' as any);
    } else if (isAdmin && isLoginPage) {
      router.replace('/admin' as any);
    }
  }, [isAdmin, loading, isLoginPage]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#FF7A8A" size="large" />
      </View>
    );
  }

  const currentSegment = segments[segments.length - 1];
  const titleMap: Record<string, string> = {
    'admin': 'Dashboard',
    'products': 'Products',
    'orders': 'Orders',
    'vendors': 'Vendors',
    'users': 'Users',
  };

  if (isLoginPage) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
    <DashboardShell
      portalName="Admin"
      title={titleMap[currentSegment] || 'Admin Panel'}
      subtitle="🛡️ Management Portal"
      navItems={ADMIN_NAV}
      primaryColor="#FF7A8A"
    >
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index"    options={{ headerShown: false }} />
        <Stack.Screen name="orders"   options={{ headerShown: false }} />
        <Stack.Screen name="products" options={{ headerShown: false }} />
        <Stack.Screen name="users"    options={{ headerShown: false }} />
        <Stack.Screen name="vendors"  options={{ headerShown: false }} />
      </Stack>
    </DashboardShell>
  );
}