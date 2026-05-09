/**
 * app/(tabs)/_layout.tsx
 *
 * - Wraps the app in ThemeProvider (mood colours + light/dark mode)
 * - Tab bar colours update with the active mood theme
 * - Notification listeners wired in
 */

import { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, ShoppingBag, UserCircle } from 'lucide-react-native';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/notifications';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// ─── Layout constants ─────────────────────────────────────────────────────────

const BAR_HEIGHT = 60;

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabDef = { label: string; Icon: React.ComponentType<any> };

const TABS: Record<string, TabDef> = {
  index:   { label: 'Home',    Icon: House       },
  cart:    { label: 'Cart',    Icon: ShoppingBag },
  profile: { label: 'Profile', Icon: UserCircle  },
};

// ─── Single Tab Item ──────────────────────────────────────────────────────────

function TabItem({
  routeName,
  focused,
  onPress,
  badge,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
  badge?: number;
}) {
  const def = TABS[routeName];
  if (!def) return null;

  const { Icon, label } = def;
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.05 : 1,
      useNativeDriver: true,
      tension: 140,
      friction: 9,
    }).start();
  }, [focused]);

  // Active pill tint derived from current mood primary colour
  const pillActiveBg  = theme.primary + '12'; // 7% opacity
  const pillActiveBorder = theme.primary + '25'; // 15% opacity

  return (
    <TouchableOpacity style={t.touch} onPress={onPress} activeOpacity={0.65}>
      <Animated.View
        style={[
          t.pill,
          focused && { backgroundColor: pillActiveBg, borderColor: pillActiveBorder },
          { transform: [{ scale }] },
        ]}
      >
        <View style={t.iconWrap}>
          <Icon
            size={21}
            strokeWidth={focused ? 2.4 : 1.8}
            color={focused ? theme.primary : theme.inactive}
          />
          {badge != null && badge > 0 && (
            <View style={[t.badge, { backgroundColor: theme.primary }]}>
              <Text style={t.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={[t.label, { color: focused ? theme.primary : theme.inactive, fontWeight: focused ? '700' : '500' }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const t = StyleSheet.create({
  touch:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill:    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent' },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badge:   { position: 'absolute', top: -4, right: -9, minWidth: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeTxt: { fontSize: 7.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.1 },
  label:   { fontSize: 10, letterSpacing: 0.1 },
});

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { cartCount } = useCart();
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[b.root, { backgroundColor: theme.isDark ? 'rgba(26,26,26,0.97)' : 'rgba(255,255,255,0.97)' }]}>
      <View style={[b.hairline, { backgroundColor: theme.border }]} />
      <View style={b.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              focused={focused}
              onPress={onPress}
              badge={route.name === 'cart' ? cartCount : undefined}
            />
          );
        })}
      </View>
      <View style={[b.safeAreaFill, { height: Math.max(bottom, Platform.OS === 'ios' ? 28 : 10), backgroundColor: theme.isDark ? 'rgba(26,26,26,0.97)' : 'rgba(255,255,255,0.97)' }]} />
    </View>
  );
}

const b = StyleSheet.create({
  root: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },
  hairline: { height: StyleSheet.hairlineWidth },
  bar:      { flexDirection: 'row', height: BAR_HEIGHT, alignItems: 'center', paddingHorizontal: 4 },
  safeAreaFill: {},
});

// ─── Inner layout (needs ThemeProvider already mounted) ───────────────────────

function InnerTabLayout() {
  const router = useRouter();
  const { user } = useAuth();

  const notifListener    = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // Notifications are handled via Supabase realtime in notifications.tsx
    // Push token registration is done safely in lib/notifications.ts
    if (user?.id) {
      NotificationService.init(user.id).catch(() => {
        // Silently ignore — push notifications not available in Expo Go
      });
    }

    // Wire up notification listeners only if the API is available
    try {
      const ExpoNotifications = require('expo-notifications');
      notifListener.current = ExpoNotifications.addNotificationReceivedListener(
        (notification: any) => {
          console.log('[Notifications] Received:', notification.request.content.title);
        }
      );
      responseListener.current = ExpoNotifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const screen = response.notification.request.content.data?.screen as string | undefined;
          if (screen) setTimeout(() => router.push(screen as any), 300);
        }
      );
    } catch {
      // expo-notifications not available in Expo Go SDK 53+ — safe to ignore
    }

    return () => {
      notifListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  }, [user?.id]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// ─── Default export — wraps everything in ThemeProvider ──────────────────────

export default function TabLayout() {
  return <InnerTabLayout />;
}