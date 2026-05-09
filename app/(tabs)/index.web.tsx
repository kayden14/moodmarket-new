/**
 * app/(tabs)/index.web.tsx  — MoodMarket Home Screen (Web)
 *
 * Passive ambient mood detection — no button tap required.
 * On mount the useMoodDetection hook silently:
 *  1. Requests webcam permission via browser getUserMedia (system prompt appears once)
 *  2. Captures a frame after 2.5 s → Gemini vision API
 *  3. Calls setMood() → recommendations update instantly
 *
 * The top-nav button is now "Re-scan" — triggers another detection pass.
 * While detecting, the sidebar mood card shows a CSS spinner.
 * If permission is denied, the button falls back to a manual mood guide.
 *
 * OTHER FIXES:
 * - Fully responsive grid using auto-fill minmax (no manual breakpoint overrides)
 * - Sidebar auto-collapses below 900px via CSS
 * - Mood history properly APPENDS to the existing mood_history array in Supabase
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

async function saveMoodToHistory(
  userId: string,
  moodKey: MoodKey,
  label: string,
): Promise<void> {
  try {
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('mood_history')
      .eq('id', userId)
      .single();

    if (fetchErr) {
      console.warn('[MoodHistory] Failed to read existing history:', fetchErr.message);
      return;
    }

    let existing: any[] = [];
    const raw = data?.mood_history;
    if (Array.isArray(raw)) {
      existing = raw.filter(e => e && typeof e === 'object' && !Array.isArray(e) && e.mood_key);
    } else if (raw && typeof raw === 'object') {
      existing = Object.values(raw).filter((e: any) => e && typeof e === 'object' && e.mood_key);
    }

    const newEntry = {
      mood_key: moodKey,
      label,
      date: new Date().toISOString(),
    };

    const updated = [...existing, newEntry];

    const { error: saveErr } = await supabase
      .from('profiles')
      .update({ mood_history: updated })
      .eq('id', userId);

    if (saveErr) {
      console.warn('[MoodHistory] Failed to save mood entry:', saveErr.message);
    } else {
      console.log(`[MoodHistory] Saved "${label}" — total entries: ${updated.length}`);
    }
  } catch (err: any) {
    console.warn('[MoodHistory] Unexpected error saving mood:', err.message);
  }
}

/* ─────────────────────────────── sub-components ────────────────────────── */

