/**
 * app/vendor/index.tsx — Vendor Dashboard (web + mobile)
 * Real-time via Supabase Realtime channels.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getVendorStats, getVendorOrders } from '@/services/vendorService';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import type { VendorStats, VendorOrder } from '@/services/vendorService';

const PRIMARY = '#FF7A8A';

function statusColor(s: string) {
  switch (s) {
    case 'paid':      return '#38BDF8';
    case 'shipped':   return '#A78BFA';
    case 'delivered': return '#4ADE80';
    case 'cancelled': return '#F87171';
    default:          return '#94A3B8';
  }
}

/* ─── Shared data hook ─── */
function useVendorDashboard(vendorId: string | undefined) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats]           = useState<VendorStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<VendorOrder[]>([]);

  const load = useCallback(async () => {
    if (!vendorId) return;
    try {
      const [s, orders] = await Promise.all([
        getVendorStats(vendorId),
        getVendorOrders(vendorId, { limit: 5 }),
      ]);
      setStats(s);
      setRecentOrders(orders);
    } finally { setLoading(false); setRefreshing(false); }
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  // Real-time: orders
  useRealtimeChannel({
    channelName: `vendor-dashboard-orders-${vendorId}`,
    table: 'orders',
    filter: vendorId ? `vendor_id=eq.${vendorId}` : undefined,
    onEvent: () => load(),
    enabled: !!vendorId,
  });

  // Real-time: products (stock changes etc.)
  useRealtimeChannel({
    channelName: `vendor-dashboard-products-${vendorId}`,
    table: 'products',
    filter: vendorId ? `vendor_id=eq.${vendorId}` : undefined,
    onEvent: () => load(),
    enabled: !!vendorId,
  });

  return { loading, refreshing, setRefreshing, stats, recentOrders, reload: load };
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */
function VendorDashboardWeb() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { loading, stats, recentOrders, reload } = useVendorDashboard(profile?.id);
  const [navOpen, setNavOpen] = useState(true);

  const bg     = '#0B0F1A';
  const sidebar = '#111827';
  const card   = '#1A2236';
  const border = '#1F2D42';
  const text   = '#F1F5F9';
  const sub    = '#64748B';

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
    @keyframes vd-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes vd-spin { to { transform: rotate(360deg); } }
    .vd-nav { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; border: none; background: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #64748B; transition: all .15s; width: 100%; }
    .vd-nav:hover { background: rgba(255,255,255,.06); color: #94A3B8; }
    .vd-nav.active { background: ${PRIMARY}18; color: ${PRIMARY}; font-weight: 800; }
    .vd-card { border-radius: 16px; padding: 20px; border: 1px solid ${border}; animation: vd-in .3s ease both; transition: transform .2s; }
    .vd-card:hover { transform: translateY(-2px); }
    .vd-tr { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${border}; align-items: center; cursor: pointer; transition: background .1s; }
    .vd-tr:hover { background: rgba(255,255,255,.03); }
    .vd-tr:last-child { border-bottom: none; }
    @media (max-width: 900px) { .vd-stat-grid { grid-template-columns: repeat(2,1fr) !important; } }
  `;

  const NAV = [
    { icon: '🏠', label: 'Dashboard', path: '/vendor',              active: true },
    { icon: '📦', label: 'Products',  path: '/vendor/products',     active: false },
    { icon: '🛒', label: 'Orders',    path: '/vendor/orders',       active: false },
    { icon: '💸', label: 'Earnings',  path: '/vendor/earnings',     active: false },
    { icon: '🔔', label: 'Alerts',    path: '/vendor/notifications', active: false },
  ];

  const STATS = stats ? [
    { icon: '📦', label: 'Products',      value: String(stats.totalProducts),          color: '#38BDF8', bg: '#38BDF818', delay: '0ms'   },
    { icon: '🛒', label: 'Total Orders',  value: String(stats.totalOrders),            color: '#4ADE80', bg: '#4ADE8018', delay: '60ms'  },
    { icon: '💰', label: 'Month Revenue', value: `GH₵${stats.monthRevenue.toFixed(0)}`, color: PRIMARY,   bg: `${PRIMARY}18`, delay: '120ms' },
    { icon: '⏳', label: 'Pending',       value: String(stats.pendingOrders),          color: '#F59E0B', bg: '#F59E0B18', delay: '180ms' },
  ] : [];

  if (loading) return (
    <div style={{ height: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 38, height: 38, border: `3px solid ${border}`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'vd-spin .8s linear infinite' }} />
      <p style={{ color: sub, fontSize: 13, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Loading dashboard…</p>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: 'flex', height: '100vh', background: bg, overflow: 'hidden', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>

        {/* SIDEBAR */}
        <aside style={{ width: navOpen ? 220 : 68, background: sidebar, borderRight: `1px solid #1F2D42`, display: 'flex', flexDirection: 'column', transition: 'width .25s ease', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 14px', borderBottom: '1px solid #1F2D42', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, boxShadow: `0 4px 14px ${PRIMARY}44` }}>🏪</div>
            {navOpen && <div style={{ fontFamily: '"Fraunces", serif', fontSize: 15, fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.store_name ?? 'My Store'}</div>}
          </div>
          <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => (
              <button key={item.path} className={`vd-nav${item.active ? ' active' : ''}`} onClick={() => router.push(item.path as any)} title={!navOpen ? item.label : undefined}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
                {navOpen && item.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: '1px solid #1F2D42', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button className="vd-nav" onClick={() => router.push('/(tabs)' as any)} title={!navOpen ? 'View store' : undefined}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>🛍️</span>{navOpen && 'View Store'}
              </button>
              <button className="vd-nav" style={{ color: '#F87171' }} onClick={async () => { await signOut(); router.replace('/(auth)/login' as any); }} title={!navOpen ? 'Sign out' : undefined}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>🚪</span>{navOpen && 'Sign Out'}
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <header style={{ height: 62, background: sidebar, borderBottom: '1px solid #1F2D42', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setNavOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: sub, padding: 4 }}>☰</button>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 20, fontWeight: 700, color: text }}>Dashboard</div>
            <div style={{ flex: 1 }} />
            {stats?.lowStockCount ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F59E0B18', border: '1px solid #F59E0B44', borderRadius: 10, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>
                ⚠️ {stats.lowStockCount} low stock
              </div>
            ) : null}
            <button onClick={reload} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔄</button>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 60px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: PRIMARY, textTransform: 'uppercase', marginBottom: 6 }}>OVERVIEW</p>
            <h1 style={{ fontFamily: '"Fraunces", serif', fontSize: 26, fontWeight: 900, color: text, marginBottom: 24 }}>
              Welcome back, {profile?.store_name ?? profile?.name ?? 'Vendor'} 👋
            </h1>

            {/* Stat cards */}
            <div className="vd-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
              {STATS.map((s, i) => (
                <div key={i} className="vd-card" style={{ background: card, animationDelay: s.delay }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 600, color: s.color, letterSpacing: -1, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: sub, letterSpacing: 0.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 18 }}>

              {/* Quick Actions */}
              <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase' }}>Quick Actions</span>
                </div>
                {[
                  { icon: '➕', label: 'Add a Product',   sub: 'Upload to your store',     path: '/vendor/products', color: '#38BDF8' },
                  { icon: '🛒', label: 'View Orders',     sub: 'Track & ship orders',       path: '/vendor/orders',   color: '#4ADE80' },
                  { icon: '💸', label: 'Request Payout',  sub: 'Withdraw your earnings',    path: '/vendor/earnings', color: PRIMARY   },
                ].map((a, i, arr) => (
                  <button key={i} onClick={() => router.push(a.path as any)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{a.icon}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: sub }}>{a.sub}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: sub, fontSize: 14 }}>›</span>
                  </button>
                ))}
              </div>

              {/* Recent Orders */}
              <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase' }}>Recent Orders</span>
                  <button onClick={() => router.push('/vendor/orders' as any)} style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>View all →</button>
                </div>
                {recentOrders.length === 0 ? (
                  <div style={{ padding: '40px 18px', textAlign: 'center', color: sub, fontSize: 13 }}>No orders yet — share your store link!</div>
                ) : recentOrders.map((order, i) => (
                  <div key={order.id} className="vd-tr" style={{ borderBottomColor: border }} onClick={() => router.push('/vendor/orders' as any)}>
                    <div>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, color: text }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: text }}>GH₵{Number(order.total_price).toFixed(0)}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: statusColor(order.status) + '18', borderRadius: 8, padding: '3px 9px', width: 'fit-content' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: statusColor(order.status), textTransform: 'capitalize' }}>{order.status}</span>
                    </div>
                    <span style={{ color: sub, fontSize: 13 }}>›</span>
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
   MOBILE VERSION
