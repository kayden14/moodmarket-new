// supabase/functions/get-recommendations/index.ts
// Generates mood-matched product recommendations via Anthropic Claude.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mood, moodEmoji } = await req.json();

    if (!mood) {
      throw new Error('Missing mood field');
    }

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY not set in Supabase secrets');
    }

    const prompt = `A user's facial expression just detected their mood as: ${mood} ${moodEmoji || ''}

Generate exactly 4 product recommendations perfectly matched to this mood. Think about what someone feeling ${mood} would genuinely want to buy or experience right now.

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
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: prompt,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const raw = (data.content?.[0]?.text ?? "").trim().replace(/```json|```/g, "");
    
    // Validate JSON
    const recs = JSON.parse(raw);

    return new Response(
      JSON.stringify(recs),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    console.error('[get-recommendations]', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
