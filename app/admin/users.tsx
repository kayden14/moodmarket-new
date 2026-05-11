/**
 * app/admin/users.tsx
 * Admin users — both platforms in one file.
 *  - Mobile: original FlatList + Modal layout (dark theme)
 *  - Web:    full-page table with slide-in user detail panel
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, TextInput,
  Alert, Modal, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  ArrowLeft, Search, User, Shield, ShoppingBag,
  X, Calendar, Mail, Phone, Ban, CheckCircle,
} from 'lucide-react-native';

const PRIMARY = '#FF7A8A';
const BG = '#0F172A'; const CARD = '#1E293B'; const BORDER = '#334155';
const TEXT = '#F1F5F9'; const SUBTEXT = '#94A3B8';

interface Profile {
  id:           string;
  name:         string;
  email:        string;
  phone:        string | null;
  is_admin:     boolean;
  role:         'customer' | 'vendor' | 'admin';
  is_suspended: boolean;
  store_name:   string | null;
  created_at:   string;
  mood_history: any[];
  push_token:   string | null;
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

/* ─── shared data hook ─── */
function useUsersData() {
  const [users,   setUsers]   = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) console.error('[Admin Users]', error.message);
    if (data) setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, []);
  return { users, loading, fetchUsers, setUsers };
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function AdminUsersWeb() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const { users, loading, fetchUsers, setUsers } = useUsersData();

  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<Profile | null>(null);
  const [userOrders,    setUserOrders]    = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterRole,    setFilterRole]    = useState<'all' | 'admin' | 'vendor' | 'user'>('all');
  const [confirmAction, setConfirmAction] = useState<{ type: 'admin' | 'vendor' | 'suspend' | 'delete'; user: Profile } | null>(null);
  const [actioning,     setActioning]     = useState(false);

  const bg      = isDark ? '#0B0F1A' : '#F1F5F9';
  const sidebar = isDark ? '#111827' : '#1E293B';
  const card    = isDark ? '#1A2236' : '#FFFFFF';
  const border  = isDark ? '#1F2D42' : '#E2E8F0';
  const text    = isDark ? '#F1F5F9' : '#0F172A';
  const sub     = '#64748B';

  const filtered = users.filter(u => {
    const matchSearch = !search.trim() ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      filterRole === 'all'    ? true :
      filterRole === 'admin'  ? (u.role === 'admin'  || u.is_admin) :
      filterRole === 'vendor' ? u.role === 'vendor' :
                                (u.role === 'customer' || (!u.is_admin && u.role !== 'vendor'));
    return matchSearch && matchRole;
  });

  const openUser = async (user: Profile) => {
    setSelected(user);
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setUserOrders(data ?? []);
    setLoadingOrders(false);
  };

  const handleToggleAdmin = async (user: Profile) => {
    setActioning(true);
    try {
      const { error } = await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u));
      if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, is_admin: !prev.is_admin } : null);
    } catch (err: any) { alert(err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const handleToggleVendor = async (user: Profile) => {
    setActioning(true);
    const newRole = user.role === 'vendor' ? 'customer' : 'vendor';
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, role: newRole } : null);
    } catch (err: any) { alert(err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const handleToggleSuspend = async (user: Profile) => {
    setActioning(true);
    const newSuspended = !user.is_suspended;
    try {
      const { error } = await supabase.from('profiles').update({ is_suspended: newSuspended }).eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: newSuspended } : u));
      if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, is_suspended: newSuspended } : null);
    } catch (err: any) { alert(err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const handleDeleteUser = async (user: Profile) => {
    setActioning(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSelected(null);
    } catch (err: any) { alert(err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const totalSpend = (orders: any[]) => orders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
    @keyframes au-spin    { to { transform: rotate(360deg); } }
    @keyframes au-slidein { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes au-confirm { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes au-in      { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .au-nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 14px; border-radius: 12px; border: none; background: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #64748B; transition: all .15s; width: 100%; }
    .au-nav-item:hover { background: rgba(255,255,255,.06); color: #94A3B8; }
    .au-nav-item.active { background: ${PRIMARY}18; color: ${PRIMARY}; font-weight: 800; }

    .au-filter-tab { padding: 6px 14px; border-radius: 20px; border: 1.5px solid ${border}; background: none; cursor: pointer; font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; color: ${sub}; transition: all .15s; white-space: nowrap; }
    .au-filter-tab:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
    .au-filter-tab.active { background: ${PRIMARY}18; border-color: ${PRIMARY}; color: ${PRIMARY}; font-weight: 800; }

    .au-tr { display: grid; grid-template-columns: 2.5fr 2fr 1fr 1fr 100px; gap: 12px; padding: 14px 18px; border-bottom: 1px solid ${border}; align-items: center; cursor: pointer; transition: background .12s; animation: au-in .25s ease both; }
    .au-tr:hover { background: rgba(255,255,255,.03); }
    .au-tr:last-child { border-bottom: none; }

    .au-detail-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; background: ${card}; border-left: 1px solid ${border}; z-index: 300; overflow-y: auto; animation: au-slidein .28s cubic-bezier(.4,0,.2,1) both; box-shadow: -8px 0 48px rgba(0,0,0,.4); }
    .au-backdrop { position: fixed; inset: 0; z-index: 299; background: rgba(0,0,0,.45); backdrop-filter: blur(3px); }

    .au-avatar { display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-weight: 900; color: #fff; flex-shrink: 0; }

    .au-btn { display: flex; align-items: center; justify-content: center; gap: 7px; border: none; border-radius: 11px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; transition: all .15s; }
    .au-btn:hover { opacity: .85; transform: translateY(-1px); }
    .au-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .au-action-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 13px 16px; border-radius: 13px; border-width: 1px; border-style: solid; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; transition: all .15s; background: none; }
    .au-action-btn:hover { opacity: .85; transform: translateY(-1px); }

    .au-stat-card { border-radius: 14px; padding: 16px; border: 1px solid ${border}; display: flex; flex-direction: column; align-items: center; gap: 4; }

    .au-confirm-modal { position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.65); backdrop-filter: blur(8px); }
    .au-confirm-box  { background: ${card}; border: 1px solid ${border}; border-radius: 22px; padding: 32px; max-width: 400px; width: 92%; animation: au-confirm .22s ease both; font-family: 'Plus Jakarta Sans', sans-serif; }

    .au-order-row { display: flex; align-items: center; padding: 11px 0; border-bottom: 1px solid ${border}; gap: 10; }
    .au-order-row:last-child { border-bottom: none; }

    .au-input { width: 100%; background: ${isDark ? '#0B0F1A' : '#F8FAFC'}; border: 1.5px solid ${border}; border-radius: 11px; padding: 10px 14px 10px 40px; font-size: 14px; color: ${text}; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color .18s; }
    .au-input:focus { border-color: ${PRIMARY}; }
    .au-input::placeholder { color: ${isDark ? '#334155' : '#CBD5E1'}; }

    @media (max-width: 1100px) { .au-tr { grid-template-columns: 2fr 1.5fr 1fr 90px !important; } .au-tr > :nth-child(4) { display: none; } }
    @media (max-width: 800px)  { .au-tr { grid-template-columns: 2fr 1fr 80px !important; } .au-tr > :nth-child(3), .au-tr > :nth-child(4) { display: none; } .au-detail-panel { width: 100% !important; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: 'flex', height: '100vh', background: bg, fontFamily: '"Plus Jakarta Sans", sans-serif', overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 200, background: sidebar, borderRight: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 14px', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: `0 4px 12px ${PRIMARY}44` }}>🛡️</div>
            <span style={{ fontFamily: '"Fraunces", serif', fontSize: 15, fontWeight: 700, color: '#F1F5F9', letterSpacing: -.2 }}>Admin Portal</span>
          </div>
          <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: '🏠', label: 'Dashboard', path: '/admin'          },
              { icon: '📦', label: 'Products',  path: '/admin/products' },
              { icon: '🛒', label: 'Orders',    path: '/admin/orders'   },
              { icon: '🏪', label: 'Vendors',   path: '/admin/vendors'  },
              { icon: '👥', label: 'Users',     path: '/admin/users',   active: true },
            ].map(item => (
              <button key={item.path} className={`au-nav-item${(item as any).active ? ' active' : ''}`} onClick={() => router.push(item.path as any)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, paddingTop: 8 }}>
              <button className="au-nav-item" onClick={() => router.push('/(tabs)' as any)}><span style={{ fontSize: 16 }}>🏪</span>View store</button>
              <button className="au-nav-item" style={{ color: '#F87171' }} onClick={async () => { await supabase.auth.signOut(); router.replace('/admin/login' as any); }}><span style={{ fontSize: 16 }}>🚪</span>Sign out</button>
            </div>
          </nav>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* topbar */}
          <header style={{ height: 60, background: isDark ? '#111827' : '#1E293B', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
            <button onClick={() => router.push('/admin' as any)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18, padding: 4 }}>←</button>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 19, fontWeight: 700, color: '#F1F5F9' }}>Users</div>
            <span style={{ fontSize: 12, color: sub, background: `rgba(255,255,255,.06)`, borderRadius: 8, padding: '3px 9px', fontWeight: 600 }}>{users.length} total</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setIsDark(v => !v)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
          </header>

          {/* filter + search bar */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, background: card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            {(['all', 'admin', 'vendor', 'user'] as const).map(role => (
              <button key={role} className={`au-filter-tab${filterRole === role ? ' active' : ''}`} onClick={() => setFilterRole(role as any)}>
                {role === 'all'    ? `All  ${users.length}` :
                 role === 'admin'  ? `🛡️ Admins  ${users.filter(u => u.is_admin || u.role === 'admin').length}` :
                 role === 'vendor' ? `🏪 Vendors  ${users.filter(u => u.role === 'vendor').length}` :
                                    `👤 Customers  ${users.filter(u => !u.is_admin && u.role !== 'vendor').length}`}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: sub, pointerEvents: 'none' }}>🔍</span>
              <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="au-input" style={{ width: 260 }} />
            </div>
          </div>

          {/* table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${border}`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'au-spin .8s linear infinite' }} />
              </div>
            ) : (
              <>
                {/* table head */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 1fr 100px', gap: 12, padding: '10px 18px', background: isDark ? '#111827' : '#1E293B', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 5 }}>
                  {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: sub, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                    <span style={{ fontSize: 48 }}>👥</span>
                    <p style={{ color: sub, fontSize: 14 }}>No users found</p>
                  </div>
                ) : filtered.map((user, idx) => (
                  <div key={user.id} className="au-tr" style={{ animationDelay: `${idx * 30}ms` }} onClick={() => openUser(user)}>
                    {/* name + avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="au-avatar" style={{ width: 38, height: 38, borderRadius: 12, background: user.is_admin ? `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}99)` : `linear-gradient(135deg, #334155, #475569)`, fontSize: 14, boxShadow: user.is_admin ? `0 4px 12px ${PRIMARY}44` : 'none' }}>
                        {initials(user.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Unknown'}</div>
                        {user.phone && <div style={{ fontSize: 11, color: sub }}>{user.phone}</div>}
                      </div>
                    </div>

                    {/* email */}
                    <div style={{ fontSize: 12, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>

                    {/* role badge */}
                    <div>
                      {user.role === 'admin' || user.is_admin ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}44`, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: PRIMARY }}>🛡️ Admin</span>
                      ) : user.role === 'vendor' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#38BDF818', border: '1px solid #38BDF844', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#38BDF8' }}>🏪 Vendor{user.is_suspended ? ' 🚫' : ''}</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: sub }}>👤 Customer</span>
                      )}
                    </div>

                    {/* joined */}
                    <div style={{ fontSize: 12, color: sub }}>{new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>

                    {/* view btn */}
                    <button onClick={e => { e.stopPropagation(); openUser(user); }}
                      style={{ background: `${PRIMARY}18`, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: PRIMARY, fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                    >View →</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── USER DETAIL PANEL ── */}
        {selected && (
          <>
            <div className="au-backdrop" onClick={() => setSelected(null)} />
            <div className="au-detail-panel">

              {/* panel header */}
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, background: isDark ? '#111827' : '#F8FAFC', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                <div style={{ fontFamily: '"Fraunces", serif', fontSize: 16, fontWeight: 700, color: text }}>User Profile</div>
                {selected.role === 'admin' || selected.is_admin ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}44`, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: PRIMARY, marginLeft: 'auto' }}>🛡️ Admin</span>
                ) : selected.role === 'vendor' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#38BDF818', border: '1px solid #38BDF844', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#38BDF8', marginLeft: 'auto' }}>🏪 Vendor</span>
                ) : null}
              </div>

              <div style={{ padding: 24 }}>

                {/* hero */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 24, marginBottom: 20, borderBottom: `1px solid ${border}` }}>
                  <div className="au-avatar" style={{ width: 76, height: 76, borderRadius: 22, background: selected.is_admin ? `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}99)` : `linear-gradient(135deg, #334155, #475569)`, fontSize: 30, marginBottom: 14, boxShadow: selected.is_admin ? `0 8px 24px ${PRIMARY}44` : 'none' }}>
                    {initials(selected.name)}
                  </div>
                  <div style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 900, color: text, letterSpacing: -.4, marginBottom: 4 }}>{selected.name || 'Unknown'}</div>
                  <div style={{ fontSize: 13, color: sub, marginBottom: 12 }}>{selected.email}</div>
                  {selected.phone && <div style={{ fontSize: 13, color: sub, marginBottom: 12 }}>📱 {selected.phone}</div>}
                  <div style={{ fontSize: 12, color: sub }}>Joined {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>

                {/* stats row */}
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 12 }}>Stats</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {[
                    { icon: '🛒', label: 'Orders',       value: loadingOrders ? '…' : String(userOrders.length)              },
                    { icon: '💰', label: 'Total Spent',  value: loadingOrders ? '…' : `GH₵${totalSpend(userOrders).toFixed(0)}` },
                    { icon: '📷', label: 'Mood Scans',   value: String(selected.mood_history?.length ?? 0)                   },
                  ].map((s, i) => (
                    <div key={i} className="au-stat-card" style={{ background: isDark ? '#111827' : '#F8FAFC' }}>
                      <span style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</span>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 600, color: text, letterSpacing: -.5 }}>{s.value}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: sub, letterSpacing: .3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* recent orders */}
                {!loadingOrders && userOrders.length > 0 && (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 12 }}>Recent Orders</p>
                    <div style={{ background: isDark ? '#111827' : '#F8FAFC', border: `1px solid ${border}`, borderRadius: 13, overflow: 'hidden', marginBottom: 24 }}>
                      {userOrders.slice(0, 5).map((order, i, arr) => (
                        <div key={order.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < Math.min(arr.length, 5) - 1 ? `1px solid ${border}` : 'none', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 600, color: text }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                            <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: statusColor(order.status) + '18', borderRadius: 7, padding: '3px 8px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(order.status), textTransform: 'capitalize' }}>{order.status}</span>
                          </div>
                          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: text }}>GH₵{Number(order.total_price).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* mood history */}
                {(selected.mood_history?.length ?? 0) > 0 && (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 12 }}>Recent Moods</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
                      {[...new Set(selected.mood_history?.slice(-12) ?? [])].map((mood: any, i) => (
                        <span key={i} style={{ background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}33`, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: PRIMARY }}>
                          {typeof mood === 'string' ? mood : mood?.mood ?? ''}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* divider */}
                <div style={{ height: 1, background: border, marginBottom: 20 }} />

                {/* actions */}
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: sub, textTransform: 'uppercase', marginBottom: 12 }}>Actions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="au-action-btn"
                    style={{ background: selected.is_admin ? '#7F1D1D18' : '#1D4ED818', borderColor: selected.is_admin ? '#7F1D1D' : '#1D4ED8', color: selected.is_admin ? '#F87171' : '#60A5FA' }}
                    onClick={() => setConfirmAction({ type: 'admin', user: selected })}
                  >
                    <span style={{ fontSize: 18 }}>{selected.is_admin ? '🚫' : '🛡️'}</span>
                    {selected.is_admin ? 'Remove Admin Access' : 'Grant Admin Access'}
                  </button>
                  <button className="au-action-btn"
                    style={{ background: selected.role === 'vendor' ? '#7F1D1D18' : '#0F766E18', borderColor: selected.role === 'vendor' ? '#7F1D1D' : '#0F766E', color: selected.role === 'vendor' ? '#F87171' : '#2DD4BF' }}
                    onClick={() => setConfirmAction({ type: 'vendor', user: selected })}
                  >
                    <span style={{ fontSize: 18 }}>{selected.role === 'vendor' ? '📦' : '🏪'}</span>
                    {selected.role === 'vendor' ? 'Remove Vendor Status' : 'Make Vendor'}
                  </button>
                  <button className="au-action-btn"
                    style={{ background: selected.is_suspended ? '#0F766E18' : '#92400E18', borderColor: selected.is_suspended ? '#0F766E' : '#92400E', color: selected.is_suspended ? '#2DD4BF' : '#F59E0B' }}
                    onClick={() => setConfirmAction({ type: 'suspend', user: selected })}
                  >
                    <span style={{ fontSize: 18 }}>{selected.is_suspended ? '✅' : '🚫'}</span>
                    {selected.is_suspended ? 'Unsuspend Account' : 'Suspend Account'}
                  </button>
                  <button className="au-action-btn"
                    style={{ background: '#7F1D1D18', borderColor: '#7F1D1D', color: '#F87171' }}
                    onClick={() => setConfirmAction({ type: 'delete', user: selected })}
                  >
                    <span style={{ fontSize: 18 }}>🗑️</span>
                    Delete User Profile
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── CONFIRM MODAL ── */}
        {confirmAction && (
          <div className="au-confirm-modal">
            <div className="au-confirm-box">
              <div style={{ fontSize: 44, marginBottom: 14 }}>
                {confirmAction.type === 'delete'   ? '🗑️' :
                 confirmAction.type === 'vendor'   ? (confirmAction.user.role === 'vendor' ? '📦' : '🏪') :
                 confirmAction.type === 'suspend'  ? (confirmAction.user.is_suspended ? '✅' : '🚫') :
                 confirmAction.user.is_admin ? '🚫' : '🛡️'}
              </div>
              <div style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>
                {confirmAction.type === 'delete'  ? 'Delete User?' :
                 confirmAction.type === 'vendor'  ? (confirmAction.user.role === 'vendor' ? 'Remove Vendor?' : 'Make Vendor?') :
                 confirmAction.type === 'suspend' ? (confirmAction.user.is_suspended ? 'Unsuspend Account?' : 'Suspend Account?') :
                 confirmAction.user.is_admin ? 'Remove Admin?' : 'Grant Admin?'}
              </div>
              <div style={{ fontSize: 14, color: sub, lineHeight: 1.65, marginBottom: 26 }}>
                {confirmAction.type === 'delete'
                  ? <>This will permanently delete <strong style={{ color: text }}>{confirmAction.user.name}</strong>'s profile. Cannot be undone.</>
                  : confirmAction.type === 'vendor'
                  ? <>{confirmAction.user.role === 'vendor' ? 'Remove vendor status from' : 'Grant vendor access to'} <strong style={{ color: text }}>{confirmAction.user.name}</strong>?</>
                  : confirmAction.type === 'suspend'
                  ? <>{confirmAction.user.is_suspended ? 'Unsuspend' : 'Suspend'} <strong style={{ color: text }}>{confirmAction.user.name}</strong>'s account?</>
                  : confirmAction.user.is_admin
                  ? <>Remove admin privileges from <strong style={{ color: text }}>{confirmAction.user.name}</strong>?</>
                  : <>Grant admin access to <strong style={{ color: text }}>{confirmAction.user.name}</strong>?</>
                }
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'none', border: `1px solid ${border}`, color: text, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13 }}>
                  Cancel
                </button>
                <button
                  className="au-btn"
                  onClick={() =>
                  confirmAction.type === 'delete'  ? handleDeleteUser(confirmAction.user)  :
                  confirmAction.type === 'vendor'  ? handleToggleVendor(confirmAction.user) :
                  confirmAction.type === 'suspend' ? handleToggleSuspend(confirmAction.user) :
                                                    handleToggleAdmin(confirmAction.user)
                }
                  disabled={actioning}
                  style={{
                    flex: 1, padding: '12px',
                    background: confirmAction.type === 'delete' || confirmAction.user.is_admin ? '#450A0A' : `${PRIMARY}22`,
                    border: `1px solid ${confirmAction.type === 'delete' || confirmAction.user.is_admin ? '#7F1D1D' : PRIMARY}`,
                    color: confirmAction.type === 'delete' || confirmAction.user.is_admin ? '#F87171' : PRIMARY,
                    fontSize: 13,
                  }}
                >
                  {actioning
                    ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'au-spin .7s linear infinite' }} />
                    : confirmAction.type === 'delete' ? 'Delete' : confirmAction.user.is_admin ? 'Remove Admin' : 'Grant Admin'
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION (original, unchanged)
───────────────────────────────────────────────────────────────────────── */

function AdminUsersMobile() {
  const router = useRouter();
  const { users, loading, fetchUsers, setUsers } = useUsersData();
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<Profile | null>(null);
  const [userOrders,    setUserOrders]    = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openUser = async (user: Profile) => {
    setSelected(user);
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setUserOrders(data ?? []);
    setLoadingOrders(false);
  };

  const handleToggleAdmin = async (user: Profile) => {
    Alert.alert('Confirm', `Are you sure you want to ${user.is_admin ? 'remove admin from' : 'make admin'} ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        const { error } = await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u));
        if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, is_admin: !prev.is_admin } : null);
        Alert.alert('Updated ✓', `${user.name} is ${!user.is_admin ? 'now an admin' : 'no longer an admin'}.`);
      }},
    ]);
  };

  const handleDeleteUser = (user: Profile) => {
    Alert.alert('Delete User', `This will permanently delete ${user.name}'s profile. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setSelected(null);
      }},
    ]);
  };

  const totalSpend = (orders: any[]) => orders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const renderUser = ({ item }: { item: Profile }) => (
    <TouchableOpacity style={[uc.card, { backgroundColor: CARD, borderColor: BORDER }]} onPress={() => openUser(item)} activeOpacity={0.75}>
      <View style={[uc.avatar, { backgroundColor: item.is_admin ? PRIMARY + '33' : '#334155' }]}>
        <Text style={[uc.avatarTxt, { color: item.is_admin ? PRIMARY : SUBTEXT }]}>{item.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={uc.name}>{item.name || 'Unknown'}</Text>
          {item.is_admin && (
            <View style={uc.adminBadge}><Shield size={9} color={PRIMARY} strokeWidth={2.5} /><Text style={uc.adminBadgeTxt}>Admin</Text></View>
          )}
        </View>
        <Text style={uc.email}>{item.email}</Text>
        <Text style={uc.date}>Joined {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={ms.header}>
        <TouchableOpacity style={ms.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={TEXT} strokeWidth={2.2} /></TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={ms.headerEye}>ADMIN</Text>
          <Text style={ms.headerTitle}>Users</Text>
        </View>
        <Text style={{ color: SUBTEXT, fontSize: 13, fontWeight: '600' }}>{filtered.length} users</Text>
      </View>
      <View style={ms.searchRow}><Search size={16} color={SUBTEXT} style={{ marginRight: 8 }} /><TextInput style={ms.searchInput} placeholder="Search by name or email…" placeholderTextColor={SUBTEXT} value={search} onChangeText={setSearch} /></View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderUser} contentContainerStyle={{ padding: 16, paddingTop: 4 }} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><User size={40} color={SUBTEXT} strokeWidth={1.5} /><Text style={{ color: SUBTEXT, marginTop: 12, fontSize: 14 }}>No users found</Text></View>}
        />
      )}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={mm.header}>
              <TouchableOpacity onPress={() => setSelected(null)}><X size={22} color={TEXT} strokeWidth={2} /></TouchableOpacity>
              <Text style={mm.title}>User Profile</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={mm.scroll}>
              <View style={mm.heroWrap}>
                <View style={[mm.avatar, { backgroundColor: selected.is_admin ? PRIMARY + '33' : '#334155' }]}>
                  <Text style={[mm.avatarTxt, { color: selected.is_admin ? PRIMARY : SUBTEXT }]}>{selected.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                </View>
                <Text style={mm.heroName}>{selected.name || 'Unknown'}</Text>
                <Text style={mm.heroEmail}>{selected.email}</Text>
                {selected.is_admin && <View style={mm.adminBadge}><Shield size={11} color={PRIMARY} strokeWidth={2} /><Text style={mm.adminBadgeTxt}>Administrator</Text></View>}
              </View>
              <Text style={mm.sectionLabel}>ACCOUNT INFO</Text>
              <View style={[mm.card, { backgroundColor: CARD, borderColor: BORDER }]}>
                <View style={mm.infoRow}><Mail size={13} color={SUBTEXT} /><Text style={mm.infoTxt}>{selected.email}</Text></View>
                {selected.phone && <View style={[mm.infoRow, { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 6 }]}><Phone size={13} color={SUBTEXT} /><Text style={mm.infoTxt}>{selected.phone}</Text></View>}
                <View style={[mm.infoRow, { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 6 }]}><Calendar size={13} color={SUBTEXT} /><Text style={mm.infoTxt}>Joined {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
              </View>
              <Text style={mm.sectionLabel}>STATS</Text>
              <View style={mm.statsRow}>
                <View style={[mm.statCard, { backgroundColor: CARD, borderColor: BORDER }]}><Text style={mm.statValue}>{userOrders.length}</Text><Text style={mm.statLabel}>Orders</Text></View>
                <View style={[mm.statCard, { backgroundColor: CARD, borderColor: BORDER }]}><Text style={mm.statValue}>GH₵{totalSpend(userOrders).toFixed(0)}</Text><Text style={mm.statLabel}>Spent</Text></View>
                <View style={[mm.statCard, { backgroundColor: CARD, borderColor: BORDER }]}><Text style={mm.statValue}>{selected.mood_history?.length ?? 0}</Text><Text style={mm.statLabel}>Scans</Text></View>
              </View>
              {!loadingOrders && userOrders.length > 0 && (<>
                <Text style={mm.sectionLabel}>RECENT ORDERS</Text>
                <View style={[mm.card, { backgroundColor: CARD, borderColor: BORDER }]}>
                  {userOrders.slice(0, 5).map((order, i) => (
                    <View key={order.id} style={[mm.orderRow, i < Math.min(userOrders.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                      <Text style={mm.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={[mm.orderStatus, { color: order.status === 'delivered' ? '#4ADE80' : order.status === 'paid' ? '#38BDF8' : SUBTEXT }]}>{order.status}</Text>
                      <Text style={mm.orderPrice}>GH₵{Number(order.total_price).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </>)}
              <Text style={mm.sectionLabel}>ACTIONS</Text>
              <TouchableOpacity style={[mm.actionBtn, { backgroundColor: selected.is_admin ? '#7F1D1D22' : '#1D4ED822', borderColor: selected.is_admin ? '#7F1D1D' : '#1D4ED8' }]} onPress={() => handleToggleAdmin(selected)}>
                {selected.is_admin ? <Ban size={16} color="#F87171" strokeWidth={2} /> : <Shield size={16} color="#60A5FA" strokeWidth={2} />}
                <Text style={[mm.actionBtnTxt, { color: selected.is_admin ? '#F87171' : '#60A5FA' }]}>{selected.is_admin ? 'Remove Admin Access' : 'Grant Admin Access'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[mm.actionBtn, { backgroundColor: '#7F1D1D22', borderColor: '#7F1D1D' }]} onPress={() => handleDeleteUser(selected)}>
                <Ban size={16} color="#F87171" strokeWidth={2} />
                <Text style={[mm.actionBtnTxt, { color: '#F87171' }]}>Delete User Profile</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DEFAULT EXPORT — platform switch
───────────────────────────────────────────────────────────────────────── */

export default function AdminUsersScreen() {
  if (Platform.OS === 'web') return <AdminUsersWeb />;
  return <AdminUsersMobile />;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE STYLES
───────────────────────────────────────────────────────────────────────── */

const uc = StyleSheet.create({
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:    { fontSize: 18, fontWeight: '900' },
  name:         { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  email:        { fontSize: 12, color: SUBTEXT, marginBottom: 2 },
  date:         { fontSize: 11, color: SUBTEXT },
  adminBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: PRIMARY + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  adminBadgeTxt:{ fontSize: 9, fontWeight: '800', color: PRIMARY },
});
const ms = StyleSheet.create({
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, justifyContent: 'center', alignItems: 'center' },
  headerEye:   { fontSize: 9, fontWeight: '800', color: PRIMARY, letterSpacing: 3, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: TEXT, letterSpacing: -0.5 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, margin: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },
});
const mm = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:        { fontSize: 16, fontWeight: '800', color: TEXT },
  scroll:       { padding: 16 },
  heroWrap:     { alignItems: 'center', paddingVertical: 24 },
  avatar:       { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarTxt:    { fontSize: 30, fontWeight: '900' },
  heroName:     { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 4 },
  heroEmail:    { fontSize: 13, color: SUBTEXT, marginBottom: 8 },
  adminBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY + '22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: PRIMARY + '44' },
  adminBadgeTxt:{ fontSize: 11, fontWeight: '800', color: PRIMARY },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: SUBTEXT, letterSpacing: 2, marginBottom: 8, marginTop: 8 },
  card:         { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 4 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTxt:      { fontSize: 13, color: TEXT, fontWeight: '500' },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard:     { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, alignItems: 'center' },
  statValue:    { fontSize: 20, fontWeight: '900', color: TEXT, letterSpacing: -0.5 },
  statLabel:    { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  orderRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  orderId:      { flex: 1, fontSize: 12, fontWeight: '700', color: TEXT },
  orderStatus:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', marginRight: 10 },
  orderPrice:   { fontSize: 13, fontWeight: '800', color: TEXT },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  actionBtnTxt: { fontSize: 14, fontWeight: '700' },
});