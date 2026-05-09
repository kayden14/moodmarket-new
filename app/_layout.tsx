// app/_layout.tsx
// Base layout — all providers and the root Stack live here.
// Child groups (guest, auth, customer, vendor, admin) extend this with their own layouts.

import 'react-native-url-polyfill/auto';
import { Platform, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function InnerLayout() {
  const { theme, isDark } = useTheme();
  const { top, right, left } = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: top, paddingLeft: left, paddingRight: right }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(guest)"    options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"     options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"     options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(vendor)"   options={{ headerShown: false }} />
        <Stack.Screen name="(admin)"    options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' && { height: '100vh' } as any),
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <InnerLayout />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
