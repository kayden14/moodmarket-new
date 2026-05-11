/**
 * app/admin/orders.tsx
 * Admin orders — both platforms in one file.
 *  - Mobile: original FlatList + Modal layout
 *  - Web:    full-page table with slide-in detail panel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, Modal,
  ScrollView, Alert, useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  ArrowLeft, Package, CheckCircle, Truck,
  Clock, XCircle, X, MapPin, Phone, Sun, Moon, RefreshCw,
} from 'lucide-react-native';

const PRIMARY  = '#FF7A8A';
const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const POLL_MS  = 10_000;

function useAdminTheme(isDark: boolean) {
  return {
    bg:      isDark ? '#0F172A' : '#F1F5F9',
    card:    isDark ? '#1E293B' : '#FFFFFF',
    border:  isDark ? '#334155' : '#E2E8F0',
    text:    isDark ? '#F1F5F9' : '#0F172A',
    subtext: isDark ? '#94A3B8' : '#64748B',
  };
}

function statusColor(s: string) {
  switch (s) {
    case 'paid':      return '#38BDF8';
    case 'shipped':   return '#A78BFA';
    case 'delivered': return '#4ADE80';
    case 'cancelled': return '#F87171';
    default:          return '#94A3B8';
  }
}

function statusEmoji(s: string) {
  switch (s) {
    case 'paid':      return '✅';
    case 'shipped':   return '🚚';
    case 'delivered': return '🎁';
    case 'cancelled': return '❌';
    default:          return '⏳';
  }
}

function StatusIcon({ status, size = 13 }: { status: string; size?: number }) {
  const color = statusColor(status);
  switch (status) {
    case 'paid':      return <CheckCircle size={size} color={color} strokeWidth={2} />;
    case 'shipped':   return <Truck       size={size} color={color} strokeWidth={2} />;
    case 'delivered': return <CheckCircle size={size} color={color} strokeWidth={2} />;
    case 'cancelled': return <XCircle     size={size} color={color} strokeWidth={2} />;
    default:          return <Clock       size={size} color={color} strokeWidth={2} />;
  }
}

/* ─── shared data hook ─── */
function useOrdersData() {
  const [orders,      setOrders]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [realtimeOk,  setRealtimeOk]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const selectedRef = useRef<any>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles!vendor_id(name, store_name)')
      .order('created_at', { ascending: false });
    if (error) console.error('[Admin Orders]', error.message);
    else if (data) {
      const mapped = data.map((o: any) => ({
        ...o,
        vendor_name: o.profiles?.store_name || o.profiles?.name || null,
      }));
      setOrders(mapped);
      if (selectedRef.current) {
        const fresh = mapped.find((o: any) => o.id === selectedRef.current.id);
        if (fresh) selectedRef.current = fresh;
      }
    }
    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const t = setInterval(() => fetchOrders(true), POLL_MS);
    return () => clearInterval(t);
  }, [fetchOrders]);

  useEffect(() => {
    const ch = supabase.channel('admin-orders-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders(true))
      .subscribe((s) => setRealtimeOk(s === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [fetchOrders]);

  return { orders, loading, realtimeOk, lastUpdated, fetchOrders, selectedRef };
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function AdminOrdersWeb() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const { orders, loading, realtimeOk, lastUpdated, fetchOrders, selectedRef } = useOrdersData();
  const [selected,     setSelected]     = useState<any | null>(null);
  const [updating,     setUpdating]     = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search,       setSearch]       = useState('');

  const bg     = isDark ? '#0B0F1A' : '#F1F5F9';
  const sidebar = isDark ? '#111827' : '#1E293B';
  const card   = isDark ? '#1A2236' : '#FFFFFF';
  const border = isDark ? '#1F2D42' : '#E2E8F0';
  const text   = isDark ? '#F1F5F9' : '#0F172A';
  const sub    = '#64748B';

  const openOrder = (o: any) => { setSelected(o); selectedRef.current = o; };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      await fetchOrders(true);
      setSelected((prev: any) => prev?.id === orderId ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      alert(err.message);
    } finally { setUpdating(false); }
  };

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchSearch = !search.trim() || o.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; height: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
    @keyframes ao-spin { to { transform: rotate(360deg); } }
    @keyframes ao-slidein { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    .ao-nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 14px; border-radius: 12px; border: none; background: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #64748B; transition: all .15s; width: 100%; }
    .ao-nav-item:hover { background: rgba(255,255,255,.06); color: #94A3B8; }
    .ao-nav-item.active { background: ${PRIMARY}18; color: ${PRIMARY}; font-weight: 800; }

    .ao-filter-tab { padding: 7px 14px; border-radius: 8px; border: 1px solid ${border}; background: none; cursor: pointer; font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; color: ${sub}; transition: all .15s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .ao-filter-tab:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
    .ao-filter-tab.active { background: ${PRIMARY}18; border-color: ${PRIMARY}; color: ${PRIMARY}; font-weight: 800; }

    .ao-tr { display: grid; grid-template-columns: 2fr 1.2fr 1fr 1.2fr 100px; gap: 12px; padding: 14px 18px; border-bottom: 1px solid ${border}; align-items: center; cursor: pointer; transition: background .12s; }
    .ao-tr:hover { background: rgba(255,255,255,.03); }
    .ao-tr:last-child { border-bottom: none; }

    .ao-detail-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; background: ${card}; border-left: 1px solid ${border}; z-index: 300; overflow-y: auto; animation: ao-slidein .28s cubic-bezier(.4,0,.2,1) both; box-shadow: -8px 0 40px rgba(0,0,0,.35); }
    .ao-backdrop { position: fixed; inset: 0; z-index: 299; background: rgba(0,0,0,.45); backdrop-filter: blur(3px); }

    .ao-status-btn { display: flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 9px; border-width: 1px; border-style: solid; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700; transition: all .15s; }
    .ao-status-btn:hover:not(.active):not(:disabled) { opacity: .8; transform: translateY(-1px); }
    .ao-status-btn:disabled { opacity: .5; cursor: not-allowed; }

    .ao-btn { display: flex; align-items: center; gap: 6px; border: none; border-radius: 9px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 12px; transition: all .15s; }
    .ao-btn:hover { opacity: .85; transform: translateY(-1px); }

    @media (max-width: 900px) { .ao-tr { grid-template-columns: 1fr 1fr 1fr !important; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: 'flex', height: '100vh', background: bg, fontFamily: '"Plus Jakarta Sans", sans-serif', overflow: 'hidden' }}>

        {/* SIDEBAR */}
        <aside style={{ width: 200, background: sidebar, borderRight: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 14px', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: `0 4px 12px ${PRIMARY}44` }}>🛡️</div>
            <span style={{ fontFamily: '"Fraunces", serif', fontSize: 15, fontWeight: 700, color: '#F1F5F9', letterSpacing: -.2 }}>Admin Portal</span>
          </div>
          <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: '🏠', label: 'Dashboard', path: '/admin'          },
              { icon: '📦', label: 'Products',  path: '/admin/products' },
              { icon: '🛒', label: 'Orders',    path: '/admin/orders',  active: true },
              { icon: '🏪', label: 'Vendors',   path: '/admin/vendors'  },
              { icon: '👥', label: 'Users',     path: '/admin/users'   },
            ].map(item => (
              <button key={item.path} className={`ao-nav-item${(item as any).active ? ' active' : ''}`} onClick={() => router.push(item.path as any)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, paddingTop: 8 }}>
              <button className="ao-nav-item" onClick={() => router.push('/(tabs)' as any)}><span style={{ fontSize: 16 }}>🏪</span>View store</button>
              <button className="ao-nav-item" style={{ color: '#F87171' }} onClick={async () => { await supabase.auth.signOut(); router.replace('/admin/login' as any); }}><span style={{ fontSize: 16 }}>🚪</span>Sign out</button>
            </div>
          </nav>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* topbar */}
          <header style={{ height: 60, background: isDark ? '#111827' : '#1E293B', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
            <button onClick={() => router.push('/admin' as any)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18, padding: 4 }}>←</button>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 19, fontWeight: 700, color: '#F1F5F9' }}>Orders</div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: realtimeOk ? '#4ADE80' : '#F59E0B', fontWeight: 700 }}>{realtimeOk ? '🟢 Live' : '🟡 Polling'}</span>
            <span style={{ fontSize: 11, color: sub }}>Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => fetchOrders()} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', color: PRIMARY, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
            <button onClick={() => setIsDark(v => !v)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>{isDark ? '☀️' : '🌙'}</button>
          </header>

          {/* filter row */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, background: card, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            <button className={`ao-filter-tab${filterStatus === 'all' ? ' active' : ''}`} onClick={() => setFilterStatus('all')}>All <span style={{ opacity: .6 }}>{orders.length}</span></button>
            {STATUSES.map(s => (
              <button key={s} className={`ao-filter-tab${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
                {statusEmoji(s)} {s.charAt(0).toUpperCase() + s.slice(1)} <span style={{ opacity: .6 }}>{countByStatus(s)}</span>
              </button>
            ))}
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <input
                type="text" placeholder="Search order ID…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: isDark ? '#0B0F1A' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', width: 200 }}
              />
            </div>
          </div>

          {/* table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${border}`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'ao-spin .8s linear infinite' }} />
              </div>
            ) : (
              <>
                {/* table head */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1.2fr 100px', gap: 12, padding: '10px 18px', background: isDark ? '#111827' : '#1E293B', borderBottom: `1px solid ${border}` }}>
                  {['Order ID', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: sub, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                    <span style={{ fontSize: 48 }}>📦</span>
                    <p style={{ color: sub, fontSize: 14 }}>No orders found</p>
                  </div>
                ) : filtered.map(order => (
                  <div key={order.id} className="ao-tr" onClick={() => openOrder(order)}>
                    <div>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: text }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                      {order.delivery_name && <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{order.delivery_name}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: sub }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: text }}>GH₵{Number(order.total_price).toFixed(2)}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: statusColor(order.status) + '18', borderRadius: 8, padding: '5px 10px', width: 'fit-content' }}>
                      <span style={{ fontSize: 12 }}>{statusEmoji(order.status)}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: statusColor(order.status), textTransform: 'capitalize' }}>{order.status}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); openOrder(order); }} style={{ background: PRIMARY + '18', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: PRIMARY, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>View →</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* DETAIL PANEL */}
        {selected && (
          <>
            <div className="ao-backdrop" onClick={() => setSelected(null)} />
            <div className="ao-detail-panel">
              {/* panel header */}
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, background: isDark ? '#111827' : '#F8FAFC', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                <div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 700, color: text }}>#{selected.id.slice(0, 8).toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: sub }}>{new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: statusColor(selected.status) + '18', borderRadius: 9, padding: '6px 12px' }}>
                  <span style={{ fontSize: 14 }}>{statusEmoji(selected.status)}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: statusColor(selected.status), textTransform: 'capitalize' }}>{selected.status}</span>
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                {/* update status */}
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 10 }}>Update Status</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {STATUSES.map(s => (
                    <button key={s} className={`ao-status-btn${selected.status === s ? ' active' : ''}`}
                      style={{ background: selected.status === s ? statusColor(s) + '22' : 'transparent', borderColor: selected.status === s ? statusColor(s) : border, color: selected.status === s ? statusColor(s) : sub, opacity: updating ? .5 : 1 }}
                      onClick={() => handleUpdateStatus(selected.id, s)}
                      disabled={updating || selected.status === s}
                    >
                      {statusEmoji(s)} {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>

                {/* order info */}
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 10 }}>Order Details</p>
                <div style={{ background: isDark ? '#111827' : '#F8FAFC', border: `1px solid ${border}`, borderRadius: 13, padding: '14px 16px', marginBottom: 20 }}>
                  {[
                    { label: 'Total',    value: `GH₵${Number(selected.total_price).toFixed(2)}`, highlight: true },
                    { label: 'Payment',  value: selected.payment_method === 'card' ? 'Bank Card' : 'Mobile Money' },
                    selected.vendor_name && { label: 'Vendor', value: `🏪 ${selected.vendor_name}` },
                    selected.payment_reference && { label: 'Reference', value: selected.payment_reference, mono: true },
                  ].filter(Boolean).map((row: any, i, arr) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: i > 0 ? '10px 0 0' : '0', marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? `1px solid ${border}` : 'none' }}>
                      <span style={{ fontSize: 12, color: sub }}>{row.label}</span>
                      <span style={{ fontSize: row.highlight ? 18 : 13, fontWeight: row.highlight ? 900 : 600, color: row.highlight ? PRIMARY : text, fontFamily: row.mono ? '"JetBrains Mono", monospace' : 'inherit' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* items */}
                {(selected.products ?? []).length > 0 && (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 10 }}>Items Ordered</p>
                    <div style={{ background: isDark ? '#111827' : '#F8FAFC', border: `1px solid ${border}`, borderRadius: 13, overflow: 'hidden', marginBottom: 20 }}>
                      {(selected.products ?? []).map((item: any, i: number, arr: any[]) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none' }}>
                          <div style={{ background: PRIMARY + '18', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 800, color: PRIMARY }}>×{item.quantity}</div>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: text }}>{item.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: PRIMARY }}>GH₵{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: `1px solid ${border}`, background: isDark ? '#0B0F1A' : '#F1F5F9' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: text }}>Total</span>
                        <span style={{ fontSize: 20, fontWeight: 900, color: PRIMARY }}>GH₵{Number(selected.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* delivery */}
                {(selected.delivery_address || selected.delivery_phone) && (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 10 }}>Delivery Details</p>
                    <div style={{ background: isDark ? '#111827' : '#F8FAFC', border: `1px solid ${border}`, borderRadius: 13, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selected.delivery_address && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 16 }}>📍</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: text, lineHeight: 1.5 }}>{selected.delivery_address}</span>
                        </div>
                      )}
                      {selected.delivery_phone && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 16 }}>📱</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: text }}>{selected.delivery_phone}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION (original, unchanged)
