// supabase/functions/get-recommendations/index.ts
//
// Mood-matched product recommendations.
//
// TWO MODES:
//  1. Real-products mode (preferred): caller supplies `products[]` from the DB.
//     Gemini reads each product's description and ranks them by mood fit,
//     returning a reason string for each.
//  2. Fictional-products mode (fallback): caller supplies only `mood`.
//     Anthropic generates 4 fictional product suggestions (original behaviour).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`;

// ─── Mode 1: rank real products via Gemini ────────────────────────────────────

async function rankRealProducts(
  mood: string,
  products: any[],
  geminiKey: string,
  limit: number
): Promise<any[]> {
  const prompt = `You are a mood-based shopping assistant.

The user's current mood is: "${mood}"

Below are available products. Select the ${limit} that BEST match this mood.
Use each product's description to understand what it is and how it relates to the mood.

Products JSON:
${JSON.stringify(products.slice(0, 40))}

Return ONLY a valid JSON array (no markdown, no extra text) of the top ${limit} products, each as:
{
  "id": "<product id>",
  "name": "<product name>",
  "description": "<original description, max 120 chars>",
  "price": <price number>,
  "priceRange": "<formatted price, e.g. $15 or $25-$50>",
  "category": "<category name, e.g. Skincare, Music, Food, Fitness, Comfort, Style>",
  "emoji": "<a single relevant emoji for this specific product>",
  "mood_tags": ["<tag>"],
  "rating": <rating number>,
  "score": <number 0-100 representing mood fit>,
  "reason": "<one sentence: why this product fits the ${mood} mood (max 12 words)>"
}`;

  const res = await fetch(GEMINI_URL(geminiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

  // Strip markdown fences if present
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ─── Mode 2: fictional products via Anthropic (legacy fallback) ───────────────

async function fictionalProducts(mood: string, moodEmoji: string, anthropicKey: string): Promise<any[]> {
  const prompt = `A user's facial expression just detected their mood as: ${mood} ${moodEmoji || ''}

Generate exactly 4 product recommendations perfectly matched to this mood.

Return ONLY a JSON array, no markdown, no extra text:
[
  {
    "name": "Product name (2-4 words)",
    "category": "Category (e.g. Skincare, Music, Food, Fitness, Comfort, Style)",
    "emoji": "single relevant emoji",
    "reason": "One sentence: why this fits the ${mood} mood perfectly (max 12 words)",
    "priceRange": "$X–$Y"
  }
]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim().replace(/```json|```/g, "");
  return JSON.parse(raw);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mood, moodEmoji, products } = body;

    if (!mood) throw new Error('Missing mood field');

    const geminiKey    = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('EXPO_PUBLIC_GEMINI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    let result: any[];

    // ── Mode 1: real products provided ───────────────────────────────────────
    if (Array.isArray(products) && products.length > 0 && geminiKey) {
      try {
        result = await rankRealProducts(mood, products, geminiKey, 8);
      } catch (geminiErr) {
        console.warn('[get-recommendations] Gemini ranking failed, trying Anthropic fallback:', geminiErr);
        if (!anthropicKey) throw new Error('No fallback API key available');
        result = await fictionalProducts(mood, moodEmoji ?? '', anthropicKey);
      }
    }
    // ── Mode 2: no products — generate fictional recommendations ─────────────
    else {
      if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set in Supabase secrets');
      result = await fictionalProducts(mood, moodEmoji ?? '', anthropicKey);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    console.error('[get-recommendations]', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
