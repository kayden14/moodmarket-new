/**
 * app/notifications.tsx
 *
 * Single file for both platforms:
 *  - Android/iOS  → NotificationsScreenMobile (original code, 100% unchanged)
 *  - Web          → NotificationsScreenWeb    (full web redesign)
 *
 * Platform switch at the default export — no .web.tsx split needed.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, StatusBar, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, Bell, ShoppingCart, Heart,
  Zap, Package, CheckCheck, Sparkles,
} from 'lucide-react-native';

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
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const {
    notifications, loading, fetchNotifications,
    handleTap, markAllRead, markingAll,
    unreadCount, todayNotifs, earlierNotifs,
  } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mood' | 'order' | 'deal' | 'system'>('all');

  const filtered = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const filteredToday   = filtered.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString());
  const filteredEarlier = filtered.filter(n => new Date(n.created_at).toDateString() !== new Date().toDateString());

  const pri   = theme.primary;
  const bg    = theme.background;
  const card  = theme.card;
  const bord  = theme.border;
  const tp    = theme.textPrimary;
  const ts    = theme.textSecondary;
  const tint  = theme.tint;
  const inact = theme.inactive;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes notif-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .notif-card {
      display: flex; gap: 14px; padding: 16px 18px;
      border-radius: 16px; border-width: 1px; border-style: solid;
      cursor: pointer; position: relative;
      animation: notif-in 0.3s ease both;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .notif-card:hover {
      transform: translateY(-2px);
      box-shadow: ${isDark ? '0 8px 28px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)'};
    }
    .notif-card.unread { background: ${isDark ? '#1E1215' : '#FFFBFB'}; border-color: ${isDark ? '#3D2030' : '#FFD6DE'}; }
    .notif-card.read   { background: ${card}; border-color: ${bord}; }

    .filter-tab {
      padding: 7px 16px; border-radius: 20px; border: 1.5px solid ${bord};
      background: none; cursor: pointer; font-size: 13px; font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif; color: ${ts};
      transition: all 0.15s ease; white-space: nowrap;
    }
    .filter-tab:hover { border-color: ${pri}; color: ${pri}; }
    .filter-tab.active { background: ${tint}; border-color: ${pri}; color: ${pri}; font-weight: 800; }

    .mark-all-btn {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 16px; border-radius: 20px;
      border: 1.5px solid ${bord}; background: none; cursor: pointer;
      font-size: 12px; font-weight: 700; color: ${ts};
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: all 0.15s ease;
    }
    .mark-all-btn:hover:not(:disabled) { border-color: ${pri}; color: ${pri}; }
    .mark-all-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid ${bord}; border-top-color: ${pri};
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }
  `;

  const renderCard = (notif: AppNotification, index: number) => {
    const cfg = getTypeConfig(notif.type, isDark);
    return (
      <div
        key={notif.id}
        className={`notif-card ${notif.read ? 'read' : 'unread'}`}
        style={{ animationDelay: `${index * 40}ms` }}
        onClick={() => handleTap(notif, router.push.bind(router))}
      >
        {/* unread dot */}
        {!notif.read && (
          <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, background: pri }} />
        )}

        {/* icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 15, flexShrink: 0,
          background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {cfg.emoji}
        </div>

        {/* content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 14, fontWeight: notif.read ? 600 : 800,
              color: notif.read ? ts : tp, lineHeight: 1.3,
            }}>{notif.title}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 8, flexShrink: 0 }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ fontSize: 13, color: ts, lineHeight: 1.55, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
            {notif.body}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: inact, fontWeight: 500 }}>{timeAgo(notif.created_at)}</span>
            {notif.screen && (
              <span style={{ fontSize: 11, fontWeight: 700, color: pri, cursor: 'pointer' }}>View →</span>
            )}
            {!notif.read && (
              <span style={{ fontSize: 11, fontWeight: 700, color: pri }}>● New</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ minHeight: '100vh', background: bg, fontFamily: '"Plus Jakarta Sans", sans-serif', color: tp }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ background: card, borderBottom: `1px solid ${bord}`, padding: '32px 0 0' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>

            {/* breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: ts }}>
              <button
                onClick={() => router.push('/(tabs)' as any)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13 }}
              >
                Home
              </button>
              <span style={{ color: inact }}>›</span>
              <span style={{ color: tp, fontWeight: 600 }}>Notifications</span>
            </div>

            {/* title row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: pri, textTransform: 'uppercase', marginBottom: 6 }}>INBOX</p>
                <h1 style={{ fontFamily: '"Fraunces", serif', fontSize: 36, fontWeight: 900, color: tp, letterSpacing: -0.8, lineHeight: 1.1 }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{
                      marginLeft: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: pri, color: '#fff', borderRadius: 12, minWidth: 28, height: 28,
                      fontSize: 13, fontWeight: 900, padding: '0 6px', verticalAlign: 'middle',
                      boxShadow: `0 4px 12px ${pri}44`,
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </h1>
              </div>
              <button
                className="mark-all-btn"
                onClick={() => user?.id && markAllRead(user.id)}
                disabled={unreadCount === 0 || markingAll}
              >
                {markingAll ? <div className="spinner" /> : <span>✓✓</span>}
                Mark all read
              </button>
            </div>

            {/* unread banner */}
            {unreadCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                background: isDark ? '#2D1820' : '#FFF5F6', borderRadius: '12px 12px 0 0',
                border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, borderBottom: 'none',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: pri, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: pri }}>
                  {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => user?.id && markAllRead(user.id)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: pri, fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                >
                  Mark all read →
                </button>
              </div>
            )}

            {/* filter tabs */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {FILTER_TABS.map(tab => {
                const count = tab.key === 'all'
                  ? notifications.length
                  : notifications.filter(n => n.type === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    className={`filter-tab${activeFilter === tab.key ? ' active' : ''}`}
                    onClick={() => setActiveFilter(tab.key)}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: activeFilter === tab.key ? pri : inact }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 80px' }}>

          {/* loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              <p style={{ color: ts, fontSize: 14 }}>Loading notifications…</p>
            </div>
          )}

          {/* not signed in */}
          {!loading && !user && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, textAlign: 'center', gap: 16 }}>
              <div style={{ width: 88, height: 88, borderRadius: 26, background: isDark ? '#2D1820' : '#FFF0F2', border: `1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 8 }}>
                🔒
              </div>
              <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 24, fontWeight: 900, color: tp, letterSpacing: -0.4 }}>Sign in to see notifications</h2>
              <p style={{ fontSize: 14, color: ts, maxWidth: 320, lineHeight: 1.65 }}>Your notifications will appear here once you're signed in to your MoodMarket account.</p>
              <button
                onClick={() => router.push('/login' as any)}
                style={{ background: pri, border: 'none', borderRadius: 14, padding: '13px 32px', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', boxShadow: `0 6px 20px ${pri}44`, marginTop: 8 }}
              >
                Sign In →
              </button>
            </div>
          )}

          {/* empty state */}
          {!loading && user && filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, textAlign: 'center', gap: 12 }}>
              <div style={{ width: 88, height: 88, borderRadius: 26, background: isDark ? '#2D1820' : '#FFF0F2', border: `1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 8 }}>
                🔔
              </div>
              <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: 24, fontWeight: 900, color: tp, letterSpacing: -0.4 }}>
                {activeFilter === 'all' ? 'All caught up!' : `No ${activeFilter} notifications`}
              </h2>
              <p style={{ fontSize: 14, color: ts, maxWidth: 340, lineHeight: 1.65 }}>
                {activeFilter === 'all'
                  ? "You have no notifications yet. We'll let you know when something happens."
                  : `You have no ${activeFilter} notifications. Try a different filter.`}
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  style={{ background: 'none', border: `1.5px solid ${bord}`, borderRadius: 20, padding: '8px 20px', color: tp, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', marginTop: 8 }}
                >
                  View all notifications
                </button>
              )}
            </div>
          )}

          {/* notification list */}
          {!loading && user && filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* TODAY */}
              {filteredToday.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, color: inact, textTransform: 'uppercase' }}>Today</span>
                    <div style={{ flex: 1, height: 1, background: bord }} />
                    <span style={{ fontSize: 11, color: inact }}>{filteredToday.length} notification{filteredToday.length > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredToday.map((n, i) => renderCard(n, i))}
                  </div>
                </div>
              )}

              {/* EARLIER */}
              {filteredEarlier.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, color: inact, textTransform: 'uppercase' }}>Earlier</span>
                    <div style={{ flex: 1, height: 1, background: bord }} />
                    <span style={{ fontSize: 11, color: inact }}>{filteredEarlier.length} notification{filteredEarlier.length > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredEarlier.map((n, i) => renderCard(n, filteredToday.length + i))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
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
  list:          { padding: 16 },
  groupLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10, marginTop: 4 },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  loadingTxt:    { fontSize: 14, marginTop: 12 },
  emptyIcon:     { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  emptyTitle:    { fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.4 },
  emptySub:      { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});