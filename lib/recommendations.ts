// lib/recommendations.ts
//
// AI Smart Product Recommendation Engine
// score = moodMatch(40) + popularity(30) + rating(20) + recency(10)
//
// SAFE VERSION: Never throws, never hangs — all Supabase calls are optional.

import { Product } from '@/types/database';

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

export interface ScoredProduct extends Product {
  score: number;
  reason: string;
}

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
      // Partial credit: even 1 matching tag earns points; full match earns 40
      const moodScore = matchCount > 0
        ? Math.min(40, 10 + matchCount * 10)
        : 0;
      if (moodScore > 0) {
        score += moodScore;
        reason = `Great for your ${moodLower} mood`;
      }

      // ── Tag breadth bonus (0–10 pts) ─────────────────────────────────────
      // Products with more tags are more versatile — reward them slightly
      const tagBreadth = Math.min(10, Math.floor((tags.length / 3) * 10));
      score += tagBreadth;

      // ── Rating (0–20 pts) ────────────────────────────────────────────────
      const rating = product.rating ?? 0;
      const ratingScore = Math.min(20, rating * 4);
      score += ratingScore;
      if (ratingScore >= 18) reason = 'Highly rated';

      // ── Popularity proxy: mid-range price (0–15 pts) ─────────────────────
      // Products priced between p25–p75 tend to be accessible bestsellers
      const price = product.price ?? 0;
      const popularityScore = price >= p25 && price <= p75 ? 15 : price < p25 ? 10 : 5;
      score += popularityScore;
      if (popularityScore === 15 && ratingScore >= 16) reason = 'Bestseller';

      // ── Recency bonus (0–10 pts) ─────────────────────────────────────────
      const createdAt = new Date((product as any).created_at ?? 0).getTime();
      const ageInDays = (Date.now() - createdAt) / 86_400_000;
      const recencyScore = Math.max(0, 10 - Math.floor(ageInDays / 7));
      score += recencyScore;
      if (recencyScore >= 8 && score > 50) reason = 'New arrival';

      // ── Random jitter so list feels fresh each mood switch ───────────────
      // Smaller jitter (3 pts) so ordering stays mostly deterministic for
      // large pools but feels refreshed on re-render
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