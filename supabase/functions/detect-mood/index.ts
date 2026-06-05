// @ts-nocheck
// supabase/functions/detect-mood/index.ts
// Deploy: supabase functions deploy detect-mood
// Set keys: supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
//           supabase secrets set GEMINI_API_KEY=AIzaSy-xxxxxxxx

const MOOD_LIST = [
  "happy", "sad", "angry", "excited",
  "neutral", "calm", "anxious", "tired",
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Anthropic detection ──────────────────────────────────────────────────────

async function detectWithAnthropic(images: string[], key: string): Promise<{ mood: string; confidence: number }> {
  const contentParts = images.map(img => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: img },
  }));

  contentParts.push({
    type: "text",
    text: `Analyze the facial expressions in these ${images.length} frames (captured over 1.5s).
Detect the most consistent mood.
Respond with ONLY a JSON object:
{"mood":"<mood>","confidence":<0.0-1.0>}
mood must be one of: ${MOOD_LIST.join(", ")}.`,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 128,
      messages: [{ role: "user", content: contentParts }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim().replace(/```json|```/g, "");

  let mood = "neutral";
  let confidence = 0.7;
  try {
    const parsed = JSON.parse(raw);
    if (MOOD_LIST.includes(parsed.mood)) mood = parsed.mood;
    if (typeof parsed.confidence === "number") confidence = Math.min(1, Math.max(0, parsed.confidence));
  } catch {
    const moodFieldMatch = raw.match(/"mood"\s*:\s*"([^"]+)"/);
    if (moodFieldMatch && MOOD_LIST.includes(moodFieldMatch[1])) mood = moodFieldMatch[1];
    else {
      const found = MOOD_LIST.find((m) => raw.toLowerCase().includes(m));
      if (found) mood = found;
    }
  }
  return { mood, confidence };
}

// ─── Gemini detection (fallback) ──────────────────────────────────────────────

async function detectWithGemini(images: string[], key: string): Promise<{ mood: string; confidence: number }> {
  const GEMINI_MODELS = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];

  const promptText = `You are a facial expression analyzer. Analyze the provided face image(s).
Choose exactly one mood from: ${MOOD_LIST.join(", ")}.
Respond with ONLY raw JSON (no markdown): {"mood":"<mood>","confidence":<0.0-1.0>}`;

  for (const model of GEMINI_MODELS) {
    try {
      const parts = images.map(data => ({ inline_data: { mime_type: "image/jpeg", data } }));
      parts.push({ text: promptText } as any);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 128, responseMimeType: "application/json" },
        }),
      });

      if (!res.ok) {
        console.warn(`[detect-mood] Gemini ${model} failed: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

      let mood = "neutral";
      let confidence = 0.75;
      try {
        const parsed = JSON.parse(raw);
        if (MOOD_LIST.includes(parsed.mood)) mood = parsed.mood;
        if (typeof parsed.confidence === "number") confidence = parsed.confidence;
      } catch {
        const moodFieldMatch = raw.match(/"mood"\s*:\s*"([^"]+)"/);
        if (moodFieldMatch && MOOD_LIST.includes(moodFieldMatch[1])) mood = moodFieldMatch[1];
      }
      return { mood, confidence };
    } catch (e) {
      console.warn(`[detect-mood] Gemini ${model} threw:`, e);
    }
  }
  throw new Error("All Gemini models failed");
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json();
    const images = Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []);

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing image(s) field" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const geminiKey    = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("EXPO_PUBLIC_GEMINI_API_KEY");

    let result: { mood: string; confidence: number } | null = null;

    // 1. Try Anthropic first (best accuracy, no token-image quotas)
    if (anthropicKey) {
      try {
        result = await detectWithAnthropic(images, anthropicKey);
        console.log(`[detect-mood] Anthropic success: ${result.mood}`);
      } catch (e) {
        console.warn("[detect-mood] Anthropic failed:", e);
      }
    } else {
      console.warn("[detect-mood] ANTHROPIC_API_KEY not set — skipping Anthropic");
    }

    // 2. Fallback to Gemini (uses GEMINI_API_KEY secret — separate quota from client)
    if (!result && geminiKey) {
      try {
        result = await detectWithGemini(images, geminiKey);
        console.log(`[detect-mood] Gemini fallback success: ${result.mood}`);
      } catch (e) {
        console.warn("[detect-mood] Gemini fallback also failed:", e);
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: "All detection models failed" }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
