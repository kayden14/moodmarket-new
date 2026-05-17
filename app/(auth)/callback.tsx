// app/auth/callback.tsx
//
// Handles the deep link redirect after Google (or other OAuth) sign-in.
//
// Flow:
//  1. User taps "Continue with Google" → browser opens Google consent
//  2. Google redirects to moodmarket://auth/callback?code=xxx
//  3. Expo Router opens this screen
//  4. We exchange the code for a Supabase session
//  5. Redirect to (tabs)
//
// Also handles the case where Supabase uses a URL fragment (#access_token=...)
// instead of a query param — supabase-js picks that up automatically via
// onAuthStateChange, so we just wait briefly and redirect.

import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let didNavigate = false;

    const navigate = () => {
      if (!didNavigate) {
        didNavigate = true;
        router.replace('/(tabs)');
      }
    };

    const handleURL = async (url: string) => {
      console.log('[AuthCallback] Handling URL:', url);

      try {
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code as string | undefined;

        if (code) {
          // PKCE flow — exchange code for session
          console.log('[AuthCallback] Exchanging code for session…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[AuthCallback] Exchange error:', error.message);
          } else {
            console.log('[AuthCallback] ✅ Session established');
          }
        } else {
          // Implicit flow — supabase-js handles the fragment automatically
          // via onAuthStateChange; just give it a moment
          console.log('[AuthCallback] No code param — waiting for onAuthStateChange…');
          await new Promise((res) => setTimeout(res, 1000));
        }
      } catch (err: any) {
        console.error('[AuthCallback] Error:', err?.message ?? err);
      }

      navigate();
    };

    // Check if the app was opened via deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('auth/callback')) {
        handleURL(url);
      } else {
        // App was already open — check for session that supabase-js may
        // have already set via onAuthStateChange, then redirect
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('[AuthCallback] Session already active, redirecting…');
            navigate();
          }
        });
      }
    });

    // Handle URL if the app was already running (warm start)
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('auth/callback')) handleURL(url);
    });

    // Safety net — redirect after 5s no matter what
    const fallback = setTimeout(() => {
      console.warn('[AuthCallback] Fallback timeout — redirecting anyway');
      navigate();
    }, 5000);

    return () => {
      sub.remove();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF7A8A" />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF0F2',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});