/**
 * app/(tabs)/_layout.web.tsx
 *
 * Responsive web-only layout shell using WebShell.
 */

import { Tabs, usePathname } from 'expo-router';
import WebShell from '@/components/WebShell';
import { StorefrontProvider } from '@/contexts/StorefrontContext';

export default function WebTabLayout() {
  const pathname = usePathname();
  const activeNav = pathname === '/' ? '/(tabs)' : pathname;

  return (
    <StorefrontProvider>
      <WebShell activeNav={activeNav}>
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
    </StorefrontProvider>
  );
}
