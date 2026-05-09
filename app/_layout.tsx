import 'react-native-url-polyfill/auto';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function InnerLayout() {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(auth)"        options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="camera"        options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="checkout"      options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile"  options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]"  options={{ headerShown: false }} />
        <Stack.Screen name="search"        options={{ headerShown: false }} />
        <Stack.Screen name="onboarding"    options={{ headerShown: false }} />
        <Stack.Screen name="reviews"       options={{ headerShown: false }} />
        <Stack.Screen name="+not-found"    options={{ headerShown: false }} />
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
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <InnerLayout />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}