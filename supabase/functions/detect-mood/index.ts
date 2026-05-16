// @ts-nocheck
// supabase/functions/detect-mood/index.ts
// Deploy: supabase functions deploy detect-mood
// Set key: supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

const MOOD_LIST = [
  "happy", "sad", "angry", "excited",
  "neutral", "calm", "anxious", "tired",
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

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
        messages: [{
          role: "user",
          content: contentParts,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: `Anthropic error (${res.status}): ${err}` }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const raw = (data.content?.[0]?.text ?? "").trim().replace(/```json|```/g, "");

    let mood = "neutral";
    let confidence = 0.7;

    try {
      const parsed = JSON.parse(raw);
      if (MOOD_LIST.includes(parsed.mood)) mood = parsed.mood;
      if (typeof parsed.confidence === "number") {
        confidence = Math.min(1, Math.max(0, parsed.confidence));
      }
    } catch {
      const found = MOOD_LIST.find((m) => raw.toLowerCase().includes(m));
      if (found) mood = found;
    }

    return new Response(
      JSON.stringify({ mood, confidence }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});