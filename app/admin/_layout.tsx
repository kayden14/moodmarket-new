import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"    options={{ headerShown: false }} />
      <Stack.Screen name="login"    options={{ headerShown: false }} />
      <Stack.Screen name="orders"   options={{ headerShown: false }} />
      <Stack.Screen name="products" options={{ headerShown: false }} />
      <Stack.Screen name="users"    options={{ headerShown: false }} />
    </Stack>
  );
}
