// services/moodDetection.ts
//
// AI-powered mood detection via Gemini vision models.

import * as ImageManipulator from 'expo-image-manipulator';
import { MoodKey, MoodDetectionResult } from '@/types/mood';

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

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
];

const GEMINI_API_VERSION = 'v1beta';

// ─── Set to true to skip AI and return a random mood (for UI testing) ─────────
const MOCK_MOOD_DETECTION = false;

// ─── Retry / throttle helpers ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Exponential backoff: attempt 0 → ~1 s, 1 → ~2 s, 2 → ~4 s (+ jitter) */
const backoffMs = (attempt: number) =>
  2 ** attempt * 1000 + Math.random() * 400;

/** Minimum gap between ANY Gemini request — keeps burst rate well under free-tier cap */
const MIN_REQUEST_INTERVAL_MS = 1500;

let _lastRequestTime = 0;

async function throttledFetch(url: string, init: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, _lastRequestTime + MIN_REQUEST_INTERVAL_MS - now);

  if (wait > 0) {
    console.log(`[MoodDetection] Throttle: waiting ${Math.round(wait)}ms before request`);
    await sleep(wait);
  }

  _lastRequestTime = Date.now();
  return fetch(url, init);
}

// ─── Compress image via URI ───────────────────────────────────────────────────

export const compressImageForDetection = async (uri: string): Promise<string> => {
  try {
    console.log('[MoodDetection] Compressing image from URI…');

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 480 } }],
      {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    const len = result.base64?.length ?? 0;
    console.log(
      `[MoodDetection] Compressed base64 length: ${len} (~${Math.round((len * 0.75) / 1024)}KB)`
    );

    return result.base64 ?? '';
  } catch (err) {
    console.warn('[MoodDetection] Compression failed:', err);
    return '';
  }
};

// ─── Single model call ────────────────────────────────────────────────────────

