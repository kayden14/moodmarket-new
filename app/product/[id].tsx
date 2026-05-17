/**
 * app/product/[id].tsx — responsive for web + mobile
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, useWindowDimensions, Share,
  Animated, Platform, TextInput, Alert, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, Star, ShoppingCart, Heart, Share2,
  Package, Tag, CheckCircle, MessageSquare,
  Send, Pencil, Trash2, User, Minus,
} from 'lucide-react-native';
import EmojiText from '@/components/EmojiText';
import { getProductImage } from '@/utils/images';
import { notifyUser } from '@/services/notifyUser';
import ProductRecommendations from '@/components/ProductRecommendations';
import { useResponsive } from '@/hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const SUCCESS_GREEN = '#22C55E';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id:            string;
  user_id:       string;
  product_id:    string;
  rating:        number;
  comment:       string;
  created_at:    string;
  reviewer_name: string;
}


// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarInput({ value, onChange, size = 32, disabled = false }: {
  value: number; onChange: (r: number) => void; size?: number; disabled?: boolean;
}) {
  const scales = useRef([1,2,3,4,5].map(() => new Animated.Value(1))).current;

  const handlePress = (rating: number) => {
    if (disabled) return;
    onChange(rating);
    Animated.sequence([
      Animated.spring(scales[rating-1], { toValue: 1.4, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scales[rating-1], { toValue: 1,   useNativeDriver: true, tension: 300, friction: 5 }),
    ]).start();
  };

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <Animated.View key={i} style={{ transform: [{ scale: scales[i-1] }] }}>
          <TouchableOpacity onPress={() => handlePress(i)} activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} disabled={disabled}>
            <Star size={size} color={i <= value ? '#F59E0B' : '#777'}
              fill={i <= value ? '#F59E0B' : 'transparent'} strokeWidth={1.5} />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}

// ─── Star Display ─────────────────────────────────────────────────────────────

function StarDisplay({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} color="#F59E0B"
          fill={i <= Math.round(rating) ? '#F59E0B' : 'transparent'} strokeWidth={1.5} />
      ))}
    </View>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, isOwn, onEdit, onDelete }: {
  review: Review; isOwn: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const { theme } = useTheme();
  const initials = (review.reviewer_name || 'A').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  const date = new Date(review.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  return (
    <View style={[rc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={rc.top}>
        <View style={[rc.avatar, { backgroundColor: theme.primary }]}>
          <Text style={rc.avatarTxt}>{initials}</Text>
        </View>
        <View style={rc.meta}>
          <Text style={[rc.name, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{review.reviewer_name || 'Anonymous'}</Text>
          <StarDisplay rating={review.rating} size={12} />
        </View>
        <View style={rc.right}>
          <Text style={[rc.date, { color: theme.inactive }]}>{date}</Text>
          {isOwn && (
            <View style={rc.actions}>
              <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Pencil size={13} color={theme.primary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={13} color="#FF4444" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      {!!review.comment && (
        <Text style={[rc.comment, { color: theme.textSecondary, fontFamily: theme.fontBody }]}>{review.comment}</Text>
      )}
    </View>
  );
}

const rc = StyleSheet.create({
  card:      { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1,
               ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 1 } }) },
  top:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatar:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  meta:      { flex: 1, gap: 3 },
  name:      { fontSize: 13, fontWeight: '700' },
  right:     { alignItems: 'flex-end', gap: 6 },
  date:      { fontSize: 10, fontWeight: '500' },
  actions:   { flexDirection: 'row', gap: 10 },
  comment:   { fontSize: 13, lineHeight: 20 },
});

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({ productId, userId, userProfile, onAverageUpdate }: {
  productId: string; userId: string | undefined;
  userProfile: any; onAverageUpdate: (avg: number, count: number) => void;
}) {
  const { theme, isDark } = useTheme();

  const [reviews,      setReviews]      = useState<Review[]>([]);
  const [myReview,     setMyReview]     = useState<Review | null>(null);
  const [draftRating,  setDraftRating]  = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(true);

  const fetchReviews = async () => {
    const { data } = await supabase.from('reviews').select('*')
      .eq('product_id', productId).order('created_at', { ascending: false });
    if (data) {
      setReviews(data);
      const mine = data.find(r => r.user_id === userId) ?? null;
      setMyReview(mine);
      if (data.length > 0) {
        const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
        onAverageUpdate(avg, data.length);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();

    const channel = supabase
      .channel(`product-reviews-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `product_id=eq.${productId}`,
        },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, userId]);

  const handleSubmit = async () => {
    if (!userId) { Alert.alert('Sign in', 'Please log in to leave a review.'); return; }
    if (draftRating === 0) { Alert.alert('Rating required', 'Please tap a star to set your rating.'); return; }
    setSubmitting(true);
    const payload = { user_id: userId, product_id: productId, rating: draftRating, comment: draftComment.trim(), reviewer_name: userProfile?.name ?? 'Anonymous' };
    const { error } = myReview
      ? await supabase.from('reviews').update(payload).eq('id', myReview.id)
      : await supabase.from('reviews').insert(payload);
    setSubmitting(false);
    if (error) { Alert.alert('Error', 'Could not save your review. Please try again.'); return; }
    setShowForm(false); setDraftRating(0); setDraftComment('');
    fetchReviews();
  };

  const handleEdit = (review: Review) => {
    setDraftRating(review.rating); setDraftComment(review.comment ?? ''); setShowForm(true);
  };

  const handleDelete = () => {
    Alert.alert('Delete review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!myReview) return;
        await supabase.from('reviews').delete().eq('id', myReview.id);
        setMyReview(null); fetchReviews();
      }},
    ]);
  };

  const canReview   = !!userId && !myReview;
  const hasReviewed = !!myReview;

  return (
    <View style={rs.section}>
      {/* Header */}
      <View style={rs.header}>
        <View style={rs.headerLeft}>
          <MessageSquare size={15} color={theme.primary} strokeWidth={2} />
          <Text style={[rs.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Reviews</Text>
          {reviews.length > 0 && (
            <View style={[rs.countBadge, {
              backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
              borderColor:     isDark ? '#3D2030' : '#FFD6DE',
            }]}>
              <Text style={[rs.countTxt, { color: theme.primary, fontFamily: theme.fontHeading }]}>{reviews.length}</Text>
            </View>
          )}
        </View>
        {(canReview || hasReviewed) && !showForm && (
          <TouchableOpacity
            style={[rs.writeBtn, {
              backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
              borderColor:     isDark ? '#3D2030' : '#FFD6DE',
            }]}
            onPress={() => { if (hasReviewed) handleEdit(myReview!); else setShowForm(true); }}
            activeOpacity={0.8}
          >
            <Pencil size={12} color={theme.primary} strokeWidth={2.5} />
            <Text style={[rs.writeBtnTxt, { color: theme.primary, fontFamily: theme.fontHeading }]}>
              {hasReviewed ? 'Edit yours' : 'Write a review'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Review form */}
      {showForm && (
        <View style={[rs.form, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <Text style={[rs.formLabel, { color: theme.inactive }]}>YOUR RATING</Text>
          <StarInput value={draftRating} onChange={setDraftRating} size={34} />
          <Text style={[rs.formLabel, { color: theme.inactive, marginTop: 16 }]}>YOUR REVIEW (optional)</Text>
          <TextInput
            style={[rs.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary, fontFamily: theme.fontBody }]}
            value={draftComment} onChangeText={setDraftComment}
            placeholder="Share your experience with this product…"
            placeholderTextColor={theme.inactive}
            multiline numberOfLines={4} textAlignVertical="top" maxLength={500}
          />
          <Text style={[rs.charCount, { color: theme.inactive }]}>{draftComment.length}/500</Text>
          <View style={rs.formActions}>
            <TouchableOpacity
              style={[rs.cancelBtn, { borderColor: theme.border }]}
              onPress={() => { setShowForm(false); setDraftRating(0); setDraftComment(''); }}
            >
              <Text style={[rs.cancelTxt, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rs.submitBtn, { backgroundColor: theme.primary }, (submitting || draftRating === 0) && rs.submitDisabled]}
              onPress={handleSubmit} disabled={submitting || draftRating === 0} activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Send size={14} color="#fff" strokeWidth={2.5} /><Text style={rs.submitTxt}>Submit</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Guest prompt */}
      {!userId && (
        <View style={[rs.guestPrompt, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <User size={16} color={theme.inactive} strokeWidth={2} />
          <Text style={[rs.guestTxt, { color: theme.inactive }]}>Sign in to leave a review</Text>
        </View>
      )}

      {/* Reviews list */}
      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
      ) : reviews.length === 0 ? (
        <View style={rs.empty}>
          <EmojiText style={rs.emptyEmoji}>⭐</EmojiText>
          <Text style={[rs.emptyTitle, { color: theme.textPrimary }]}>No reviews yet</Text>
          <Text style={[rs.emptySub, { color: theme.textSecondary }]}>Be the first to share your thoughts!</Text>
        </View>
      ) : (
        reviews.map(r => (
          <ReviewCard key={r.id} review={r} isOwn={r.user_id === userId}
            onEdit={() => handleEdit(r)} onDelete={handleDelete} />
        ))
      )}
    </View>
  );
}

const rs = StyleSheet.create({
  section:    { paddingHorizontal: 22, paddingBottom: 24 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:      { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  countBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  countTxt:   { fontSize: 11, fontWeight: '800' },
  writeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  writeBtnTxt:{ fontSize: 12, fontWeight: '700' },
  form:       { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5,
                ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 3 } }) },
  formLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  input:      { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 100, marginBottom: 4 },
  charCount:  { fontSize: 10, textAlign: 'right', marginBottom: 14 },
  formActions:{ flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  cancelTxt:  { fontSize: 14, fontWeight: '700' },
  submitBtn:  { flex: 2, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                ...Platform.select({ ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitDisabled: { opacity: 0.45 },
  submitTxt:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  guestPrompt:{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  guestTxt:   { fontSize: 13, fontWeight: '500' },
  empty:      { alignItems: 'center', paddingVertical: 28 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptySub:   { fontSize: 13 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { addToCart, cartCount } = useCart();
  const { theme, isDark } = useTheme();
  const { isWeb, isWide, width: windowWidth } = useResponsive();
  const insets = useSafeAreaInsets();

  const [product,      setProduct]      = useState<Product | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [added,        setAdded]        = useState(false);
  const [wished,       setWished]       = useState(false);
  const [quantity,     setQuantity]     = useState(1);
  const [liveRating,   setLiveRating]   = useState<{ avg: number; count: number } | null>(null);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (data) setProduct(data);
    setLoading(false);
  };

  const handleAddToCart = async () => {
    if (!user) { router.push('/login'); return; }
    setAddingToCart(true);
    await addToCart(id as string, quantity);
    setAddingToCart(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    if (user?.id && product) notifyUser.addedToCart(user.id, product.name);
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        title: product.name,
        message: `Check out ${product.name} on MoodMarket — GH₵${product.price.toFixed(2)}\n\n${product.description}`,
      });
    } catch {}
  };

  const displayRating = liveRating?.avg ?? product?.rating ?? 0;
  const displayCount  = liveRating?.count ?? 0;

  // ── Loading state ──
  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={{ fontSize: 14, color: theme.textSecondary, fontWeight: '500' }}>Loading product…</Text>
    </View>
  );

  // ── Not found ──
  if (!product) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: theme.background, paddingHorizontal: 40 }}>
      <Package size={48} color={theme.inactive} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 12 }}>Product not found</Text>
      <TouchableOpacity style={[s.errorBack, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Product details panel (shared between layouts) ──
  const DetailsPanel = () => (
    <>
      {/* Name + price */}
      <View style={s.nameRow}>
        <Text style={[s.productName, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{product.name}</Text>
        <Text style={[s.productPrice, { color: theme.primary, fontFamily: theme.fontHeading }]}>GH₵{product.price.toFixed(2)}</Text>
      </View>

      {/* Rating row */}
      <View style={s.ratingRow}>
        <View style={s.starsRow}>
          <StarDisplay rating={displayRating} size={15} />
          <Text style={[s.ratingValue, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{displayRating.toFixed(1)}</Text>
          <Text style={[s.ratingCount, { color: theme.textSecondary, fontFamily: theme.fontBody }]}>({displayCount} {displayCount === 1 ? 'review' : 'reviews'})</Text>
        </View>
        <View style={[s.stockBadge, { backgroundColor: isDark ? '#0D2B1A' : '#EDFBF1' }]}>
          <View style={[s.stockDot, { backgroundColor: SUCCESS_GREEN }]} />
          <Text style={[s.stockText, { color: SUCCESS_GREEN }]}>In Stock</Text>
        </View>
      </View>

      <View style={[s.divider, { backgroundColor: theme.border }]} />

      {/* Description */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Description</Text>
        <Text style={[s.description, { color: theme.textSecondary, fontFamily: theme.fontBody }]}>{product.description}</Text>
      </View>

      {/* Mood tags */}
      {product.mood_tags && product.mood_tags.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Tag size={15} color={theme.primary} />
            <Text style={[s.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Mood Tags</Text>
          </View>
          <View style={s.tagsWrap}>
            {product.mood_tags.map((tag: string, i: number) => (
              <View key={i} style={[s.tag, {
                backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
                borderColor:     isDark ? '#3D2030' : '#FFD6DE',
              }]}>
                <Text style={[s.tagText, { color: theme.primary, fontFamily: theme.fontHeading }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quantity */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Quantity</Text>
        <View style={s.qtyRow}>
          <TouchableOpacity
            style={[s.qtyBtn, { backgroundColor: theme.card, borderColor: theme.border }, quantity <= 1 && s.qtyBtnDisabled]}
            onPress={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}
          >
            <Minus size={18} color={theme.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[s.qtyValue, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{quantity}</Text>
          <TouchableOpacity
            style={[s.qtyBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setQuantity(q => q + 1)}
          >
            <Text style={[s.qtyBtnText, { color: theme.textPrimary }]}>+</Text>
          </TouchableOpacity>
          <Text style={[s.qtyTotal, { color: theme.textSecondary }]}>
            = GH₵{(product.price * quantity).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Add to cart (wide desktop layout inlines the footer here) */}
      {isWeb && isWide && (
        <>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.inlineFooter}>
            <TouchableOpacity
              style={[s.wishlistBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setWished(w => {
                const next = !w;
                if (next && user?.id && product) notifyUser.likedProduct(user.id, product.name);
                return next;
              })}
              activeOpacity={0.8}
            >
              <Heart size={20} color={wished ? theme.primary : theme.inactive}
                fill={wished ? theme.primary : 'transparent'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.addBtn,
                { backgroundColor: added ? SUCCESS_GREEN : theme.primary },
                addingToCart && { opacity: 0.7 },
              ]}
              onPress={handleAddToCart}
              disabled={addingToCart}
              activeOpacity={0.85}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : added ? (
                <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
              ) : (
                <ShoppingCart size={18} color="#fff" />
              )}
              <Text style={[s.addBtnTxt, { fontFamily: theme.fontHeading }]}>
                {addingToCart ? 'Adding…' : added ? 'Added to Cart!' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>

            {added && !addingToCart && (
              <TouchableOpacity
                style={[s.viewCartBtn, {
                  backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
                  borderColor:     isDark ? '#3D2030' : '#FFD6DE',
                }]}
                onPress={() => router.push('/(tabs)/cart')}
                activeOpacity={0.85}
              >
                <ShoppingCart size={18} color={theme.primary} strokeWidth={2} />
                <Text style={[s.viewCartTxt, { color: theme.primary }]}>{cartCount}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // WEB + WIDE: sticky image left, scrollable details+reviews right
  // ────────────────────────────────────────────────────────────────────────────
  if (isWeb && isWide) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Top nav bar */}
        <View style={[s.webNav, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={s.webNavInner}>
            <TouchableOpacity style={s.webBackBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ArrowLeft size={18} color={theme.textPrimary} strokeWidth={2} />
              <Text style={[s.webBackTxt, { color: theme.textPrimary }]}>Back</Text>
            </TouchableOpacity>
            <View style={s.webNavActions}>
              <TouchableOpacity style={[s.webNavBtn, { borderColor: theme.border }]} onPress={() => setWished(w => !w)} activeOpacity={0.7}>
                <Heart size={17} color={wished ? theme.primary : theme.textSecondary}
                  fill={wished ? theme.primary : 'transparent'} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.webNavBtn, { borderColor: theme.border }]} onPress={() => router.push('/(tabs)/cart')} activeOpacity={0.7}>
                <View>
                  <ShoppingCart size={17} color={theme.textSecondary} />
                  {cartCount > 0 && (
                    <View style={[s.cartBadge, { backgroundColor: theme.primary }]}>
                      <Text style={s.cartBadgeTxt}>{cartCount > 9 ? '9+' : cartCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.webNavBtn, { borderColor: theme.border }]} onPress={handleShare} activeOpacity={0.7}>
                <Share2 size={17} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Split layout: sticky image left | scrollable content right */}
        <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>

          {/* Left — sticky image column */}
          <View
            style={{
              flex: 1.1,
              padding: 40,
              // @ts-ignore — web-only CSS property
              ...(Platform.OS === 'web' && {
                position: 'sticky',
                top: 0,
                alignSelf: 'flex-start',
              }),
            }}
          >
            <Image
              source={{ uri: getProductImage(product) }}
              style={[s.webImage, { backgroundColor: theme.card }]}
            />
          </View>

           {/* Right — independently scrollable details + reviews */}
          <View
            style={[
              s.webRightCol,
              {
                borderLeftColor: theme.border,
                ...(Platform.OS === 'web' && {
                  height: 'calc(100vh - 70px)',
                  overflowY: 'auto',
                } as any), // Cast to 'any' to allow web-specific CSS properties
              },
            ]}
          >
            <View style={{ padding: 40, maxWidth: 720 }}>
              {/* Details card */}
              <View style={[s.webDetailsCol, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <DetailsPanel />
              </View>

              {/* Reviews */}
              <View style={{ marginTop: 32 }}>
                <ReviewSection
                  productId={id as string}
                  userId={user?.id}
                  userProfile={profile}
                  onAverageUpdate={(avg, count) => setLiveRating({ avg, count })}
                />
              </View>

              {/* Recommendations */}
              {product.mood_tags && product.mood_tags.length > 0 && (
                <View style={{ marginTop: 32 }}>
                  <ProductRecommendations
                    currentProductId={id as string}
                    moodTags={product.mood_tags}
                  />
                </View>
              )}

              <View style={{ height: 60 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MOBILE / NARROW WEB: original stacked layout
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Floating header ── */}
      <View style={[s.floatingHeader, { paddingTop: Math.max(12, insets.top) }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#111" />
        </TouchableOpacity>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setWished(w => !w)}>
            <Heart size={20} color={wished ? theme.primary : '#111'} fill={wished ? theme.primary : 'transparent'} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/(tabs)/cart')}>
            <View>
              <ShoppingCart size={20} color="#111" />
              {cartCount > 0 && (
                <View style={[s.cartBadge, { backgroundColor: theme.primary }]}>
                  <Text style={s.cartBadgeTxt}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
            <Share2 size={20} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">

        {/* ── Hero image ── */}
        <Image
          source={{ uri: getProductImage(product) }}
          style={[s.productImage, { width: windowWidth, height: Math.min(windowWidth * 0.8, 350) }]}
        />

        {/* ── Content card ── */}
        <View style={[s.contentCard, { backgroundColor: theme.background }]}>
          <DetailsPanel />
          <View style={[s.divider, { backgroundColor: theme.border }]} />
        </View>

        {/* ── Reviews ── */}
        <ReviewSection
          productId={id as string}
          userId={user?.id}
          userProfile={profile}
          onAverageUpdate={(avg, count) => setLiveRating({ avg, count })}
        />

        {/* ── Recommendations ── */}
        {product.mood_tags && product.mood_tags.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <ProductRecommendations
              currentProductId={id as string}
              moodTags={product.mood_tags}
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Footer (mobile only) ── */}
      <View style={[s.footer, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Math.max(16, insets.bottom) }]}>
        <TouchableOpacity
          style={[s.wishlistBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => setWished(w => {
            const next = !w;
            if (next && user?.id && product) notifyUser.likedProduct(user.id, product.name);
            return next;
          })}
          activeOpacity={0.8}
        >
          <Heart size={20} color={wished ? theme.primary : theme.inactive}
            fill={wished ? theme.primary : 'transparent'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.addBtn,
            { backgroundColor: added ? SUCCESS_GREEN : theme.primary },
            addingToCart && { opacity: 0.7 },
          ]}
          onPress={handleAddToCart}
          disabled={addingToCart}
          activeOpacity={0.85}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : added ? (
            <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
          ) : (
            <ShoppingCart size={18} color="#fff" />
          )}
          <Text style={s.addBtnTxt}>
            {addingToCart ? 'Adding…' : added ? 'Added to Cart!' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>

        {added && !addingToCart && (
          <TouchableOpacity
            style={[s.viewCartBtn, {
              backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
              borderColor:     isDark ? '#3D2030' : '#FFD6DE',
            }]}
            onPress={() => router.push('/(tabs)/cart')}
            activeOpacity={0.85}
          >
            <ShoppingCart size={18} color={theme.primary} strokeWidth={2} />
            <Text style={[s.viewCartTxt, { color: theme.primary }]}>{cartCount}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  errorBack:     { marginTop: 16, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },

  // ── Web nav bar ──
  webNav:        { borderBottomWidth: 1, paddingHorizontal: 24, paddingVertical: 14 },
  webNavInner:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, alignSelf: 'center', width: '100%' },
  webBackBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  webBackTxt:    { fontSize: 14, fontWeight: '600' },
  webNavActions: { flexDirection: 'row', gap: 8 },
  webNavBtn:     { width: 38, height: 38, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Web split layout ──
  webRightCol:   { flex: 1, borderLeftWidth: 1 },
  webImage:      { width: '100%', aspectRatio: 1, resizeMode: 'cover', borderRadius: 20 },
  webDetailsCol: { borderRadius: 20, padding: 32, borderWidth: 1,
                   ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20 }, android: { elevation: 2 } }) },

  // ── Inline footer (wide web) ──
  inlineFooter:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },

  // ── Mobile floating header ──
  floatingHeader:{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cartBadge:     { position: 'absolute', top: -5, right: -5, minWidth: 15, height: 15, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#fff' },
  cartBadgeTxt:  { fontSize: 10, fontWeight: '800', color: '#fff' },

  // ── Mobile image + content card ──
  productImage:  { resizeMode: 'cover' },
  contentCard:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingHorizontal: 22, paddingTop: 28 },

  // ── Shared detail styles ──
  nameRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  productName:   { flex: 1, fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },
  productPrice:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  ratingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  starsRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingValue:   { fontSize: 14, fontWeight: '800', marginLeft: 2 },
  ratingCount:   { fontSize: 12, fontWeight: '500' },
  stockBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  stockDot:      { width: 6, height: 6, borderRadius: 3 },
  stockText:     { fontSize: 12, fontWeight: '600' },

  divider:       { height: 1, marginBottom: 22 },
  section:       { marginBottom: 22 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 10, letterSpacing: 0.1 },
  description:   { fontSize: 14, lineHeight: 22 },

  tagsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  tag:           { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tagText:       { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  qtyRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn:        { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled:{ opacity: 0.4 },
  qtyBtnText:    { fontSize: 18, fontWeight: '600', lineHeight: 22 },
  qtyValue:      { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  qtyTotal:      { fontSize: 14, fontWeight: '500', marginLeft: 4 },

  // ── Mobile footer ──
  footer:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, gap: 10 },
  wishlistBtn:   { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  addBtn:        { flex: 1, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
                   shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  addBtnTxt:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  viewCartBtn:   { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  viewCartTxt:   { position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: '800', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 3, minWidth: 14, textAlign: 'center', borderWidth: 1 },
});