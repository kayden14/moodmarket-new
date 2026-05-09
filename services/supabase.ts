// services/supabase.ts
// Robust Supabase client with refresh-token recovery handling

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─────────────────────────────────────────────────────────────
// Storage selection
// ─────────────────────────────────────────────────────────────

function getStorage() {
  if (Platform.OS === 'web') {
    return undefined; // uses browser localStorage automatically
  }

  return require('@react-native-async-storage/async-storage').default;
}

// ─────────────────────────────────────────────────────────────
// Create client
// ─────────────────────────────────────────────────────────────

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// ─────────────────────────────────────────────────────────────
// SAFE SESSION RECOVERY (IMPORTANT FIX)
// ─────────────────────────────────────────────────────────────

// This prevents crash loop when refresh token is invalid
export async function safeGetSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.log('⚠️ Auth session error:', error.message);

    // If refresh token is invalid → clear session completely
    await supabase.auth.signOut();

    return { session: null };
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// AUTO RECOVERY LISTENER
// ─────────────────────────────────────────────────────────────

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('AUTH EVENT:', event);

  if (event === 'TOKEN_REFRESHED' && !session) {
    console.log('⚠️ Bad refresh token detected → signing out');
    await supabase.auth.signOut();
  }

  if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out cleanly');
  }
});
