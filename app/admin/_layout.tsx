import { Stack, useSegments } from 'expo-router';
import DashboardShell from '@/components/DashboardShell';
import { ThemeProvider } from '@/contexts/ThemeContext';

const ADMIN_NAV = [
  { icon: '🏠', label: 'Dashboard', path: '/admin' },
  { icon: '📦', label: 'Products',  path: '/admin/products' },
  { icon: '🛒', label: 'Orders',    path: '/admin/orders' },
  { icon: '🏪', label: 'Vendors',   path: '/admin/vendors' },
  { icon: '👥', label: 'Users',     path: '/admin/users' },
];

export default function AdminLayout() {
  const segments = useSegments();
  const isLoginPage = (segments as string[]).includes('login');

  const currentSegment = segments[segments.length - 1];
  const titleMap: Record<string, string> = {
    'admin': 'Dashboard',
    'products': 'Products',
    'orders': 'Orders',
    'vendors': 'Vendors',
    'users': 'Users',
  };

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
    <ThemeProvider>
      <DashboardShell
        portalName="Admin"
        title={titleMap[currentSegment] || 'Admin Panel'}
        subtitle="🛡️ Management Portal"
        navItems={ADMIN_NAV}
        primaryColor="#FF7A8A"
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index"    options={{ headerShown: false }} />
          <Stack.Screen name="orders"   options={{ headerShown: false }} />
          <Stack.Screen name="products" options={{ headerShown: false }} />
          <Stack.Screen name="users"    options={{ headerShown: false }} />
          <Stack.Screen name="vendors"  options={{ headerShown: false }} />
        </Stack>
      </DashboardShell>
    </ThemeProvider>
  );
}
