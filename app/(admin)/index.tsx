/**
 * app/admin/index.tsx
 * Admin dashboard — both platforms in one file.
 *  - Mobile: original dark ScrollView layout
 *  - Web:    full Shopify-style sidebar + grid dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, RefreshControl,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  Package, ShoppingBag, Users, DollarSign,
  LogOut, ChevronRight, CheckCircle, Clock, Truck, Sun, Moon,
} from 'lucide-react-native';

const PRIMARY = '#FF7A8A';

/* ─── shared helpers ─── */

function statusColor(s: string) {
  switch (s) {
    case 'paid':      return '#38BDF8';
    case 'shipped':   return '#A78BFA';
    case 'delivered': return '#4ADE80';
    case 'cancelled': return '#F87171';
    default:          return '#94A3B8';
  }
}

function useAdminTheme(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#F1F5F9',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    border:       isDark ? '#334155' : '#E2E8F0',
    text:         isDark ? '#F1F5F9' : '#0F172A',
    subtext:      isDark ? '#94A3B8' : '#64748B',
    logoutBg:     isDark ? '#450A0A' : '#FEF2F2',
    logoutBorder: isDark ? '#7F1D1D' : '#FECACA',
  };
}

/* ─── shared data hook ─── */

function useAdminData() {
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0, totalOrders: 0, totalUsers: 0, totalRevenue: 0,
    pendingOrders: 0, paidOrders: 0, shippedOrders: 0, deliveredOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: products }, { count: orders }, { count: users },
        { data: orderData }, { data: recent },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price, status'),
        supabase.from('orders').select('id, total_price, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      const revenue   = orderData?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
      setStats({
        totalProducts: products ?? 0, totalOrders: orders ?? 0, totalUsers: users ?? 0,
        totalRevenue: revenue,
        pendingOrders:   orderData?.filter(o => o.status === 'pending').length   ?? 0,
        paidOrders:      orderData?.filter(o => o.status === 'paid').length      ?? 0,
        shippedOrders:   orderData?.filter(o => o.status === 'shipped').length   ?? 0,
        deliveredOrders: orderData?.filter(o => o.status === 'delivered').length ?? 0,
      });
      setRecentOrders(recent ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const channel = supabase.channel('admin-dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  return { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats };
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function AdminDashboardWeb() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats } = useAdminData();
  const [navOpen, setNavOpen] = useState(true);

  const bg     = isDark ? '#0B0F1A' : '#F1F5F9';
  const sidebar = isDark ? '#111827' : '#1E293B';
  const card   = isDark ? '#1A2236' : '#FFFFFF';
  const border = isDark ? '#1F2D42' : '#E2E8F0';
  const text   = isDark ? '#F1F5F9' : '#0F172A';
  const sub    = isDark ? '#64748B' : '#64748B';

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
    @keyframes ad-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ad-spin { to { transform: rotate(360deg); } }
    .ad-nav-item { display: flex; align-items: center; gap: 11px; padding: 11px 16px; border-radius: 12px; border: none; background: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600; color: #64748B; transition: all .15s ease; width: 100%; }
    .ad-nav-item:hover { background: rgba(255,255,255,.06); color: #94A3B8; }
    .ad-nav-item.active { background: ${PRIMARY}18; color: ${PRIMARY}; font-weight: 800; }
    .ad-stat-card { border-radius: 16px; padding: 20px; border-width: 1px; border-style: solid; animation: ad-in .35s ease both; }
    .ad-stat-card:hover { transform: translateY(-2px); transition: transform .2s ease; }
    .ad-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; padding: 14px 16px; border-bottom-width: 1px; border-bottom-style: solid; align-items: center; transition: background .12s; }
    .ad-table-row:hover { background: rgba(255,255,255,.03); }
    .ad-table-row:last-child { border-bottom: none; }
    .ad-btn { display: flex; align-items: center; gap: 7px; border: none; border-radius: 10px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; transition: all .15s ease; }
    .ad-btn:hover { opacity: .85; transform: translateY(-1px); }
    .ad-refresh { width: 34px; height: 34px; border-radius: 10px; border: 1px solid ${border}; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #64748B; transition: all .15s; }
    .ad-refresh:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
    @media (max-width: 900px) { .ad-stat-grid { grid-template-columns: repeat(2, 1fr) !important; } .ad-table-row { grid-template-columns: 1fr 1fr !important; } }
    @media (max-width: 600px) { .ad-stat-grid { grid-template-columns: 1fr !important; } }
  `;

  const STAT_ITEMS = [
    { icon: '📦', label: 'Products',     value: String(stats.totalProducts),           color: '#38BDF8', bg: '#38BDF818', delay: '0ms'   },
    { icon: '🛒', label: 'Total Orders', value: String(stats.totalOrders),             color: '#4ADE80', bg: '#4ADE8018', delay: '60ms'  },
    { icon: '👥', label: 'Users',        value: String(stats.totalUsers),              color: '#A78BFA', bg: '#A78BFA18', delay: '120ms' },
    { icon: '💰', label: 'Revenue',      value: `GH₵${stats.totalRevenue.toFixed(0)}`, color: PRIMARY,   bg: `${PRIMARY}18`, delay: '180ms' },
  ];

  const STATUS_ROWS = [
    { label: 'Pending',   value: stats.pendingOrders,   color: '#94A3B8', icon: '⏳' },
    { label: 'Paid',      value: stats.paidOrders,      color: '#38BDF8', icon: '✅' },
    { label: 'Shipped',   value: stats.shippedOrders,   color: '#A78BFA', icon: '🚚' },
    { label: 'Delivered', value: stats.deliveredOrders, color: '#4ADE80', icon: '🎁' },
  ];

  const MANAGE_LINKS = [
    { icon: '📦', label: 'Products', sub: 'Add, edit, delete products',   color: '#38BDF8', path: '/admin/products' },
    { icon: '🛒', label: 'Orders',   sub: 'View and update order status', color: '#4ADE80', path: '/admin/orders'   },
    { icon: '👥', label: 'Users',    sub: 'View and manage accounts',     color: '#A78BFA', path: '/admin/users'    },
  ];

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/admin/login' as any); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
      if (!profile?.is_admin) router.replace('/admin/login' as any);
    });
  }, []);

  if (loading) return (
    <div style={{ height: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${border}`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'ad-spin .8s linear infinite' }} />
      <p style={{ color: sub, fontSize: 14, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Loading dashboard…</p>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: 'flex', height: '100vh', background: bg, fontFamily: '"Plus Jakarta Sans", sans-serif', overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: navOpen ? 240 : 72, background: sidebar, borderRight: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', flexDirection: 'column', transition: 'width .25s ease', flexShrink: 0, overflow: 'hidden' }}>
          {/* logo */}
          <div style={{ padding: '20px 18px', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, boxShadow: `0 4px 14px ${PRIMARY}44` }}>🛡️</div>
            {navOpen && <div style={{ fontFamily: '"Fraunces", serif', fontSize: 16, fontWeight: 700, color: '#F1F5F9', letterSpacing: -.3, whiteSpace: 'nowrap' }}>Admin Portal</div>}
          </div>

          {/* nav */}
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
            {[
              { icon: '🏠', label: 'Dashboard', path: '/admin',          active: true  },
              { icon: '📦', label: 'Products',  path: '/admin/products', active: false },
              { icon: '🛒', label: 'Orders',    path: '/admin/orders',   active: false },
              { icon: '👥', label: 'Users',     path: '/admin/users',    active: false },
            ].map(item => (
              <button key={item.path} className={`ad-nav-item${item.active ? ' active' : ''}`} onClick={() => router.push(item.path as any)} title={!navOpen ? item.label : undefined}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {navOpen && item.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <button className="ad-nav-item" onClick={() => router.push('/(tabs)' as any)} title={!navOpen ? 'View store' : undefined}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🏪</span>
                {navOpen && 'View store'}
              </button>
              <button className="ad-nav-item" onClick={async () => { await supabase.auth.signOut(); router.replace('/admin/login' as any); }} title={!navOpen ? 'Sign out' : undefined} style={{ color: '#F87171' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
                {navOpen && 'Sign out'}
              </button>
            </div>
          </nav>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* topbar */}
          <header style={{ height: 64, background: isDark ? '#111827' : '#1E293B', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setNavOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B', padding: 4 }}>☰</button>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: -.3 }}>Dashboard</div>
            <div style={{ flex: 1 }} />
            <button className="ad-refresh" onClick={() => fetchStats()} title="Refresh">🔄</button>
            <button onClick={() => setIsDark(v => !v)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: isDark ? '#F59E0B' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace('/admin/login' as any); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#450A0A', border: '1px solid #7F1D1D', borderRadius: 10, padding: '7px 14px', color: '#F87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >🚪 Sign Out</button>
          </header>

          {/* scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 60px' }}>

            {/* eyebrow + greeting */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: PRIMARY, textTransform: 'uppercase', marginBottom: 6 }}>OVERVIEW</p>
            <h1 style={{ fontFamily: '"Fraunces", serif', fontSize: 28, fontWeight: 900, color: text, letterSpacing: -.6, marginBottom: 24 }}>Dashboard</h1>

            {/* ── STAT CARDS ── */}
            <div className="ad-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {STAT_ITEMS.map((s, i) => (
                <div key={i} className="ad-stat-card" style={{ background: card, borderColor: border, animationDelay: s.delay }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{s.icon}</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, fontWeight: 600, color: s.color, letterSpacing: -1, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: sub, letterSpacing: .3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── BOTTOM ROW: status + manage + recent ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr', gap: 20 }}>

              {/* Order Status */}
              <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase' }}>Order Status</span>
                </div>
                {STATUS_ROWS.map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < STATUS_ROWS.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: row.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{row.icon}</div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: text }}>{row.label}</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Manage */}
              <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase' }}>Manage</span>
                </div>
                {MANAGE_LINKS.map((m, i) => (
                  <button key={i} onClick={() => router.push(m.path as any)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < MANAGE_LINKS.length - 1 ? `1px solid ${border}` : 'none', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: sub }}>{m.sub}</div>
                    </div>
                    <span style={{ fontSize: 14, color: sub }}>›</span>
                  </button>
                ))}
              </div>

              {/* Recent Orders */}
              <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase' }}>Recent Orders</span>
                  <button onClick={() => router.push('/admin/orders' as any)} style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>View all →</button>
                </div>
                {recentOrders.length === 0 ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', color: sub, fontSize: 13 }}>No orders yet</div>
                ) : recentOrders.map((order, i) => (
                  <div key={order.id} className="ad-table-row" style={{ borderBottomColor: border, gridTemplateColumns: '1.5fr .8fr .8fr auto' }}
                    onClick={() => router.push('/admin/orders' as any)}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: text, fontFamily: '"JetBrains Mono", monospace' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text }}>GH₵{Number(order.total_price).toFixed(0)}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: statusColor(order.status) + '18', borderRadius: 8, padding: '4px 10px', width: 'fit-content' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: statusColor(order.status), textTransform: 'capitalize' }}>{order.status}</span>
                    </div>
                    <span style={{ fontSize: 12, color: sub }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION (original, unchanged)
───────────────────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, color, isDark }: { icon: React.ReactNode; label: string; value: string; color: string; isDark: boolean }) {
  const t = useAdminTheme(isDark);
  return (
    <View style={[sc.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[sc.iconWrap, { backgroundColor: color + '22' }]}>{icon}</View>
      <Text style={[sc.value, { color: t.text }]}>{value}</Text>
      <Text style={[sc.label, { color: t.subtext }]}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card:     { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, minWidth: '47%', margin: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  value:    { fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginBottom: 2 },
  label:    { fontSize: 12, fontWeight: '600' },
});

function NavItem({ icon, label, sub, onPress, color, isDark }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void; color: string; isDark: boolean }) {
  const t = useAdminTheme(isDark);
  return (
    <TouchableOpacity style={[ni.row, { backgroundColor: t.card, borderColor: t.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[ni.iconWrap, { backgroundColor: color + '22' }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[ni.label, { color: t.text }]}>{label}</Text>
        <Text style={[ni.sub, { color: t.subtext }]}>{sub}</Text>
      </View>
      <ChevronRight size={16} color={t.subtext} strokeWidth={2} />
    </TouchableOpacity>
  );
}
const ni = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, gap: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  label:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub:      { fontSize: 12 },
});

function AdminDashboardMobile() {
  const router = useRouter();
  const scheme = useColorScheme();
  const [isDark, setIsDark] = useState(scheme === 'dark');
  const t = useAdminTheme(isDark);
  const { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats } = useAdminData();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/admin/login' as any); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
      if (!profile?.is_admin) router.replace('/admin/login' as any);
    });
  }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[ms.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <View>
          <Text style={[ms.headerEye, { color: PRIMARY }]}>ADMIN PORTAL</Text>
          <Text style={[ms.headerTitle, { color: t.text }]}>Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[ms.themeBtn, { backgroundColor: t.bg, borderColor: t.border }]} onPress={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={16} color="#F59E0B" strokeWidth={2} /> : <Moon size={16} color="#64748B" strokeWidth={2} />}
          </TouchableOpacity>
          <TouchableOpacity style={[ms.logoutBtn, { backgroundColor: t.logoutBg, borderColor: t.logoutBorder }]} onPress={async () => { await supabase.auth.signOut(); router.replace('/admin/login' as any); }} activeOpacity={0.75}>
            <LogOut size={16} color="#F87171" strokeWidth={2} />
            <Text style={ms.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ms.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={PRIMARY} />}>
        <Text style={[ms.sectionLabel, { color: t.subtext }]}>OVERVIEW</Text>
        <View style={ms.statsGrid}>
          <StatCard icon={<Package     size={20} color="#38BDF8" />} label="Products" value={String(stats.totalProducts)}           color="#38BDF8" isDark={isDark} />
          <StatCard icon={<ShoppingBag size={20} color="#4ADE80" />} label="Orders"   value={String(stats.totalOrders)}             color="#4ADE80" isDark={isDark} />
          <StatCard icon={<Users       size={20} color="#A78BFA" />} label="Users"    value={String(stats.totalUsers)}              color="#A78BFA" isDark={isDark} />
          <StatCard icon={<DollarSign  size={20} color={PRIMARY}  />} label="Revenue" value={`GH₵${stats.totalRevenue.toFixed(0)}`} color={PRIMARY} isDark={isDark} />
        </View>
        <Text style={[ms.sectionLabel, { color: t.subtext }]}>ORDER STATUS</Text>
        <View style={[ms.statusCard, { backgroundColor: t.card, borderColor: t.border }]}>
          {[
            { label: 'Pending', value: stats.pendingOrders, color: '#94A3B8', Icon: Clock },
            { label: 'Paid', value: stats.paidOrders, color: '#38BDF8', Icon: CheckCircle },
            { label: 'Shipped', value: stats.shippedOrders, color: '#A78BFA', Icon: Truck },
            { label: 'Delivered', value: stats.deliveredOrders, color: '#4ADE80', Icon: CheckCircle },
          ].map((item, i) => (
            <View key={i} style={[ms.statusRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
              <View style={[ms.statusDot, { backgroundColor: item.color + '33' }]}><item.Icon size={14} color={item.color} strokeWidth={2} /></View>
              <Text style={[ms.statusLabel, { color: t.text }]}>{item.label}</Text>
              <Text style={[ms.statusValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>
        <Text style={[ms.sectionLabel, { color: t.subtext }]}>MANAGE</Text>
        <NavItem icon={<Package     size={20} color="#38BDF8" />} label="Products" sub="Add, edit and delete products"  color="#38BDF8" isDark={isDark} onPress={() => router.push('/admin/products' as any)} />
        <NavItem icon={<ShoppingBag size={20} color="#4ADE80" />} label="Orders"   sub="View and update order status"  color="#4ADE80" isDark={isDark} onPress={() => router.push('/admin/orders'   as any)} />
        <NavItem icon={<Users       size={20} color="#A78BFA" />} label="Users"    sub="View and manage user accounts" color="#A78BFA" isDark={isDark} onPress={() => router.push('/admin/users'    as any)} />
        <Text style={[ms.sectionLabel, { color: t.subtext }]}>RECENT ORDERS</Text>
        <View style={[ms.recentCard, { backgroundColor: t.card, borderColor: t.border }]}>
          {recentOrders.length === 0 ? (
            <Text style={{ color: t.subtext, textAlign: 'center', padding: 16 }}>No orders yet</Text>
          ) : recentOrders.map((order, i) => (
            <TouchableOpacity key={order.id} style={[ms.recentRow, i < recentOrders.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]} onPress={() => router.push('/admin/orders' as any)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[ms.recentId, { color: t.text }]}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={[ms.recentDate, { color: t.subtext }]}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[ms.recentPrice, { color: t.text }]}>GH₵ {Number(order.total_price).toFixed(2)}</Text>
                <View style={[ms.recentBadge, { backgroundColor: statusColor(order.status) + '22' }]}>
                  <Text style={[ms.recentBadgeTxt, { color: statusColor(order.status) }]}>{order.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

export default function AdminDashboard() {
  if (Platform.OS === 'web') return <AdminDashboardWeb />;
  return <AdminDashboardMobile />;
}

const ms = StyleSheet.create({
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 18, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 1 },
  headerEye:     { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle:   { fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  themeBtn:      { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  logoutTxt:     { fontSize: 12, fontWeight: '700', color: '#F87171' },
  scroll:        { padding: 16 },
  sectionLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', margin: -4, marginBottom: 8 },
  statusCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  statusRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  statusDot:     { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statusLabel:   { flex: 1, fontSize: 14, fontWeight: '600' },
  statusValue:   { fontSize: 20, fontWeight: '900' },
  recentCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  recentRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  recentId:      { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  recentDate:    { fontSize: 11 },
  recentPrice:   { fontSize: 14, fontWeight: '800' },
  recentBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  recentBadgeTxt:{ fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});