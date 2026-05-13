import { Slot, usePathname } from 'expo-router';
import WebShell from '@/components/WebShell';
import { StorefrontProvider } from '@/contexts/StorefrontContext';

export default function WebTabLayout() {
  const pathname = usePathname();

  // Map pathname to active nav key for WebShell
  let activeNav = '/';
  if (pathname.includes('/cart')) activeNav = '/cart';
  else if (pathname.includes('/profile')) activeNav = '/profile';
  else if (pathname.includes('/search')) activeNav = '/search';
  else if (pathname.includes('/notifications')) activeNav = '/notifications';

  return (
    <StorefrontProvider>
      <WebShell activeNav={activeNav as any}>
        <Slot />
      </WebShell>
    </StorefrontProvider>
  );
}
