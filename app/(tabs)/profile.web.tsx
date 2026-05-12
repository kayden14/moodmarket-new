/**
 * app/profile.web.tsx — MoodMarket Profile (Web)
 * RESPONSIVE: Full coverage for mobile (320px+), tablet (600–960px), laptop (960–1280px), desktop (1280px+)
 *
 * FIX: Mood history entries always visible in light and dark mode.
 * FIX 2: Mood label never shows "Unknown" — always falls back to raw mood key.
 * FIX 3: Robust mood key extraction.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ShoppingCart, ShoppingBag, BarChart3, Package, CheckCircle, DollarSign, ArrowRight, ArrowLeft, LogOut, Bell, Lock, Palette, Settings, Sun, Moon, User, Calendar, CalendarDays, ChevronRight, X, Menu } from 'lucide-react';

const WebEmoji = ({ children, style }: any) => <span style={{ ...style, fontFamily: undefined }}>{children}</span>;
import { Order } from '@/types/database';

// ─── Mood helpers ─────────────────────────────────────────────────────────────

const MOOD_META: Record<string, { label: string; color: string; lightBg: string; darkBg: string }> = {
  '😊': { label: 'Happy',       color: '#D97706', lightBg: '#FEF3C7', darkBg: '#2D2200' },
  '😢': { label: 'Sad',         color: '#2563EB', lightBg: '#DBEAFE', darkBg: '#0D1F3C' },
  '😌': { label: 'Calm',        color: '#059669', lightBg: '#D1FAE5', darkBg: '#052E1C' },
  '😤': { label: 'Frustrated',  color: '#DC2626', lightBg: '#FEE2E2', darkBg: '#2D0D0D' },
  '🥰': { label: 'Loved',       color: '#DB2777', lightBg: '#FCE7F3', darkBg: '#2D0D1F' },
  '😴': { label: 'Tired',       color: '#7C3AED', lightBg: '#EDE9FE', darkBg: '#1C1040' },
  '🤩': { label: 'Excited',     color: '#EA580C', lightBg: '#FFEDD5', darkBg: '#2D1600' },
  '😰': { label: 'Anxious',     color: '#0891B2', lightBg: '#CFFAFE', darkBg: '#052830' },
  '✨': { label: 'Inspired',    color: '#9333EA', lightBg: '#F3E8FF', darkBg: '#1C0D2D' },
  '😐': { label: 'Neutral',     color: '#4B5563', lightBg: '#F3F4F6', darkBg: '#1A1C1E' },
  'Happy':       { label: 'Happy',       color: '#D97706', lightBg: '#FEF3C7', darkBg: '#2D2200' },
  'Sad':         { label: 'Sad',         color: '#2563EB', lightBg: '#DBEAFE', darkBg: '#0D1F3C' },
  'Calm':        { label: 'Calm',        color: '#059669', lightBg: '#D1FAE5', darkBg: '#052E1C' },
  'Energetic':   { label: 'Energetic',   color: '#EA580C', lightBg: '#FFEDD5', darkBg: '#2D1600' },
  'Adventurous': { label: 'Adventurous', color: '#9333EA', lightBg: '#F3E8FF', darkBg: '#1C0D2D' },
  'Romantic':    { label: 'Romantic',    color: '#DB2777', lightBg: '#FCE7F3', darkBg: '#2D0D1F' },
  'Anxious':     { label: 'Anxious',     color: '#0891B2', lightBg: '#CFFAFE', darkBg: '#052830' },
  'Bored':       { label: 'Bored',       color: '#4B5563', lightBg: '#F3F4F6', darkBg: '#1A1C1E' },
  'Frustrated':  { label: 'Frustrated',  color: '#DC2626', lightBg: '#FEE2E2', darkBg: '#2D0D0D' },
  'Loved':       { label: 'Loved',       color: '#DB2777', lightBg: '#FCE7F3', darkBg: '#2D0D1F' },
  'Tired':       { label: 'Tired',       color: '#7C3AED', lightBg: '#EDE9FE', darkBg: '#1C1040' },
  'Excited':     { label: 'Excited',     color: '#EA580C', lightBg: '#FFEDD5', darkBg: '#2D1600' },
  'Inspired':    { label: 'Inspired',    color: '#9333EA', lightBg: '#F3E8FF', darkBg: '#1C0D2D' },
  'Neutral':     { label: 'Neutral',     color: '#4B5563', lightBg: '#F3F4F6', darkBg: '#1A1C1E' },
};

const MOOD_EMOJI_MAP: Record<string, string> = {
  'Happy': '😊', 'Sad': '😢', 'Calm': '😌', 'Energetic': '⚡',
  'Adventurous': '🌍', 'Romantic': '❤️', 'Anxious': '😰', 'Bored': '😑',
  'Frustrated': '😤', 'Loved': '🥰', 'Tired': '😴', 'Excited': '🤩',
  'Inspired': '✨', 'Neutral': '😐',
};

let _debugLogged = false;
function extractMoodKey(item: any): string {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
  if (!_debugLogged) {
    console.log('[MoodMarket] MOOD ENTRY SAMPLE (raw DB shape):', JSON.stringify(item, null, 2));
    _debugLogged = true;
  }
  const candidate =
    item.mood_key    ??
    item.mood        ??
    item.label       ??
    item.mood_label  ??
    item.name        ??
    item.mood_name   ??
    item.emotion     ??
    item.feeling     ??
    '';
  const key = String(candidate ?? '').trim();
  if (!key) console.warn('[MoodMarket] Could not resolve mood key from entry:', JSON.stringify(item));
  else if (!MOOD_META[key]) console.warn('[MoodMarket] Unrecognized mood key:', JSON.stringify(key));
  return key;
}

function getMoodMeta(key: string, isDark: boolean) {
  const m = MOOD_META[key] ?? { label: key || 'Unknown', color: '#0A7EA4', lightBg: '#E0F2FE', darkBg: '#0C2A38' };
  return { label: m.label || key || 'Unknown', color: m.color, bg: isDark ? m.darkBg : m.lightBg };
}

function getMoodEmoji(key: string): string {
  if (MOOD_EMOJI_MAP[key]) return MOOD_EMOJI_MAP[key];
  if ([...key].length <= 2) return key;
  return '😶';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusConfig(status: string, isDark: boolean) {
  switch (status) {
    case 'paid':      return { label: 'Paid',      color: '#0A7EA4', bg: isDark ? '#0D1F2D' : '#E8F4F8', dot: '#0A7EA4' };
    case 'shipped':   return { label: 'Shipped',   color: '#7C5CBF', bg: isDark ? '#1E1428' : '#F0EBF8', dot: '#7C5CBF' };
    case 'delivered': return { label: 'Delivered', color: '#22C55E', bg: isDark ? '#0D2B1A' : '#EDFBF1', dot: '#22C55E' };
    case 'cancelled': return { label: 'Cancelled', color: '#E53E3E', bg: isDark ? '#2D1515' : '#FFF0F0', dot: '#E53E3E' };
    default:          return { label: status,      color: '#888',    bg: isDark ? '#222' : '#F5F5F5',    dot: '#888' };
  }
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, theme, isDark }: { order: Order; theme: any; isDark: boolean }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const cfg = getStatusConfig(order.status, isDark);
  const date = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push({ pathname: '/order/[id]' as any, params: { id: order.id } })}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: theme.card,
        border: `1px solid ${hovered ? theme.primary : theme.border}`,
        borderRadius: 16, marginBottom: 8, cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? `0 4px 20px ${theme.primary}18` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: isDark ? '#2D1820' : '#FFF0F2',
        border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}><ShoppingBag size={16} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: theme.inactive, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>ORDER</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: theme.textPrimary, fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: 0.5 }}>#{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: theme.inactive, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {date}</span>
          <span style={{ color: theme.border }}>·</span>
          <span style={{ fontSize: 11, color: theme.inactive, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Package size={11} /> {order.products.length} items</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: cfg.bg, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, fontFamily: '"Plus Jakarta Sans", sans-serif', textTransform: 'capitalize' }}>{cfg.label}</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: theme.primary, fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: -0.4 }}>
          GH₵ {Number(order.total_price).toFixed(2)}
        </span>
      </div>
      <span style={{ color: theme.inactive, fontSize: 15, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon, theme, isDark }: {
  value: string; label: string; icon: React.ReactNode; theme: any; isDark: boolean;
}) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 16, padding: '18px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: isDark ? '#2D1820' : '#FFF0F2',
        border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.textPrimary, fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: -0.8, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.textSecondary, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

function SettingsRow({ icon, label, sub, onPress, theme, isDark }: {
  icon: React.ReactNode; label: string; sub: string; onPress: () => void; theme: any; isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: theme.card,
        border: `1px solid ${hovered ? theme.primary : theme.border}`,
        borderRadius: 14, cursor: 'pointer', transition: 'all 0.14s', marginBottom: 8,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: isDark ? '#1E1E2E' : '#FFF0F2',
        border: `1px solid ${isDark ? '#2A2A4A' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: theme.textSecondary, fontFamily: '"Plus Jakarta Sans", sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <span style={{ color: theme.inactive, fontSize: 15, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children, theme, isDark }: {
  active: boolean; onClick: () => void; children: React.ReactNode; theme: any; isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 15px', borderRadius: 10,
        border: active ? `1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'}` : '1.5px solid transparent',
        background: active ? (isDark ? '#2D1820' : '#FFF0F2') : 'none',
        color: active ? theme.primary : theme.textSecondary,
        fontSize: 12, fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif',
        transition: 'all 0.14s', whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

// ─── Mood History Tab ─────────────────────────────────────────────────────────

function MoodHistoryTab({ moodHistory, moodCount, pri, tp, ts, card, bord, isDark }: {
  moodHistory: any[]; moodCount: number;
  pri: string; tp: string; ts: string; card: string; bord: string; isDark: boolean;
}) {
  return (
    <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: '22px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: pri, fontFamily: '"Plus Jakarta Sans", sans-serif', textTransform: 'uppercase' }}>YOUR VIBES</p>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif' }}>Mood History</h3>
        </div>
        {moodCount > 0 && (
          <span style={{ background: isDark ? '#2D1820' : '#FFF0F2', border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: pri, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            {moodCount} entries
          </span>
        )}
      </div>

      {moodCount === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}><WebEmoji style={{ fontSize: 44 }}>✨</WebEmoji></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif', marginBottom: 8 }}>No mood entries yet</p>
          <p style={{ fontSize: 12, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Your mood selections will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {moodHistory.map((item: any, i: number) => {
            const moodKey = extractMoodKey(item);
            const meta    = getMoodMeta(moodKey, isDark);
            const emoji   = getMoodEmoji(moodKey);
            const label   = item.label || meta.label || moodKey || 'Unknown';
            const rawDate = item.date ?? item.created_at ?? item.recorded_at ?? item.logged_at ?? item.timestamp ?? '';
            const dateShort = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
            const dateLong  = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
            const note = item.note ?? item.notes ?? item.comment ?? item.description ?? '';

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: meta.bg,
                border: `1.5px solid ${meta.color}40`,
                borderRadius: 14, padding: '12px 14px',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: isDark ? `${meta.color}22` : `${meta.color}18`,
                  border: `1.5px solid ${meta.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}><WebEmoji style={{ fontSize: 22 }}>{emoji}</WebEmoji></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: meta.color, fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 2 }}>{label}</span>
                  {dateLong && (
                    <span style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#475569', fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: note ? 4 : 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CalendarDays size={10} /> {dateLong}</span>
                  )}
                  {!!note && (
                    <span style={{ display: 'block', fontSize: 11, color: isDark ? '#94A3B8' : '#475569', fontFamily: '"Plus Jakarta Sans", sans-serif', fontStyle: 'italic', lineHeight: 1.55 }}>"{note}"</span>
                  )}
                </div>
                {dateShort && (
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: isDark ? `${meta.color}22` : `${meta.color}15`, padding: '3px 8px', borderRadius: 8, whiteSpace: 'nowrap', border: `1px solid ${meta.color}40`, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{dateShort}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = 'overview' | 'orders' | 'mood' | 'settings';

export default function ProfileWeb() {
  const router = useRouter();
  const { user, profile, signOut, isVendor, isAdmin } = useAuth();
  const { theme, isDark, toggleDark } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [adminTaps, setAdminTaps] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const moodHistory: any[] = (() => {
    const mh = profile?.mood_history;
    let raw: any[] = [];
    if (!mh) return [];
    if (Array.isArray(mh)) raw = mh;
    else if (typeof mh === 'object') raw = Object.values(mh);
    return raw.filter(e => e && typeof e === 'object' && !Array.isArray(e));
  })();
  const moodCount = moodHistory.length;

  useEffect(() => { _debugLogged = false; }, [profile]);

  const handleLogoClick = () => {
    const next = adminTaps + 1;
    setAdminTaps(next);
    if (next >= 5) { setAdminTaps(0); router.push('/admin/login' as any); }
  };

  useEffect(() => {
    if (user) fetchOrders();
    else setLoading(false);
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const handleSignOut = async () => { await signOut(); router.replace('/login'); };

  const bg    = theme.background;
  const card  = theme.card;
  const bord  = theme.border;
  const pri   = theme.primary;
  const tp    = theme.textPrimary;
  const ts    = theme.textSecondary;
  const tint  = theme.tint;
  const inact = theme.inactive;

  const totalSpend     = orders.reduce((s, o) => s + Number(o.total_price), 0);
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const initials       = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const NAV_ITEMS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'overview', icon: <BarChart3 size={14} />, label: 'Overview'     },
    { key: 'orders',   icon: <Package size={14} />,   label: 'Orders'       },
    { key: 'mood',     icon: <WebEmoji style={{ fontSize: 14 }}>✨</WebEmoji>, label: 'Mood History' },
    { key: 'settings', icon: <Settings size={14} />,  label: 'Settings'     },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html {
          font-family: "Plus Jakarta Sans", sans-serif;
          overflow-y: auto;
          overflow-x: hidden;
        }
        body {
          min-height: 100%;
          font-family: "Plus Jakarta Sans", sans-serif;
          overflow-y: auto;
          background: ${bg};
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        /* ── APP ── */
        .prof-app {
          min-height: 100vh;
          background: ${bg};
          display: flex;
          flex-direction: column;
          color: ${tp};
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* ── TOP NAV ── */
        .prof-topnav {
          height: 56px;
          background: ${card};
          border-bottom: 1px solid ${bord};
          display: flex;
          align-items: center;
          padding: 0 40px;
          gap: 14px;
          position: sticky;
          top: 0;
          z-index: 200;
          backdrop-filter: blur(10px);
        }

        .prof-back {
          background: none;
          border: 1px solid ${bord};
          border-radius: 9px;
          padding: 6px 13px;
          font-size: 13px;
          font-weight: 600;
          color: ${ts};
          cursor: pointer;
          font-family: "Plus Jakarta Sans", sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .prof-back:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }

        .prof-logo {
          font-family: "Playfair Display", serif;
          font-size: 17px;
          font-weight: 700;
          color: ${tp};
          letter-spacing: -0.3px;
          cursor: pointer;
          transition: opacity 0.13s;
          margin-right: auto;
          white-space: nowrap;
        }
        .prof-logo:hover { opacity: 0.8; }
        .prof-logo span { color: ${pri}; }

        /* Hamburger (mobile) */
        .prof-hamburger {
          display: none;
          background: none;
          border: 1px solid ${bord};
          border-radius: 9px;
          width: 36px;
          height: 36px;
          cursor: pointer;
          font-size: 16px;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        /* ── BODY GRID ── */
        .prof-body {
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          padding: 36px 40px 80px;
          display: grid;
          grid-template-columns: 270px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ── SIDEBAR ── */
        .prof-sidebar {
          position: sticky;
          top: 76px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .prof-avatar-card {
          background: ${card};
          border: 1px solid ${bord};
          border-radius: 22px;
          padding: 24px 20px;
          text-align: center;
        }

        .prof-avatar {
          width: 68px;
          height: 68px;
          border-radius: 18px;
          background: ${pri};
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          font-family: "Plus Jakarta Sans", sans-serif;
          letter-spacing: -0.5px;
        }

        .prof-name  { font-size: 16px; font-weight: 700; color: ${tp}; font-family: "Playfair Display", serif; letter-spacing: -0.2px; margin-bottom: 3px; }
        .prof-email { font-size: 11px; color: ${inact}; font-family: "Plus Jakarta Sans", sans-serif; margin-bottom: 16px; word-break: break-all; }

        .prof-edit-btn {
          width: 100%;
          height: 36px;
          border-radius: 10px;
          border: 1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'};
          background: ${isDark ? '#2D1820' : '#FFF0F2'};
          color: ${pri};
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: "Plus Jakarta Sans", sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: opacity 0.14s;
        }
        .prof-edit-btn:hover { opacity: 0.8; }

        .prof-sidenav {
          background: ${card};
          border: 1px solid ${bord};
          border-radius: 18px;
          overflow: hidden;
        }

        .prof-sidenav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 18px;
          cursor: pointer;
          border-bottom: 1px solid ${bord};
          transition: background 0.12s;
          font-size: 13px;
          font-weight: 600;
          color: ${ts};
          font-family: "Plus Jakarta Sans", sans-serif;
        }
        .prof-sidenav-item:last-child { border-bottom: none; }
        .prof-sidenav-item:hover { background: ${tint}; }
        .prof-sidenav-item.active { color: ${pri}; background: ${isDark ? '#2D1820' : '#FFF0F2'}; }

        .prof-sidenav-icon  { font-size: 14px; }
        .prof-sidenav-arrow { margin-left: auto; color: ${inact}; }

        /* ── TABS BAR ── */
        .prof-tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
        }
        .prof-tabs::-webkit-scrollbar { height: 0; }

        /* ── MOBILE DRAWER ── */
        .prof-mobile-drawer {
          display: none;
          position: fixed;
          top: 56px; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 150;
          backdrop-filter: blur(4px);
        }
        .prof-mobile-drawer.open { display: block; }

        .prof-mobile-drawer-panel {
          position: absolute;
          top: 0; left: 0;
          width: 280px;
          height: 100%;
          background: ${card};
          border-right: 1px solid ${bord};
          overflow-y: auto;
          padding: 20px 0;
        }

        /* ─────────────────────────────────────────
           RESPONSIVE BREAKPOINTS
           ───────────────────────────────────────── */

        /* Laptop: 961px – 1280px */
        @media (min-width: 961px) and (max-width: 1280px) {
          .prof-body {
            grid-template-columns: 240px 1fr;
            padding: 28px 28px 60px;
            gap: 20px;
          }
        }

        /* Tablet landscape: 769px – 960px */
        @media (min-width: 769px) and (max-width: 960px) {
          .prof-topnav { padding: 0 28px; }
          .prof-body {
            grid-template-columns: 220px 1fr;
            padding: 22px 24px 60px;
            gap: 16px;
          }
          .prof-sidebar { position: sticky; top: 72px; }
          .prof-avatar-card { padding: 18px 16px; }
          .prof-avatar { width: 58px; height: 58px; font-size: 18px; }
          .prof-name { font-size: 14px; }
        }

        /* Tablet portrait: 600px – 768px */
        @media (min-width: 600px) and (max-width: 768px) {
          .prof-topnav { padding: 0 20px; }
          .prof-body {
            grid-template-columns: 1fr;
            padding: 20px 20px 60px;
            gap: 16px;
          }
          .prof-sidebar {
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .prof-avatar-card { flex: 1 1 240px; }
          .prof-sidenav { display: none; }
          .prof-tabs { margin-bottom: 16px; }
        }

        /* Mobile large: 480px – 599px */
        @media (min-width: 480px) and (max-width: 599px) {
          .prof-topnav { padding: 0 16px; }
          .prof-body {
            grid-template-columns: 1fr;
            padding: 16px 16px 60px;
            gap: 14px;
          }
          .prof-sidebar { position: static; }
          .prof-sidenav { display: none; }
          .prof-hamburger { display: flex; }
          .prof-mobile-drawer { display: none; } /* controlled by JS class */
          .prof-avatar-card { display: flex; align-items: center; gap: 16px; text-align: left; padding: 16px; }
          .prof-avatar { margin: 0; width: 56px; height: 56px; font-size: 18px; flex-shrink: 0; }
          .prof-email { margin-bottom: 10px; }
        }

        /* Mobile small: 320px – 479px */
        @media (max-width: 479px) {
          .prof-topnav {
            padding: 0 14px;
            height: 52px;
            gap: 10px;
          }
          .prof-body {
            grid-template-columns: 1fr;
            padding: 14px 14px 60px;
            gap: 12px;
          }
          .prof-sidebar { position: static; }
          .prof-sidenav { display: none; }
          .prof-hamburger { display: flex; }
          .prof-avatar-card {
            display: flex;
            align-items: center;
            gap: 14px;
            text-align: left;
            padding: 14px;
            border-radius: 16px;
          }
          .prof-avatar { margin: 0; width: 52px; height: 52px; font-size: 16px; flex-shrink: 0; }
          .prof-name { font-size: 14px; }
          .prof-email { font-size: 10px; }
          /* compact tabs: icon-only on very narrow */
          .prof-tab-label-short { display: none; }
          .prof-tab-icon { display: inline !important; }
        }

        /* Stats grid adapts */
        .prof-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        @media (max-width: 960px) {
          .prof-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 479px) {
          .prof-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }

        /* Quick actions grid */
        .prof-quick-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 768px) {
          .prof-quick-actions { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 479px) {
          .prof-quick-actions { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }

        /* Touch: no hover flicker */
        @media (hover: none) {
          .prof-back:hover { border-color: ${bord}; color: ${ts}; background: none; }
          .prof-sidenav-item:hover { background: transparent; }
        }

        /* Print */
        @media print {
          .prof-topnav, .prof-sidenav, .prof-hamburger, .prof-mobile-drawer { display: none !important; }
          .prof-body { grid-template-columns: 1fr; padding: 0; }
          .prof-sidebar { position: static; }
        }
      `}</style>

      <div className="prof-app">

        {/* TOP NAV */}
        <nav className="prof-topnav">
          <button className="prof-back" onClick={() => router.back()}><ArrowLeft size={14} /> Back</button>
          <span className="prof-logo" onClick={handleLogoClick}>Mood<span>Market</span></span>
          {/* Hamburger — visible on mobile */}
          {user && (
            <button
              className="prof-hamburger"
              onClick={() => setMobileMenuOpen(v => !v)}
              title="Menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          )}
          <button
            style={{
              background: 'none', border: `1px solid ${bord}`,
              borderRadius: 9, width: 34, height: 34,
              cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onClick={toggleDark}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </nav>

        {/* MOBILE DRAWER */}
        {user && (
          <div
            className={`prof-mobile-drawer${mobileMenuOpen ? ' open' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="prof-mobile-drawer-panel"
              onClick={e => e.stopPropagation()}
            >
              {/* Avatar in drawer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px 20px', borderBottom: `1px solid ${bord}`, marginBottom: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: pri, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: '"Plus Jakarta Sans", sans-serif', flexShrink: 0 }}>{initials}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name ?? 'User'}</p>
                  <p style={{ margin: 0, fontSize: 10, color: inact, fontFamily: '"Plus Jakarta Sans", sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</p>
                </div>
              </div>
              {NAV_ITEMS.map(item => (
                <div
                  key={item.key}
                  className={`prof-sidenav-item${activeTab === item.key ? ' active' : ''}`}
                  onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
                >
                  <span className="prof-sidenav-icon">{item.icon}</span>
                  {item.label}
                  <span className="prof-sidenav-arrow">›</span>
                </div>
              ))}
              <div
                className="prof-sidenav-item"
                onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                style={{ color: '#EF4444', borderBottom: 'none' }}
              >
                <span className="prof-sidenav-icon">🚪</span>Sign Out
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 22, margin: '0 auto 22px', background: isDark ? '#2D1820' : '#FFF0F2', border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}><User size={34} /></div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif', marginBottom: 10 }}>You're not signed in</h2>
            <p style={{ fontSize: 13, color: ts, lineHeight: 1.65, marginBottom: 24, fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: 300 }}>Log in to view your profile, orders, and mood history.</p>
            <button onClick={() => router.push('/login')} style={{ padding: '13px 28px', borderRadius: 14, border: 'none', background: pri, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', boxShadow: `0 6px 20px ${pri}44`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Sign In <ArrowRight size={14} /></button>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: inact, fontSize: 14, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            Loading profile…
          </div>
        ) : (
          <div className="prof-body">

            {/* SIDEBAR */}
            <aside className="prof-sidebar">
              <div className="prof-avatar-card">
                <div className="prof-avatar">{initials}</div>
                <div>
                  <p className="prof-name">{profile?.name ?? 'User'}</p>
                  <p className="prof-email">{profile?.email}</p>
                  <button className="prof-edit-btn" onClick={() => router.push('/edit-profile')}>✏ Edit Profile</button>
                </div>
              </div>
              <div className="prof-sidenav">
                {NAV_ITEMS.map(item => (
                  <div key={item.key} className={`prof-sidenav-item${activeTab === item.key ? ' active' : ''}`} onClick={() => setActiveTab(item.key)}>
                    <span className="prof-sidenav-icon">{item.icon}</span>
                    {item.label}
                    <span className="prof-sidenav-arrow">›</span>
                  </div>
                ))}
                <div className="prof-sidenav-item" onClick={handleSignOut} style={{ color: '#EF4444' }}>
                  <span className="prof-sidenav-icon">🚪</span>Sign Out
                </div>
              </div>
            </aside>

            {/* MAIN PANEL */}
            <main>
              {/* Tab bar */}
              <div className="prof-tabs">
                {[
                  { key: 'overview', short: <BarChart3 size={14} />, label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BarChart3 size={14} /> Overview</span> },
                  { key: 'orders',   short: <Package size={14} />,   label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Package size={14} /> Orders ({orders.length})</span> },
                  { key: 'mood',     short: <WebEmoji style={{ fontSize: 14 }}>✨</WebEmoji>, label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><WebEmoji style={{ fontSize: 14 }}>✨</WebEmoji> Mood ({moodCount})</span> },
                  { key: 'settings', short: <Settings size={14} />,  label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Settings size={14} /> Settings</span> },
                ].map(t => (
                  <TabBtn key={t.key} active={activeTab === t.key as Tab} onClick={() => setActiveTab(t.key as Tab)} theme={theme} isDark={isDark}>
                    <span className="prof-tab-icon" style={{ display: 'none' }}>{t.short}</span>
                    <span className="prof-tab-label-short">{t.label}</span>
                  </TabBtn>
                ))}
              </div>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div>
                  <div className="prof-stats-grid">
                    <StatCard value={String(orders.length)}          label="Total orders" icon={<Package size={15} />} theme={theme} isDark={isDark} />
                    <StatCard value={String(deliveredCount)}         label="Delivered"    icon={<CheckCircle size={15} />} theme={theme} isDark={isDark} />
                    <StatCard value={`GH₵${totalSpend.toFixed(0)}`} label="Total spent"  icon={<DollarSign size={15} />} theme={theme} isDark={isDark} />
                    <StatCard value={String(moodCount)}              label="Mood entries" icon={<WebEmoji style={{ fontSize: 15 }}>✨</WebEmoji>} theme={theme} isDark={isDark} />
                  </div>

                  {/* ── Vendor Dashboard Entry ── */}
                  {isVendor && (
                    <div
                      onClick={() => router.push('/vendor' as any)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: isDark ? '#2D1820' : '#FFF0F2',
                        border: `1px solid ${isDark ? '#FF7A8A44' : '#FF7A8A55'}`,
                        borderRadius: 18, padding: '16px 18px', marginBottom: 20,
                        cursor: 'pointer', transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.85'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: '#FF7A8A22', border: '1px solid #FF7A8A44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: tp, fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 2 }}>Vendor Dashboard</div>
                        <div style={{ fontSize: 11, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Manage your products, orders & earnings</div>
                      </div>
                      <ArrowRight size={16} color={pri} />
                    </div>
                  )}

                  {/* ── Become a Vendor (for customers only) ── */}
                  {!isVendor && !isAdmin && (
                    <div
                      id="vendor-apply-banner"
                      onClick={() => router.push('/vendor/apply' as any)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: isDark ? '#1E293B' : '#F8FAFC',
                        border: `1px solid ${bord}`,
                        borderRadius: 18, padding: '16px 18px', marginBottom: 20,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = pri; (e.currentTarget as HTMLDivElement).style.background = isDark ? '#2D1820' : '#FFF0F2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = bord; (e.currentTarget as HTMLDivElement).style.background = isDark ? '#1E293B' : '#F8FAFC'; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: isDark ? '#334155' : '#F1F5F9', border: `1px solid ${bord}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: tp, fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 2 }}>Sell on MoodMarket</div>
                        <div style={{ fontSize: 11, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Apply to become a vendor and reach more customers</div>
                      </div>
                      <ArrowRight size={16} color={inact} />
                    </div>
                  )}

                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: '22px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif', letterSpacing: -0.3 }}>Recent Orders</h3>
                      <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', color: pri, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={12} /></button>
                    </div>
                    {orders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '28px 0' }}>
                        <div style={{ fontSize: 30, marginBottom: 10 }}><Package size={30} /></div>
                        <p style={{ fontSize: 13, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>No orders yet</p>
                      </div>
                    ) : orders.slice(0, 3).map(order => <OrderCard key={order.id} order={order} theme={theme} isDark={isDark} />)}
                  </div>

                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: '22px 20px' }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif' }}>Quick Actions</h3>
                    <div className="prof-quick-actions">
                      {[
                        { icon: <ShoppingBag size={18} />, label: 'Shop Now',    action: () => router.push('/(tabs)') },
                        { icon: <ShoppingCart size={18} />, label: 'View Cart',   action: () => router.push('/cart') },
                        { icon: <WebEmoji style={{ fontSize: 18 }}>✏️</WebEmoji>, label: 'Edit Profile', action: () => router.push('/edit-profile') },
                        { icon: <LogOut size={18} />, label: 'Sign Out',    action: handleSignOut },
                      ].map(({ icon, label, action }) => (
                        <button key={label} onClick={action}
                          style={{ padding: '13px 10px', borderRadius: 14, border: `1px solid ${bord}`, background: bg, color: label === 'Sign Out' ? '#EF4444' : tp, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, transition: 'all 0.13s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = label === 'Sign Out' ? '#EF4444' : pri; (e.currentTarget as HTMLButtonElement).style.background = label === 'Sign Out' ? (isDark ? '#2D1515' : '#FFF0F0') : tint; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = bord; (e.currentTarget as HTMLButtonElement).style.background = bg; }}
                        >
                          <span style={{ fontSize: 18, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>{label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORDERS ── */}
              {activeTab === 'orders' && (
                <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: '22px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: pri, fontFamily: '"Plus Jakarta Sans", sans-serif', textTransform: 'uppercase' }}>HISTORY</p>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif' }}>All Orders</h3>
                    </div>
                    <span style={{ background: isDark ? '#2D1820' : '#FFF0F2', border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: pri, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{orders.length}</span>
                  </div>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ fontSize: 44, marginBottom: 14 }}><Package size={44} /></div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif', marginBottom: 8 }}>No orders yet</p>
                      <p style={{ fontSize: 12, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 20 }}>Start shopping to see your orders here.</p>
                      <button onClick={() => router.push('/(tabs)')} style={{ padding: '11px 22px', borderRadius: 12, border: `1.5px solid ${pri}`, background: 'none', color: pri, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Browse Products <ArrowRight size={12} /></button>
                    </div>
                  ) : orders.map(order => <OrderCard key={order.id} order={order} theme={theme} isDark={isDark} />)}
                </div>
              )}

              {/* ── MOOD HISTORY ── */}
              {activeTab === 'mood' && (
                <MoodHistoryTab moodHistory={moodHistory} moodCount={moodCount} pri={pri} tp={tp} ts={ts} card={card} bord={bord} isDark={isDark} />
              )}

              {/* ── SETTINGS ── */}
              {activeTab === 'settings' && (
                <div>
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: '22px 20px', marginBottom: 16 }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif' }}>Account Settings</h3>
                    <SettingsRow icon="✏️" label="Edit Profile"        sub="Update your name and phone number"  onPress={() => router.push('/edit-profile')} theme={theme} isDark={isDark} />
                    <SettingsRow icon="🔔" label="Notifications"       sub="Manage push and email alerts"       onPress={() => {}} theme={theme} isDark={isDark} />
                    <SettingsRow icon="🔒" label="Privacy & Security"  sub="Password and account security"     onPress={() => {}} theme={theme} isDark={isDark} />
                    <SettingsRow icon="🎨" label="App Preferences"     sub="Theme, mood reminders and more"    onPress={() => {}} theme={theme} isDark={isDark} />
                  </div>
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: '22px 20px', marginBottom: 16 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif' }}>Appearance</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: bg, border: `1px solid ${bord}`, borderRadius: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 16 }}>{isDark ? '🌙' : '☀️'}</span>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tp, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                          <p style={{ margin: 0, fontSize: 11, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Toggle interface theme</p>
                        </div>
                      </div>
                      <button onClick={toggleDark} style={{ width: 50, height: 27, borderRadius: 20, border: 'none', background: isDark ? pri : bord, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 2.5, left: isDark ? 24 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  </div>
                  <div style={{ background: card, border: `1px solid ${isDark ? '#4D2525' : '#FFE5E5'}`, borderRadius: 22, padding: '22px 20px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#EF4444', fontFamily: '"Playfair Display", serif' }}>Danger Zone</h3>
                    <button onClick={handleSignOut} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: `1.5px solid ${isDark ? '#4D2525' : '#FFE5E5'}`, background: isDark ? '#2D1515' : '#FFF5F5', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.13s' }}>
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </>
  );
}