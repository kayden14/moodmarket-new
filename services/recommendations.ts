// services/recommendations.ts
//
// AI Smart Product Recommendation Engine
// score = moodMatch(40) + popularity(30) + rating(20) + recency(10)
//
// SAFE VERSION: Never throws, never hangs — all Supabase calls are optional.

import { Product } from '@/types/database';
import { ScoredProduct } from '@/types/recommendations';
import { supabase } from '@/services/supabase';

const MOOD_TAG_MAP: Record<string, string[]> = {
  happy:   ['cheerful', 'fun', 'vibrant', 'social', 'celebration', 'happy'],
  calm:    ['relaxation', 'peaceful', 'soothing', 'wellness', 'calm', 'zen'],
  excited: ['adventure', 'energy', 'trendy', 'bold', 'exciting', 'new'],
  sad:     ['comfort', 'cozy', 'warm', 'self-care', 'nurturing', 'soothing'],
  angry:   ['stress-relief', 'calming', 'mindfulness', 'relaxation'],
  tired:   ['energy', 'refreshing', 'revitalizing', 'sleep', 'rest'],
  anxious: ['calming', 'grounding', 'wellness', 'mindfulness', 'self-care'],
  neutral: ['popular', 'trending', 'bestseller', 'versatile'],
};

export async function getRecommendations(
  userId: string | undefined,
  mood: string,
  allProducts: Product[],
  limit = 50
): Promise<ScoredProduct[]> {
  try {
    const moodLower = (mood ?? 'neutral').toLowerCase();
    const moodTags = MOOD_TAG_MAP[moodLower] ?? MOOD_TAG_MAP.neutral;

    // Compute price percentiles so we can reward mid-range products
    const prices = allProducts.map(p => p.price ?? 0).sort((a, b) => a - b);
    const p25 = prices[Math.floor(prices.length * 0.25)] ?? 0;
    const p75 = prices[Math.floor(prices.length * 0.75)] ?? Infinity;

    const scored: ScoredProduct[] = allProducts.map((product) => {
      let score = 0;
      let reason = 'Popular pick';

      // ── Mood match (0–40 pts) ────────────────────────────────────────────
      const tags = (product.mood_tags ?? []).map((t: string) => t.toLowerCase());
      const matchCount = moodTags.filter((t) => tags.includes(t)).length;
      const moodScore = matchCount > 0 ? Math.min(40, 10 + matchCount * 10) : 0;
      
      if (moodScore > 0) {
        score += moodScore;
        // Dynamic reason based on mood
        const moodReasons: Record<string, string> = {
          happy:   'Perfect for your vibrant energy',
          calm:    'Soothing picks to help you relax',
          excited: 'Bold choices for your high energy',
          sad:     'Comforting items for self-care',
          angry:   'Mindful picks to help you de-stress',
          tired:   'Revitalizing products to recharge',
          anxious: 'Grounding essentials for peace of mind',
          neutral: 'Versatile favorites for any day',
        };
        reason = moodReasons[moodLower] || `Great for your ${moodLower} mood`;
      }

      // ── Tag breadth bonus (0–10 pts) ─────────────────────────────────────
      const tagBreadth = Math.min(10, Math.floor((tags.length / 3) * 10));
      score += tagBreadth;

      // ── Rating (0–20 pts) ────────────────────────────────────────────────
      const rating = product.rating ?? 0;
      const ratingScore = Math.min(20, rating * 4);
      score += ratingScore;
      if (ratingScore >= 18 && score < 40) reason = 'Top-rated selection';

      // ── Popularity proxy: mid-range price (0–15 pts) ─────────────────────
      const price = product.price ?? 0;
      const popularityScore = price >= p25 && price <= p75 ? 15 : price < p25 ? 10 : 5;
      score += popularityScore;
      if (popularityScore === 15 && ratingScore >= 16 && score < 50) reason = 'Community favorite';

      // ── Recency bonus (0–10 pts) ─────────────────────────────────────────
      const createdAt = new Date((product as any).created_at ?? 0).getTime();
      const ageInDays = (Date.now() - createdAt) / 86_400_000;
      const recencyScore = Math.max(0, 10 - Math.floor(ageInDays / 7));
      score += recencyScore;
      if (recencyScore >= 8 && score > 60) reason = 'Freshly landed';

      // ── Random jitter ──────────────────────────────────────────────────
      score += Math.random() * 3;

      return { ...product, score, reason };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    console.warn('[recommendations] getRecommendations failed:', e);
    return [];
  }
}

export async function getTrending(
  allProducts: Product[],
  limit = 12
): Promise<ScoredProduct[]> {
  try {
    const scored: ScoredProduct[] = allProducts.map((product) => {
      const rating = product.rating ?? 0;
      // trending = rating × 4 + random jitter for variety
      const score = rating * 4 + Math.random() * 10;
      return { ...product, score, reason: 'Trending now' };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    console.warn('[recommendations] getTrending failed:', e);
    return [];
  }
}

// ─── AI-Powered Recommendations using real DB products ────────────────────────
//
// Sends actual products (with descriptions) to the get-recommendations edge
// function so the AI can read each product's description and explain why it
// fits the user's detected mood.  Falls back to local tag-matching silently.

export async function getAIRecommendations(
  userId: string | undefined,
  mood: string,
  allProducts: Product[],
  limit = 8
): Promise<ScoredProduct[]> {
  if (allProducts.length === 0) return [];

  try {
    // Trim the payload — pass at most 40 products so the prompt stays short
    const payload = allProducts.slice(0, 40).map(p => ({
      id:          p.id,
      name:        p.name,
      description: p.description ?? '',
      price:       p.price,
      mood_tags:   p.mood_tags ?? [],
      rating:      p.rating ?? 0,
    }));

    const { data, error } = await supabase.functions.invoke('get-recommendations', {
      body: { mood, products: payload },
    });

    if (error) throw error;

    // Edge function returns ScoredProduct-compatible objects when products are supplied
    if (Array.isArray(data) && data.length > 0) {
      return (data as ScoredProduct[]).slice(0, limit);
    }
  } catch (err) {
    console.warn('[recommendations] getAIRecommendations edge call failed, using tag-match fallback:', err);
  }

  // Local tag-matching fallback
  const fallback = await getRecommendations(userId, mood, allProducts, limit);
  const MOOD_EMOJI_MAP: Record<string, string> = {
    happy: '😊', sad: '😢', angry: '😠', excited: '🤩',
    neutral: '😐', calm: '😌', anxious: '😰', tired: '😴'
  };
  return fallback.map(p => ({
    ...p,
    priceRange: `$${p.price}`,
    category: p.mood_tags?.[0] ? p.mood_tags[0].toUpperCase() : 'Lifestyle',
    emoji: MOOD_EMOJI_MAP[mood.toLowerCase()] ?? '🎁',
  })) as any[];
}

