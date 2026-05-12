<<<<<<< HEAD
import { Tabs, usePathname } from 'expo-router';
=======
import { Slot, usePathname } from 'expo-router';
>>>>>>> origin/main
import WebShell from '@/components/WebShell';
import { StorefrontProvider } from '@/contexts/StorefrontContext';

export default function WebTabLayout() {
  const pathname = usePathname();
<<<<<<< HEAD
  
=======

  // Map pathname to active nav key for WebShell
>>>>>>> origin/main
  let activeNav = '/';
  if (pathname.includes('/cart')) activeNav = '/cart';
  else if (pathname.includes('/profile')) activeNav = '/profile';
  else if (pathname.includes('/search')) activeNav = '/search';
  else if (pathname.includes('/notifications')) activeNav = '/notifications';

  return (
    <StorefrontProvider>
      <WebShell activeNav={activeNav as any}>
<<<<<<< HEAD
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="cart" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="search" />
          <Tabs.Screen name="reviews" />
          <Tabs.Screen name="edit-profile" />
          <Tabs.Screen name="mood-history" />
          <Tabs.Screen name="product/[id]" />
          <Tabs.Screen name="order/[id]" />
        </Tabs>
=======
        <Slot />
>>>>>>> origin/main
      </WebShell>
    </StorefrontProvider>
  );
}
