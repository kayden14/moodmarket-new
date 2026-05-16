// services/notifications.ts
//
// Universal notification service:
// - Expo Go → safely disabled (no crashes)
// - Native builds → full push notifications
// - Web → browser notifications fallback

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getLazyNotifications } from '@/utils/lazyModules';

const isWeb = Platform.OS === 'web';

// ── Lazy-load expo-notifications (prevents Expo Go crash) ──
const ExpoNotifications = getLazyNotifications();

if (ExpoNotifications) {
  try {
    ExpoNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.log('[Notifications] Failed to set notification handler:', err);
  }
}

export const NotificationService = {
  // ── INIT ─────────────────────────────────────────────
  async init(userId?: string): Promise<string | null> {
    // ── WEB ──
    if (isWeb) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
      }
      return null;
    }

    // ── NO MODULE (Expo Go edge case) ──
    if (!ExpoNotifications) return null;

    // ── PHYSICAL DEVICE CHECK ──
    if (!Device.isDevice) {
      console.log('[Notifications] Simulator detected.');
      return null;
    }

    // ── PERMISSIONS ──
    try {
      const { status: existing } =
        await ExpoNotifications.getPermissionsAsync();

      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } =
          await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return null;
    } catch {
      return null;
    }

    // ── ANDROID CHANNEL ──
    if (Platform.OS === 'android') {
      try {
        await ExpoNotifications.setNotificationChannelAsync('default', {
          name: 'MoodMarket',
          importance: ExpoNotifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF7A8A',
        });
      } catch {}
    }

    // ── PUSH TOKEN ──
    let token: string | null = null;

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;

      const result = await ExpoNotifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      token = result.data;
      console.log('[Notifications] Token:', token);
    } catch {
      return null;
    }

    // ── SAVE TOKEN ──
    if (userId && token) {
      try {
        await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);
      } catch {}
    }

    return token;
  },

  // ── SEND NOTIFICATION ─────────────────────────────
  async send(
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    // ── WEB ──
    if (isWeb) {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(title, { body });
      }
      return;
    }

    if (!ExpoNotifications) return;

    try {
      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data ?? {},
          sound: true,
        },
        trigger: null,
      });
    } catch {}
  },

  // ── BUSINESS HELPERS ─────────────────────────────

  async sendMoodProductsNotification(mood: string) {
    await this.send(
      '✨ New mood matches!',
      `New products match your ${mood} mood today.`,
      { screen: '/(tabs)' }
    );
  },

  async sendOrderShippedNotification(orderId: string) {
    await this.send(
      '📦 Your order is on its way!',
      'Your order has been shipped.',
      { screen: '/(tabs)/profile', orderId }
    );
  },

  async sendOrderDeliveredNotification() {
    await this.send(
      '🎉 Order delivered!',
      'Enjoy your mood-matched products!',
      { screen: '/(tabs)/profile' }
    );
  },

  async sendWishlistSaleNotification(productName: string) {
    await this.send(
      '🏷️ Wishlist item on sale!',
      `"${productName}" is now on sale!`,
      { screen: '/(tabs)/wishlist' }
    );
  },

  async sendWelcomeNotification(name: string) {
    await this.send(
      `Welcome to MoodMarket, ${name}! 🛍️`,
      'Scan your mood for personalised products.',
      { screen: '/camera' }
    );
  },

  async moodSelected(userId: string, mood: string, emoji: string) {
    await this.send(
      `${emoji} Mood set to ${mood}`,
      "We're finding products for you!",
      { mood }
    );

    try {
      // 1. Fetch current history
      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('mood_history')
        .eq('id', userId)
        .single();

      if (fetchErr) throw fetchErr;

      // 2. Append new entry
      const history = Array.isArray(profile?.mood_history) ? profile.mood_history : [];
      const newHistory = [
        ...history,
        { date: new Date().toISOString(), mood, emoji }
      ].slice(-50); // Keep last 50 entries

      // 3. Save back
      await supabase
        .from('profiles')
        .update({ mood_history: newHistory })
        .eq('id', userId);
    } catch (err) {
      console.warn('[Notifications] Failed to save mood history:', err);
    }
  },
};

export const Notify = NotificationService;
