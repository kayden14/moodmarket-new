/**
 * app/(tabs)/_layout.web.tsx
 *
 * Responsive web-only layout shell using WebShell.
 */

import { Tabs, usePathname } from 'expo-router';
import WebShell from '@/components/WebShell';

export default function WebTabLayout() {
  const pathname = usePathname();
  
  const navItems = [
    { label: 'Storefront', icon: '🏠', path: '/(tabs)' },
    { label: 'My Cart',    icon: '🛒', path: '/(tabs)/cart' },
    { label: 'Profile',    icon: '👤', path: '/(tabs)/profile' },
  ];

  const activeNav = pathname === '/' ? '/(tabs)' : pathname;

  return (
    <WebShell 
      activeNav={activeNav}
      title="MoodMarket"
    >
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="cart" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </WebShell>
  );
}
