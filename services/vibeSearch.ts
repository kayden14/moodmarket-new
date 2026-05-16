/**
 * services/vibeSearch.ts
 * 
 * Uses Gemini AI to interpret natural language search queries 
 * and translate them into product filters (moods, keywords).
 */

import { Product } from '@/types/database';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const VibeSearchService = {
  /**
   * Translates a "vibe" query like "I'm stressed and need to relax"
   * into a list of keywords and a target mood.
   */
  async interpretQuery(query: string): Promise<{ keywords: string[], mood?: string }> {
    if (!GEMINI_API_KEY) {
      console.warn('[VibeSearch] No API key found. Falling back to simple keyword split.');
      return { keywords: query.toLowerCase().split(' ') };
    }

    try {
      const prompt = `
        You are a shopping assistant for MoodMarket. 
        A user says: "${query}"
        
        Translate this into:
        1. A list of 3-5 specific product search keywords (e.g., "lavender", "candle", "energy").
        2. A single primary mood from this list: Happy, Calm, Excited, Sad, Angry, Tired, Anxious.
        
        Return ONLY a JSON object: {"keywords": ["word1", "word2"], "mood": "MoodName"}
      `;

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      
      return {
        keywords: result.keywords || [],
        mood: result.mood || undefined
      };
    } catch (error) {
      console.error('[VibeSearch] Error interpreting query:', error);
      return { keywords: query.toLowerCase().split(' ') };
    }
  },

  /**
   * Filters a list of products based on interpreted vibe data.
   */
  filterByVibe(products: Product[], vibe: { keywords: string[], mood?: string }) {
    return products.filter(p => {
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const tags = (p.mood_tags || []).map(t => t.toLowerCase());
      
      // Match mood
      const moodMatch = vibe.mood && tags.includes(vibe.mood.toLowerCase());
      
      // Match keywords
      const keywordMatch = vibe.keywords.some(kw => 
        name.includes(kw.toLowerCase()) || 
        desc.includes(kw.toLowerCase()) ||
        tags.some(t => t.includes(kw.toLowerCase()))
      );

      return moodMatch || keywordMatch;
    });
  }
};
