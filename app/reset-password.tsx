import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import * as Linking from 'expo-linking';

export default function ResetPassword() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // ---------------- FIX: HANDLE SUPABASE RECOVERY LINK ----------------
  useEffect(() => {
    const init = async () => {
      try {
        // Get incoming URL (Expo Go + Web)
        const url = await Linking.getInitialURL();

        if (url) {
          // IMPORTANT: this restores Supabase session from recovery link
          await supabase.auth.exchangeCodeForSession(url);
        }

        const { data } = await supabase.auth.getSession();

        if (data.session) {
          setReady(true);
        } else {
          setReady(false);
          Alert.alert(
            'Invalid or expired link',
            'Please request a new password reset email.'
          );
          router.replace('/login');
        }
      } catch (err) {
        console.log('Reset init error:', err);
        setReady(false);
      }
    };

    init();
  }, []);

  // ---------------- UPDATE PASSWORD ----------------
  const handleUpdate = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error('Session expired. Please request a new reset link.');
      }

      // 🔥 UPDATE PASSWORD
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      // 🔥 IMPORTANT: sign out after reset (prevents weird redirects)
      await supabase.auth.signOut();

      Alert.alert('Success', 'Password updated successfully');

      // 🔥 redirect to login
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- LOADING SCREEN ----------------
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Verifying reset link...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>

      <TextInput
        placeholder="Enter new password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleUpdate}
        disabled={loading}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },

  button: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});