function ProductCard({
  item, onPress, onAddToCart,
}: {
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
            width: 30, height: 30, borderRadius: '50%',
            background: liked ? theme.primary : 'rgba(255,255,255,0.92)',
            border: `1px solid ${liked ? theme.primary : 'rgba(0,0,0,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 13,
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
            padding: '4px 10px', fontSize: 12, fontWeight: 600,
            color: '#fff', letterSpacing: 0.3,
          }}>
            {(item as ScoredProduct).reason}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.45, letterSpacing: -0.2 }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ fontSize: 13, color: i <= stars ? '#F59E0B' : theme.border, lineHeight: 1 }}>
              {i <= stars ? '★' : '☆'}
            </span>
          ))}
          <span style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 4 }}>
            {(item as Product).rating?.toFixed(1)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.5, fontFamily: '"Sora", sans-serif' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: theme.textSecondary, letterSpacing: 0 }}>GH₵ </span>
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
              fontSize: 13, fontWeight: 600,
              cursor: adding ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px',
              opacity: adding ? 0.6 : 1,
              transition: 'all 0.18s ease',
              fontFamily: '"Sora", sans-serif',
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
        flex: '0 0 clamp(140px, 20%, 220px)',
        minWidth: 140,
        borderRadius: 14, overflow: 'hidden',
        background: theme.card, border: `1px solid ${hovered ? theme.secondary : theme.border}`,
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ position: 'relative', height: 120 }}>
        <Image
          source={{ uri: getProductImage(item) }}
          style={{ width: '100%', height: '100%' } as any}
          contentFit="cover" transition={200}
        />
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: '#EF4444',
          borderRadius: 5,
          padding: '4px 9px', fontSize: 11, fontWeight: 700,
          color: '#fff', letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          Hot
        </div>
      </div>
      <div style={{ padding: '13px 14px 14px' }}>
        <p style={{ margin: '0 0 9px', fontSize: 14, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.4, letterSpacing: -0.15 }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.3, fontFamily: '"Sora", sans-serif' }}>
            GH₵{item.price.toFixed(2)}
          </span>
          <button
            onClick={async (e) => { e.stopPropagation(); if (adding) return; setAdding(true); await onAddToCart(item); setAdding(false); }}
            style={{
              height: 30, borderRadius: 7,
              background: theme.primary, border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', padding: '0 13px',
              transition: 'opacity 0.15s',
              fontFamily: '"Sora", sans-serif',
            }}
          >+ Add</button>
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
        position: 'fixed', bottom: 24, right: 24,
        background: '#111',
        borderRadius: 12,
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.22s ease',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.95)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>🛒</div>
      <div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: -0.2 }}>Added to cart</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>
          {count} {count === 1 ? 'item' : 'items'} · GH₵{total.toFixed(2)}
        </div>
      </div>
      <div style={{
        marginLeft: 8,
        color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600,
        borderLeft: '1px solid rgba(255,255,255,0.15)',
        paddingLeft: 12,
        letterSpacing: -0.1,
      }}>
        View →
      </div>
    </div>
  );
}

/* ─────────────────────────────── main page ─────────────────────────────── */

export default function HomeScreenWeb() {
  const router = useRouter();
  const { profile, user }       = useAuth();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount]           = useState(0);
  const snapTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allProductsRef = useRef<HTMLElement | null>(null);

  const selectedMood = MOODS.find(m => m.key === mood) ?? MOODS[7];

  /* ── Passive ambient mood detection ───────────────────────────────────── */
  const handleMoodDetected = useCallback((detectedMood: MoodKey) => {
    setMood(detectedMood);
    const meta = MOODS.find(m => m.key === detectedMood);
    if (profile?.id && meta) {
      NotificationService.moodSelected(profile.id, meta.label, meta.emoji);
      saveMoodToHistory(profile.id, detectedMood, meta.label);
    }
  }, [setMood, profile?.id]);

  const { detecting, permissionDenied, rescan } = useMoodDetection({
    onMoodDetected: handleMoodDetected,
  });

  /* ── Manual mood selector (sidebar) — also saves to history ───────────── */
  const handleMoodSelect = useCallback(async (m: typeof MOODS[number]) => {
    setMood(m.key);
    if (profile?.id) {
      NotificationService.moodSelected(profile.id, m.label, m.emoji);
      await saveMoodToHistory(profile.id, m.key, m.label);
    }
  }, [profile?.id, setMood]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) {
      setAllProducts(data);
      setFilteredProducts(data);
      const [recs, trend] = await Promise.all([
        getRecommendations(user?.id, mood, data),
        getTrending(data),
      ]);
      setRecommended(recs);
      setTrending(trend);
    }
    setLoading(false);
  }, [user?.id, mood]);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (allProducts.length === 0) return;
    getRecommendations(user?.id, mood, allProducts).then(setRecommended);
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, fetchUnread)
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

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { background: ${bg}; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        .mm-app { height: 100vh; background: ${bg}; font-family: "Sora", sans-serif; color: ${tp}; display: flex; flex-direction: column; overflow: hidden; }

        .mm-topnav {
          position: sticky; top: 0; z-index: 200;
          height: 56px; background: ${card};
          border-bottom: 1px solid ${bord};
          display: flex; align-items: center;
          padding: 0 20px; gap: 16px;
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
        }
        .mm-logo { display: flex; align-items: center; gap: 9px; flex-shrink: 0; text-decoration: none; cursor: pointer; }
        .mm-logo-icon { width: 30px; height: 30px; border-radius: 8px; background: ${pri}; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .mm-logo-text { font-family: "Lora", serif; font-size: 18px; font-weight: 600; color: ${tp}; letter-spacing: -0.4px; }
        .mm-logo-text em { font-style: italic; color: ${pri}; }
        .mm-topnav-search { flex: 1; max-width: 380px; position: relative; }
        .mm-topnav-search input { width: 100%; height: 36px; background: ${bg}; border: 1px solid ${bord}; border-radius: 8px; padding: 0 14px 0 36px; font-size: 13.5px; font-family: "Sora", sans-serif; color: ${tp}; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .mm-topnav-search input:focus { border-color: ${pri}; box-shadow: 0 0 0 3px ${pri}18; }
        .mm-topnav-search input::placeholder { color: ${ts}; }
        .mm-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 13px; color: ${ts}; pointer-events: none; }
        .mm-topnav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .mm-btn-ghost { height: 34px; padding: 0 14px; border-radius: 7px; background: transparent; border: 1px solid ${bord}; font-size: 12.5px; font-weight: 500; font-family: "Sora", sans-serif; color: ${ts}; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s; white-space: nowrap; }
        .mm-btn-ghost:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }
        .mm-btn-primary { height: 34px; padding: 0 16px; border-radius: 7px; background: ${pri}; border: 1px solid ${pri}; font-size: 12.5px; font-weight: 600; font-family: "Sora", sans-serif; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.15s; white-space: nowrap; }
        .mm-btn-primary:hover { opacity: 0.88; }
        .mm-cart-btn { position: relative; height: 34px; padding: 0 14px; border-radius: 7px; background: transparent; border: 1px solid ${bord}; font-size: 12.5px; font-family: "Sora", sans-serif; color: ${ts}; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s; }
        .mm-cart-btn:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }
        .mm-cart-badge { position: absolute; top: -5px; right: -5px; background: ${pri}; color: #fff; width: 18px; height: 18px; border-radius: 50%; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid ${card}; }
        .mm-notif-btn { position: relative; height: 34px; width: 34px; border-radius: 7px; background: transparent; border: 1px solid ${bord}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.15s; flex-shrink: 0; }
        .mm-notif-btn:hover { border-color: ${pri}; background: ${tint}; }
        .mm-notif-badge { position: absolute; top: -5px; right: -5px; background: #EF4444; color: #fff; min-width: 18px; height: 18px; border-radius: 9px; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid ${card}; padding: 0 3px; animation: mm-badge-pop 0.3s cubic-bezier(.34,1.56,.64,1); }
        @keyframes mm-badge-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes mm-spin { to { transform: rotate(360deg); } }
        .mm-spinner { width: 18px; height: 18px; border: 2px solid ${moodPalette.secondary}; border-top-color: ${moodPalette.primary}; border-radius: 50%; animation: mm-spin 0.7s linear infinite; flex-shrink: 0; }
        .mm-avatar { width: 30px; height: 30px; background: ${pri}; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 50%; border: 1px solid ${bord}; flex-shrink: 0; }
        .mm-theme-btn { height: 34px; width: 34px; border-radius: 7px; background: transparent; border: 1px solid ${bord}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; transition: all 0.15s; }
        .mm-theme-btn:hover { border-color: ${pri}; background: ${tint}; }
        .mm-sidebar-toggle { height: 34px; width: 34px; border-radius: 7px; background: transparent; border: 1px solid ${bord}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 4px; flex-shrink: 0; transition: all 0.15s; }
        .mm-sidebar-toggle:hover { border-color: ${pri}; background: ${tint}; }
        .mm-sidebar-toggle span { display: block; height: 1.5px; border-radius: 2px; background: ${ts}; transition: all 0.2s; }
        .mm-sidebar-toggle:hover span { background: ${pri}; }

        .mm-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }

        /* Sidebar width driven by JS state; CSS collapses it automatically below 900px */
        .mm-sidebar {
          width: ${sidebarCollapsed ? '0' : '240px'};
          flex-shrink: 0; overflow: hidden;
          border-right: 1px solid ${bord};
          transition: width 0.25s ease;
          position: sticky; top: 56px;
          height: calc(100vh - 56px);
          overflow-y: auto;
          background: ${card};
        }
        .mm-sidebar-inner { width: 240px; padding: 20px 0 80px; }
        .mm-sidebar-section { padding: 0 14px 20px; }
        .mm-sidebar-label { font-size: 10px; font-weight: 600; letter-spacing: 1.4px; text-transform: uppercase; color: ${inact}; padding: 0 8px; margin-bottom: 6px; display: block; }
        .mm-mood-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 8px; width: 100%; background: transparent; border: 1px solid transparent; cursor: pointer; font-family: "Sora", sans-serif; transition: all 0.13s ease; margin-bottom: 2px; text-align: left; }
        .mm-mood-item:hover { background: ${bg}; border-color: ${bord}; }
        .mm-mood-item.active { background: ${tint}; border-color: ${theme.secondary}; }
        .mm-mood-emoji { font-size: 15px; width: 20px; text-align: center; }
        .mm-mood-label { font-size: 13px; font-weight: 500; color: ${ts}; }
        .mm-mood-item.active .mm-mood-label { color: ${pri}; font-weight: 600; }
        .mm-cat-item { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 7px; width: 100%; background: transparent; border: 1px solid transparent; cursor: pointer; font-family: "Sora", sans-serif; transition: all 0.13s ease; margin-bottom: 1px; text-align: left; }
        .mm-cat-item:hover { background: ${bg}; }
        .mm-cat-item.active { background: ${tint}; }
        .mm-cat-emoji { font-size: 13px; width: 18px; text-align: center; color: ${ts}; }
        .mm-cat-label { font-size: 12.5px; font-weight: 500; color: ${ts}; }
        .mm-cat-item.active .mm-cat-label { color: ${pri}; font-weight: 600; }

        .mm-main { flex: 1; min-width: 0; overflow-y: auto; height: 100%; }
        .mm-main-inner { padding: 28px 28px 60px; width: 100%; }

        .mm-section { margin-bottom: 36px; }
        .mm-section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
        .mm-section-title { font-family: "Lora", serif; font-size: 19px; font-weight: 600; color: ${tp}; letter-spacing: -0.3px; }
        .mm-see-all { background: none; border: none; color: ${pri}; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: "Sora", sans-serif; transition: opacity 0.13s; }
        .mm-see-all:hover { opacity: 0.7; }

        .mm-trending-strip { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; flex-wrap: nowrap; }

        /* Responsive product grid — auto-fill handles all screen sizes fluidly */
        .mm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .mm-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${ts}; margin-bottom: 18px; }
        .mm-breadcrumb span { color: ${bord}; }

        .mm-empty { text-align: center; padding: 80px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .mm-empty-icon { font-size: 36px; }
        .mm-empty-text { color: ${ts}; font-size: 14px; max-width: 280px; line-height: 1.6; }

        .mm-show-more { text-align: center; margin-top: 20px; }
        .mm-show-more-btn { background: ${bg}; border: 1px solid ${bord}; border-radius: 8px; padding: 10px 24px; color: ${ts}; font-weight: 500; font-size: 13px; cursor: pointer; font-family: "Sora", sans-serif; transition: all 0.15s; }
        .mm-show-more-btn:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }

        /* ── Responsive breakpoints ── */

        /* Large desktops: sidebar visible, grid auto-fills ~5 cols */
        @media (max-width: 1200px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); }
        }

        /* Medium: tighten padding */
        @media (max-width: 1100px) {
          .mm-main-inner { padding: 20px 18px 60px; }
        }

        /* Tablet landscape / small laptop: collapse sidebar, shrink min card width */
        @media (max-width: 900px) {
          .mm-sidebar { width: 0 !important; border-right: none; }
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 12px; }
          .mm-topnav-search { max-width: 240px; }
        }

        /* Tablet portrait */
        @media (max-width: 700px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 10px; }
          .mm-main-inner { padding: 14px 14px 60px; }
          .mm-topnav-search { max-width: 180px; }
          .mm-section-title { font-size: 17px; }
          .btn-label { display: none; }
        }

        /* Large phone */
        @media (max-width: 540px) {
          .mm-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .mm-main-inner { padding: 12px 10px 60px; }
          .mm-topnav-search { max-width: 140px; }
        }

        /* Small phone */
        @media (max-width: 400px) {
          .mm-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
          .mm-topnav-search { display: none; }
          .mm-logo-text { display: none; }
          .mm-topnav { padding: 0 12px; gap: 8px; }
        }
      `}</style>

      <div className="mm-app">

        {/* ══ TOP NAV ══ */}
        <nav className="mm-topnav">
          <button className="mm-sidebar-toggle" onClick={() => setSidebarCollapsed(v => !v)} aria-label="Toggle sidebar">
            <span style={{ width: sidebarCollapsed ? 14 : 18 }} />
            <span style={{ width: 18 }} />
            <span style={{ width: sidebarCollapsed ? 18 : 14 }} />
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
            {/* Mood detection button — shows spinner while detecting, Re-scan after, warning if denied */}
            {detecting ? (
              <button className="mm-btn-ghost" disabled style={{ cursor: 'default', opacity: 0.7 }}>
                <div className="mm-spinner" />
                <span className="btn-label">Detecting…</span>
              </button>
            ) : permissionDenied ? (
              <button className="mm-btn-ghost" onClick={() => router.push('/camera')} title="Camera access denied — pick mood manually">
                🚫 <span className="btn-label">Cam denied</span>
              </button>
            ) : (
              <button className="mm-btn-ghost" onClick={rescan}>
                ↻ <span className="btn-label">Re-scan</span>
              </button>
            )}
            <button className="mm-theme-btn" onClick={toggleDark} aria-label="Toggle theme">
              {isDark ? '☀️' : '🌙'}
            </button>
            <button className="mm-notif-btn" onClick={() => router.push('/notifications')} aria-label="Notifications">
              🔔
              {unreadCount > 0 && (
                <span className="mm-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            <button className="mm-cart-btn" onClick={() => router.push('/(tabs)/cart')}>
              🛒 Cart
              {cartCount > 0 && (
                <span className="mm-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </button>
            <button className="mm-avatar" onClick={() => router.push('/profile')} title={profile?.name ?? 'Profile'}>
              {initials}
            </button>
          </div>
        </nav>

        {/* ══ BODY ══ */}
        <div className="mm-body">

          {/* ── SIDEBAR ── */}
          <aside className="mm-sidebar">
            <div className="mm-sidebar-inner">

              <div style={{ padding: '4px 22px 18px' }}>
                <p style={{ fontSize: 11, color: ts, fontWeight: 400 }}>{greeting}</p>
                <p style={{ fontFamily: '"Lora", serif', fontSize: 19, fontWeight: 600, color: tp, letterSpacing: -0.3, marginTop: 2 }}>
                  {firstName ?? 'Welcome'}
                </p>
              </div>

              <div style={{ margin: '0 14px 20px', padding: 14, background: bg, border: `1px solid ${bord}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: moodPalette.tint, border: `1px solid ${moodPalette.secondary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {selectedMood.emoji}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: tp, letterSpacing: -0.2 }}>{selectedMood.label}</p>
                    <p style={{ fontSize: 10, color: inact, marginTop: 1, letterSpacing: 0.2 }}>Auto-detected · tap to refine</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/camera')}
                  style={{ width: '100%', height: 30, borderRadius: 7, background: 'transparent', border: `1px solid ${bord}`, color: ts, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"Sora", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = pri; (e.currentTarget as HTMLButtonElement).style.color = pri; (e.currentTarget as HTMLButtonElement).style.background = tint; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = bord; (e.currentTarget as HTMLButtonElement).style.color = ts; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  ✨ Auto-detect mood
                </button>
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
                      onClick={() => setSelectedCategory(cat.id)}
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
                    <span>›</span>
                    <span style={{ color: tp }}>{CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
                  </>
                )}
                {searchQuery && (
                  <>
                    <span>›</span>
                    <span style={{ color: tp }}>"{searchQuery}"</span>
                  </>
                )}
              </div>

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
                      <TrendingCard key={item.id} item={item} onPress={() => router.push(`/product/${item.id}`)} onAddToCart={handleAddToCart} />
                    ))}
                  </div>
                </section>
              )}

              {recommended.length > 0 && (
                <section className="mm-section">
                  <div className="mm-section-header">
                    <h2 className="mm-section-title">
                      Recommended for {selectedMood.label} {selectedMood.emoji}
                    </h2>
                    <button className="mm-see-all" onClick={() => setShowAllRecs(v => !v)}>
                      {showAllRecs ? 'Show less' : `See all ${recommended.length} →`}
                    </button>
                  </div>
                  <div className="mm-grid">
                    {(showAllRecs ? recommended : recommended.slice(0, 10)).map(item => (
                      <ProductCard key={item.id} item={item} onPress={() => router.push(`/product/${item.id}`)} onAddToCart={handleAddToCart} />
                    ))}
                  </div>
                  {!showAllRecs && recommended.length > 10 && (
                    <div className="mm-show-more">
                      <button className="mm-show-more-btn" onClick={() => setShowAllRecs(true)}>
                        + {recommended.length - 10} more recommendations
                      </button>
                    </div>
                  )}
                </section>
              )}

              <section ref={allProductsRef as any}>
                <div className="mm-section-header">
                  <h2 className="mm-section-title">
                    {selectedCategory === 'all' ? 'All Products' : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Products'}
                  </h2>
                  <span style={{ fontSize: 12, color: ts }}>
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="mm-empty">
                    <div className="mm-empty-icon">🔍</div>
                    <p className="mm-empty-text">No products found. Try a different category or search term.</p>
                    <button className="mm-btn-ghost" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="mm-grid">
                    {filteredProducts.map(item => (
                      <ProductCard key={item.id} item={item as ScoredProduct} onPress={() => router.push(`/product/${item.id}`)} onAddToCart={handleAddToCart} />
                    ))}
                  </div>
                )}
              </section>

            </div>
          </main>
        </div>
      </div>

      <CartToast count={cartCount} total={cartTotal} visible={snapVisible} onPress={() => { setSnapVisible(false); router.push('/(tabs)/cart'); }} />
    </>
  );
}