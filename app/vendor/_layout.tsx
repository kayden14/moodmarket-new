import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function VendorLayout() {
  const { profile, loading, isVendor } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const seg = segments as string[];
    // These screens are accessible without being a vendor
    const onLogin = seg.includes('login');
    const onApply = seg.includes('apply');
    const publicScreen = onLogin || onApply;

    if (!profile) {
      // Not signed in at all
      if (onApply) {
        // If they want to apply but aren't signed in, they need a normal customer account first
        router.replace('/login' as any);
      } else if (!onLogin) {
        // Otherwise send to vendor login
        router.replace('/vendor/login' as any);
      }
      return;
    }

    // Signed in but not a vendor: allow apply screen, block everything else
    if (!isVendor && !publicScreen) {
      router.replace('/vendor/apply' as any);
    }

    // If already a vendor and they land on login, push to dashboard
    if (isVendor && onLogin) {
      router.replace('/vendor' as any);
    }
  }, [loading, profile, isVendor, segments]);

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="apply" />
      <Stack.Screen name="products" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
