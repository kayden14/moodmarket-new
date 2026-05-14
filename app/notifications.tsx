/**
 * app/notifications.tsx
 *
 * Single file for both platforms:
 *  - Android/iOS  → NotificationsScreenMobile (original code, 100% unchanged)
 *  - Web          → NotificationsScreenWeb    (full web redesign)
 *
 * Platform switch at the default export — no .web.tsx split needed.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, StatusBar, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, Bell, ShoppingCart, Heart,
  Zap, Package, CheckCheck, Sparkles,
} from 'lucide-react-native';
import WebShell from '@/components/WebShell';

/* ─────────────────────────────────────────────────────────────────────────
   SHARED TYPES + HELPERS
───────────────────────────────────────────────────────────────────────── */

interface AppNotification {
  id:         string;
  user_id:    string;
  type:       'mood' | 'order' | 'deal' | 'system';
  title:      string;
  body:       string;
  screen?:    string;
  read:       boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE ICON CONFIG  (uses Lucide icons — original behaviour)
───────────────────────────────────────────────────────────────────────── */

function getIconConfig(type: string, isDark: boolean) {
  switch (type) {
    case 'mood':   return { Icon: Zap,          bg: isDark ? '#2D1820' : '#FFF0F2', color: '#FF7A8A' };
    case 'order':  return { Icon: ShoppingCart,  bg: isDark ? '#0D1F2D' : '#EBF5FB', color: '#0A7EA4' };
    case 'deal':   return { Icon: Heart,         bg: isDark ? '#2D1820' : '#FFF0F2', color: '#FF7A8A' };
    case 'system': return { Icon: Sparkles,      bg: isDark ? '#1E1428' : '#F4ECF7', color: '#8E44AD' };
    default:       return { Icon: Bell,          bg: isDark ? '#222222' : '#F2F3F4', color: '#888888' };
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB TYPE CONFIG  (uses emojis — web-safe)
───────────────────────────────────────────────────────────────────────── */

function getTypeConfig(type: string, isDark: boolean) {
  switch (type) {
    case 'mood':   return { emoji: '✨', bg: isDark ? '#2D1820' : '#FFF0F2', color: '#FF7A8A', label: 'Mood'   };
    case 'order':  return { emoji: '📦', bg: isDark ? '#0D1F2D' : '#EBF5FB', color: '#0A7EA4', label: 'Order'  };
    case 'deal':   return { emoji: '❤️', bg: isDark ? '#2D1820' : '#FFF0F2', color: '#FF7A8A', label: 'Deal'   };
    case 'system': return { emoji: '⚡', bg: isDark ? '#1E1428' : '#F4ECF7', color: '#8E44AD', label: 'System' };
    default:       return { emoji: '🔔', bg: isDark ? '#222222' : '#F2F3F4', color: '#888888', label: 'Info'   };
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   SHARED DATA HOOK
───────────────────────────────────────────────────────────────────────── */

function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as AppNotification[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new as AppNotification, ...prev])
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev =>
          prev.map(n => n.id === payload.new.id ? payload.new as AppNotification : n)
        )
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleTap = async (notif: AppNotification, routerFn: (path: any) => void) => {
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.screen) routerFn(notif.screen as any);
  };

  const markAllRead = async (userId: string) => {
    setMarkingAll(true);
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  const unreadCount   = notifications.filter(n => !n.read).length;
  const todayNotifs   = notifications.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString());
  const earlierNotifs = notifications.filter(n => new Date(n.created_at).toDateString() !== new Date().toDateString());

  return {
    notifications, loading, refreshing, setRefreshing,
    fetchNotifications, handleTap, markAllRead, markingAll,
    unreadCount, todayNotifs, earlierNotifs,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE — Notification Card  (original — uses Lucide icons)
───────────────────────────────────────────────────────────────────────── */

function NotifCard({
  notif,
  onPress,
}: {
  notif:   AppNotification;
  onPress: (n: AppNotification) => void;
}) {
  const { theme, isDark } = useTheme();
  const { Icon, bg, color } = getIconConfig(notif.type, isDark);

  return (
    <TouchableOpacity
      style={[
        card.wrap,
        {
          backgroundColor: notif.read ? theme.card : (isDark ? '#1E1215' : '#FFFBFB'),
          borderColor:     notif.read ? theme.border : (isDark ? '#3D2030' : '#FFD6DE'),
        },
      ]}
      onPress={() => onPress(notif)}
      activeOpacity={0.75}
    >
      {/* Unread dot */}
      {!notif.read && (
        <View style={[card.dot, { backgroundColor: theme.primary }]} />
      )}

      {/* Icon */}
      <View style={[card.iconWrap, { backgroundColor: bg }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>

      {/* Text */}
      <View style={card.body}>
        <Text style={[
          card.title,
          { color: notif.read ? theme.textSecondary : theme.textPrimary },
          !notif.read && { fontWeight: '800' },
        ]}>
          {notif.title}
        </Text>
        <Text style={[card.desc, { color: theme.textSecondary }]} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={[card.time, { color: theme.inactive }]}>
          {timeAgo(notif.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', gap: 12,
    borderWidth: 1, position: 'relative',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  dot:      { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  body:     { flex: 1, gap: 3 },
  title:    { fontSize: 14, fontWeight: '600' },
  desc:     { fontSize: 13, lineHeight: 18 },
  time:     { fontSize: 11, fontWeight: '500', marginTop: 2 },
});

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE SCREEN  (original code, 100% unchanged)
───────────────────────────────────────────────────────────────────────── */

function NotificationsScreenMobile() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const primary     = theme.primary;

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as AppNotification[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Realtime ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new as AppNotification, ...prev])
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev =>
          prev.map(n => n.id === payload.new.id ? payload.new as AppNotification : n)
        )
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleTap = async (notif: AppNotification) => {
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.screen) router.push(notif.screen as any);
  };

  const handleMarkAllRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    setMarkingAll(true);
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  const todayNotifs   = notifications.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString());
  const earlierNotifs = notifications.filter(n => new Date(n.created_at).toDateString() !== new Date().toDateString());

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* ── Header ── */}
      <View style={[s.header, {
        backgroundColor: theme.card,
        borderBottomColor: theme.border,
      }]}>
        <TouchableOpacity
          style={[s.backBtn, {
            backgroundColor: theme.background,
            borderColor: theme.border,
          }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={[s.headerEyebrow, { color: primary }]}>INBOX</Text>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Notifications</Text>
        </View>

        <TouchableOpacity
          style={[
            s.markAllBtn,
            {
              backgroundColor: unreadCount > 0 && !markingAll
                ? (isDark ? '#2D1820' : '#FFF0F2')
                : theme.background,
              borderColor: unreadCount > 0 && !markingAll
                ? (isDark ? '#3D2030' : '#FFD6DE')
                : theme.border,
            },
          ]}
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0 || markingAll}
        >
          {markingAll
            ? <ActivityIndicator size="small" color={primary} />
            : <CheckCheck size={16} color={unreadCount > 0 ? primary : theme.inactive} strokeWidth={2.5} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Unread banner ── */}
      {unreadCount > 0 && (
        <View style={[s.unreadBanner, {
          backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
          borderBottomColor: isDark ? '#3D2030' : '#FFD6DE',
        }]}>
          <View style={[s.unreadDot, { backgroundColor: primary }]} />
          <Text style={[s.unreadTxt, { color: primary }]}>
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={[s.loadingTxt, { color: theme.textSecondary }]}>
            Loading notifications…
          </Text>
        </View>

      ) : !user ? (
        <View style={s.centered}>
          <Bell size={48} color={theme.inactive} strokeWidth={1.5} />
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
            Sign in to see notifications
          </Text>
        </View>

      ) : notifications.length === 0 ? (
        <View style={s.centered}>
          <View style={[s.emptyIcon, {
            backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
            borderColor:     isDark ? '#3D2030' : '#FFD6DE',
          }]}>
            <Bell size={32} color={primary} strokeWidth={1.5} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
            All caught up!
          </Text>
          <Text style={[s.emptySub, { color: theme.textSecondary }]}>
            You have no notifications yet. We'll let you know when something happens.
          </Text>
        </View>

      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              tintColor={primary}
            />
          }
        >
          {todayNotifs.length > 0 && (
            <>
              <Text style={[s.groupLabel, { color: theme.inactive }]}>TODAY</Text>
              {todayNotifs.map(n => (
                <NotifCard key={n.id} notif={n} onPress={handleTap} />
              ))}
            </>
          )}

          {earlierNotifs.length > 0 && (
            <>
              <Text style={[s.groupLabel, { color: theme.inactive }]}>EARLIER</Text>
              {earlierNotifs.map(n => (
                <NotifCard key={n.id} notif={n} onPress={handleTap} />
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

const FILTER_TABS = [
  { key: 'all',    label: 'All'    },
  { key: 'mood',   label: 'Mood'   },
  { key: 'order',  label: 'Orders' },
  { key: 'deal',   label: 'Deals'  },
  { key: 'system', label: 'System' },
] as const;

function NotificationsScreenWeb() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const {
    notifications, loading, fetchNotifications,
    handleTap, markAllRead, markingAll,
    unreadCount, todayNotifs, earlierNotifs,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'mood' | 'order' | 'deal' | 'system'>('all');

  const tp = theme.textPrimary;
  const ts = theme.textSecondary;
  const pri = theme.primary;
  const bord = theme.border;
  const card = theme.card;
  const tint = theme.tint;

  const filtered = notifications.filter(n => activeTab === 'all' || n.type === activeTab);
  const filteredToday   = filtered.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString());
  const filteredEarlier = filtered.filter(n => new Date(n.created_at).toDateString() !== new Date().toDateString());

  const renderCard = (notif: AppNotification, index: number) => {
    const { bg, color, icon: Icon } = getIconConfig(notif.type, isDark);
    
    return (
      <div 
        key={notif.id}
        onClick={() => handleTap(notif, (p) => (window.location.href = p))}
        style={{
          display: 'flex', gap: '16px', padding: '16px', borderRadius: '12px',
          background: notif.read ? 'transparent' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
          border: `1px solid ${notif.read ? bord : pri + '33'}`,
          cursor: 'pointer', marginBottom: '12px', transition: 'all 0.2s',
          position: 'relative', overflow: 'hidden',
          animation: `notif-in 0.3s ease both ${index * 0.05}s`
        }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justify-content: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: tp, fontSize: '15px' }}>{notif.title}</span>
            <span style={{ fontSize: '11px', color: ts, fontWeight: 500 }}>{timeAgo(notif.created_at)}</span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: ts, lineHeight: '1.5' }}>{notif.body}</p>
        </div>
        {!notif.read && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', background: pri }} />
        )}
      </div>
    );
  };

  return (
    <WebShell 
      title={`Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
      subtitle="Stay updated with your latest alerts and activity"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes notif-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes notif-spin { to { transform: rotate(360deg); } }
      `}} />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Tabs & Mark All */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${bord}`, paddingBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: activeTab === tab.key ? `1.5px solid ${pri}` : `1.5px solid ${bord}`,
                  background: activeTab === tab.key ? tint : 'transparent',
                  color: activeTab === tab.key ? pri : ts,
                  fontSize: '13px', fontWeight: activeTab === tab.key ? 800 : 600, cursor: 'pointer', transition: 'all 0.2s', white-space: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {user && unreadCount > 0 && (
            <button 
              onClick={() => markAllRead(user.id)}
              disabled={markingAll}
              style={{ background: 'none', border: 'none', color: pri, fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: markingAll ? 0.5 : 1 }}
            >
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '100px 0', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: `3px solid ${bord}`, borderTopColor: pri, borderRadius: '50%', animation: 'notif-spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: card, borderRadius: '24px', border: `1px solid ${bord}`, animation: 'notif-in 0.4s ease both' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <h2 style={{ color: tp, margin: '0 0 8px' }}>Sign in to see notifications</h2>
            <p style={{ color: ts, margin: '0 0 24px' }}>Join the community to get updates on your orders and mood alerts.</p>
            <button 
              onClick={() => (window.location.href = '/login')}
              style={{ padding: '12px 32px', borderRadius: '12px', background: pri, color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}
            >
              Sign In
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', animation: 'notif-in 0.4s ease both' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
            <h2 style={{ color: tp, margin: '0 0 8px' }}>All caught up!</h2>
            <p style={{ color: ts, margin: 0 }}>No notifications found in this category.</p>
          </div>
        ) : (
          <div>
            {filteredToday.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '10px', fontWeight: 800, color: theme.inactive, letterSpacing: '2px', marginBottom: '16px', textTransform: 'uppercase' }}>Today</h3>
                {filteredToday.map((n, i) => renderCard(n, i))}
              </div>
            )}
            {filteredEarlier.length > 0 && (
              <div>
                <h3 style={{ fontSize: '10px', fontWeight: 800, color: theme.inactive, letterSpacing: '2px', marginBottom: '16px', textTransform: 'uppercase' }}>Earlier</h3>
                {filteredEarlier.map((n, i) => renderCard(n, filteredToday.length + i))}
              </div>
            )}
          </div>
        )}
      </div>
    </WebShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DEFAULT EXPORT — platform switch
───────────────────────────────────────────────────────────────────────── */

export default function NotificationsScreen() {
  if (Platform.OS === 'web') return <NotificationsScreenWeb />;
  return <NotificationsScreenMobile />;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE STYLES (structural only — no colours hardcoded)
───────────────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  backBtn:       { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerCenter:  { flex: 1, paddingHorizontal: 12 },
  headerEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle:   { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  markAllBtn:    { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  unreadBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  unreadDot:     { width: 7, height: 7, borderRadius: 4 },
  unreadTxt:     { fontSize: 12, fontWeight: '700' },
  list:          { padding: 16, paddingBottom: 60 },
  groupLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10, marginTop: 4 },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  loadingTxt:    { fontSize: 14, marginTop: 12 },
  emptyIcon:     { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  emptyTitle:    { fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.4 },
  emptySub:      { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});