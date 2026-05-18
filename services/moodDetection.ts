import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { MoodKey, MoodDetectionResult } from '@/types/mood';
import { supabase } from '@/services/supabase';

const MOOD_EMOJI_MAP: Record<MoodKey, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  excited: '🤩',
  neutral: '😐',
  calm: '😌',
  anxious: '😰',
  tired: '😴',
};

const VALID_MOODS: MoodKey[] = Object.keys(MOOD_EMOJI_MAP) as MoodKey[];

// Gemini fallback models — all on v1beta
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];

const GEMINI_API_VERSION = 'v1beta';

// ─── Set to true to skip AI and return a random mood (for UI testing) ─────────
const MOCK_MOOD_DETECTION = false;

// ─── Retry / throttle helpers ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const backoffMs = (attempt: number) =>
  2 ** attempt * 1000 + Math.random() * 400;

const MIN_REQUEST_INTERVAL_MS = 1500;
let _lastRequestTime = 0;

async function throttledFetch(url: string, init: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, _lastRequestTime + MIN_REQUEST_INTERVAL_MS - now);
  if (wait > 0) await sleep(wait);
  _lastRequestTime = Date.now();
  return fetch(url, init);
}

// ─── Compress a raw base64 string down to ~320px wide ────────────────────────
//
// ImageManipulator requires a URI, so we construct a data URI from the base64.
// Target: ~30–50k chars (vs 270k raw) — fast enough to avoid the 20s timeout.

async function compressBase64(base64: string): Promise<string> {
  try {
    const uri = `data:image/jpeg;base64,${base64}`;
    // Compressed to 640px width with 0.7 quality to preserve sharp facial details for higher accuracy
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 640 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return result.base64 ?? base64;
  } catch (err) {
    console.warn('[MoodDetection] compressBase64 failed, using original:', err);
    return base64;
  }
}

// ─── Compress image via URI (used externally) ─────────────────────────────────

export const compressImageForDetection = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 480 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return result.base64 ?? '';
  } catch (err) {
    console.warn('[MoodDetection] Compression failed:', err);
    return '';
  }
};

// ─── Gemini Fallback Call ─────────────────────────────────────────────────────

async function callGeminiModel(
  model: string,
  images: string | string[],
  geminiKey: string,
  attempt = 0
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${geminiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  const imageArray = Array.isArray(images) ? images : [images];

  console.log(`[MoodDetection] [${model}] Image count: ${imageArray.length}, sizes: ${imageArray.map(i => i?.length ?? 0).join(', ')} chars`);

  const promptText = `You are a professional facial expression and emotional mood analyzer.
Analyze the provided ${imageArray.length} frame(s) of a person's face.
Identify the most consistent emotional mood. 
You must choose exactly one of these valid moods:
- happy: smiling, upturned lips, warm expression, crinkling eyes
- sad: frowning, downturned lips, downcast eyes, droopy expression
- angry: furrowed eyebrows, intense or narrowed eyes, tight lips
- excited: wide open eyes, bright smile, expressive facial features, high energy
- neutral: relaxed facial muscles, flat mouth, blank or straightforward gaze
- calm: serene expression, soft features, peaceful eyes, relaxed mouth
- anxious: worried eyes, tensed eyebrows, slightly open or tight lips
- tired: heavy or drooping eyelids, slack jaw, low energy or sleepy gaze

Provide your analysis as a single JSON object with the following fields:
- mood: The detected mood (lowercase, must be one of: ${VALID_MOODS.join(', ')})
- confidence: A decimal number between 0.0 and 1.0 representing your confidence level.

Respond with ONLY valid raw JSON. Do NOT wrap it in markdown code blocks like \`\`\`json.`;

  const parts = imageArray.map(data => ({ inline_data: { mime_type: 'image/jpeg', data } }));
  parts.push({ text: promptText } as any);

  try {
    console.log(`[MoodDetection] [${model}] Sending request (attempt ${attempt + 1})…`);
    const response = await throttledFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 512,
          responseMimeType: "application/json"
        },
      }),
    });

    clearTimeout(timeout);

    console.log(`[MoodDetection] [${model}] HTTP status: ${response.status}`);

    if (response.status === 429 && attempt < 2) {
      console.warn(`[MoodDetection] [${model}] Rate limited — retrying after backoff…`);
      await sleep(backoffMs(attempt));
      return callGeminiModel(model, images, geminiKey, attempt + 1);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[MoodDetection] [${model}] Error body:`, errorBody);
      throw new Error(`Gemini API ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    console.log(`[MoodDetection] [${model}] Raw response:`, rawText);

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      // Fallback to regex matching if JSON parsing failed directly
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch (innerErr) {
          console.warn('[MoodDetection] Regex JSON match parsing failed:', innerErr);
        }
      }
    }

    if (!parsedResult || !parsedResult.mood) {
      console.warn('[MoodDetection] Failed to parse valid mood from response:', rawText);
      throw new Error('Malformed AI response');
    }

    return parsedResult;
  } catch (err: any) {
    clearTimeout(timeout);
    console.error(`[MoodDetection] [${model}] Threw:`, err?.message ?? err);
    throw err;
  }
}

