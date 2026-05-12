/**
 * app/(tabs)/_layout.web.tsx
 *
 * Web tab layout — renders Tabs directly without a shell wrapper.
 * Each individual tab page (index.web.tsx, cart.web.tsx, profile.web.tsx)
 * manages its own full-page layout (topnav, sidebar, content area).
 * Wrapping in an extra shell causes layout conflicts and blank content areas.
 */

import { Tabs } from 'expo-router';

export default function WebTabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