───────────────────────────────────────────────────────────────────────── */

function AdminOrdersMobile() {
  const router  = useRouter();
  const scheme  = useColorScheme();
  const [isDark, setIsDark] = useState(scheme === 'dark');
  const t = useAdminTheme(isDark);
  const { orders, loading, realtimeOk, lastUpdated, fetchOrders, selectedRef } = useOrdersData();

  const [selected,     setSelected]     = useState<any | null>(null);
  const [updating,     setUpdating]     = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);
  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      await fetchOrders(true);
      Alert.alert('Updated ✓', `Order status changed to "${newStatus}"`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally { setUpdating(false); }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity style={[oc.card, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => setSelected(item)} activeOpacity={0.75}>
      <View style={oc.top}>
        <View style={oc.idWrap}>
          <Package size={14} color={PRIMARY} strokeWidth={2} />
          <Text style={[oc.id, { color: t.text }]}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={[oc.badge, { backgroundColor: statusColor(item.status) + '22' }]}>
          <StatusIcon status={item.status} />
          <Text style={[oc.badgeTxt, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <View style={oc.bottom}>
        <Text style={[oc.date, { color: t.subtext }]}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        <Text style={[oc.price, { color: t.text }]}>GH₵ {Number(item.total_price).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[ms.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <TouchableOpacity style={[ms.backBtn, { backgroundColor: t.bg }]} onPress={() => router.back()}>
          <ArrowLeft size={20} color={t.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={[ms.headerEye, { color: PRIMARY }]}>ADMIN</Text>
          <Text style={[ms.headerTitle, { color: t.text }]}>Orders</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[ms.iconBtn, { backgroundColor: t.bg, borderColor: t.border }]} onPress={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={15} color="#F59E0B" strokeWidth={2} /> : <Moon size={15} color="#64748B" strokeWidth={2} />}
            </TouchableOpacity>
            <TouchableOpacity style={[ms.iconBtn, { backgroundColor: t.bg, borderColor: t.border }]} onPress={() => fetchOrders()}>
              <RefreshCw size={15} color={PRIMARY} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={[ms.liveIndicator, { color: t.subtext }]}>{realtimeOk ? '🟢 Live' : '🟡 Polling'} · {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[ms.tabs, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <TouchableOpacity style={[ms.tab, { backgroundColor: filterStatus === 'all' ? PRIMARY : t.bg, borderColor: filterStatus === 'all' ? PRIMARY : t.border }]} onPress={() => setFilterStatus('all')}>
          <Text style={[ms.tabTxt, { color: filterStatus === 'all' ? '#fff' : t.subtext }]}>All ({orders.length})</Text>
        </TouchableOpacity>
        {STATUSES.map(status => {
          const active = filterStatus === status;
          return (
            <TouchableOpacity key={status} style={[ms.tab, { backgroundColor: active ? PRIMARY : t.bg, borderColor: active ? PRIMARY : t.border }]} onPress={() => setFilterStatus(status)}>
              <StatusIcon status={status} size={11} />
              <Text style={[ms.tabTxt, { color: active ? '#fff' : t.subtext }]}>{status.charAt(0).toUpperCase() + status.slice(1)} ({countByStatus(status)})</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderOrder} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Package size={40} color={t.subtext} strokeWidth={1.5} /><Text style={{ color: t.subtext, marginTop: 12, fontSize: 14 }}>No orders found</Text></View>}
        />
      )}

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={{ flex: 1, backgroundColor: t.bg }}>
            <View style={[mm.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
              <TouchableOpacity onPress={() => setSelected(null)}><X size={22} color={t.text} strokeWidth={2} /></TouchableOpacity>
              <Text style={[mm.title, { color: t.text }]}>#{selected.id.slice(0, 8).toUpperCase()}</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={mm.scroll}>
              <View style={[mm.statusBanner, { backgroundColor: statusColor(selected.status) + '18', borderColor: statusColor(selected.status) + '44' }]}>
                <StatusIcon status={selected.status} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={[mm.statusBannerLabel, { color: t.subtext }]}>CURRENT STATUS</Text>
                  <Text style={[mm.statusBannerValue, { color: statusColor(selected.status) }]}>{selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}</Text>
                </View>
              </View>
              <Text style={[mm.sectionLabel, { color: t.subtext }]}>UPDATE STATUS</Text>
              <View style={mm.statusGrid}>
                {STATUSES.map(status => {
                  const active = selected.status === status;
                  return (
                    <TouchableOpacity key={status} style={[mm.statusBtn, { backgroundColor: active ? statusColor(status) + '22' : t.card, borderColor: active ? statusColor(status) : t.border }, updating && { opacity: 0.5 }]} onPress={() => handleUpdateStatus(selected.id, status)} disabled={updating || active}>
                      <StatusIcon status={status} size={13} />
                      <Text style={[mm.statusBtnTxt, { color: active ? statusColor(status) : t.subtext }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[mm.sectionLabel, { color: t.subtext }]}>ORDER DETAILS</Text>
              <View style={[mm.card, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={mm.infoRow}><Text style={[mm.infoLabel, { color: t.subtext }]}>Date</Text><Text style={[mm.infoValue, { color: t.text }]}>{new Date(selected.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text></View>
                <View style={[mm.infoRow, { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10, marginTop: 6 }]}><Text style={[mm.infoLabel, { color: t.subtext }]}>Total</Text><Text style={[mm.infoValue, { color: PRIMARY, fontSize: 18, fontWeight: '900' }]}>GH₵ {Number(selected.total_price).toFixed(2)}</Text></View>
                {selected.vendor_name && <View style={[mm.infoRow, { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10, marginTop: 6 }]}><Text style={[mm.infoLabel, { color: t.subtext }]}>Vendor</Text><Text style={[mm.infoValue, { color: '#38BDF8' }]}>🏪 {selected.vendor_name}</Text></View>}
              </View>
              {(selected.products ?? []).length > 0 && (<>
                <Text style={[mm.sectionLabel, { color: t.subtext }]}>ITEMS ORDERED</Text>
                <View style={[mm.card, { backgroundColor: t.card, borderColor: t.border }]}>
                  {(selected.products ?? []).map((item: any, i: number) => (
                    <View key={i} style={[mm.itemRow, i < (selected.products?.length ?? 0) - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
                      <View style={[mm.qtyBadge, { backgroundColor: PRIMARY + '22' }]}><Text style={[mm.qtyTxt, { color: PRIMARY }]}>×{item.quantity}</Text></View>
                      <Text style={[mm.itemName, { color: t.text }]} numberOfLines={2}>{item.name}</Text>
                      <Text style={[mm.itemPrice, { color: PRIMARY }]}>GH₵{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[mm.totalRow, { borderTopColor: t.border }]}><Text style={[mm.totalLabel, { color: t.text }]}>Total</Text><Text style={[mm.totalValue, { color: PRIMARY }]}>GH₵ {Number(selected.total_price).toFixed(2)}</Text></View>
                </View>
              </>)}
              {(selected.delivery_address || selected.delivery_phone) && (<>
                <Text style={[mm.sectionLabel, { color: t.subtext }]}>DELIVERY DETAILS</Text>
                <View style={[mm.card, { backgroundColor: t.card, borderColor: t.border }]}>
                  {selected.delivery_address && <View style={mm.infoRow}><MapPin size={14} color={t.subtext} strokeWidth={2} /><Text style={[mm.infoValue, { color: t.text, flex: 1 }]}>{selected.delivery_address}</Text></View>}
                  {selected.delivery_phone && <View style={[mm.infoRow, selected.delivery_address && { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10, marginTop: 6 }]}><Phone size={14} color={t.subtext} strokeWidth={2} /><Text style={[mm.infoValue, { color: t.text }]}>{selected.delivery_phone}</Text></View>}
                </View>
              </>)}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

export default function AdminOrdersScreen() {
  if (Platform.OS === 'web') return <AdminOrdersWeb />;
  return <AdminOrdersMobile />;
}

const oc = StyleSheet.create({
  card:     { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  idWrap:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  id:       { fontSize: 13, fontWeight: '800' },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  bottom:   { flexDirection: 'row', justifyContent: 'space-between' },
  date:     { fontSize: 12 },
  price:    { fontSize: 14, fontWeight: '800' },
});

const ms = StyleSheet.create({
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerEye:     { fontSize: 9, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  iconBtn:       { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  liveIndicator: { fontSize: 10, fontWeight: '600' },
  tabs:          { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabTxt:        { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});

const mm = StyleSheet.create({
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title:             { fontSize: 16, fontWeight: '800' },
  scroll:            { padding: 16 },
  statusBanner:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 4 },
  statusBannerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
  statusBannerValue: { fontSize: 20, fontWeight: '900' },
  sectionLabel:      { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  statusGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statusBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  statusBtnTxt:      { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  card:              { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 4 },
  infoRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel:         { fontSize: 12, width: 72 },
  infoValue:         { fontSize: 13, fontWeight: '600', flex: 1 },
  itemRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  qtyBadge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  qtyTxt:            { fontSize: 11, fontWeight: '800' },
  itemName:          { flex: 1, fontSize: 13, fontWeight: '600' },
  itemPrice:         { fontSize: 13, fontWeight: '800' },
  totalRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 8, borderTopWidth: 1 },
  totalLabel:        { fontSize: 14, fontWeight: '700' },
  totalValue:        { fontSize: 20, fontWeight: '900' },
});