───────────────────────────────────────────────────────────────────────── */
function VendorDashboardMobile() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { loading, refreshing, setRefreshing, stats, recentOrders, reload } = useVendorDashboard(profile?.id);

  const BG_M = '#0F172A', CARD_M = '#1E293B', BORDER_M = '#334155', TEXT_M = '#F1F5F9', SUB_M = '#94A3B8';

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG_M, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={PRIMARY} size="large" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG_M }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: CARD_M, borderBottomWidth: 1, borderBottomColor: BORDER_M, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 3, color: PRIMARY, marginBottom: 2 }}>VENDOR PORTAL</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: TEXT_M, letterSpacing: -0.5 }}>Dashboard</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: BG_M, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: BORDER_M }}
          onPress={async () => { await signOut(); router.replace('/(auth)/login' as any); }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#F87171' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} tintColor={PRIMARY} />}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_M, marginBottom: 16 }}>
            👋 {profile?.store_name ?? profile?.name ?? 'Welcome back'}
          </Text>

          {/* Stats */}
          {stats && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4, marginBottom: 16 }}>
              {[
                { icon: '📦', label: 'Products',  value: stats.totalProducts,            color: '#38BDF8' },
                { icon: '🛒', label: 'Orders',    value: stats.totalOrders,              color: '#4ADE80' },
                { icon: '💰', label: 'Revenue',   value: `GH₵${stats.totalRevenue.toFixed(0)}`, color: PRIMARY },
                { icon: '⏳', label: 'Pending',   value: stats.pendingOrders,            color: '#F59E0B' },
              ].map((s, i) => (
                <View key={i} style={{ width: '50%', padding: 4 }}>
                  <View style={{ backgroundColor: CARD_M, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER_M }}>
                    <Text style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: s.color, letterSpacing: -0.5 }}>{String(s.value)}</Text>
                    <Text style={{ fontSize: 11, color: SUB_M, fontWeight: '600', marginTop: 2 }}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {stats?.lowStockCount ? (
            <View style={{ backgroundColor: '#F59E0B18', borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B44', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ flex: 1, fontSize: 13, color: '#F59E0B', fontWeight: '700' }}>{stats.lowStockCount} product{stats.lowStockCount !== 1 ? 's' : ''} running low on stock</Text>
              <TouchableOpacity onPress={() => router.push('/vendor/products' as any)}>
                <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '800' }}>Fix →</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Quick links */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: SUB_M, letterSpacing: 2, marginBottom: 10 }}>MANAGE</Text>
          {[
            { icon: '📦', label: 'Products',  sub: 'Manage your listings',    path: '/vendor/products',      color: '#38BDF8' },
            { icon: '🛒', label: 'Orders',    sub: 'Track & update orders',    path: '/vendor/orders',        color: '#4ADE80' },
            { icon: '💸', label: 'Earnings',  sub: 'Revenue & payouts',        path: '/vendor/earnings',      color: PRIMARY   },
            { icon: '🔔', label: 'Alerts',    sub: 'Notifications',            path: '/vendor/notifications', color: '#A78BFA' },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_M, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER_M, gap: 12 }}
              onPress={() => router.push(a.path as any)} activeOpacity={0.75}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_M, marginBottom: 2 }}>{a.label}</Text>
                <Text style={{ fontSize: 12, color: SUB_M }}>{a.sub}</Text>
              </View>
              <Text style={{ fontSize: 16, color: SUB_M }}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Recent orders */}
          {recentOrders.length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '800', color: SUB_M, letterSpacing: 2, marginTop: 8, marginBottom: 10 }}>RECENT ORDERS</Text>
              <View style={{ backgroundColor: CARD_M, borderRadius: 14, borderWidth: 1, borderColor: BORDER_M, overflow: 'hidden', marginBottom: 40 }}>
                {recentOrders.map((order, i) => (
                  <TouchableOpacity key={order.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < recentOrders.length - 1 ? 1 : 0, borderBottomColor: BORDER_M }}
                    onPress={() => router.push('/vendor/orders' as any)} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_M }}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={{ fontSize: 11, color: SUB_M, marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT_M }}>GH₵ {Number(order.total_price).toFixed(2)}</Text>
                      <View style={{ backgroundColor: statusColor(order.status) + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor(order.status), textTransform: 'capitalize' }}>{order.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function VendorDashboard() {
  if (Platform.OS === 'web') return <VendorDashboardWeb />;
  return <VendorDashboardMobile />;
}

const styles = StyleSheet.create({});
