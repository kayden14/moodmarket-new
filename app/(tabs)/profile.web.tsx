/**
 * app/profile.web.tsx — MoodMarket Profile (Web)
 * FIX: Mood history entries now always visible in both light and dark mode.
 *      Each entry uses its own mood-tinted background + explicit accent color text
 *      instead of the page background + inherited text color (which collapsed in light mode).
 * FIX 2: Mood label never shows "Unknown" — always falls back to the raw mood key value.
 * FIX 3: Robust mood key extraction — tries every common field name so "Unknown"
 *         is never shown when data exists under a different field.
 *         Logs unrecognized keys to console so you can identify the DB shape.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
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

/**
 * FIX 3: Extracts the mood key from an entry by trying every known field name.
 * Guards against garbage entries (URLs, "POST", numbers, booleans) that ended up
 * in mood_history due to a broken append_mood RPC call storing its own request metadata.
 * The confirmed DB field name is "mood_key" (from console logs).
 */
let _debugLogged = false;
function extractMoodKey(item: any): string {
  // Guard: skip non-objects — the DB has corrupted scalar values mixed in
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return '';
  }

  if (!_debugLogged) {
    console.log('[MoodMarket] MOOD ENTRY SAMPLE (raw DB shape):', JSON.stringify(item, null, 2));
    _debugLogged = true;
  }

  // mood_key is the confirmed field name from Supabase DB logs
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

  if (!key) {
    console.warn('[MoodMarket] Could not resolve mood key from entry:', JSON.stringify(item));
  } else if (!MOOD_META[key]) {
    console.warn('[MoodMarket] Unrecognized mood key:', JSON.stringify(key));
  }

  return key;
}

/**
 * FIX 2: label always resolves to something readable.
 * Priority: MOOD_META label → raw moodKey (the key itself IS the label when unknown)
 */
function getMoodMeta(key: string, isDark: boolean) {
  const m = MOOD_META[key] ?? {
    label: key || 'Unknown',
    color: '#0A7EA4',
    lightBg: '#E0F2FE',
    darkBg: '#0C2A38',
  };
  return {
    label: m.label || key || 'Unknown',
    color: m.color,
    bg: isDark ? m.darkBg : m.lightBg,
  };
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
    default:          return { label: status,      color: '#888',    bg: isDark ? '#222' : '#F5F5F5',    dot: '#888'    };
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
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px',
        background: theme.card,
        border: `1px solid ${hovered ? theme.primary : theme.border}`,
        borderRadius: 16, marginBottom: 8, cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? `0 4px 20px ${theme.primary}18` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: isDark ? '#2D1820' : '#FFF0F2',
        border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, flexShrink: 0,
      }}>🛍️</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>ORDER</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary, fontFamily: '"Sora", sans-serif', letterSpacing: 0.5 }}>#{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>📅 {date}</span>
          <span style={{ color: theme.border }}>·</span>
          <span style={{ fontSize: 11, color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>📦 {order.products.length} items</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: cfg.bg, borderRadius: 20, padding: '4px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, fontFamily: '"Sora", sans-serif', textTransform: 'capitalize' }}>{cfg.label}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: theme.primary, fontFamily: '"Sora", sans-serif', letterSpacing: -0.4 }}>
          GH₵ {Number(order.total_price).toFixed(2)}
        </span>
      </div>
      <span style={{ color: theme.inactive, fontSize: 16 }}>›</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon, theme, isDark }: {
  value: string; label: string; icon: string; theme: any; isDark: boolean;
}) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 16, padding: '20px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: isDark ? '#2D1820' : '#FFF0F2',
        border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: theme.textPrimary, fontFamily: '"Sora", sans-serif', letterSpacing: -0.8, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: theme.textSecondary, fontFamily: '"Sora", sans-serif', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

