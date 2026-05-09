/**
 * app/reviews.tsx
 * Fully themed for light & dark mode via ThemeContext
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, Star, Pencil, Trash2,
  MessageSquare, ShoppingBag, ChevronRight,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id:            string;
  user_id:       string;
  product_id:    string;
  rating:        number;
  comment:       string;
  created_at:    string;
  reviewer_name: string;
  products?: {
    id:    string;
    name:  string;
    image: string;
    price: number;
  };
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          color="#F59E0B"
          fill={i <= Math.round(rating) ? '#F59E0B' : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review, onEdit, onDelete, onPress,
}: {
  review:   Review;
  onEdit:   (r: Review) => void;
  onDelete: (r: Review) => void;
  onPress:  (r: Review) => void;
}) {
  const { theme, isDark } = useTheme();

  const date = new Date(review.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <TouchableOpacity
      style={[rc.card, {
        backgroundColor: theme.card,
        borderColor:     theme.border,
      }]}
      onPress={() => onPress(review)}
      activeOpacity={0.85}
    >
      {/* Product row */}
      <View style={rc.productRow}>
        <View style={[rc.imgWrap, { backgroundColor: theme.background }]}>
          <Image
            source={{ uri: review.products?.image ?? 'https://picsum.photos/200' }}
            style={rc.img}
            contentFit="cover"
            transition={200}
          />
        </View>
        <View style={rc.productInfo}>
          <Text style={[rc.productName, { color: theme.textPrimary }]} numberOfLines={2}>
            {review.products?.name ?? 'Product'}
          </Text>
          <Text style={[rc.productPrice, { color: theme.textSecondary }]}>
            GH₵{review.products?.price?.toFixed(2)}
          </Text>
        </View>
        <ChevronRight size={16} color={theme.inactive} strokeWidth={2} />
      </View>

      <View style={[rc.divider, { backgroundColor: theme.border }]} />

      {/* Review content */}
      <View style={rc.reviewContent}>
        <View style={rc.ratingRow}>
          <Stars rating={review.rating} size={16} />
          <Text style={rc.ratingLabel}>{ratingLabels[review.rating]}</Text>
          <Text style={[rc.date, { color: theme.inactive }]}>{date}</Text>
        </View>
        {!!review.comment && (
          <Text style={[rc.comment, { color: theme.textSecondary }]}>
            {review.comment}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={rc.actions}>
        <TouchableOpacity
          style={[rc.editBtn, {
            backgroundColor: isDark ? '#0D1F2D' : '#EBF4F8',
          }]}
          onPress={() => onEdit(review)}
          activeOpacity={0.8}
        >
          <Pencil size={13} color="#0A7EA4" strokeWidth={2} />
          <Text style={rc.editTxt}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[rc.deleteBtn, {
            backgroundColor: isDark ? '#2D1515' : '#FFF0F0',
          }]}
          onPress={() => onDelete(review)}
          activeOpacity={0.8}
        >
          <Trash2 size={13} color="#E53E3E" strokeWidth={2} />
          <Text style={rc.deleteTxt}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card:        { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1,
                 ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  productRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  imgWrap:     { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  img:         { width: '100%', height: '100%' },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 3 },
  productPrice:{ fontSize: 12, fontWeight: '600' },
  divider:     { height: 1, marginBottom: 12 },
  reviewContent:{ marginBottom: 12 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ratingLabel: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  date:        { fontSize: 11, marginLeft: 'auto' as any },
  comment:     { fontSize: 13, lineHeight: 20 },
  actions:     { flexDirection: 'row', gap: 10 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  editTxt:     { fontSize: 12, fontWeight: '700', color: '#0A7EA4' },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  deleteTxt:   { fontSize: 12, fontWeight: '700', color: '#E53E3E' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReviewsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();

  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const primary = theme.primary;

  const fetchReviews = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('reviews')
      .select(`*, products (id, name, image, price)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data as Review[]);
    if (error) console.error('[Reviews]', error);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleEdit   = (r: Review) => router.push(`/product/${r.product_id}`);
  const handlePress  = (r: Review) => router.push(`/product/${r.product_id}`);
  const handleDelete = (review: Review) => {
    Alert.alert('Delete Review', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('reviews').delete().eq('id', review.id);
          setReviews(prev => prev.filter(r => r.id !== review.id));
        },
      },
    ]);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* ── Header ── */}
      <View style={[s.header, {
        backgroundColor:  theme.card,
        borderBottomColor: theme.border,
      }]}>
        <TouchableOpacity
          style={[s.backBtn, {
            backgroundColor: theme.background,
            borderColor:     theme.border,
          }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={[s.headerEyebrow, { color: primary }]}>MY REVIEWS</Text>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Reviews</Text>
        </View>

        <View style={s.headerRight}>
          {reviews.length > 0 && (
            <View style={[s.statBadge, {
              backgroundColor: isDark ? '#1A1400' : '#FFFBEB',
              borderColor:     isDark ? '#3D3000' : '#FDE68A',
            }]}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
              <Text style={s.statBadgeTxt}>{avgRating}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Stats bar ── */}
      {reviews.length > 0 && (
        <View style={[s.statsRow, {
          backgroundColor:  theme.card,
          borderBottomColor: theme.border,
        }]}>
          {[
            { value: String(reviews.length),               label: 'Total Reviews' },
            { value: `${avgRating} ⭐`,                    label: 'Avg Rating'    },
            { value: String(reviews.filter(r => r.rating >= 4).length), label: 'Positive' },
          ].map((stat, i) => (
            <View key={i} style={s.statWrap}>
              {i > 0 && <View style={[s.statDivider, { backgroundColor: theme.border }]} />}
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: theme.textPrimary }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: theme.inactive }]}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={[s.loadingTxt, { color: theme.textSecondary }]}>
            Loading your reviews…
          </Text>
        </View>

      ) : !user ? (
        <View style={s.centered}>
          <View style={[s.emptyIcon, {
            backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
            borderColor:     isDark ? '#3D2030' : '#FFD6DE',
          }]}>
            <MessageSquare size={32} color={primary} strokeWidth={1.5} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
            Sign in to see reviews
          </Text>
        </View>

      ) : reviews.length === 0 ? (
        <View style={s.centered}>
          <View style={[s.emptyIcon, {
            backgroundColor: isDark ? '#2D1820' : '#FFF0F2',
            borderColor:     isDark ? '#3D2030' : '#FFD6DE',
          }]}>
            <ShoppingBag size={32} color={primary} strokeWidth={1.5} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No reviews yet</Text>
          <Text style={[s.emptySub,  { color: theme.textSecondary }]}>
            Buy products and share your thoughts to help others find what matches their mood.
          </Text>
          <TouchableOpacity
            style={[s.shopBtn, { backgroundColor: primary }]}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={s.shopBtnTxt}>Start Shopping</Text>
          </TouchableOpacity>
        </View>

      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReviews(); }}
              tintColor={primary}
            />
          }
        >
          <Text style={[s.listLabel, { color: theme.inactive }]}>
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} · tap any to view the product
          </Text>
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPress={handlePress}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles (structural only — no hardcoded colours) ─────────────────────────

const s = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  headerCenter:  { flex: 1, paddingHorizontal: 12 },
  headerEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle:   { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  headerRight:   { width: 40, alignItems: 'flex-end' },
  statBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  statBadgeTxt:  { fontSize: 12, fontWeight: '800', color: '#F59E0B' },

  statsRow:    { flexDirection: 'row', borderBottomWidth: 1 },
  statWrap:    { flex: 1, flexDirection: 'row' },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue:   { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  statLabel:   { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, marginVertical: 10 },

  list:      { padding: 16 },
  listLabel: { fontSize: 12, fontWeight: '500', marginBottom: 14, textAlign: 'center' },

  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  loadingTxt: { fontSize: 14, marginTop: 12 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.4 },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  shopBtn:    { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  shopBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});