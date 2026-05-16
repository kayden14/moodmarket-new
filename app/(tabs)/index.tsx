/**
 * app/(tabs)/index.tsx  — MoodMarket Home Screen
 *
 * Passive ambient mood detection — no button tap required.
 * On mount the useMoodDetection hook silently:
 *  1. Requests camera permission (system prompt appears once)
 *  2. Captures a frame after 2.5 s → Gemini vision API
 *  3. Calls setMood() → recommendations update instantly
 *
 * The "Auto-detect" button is now "Re-scan" — lets the user
 * trigger another detection pass after the first one completes.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TouchableWithoutFeedback, RefreshControl, ScrollView,
  Dimensions, Animated, Platform, ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme, MoodKey, MOOD_PALETTES } from '@/contexts/ThemeContext';
import { ThemeToggleIcon } from '@/components/ThemeToggle';
import {
  Sparkles, Star, Bell, Search, TrendingUp,
  Heart, ShoppingCart, ArrowRight, Flame, RefreshCw,
  Mic, X, User, MessageSquare,
} from 'lucide-react-native';
import { VibeSearchService } from '@/services/vibeSearch';
import EmojiText from '@/components/EmojiText';
import { NotificationService } from '@/services/notifications';
import { getRecommendations, getTrending } from '@/services/recommendations';
import { ScoredProduct } from '@/types/recommendations';
import { useMoodDetectionContext } from '@/contexts/MoodDetectionContext';
import { MOODS } from '@/constants/moods';
import { getLazyCamera } from '@/utils/lazyModules';
import MoodShareCard from '@/components/MoodShareCard';
import { voiceService } from '@/utils/voice';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH          = (width - 48) / 2;
const TRENDING_CARD_WIDTH = width * 0.44;

const CATEGORIES = [
  { id: 'all',         label: 'All',         emoji: '🏠', keywords: [] as string[] },
  { id: 'self-care',   label: 'Self Care',   emoji: '🧴', keywords: ['self-care','self care','skincare','skin care','beauty','moisturiser','moisturizer','cleanser','serum','toner','face','body','lotion','soap','scrub','bath','hygiene','wellness','nurturing','soothing','pamper'] },
  { id: 'food',        label: 'Food',        emoji: '🍵', keywords: ['food','snack','drink','tea','coffee','chocolate','candy','sweet','beverage','juice','smoothie','protein','supplement','vitamin','nutrition','healthy','organic','herbal','cocoa','honey','granola','cookie','biscuit','fruit','nut'] },
  { id: 'books',       label: 'Books',       emoji: '📚', keywords: ['book','novel','journal','diary','planner','notebook','magazine','guide','read','fiction','non-fiction','poetry','motivational','self-help','mindfulness','spiritual','educational'] },
  { id: 'accessories', label: 'Accessories', emoji: '💎', keywords: ['accessory','accessories','jewellery','jewelry','bracelet','necklace','ring','earring','bag','purse','wallet','watch','sunglasses','hat','scarf','belt','keychain','pin','charm','crystal','stone','gem'] },
  { id: 'relaxation',  label: 'Relaxation',  emoji: '🧘', keywords: ['relaxation','relax','calm','candle','aromatherapy','diffuser','essential oil','massage','yoga','meditation','pillow','blanket','sleep','rest','stress','anxiety','zen','peaceful','spa','bath bomb','incense','music','sound','breathing'] },
];

function getProductImage(product: Product, size = 400): string {
  if (product.image && product.image.startsWith('http')) {
    // If it's a Supabase storage URL, append transformation parameters
    if (product.image.includes('supabase.co/storage/v1/object/public')) {
      return `${product.image}?width=${size}&height=${size}&resize=contain&quality=80`;
    }
    return product.image;
  }
  const seed = product.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function ProductCard({ item, onPress, onAddToCart, index = 0 }: {
  item: ScoredProduct | Product; onPress: () => void;
  onAddToCart: (product: Product) => void; index?: number;
}) {
  const { theme } = useTheme();
  const [liked, setLiked]   = useState(false);
  const [adding, setAdding] = useState(false);
  const stars = Math.round((item as Product).rating ?? 0);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const cartBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: Math.min(index * 40, 400), useNativeDriver: true }).start();
  }, []);

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start();

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    Animated.sequence([
      Animated.spring(cartBounce, { toValue: 1.4, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(cartBounce, { toValue: 1,   useNativeDriver: true, tension: 300, friction: 5 }),
    ]).start();
    await onAddToCart(item as Product);
    setAdding(false);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], width: CARD_WIDTH, marginBottom: 14 }}>
      <TouchableWithoutFeedback onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={[s.productCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={s.imageContainer}>
            <Image source={{ uri: getProductImage(item as Product) }} style={s.productImage} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} contentFit="cover" transition={300} />
            <TouchableOpacity style={s.heartBtn} onPress={() => setLiked(!liked)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Heart size={14} color={liked ? theme.primary : '#8A8A8A'} fill={liked ? theme.primary : 'transparent'} />
            </TouchableOpacity>
          </View>
          <View style={s.productInfo}>
            {'reason' in item && (item as ScoredProduct).reason && (
              <View style={[s.reasonBadge, { backgroundColor: theme.tint }]}>
                <Sparkles size={9} color={theme.primary} strokeWidth={2} />
                <Text style={[s.reasonText, { color: theme.primary }]} numberOfLines={1}>{(item as ScoredProduct).reason}</Text>
              </View>
            )}
            <Text style={[s.productName, { color: theme.textPrimary, fontFamily: theme.fontBody }]} numberOfLines={2}>{item.name}</Text>
            <View style={s.starsRow}>
              {[1,2,3,4,5].map((i) => (
                <Star key={i} size={10} color={theme.primary} fill={i <= stars ? theme.primary : 'transparent'} />
              ))}
              <Text style={[s.ratingText, { color: theme.textSecondary }]}>{(item as Product).rating?.toFixed(1)}</Text>
            </View>
            <View style={s.priceRow}>
              <Text style={[s.productPrice, { color: theme.primary, fontFamily: theme.fontHeading }]}>GH₵{(item as Product).price.toFixed(2)}</Text>
              <Animated.View style={{ transform: [{ scale: cartBounce }] }}>
                <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }, adding && s.addBtnActive]} onPress={handleAdd} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} activeOpacity={0.8}>
                  <ShoppingCart size={13} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

function TrendingCard({ item, onPress, onAddToCart }: {
  item: ScoredProduct; onPress: () => void; onAddToCart: (p: Product) => void;
}) {
  const { theme } = useTheme();
  const [adding, setAdding] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start()}
    >
      <Animated.View style={[s.trendingCard, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ scale: scaleAnim }] }]}>
        <Image source={{ uri: getProductImage(item) }} style={s.trendingImage} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} contentFit="cover" transition={300} />
        <View style={[s.trendingBadge, { backgroundColor: theme.tint, borderColor: theme.secondary }]}>
          <Flame size={10} color={theme.primary} strokeWidth={2.5} />
          <Text style={[s.trendingBadgeTxt, { color: theme.primary }]}>Hot</Text>
        </View>
        <View style={s.trendingInfo}>
          <Text style={[s.trendingName, { color: theme.textPrimary }]} numberOfLines={2}>{item.name}</Text>
          <View style={s.trendingBottom}>
            <Text style={[s.trendingPrice, { color: theme.primary }]}>GH₵{item.price.toFixed(2)}</Text>
            <TouchableOpacity style={[s.trendingAddBtn, { backgroundColor: theme.primary }, adding && s.addBtnActive]} onPress={async () => { if (adding) return; setAdding(true); await onAddToCart(item); setAdding(false); }} activeOpacity={0.8}>
              <ShoppingCart size={11} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

function CartSnapBar({ cartCount, cartTotal, visible, onPress }: {
  cartCount: number; cartTotal: number; visible: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(120)).current;
  useEffect(() => {
    Animated.spring(translateY, { toValue: visible ? 0 : 120, useNativeDriver: true, tension: 70, friction: 10 }).start();
  }, [visible]);
  return (
    <Animated.View style={[snap.wrap, { transform: [{ translateY }] }]} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableOpacity style={snap.inner} onPress={onPress} activeOpacity={0.92}>
        <View style={snap.left}>
          <View style={[snap.iconWrap, { backgroundColor: theme.primary }]}>
            <ShoppingCart size={17} color="#fff" strokeWidth={2.5} />
            <View style={snap.dot}><Text style={[snap.dotTxt, { color: theme.primary }]}>{cartCount > 9 ? '9+' : cartCount}</Text></View>
          </View>
          <View>
            <Text style={snap.label}>Item added!</Text>
            <Text style={snap.sub}>{cartCount} {cartCount === 1 ? 'item' : 'items'} · GH₵ {cartTotal.toFixed(2)}</Text>
          </View>
        </View>
        <View style={snap.right}>
          <Text style={snap.viewTxt}>View Cart</Text>
          <View style={snap.arrowWrap}><ArrowRight size={14} color={theme.primary} strokeWidth={2.5} /></View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const snap = StyleSheet.create({
  wrap:     { position: 'absolute', bottom: Platform.OS === 'ios' ? 102 : 82, left: 16, right: 16, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 14 },
  inner:    { backgroundColor: '#1C1C1E', borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  dot:      { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  dotTxt:   { fontSize: 9, fontWeight: '800' },
  label:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  sub:      { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  right:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewTxt:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  arrowWrap:{ width: 28, height: 28, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});

function SectionHeader({ icon, title, onSeeAll }: { icon: React.ReactNode; title: React.ReactNode; onSeeAll?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleRow}>{icon}<Text style={[s.sectionTitle, { color: theme.textPrimary }]}>{title}</Text></View>
      {onSeeAll && <TouchableOpacity onPress={onSeeAll}><Text style={[s.seeAll, { color: theme.primary }]}>See all</Text></TouchableOpacity>}
    </View>
  );
}

// ─── Hidden camera — mounts the CameraView so cameraRef gets populated ────────
function HiddenCamera({ cameraRef, onCameraReady }: { cameraRef: any; onCameraReady: () => void }) {
  const mod = getLazyCamera() as any;
  const CameraView = mod?.CameraView;
  if (!CameraView) return null;

  return (
    <CameraView
      ref={cameraRef}
      facing="front"
      onCameraReady={onCameraReady}
      style={s.hiddenCamera}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { addToCart, cartCount, cartTotal } = useCart();
  const { theme, mood, setMood, moodPalette } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [snapVisible, setSnapVisible]           = useState(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  /* ── Vibe Search State ────────────────────────────────────────── */
  const [isVibeSearch, setIsVibeSearch] = useState(false);
  const [vibeQuery,    setVibeQuery]    = useState('');
  const [vibeSearching, setVibeSearching] = useState(false);
  const [vibeResults,  setVibeResults]  = useState<Product[] | null>(null);
  const [isListening,  setIsListening]  = useState(false);

  const handleVibeSearch = async () => {
    if (!vibeQuery.trim()) return;
    setVibeSearching(true);
    try {
      const vibeData = await VibeSearchService.interpretQuery(vibeQuery);
      const filtered = VibeSearchService.filterByVibe(allProducts, vibeData);
      setVibeResults(filtered);
      if (vibeData.mood) {
        const found = MOODS.find(m => m.key === vibeData.mood?.toLowerCase());
        if (found) setMood(found.key as any);
      }
    } catch (err) {
      console.error('Vibe search failed:', err);
    } finally {
      setVibeSearching(false);
    }
  };

  const clearVibeSearch = () => {
    setVibeQuery('');
    setVibeResults(null);
    setIsVibeSearch(false);
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      voiceService.stop();
      setIsListening(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      handleVibeSearch();
    } else {
      setIsListening(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      voiceService.start(
        (res) => {
          setVibeQuery(res.text);
          if (res.isFinal) {
            setIsListening(false);
            handleVibeSearch();
          }
        },
        (err) => {
          console.error('[Voice] Error:', err);
          setIsListening(false);
        }
      );
    }
  };

  /* ── Passive mood detection ─────────────────────────────────────── */
  const {
    detecting,
    permissionDenied,
    rescan,
    cameraRef,
    hasPermission,
    onCameraReady,
  } = useMoodDetectionContext();

  /* ── Products (TanStack Query) ───────────────────────────────────── */
  const selectedMood = MOODS.find(m => m.key === mood) ?? MOODS[7];

  const { data: allProducts = [], isLoading: loadingProducts, isRefetching } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: recommended = [], isLoading: loadingRecs } = useQuery({
    queryKey: ['recommendations', mood, allProducts.length],
    queryFn: () => getRecommendations(user?.id, mood, allProducts),
    enabled: allProducts.length > 0,
  });

  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: ['trending', allProducts.length],
    queryFn: () => getTrending(allProducts),
    enabled: allProducts.length > 0,
  });

  const loading = loadingProducts || (allProducts.length > 0 && (loadingRecs || loadingTrending));

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return allProducts;
    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    const keywords = cat?.keywords ?? [selectedCategory];
    return allProducts.filter(p => {
      const name = p.name.toLowerCase();
      const desc = ((p as any).description ?? '').toLowerCase();
      const tags = (p.mood_tags ?? []).map((t: string) => t.toLowerCase());
      return keywords.some(kw => name.includes(kw) || desc.includes(kw) || tags.some((tag: string) => tag.includes(kw)));
    });
  }, [selectedCategory, allProducts]);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };



  const handleAddToCart = async (product: Product) => {
    await addToCart(product.id, 1);
    setSnapVisible(true);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => setSnapVisible(false), 3000);
    if (user?.id) {
      NotificationService.send('🛒 Added to cart!', `${product.name} has been added to your cart.`);
    }
  };

  const firstName = profile?.name?.split(' ')[0] ?? null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const ListHeader = useMemo(() => (
    <>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={[s.greeting, { color: theme.inactive, fontFamily: theme.fontHeading }]}>{greeting.toUpperCase()}, {firstName?.toUpperCase() || 'THERE'} 👋</Text>
            <Text style={[s.userName, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Find your vibe</Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity 
              style={[s.headerIconBtn, { backgroundColor: isVibeSearch ? theme.primary : theme.border, borderColor: theme.border }]}
              onPress={() => setIsVibeSearch(!isVibeSearch)}
            >
              <Sparkles size={20} color={isVibeSearch ? '#fff' : theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => router.push('/chat' as any)}
            >
              <MessageSquare size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.headerIconBtn, { backgroundColor: theme.primary, borderColor: theme.border }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <User size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── AI Vibe Search Input ── */}
      {(isVibeSearch || vibeResults) && (
        <View style={[s.vibeSearchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={[s.vibeInputWrapper, { backgroundColor: theme.background, borderColor: isListening ? theme.primary : theme.border }]}>
            <TouchableOpacity onPress={toggleVoiceSearch}>
              <Mic size={18} color={isListening ? theme.primary : theme.textSecondary} style={s.vibeIcon} />
            </TouchableOpacity>
            <TextInput
              style={[s.vibeInput, { color: theme.textPrimary, fontFamily: theme.fontBody }]}
              placeholder="How are you feeling? (e.g. I need to relax)"
              placeholderTextColor={theme.inactive}
              value={vibeQuery}
              onChangeText={setVibeQuery}
              onSubmitEditing={handleVibeSearch}
              returnKeyType="search"
            />
            {vibeSearching ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : vibeResults ? (
              <TouchableOpacity onPress={clearVibeSearch}>
                <X size={18} color={theme.inactive} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleVibeSearch}>
                <ArrowRight size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
          {vibeResults && (
            <Text style={[s.vibeResultCount, { color: theme.textSecondary }]}>
              Found {vibeResults.length} items for your vibe ✨
            </Text>
          )}
        </View>
      )}

      {/* ── Mood Banner ── */}
      <View style={[s.moodBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={s.moodBannerLeft}>
          <View style={[s.moodEmojiCircle, { backgroundColor: moodPalette.tint, borderColor: moodPalette.secondary }]}>
            {detecting
              ? <ActivityIndicator size="small" color={moodPalette.primary} />
              : <EmojiText style={s.moodEmojiLarge}>{selectedMood.emoji}</EmojiText>
            }
          </View>
          <View>
            <Text style={[s.moodBannerLabel, { color: theme.textSecondary, fontFamily: theme.fontHeading }]}>CURRENT MOOD</Text>
            <Text style={[s.moodBannerName, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
              {detecting ? 'Detecting…' : selectedMood.label}
            </Text>
            <Text style={[s.moodBannerHint, { color: theme.inactive }]}>
              {detecting
                ? 'Reading your vibe in the background'
                : permissionDenied
                  ? 'Camera access denied · tap to pick manually'
                  : 'Auto-detected · tap to refine'}
            </Text>
          </View>
        </View>

        {/* Re-scan button — only shown once detection is done */}
        {!detecting && !permissionDenied && (
          <TouchableOpacity
            style={[s.scanBtn, { backgroundColor: theme.primary }]}
            onPress={rescan}
            activeOpacity={0.85}
          >
            <RefreshCw size={15} color="#fff" strokeWidth={2.5} />
            <Text style={s.scanBtnText}>Re-scan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mood Share Card (Viral) ── */}
      {!detecting && !permissionDenied && (
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <MoodShareCard mood={selectedMood.label} userName={firstName || undefined} />
        </View>
      )}

      {/* ── Mood Selector ── */}
      <View style={s.moodSelectorSection}>
        <Text style={[s.sectionLabel, { color: theme.inactive, fontFamily: theme.fontHeading }]}>HOW ARE YOU FEELING?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodScroll}>
          {MOODS.map((m) => {
            const active  = mood === m.key;
            const palette = MOOD_PALETTES[m.key];
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => {
                  setMood(m.key);
                  if (profile?.id) NotificationService.moodSelected(profile.id, m.label, m.emoji);
                }}
                style={[s.moodChip, { backgroundColor: active ? palette.tint : theme.card, borderColor: active ? palette.secondary : theme.border }]}
                activeOpacity={0.75}
              >
                <EmojiText style={s.moodChipEmoji}>{m.emoji}</EmojiText>
                <Text style={[s.moodChipLabel, { color: active ? palette.primary : theme.textSecondary, fontWeight: active ? '700' : '500' }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Trending Now ── */}
      {trending.length > 0 && (
        <View style={s.trendingSection}>
          <SectionHeader icon={<Flame size={16} color={theme.primary} strokeWidth={2} />} title="Trending Now" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.trendingScroll}>
            {trending.map(item => <TrendingCard key={item.id} item={item} onPress={() => router.push(`/product/${item.id}`)} onAddToCart={handleAddToCart} />)}
          </ScrollView>
        </View>
      )}

      {/* ── Recommended ── */}
      {recommended.length > 0 && (
        <View style={s.recommendedSection}>
          <SectionHeader
            icon={<Sparkles size={16} color={theme.primary} strokeWidth={2} />}
            title={['Recommended for ', selectedMood.label, ' ', <EmojiText key="mood-emoji">{selectedMood.emoji}</EmojiText>]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recommendedScroll}>
            {recommended.map((item, idx) => (
              <View key={item.id} style={{ width: CARD_WIDTH, marginRight: 12 }}>
                <ProductCard item={item} index={idx} onPress={() => router.push(`/product/${item.id}`)} onAddToCart={handleAddToCart} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Category Filter ── */}
      <View style={s.categorySection}>
        <Text style={[s.sectionLabel, { color: theme.inactive, fontFamily: theme.fontHeading }]}>BROWSE BY CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryScroll}>
          {CATEGORIES.map(cat => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity key={cat.id} style={[s.categoryChip, { backgroundColor: active ? theme.tint : theme.card, borderColor: active ? theme.secondary : theme.border }]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.75}>
                <EmojiText style={s.categoryEmoji}>{cat.emoji}</EmojiText>
                <Text style={[s.categoryLabel, { color: active ? theme.primary : theme.textSecondary, fontWeight: active ? '800' : '600' }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <SectionHeader
        icon={<TrendingUp size={16} color={theme.primary} strokeWidth={2} />}
        title={selectedCategory === 'all' ? 'All Products' : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Products'}
        onSeeAll={() => router.push('/search')}
      />

      {filteredProducts.length === 0 && (
        <View style={s.emptyCategory}>
          <Search size={36} color={theme.inactive} strokeWidth={1.5} />
          <Text style={[s.emptyCategoryText, { color: theme.inactive }]}>No products in this category yet.</Text>
        </View>
      )}
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [theme, mood, detecting, permissionDenied, selectedCategory, trending, recommended, filteredProducts, selectedMood, moodPalette]);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      {/* Hidden 1×1 camera — mounted as soon as permission granted so onCameraReady fires */}
      {Platform.OS !== 'web' && hasPermission === true && (
        <HiddenCamera cameraRef={cameraRef} onCameraReady={onCameraReady} />
      )}

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[s.loadingText, { color: theme.textSecondary }]}>Loading your feed…</Text>
        </View>
      ) : (
        <FlatList
          data={vibeResults || filteredProducts}
          keyExtractor={item => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.primary} />}
          contentContainerStyle={s.listContent}
          columnWrapperStyle={s.row}
          ListHeaderComponent={ListHeader}
          renderItem={({ item, index }) => (
            <ProductCard item={item as ScoredProduct} index={index} onPress={() => router.push(`/product/${item.id}`)} onAddToCart={handleAddToCart} />
          )}
          // Performance optimizations
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      <CartSnapBar cartCount={cartCount} cartTotal={cartTotal} visible={snapVisible} onPress={() => { setSnapVisible(false); router.push('/(tabs)/cart'); }} />
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  hiddenCamera: { position: 'absolute', width: 1, height: 1, opacity: 0, top: 0, left: 0 },
  loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { fontSize: 14, fontWeight: '500' },
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 18, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting:      { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2, textTransform: 'uppercase' },
  userName:      { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  headerIcons:   { flexDirection: 'row', gap: 8 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notifDot:      { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5 },
  
  vibeSearchContainer: { padding: 16, borderBottomWidth: 1 },
  vibeInputWrapper:    { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 25, borderWidth: 1, paddingHorizontal: 16 },
  vibeIcon:            { marginRight: 10 },
  vibeInput:           { flex: 1, fontSize: 14, fontWeight: '600' },
  vibeResultCount:     { fontSize: 11, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  listContent: { paddingBottom: 120 },
  row:         { paddingHorizontal: 12, justifyContent: 'space-between' },
  moodBanner:     { marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  moodBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  moodEmojiCircle:{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  moodEmojiLarge: { fontSize: 26 },
  moodBannerLabel:{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2, textTransform: 'uppercase' },
  moodBannerName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  moodBannerHint: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.2, lineHeight: 14 },
  scanBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  scanBtnText:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  moodSelectorSection: { marginTop: 16, marginBottom: 8 },
  sectionLabel:        { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, paddingHorizontal: 16, textTransform: 'uppercase' },
  moodScroll:          { paddingHorizontal: 16, gap: 8 },
  moodChip:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  moodChipEmoji:       { fontSize: 16 },
  moodChipLabel:       { fontSize: 12 },
  trendingSection: { marginBottom: 8 },
  trendingScroll:  { paddingHorizontal: 16, gap: 12 },
  trendingCard:    { width: TRENDING_CARD_WIDTH, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  trendingImage:   { width: '100%', height: 120 },
  trendingBadge:   { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1 },
  trendingBadgeTxt:{ fontSize: 11, fontWeight: '800' },
  trendingInfo:    { padding: 10 },
  trendingName:    { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 6 },
  trendingBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendingPrice:   { fontSize: 13, fontWeight: '900' },
  trendingAddBtn:  { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  recommendedSection: { marginBottom: 8 },
  recommendedScroll:  { paddingHorizontal: 16 },
  categorySection: { marginBottom: 4 },
  categoryScroll:  { paddingHorizontal: 16, gap: 8 },
  categoryChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  categoryEmoji:   { fontSize: 14 },
  categoryLabel:   { fontSize: 12 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  seeAll:         { fontSize: 13, fontWeight: '700' },
  emptyCategory:     { alignItems: 'center', paddingVertical: 32 },
  emptyCategoryEmoji:{ fontSize: 36, marginBottom: 8 },
  emptyCategoryText: { fontSize: 14, fontWeight: '500' },
  productCard:   { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  imageContainer:{ position: 'relative' },
  productImage:  { width: '100%', height: 150 },
  heartBtn:      { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  productInfo:   { padding: 10, gap: 4 },
  reasonBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 2 },
  reasonText:    { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  productName:   { fontSize: 13, fontWeight: '600', lineHeight: 18, minHeight: 36 },
  starsRow:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText:    { fontSize: 11, fontWeight: '500', marginLeft: 3 },
  priceRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  productPrice:  { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  addBtn:        { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  addBtnActive:  { opacity: 0.6 },
});