async function callModel(
  model: string,
  base64Image: string,
  geminiKey: string,
  attempt = 0
): Promise<any> {
  const url =
    `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}` +
    `/models/${model}:generateContent?key=${geminiKey}`;

  console.log(
    `[MoodDetection] Trying model: ${model} | attempt ${attempt + 1} | image size: ${base64Image.length} chars`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response: Response;

  try {
    response = await throttledFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                text: `This is a selfie photo of a person's face. Your job is to detect their emotional mood from their facial expression.

IMPORTANT RULES:
1. You MUST return one of these exact moods: ${VALID_MOODS.join(', ')}
2. NEVER return "neutral" unless the person has a completely blank, expressionless face
3. Look carefully at: corners of mouth, eyebrows, eyes, cheeks, forehead tension
4. A relaxed or slightly pleasant face = calm or happy (NOT neutral)
5. Any visible emotion, however subtle, should be named

Respond with ONLY this JSON (no text before or after):
{"mood":"INSERT_MOOD_HERE","confidence":0.85}

Replace INSERT_MOOD_HERE with the detected mood word.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out.');
    throw err;
  }

  clearTimeout(timeout);

  // Retryable statuses
  if (response.status === 429 || response.status === 503) {
    const body = await response.text();
    const label = response.status === 429 ? 'quota exceeded' : 'service unavailable';

    if (attempt < 2) {
      const delay = backoffMs(attempt);
      console.warn(
        `[MoodDetection] ${model} ${label} (${response.status}), retrying in ${Math.round(delay)}ms…`
      );
      await sleep(delay);
      return callModel(model, base64Image, geminiKey, attempt + 1);
    }

    throw new Error(`${model} ${label} after ${attempt + 1} attempts: ${body}`);
  }

  if (!response.ok) {
    const body = await response.text();
    console.warn(`[MoodDetection] ${model} HTTP ${response.status}:`, body);
    throw new Error(`Gemini API ${response.status}: ${body}`);
  }

  const data = await response.json();
  console.log(`[MoodDetection] ✅ Success with: ${model}`);

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  console.log(`[MoodDetection] Raw Gemini response: "${rawText}"`);

  const finishReason = data?.candidates?.[0]?.finishReason ?? 'unknown';
  console.log(`[MoodDetection] Finish reason: ${finishReason}`);

  if (finishReason === 'SAFETY') {
    console.warn('[MoodDetection] Image blocked by Gemini safety filters — defaulting to calm');
    return { _safetyBlocked: true };
  }

  return data;
}

// ─── Gemini call with model fallback ─────────────────────────────────────────

async function callGeminiWithFallback(base64Image: string, geminiKey: string): Promise<any> {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      return await callModel(model, base64Image, geminiKey);
    } catch (err: any) {
      console.warn(
        `[MoodDetection] ${model} exhausted, trying next model… (${err.message})`
      );
      lastError = err;
    }
  }

  throw lastError ?? new Error('All Gemini models failed.');
}

// ─── Core detection ───────────────────────────────────────────────────────────

export const detectMoodFromImage = async (
  base64Image: string,
  imageUri?: string
): Promise<MoodDetectionResult> => {
  if (MOCK_MOOD_DETECTION) {
    console.log('[MoodDetection] MOCK MODE');
    await sleep(1000);
    const mood = VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
    return { mood, emoji: MOOD_EMOJI_MAP[mood], confidence: 0.88 };
  }

  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!geminiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set in your .env file.');
  }

  let imageToSend = base64Image;

  if (imageUri) {
    const compressed = await compressImageForDetection(imageUri);
    if (compressed && compressed.length > 500) {
      imageToSend = compressed;
      console.log('[MoodDetection] Using compressed image');
    } else {
      console.warn('[MoodDetection] Compression failed, using original base64');
    }
  }

  try {
    const data = await callGeminiWithFallback(imageToSend, geminiKey);

    if (data._safetyBlocked) {
      return { mood: 'calm', emoji: '😌', confidence: 0.5 };
    }

    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
      .trim()
      .replace(/```json|```/g, '')
      .trim();

    console.log('[MoodDetection] Parsing:', raw);
    return parseMoodResponse(raw);
  } catch (err: any) {
    if (err.message?.includes('quota exceeded') || err.message?.includes('429')) {
      throw new Error('Daily AI limit reached. Please try again tomorrow.');
    }
    throw new Error(`Gemini request failed: ${err.message}`);
  }
};

// ─── Parse response ───────────────────────────────────────────────────────────

function parseMoodResponse(raw: string): MoodDetectionResult {
  let mood: MoodKey = 'neutral';
  let confidence = 0.75;

  try {
    const jsonMatch = raw.match(/\{[^}]+\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr);
    const detectedMood = parsed.mood?.toLowerCase().trim();

    console.log(`[MoodDetection] Detected mood from JSON: "${detectedMood}"`);

    if (VALID_MOODS.includes(detectedMood as MoodKey)) {
      mood = detectedMood as MoodKey;
    } else {
      console.warn(`[MoodDetection] "${detectedMood}" is not a valid mood`);
      const found = VALID_MOODS.find((m) => raw.toLowerCase().includes(m));
      if (found) mood = found;
    }

    if (typeof parsed.confidence === 'number') {
      confidence = Math.min(1, Math.max(0, parsed.confidence));
    }
  } catch {
    console.warn('[MoodDetection] JSON parse failed, scanning raw text…');
    const found = VALID_MOODS.find((m) => raw.toLowerCase().includes(m));
    if (found) mood = found;
  }

  console.log(`[MoodDetection] Final mood: ${mood} (${Math.round(confidence * 100)}%)`);
  return { mood, emoji: MOOD_EMOJI_MAP[mood], confidence };
}

export const getMoodEmoji = (mood: MoodKey): string => MOOD_EMOJI_MAP[mood] ?? '😐';

// ─── Gallery picker stub (pre-existing missing implementation) ───────────────

export async function pickImageFromGallery(): Promise<{ uri: string } | null> {
  console.warn('[pickImageFromGallery] Not implemented yet.');
  return null;
}
