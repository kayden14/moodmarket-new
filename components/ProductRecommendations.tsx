// components/ProductRecommendations.tsx
//
// "You might also like" section for product detail page (native + web fallback).
// Fetches products with overlapping mood_tags, falling back to top-rated.

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { getProductImage } from '@/utils/images';
import { Star } from 'lucide-react-native';
import type { Product } from '@/types/database';

function RecCard({ product, index }: { product: Product; index: number }) {
  const { theme } = useTheme();
  const router = useRouter();
  const stars = Math.round(product.rating ?? 0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => router.push(`/product/${product.id}`)}
        activeOpacity={0.8}
      >
        <View style={s.imageWrap}>
          <Image
            source={{ uri: getProductImage(product) }}
            style={s.image}
            contentFit="cover"
            transition={200}
          />
          {product.mood_tags && product.mood_tags[0] && (
            <View style={[s.badge, { backgroundColor: theme.tint, borderColor: theme.secondary }]}>
              <Text style={[s.badgeTxt, { color: theme.primary }]}>
                #{product.mood_tags[0]}
              </Text>
            </View>
          )}
        </View>
        <View style={s.content}>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                size={10}
                color="#F59E0B"
                fill={i <= stars ? '#F59E0B' : 'transparent'}
                strokeWidth={1.5}
              />
            ))}
            {product.rating != null && (
              <Text style={[s.ratingTxt, { color: theme.inactive }]}>
                {product.rating.toFixed(1)}
              </Text>
            )}
          </View>
          <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[s.price, { color: theme.primary }]}>
            GH₵{product.price.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProductRecommendations({
  currentProductId,
  moodTags,
}: {
  currentProductId: string;
  moodTags?: string[];
}) {
  const { theme, isDark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      if (moodTags && moodTags.length > 0) {
        const { data: tagData } = await supabase
          .from('products')
          .select('*')
          .neq('id', currentProductId)
          .overlaps('mood_tags', moodTags)
          .limit(8);

        if (tagData && tagData.length >= 4) {
          setProducts(tagData.slice(0, 6));
          setLoading(false);
          return;
        }

        const { data: ratedData } = await supabase
          .from('products')
          .select('*')
          .neq('id', currentProductId)
          .order('rating', { ascending: false })
          .limit(8);

        const merged = [...(tagData ?? []), ...(ratedData ?? [])];
        const unique = merged.filter(
          (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
        );
        setProducts(unique.slice(0, 6));
      } else {
        const { data: ratedData } = await supabase
          .from('products')
          .select('*')
          .neq('id', currentProductId)
          .order('rating', { ascending: false })
          .limit(6);

        setProducts(ratedData ?? []);
      }
      setLoading(false);
    };

    fetchRecs();
  }, [currentProductId, moodTags]);

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View style={[s.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerIcon}>✦</Text>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>
            You might also like
          </Text>
          <View style={[s.countBadge, { backgroundColor: theme.tint, borderColor: theme.secondary }]}>
            <Text style={[s.countTxt, { color: theme.primary }]}>{products.length}</Text>
          </View>
        </View>
        <Text style={[s.headerSub, { color: theme.inactive }]}>Based on mood</Text>
      </View>

      <View style={[s.divider, { backgroundColor: theme.border }]} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {products.map((p, i) => (
          <RecCard key={p.id} product={p} index={i} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  countTxt: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  card: {
    width: 160,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 12,
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingTxt: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    minHeight: 32,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
