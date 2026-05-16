// hooks/useRealtimeNotifications.ts
// Real-time in-app notification listener.
// Subscribes to the vendor_notifications table for the given vendorId.
// On INSERT it surfaces a browser notification (web) or schedules a local
// push notification (native) and returns the full notification list.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { getVendorNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/vendorService';
import { getLazyNotifications } from '@/utils/lazyModules';
import type { VendorNotification } from '@/services/vendorService';

interface UseRealtimeNotificationsOptions {
  vendorId: string | null | undefined;
  /** Auto-subscribe to DB changes? Default true. */
  enabled?: boolean;
}

interface UseRealtimeNotificationsReturn {
  notifications: VendorNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRealtimeNotifications({
  vendorId,
  enabled = true,
}: UseRealtimeNotificationsOptions): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!vendorId) { setLoading(false); return; }
    try {
      const data = await getVendorNotifications(vendorId);
      setNotifications(data);
    } catch (e) {
      console.error('[useRealtimeNotifications] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // ── Surface a notification to the user ──────────────────────────────────
  const surfaceNotification = (notif: VendorNotification) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title, { body: notif.body, icon: '/assets/images/icon.png' });
      }
      return;
    }
    // Native: lazy-load expo-notifications
    const EN = getLazyNotifications();
    if (EN) {
      try {
        EN.scheduleNotificationAsync({
          content: { title: notif.title, body: notif.body, sound: true },
          trigger: null,
        });
      } catch (err) {
        console.warn('[useRealtimeNotifications] Failed to schedule notification:', err);
      }
    }
  };

  // ── Subscribe to realtime ─────────────────────────────────────────────
  useEffect(() => {
    if (!vendorId || !enabled) return;

    load();

    // Request browser notification permission on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') Notification.requestPermission();
    }

    const channel = supabase
      .channel(`vendor-notifs-${vendorId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vendor_notifications',
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload: any) => {
          const notif = payload.new as VendorNotification;
          setNotifications(prev => [notif, ...prev]);
          surfaceNotification(notif);
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vendor_notifications',
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload: any) => {
          const updated = payload.new as VendorNotification;
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [vendorId, enabled]);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    if (!vendorId) return;
    await markAllNotificationsRead(vendorId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: load };
}
