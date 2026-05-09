/**
 * app/product/[id].tsx  — Native fallback for product detail
 *
 * Expo Router requires this file to exist as a sibling to [id].web.tsx.
 * This is the NATIVE (iOS/Android) version of the product detail screen.
 *
 * If you already have a full native implementation, replace this entire
 * file with that. This is just a safe placeholder that satisfies the
 * "missing default export" error while you work on the native version.
 *
 * For a production app you'd want a full React Native implementation here,
 * matching the structure of your cart.tsx and profile.tsx native screens.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProductDetailNative() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();

  // On native, you can either:
  // 1. Show a full native product detail screen (recommended)
  // 2. Temporarily redirect or show a loading state

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        Loading product…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});