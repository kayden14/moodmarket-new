// contexts/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';
import { NotificationService } from '@/services/notifications';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  mood_history: any[];
  push_token?: string | null;
  // Role system
  role: UserRole;
  is_admin: boolean;          // legacy boolean kept for compat
  is_suspended: boolean;
  // Vendor store info
  store_name?: string | null;
  store_description?: string | null;
  store_logo?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  // Role helpers
  isAdmin: boolean;
  isVendor: boolean;
  isSuspended: boolean;
  // Actions
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithOAuth: (provider: 'google' | 'apple' | 'facebook') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isNewSignup = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('Fetching profile...');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
        return data;
      }

      // Create profile if missing
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const name =
          userData.user.user_metadata?.name ||
          userData.user.user_metadata?.full_name ||
          userData.user.email?.split('@')[0] ||
          '';

        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert(
            { id: userId, email: userData.user.email, name, mood_history: [] },
            { onConflict: 'id' },
          )
          .select()
          .single();

        if (newProfile) {
          setProfile(newProfile);
          return newProfile;
        }
      }
    } catch (e) {
      console.log('Profile fetch failed:', e);
    }

    return null;
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout (DO NOT clear too early)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('Auth timeout fallback');
        setLoading(false);
      }
    }, 5000);

    // Initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          lastUserId.current = session.user.id;

          // 🔥 NON-BLOCKING profile fetch
          fetchProfile(session.user.id);

          // ✅ Immediately stop loading
          setLoading(false);
          clearTimeout(timeout);
        } else {
          setLoading(false);
          clearTimeout(timeout);
        }
      })
      .catch((e) => {
        console.log('Session error:', e);
        if (mounted) setLoading(false);
        clearTimeout(timeout);
      });

    // Auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const fetchedProfile = await fetchProfile(session.user.id);

          const firstName =
            fetchedProfile?.name?.split(' ')[0] ||
            session.user.user_metadata?.name?.split(' ')[0] ||
            'there';

          if (isNewSignup.current) {
            setTimeout(() => {
              NotificationService.send(
                `🎉 Welcome to MoodMarket, ${firstName}!`,
                'Start by scanning your mood.',
              );
              isNewSignup.current = false;
            }, 1500);
          } else if (
            event === 'SIGNED_IN' &&
            lastUserId.current !== session.user.id
          ) {
            setTimeout(() => {
              NotificationService.send(
                `👋 Welcome back, ${firstName}!`,
                'Your picks are ready.',
              );
            }, 1000);
          }

          lastUserId.current = session.user.id;
        } catch (e) {
          console.log('Auth change profile error:', e);
        }
      } else {
        setProfile(null);
        lastUserId.current = null;
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), full_name: name.trim() } },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: email.trim(),
          name: name.trim(),
          mood_history: [],
        },
        { onConflict: 'id' },
      );

      isNewSignup.current = true;
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    return data;
  };

  const signInWithOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    const redirectTo =
      Platform.OS === 'web'
        ? `${window.location.origin}/(tabs)`
        : 'moodmarket://(tabs)';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) throw error;

    if (data?.url && Platform.OS !== 'web') {
      await Linking.openURL(data.url);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    lastUserId.current = null;
  };

  const isAdmin     = profile?.role === 'admin' || profile?.is_admin === true;
  const isVendor    = profile?.role === 'vendor';
  const isSuspended = profile?.is_suspended === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        isVendor,
        isSuspended,
        signOut,
        signUp,
        signIn,
        signInWithOAuth,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
