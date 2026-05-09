import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // wait until auth state is ready
    if (loading) return;

    // small delay helps prevent navigation race conditions in Expo Router
    const timeout = setTimeout(() => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding'); // or '/login' if you have auth screen
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [user, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});