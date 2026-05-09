import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="camera"        options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="checkout"      options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile"  options={{ headerShown: false }} />
      <Stack.Screen name="mood-history"  options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]"  options={{ headerShown: false }} />
      <Stack.Screen name="reviews"       options={{ headerShown: false }} />
      <Stack.Screen name="search"        options={{ headerShown: false }} />
    </Stack>
  );
}
