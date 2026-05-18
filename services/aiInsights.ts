// services/aiInsights.ts
//
// Uses Gemini to provide personalized emotional insights based on mood history trends.

import { MoodEntry } from '@/types/mood';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

export const AIInsightService = {
  async getMoodTrendInsight(history: MoodEntry[]): Promise<string> {
    if (!GEMINI_API_KEY || history.length < 3) {
      return "Log at least 3 moods to unlock personalized AI insights about your emotional journey.";
    }

    try {
      // Summarize last 10 entries
      const recent = history.slice(0, 10).map(e => ({
        mood: e.mood_key || e.mood || e.label,
        date: e.date,
        note: e.note || ''
      }));

      const prompt = `
        Analyze this user's recent mood history and provide a short, supportive, and insightful observation (max 2 sentences).
        Focus on trends, time of day if applicable, or the content of their notes.
        Be empathetic and encouraging.
        
        History: ${JSON.stringify(recent)}
        
        Return ONLY the insight text.
      `;

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('[AIInsight] Error:', error);
      return "Your emotional patterns are unique! Keep tracking to see more trends.";
    }
  }
};