function SettingsRow({ icon, label, sub, onPress, theme, isDark }: {
  icon: string; label: string; sub: string; onPress: () => void; theme: any; isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', background: theme.card,
        border: `1px solid ${hovered ? theme.primary : theme.border}`,
        borderRadius: 14, cursor: 'pointer', transition: 'all 0.14s', marginBottom: 8,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: isDark ? '#1E1E2E' : '#FFF0F2',
        border: `1px solid ${isDark ? '#2A2A4A' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, fontFamily: '"Sora", sans-serif', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: theme.textSecondary, fontFamily: '"Sora", sans-serif' }}>{sub}</div>
      </div>
      <span style={{ color: theme.inactive, fontSize: 16 }}>›</span>
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
        padding: '9px 18px', borderRadius: 10,
        border: active ? `1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'}` : '1.5px solid transparent',
        background: active ? (isDark ? '#2D1820' : '#FFF0F2') : 'none',
        color: active ? theme.primary : theme.textSecondary,
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: '"Sora", sans-serif',
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
    <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: pri, fontFamily: '"Sora", sans-serif', textTransform: 'uppercase' }}>
            YOUR VIBES
          </p>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tp, fontFamily: '"Lora", serif' }}>
            Mood History
          </h3>
        </div>
        {moodCount > 0 && (
          <span style={{
            background: isDark ? '#2D1820' : '#FFF0F2',
            border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
            borderRadius: 20, padding: '2px 10px',
            fontSize: 12, fontWeight: 700, color: pri, fontFamily: '"Sora", sans-serif',
          }}>
            {moodCount} entries
          </span>
        )}
      </div>

      {/* Empty */}
      {moodCount === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <p style={{ fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Lora", serif', marginBottom: 8 }}>
            No mood entries yet
          </p>
          <p style={{ fontSize: 13, color: ts, fontFamily: '"Sora", sans-serif' }}>
            Your mood selections will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {moodHistory.map((item: any, i: number) => {
            // FIX 3: Use robust key extractor — tries all common field names
            const moodKey = extractMoodKey(item);
            const meta    = getMoodMeta(moodKey, isDark);
            const emoji   = getMoodEmoji(moodKey);

            // FIX 2: Resolution chain — never shows "Unknown" when key has a real value
            const label = item.label || meta.label || moodKey || 'Unknown';

            // Date field — try common field names
            const rawDate = item.date ?? item.created_at ?? item.recorded_at ?? item.logged_at ?? item.timestamp ?? '';
            const dateShort = rawDate
              ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '';
            const dateLong = rawDate
              ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : '';

            // Note field — try common field names
            const note = item.note ?? item.notes ?? item.comment ?? item.description ?? '';

            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: meta.bg,
                  border: `1.5px solid ${meta.color}40`,
                  borderRadius: 14, padding: '14px 16px',
                }}
              >
                {/* Emoji bubble */}
                <div style={{
                  width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                  background: isDark ? `${meta.color}22` : `${meta.color}18`,
                  border: `1.5px solid ${meta.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 14, fontWeight: 700,
                    color: meta.color,
                    fontFamily: '"Sora", sans-serif', marginBottom: 3,
                  }}>
                    {label}
                  </span>
                  {dateLong && (
                    <span style={{
                      display: 'block', fontSize: 11,
                      color: isDark ? '#94A3B8' : '#475569',
                      fontFamily: '"Sora", sans-serif',
                      marginBottom: note ? 5 : 0,
                    }}>
                      🗓 {dateLong}
                    </span>
                  )}
                  {!!note && (
                    <span style={{
                      display: 'block', fontSize: 12,
                      color: isDark ? '#94A3B8' : '#475569',
                      fontFamily: '"Sora", sans-serif',
                      fontStyle: 'italic', lineHeight: 1.55,
                    }}>
                      "{note}"
                    </span>
                  )}
                </div>

                {/* Date badge */}
                {dateShort && (
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: meta.color,
                      background: isDark ? `${meta.color}22` : `${meta.color}15`,
                      padding: '3px 9px', borderRadius: 8,
                      whiteSpace: 'nowrap',
                      border: `1px solid ${meta.color}40`,
                      fontFamily: '"Sora", sans-serif',
                    }}>
                      {dateShort}
                    </span>
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
  const { user, profile, signOut } = useAuth();
  const { theme, isDark, toggleDark } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [adminTaps, setAdminTaps] = useState(0);

  const moodHistory: any[] = (() => {
    const mh = profile?.mood_history;
    let raw: any[] = [];
    if (!mh) return [];
    if (Array.isArray(mh)) raw = mh;
    else if (typeof mh === 'object') raw = Object.values(mh);
    // Filter out garbage entries (strings, numbers, booleans, URLs)
    // that ended up in the array due to broken append_mood RPC calls
    return raw.filter(e => e && typeof e === 'object' && !Array.isArray(e));
  })();
  const moodCount = moodHistory.length;

  // Reset debug log flag when profile changes so we always get a fresh sample
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

  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const pri  = theme.primary;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;
  const inact = theme.inactive;

  const totalSpend     = orders.reduce((s, o) => s + Number(o.total_price), 0);
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const initials       = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-family: "Sora", sans-serif; }
        body { min-height: 100%; font-family: "Sora", sans-serif; overflow-y: auto; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        .prof-app { min-height: 100vh; background: ${bg}; display: flex; flex-direction: column; color: ${tp}; overflow-y: auto; }

        .prof-topnav { height: 58px; background: ${card}; border-bottom: 1px solid ${bord}; display: flex; align-items: center; padding: 0 40px; gap: 16px; position: sticky; top: 0; z-index: 100; }
        .prof-back { background: none; border: 1px solid ${bord}; border-radius: 9px; padding: 7px 14px; font-size: 13px; font-weight: 600; color: ${ts}; cursor: pointer; font-family: "Sora", sans-serif; transition: all 0.15s; }
        .prof-back:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }
        .prof-logo { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: ${tp}; letter-spacing: -0.3; cursor: pointer; transition: opacity 0.13s; margin-right: auto; }
        .prof-logo:hover { opacity: 0.8; }
        .prof-logo span { color: ${pri}; }

        .prof-body { max-width: 1100px; margin: 0 auto; width: 100%; padding: 40px 40px 80px; display: grid; grid-template-columns: 280px 1fr; gap: 28px; align-items: start; }

        .prof-sidebar { position: sticky; top: 78px; display: flex; flex-direction: column; gap: 12px; }
        .prof-avatar-card { background: ${card}; border: 1px solid ${bord}; border-radius: 22px; padding: 28px 24px; text-align: center; }
        .prof-avatar { width: 72px; height: 72px; border-radius: 20px; background: ${pri}; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fff; font-family: "Sora", sans-serif; letter-spacing: -0.5px; }
        .prof-name  { font-size: 17px; font-weight: 700; color: ${tp}; font-family: "Lora", serif; letter-spacing: -0.2px; margin-bottom: 4px; }
        .prof-email { font-size: 12px; color: ${inact}; font-family: "Sora", sans-serif; margin-bottom: 18px; }
        .prof-edit-btn { width: 100%; height: 38px; border-radius: 10px; border: 1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'}; background: ${isDark ? '#2D1820' : '#FFF0F2'}; color: ${pri}; font-size: 13px; font-weight: 700; cursor: pointer; font-family: "Sora", sans-serif; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.14s; }
        .prof-edit-btn:hover { opacity: 0.8; }

        .prof-sidenav { background: ${card}; border: 1px solid ${bord}; border-radius: 18px; overflow: hidden; }
        .prof-sidenav-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; cursor: pointer; border-bottom: 1px solid ${bord}; transition: background 0.12s; font-size: 13px; font-weight: 600; color: ${ts}; font-family: "Sora", sans-serif; }
        .prof-sidenav-item:last-child { border-bottom: none; }
        .prof-sidenav-item:hover { background: ${tint}; }
        .prof-sidenav-item.active { color: ${pri}; background: ${isDark ? '#2D1820' : '#FFF0F2'}; }
        .prof-sidenav-icon  { font-size: 15px; }
        .prof-sidenav-arrow { margin-left: auto; color: ${inact}; }

        .prof-tabs { display: flex; gap: 6px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px; }
        .prof-tabs::-webkit-scrollbar { height: 0; }

        @media (max-width: 900px) {
          .prof-body { grid-template-columns: 1fr; padding: 24px 24px 60px; }
          .prof-sidebar { position: static; flex-direction: row; flex-wrap: wrap; }
          .prof-avatar-card { flex: 1 1 260px; }
          .prof-sidenav { display: none; }
          .prof-topnav { padding: 0 24px; }
        }
        @media (max-width: 600px) {
          .prof-body { padding: 16px 16px 60px; }
          .prof-topnav { padding: 0 16px; }
        }
      `}</style>

      <div className="prof-app">

        {/* TOP NAV */}
        <nav className="prof-topnav">
          <button className="prof-back" onClick={() => router.back()}>← Back</button>
          <span className="prof-logo" onClick={handleLogoClick}>Mood<span>Market</span></span>
          <button
            style={{ background: 'none', border: `1px solid ${bord}`, borderRadius: 9, width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onClick={toggleDark}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </nav>

        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: 90, height: 90, borderRadius: 24, margin: '0 auto 24px', background: isDark ? '#2D1820' : '#FFF0F2', border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>👤</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: tp, fontFamily: '"Lora", serif', marginBottom: 10 }}>You're not signed in</h2>
            <p style={{ fontSize: 14, color: ts, lineHeight: 1.65, marginBottom: 28, fontFamily: '"Sora", sans-serif', maxWidth: 320 }}>Log in to view your profile, orders, and mood history.</p>
            <button onClick={() => router.push('/login')} style={{ padding: '14px 32px', borderRadius: 14, border: 'none', background: pri, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"Sora", sans-serif', boxShadow: `0 6px 20px ${pri}44` }}>Sign In →</button>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: inact, fontSize: 14, fontFamily: '"Sora", sans-serif' }}>
            Loading profile…
          </div>
        ) : (
          <div className="prof-body">

            {/* SIDEBAR */}
            <aside className="prof-sidebar">
              <div className="prof-avatar-card">
                <div className="prof-avatar">{initials}</div>
                <p className="prof-name">{profile?.name ?? 'User'}</p>
                <p className="prof-email">{profile?.email}</p>
                <button className="prof-edit-btn" onClick={() => router.push('/edit-profile')}>✏ Edit Profile</button>
              </div>
              <div className="prof-sidenav">
                {[
                  { key: 'overview', icon: '📊', label: 'Overview'     },
                  { key: 'orders',   icon: '📦', label: 'Orders'       },
                  { key: 'mood',     icon: '✨', label: 'Mood History' },
                  { key: 'settings', icon: '⚙️', label: 'Settings'     },
                ].map(item => (
                  <div key={item.key} className={`prof-sidenav-item${activeTab === item.key ? ' active' : ''}`} onClick={() => setActiveTab(item.key as Tab)}>
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
                  { key: 'overview', label: '📊 Overview' },
                  { key: 'orders',   label: `📦 Orders (${orders.length})` },
                  { key: 'mood',     label: `✨ Mood History (${moodCount})` },
                  { key: 'settings', label: '⚙️ Settings' },
                ].map(t => (
                  <TabBtn key={t.key} active={activeTab === t.key as Tab} onClick={() => setActiveTab(t.key as Tab)} theme={theme} isDark={isDark}>
                    {t.label}
                  </TabBtn>
                ))}
              </div>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
                    <StatCard value={String(orders.length)}           label="Total orders"  icon="📦" theme={theme} isDark={isDark} />
                    <StatCard value={String(deliveredCount)}          label="Delivered"     icon="✅" theme={theme} isDark={isDark} />
                    <StatCard value={`GH₵${totalSpend.toFixed(0)}`}  label="Total spent"   icon="💰" theme={theme} isDark={isDark} />
                    <StatCard value={String(moodCount)}               label="Mood entries"  icon="✨" theme={theme} isDark={isDark} />
                  </div>
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: 28, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Lora", serif', letterSpacing: -0.3 }}>Recent Orders</h3>
                      <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', color: pri, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '"Sora", sans-serif' }}>View all →</button>
                    </div>
                    {orders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
                        <p style={{ fontSize: 14, color: ts, fontFamily: '"Sora", sans-serif' }}>No orders yet</p>
                      </div>
                    ) : orders.slice(0, 3).map(order => <OrderCard key={order.id} order={order} theme={theme} isDark={isDark} />)}
                  </div>
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: 28 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Lora", serif' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                      {[
                        { icon: '🛍️', label: 'Shop Now',    action: () => router.push('/(tabs)') },
                        { icon: '🛒', label: 'View Cart',   action: () => router.push('/cart') },
                        { icon: '✏️', label: 'Edit Profile', action: () => router.push('/edit-profile') },
                        { icon: '🚪', label: 'Sign Out',    action: handleSignOut },
                      ].map(({ icon, label, action }) => (
                        <button key={label} onClick={action} style={{ padding: '14px 12px', borderRadius: 14, border: `1px solid ${bord}`, background: bg, color: label === 'Sign Out' ? '#EF4444' : tp, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '"Sora", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.13s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = label === 'Sign Out' ? '#EF4444' : pri; (e.currentTarget as HTMLButtonElement).style.background = label === 'Sign Out' ? (isDark ? '#2D1515' : '#FFF0F0') : tint; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = bord; (e.currentTarget as HTMLButtonElement).style.background = bg; }}
                        >
                          <span style={{ fontSize: 20 }}>{icon}</span>{label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORDERS ── */}
              {activeTab === 'orders' && (
                <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: pri, fontFamily: '"Sora", sans-serif', textTransform: 'uppercase' }}>HISTORY</p>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tp, fontFamily: '"Lora", serif' }}>All Orders</h3>
                    </div>
                    <span style={{ background: isDark ? '#2D1820' : '#FFF0F2', border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: pri, fontFamily: '"Sora", sans-serif' }}>{orders.length}</span>
                  </div>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Lora", serif', marginBottom: 8 }}>No orders yet</p>
                      <p style={{ fontSize: 13, color: ts, fontFamily: '"Sora", sans-serif', marginBottom: 24 }}>Start shopping to see your orders here.</p>
                      <button onClick={() => router.push('/(tabs)')} style={{ padding: '12px 24px', borderRadius: 12, border: `1.5px solid ${pri}`, background: 'none', color: pri, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"Sora", sans-serif' }}>Browse Products →</button>
                    </div>
                  ) : orders.map(order => <OrderCard key={order.id} order={order} theme={theme} isDark={isDark} />)}
                </div>
              )}

              {/* ── MOOD HISTORY ── */}
              {activeTab === 'mood' && (
                <MoodHistoryTab
                  moodHistory={moodHistory}
                  moodCount={moodCount}
                  pri={pri} tp={tp} ts={ts}
                  card={card} bord={bord}
                  isDark={isDark}
                />
              )}

              {/* ── SETTINGS ── */}
              {activeTab === 'settings' && (
                <div>
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: 28, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: tp, fontFamily: '"Lora", serif' }}>Account Settings</h3>
                    <SettingsRow icon="✏️" label="Edit Profile"        sub="Update your name and phone number"  onPress={() => router.push('/edit-profile')} theme={theme} isDark={isDark} />
                    <SettingsRow icon="🔔" label="Notifications"       sub="Manage push and email alerts"       onPress={() => {}} theme={theme} isDark={isDark} />
                    <SettingsRow icon="🔒" label="Privacy & Security"  sub="Password and account security"     onPress={() => {}} theme={theme} isDark={isDark} />
                    <SettingsRow icon="🎨" label="App Preferences"     sub="Theme, mood reminders and more"    onPress={() => {}} theme={theme} isDark={isDark} />
                  </div>
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 22, padding: 28, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700, color: tp, fontFamily: '"Lora", serif' }}>Appearance</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: bg, border: `1px solid ${bord}`, borderRadius: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</span>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tp, fontFamily: '"Sora", sans-serif' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                          <p style={{ margin: 0, fontSize: 12, color: ts, fontFamily: '"Sora", sans-serif' }}>Toggle interface theme</p>
                        </div>
                      </div>
                      <button onClick={toggleDark} style={{ width: 52, height: 28, borderRadius: 20, border: 'none', background: isDark ? pri : bord, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: 3, left: isDark ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  </div>
                  <div style={{ background: card, border: `1px solid ${isDark ? '#4D2525' : '#FFE5E5'}`, borderRadius: 22, padding: 28 }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700, color: '#EF4444', fontFamily: '"Lora", serif' }}>Danger Zone</h3>
                    <button onClick={handleSignOut} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: `1.5px solid ${isDark ? '#4D2525' : '#FFE5E5'}`, background: isDark ? '#2D1515' : '#FFF5F5', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"Sora", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.13s' }}>
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