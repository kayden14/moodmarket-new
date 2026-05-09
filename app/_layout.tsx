// app/_layout.tsx
// Base layout — all providers and the root Stack live here.

import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function InnerLayout() {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="index"         options={{ headerShown: false }} />
        <Stack.Screen name="onboarding"    options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"        options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="camera"        options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="checkout"      options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile"  options={{ headerShown: false }} />
        <Stack.Screen name="mood-history"  options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]"  options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]"    options={{ headerShown: false }} />
        <Stack.Screen name="search"        options={{ headerShown: false }} />
        <Stack.Screen name="reviews"       options={{ headerShown: false }} />
        <Stack.Screen name="admin"         options={{ headerShown: false }} />
        <Stack.Screen name="vendor"        options={{ headerShown: false }} />
        <Stack.Screen name="+not-found"    options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

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
