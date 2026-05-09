/**
 * app/(tabs)/profile.tsx — fully themed for light & dark mode
 * Hidden admin access: tap the invisible area at the very bottom 3 times
 */

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Order } from '@/types/database';
import {
  User, LogOut, Package, Calendar, ChevronRight,
  ShoppingBag, Clock, CheckCircle, Truck, XCircle,
  ArrowRight, Settings, Bell, Shield, Edit3,
} from 'lucide-react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusConfig(status: string, isDark: boolean) {
  switch (status) {
    case 'paid':      return { label: 'Paid',      color: '#0A7EA4', bg: isDark ? '#0D1F2D' : '#E8F4F8', Icon: CheckCircle };
    case 'shipped':   return { label: 'Shipped',   color: '#7C5CBF', bg: isDark ? '#1E1428' : '#F0EBF8', Icon: Truck       };
    case 'delivered': return { label: 'Delivered', color: '#22C55E', bg: isDark ? '#0D2B1A' : '#EDFBF1', Icon: CheckCircle };
    case 'cancelled': return { label: 'Cancelled', color: '#E53E3E', bg: isDark ? '#2D1515' : '#FFF0F0', Icon: XCircle     };
    default:          return { label: status,      color: '#888888', bg: isDark ? '#222222' : '#F5F5F5', Icon: Clock        };
  }
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const cfg        = getStatusConfig(order.status, isDark);
  const StatusIcon = cfg.Icon;

  return (
    <TouchableOpacity
      style={[oc.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => router.push({ pathname: '/order/[id]' as any, params: { id: order.id } })}
      activeOpacity={0.75}
    >
      <View style={oc.top}>
        <View style={oc.idWrap}>
          <View style={[oc.pkgIcon, { backgroundColor: theme.isDark ? '#2D1820' : '#FFF0F2', borderColor: theme.isDark ? '#3D2030' : '#FFD6DE' }]}>
            <ShoppingBag size={14} color={theme.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={[oc.idLabel, { color: theme.inactive }]}>ORDER</Text>
            <Text style={[oc.id, { color: theme.textPrimary }]}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[oc.badge, { backgroundColor: cfg.bg }]}>
            <StatusIcon size={11} color={cfg.color} strokeWidth={2.5} />
            <Text style={[oc.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <ChevronRight size={14} color={theme.inactive} strokeWidth={2} />
        </View>
      </View>
      <View style={[oc.divider, { backgroundColor: theme.border }]} />
      <View style={oc.bottom}>
        <View style={oc.meta}>
          <Calendar size={12} color={theme.inactive} strokeWidth={2} />
          <Text style={[oc.date, { color: theme.inactive }]}>
            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={[oc.dot, { color: theme.border }]}>·</Text>
          <Package size={12} color={theme.inactive} strokeWidth={2} />
          <Text style={[oc.date, { color: theme.inactive }]}>{order.products.length} items</Text>
        </View>
        <Text style={[oc.price, { color: theme.primary }]}>GH₵ {Number(order.total_price).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const oc = StyleSheet.create({
  card:     { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1,
              ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 1 } }) },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pkgIcon:  { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  idLabel:  { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  id:       { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  divider:  { height: 1, marginBottom: 12 },
  bottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  date:     { fontSize: 11, fontWeight: '500' },
  dot:      { fontSize: 11 },
  price:    { fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
});

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
      <Text style={[sp.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[sp.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  value: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { theme, isDark } = useTheme();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Hidden admin tap counter
  const [adminTaps, setAdminTaps] = useState(0);

  const handleHiddenAdminTap = () => {
    const next = adminTaps + 1;
    setAdminTaps(next);
    if (next >= 3) {
      setAdminTaps(0);
      router.push('/admin/login' as any);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) fetchOrders();
      else setLoading(false);
    }, [user])
  );

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const handleSignOut = async () => { await signOut(); router.replace('/login'); };

  const primary = theme.primary;

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 36 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[g.icon, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2', borderColor: isDark ? '#3D2030' : '#FFD6DE' }]}>
          <User size={34} color={primary} strokeWidth={1.5} />
        </View>
        <Text style={[g.title, { color: theme.textPrimary }]}>You're not signed in</Text>
        <Text style={[g.sub, { color: theme.textSecondary }]}>Log in to view your profile, orders, and mood history.</Text>
        <TouchableOpacity style={[g.btn, { backgroundColor: primary }]} onPress={() => router.push('/login')} activeOpacity={0.85}>
          <Text style={g.btnTxt}>Sign In</Text>
          <ArrowRight size={15} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  const totalSpend     = orders.reduce((sum, o) => sum + Number(o.total_price), 0);
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const initials       = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[s.headerEye, { color: primary }]}>ACCOUNT</Text>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>My Profile</Text>
        </View>
        <TouchableOpacity
          style={[s.settingsBtn, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2', borderColor: isDark ? '#3D2030' : '#FFD6DE' }]}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.75}
        >
          <Settings size={18} color={primary} strokeWidth={2} />
          <Text style={[s.settingsBtnTxt, { color: primary }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ── */}
        <View style={[s.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[s.avatar, { backgroundColor: primary }]}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <View style={s.heroInfo}>
            <Text style={[s.heroName,  { color: theme.textPrimary }]}>{profile?.name ?? 'User'}</Text>
            <Text style={[s.heroEmail, { color: theme.textSecondary }]}>{profile?.email}</Text>
            <TouchableOpacity
              style={[s.editBtn, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2', borderColor: isDark ? '#3D2030' : '#FFD6DE' }]}
              onPress={() => router.push('/edit-profile')}
              activeOpacity={0.8}
            >
              <Edit3 size={12} color={primary} strokeWidth={2.5} />
              <Text style={[s.editBtnTxt, { color: primary }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={[s.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <StatPill label="Orders"      value={String(orders.length)} />
          <View style={[s.statDivider, { backgroundColor: theme.border }]} />
          <StatPill label="Delivered"   value={String(deliveredCount)} />
          <View style={[s.statDivider, { backgroundColor: theme.border }]} />
          <StatPill label="Total Spent" value={`GH₵${totalSpend.toFixed(0)}`} />
        </View>

        {/* ── Settings quick access ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Settings</Text>
          </View>
          {[
            { Icon: Edit3,    label: 'Edit Profile',       sub: 'Update your name and phone number'  },
            { Icon: Bell,     label: 'Notifications',      sub: 'Manage push and email alerts'       },
            { Icon: Shield,   label: 'Privacy & Security', sub: 'Password and account security'      },
            { Icon: Settings, label: 'App Preferences',    sub: 'Theme, mood reminders and more'     },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.settingsRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => router.push('/edit-profile')}
              activeOpacity={0.7}
            >
              <View style={[s.settingsRowIcon, { backgroundColor: isDark ? '#1E1E2E' : '#FFF0F2', borderColor: isDark ? '#2A2A4A' : '#FFD6DE' }]}>
                <item.Icon size={16} color={primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingsRowLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                <Text style={[s.settingsRowSub,   { color: theme.textSecondary }]}>{item.sub}</Text>
              </View>
              <ChevronRight size={15} color={theme.inactive} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Mood history ── */}
        {profile?.mood_history && profile.mood_history.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Mood History</Text>
              <Text style={[s.sectionCount, { color: theme.inactive }]}>{profile.mood_history.length} entries</Text>
            </View>
            {profile.mood_history.slice(0, 5).map((item: any, i: number) => (
              <View key={i} style={[s.moodRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={s.moodLeft}>
                  <Text style={s.moodEmoji}>{item.mood}</Text>
                  <Text style={[s.moodDate, { color: theme.textSecondary }]}>{item.date}</Text>
                </View>
                <ChevronRight size={14} color={theme.inactive} strokeWidth={2} />
              </View>
            ))}
          </View>
        )}

        {/* ── Orders ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Order History</Text>
            <Text style={[s.sectionCount, { color: theme.inactive }]}>{orders.length} orders</Text>
          </View>
          {orders.length === 0 ? (
            <View style={[s.emptyOrders, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[s.emptyIcon, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2', borderColor: isDark ? '#3D2030' : '#FFD6DE' }]}>
                <Package size={28} color={primary} strokeWidth={1.5} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No orders yet</Text>
              <Text style={[s.emptySub,   { color: theme.textSecondary }]}>Start shopping to see your orders here.</Text>
              <TouchableOpacity style={[s.emptyBtn, { borderColor: primary }]} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
                <Text style={[s.emptyBtnTxt, { color: primary }]}>Browse Products</Text>
                <ArrowRight size={13} color={primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            orders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          style={[s.logoutBtn, { backgroundColor: theme.card, borderColor: isDark ? '#4D2525' : '#FFE5E5' }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <LogOut size={16} color="#E53E3E" strokeWidth={2} />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        {/* ── Hidden admin access — tap 3 times ── */}
        <TouchableOpacity
          onPress={handleHiddenAdminTap}
          activeOpacity={1}
          style={s.hiddenAdminBtn}
        >
          <Text style={s.hiddenAdminTxt}>·</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const g = StyleSheet.create({
  icon:   { width: 90, height: 90, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  title:  { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
  sub:    { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  btn:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const s = StyleSheet.create({
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 18, paddingHorizontal: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerEye:     { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle:   { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  settingsBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  settingsBtnTxt:{ fontSize: 12, fontWeight: '700' },
  scroll:        { padding: 16 },
  hero:          { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, marginBottom: 10, borderWidth: 1, gap: 16,
                   ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 1 } }) },
  avatar:        { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:     { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroInfo:      { flex: 1 },
  heroName:      { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 3 },
  heroEmail:     { fontSize: 13 },
  editBtn:       { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  editBtnTxt:    { fontSize: 12, fontWeight: '700' },
  statsRow:      { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 20,
                   ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 1 } }) },
  statDivider:   { width: 1, marginVertical: 12 },
  section:       { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 2 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  sectionCount:  { fontSize: 12, fontWeight: '600' },
  settingsRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  settingsRowIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  settingsRowLabel:{ fontSize: 14, fontWeight: '700' },
  settingsRowSub:  { fontSize: 12, marginTop: 1 },
  moodRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6, borderWidth: 1 },
  moodLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moodEmoji: { fontSize: 22 },
  moodDate:  { fontSize: 13, fontWeight: '500' },
  emptyOrders:{ alignItems: 'center', borderRadius: 20, paddingVertical: 36, paddingHorizontal: 24, borderWidth: 1 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5 },
  emptyBtnTxt:{ fontSize: 13, fontWeight: '700' },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 15, gap: 8, borderWidth: 1, marginBottom: 8 },
  logoutTxt:  { fontSize: 15, fontWeight: '700', color: '#E53E3E' },
  hiddenAdminBtn: { alignItems: 'center', paddingVertical: 12 },
  hiddenAdminTxt: { fontSize: 8, color: 'transparent' },
});