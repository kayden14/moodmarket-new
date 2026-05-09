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
  limit = 8
): Promise<ScoredProduct[]> {
  try {
    const moodLower = (mood ?? 'neutral').toLowerCase();
    const moodTags = MOOD_TAG_MAP[moodLower] ?? MOOD_TAG_MAP.neutral;

    // No Supabase calls here — score purely from local product data
    // This avoids hanging on missing tables (orders, purchase_count etc.)
    const scored: ScoredProduct[] = allProducts.map((product) => {
      let score = 0;
      let reason = 'Popular pick';

      // ── Mood match (0–40 pts) ────────────────────────────────────────────
      const tags = (product.mood_tags ?? []).map((t: string) => t.toLowerCase());
      const matchCount = moodTags.filter((t) => tags.includes(t)).length;
      const moodScore = Math.min(40, matchCount * 15);
      if (moodScore > 0) {
        score += moodScore;
        reason = `Great for your ${moodLower} mood`;
      }

      // ── Rating (0–30 pts) ────────────────────────────────────────────────
      const rating = product.rating ?? 0;
      const ratingScore = Math.min(30, rating * 6);
      score += ratingScore;
      if (ratingScore >= 25) reason = 'Highly rated';

      // ── Recency bonus (0–10 pts) ─────────────────────────────────────────
      const createdAt = new Date((product as any).created_at ?? 0).getTime();
      const ageInDays = (Date.now() - createdAt) / 86_400_000;
      const recencyScore = Math.max(0, 10 - Math.floor(ageInDays / 7));
      score += recencyScore;

      // ── Random jitter so list feels fresh each mood switch ───────────────
      score += Math.random() * 5;

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
  limit = 8
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