import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import DashboardShell from '@/components/DashboardShell';
import { ThemeProvider } from '@/contexts/ThemeContext';

const VENDOR_NAV = [
  { icon: '🏠', label: 'Dashboard',     path: '/vendor' },
  { icon: '📦', label: 'My Products',  path: '/vendor/products' },
  { icon: '🛒', label: 'Orders',       path: '/vendor/orders' },
  { icon: '💰', label: 'Earnings',     path: '/vendor/earnings' },
  { icon: '🔔', label: 'Notifications', path: '/vendor/notifications' },
];

export default function VendorLayout() {
  const { profile, loading, isVendor } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const seg = segments as string[];
    const onLogin = seg.includes('login');
    const onApply = seg.includes('apply');
    const publicScreen = onLogin || onApply;

    if (!isVendor && !publicScreen) {
      router.replace('/vendor/apply' as any);
    }

    if (isVendor && onLogin) {
      router.replace('/vendor' as any);
    }
  }, [loading, isVendor, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0B0F1A',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color="#FF7A8A" size="large" />
      </View>
    );
  }

  const seg = segments as string[];
  const isPublicScreen = seg.includes('login') || seg.includes('apply');

  const currentSegment = seg[seg.length - 1];
  const titleMap: Record<string, string> = {
    'vendor': 'Store Dashboard',
    'products': 'My Products',
    'orders': 'Orders',
    'earnings': 'Earnings',
    'notifications': 'Notifications',
  };

  if (isPublicScreen) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="apply" />
      </Stack>
    );
  }

  return (
    <ThemeProvider>
      <DashboardShell
        portalName="Vendor"
        title={titleMap[currentSegment] || 'Vendor Portal'}
        subtitle="🏪 Store Management"
        navItems={VENDOR_NAV}
        primaryColor="#FF7A8A"
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="products" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="earnings" />
          <Stack.Screen name="notifications" />
        </Stack>
      </DashboardShell>
    </ThemeProvider>
  );
}
