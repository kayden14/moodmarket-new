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
  { key: 'all',    label: 'All',    emoji: '🔔' },
  { key: 'mood',   label: 'Mood',   emoji: '✨' },
  { key: 'order',  label: 'Orders', emoji: '📦' },
  { key: 'deal',   label: 'Deals',  emoji: '❤️' },
  { key: 'system', label: 'System', emoji: '⚡' },
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

  const bg   = theme.background;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const pri  = theme.primary;
  const bord = theme.border;
  const card = theme.card;
  const inact = theme.inactive;

  const filtered = notifications.filter(n => activeTab === 'all' || n.type === activeTab);
  const filteredToday   = filtered.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString());
  const filteredEarlier = filtered.filter(n => new Date(n.created_at).toDateString() !== new Date().toDateString());

  const typeConfig: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
    mood:   { emoji: '✨', label: 'Mood',   color: '#FF7A8A', bg: isDark ? 'rgba(255,122,138,0.12)' : 'rgba(255,122,138,0.08)' },
    order:  { emoji: '📦', label: 'Order',  color: '#38BDF8', bg: isDark ? 'rgba(56,189,248,0.12)'  : 'rgba(56,189,248,0.08)'  },
    deal:   { emoji: '❤️', label: 'Deal',   color: '#F472B6', bg: isDark ? 'rgba(244,114,182,0.12)' : 'rgba(244,114,182,0.08)' },
    system: { emoji: '⚡', label: 'System', color: '#A78BFA', bg: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.08)' },
  };

  const renderCard = (notif: AppNotification, index: number) => {
    const cfg = typeConfig[notif.type] ?? { emoji: '🔔', label: 'Info', color: inact, bg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' };
    return (
      <div
        key={notif.id}
        className={`notif-card${notif.read ? '' : ' notif-unread'}`}
        onClick={() => handleTap(notif, (p) => (window.location.href = p))}
        style={{ animationDelay: `${index * 0.04}s` }}
      >
        {/* Unread left accent */}
        {!notif.read && <div className="notif-accent" style={{ background: cfg.color }} />}

        {/* Icon */}
        <div className="notif-icon" style={{ background: cfg.bg }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>{cfg.emoji}</span>
        </div>

        {/* Content */}
        <div className="notif-body">
          <div className="notif-top">
            <div className="notif-meta">
              <span className="notif-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              <span className="notif-time">{timeAgo(notif.created_at)}</span>
            </div>
            {!notif.read && <div className="notif-dot" style={{ background: cfg.color }} />}
          </div>
          <p className="notif-title">{notif.title}</p>
          <p className="notif-text">{notif.body}</p>
        </div>
      </div>
    );
  };

  const css = `
    @keyframes notif-in   { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes notif-spin { to { transform:rotate(360deg); } }
    @keyframes pulse-dot  { 0%,100%{opacity:1} 50%{opacity:.4} }

    .notif-page { max-width: 760px; margin: 0 auto; font-family: "Plus Jakarta Sans", sans-serif; }

    /* ── Header ── */
    .notif-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 32px; gap: 16px; flex-wrap: wrap;
    }
    .notif-header-left h1 {
      font-family: "Playfair Display", serif;
      font-size: 36px; font-weight: 900; color: ${tp};
      letter-spacing: -1px; margin: 0 0 6px;
    }
    .notif-header-left p { font-size: 14px; color: ${ts}; margin: 0; }
    .notif-count-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: ${pri}18; color: ${pri};
      font-size: 12px; font-weight: 800;
      padding: 4px 10px; border-radius: 20px;
      border: 1px solid ${pri}30; margin-top: 8px;
    }
    .notif-count-dot { width: 7px; height: 7px; border-radius: 50%; background: ${pri}; animation: pulse-dot 1.5s infinite; }

    .notif-mark-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px; border-radius: 12px;
      background: ${card}; border: 1px solid ${bord};
      color: ${ts}; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
      font-family: "Plus Jakarta Sans", sans-serif;
    }
    .notif-mark-btn:hover { border-color: ${pri}; color: ${pri}; background: ${pri}10; }
    .notif-mark-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Filter Tabs ── */
    .notif-tabs {
      display: flex; gap: 8px; overflow-x: auto;
      padding-bottom: 2px; margin-bottom: 28px;
      scrollbar-width: none;
    }
    .notif-tabs::-webkit-scrollbar { display: none; }
    .notif-tab {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px;
      border: 1.5px solid ${bord}; background: transparent;
      color: ${ts}; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
      font-family: "Plus Jakarta Sans", sans-serif;
    }
    .notif-tab:hover { border-color: ${pri}40; color: ${tp}; }
    .notif-tab.active {
      background: ${pri}15; border-color: ${pri}60; color: ${pri};
    }

    /* ── Section Label ── */
    .notif-section-label {
      font-size: 10px; font-weight: 800; letter-spacing: 2.5px;
      text-transform: uppercase; color: ${inact};
      margin: 0 0 14px; display: flex; align-items: center; gap: 10px;
    }
    .notif-section-label::after {
      content: ''; flex: 1; height: 1px; background: ${bord};
    }

    /* ── Notification Card ── */
    .notif-card {
      display: flex; gap: 16px; padding: 18px 20px;
      border-radius: 16px; border: 1px solid ${bord};
      background: ${card}; cursor: pointer; margin-bottom: 10px;
      transition: all 0.18s; position: relative; overflow: hidden;
      animation: notif-in 0.35s ease both;
    }
    .notif-card:hover { border-color: ${pri}40; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,${isDark ? '0.3' : '0.06'}); }
    .notif-card.notif-unread { background: ${isDark ? `rgba(255,255,255,0.03)` : `rgba(0,0,0,0.015)`}; }

    .notif-accent {
      position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; border-radius: 0 3px 3px 0;
    }

    .notif-icon {
      width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }

    .notif-body { flex: 1; min-width: 0; }
    .notif-top  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .notif-meta { display: flex; align-items: center; gap: 8px; }
    .notif-badge {
      font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
      padding: 2px 8px; border-radius: 6px; text-transform: uppercase;
    }
    .notif-time { font-size: 11px; color: ${inact}; font-weight: 600; }
    .notif-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .notif-title { font-size: 15px; font-weight: 700; color: ${tp}; margin: 0 0 4px; }
    .notif-text  { font-size: 13.5px; color: ${ts}; margin: 0; line-height: 1.5; }

    /* ── States ── */
    .notif-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; gap: 16px; }
    .notif-spinner { width: 36px; height: 36px; border: 3px solid ${bord}; border-top-color: ${pri}; border-radius: 50%; animation: notif-spin 0.8s linear infinite; }

    .notif-empty { text-align: center; padding: 80px 20px; animation: notif-in 0.4s ease both; }
    .notif-empty-icon { font-size: 56px; margin-bottom: 16px; }
    .notif-empty h2 { font-family: "Playfair Display", serif; font-size: 26px; font-weight: 700; color: ${tp}; margin: 0 0 8px; }
    .notif-empty p  { font-size: 14px; color: ${ts}; margin: 0 0 24px; }

    .notif-signin-card {
      background: ${card}; border: 1px solid ${bord};
      border-radius: 24px; padding: 60px 40px; text-align: center;
      animation: notif-in 0.4s ease both;
    }
    .notif-signin-icon { font-size: 52px; margin-bottom: 20px; }
    .notif-signin-card h2 { font-family: "Playfair Display", serif; font-size: 26px; color: ${tp}; margin: 0 0 10px; }
    .notif-signin-card p  { color: ${ts}; font-size: 14px; margin: 0 0 28px; }
    .notif-signin-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 32px; border-radius: 14px;
      background: ${pri}; color: #fff; border: none;
      font-size: 14px; font-weight: 800; cursor: pointer;
      font-family: "Plus Jakarta Sans", sans-serif;
      transition: opacity 0.15s;
    }
    .notif-signin-btn:hover { opacity: 0.88; }

    @media (max-width: 600px) {
      .notif-card { padding: 14px 16px; gap: 12px; }
      .notif-header-left h1 { font-size: 28px; }
    }
  `;

  return (
    <WebShell>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="notif-page">

        {/* ── Header ── */}
        <div className="notif-header">
          <div className="notif-header-left">
            <h1>Notifications</h1>
            <p>Stay on top of your orders, moods and deals</p>
            {unreadCount > 0 && (
              <div className="notif-count-badge">
                <div className="notif-count-dot" />
                {unreadCount} unread
              </div>
            )}
          </div>
          {user && unreadCount > 0 && (
            <button
              className="notif-mark-btn"
              onClick={() => markAllRead(user.id)}
              disabled={markingAll}
            >
              {markingAll ? '⏳ Marking…' : '✓ Mark all read'}
            </button>
          )}
        </div>

        {/* ── Filter Tabs ── */}
        <div className="notif-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              className={`notif-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.emoji}</span> {tab.label}
              {tab.key === 'all' && unreadCount > 0 && (
                <span style={{ marginLeft: 4, background: pri, color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '10px', padding: '1px 6px' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="notif-loading">
            <div className="notif-spinner" />
            <span style={{ fontSize: '13px', color: ts }}>Loading notifications…</span>
          </div>
        ) : !user ? (
          <div className="notif-signin-card">
            <div className="notif-signin-icon">🔔</div>
            <h2>Sign in to see notifications</h2>
            <p>Get updates on your orders, mood picks and exclusive deals.</p>
            <button className="notif-signin-btn" onClick={() => (window.location.href = '/login')}>
              Sign In →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">✨</div>
            <h2>All caught up!</h2>
            <p>No {activeTab === 'all' ? '' : activeTab + ' '}notifications yet. Check back later.</p>
          </div>
        ) : (
          <div>
            {filteredToday.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <p className="notif-section-label">Today</p>
                {filteredToday.map((n, i) => renderCard(n, i))}
              </div>
            )}
            {filteredEarlier.length > 0 && (
              <div>
                <p className="notif-section-label">Earlier</p>
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