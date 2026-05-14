import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getRecommendations, getTrending } from '@/services/recommendations';
import { ScoredProduct } from '@/types/recommendations';
import { NotificationService } from '@/services/notifications';
import { useStorefront } from '@/contexts/StorefrontContext';
import {
  Heart, Star, ShoppingCart, ArrowRight, Search, ChevronRight, Sparkles, Camera
} from 'lucide-react';
import WebShell from '@/components/WebShell';
import { useResponsive } from '@/hooks/useResponsive';

/* ── helpers ───────────────────────────────────────────────────────────── */

function WebEmoji({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, emoji', ...style }}>
      {children}
    </span>
  );
}

const MOODS = [
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
  { id: 'all',         label: 'All Products',  keywords: [] as string[] },
  { id: 'self-care',   label: 'Self Care',      keywords: ['self-care','self care','skincare','skin care','beauty','moisturiser','moisturizer','cleanser','serum','toner','face','body','lotion','soap','scrub','bath','hygiene','wellness','nurturing','soothing','pamper'] },
  { id: 'food',        label: 'Food & Drink',   keywords: ['food','snack','drink','tea','coffee','chocolate','candy','sweet','beverage','juice','smoothie','protein','supplement','vitamin','nutrition','healthy','organic','herbal','cocoa','honey','granola','cookie','biscuit','fruit','nut'] },
  { id: 'books',       label: 'Books',          keywords: ['book','novel','journal','diary','planner','notebook','magazine','guide','read','fiction','non-fiction','poetry','motivational','self-help','mindfulness','spiritual','educational'] },
  { id: 'accessories', label: 'Accessories',    keywords: ['accessory','accessories','jewellery','jewelry','bracelet','necklace','ring','earring','bag','purse','wallet','watch','sunglasses','hat','scarf','belt','keychain','pin','charm','crystal','stone','gem'] },
  { id: 'relaxation',  label: 'Relaxation',     keywords: ['relaxation','relax','calm','candle','aromatherapy','diffuser','essential oil','massage','yoga','meditation','pillow','blanket','sleep','rest','stress','anxiety','zen','peaceful','spa','bath bomb','incense','music','sound','breathing'] },
];

