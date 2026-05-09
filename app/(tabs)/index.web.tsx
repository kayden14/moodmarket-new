/**
 * app/(tabs)/index.web.tsx  — MoodMarket Home Screen (Web)
 *
 * RESPONSIVE OVERHAUL — works across:
 *   • 4K / large desktop  ≥1400px  — wide sidebar, 5-col grid
 *   • Desktop             1100–1399px — sidebar, 4-col grid
 *   • Laptop              900–1099px  — sidebar, 3-col grid
 *   • Tablet landscape    700–899px   — sidebar collapses to overlay drawer
 *   • Tablet portrait     540–699px   — no sidebar, 2-col grid
 *   • Large phone         400–539px   — no sidebar, 2-col grid
 *   • Small phone         <400px      — no sidebar, 2-col grid, minimal topnav
 *
 * MOBILE NAVBAR UPDATE:
 * - On ≤700px: profile avatar, dark mode toggle, and notifications are
 *   collapsed into a single avatar button that opens an animated dropdown
 * - Dropdown contains: user name/email, profile link, notifications (with badge),
 *   dark/light mode toggle, and current mood display
 * - Dropdown closes on outside click or item selection
 * - Re-scan button hidden on mobile to reduce clutter
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme, MoodKey, MOOD_PALETTES } from '@/contexts/ThemeContext';
import { getRecommendations, getTrending, ScoredProduct } from '@/lib/recommendations';
import { NotificationService } from '@/lib/notifications';
import { useMoodDetection } from '@/lib/mood-detection';

/* ─────────────────────────────── constants ─────────────────────────────── */

const MOODS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: 'happy',   emoji: '😊', label: 'Happy'   },
  { key: 'calm',    emoji: '😌', label: 'Calm'     },
  { key: 'excited', emoji: '🤩', label: 'Excited'  },
  { key: 'sad',     emoji: '😢', label: 'Sad'      },
  { key: 'angry',   emoji: '😠', label: 'Angry'    },
  { key: 'tired',   emoji: '😴', label: 'Tired'    },
  { key: 'anxious', emoji: '😰', label: 'Anxious'  },
  { key: 'neutral', emoji: '😐', label: 'Neutral'  },
];

const CATEGORIES = [
  { id: 'all',         label: 'All Products',  emoji: '⊞',  keywords: [] as string[] },
  { id: 'self-care',   label: 'Self Care',      emoji: '✦',  keywords: ['self-care','self care','skincare','skin care','beauty','moisturiser','moisturizer','cleanser','serum','toner','face','body','lotion','soap','scrub','bath','hygiene','wellness','nurturing','soothing','pamper'] },
  { id: 'food',        label: 'Food & Drink',   emoji: '◈',  keywords: ['food','snack','drink','tea','coffee','chocolate','candy','sweet','beverage','juice','smoothie','protein','supplement','vitamin','nutrition','healthy','organic','herbal','cocoa','honey','granola','cookie','biscuit','fruit','nut'] },
  { id: 'books',       label: 'Books',          emoji: '⬡',  keywords: ['book','novel','journal','diary','planner','notebook','magazine','guide','read','fiction','non-fiction','poetry','motivational','self-help','mindfulness','spiritual','educational'] },
  { id: 'accessories', label: 'Accessories',    emoji: '◇',  keywords: ['accessory','accessories','jewellery','jewelry','bracelet','necklace','ring','earring','bag','purse','wallet','watch','sunglasses','hat','scarf','belt','keychain','pin','charm','crystal','stone','gem'] },
  { id: 'relaxation',  label: 'Relaxation',     emoji: '◯',  keywords: ['relaxation','relax','calm','candle','aromatherapy','diffuser','essential oil','massage','yoga','meditation','pillow','blanket','sleep','rest','stress','anxiety','zen','peaceful','spa','bath bomb','incense','music','sound','breathing'] },
];