async function detectWithGeminiFallback(images: string | string[]): Promise<MoodDetectionResult> {
  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  console.log('[MoodDetection] Gemini key present:', !!geminiKey, geminiKey ? `(starts with: ${geminiKey.slice(0, 8)}…)` : '← MISSING — check .env');

  if (!geminiKey) throw new Error('Gemini API key missing');

  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGeminiModel(model, images, geminiKey);
      const detectedMood = result.mood?.trim().toLowerCase() as MoodKey;
      
      if (VALID_MOODS.includes(detectedMood)) {
        return {
          mood: detectedMood,
          emoji: MOOD_EMOJI_MAP[detectedMood] ?? '😐',
          confidence: typeof result.confidence === 'number' ? result.confidence : 0.8
        };
      } else {
        console.warn(`[MoodDetection] Model ${model} returned invalid mood:`, result.mood);
      }
    } catch (e: any) {
      console.warn(`[MoodDetection] Gemini ${model} failed:`, e?.message ?? e);
    }
  }
  throw new Error('All Gemini fallback models failed');
}

// ─── Core detection ───────────────────────────────────────────────────────────

export const detectMoodFromImage = async (
  images: string | string[],
  imageUri?: string
): Promise<MoodDetectionResult> => {
  if (MOCK_MOOD_DETECTION) {
    const mood = VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
    return { mood, emoji: MOOD_EMOJI_MAP[mood], confidence: 0.9 };
  }

  const imageArray = Array.isArray(images) ? images : [images];

  console.log(`[MoodDetection] detectMoodFromImage called with ${imageArray.length} image(s), sizes: ${imageArray.map(i => i?.length ?? 0).join(', ')} chars`);

  // ── Compress all images before sending anywhere ──────────────────────────
  // Reduces ~270k chars → ~16k chars, preventing timeout aborts.
  // Skip on web — data URI manipulation behaves differently there.
  let readyImages = imageArray;
  if (Platform.OS !== 'web') {
    console.log('[MoodDetection] Compressing images…');
    readyImages = await Promise.all(imageArray.map(compressBase64));
    console.log(`[MoodDetection] Compressed sizes: ${readyImages.map(i => i?.length ?? 0).join(', ')} chars`);
  }

  // 1. Try Gemini Direct (Primary)
  try {
    return await detectWithGeminiFallback(readyImages);
  } catch (err: any) {
    console.warn('[MoodDetection] Gemini Direct failed, falling back to Edge Function:', err.message);
  }

  // 2. Fallback to Supabase Edge Function (Secondary)
  try {
    console.log(`[MoodDetection] Calling Edge Function (Anthropic) as fallback with ${readyImages.length} images...`);
    const { data, error } = await supabase.functions.invoke('detect-mood', {
      body: { images: readyImages }
    });

    if (error) throw error;
    if (data && data.mood) {
      const mood = data.mood.toLowerCase() as MoodKey;
      console.log(`[MoodDetection] Edge Function Success: ${mood}`);
      return {
        mood,
        emoji: MOOD_EMOJI_MAP[mood] ?? '😐',
        confidence: data.confidence ?? 0.8
      };
    }
  } catch (err: any) {
    console.warn('[MoodDetection] Edge Function failed:', err.message);
  }

  // 3. Demo Fallback (Last resort)
  const mood = VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
  console.log(`[MoodDetection] 🔄 Demo Fallback: Selected ${mood}`);
  return {
    mood,
    emoji: MOOD_EMOJI_MAP[mood],
    confidence: 0.85
  };
};

export const getMoodEmoji = (mood: MoodKey): string => MOOD_EMOJI_MAP[mood] ?? '😐';

export async function pickImageFromGallery(): Promise<{ uri: string } | null> {
  console.warn('[pickImageFromGallery] Not implemented yet.');
  return null;
}