function getProductImage(product: Product): string {
  if (product.image && product.image.startsWith('http')) return product.image;
  const seed = product.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${seed}/400/400`;
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
        boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.14)` : '0 1px 4px rgba(0,0,0,0.07)',
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
        <button
          onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 34, height: 34, borderRadius: '50%',
            background: liked ? theme.primary : 'rgba(255,255,255,0.92)',
            border: `1px solid ${liked ? theme.primary : 'rgba(0,0,0,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s ease',
            opacity: hovered || liked ? 1 : 0,
          }}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} color={liked ? theme.primary : 'rgba(0,0,0,0.3)'} />
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
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.4 }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={12} fill={i <= stars ? '#F59E0B' : 'none'} color={i <= stars ? '#F59E0B' : theme.border} />
          ))}
          <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 3 }}>
            {(item as Product).rating?.toFixed(1)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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
              transition: 'all 0.18s ease',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              whiteSpace: 'nowrap',
            }}
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
        flex: '0 0 200px',
        minWidth: '200px',
        borderRadius: 14, overflow: 'hidden',
        background: theme.card, border: `1px solid ${hovered ? theme.secondary : theme.border}`,
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
        scrollSnapAlign: 'start',
      }}
    >
      <div style={{ position: 'relative', height: '140px' }}>
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
          color: '#fff', textTransform: 'uppercase',
        }}>Hot</div>
      </div>
      <div style={{ padding: '11px 12px 12px' }}>
        <p style={{
          margin: '0 0 8px', fontSize: 13, fontWeight: 600,
          color: theme.textPrimary, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            color: theme.textPrimary,
            letterSpacing: -0.3,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
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
              height: 30, borderRadius: 7,
              background: theme.primary, border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', padding: '0 11px',
              transition: 'opacity 0.15s',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
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
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ShoppingCart size={15} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Added to cart</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>
          {count} items · GH₵{total.toFixed(2)}
        </div>
      </div>
      <div style={{ marginLeft: 6, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 10, flexShrink: 0 }}>
        View <ArrowRight size={12} style={{ display: 'inline-flex', verticalAlign: 'middle' }} />
      </div>
    </div>
  );
}

function MoodScannerPromo({ onScan }: { onScan: () => void }) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
      borderRadius: 20, padding: '32px 40px', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 48, boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
        <Camera size={180} color="#fff" />
      </div>
      <div style={{ zIndex: 1, flex: 1 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, fontFamily: '"Playfair Display", serif' }}>
          Mood Scanner AI
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 15, opacity: 0.9, maxWidth: 400, lineHeight: 1.5 }}>
          Not sure what you need? Let our AI analyze your vibe and recommend the perfect products for your current state.
        </p>
        <button
          onClick={onScan}
          style={{
            background: '#fff', color: theme.primary, border: 'none',
            padding: '12px 24px', borderRadius: 12, fontWeight: 700,
            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Sparkles size={16} /> Try it now
        </button>
      </div>
    </div>
  );
}

function HeroSection({ moodEmoji, moodLabel, userName }: { moodEmoji: string; moodLabel: string; userName: string | null }) {
  const { theme } = useTheme();
  return (
    <div style={{ padding: '40px 0 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: theme.tint, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, border: `1px solid ${theme.secondary}`,
        }}>
          {moodEmoji}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.primary, letterSpacing: 1, textTransform: 'uppercase' }}>
          Feeling {moodLabel}
        </span>
      </div>
      <h1 style={{
        margin: 0, fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900,
        color: theme.textPrimary, fontFamily: '"Playfair Display", serif',
        lineHeight: 1.1, letterSpacing: -1.5,
      }}>
        {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Discover your mood'}
      </h1>
      <p style={{
        marginTop: 20, fontSize: 'clamp(15px, 2vw, 18px)', color: theme.textSecondary,
        maxWidth: 600, lineHeight: 1.6,
      }}>
        Curated collections designed to match your emotional state. From self-care to soulful snacks, we've got you covered.
      </p>
    </div>
  );
}

/* ─────────────────────────────── main page ─────────────────────────────── */

export default function HomeScreenWeb() {
  const router = useRouter();
  const { user, profile }                   = useAuth();
  const { addToCart, cartCount, cartTotal } = useCart();
  const { theme, mood }                     = useTheme();
  const { searchQuery, selectedCategory, setSelectedCategory } = useStorefront();

  const [allProducts, setAllProducts]           = useState<Product[]>([]);
  const [recommended, setRecommended]           = useState<ScoredProduct[]>([]);
  const [trending, setTrending]                 = useState<ScoredProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [snapVisible, setSnapVisible]           = useState(false);
  const [showAllRecs, setShowAllRecs]           = useState(false);

  const snapTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allProductsRef = useRef<HTMLElement | null>(null);

  const REC_PREVIEW = 10;
  const selectedMood = MOODS.find(m => m.key === mood) ?? MOODS[7];

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) console.warn('[HomeScreenWeb] products fetch error:', error.message);
      if (data && data.length > 0) {
        setAllProducts(data);
        setFilteredProducts(data);
        const [recs, trend] = await Promise.all([
          getRecommendations(user?.id, mood, data, 50),
          getTrending(data, 12),
        ]);
        setRecommended(recs);
        setTrending(trend);
      }
    } catch (err: any) {
      console.warn('[HomeScreenWeb] fetchProducts threw:', err?.message ?? err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, mood]);

  // Re-run when auth loads in case RLS requires an authenticated session
  useEffect(() => { fetchProducts(); }, [user?.id]);

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

  const handleAddToCart = async (product: Product) => {
    await addToCart(product.id, 1);
    setSnapVisible(true);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => setSnapVisible(false), 3000);
    if (user?.id) NotificationService.send('Added!', `${product.name} added to cart.`);
  };

  const tp = theme.textPrimary;
  const ts = theme.textSecondary;
  const bord = theme.border;
  const pri = theme.primary;
  const { isWide } = useResponsive();

  if (loading) {
    return (
      <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: theme.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WebEmoji style={{ fontSize: 22 }}>{selectedMood.emoji}</WebEmoji>
        </div>
        <p style={{ color: ts, fontSize: 14, margin: 0, fontWeight: 500 }}>Loading your mood feed…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .mm-section { margin-bottom: 36px; }
        .mm-section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
        .mm-section-title { font-family: "Playfair Display", serif; font-size: 19px; font-weight: 600; color: ${tp}; letter-spacing: -0.3px; }
        .mm-see-all { background: none; border: none; color: ${pri}; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: "Plus Jakarta Sans", sans-serif; transition: opacity 0.13s; white-space: nowrap; flex-shrink: 0; margin-left: 8px; }
        .mm-see-all:hover { opacity: 0.7; }
        .mm-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${ts}; margin-bottom: 18px; flex-wrap: wrap; }
        .mm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .mm-trending-strip { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px; flex-wrap: nowrap; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .mm-trending-strip::-webkit-scrollbar { display: none; }
        .mm-empty { text-align: center; padding: 80px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .mm-empty-icon { font-size: 36px; }
        .mm-empty-text { color: ${ts}; font-size: 14px; max-width: 280px; line-height: 1.6; }
        .mm-show-more { text-align: center; margin-top: 20px; }
        .mm-show-more-btn { background: ${theme.background}; border: 1px solid ${bord}; border-radius: 8px; padding: 10px 24px; color: ${ts}; font-weight: 500; font-size: 13px; cursor: pointer; font-family: "Plus Jakarta Sans", sans-serif; transition: all 0.15s; min-height: 44px; }
        .mm-show-more-btn:hover { border-color: ${pri}; color: ${pri}; background: ${theme.tint}; }

        @media (max-width: 900px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
          .mm-section-title { font-size: 17px; }
        }
        @media (max-width: 700px) {
          .mm-grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }
        }
        @media (max-width: 540px) {
          .mm-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
      `}</style>

      <HeroSection
        moodEmoji={selectedMood.emoji}
        moodLabel={selectedMood.label}
        userName={profile?.name ?? null}
      />

      <div className="mm-breadcrumb">
        <span>Home</span>
        {selectedCategory !== 'all' && (
          <>
            <ChevronRight size={12} color={bord} style={{ flexShrink: 0 }} />
            <span style={{ color: tp }}>{CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
          </>
        )}
        {searchQuery && (
          <>
            <ChevronRight size={12} color={bord} style={{ flexShrink: 0 }} />
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
              See all <ArrowRight size={12} style={{ display: 'inline-flex', verticalAlign: 'middle' }} />
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

      <MoodScannerPromo onScan={() => router.push('/camera')} />

      {/* Recommendations */}
      {recommended.length > 0 && (
        <section className="mm-section">
          <div className="mm-section-header">
            <h2 className="mm-section-title">
              For {selectedMood.label} <WebEmoji>{selectedMood.emoji}</WebEmoji>
            </h2>
            <button className="mm-see-all" onClick={() => setShowAllRecs(v => !v)}>
              {showAllRecs ? 'Show less' : <>See all {recommended.length} <ArrowRight size={12} style={{ display: 'inline-flex', verticalAlign: 'middle' }} /></>}
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
            <div className="mm-empty-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Search size={36} color={ts} strokeWidth={1.5} /></div>
            <p className="mm-empty-text">No products found. Try a different category or search term.</p>
            <button
              className="mm-show-more-btn"
              style={{ marginTop: 8, height: 44, padding: '0 18px' }}
              onClick={() => { setSelectedCategory('all'); }}
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

      <CartToast
        count={cartCount}
        total={cartTotal}
        visible={snapVisible}
        onPress={() => { setSnapVisible(false); router.push('/(tabs)/cart'); }}
      />
    </>
  );
}
