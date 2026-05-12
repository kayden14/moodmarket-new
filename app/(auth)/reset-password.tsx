import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/services/supabase';
import { AuthLayoutWeb } from '@/components/AuthLayoutWeb';

// ── Web Reset Password ──────────────────────────────────────────────────────

function ResetPasswordWeb() {
  const router = useRouter();
  const { code, error_description } = useLocalSearchParams<{ code: string, error_description: string }>();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(error_description || '');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (error_description) return;
      if (!code) {
        setError('No reset code provided.');
        return;
      }
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setReady(true);
      } catch (err) {
        console.log('Reset exchange error:', err);
        setError('Invalid or expired reset link.');
      }
    };
    init();
  }, [code, error_description]);

  const handleUpdate = async () => {
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!ready && !error) {
    return (
      <AuthLayoutWeb
        eyebrow="Security"
        heading={<>Reset your<br /><em>password</em></>}
        subheading="Verifying your reset link…"
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="auth-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      </AuthLayoutWeb>
    );
  }

  if (error) {
    return (
      <AuthLayoutWeb
        eyebrow="Security"
        heading={<>Reset your<br /><em>password</em></>}
        subheading="Something went wrong."
        error={error}
      >
        <button className="auth-cta" onClick={() => router.replace('/(auth)/login')}>
          Back to Login
        </button>
      </AuthLayoutWeb>
    );
  }

  if (success) {
    return (
      <AuthLayoutWeb
        eyebrow="Security"
        heading={<>Password<br /><em>updated</em></>}
        subheading="Your password has been reset successfully."
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}><span style={{ fontFamily: undefined }}>🎉</span></div>
          <p style={{ color: '#6B7280', fontSize: 15 }}>Redirecting you to login…</p>
        </div>
      </AuthLayoutWeb>
    );
  }

  return (
    <AuthLayoutWeb
      eyebrow="Security"
      heading={<>Reset your<br /><em>password</em></>}
      subheading="Enter a new password for your account."
      error={error}
    >
      <div className="auth-field">
        <div className="auth-field-header">
          <label className="auth-field-label">New password</label>
        </div>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><span style={{ fontFamily: undefined }}>🔒</span></span>
          <input
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUpdate()}
            autoFocus
          />
        </div>
      </div>

      <button className="auth-cta" onClick={handleUpdate} disabled={loading}>
        {loading ? <div className="auth-spinner" /> : 'Update Password →'}
      </button>
    </AuthLayoutWeb>
  );
}

// ── Mobile Reset Password ───────────────────────────────────────────────────

function ResetPasswordMobile() {
  const router = useRouter();
  const { code, error_description } = useLocalSearchParams<{ code: string, error_description: string }>();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (error_description) {
        Alert.alert('Error', error_description);
        router.replace('/(auth)/login');
        return;
      }
      if (!code) return;
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setReady(true);
      } catch (err: any) {
        console.log('Reset exchange error:', err);
        Alert.alert('Invalid link', 'Please request a new password reset email.');
        router.replace('/(auth)/login');
      }
    };
    init();
  }, [code, error_description]);

  const handleUpdate = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;
      Alert.alert('Success', 'Password updated successfully');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF7A8A" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Verifying reset link...</Text>
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
        placeholderTextColor="#9CA3AF"
      />
      <TouchableOpacity onPress={handleUpdate} disabled={loading} style={styles.button}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────

export default function ResetPassword() {
  if (Platform.OS === 'web') return <ResetPasswordWeb />;
  return <ResetPasswordMobile />;
}

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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#FF7A8A',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF7A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