function getProductImage(product: Product): string {
  if (product.image && product.image.startsWith('http')) return product.image;
  const seed = product.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${seed}/400/400`;
}

/* ─────────────────────────────── mood save helper ──────────────────────── */

async function saveMoodToHistory(userId: string, moodKey: MoodKey, label: string): Promise<void> {
  try {
    const { data, error: fetchErr } = await supabase
      .from('profiles').select('mood_history').eq('id', userId).single();
    if (fetchErr) { console.warn('[MoodHistory] fetch error:', fetchErr.message); return; }

    let existing: any[] = [];
    const raw = data?.mood_history;
    if (Array.isArray(raw)) {
      existing = raw.filter(e => e && typeof e === 'object' && !Array.isArray(e) && e.mood_key);
    } else if (raw && typeof raw === 'object') {
      existing = Object.values(raw).filter((e: any) => e?.mood_key);
    }

    const updated = [...existing, { mood_key: moodKey, label, date: new Date().toISOString() }];

    const { error: saveErr } = await supabase.from('profiles').update({ mood_history: updated }).eq('id', userId);
    if (saveErr) console.warn('[MoodHistory] save error:', saveErr.message);
    else console.log(`[MoodHistory] Saved "${label}" — total: ${updated.length}`);
  } catch (err: any) {
    console.warn('[MoodHistory] unexpected error:', err.message);
  }
}

/* ─────────────────────────────── sub-components ────────────────────────── */

function ProductCard({ item, onPress, onAddToCart }: {
  item: ScoredProduct | Product;
  onPress: () => void;
  onAddToCart: (p: Product) => void;
}) {
  const { theme } = useTheme();
  const [liked, setLiked]     = useState(false);
  const [adding, setAdding]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const stars = Math.round((item as Product).rating ?? 0);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    await onAddToCart(item as Product);
    setAdding(false);
  };

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.card,
        border: `1px solid ${hovered ? theme.secondary : theme.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px ${theme.secondary}22`
          : '0 1px 4px rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: theme.tint }}>
        <Image
          source={{ uri: getProductImage(item as Product) }}
          style={{ width: '100%', height: '100%' } as any}
          contentFit="cover"
          transition={200}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.03)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }} />
        <button
          onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 34, height: 34, borderRadius: '50%',
            background: liked ? theme.primary : 'rgba(255,255,255,0.92)',
            border: `1px solid ${liked ? theme.primary : 'rgba(0,0,0,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 14,
            transition: 'all 0.15s ease',
            transform: hovered ? 'scale(1)' : 'scale(0.88)',
            opacity: hovered || liked ? 1 : 0,
          }}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          {liked ? '♥' : '♡'}
        </button>
        {'reason' in item && (item as ScoredProduct).reason && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: theme.primary,
            borderRadius: 6,
            padding: '4px 10px', fontSize: 11, fontWeight: 600,
            color: '#fff', letterSpacing: 0.3,
          }}>
            {(item as ScoredProduct).reason}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.4, letterSpacing: -0.2 }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ fontSize: 12, color: i <= stars ? '#F59E0B' : theme.border, lineHeight: 1 }}>
              {i <= stars ? '★' : '☆'}
            </span>
          ))}
          <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 3 }}>
            {(item as Product).rating?.toFixed(1)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.5, fontFamily: '"Sora", sans-serif' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: theme.textSecondary }}>GH₵ </span>
            {(item as Product).price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{
              height: 34, borderRadius: 8,
              background: hovered ? theme.primary : theme.tint,
              border: `1px solid ${hovered ? theme.primary : theme.secondary}`,
              color: hovered ? '#fff' : theme.primary,
              fontSize: 12, fontWeight: 600,
              cursor: adding ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0 12px',
              opacity: adding ? 0.6 : 1,
              transition: 'all 0.18s ease',
              fontFamily: '"Sora", sans-serif',
              whiteSpace: 'nowrap',
            }}
            aria-label="Add to cart"
          >
            {adding ? '...' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrendingCard({ item, onPress, onAddToCart }: {
  item: ScoredProduct; onPress: () => void; onAddToCart: (p: Product) => void;
}) {
  const { theme } = useTheme();
  const [adding, setAdding]   = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 var(--trending-card-w, 200px)',
        minWidth: 'var(--trending-card-w, 200px)',
        borderRadius: 14, overflow: 'hidden',
        background: theme.card, border: `1px solid ${hovered ? theme.secondary : theme.border}`,
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
        scrollSnapAlign: 'start',
      }}
    >
      <div style={{ position: 'relative', height: 'var(--trending-img-h, 140px)' as any }}>
        <Image
          source={{ uri: getProductImage(item) }}
          style={{ width: '100%', height: '100%' } as any}
          contentFit="cover" transition={200}
        />
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: '#EF4444',
          borderRadius: 5,
          padding: '3px 8px', fontSize: 10, fontWeight: 700,
          color: '#fff', letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>Hot</div>
      </div>
      <div style={{ padding: '11px 12px 12px' }}>
        <p style={{
          margin: '0 0 8px',
          fontSize: 'var(--trending-name-fs, 13px)' as any,
          fontWeight: 600,
          color: theme.textPrimary,
          lineHeight: 1.35,
          letterSpacing: -0.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 'var(--trending-price-fs, 15px)' as any,
            fontWeight: 700,
            color: theme.textPrimary,
            letterSpacing: -0.3,
            fontFamily: '"Sora", sans-serif',
            flexShrink: 0,
          }}>
            GH₵{item.price.toFixed(2)}
          </span>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (adding) return;
              setAdding(true);
              await onAddToCart(item);
              setAdding(false);
            }}
            style={{
              height: 'var(--trending-btn-h, 30px)' as any,
              borderRadius: 7,
              background: theme.primary,
              border: 'none',
              color: '#fff',
              fontSize: 'var(--trending-btn-fs, 12px)' as any,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 var(--trending-btn-px, 11px)' as any,
              transition: 'opacity 0.15s',
              fontFamily: '"Sora", sans-serif',
              flexShrink: 0,
              opacity: adding ? 0.6 : 1,
            }}
          >
            {adding ? '…' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartToast({ count, total, visible, onPress }: {
  count: number; total: number; visible: boolean; onPress: () => void;
}) {
  return (
    <div
      onClick={onPress}
      style={{
        position: 'fixed', bottom: 24, right: 16,
        background: '#111',
        borderRadius: 12,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.22s ease',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.95)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🛒</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: -0.2 }}>Added to cart</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>
          {count} {count === 1 ? 'item' : 'items'} · GH₵{total.toFixed(2)}
        </div>
      </div>
      <div style={{ marginLeft: 6, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 10, flexShrink: 0 }}>
        View →
      </div>
    </div>
  );
}

/* ─────────────────────────────── main page ─────────────────────────────── */

export default function HomeScreenWeb() {
  const router = useRouter();
  const { profile, user }                   = useAuth();
  const { addToCart, cartCount, cartTotal } = useCart();
  const { theme, mood, setMood, moodPalette, isDark, toggleDark } = useTheme();

  const [allProducts, setAllProducts]           = useState<Product[]>([]);
  const [recommended, setRecommended]           = useState<ScoredProduct[]>([]);
  const [trending, setTrending]                 = useState<ScoredProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery]           = useState('');
  const [snapVisible, setSnapVisible]           = useState(false);
  const [showAllRecs, setShowAllRecs]           = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [isDesktop, setIsDesktop]               = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [unreadCount, setUnreadCount]           = useState(0);
  const [moreMenuOpen, setMoreMenuOpen]         = useState(false);

  const snapTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allProductsRef = useRef<HTMLElement | null>(null);
  const moreMenuRef    = useRef<HTMLDivElement | null>(null);

  // How many recs to show in the collapsed grid before "See all"
  const REC_PREVIEW = 10;

  const selectedMood = MOODS.find(m => m.key === mood) ?? MOODS[7];

  /* ── Detect viewport size ─────────────────────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const update = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setSidebarOpen(false);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /* ── Close more menu on outside click ────────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Passive ambient mood detection ───────────────────────────────────── */
  const handleMoodDetected = useCallback((detectedMood: MoodKey) => {
    setMood(detectedMood);
    const meta = MOODS.find(m => m.key === detectedMood);
    if (profile?.id && meta) {
      NotificationService.moodSelected(profile.id, meta.label, meta.emoji);
      saveMoodToHistory(profile.id, detectedMood, meta.label);
    }
  }, [setMood, profile?.id]);

  const { detecting, permissionDenied, rescan } = useMoodDetection({ onMoodDetected: handleMoodDetected });

  /* ── Manual mood selector ─────────────────────────────────────────────── */
  const handleMoodSelect = useCallback(async (m: typeof MOODS[number]) => {
    setMood(m.key);
    if (!isDesktop) setSidebarOpen(false);
    if (profile?.id) {
      NotificationService.moodSelected(profile.id, m.label, m.emoji);
      await saveMoodToHistory(profile.id, m.key, m.label);
    }
  }, [profile?.id, setMood, isDesktop]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) {
      setAllProducts(data);
      setFilteredProducts(data);
      const [recs, trend] = await Promise.all([
        getRecommendations(user?.id, mood, data, 50),
        getTrending(data, 12),
      ]);
      setRecommended(recs);
      setTrending(trend);
    }
    setLoading(false);
  }, [user?.id, mood]);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (allProducts.length === 0) return;
    getRecommendations(user?.id, mood, allProducts, 50).then(setRecommended);
  }, [mood, allProducts]);

  useEffect(() => {
    let result = allProducts;
    if (selectedCategory !== 'all') {
      const cat = CATEGORIES.find(c => c.id === selectedCategory);
      const keywords = cat?.keywords ?? [selectedCategory];
      result = result.filter(p => {
        const name = p.name.toLowerCase();
        const desc = ((p as any).description ?? '').toLowerCase();
        const tags = (p.mood_tags ?? []).map((t: string) => t.toLowerCase());
        return keywords.some(kw => name.includes(kw) || desc.includes(kw) || tags.some(tag => tag.includes(kw)));
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || ((p as any).description ?? '').toLowerCase().includes(q));
    }
    setFilteredProducts(result);
  }, [selectedCategory, allProducts, searchQuery]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const channel = supabase
      .channel('notifications-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleAddToCart = async (product: Product) => {
    await addToCart(product.id, 1);
    setSnapVisible(true);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => setSnapVisible(false), 3000);
    if (user?.id) NotificationService.send('Added!', `${product.name} added to cart.`);
  };

  const firstName = profile?.name?.split(' ')[0] ?? null;
  const initials  = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const pri  = theme.primary;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;
  const inact = theme.inactive;

  if (loading) {
    return (
      <div style={{ height: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: '"Sora", sans-serif' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {selectedMood.emoji}
        </div>
        <p style={{ color: ts, fontSize: 14, margin: 0, fontWeight: 500 }}>Loading your mood feed…</p>
      </div>
    );
  }

  const sidebarWidth = 240;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { background: ${bg}; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        /* ═══════════════════════════════════
           APP SHELL
        ═══════════════════════════════════ */
        .mm-app {
          height: 100vh;
          background: ${bg};
          font-family: "Sora", sans-serif;
          color: ${tp};
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ═══════════════════════════════════
           TOP NAV
        ═══════════════════════════════════ */
        .mm-topnav {
          position: sticky; top: 0; z-index: 300;
          height: 60px;
          background: ${card};
          border-bottom: 1px solid ${bord};
          display: flex; align-items: center;
          padding: 0 24px; gap: 12px;
          flex-shrink: 0;
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
        }

        .mm-logo {
          display: flex; align-items: center; gap: 9px;
          flex-shrink: 0; text-decoration: none; cursor: pointer;
        }
        .mm-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: ${pri};
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex-shrink: 0;
        }
        .mm-logo-text {
          font-family: "Lora", serif; font-size: 19px;
          font-weight: 600; color: ${tp}; letter-spacing: -0.4px;
        }
        .mm-logo-text em { font-style: italic; color: ${pri}; }

        /* ── Inline search (desktop/laptop) ── */
        .mm-topnav-search {
          flex: 1; max-width: 480px; position: relative;
        }
        .mm-topnav-search input {
          width: 100%; height: 38px;
          background: ${bg}; border: 1px solid ${bord};
          border-radius: 9px; padding: 0 14px 0 38px;
          font-size: 13.5px; font-family: "Sora", sans-serif;
          color: ${tp}; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .mm-topnav-search input:focus {
          border-color: ${pri}; box-shadow: 0 0 0 3px ${pri}18;
        }
        .mm-topnav-search input::placeholder { color: ${ts}; }
        .mm-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); font-size: 14px;
          color: ${ts}; pointer-events: none;
        }

        /* ── Mobile drop-down search bar ── */
        .mm-mobile-search {
          background: ${card};
          border-bottom: 1px solid ${bord};
          padding: 8px 14px;
          z-index: 299;
          flex-shrink: 0;
          position: relative;
        }
        .mm-mobile-search input {
          width: 100%; height: 40px;
          background: ${bg}; border: 1px solid ${bord};
          border-radius: 9px; padding: 0 14px 0 38px;
          font-size: 14px; font-family: "Sora", sans-serif;
          color: ${tp}; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .mm-mobile-search input:focus {
          border-color: ${pri}; box-shadow: 0 0 0 3px ${pri}18;
        }
        .mm-mobile-search input::placeholder { color: ${ts}; }
        .mm-mobile-search-icon {
          position: absolute; left: 25px; top: 50%;
          transform: translateY(-50%); font-size: 14px;
          color: ${ts}; pointer-events: none;
        }

        /* ── Action group ── */
        .mm-topnav-actions {
          display: flex; align-items: center;
          gap: 8px; margin-left: auto; flex-shrink: 0;
        }

        /* ── Icon buttons ── */
        .mm-icon-btn {
          height: 38px; min-width: 38px;
          border-radius: 9px;
          background: transparent; border: 1px solid ${bord};
          color: ${ts}; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 6px; font-size: 13px; font-weight: 500;
          font-family: "Sora", sans-serif;
          transition: all 0.15s; white-space: nowrap;
          padding: 0 12px; position: relative;
          flex-shrink: 0;
        }
        .mm-icon-btn:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }
        .mm-icon-btn:disabled { opacity: 0.6; cursor: default; }

        /* Search-toggle icon: hidden on wide screens, shown on narrow */
        .mm-search-toggle { display: none; }

        .mm-btn-primary {
          height: 38px; padding: 0 14px; border-radius: 9px;
          background: ${pri}; border: 1px solid ${pri};
          font-size: 13px; font-weight: 600;
          font-family: "Sora", sans-serif; color: #fff;
          cursor: pointer; display: flex; align-items: center;
          gap: 6px; transition: opacity 0.15s; white-space: nowrap;
        }
        .mm-btn-primary:hover { opacity: 0.88; }

        .mm-cart-badge {
          position: absolute; top: -5px; right: -5px;
          background: ${pri}; color: #fff;
          width: 18px; height: 18px; border-radius: 50%;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid ${card};
        }
        .mm-notif-badge {
          position: absolute; top: -5px; right: -5px;
          background: #EF4444; color: #fff;
          min-width: 18px; height: 18px; border-radius: 9px;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid ${card}; padding: 0 3px;
          animation: mm-badge-pop 0.3s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes mm-badge-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes mm-spin { to { transform: rotate(360deg); } }
        .mm-spinner {
          width: 16px; height: 16px;
          border: 2px solid ${moodPalette.secondary};
          border-top-color: ${moodPalette.primary};
          border-radius: 50%;
          animation: mm-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .mm-avatar {
          width: 36px; height: 36px;
          background: ${pri}; color: #fff;
          font-size: 12px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; border-radius: 50%;
          border: 1px solid ${bord}; flex-shrink: 0;
          transition: all 0.15s;
        }
        .mm-avatar:hover { border-color: ${pri}; box-shadow: 0 0 0 2px ${pri}30; }

        .mm-burger { flex-direction: column; gap: 4px; padding: 0 10px; min-width: 42px; border: none; }
        .mm-burger span {
          display: block; height: 1.5px;
          border-radius: 2px; background: ${ts};
          transition: all 0.2s; width: 18px;
        }
        .mm-burger:hover span { background: ${pri}; }

        /* ═══════════════════════════════════
           DESKTOP/MOBILE VISIBILITY HELPERS
        ═══════════════════════════════════ */
        .mm-desktop-only { display: flex; }
        .mm-mobile-only  { display: none; }

        /* ═══════════════════════════════════
           MORE DROPDOWN (mobile/tablet)
        ═══════════════════════════════════ */
        .mm-more-menu-wrap {
          position: relative;
        }

        .mm-more-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 240px;
          background: ${card};
          border: 1px solid ${bord};
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10);
          z-index: 500;
          overflow: hidden;
          animation: mm-dropdown-in 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
          transform-origin: top right;
        }

        @keyframes mm-dropdown-in {
          from { opacity: 0; transform: scale(0.90) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }

        .mm-more-header {
          padding: 16px 16px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mm-more-header-avatar {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: ${pri};
          color: #fff;
          font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          border: 2px solid ${tint};
        }

        .mm-more-header-info {
          min-width: 0;
        }

        .mm-more-header-name {
          font-size: 13.5px;
          font-weight: 600;
          color: ${tp};
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mm-more-header-email {
          font-size: 11px;
          color: ${ts};
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mm-more-divider {
          height: 1px;
          background: ${bord};
          margin: 2px 0;
        }

        .mm-more-item {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: "Sora", sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: ${tp};
          text-align: left;
          transition: background 0.12s;
          min-height: 48px;
          position: relative;
        }
        .mm-more-item:hover { background: ${bg}; }
        .mm-more-item:active { background: ${tint}; }

        .mm-more-item-icon {
          font-size: 18px;
          width: 26px;
          text-align: center;
          flex-shrink: 0;
        }

        .mm-more-item-label {
          flex: 1;
          min-width: 0;
        }

        .mm-more-item-sub {
          font-size: 11px;
          color: ${ts};
          margin-top: 1px;
          font-weight: 400;
        }

        .mm-more-badge {
          background: #EF4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          flex-shrink: 0;
        }

        .mm-more-mood-row {
          padding: 12px 16px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mm-more-mood-pip {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: ${tint};
          border: 1px solid ${bord};
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .mm-more-mood-info {}

        .mm-more-mood-label {
          font-size: 13px;
          font-weight: 600;
          color: ${tp};
          letter-spacing: -0.2px;
        }

        .mm-more-mood-sub {
          font-size: 10.5px;
          color: ${ts};
          margin-top: 1px;
          font-weight: 400;
        }

        /* toggle pill inside dropdown */
        .mm-toggle-pill {
          margin-left: auto;
          width: 40px; height: 22px;
          border-radius: 11px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
          background: ${pri};
        }
        .mm-toggle-pill-knob {
          position: absolute;
          top: 3px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #fff;
          transition: left 0.2s cubic-bezier(0.34,1.3,0.64,1);
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        }

        /* ═══════════════════════════════════
           BODY CONTAINER
        ═══════════════════════════════════ */
        .mm-body {
          display: flex; flex: 1;
          min-height: 0; overflow: hidden;
          position: relative;
        }

        /* ═══════════════════════════════════
           SIDEBAR
        ═══════════════════════════════════ */
        .mm-overlay {
          display: none;
          position: fixed; inset: 0; z-index: 400;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          animation: mm-fade-in 0.2s ease;
        }
        @keyframes mm-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .mm-sidebar {
          background: ${card};
          border-right: 1px solid ${bord};
          overflow-y: auto;
          overflow-x: hidden;
          z-index: 401;
          flex-shrink: 0;
        }
        .mm-sidebar-inner { width: ${sidebarWidth}px; padding: 20px 0 80px; }

        @media (min-width: 900px) {
          .mm-sidebar {
            transition: width 0.25s ease;
            height: 100%;
            position: sticky; top: 0;
          }
        }

        @media (max-width: 899px) {
          .mm-sidebar {
            position: fixed;
            top: 0; left: 0;
            width: ${sidebarWidth}px !important;
            height: 100vh;
            transform: translateX(-100%);
            transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
          .mm-sidebar.open { transform: translateX(0); }
          .mm-overlay.open { display: block; }
        }

        .mm-sidebar-section { padding: 0 14px 20px; }
        .mm-sidebar-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 1.4px; text-transform: uppercase;
          color: ${inact}; padding: 0 8px;
          margin-bottom: 6px; display: block;
        }
        .mm-mood-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 10px; border-radius: 8px;
          width: 100%; background: transparent;
          border: 1px solid transparent;
          cursor: pointer; font-family: "Sora", sans-serif;
          transition: all 0.13s ease; margin-bottom: 2px;
          text-align: left; min-height: 44px;
        }
        .mm-mood-item:hover { background: ${bg}; border-color: ${bord}; }
        .mm-mood-item.active { background: ${tint}; border-color: ${theme.secondary}; }
        .mm-mood-emoji { font-size: 16px; width: 22px; text-align: center; }
        .mm-mood-label { font-size: 13px; font-weight: 500; color: ${ts}; }
        .mm-mood-item.active .mm-mood-label { color: ${pri}; font-weight: 600; }

        .mm-cat-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 7px;
          width: 100%; background: transparent;
          border: 1px solid transparent;
          cursor: pointer; font-family: "Sora", sans-serif;
          transition: all 0.13s ease; margin-bottom: 1px;
          text-align: left; min-height: 40px;
        }
        .mm-cat-item:hover { background: ${bg}; }
        .mm-cat-item.active { background: ${tint}; }
        .mm-cat-emoji { font-size: 13px; width: 18px; text-align: center; color: ${ts}; }
        .mm-cat-label { font-size: 12.5px; font-weight: 500; color: ${ts}; }
        .mm-cat-item.active .mm-cat-label { color: ${pri}; font-weight: 600; }

        /* ═══════════════════════════════════
           MAIN CONTENT AREA
        ═══════════════════════════════════ */
        .mm-main {
          flex: 1; min-width: 0;
          overflow-y: auto; height: 100%;
        }
        .mm-main-inner {
          padding: 24px 24px 60px;
          width: 100%; max-width: 1600px;
          margin: 0 auto;
        }

        /* ═══════════════════════════════════
           PRODUCT GRID
        ═══════════════════════════════════ */
        .mm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        /* ═══════════════════════════════════
           TRENDING STRIP
        ═══════════════════════════════════ */
        .mm-trending-strip {
          display: flex; gap: 14px;
          overflow-x: auto; padding-bottom: 8px;
          flex-wrap: nowrap;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;

          --trending-card-w:  200px;
          --trending-img-h:   140px;
          --trending-name-fs: 13px;
          --trending-price-fs: 15px;
          --trending-btn-h:   30px;
          --trending-btn-fs:  12px;
          --trending-btn-px:  11px;
        }
        .mm-trending-strip::-webkit-scrollbar { display: none; }

        /* ═══════════════════════════════════
           SHARED SECTION STYLES
        ═══════════════════════════════════ */
        .mm-section { margin-bottom: 36px; }
        .mm-section-header {
          display: flex; justify-content: space-between;
          align-items: baseline; margin-bottom: 14px;
        }
        .mm-section-title {
          font-family: "Lora", serif; font-size: 19px;
          font-weight: 600; color: ${tp}; letter-spacing: -0.3px;
        }
        .mm-see-all {
          background: none; border: none;
          color: ${pri}; font-size: 12.5px;
          font-weight: 600; cursor: pointer;
          font-family: "Sora", sans-serif;
          transition: opacity 0.13s; white-space: nowrap;
          flex-shrink: 0; margin-left: 8px;
        }
        .mm-see-all:hover { opacity: 0.7; }

        .mm-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: ${ts}; margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .mm-empty {
          text-align: center; padding: 80px 20px;
          display: flex; flex-direction: column;
          align-items: center; gap: 10px;
        }
        .mm-empty-icon { font-size: 36px; }
        .mm-empty-text { color: ${ts}; font-size: 14px; max-width: 280px; line-height: 1.6; }

        .mm-show-more { text-align: center; margin-top: 20px; }
        .mm-show-more-btn {
          background: ${bg}; border: 1px solid ${bord};
          border-radius: 8px; padding: 10px 24px;
          color: ${ts}; font-weight: 500; font-size: 13px;
          cursor: pointer; font-family: "Sora", sans-serif;
          transition: all 0.15s; min-height: 44px;
        }
        .mm-show-more-btn:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }

        /* ═══════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ═══════════════════════════════════ */

        /* ── Large desktop ≥1400px ── */
        @media (min-width: 1400px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
          .mm-main-inner { padding: 28px 36px 60px; }
          .mm-topnav { height: 64px; padding: 0 32px; gap: 16px; }
          .mm-topnav-search { max-width: 560px; }
          .mm-topnav-search input { height: 40px; font-size: 14px; }
          .mm-logo-icon { width: 36px; height: 36px; font-size: 18px; }
          .mm-logo-text { font-size: 20px; }
          .mm-icon-btn { height: 40px; min-width: 40px; font-size: 13.5px; }
          .mm-avatar { width: 38px; height: 38px; font-size: 13px; }
          .mm-trending-strip {
            --trending-card-w:  220px;
            --trending-img-h:   155px;
            --trending-name-fs: 14px;
            --trending-price-fs: 16px;
          }
        }

        /* ── Laptop 1100–1399px ── */
        @media (max-width: 1399px) and (min-width: 1101px) {
          .mm-topnav { height: 60px; padding: 0 24px; gap: 12px; }
          .mm-topnav-search { max-width: 420px; }
        }

        /* ── Small laptop ≤1100px ── */
        @media (max-width: 1100px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); }
          .mm-main-inner { padding: 20px 18px 60px; }
          .mm-topnav { height: 56px; padding: 0 20px; gap: 10px; }
          .mm-topnav-search { max-width: 340px; }
          .mm-topnav-search input { height: 36px; }
          .mm-topnav-actions { gap: 6px; }
          .mm-trending-strip {
            --trending-card-w:  185px;
            --trending-img-h:   128px;
          }
        }

        /* ── Tablet landscape ≤900px ── */
        @media (max-width: 900px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
          .mm-section-title { font-size: 17px; }
          .mm-topnav { height: 54px; padding: 0 16px; gap: 8px; }
          .mm-topnav-search { max-width: 280px; }
          .mm-topnav-search input { height: 34px; font-size: 13px; }
          .mm-icon-btn { height: 36px; min-width: 36px; padding: 0 10px; font-size: 12.5px; }
          .mm-avatar { width: 34px; height: 34px; font-size: 11px; }
          .mm-topnav-actions { gap: 5px; }
          .mm-trending-strip {
            --trending-card-w:  170px;
            --trending-img-h:   118px;
          }
        }

        /* ── Tablet portrait ≤700px — collapse to dropdown ── */
        @media (max-width: 700px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }
          .mm-main-inner { padding: 14px 14px 60px; }
          .mm-section-title { font-size: 16px; }

          /* Labels disappear, icons only */
          .mm-btn-label { display: none; }

          /* Inline search bar hidden — toggle button appears instead */
          .mm-topnav-search { display: none; }
          .mm-search-toggle { display: flex; }

          /* Desktop-only nav items hidden; mobile dropdown shown */
          .mm-desktop-only { display: none !important; }
          .mm-mobile-only  { display: flex; }

          /* Hide re-scan on mobile to save space */
          .mm-rescan-btn { display: none !important; }

          .mm-topnav { height: 52px; padding: 0 14px; gap: 6px; }
          .mm-topnav-actions { gap: 4px; }
          .mm-icon-btn { height: 36px; min-width: 36px; padding: 0 8px; font-size: 15px; }
          .mm-logo-text { font-size: 17px; }
          .mm-logo-icon { width: 30px; height: 30px; font-size: 15px; }
          .mm-avatar { width: 34px; height: 34px; font-size: 11px; }
          .mm-trending-strip {
            --trending-card-w:  158px;
            --trending-img-h:   110px;
            --trending-name-fs: 12px;
            --trending-price-fs: 13px;
            --trending-btn-h:   27px;
            --trending-btn-fs:  11px;
            --trending-btn-px:  9px;
            gap: 10px;
          }
        }

        /* ── Large phone ≤540px ── */
        @media (max-width: 540px) {
          .mm-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .mm-main-inner { padding: 12px 10px 60px; }
          .mm-topnav { height: 50px; padding: 0 12px; gap: 5px; }
          .mm-icon-btn { height: 34px; min-width: 34px; padding: 0 7px; font-size: 14px; }
          .mm-logo-text { font-size: 16px; }
          .mm-logo-icon { width: 28px; height: 28px; font-size: 14px; border-radius: 7px; }
          .mm-avatar { width: 32px; height: 32px; font-size: 10px; }
          .mm-topnav-actions { gap: 3px; }
          .mm-trending-strip {
            --trending-card-w:  146px;
            --trending-img-h:   100px;
            --trending-name-fs: 11.5px;
            --trending-price-fs: 12px;
            --trending-btn-h:   26px;
            --trending-btn-fs:  10.5px;
            --trending-btn-px:  8px;
            gap: 8px;
          }
        }

        /* ── Small phone ≤380px ── */
        @media (max-width: 380px) {
          .mm-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
          .mm-main-inner { padding: 10px 8px 60px; }

          /* Hide logo wordmark — icon only */
          .mm-logo-text { display: none; }

          .mm-topnav { height: 48px; padding: 0 10px; gap: 4px; }
          .mm-topnav-actions { gap: 2px; }
          .mm-icon-btn { min-width: 32px; height: 32px; padding: 0 6px; font-size: 13px; }
          .mm-logo-icon { width: 26px; height: 26px; font-size: 13px; border-radius: 6px; }
          .mm-avatar { width: 30px; height: 30px; font-size: 10px; }
          .mm-burger { min-width: 36px; padding: 0 8px; }
          .mm-trending-strip {
            --trending-card-w:  134px;
            --trending-img-h:   90px;
            --trending-name-fs: 11px;
            --trending-price-fs: 11.5px;
            --trending-btn-h:   24px;
            --trending-btn-fs:  10px;
            --trending-btn-px:  7px;
            gap: 6px;
          }
        }
      `}</style>

      <div className="mm-app">

        {/* ══ TOP NAV ══ */}
        <nav className="mm-topnav">

          <button
            className="mm-icon-btn mm-burger"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
            style={{ padding: '0 10px' }}
          >
            <span style={{ width: sidebarOpen ? 14 : 18 }} />
            <span style={{ width: 18 }} />
            <span style={{ width: sidebarOpen ? 18 : 14 }} />
          </button>

          <div className="mm-logo" onClick={() => router.push('/')}>
            <div className="mm-logo-icon">{selectedMood.emoji}</div>
            <span className="mm-logo-text">Mood<em>Market</em></span>
          </div>

          <div className="mm-topnav-search">
            <span className="mm-search-icon">⌕</span>
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mm-topnav-actions">

            {/* Mobile search toggle */}
            <button
              className="mm-icon-btn mm-search-toggle"
              onClick={() => setShowMobileSearch(v => !v)}
              aria-label="Search"
            >
              ⌕
            </button>

            {/* Re-scan button (hidden on mobile via CSS) */}
            {detecting ? (
              <button className="mm-icon-btn mm-rescan-btn" disabled>
                <div className="mm-spinner" />
                <span className="mm-btn-label">Detecting…</span>
              </button>
            ) : permissionDenied ? (
              <button className="mm-icon-btn mm-rescan-btn" onClick={() => router.push('/camera')} title="Camera access denied">
                🚫 <span className="mm-btn-label">Cam denied</span>
              </button>
            ) : (
              <button className="mm-icon-btn mm-rescan-btn" onClick={rescan}>
                ↻ <span className="mm-btn-label">Re-scan</span>
              </button>
            )}

            {/* ── Desktop-only individual buttons ── */}
            <button
              className="mm-icon-btn mm-desktop-only"
              onClick={toggleDark}
              aria-label="Toggle theme"
              style={{ fontSize: 16 }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button
              className="mm-icon-btn mm-desktop-only"
              onClick={() => router.push('/notifications')}
              aria-label="Notifications"
              style={{ fontSize: 16 }}
            >
              🔔
              {unreadCount > 0 && (
                <span className="mm-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {/* Cart always visible */}
            <button className="mm-icon-btn" onClick={() => router.push('/(tabs)/cart')}>
              🛒 <span className="mm-btn-label">Cart</span>
              {cartCount > 0 && (
                <span className="mm-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </button>

            {/* Desktop-only avatar */}
            <button
              className="mm-avatar mm-desktop-only"
              onClick={() => router.push('/profile')}
              title={profile?.name ?? 'Profile'}
            >
              {initials}
            </button>

            {/* ── Mobile/tablet: avatar opens dropdown ── */}
            <div className="mm-more-menu-wrap mm-mobile-only" ref={moreMenuRef}>
              <button
                className="mm-avatar"
                onClick={() => setMoreMenuOpen(v => !v)}
                aria-label="Account menu"
                aria-expanded={moreMenuOpen}
                style={{
                  outline: moreMenuOpen ? `2px solid ${pri}` : 'none',
                  outlineOffset: 2,
                }}
              >
                {initials}
              </button>

              {moreMenuOpen && (
                <div className="mm-more-dropdown" role="menu">

                  {/* Header: avatar + name + email */}
                  <div className="mm-more-header">
                    <div className="mm-more-header-avatar">{initials}</div>
                    <div className="mm-more-header-info">
                      <div className="mm-more-header-name">{profile?.name ?? 'Account'}</div>
                      <div className="mm-more-header-email">{user?.email ?? ''}</div>
                    </div>
                  </div>

                  <div className="mm-more-divider" />

                  {/* Profile */}
                  <button
                    className="mm-more-item"
                    role="menuitem"
                    onClick={() => { router.push('/profile'); setMoreMenuOpen(false); }}
                  >
                    <span className="mm-more-item-icon">👤</span>
                    <span className="mm-more-item-label">
                      <div>Profile</div>
                      <div className="mm-more-item-sub">View & edit your account</div>
                    </span>
                  </button>

                  {/* Notifications */}
                  <button
                    className="mm-more-item"
                    role="menuitem"
                    onClick={() => { router.push('/notifications'); setMoreMenuOpen(false); }}
                  >
                    <span className="mm-more-item-icon">🔔</span>
                    <span className="mm-more-item-label">
                      <div>Notifications</div>
                      {unreadCount > 0 && (
                        <div className="mm-more-item-sub">{unreadCount} unread</div>
                      )}
                    </span>
                    {unreadCount > 0 && (
                      <span className="mm-more-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </button>

                  {/* Dark / Light mode */}
                  <button
                    className="mm-more-item"
                    role="menuitem"
                    onClick={() => { toggleDark(); setMoreMenuOpen(false); }}
                  >
                    <span className="mm-more-item-icon">{isDark ? '☀️' : '🌙'}</span>
                    <span className="mm-more-item-label">
                      <div>{isDark ? 'Light mode' : 'Dark mode'}</div>
                      <div className="mm-more-item-sub">Currently {isDark ? 'dark' : 'light'}</div>
                    </span>
                    {/* Visual toggle pill */}
                    <div
                      className="mm-toggle-pill"
                      style={{ background: isDark ? pri : `${bord}` }}
                      aria-hidden="true"
                    >
                      <div
                        className="mm-toggle-pill-knob"
                        style={{ left: isDark ? '21px' : '3px' }}
                      />
                    </div>
                  </button>

                  <div className="mm-more-divider" />

                  {/* Current mood */}
                  <div className="mm-more-mood-row">
                    <div className="mm-more-mood-pip">
                      {detecting
                        ? <div className="mm-spinner" style={{ width: 18, height: 18 }} />
                        : selectedMood.emoji}
                    </div>
                    <div className="mm-more-mood-info">
                      <div className="mm-more-mood-label">{detecting ? 'Detecting…' : selectedMood.label}</div>
                      <div className="mm-more-mood-sub">Current mood · auto-detected</div>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </nav>

        {showMobileSearch && (
          <div className="mm-mobile-search">
            <span className="mm-mobile-search-icon">⌕</span>
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* ══ BODY ══ */}
        <div className="mm-body">

          <div
            className={`mm-overlay${sidebarOpen && !isDesktop ? ' open' : ''}`}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* ── SIDEBAR ── */}
          <aside
            className={`mm-sidebar${sidebarOpen ? ' open' : ''}`}
            style={isDesktop ? { width: sidebarOpen ? sidebarWidth : 0, transition: 'width 0.25s ease' } : {}}
          >
            <div className="mm-sidebar-inner">

              <div style={{ padding: '4px 22px 18px' }}>
                <p style={{ fontSize: 11, color: ts, fontWeight: 400 }}>{greeting}</p>
                <p style={{ fontFamily: '"Lora", serif', fontSize: 19, fontWeight: 600, color: tp, letterSpacing: -0.3, marginTop: 2 }}>
                  {firstName ?? 'Welcome'}
                </p>
              </div>

              <div style={{ margin: '0 14px 20px', padding: 14, background: bg, border: `1px solid ${bord}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: moodPalette.tint, border: `1px solid ${moodPalette.secondary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {detecting ? <div className="mm-spinner" style={{ width: 20, height: 20 }} /> : selectedMood.emoji}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: tp, letterSpacing: -0.2 }}>
                      {detecting ? 'Detecting…' : selectedMood.label}
                    </p>
                    <p style={{ fontSize: 10, color: inact, marginTop: 1, letterSpacing: 0.2 }}>Auto-detected · tap to refine</p>
                  </div>
                </div>
              </div>

              <div className="mm-sidebar-section">
                <span className="mm-sidebar-label">How are you feeling?</span>
                {MOODS.map(m => {
                  const active  = mood === m.key;
                  const palette = MOOD_PALETTES[m.key];
                  return (
                    <button
                      key={m.key}
                      className={`mm-mood-item${active ? ' active' : ''}`}
                      onClick={() => handleMoodSelect(m)}
                      style={active ? { background: palette.tint, borderColor: palette.secondary } : {}}
                    >
                      <span className="mm-mood-emoji">{m.emoji}</span>
                      <span className="mm-mood-label" style={active ? { color: palette.primary } : {}}>{m.label}</span>
                      {active && (
                        <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: palette.primary, flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ height: 1, background: bord, margin: '0 14px 20px' }} />

              <div className="mm-sidebar-section">
                <span className="mm-sidebar-label">Browse</span>
                {CATEGORIES.map(cat => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      className={`mm-cat-item${active ? ' active' : ''}`}
                      onClick={() => { setSelectedCategory(cat.id); if (!isDesktop) setSidebarOpen(false); }}
                    >
                      <span className="mm-cat-emoji">{cat.emoji}</span>
                      <span className="mm-cat-label">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="mm-main">
            <div className="mm-main-inner">

              <div className="mm-breadcrumb">
                <span>Home</span>
                {selectedCategory !== 'all' && (
                  <>
                    <span style={{ color: bord }}>›</span>
                    <span style={{ color: tp }}>{CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
                  </>
                )}
                {searchQuery && (
                  <>
                    <span style={{ color: bord }}>›</span>
                    <span style={{ color: tp }}>"{searchQuery}"</span>
                  </>
                )}
              </div>

              {/* Trending */}
              {trending.length > 0 && (
                <section className="mm-section">
                  <div className="mm-section-header">
                    <h2 className="mm-section-title">Trending Now</h2>
                    <button className="mm-see-all" onClick={() => allProductsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      See all →
                    </button>
                  </div>
                  <div className="mm-trending-strip">
                    {trending.map(item => (
                      <TrendingCard
                        key={item.id}
                        item={item}
                        onPress={() => router.push(`/product/${item.id}`)}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Recommendations */}
              {recommended.length > 0 && (
                <section className="mm-section">
                  <div className="mm-section-header">
                    <h2 className="mm-section-title">
                      For {selectedMood.label} {selectedMood.emoji}
                    </h2>
                    <button className="mm-see-all" onClick={() => setShowAllRecs(v => !v)}>
                      {showAllRecs ? 'Show less' : `See all ${recommended.length} →`}
                    </button>
                  </div>
                  <div className="mm-grid">
                    {(showAllRecs ? recommended : recommended.slice(0, REC_PREVIEW)).map(item => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        onPress={() => router.push(`/product/${item.id}`)}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                  {!showAllRecs && recommended.length > REC_PREVIEW && (
                    <div className="mm-show-more">
                      <button className="mm-show-more-btn" onClick={() => setShowAllRecs(true)}>
                        + {recommended.length - REC_PREVIEW} more recommendations
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* All products */}
              <section ref={allProductsRef as any}>
                <div className="mm-section-header">
                  <h2 className="mm-section-title">
                    {selectedCategory === 'all'
                      ? 'All Products'
                      : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Products'}
                  </h2>
                  <span style={{ fontSize: 12, color: ts, flexShrink: 0, marginLeft: 8 }}>
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="mm-empty">
                    <div className="mm-empty-icon">🔍</div>
                    <p className="mm-empty-text">No products found. Try a different category or search term.</p>
                    <button
                      className="mm-icon-btn"
                      style={{ marginTop: 8, height: 44, padding: '0 18px' }}
                      onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="mm-grid">
                    {filteredProducts.map(item => (
                      <ProductCard
                        key={item.id}
                        item={item as ScoredProduct}
                        onPress={() => router.push(`/product/${item.id}`)}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                )}
              </section>

            </div>
          </main>
        </div>
      </div>

      <CartToast
        count={cartCount}
        total={cartTotal}
        visible={snapVisible}
        onPress={() => { setSnapVisible(false); router.push('/(tabs)/cart'); }}
      />
    </>
  );
}