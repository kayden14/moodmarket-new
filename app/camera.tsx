/**
 * app/camera.tsx
 *
 * Platform-split passive mood detector + product recommender.
 *
 * Flow (both platforms):
 *  1. Mount → silently open front camera (hidden from user)
 *  2. Detect mood automatically (no user tap required)
 *     - Native: capture after 2.5 s → Gemini vision  (via useMoodDetection hook)
 *     - Web:    poll face-api.js every 800 ms
 *  3. Call Anthropic API to generate mood-matched product recommendations
 *  4. Show results card: detected mood + products
 *  5. User can confirm ("Shop this vibe") or switch mood manually
 *
 * FIXES (v4):
 *  - Corrected Gemini model IDs in moodDetection.ts (was causing silent 404s)
 *  - Added x-api-key + anthropic-version headers to Anthropic fetch (was returning 401)
 *  - Added anthropic-dangerous-direct-browser-access header for web client calls
 *  - Errors now surface via console.error instead of being swallowed as warnings
 *  - Neutral fallback fires when capture/detect fails so UI never hangs on "scanning"
 *
 * FIXES (v5):
 *  - Lowered CONFIDENCE_THRESHOLD 0.40 → 0.15 and NEUTRAL_THRESHOLD 0.60 → 0.30
 *    so face-api.js expression scores are accepted in normal lighting conditions
 *  - Added [faceapi] debug log so real scores are visible in the console
 */

import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTheme, MOOD_PALETTES, MoodKey } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import EmojiText from '@/components/EmojiText';
import { NotificationService } from '@/services/notifications';
import { useMoodDetection } from '@/hooks/useMoodDetection';
import { useState, useEffect, useRef, useCallback } from 'react';


const MOODS_META: { key: MoodKey; emoji: string; label: string; description: string }[] = [
  { key: 'happy',   emoji: '😊', label: 'Happy',   description: 'Joyful and upbeat'    },
  { key: 'calm',    emoji: '😌', label: 'Calm',    description: 'Peaceful and relaxed' },
  { key: 'excited', emoji: '🤩', label: 'Excited', description: 'Energetic and pumped' },
  { key: 'sad',     emoji: '😢', label: 'Sad',     description: 'Down or blue'         },
  { key: 'angry',   emoji: '😠', label: 'Angry',   description: 'Frustrated or upset'  },
  { key: 'tired',   emoji: '😴', label: 'Tired',   description: 'Low energy or sleepy' },
  { key: 'anxious', emoji: '😰', label: 'Anxious', description: 'Stressed or worried'  },
  { key: 'neutral', emoji: '😐', label: 'Neutral', description: 'No strong feeling'    },
];

// Lowered 0.40 → 0.15 so face-api.js expression scores are accepted in
// normal/indoor lighting where scores rarely exceed 0.40.
const CONFIDENCE_THRESHOLD = 0.15;

// Lowered 0.60 → 0.30 for neutral — still requires a higher bar than other
// expressions so subtle resting-face frames don't resolve too eagerly.
const NEUTRAL_THRESHOLD = 0.30;

// After this many failed polls (~12 s) give up and show manual picker.
const MAX_POLL_ATTEMPTS = 15;

const POLL_INTERVAL = 800;

// face-api.js only produces these 7 expression labels. 'calm' and 'tired'
// are custom MoodKeys not present in its output — removed from the map.
const EMOTION_TO_MOOD: Record<string, MoodKey> = {
  happy:     'happy',
  surprised: 'excited',
  sad:       'sad',
  angry:     'angry',
  fearful:   'anxious',
  disgusted: 'angry',
  neutral:   'neutral',
};

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────── */

type ProductRec = {
  name:        string;
  category:    string;
  emoji:       string;
  reason:      string;
  priceRange:  string;
};

type Phase =
  | 'initialising'
  | 'scanning'
  | 'fetching_recs'
  | 'results'
  | 'error'
  | 'manual';

/* ─────────────────────────────────────────────────────────────────────────
   AI PRODUCT RECOMMENDATIONS  (Supabase Edge Function)
─────────────────────────────────────────────────────────────────────────── */

async function fetchProductRecs(mood: string, moodEmoji: string): Promise<ProductRec[]> {
  try {
    const { data, error } = await supabase.functions.invoke('get-recommendations', {
      body: { mood, moodEmoji }
    });

    if (error) throw error;
    return data as ProductRec[];
  } catch (err: any) {
    console.error('[fetchProductRecs] ❌ failed:', err?.message);
    // Return empty array to allow manual picker fallback
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   RESULTS SCREEN  (shared, rendered inside both platform screens)
───────────────────────────────────────────────────────────────────────── */

type ResultsProps = {
  mood:       MoodKey;
  recs:       ProductRec[];
  onConfirm:  () => void;
  onOverride: (m: MoodKey) => void;
  theme:      any;
};

function NativeResultsScreen({ mood, recs, onConfirm, onOverride, theme }: ResultsProps) {
  const pal       = MOOD_PALETTES[mood];
  const meta      = MOODS_META.find(m => m.key === mood)!;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const tp = theme.textPrimary;
  const ts = theme.textSecondary;
  const bg = theme.background;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood hero card */}
        <View style={[nativeStyles.moodHero, { backgroundColor: pal.tint, borderColor: pal.secondary }]}>
          <EmojiText style={nativeStyles.moodHeroEmoji}>{meta.emoji}</EmojiText>
          <View style={{ flex: 1 }}>
            <Text style={nativeStyles.moodHeroLabel}>We detected your mood</Text>
            <Text style={[nativeStyles.moodHeroMood, { color: pal.primary }]}>{meta.label}</Text>
            <Text style={[nativeStyles.moodHeroDesc, { color: pal.primary }]}>{meta.description}</Text>
          </View>
        </View>

        {/* Section header */}
        <View style={nativeStyles.sectionRow}>
          <Text style={[nativeStyles.sectionTitle, { color: tp }]}>Picked for your vibe ✦</Text>
          <Text style={[nativeStyles.sectionSub, { color: ts }]}>{recs.length} items</Text>
        </View>

        {/* Product cards */}
        {recs.map((rec, i) => (
          <View key={i} style={[nativeStyles.recCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[nativeStyles.recEmojiBox, { backgroundColor: pal.tint }]}>
              <EmojiText style={{ fontSize: 26 }}>{rec.emoji}</EmojiText>
            </View>
            <View style={{ flex: 1 }}>
              <View style={nativeStyles.recTopRow}>
                <Text style={[nativeStyles.recName, { color: tp }]}>{rec.name}</Text>
                <Text style={[nativeStyles.recPrice, { color: pal.primary }]}>{rec.priceRange}</Text>
              </View>
              <Text style={[nativeStyles.recCategory, { color: ts }]}>{rec.category}</Text>
              <Text style={[nativeStyles.recReason, { color: ts }]}>{rec.reason}</Text>
            </View>
          </View>
        ))}

        {/* CTA */}
        <TouchableOpacity
          onPress={onConfirm}
          style={[nativeStyles.ctaBtn, { backgroundColor: pal.primary }]}
          activeOpacity={0.85}
        >
          <Text style={nativeStyles.ctaBtnText}>Shop this vibe <EmojiText>{meta.emoji}</EmojiText></Text>
        </TouchableOpacity>

        {/* Override section */}
        <Text style={[nativeStyles.overrideLabel, { color: ts }]}>Not how you feel?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 60 }}
        >
          {MOODS_META.filter(m => m.key !== mood).map(m => {
            const p = MOOD_PALETTES[m.key];
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => onOverride(m.key)}
                style={[nativeStyles.overrideChip, { backgroundColor: p.tint, borderColor: p.secondary }]}
                activeOpacity={0.75}
              >
                <EmojiText style={{ fontSize: 18 }}>{m.emoji}</EmojiText>
                <Text style={[nativeStyles.overrideChipText, { color: p.primary }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NATIVE CAMERA SCREEN
───────────────────────────────────────────────────────────────────────── */

function MobileCameraScreen() {
  const router             = useRouter();
  const { theme, setMood } = useTheme();
  const { profile }        = useAuth();

  const [phase,        setPhase]        = useState<Phase>('initialising');
  const [detectedMood, setDetectedMood] = useState<MoodKey | null>(null);
  const [productRecs,  setProductRecs]  = useState<ProductRec[]>([]);

  // Ref to break the circular dependency: the hook needs onMoodDetected at
  // construction time, but handleMoodDetected closes over state setters that
  // are only stable after the component renders.
  const onMoodDetectedRef = useRef<(mood: MoodKey) => void>(() => {});

  const { permissionDenied, hasPermission, onCameraReady, cameraRef, rescan } =
    useMoodDetection({ onMoodDetected: (mood) => onMoodDetectedRef.current(mood) });

  const handleMoodDetected = useCallback(async (moodKey: MoodKey) => {
    setDetectedMood(moodKey);
    setPhase('fetching_recs');
    const meta = MOODS_META.find(m => m.key === moodKey)!;
    try {
      const recs = await fetchProductRecs(moodKey, meta.emoji);
      setProductRecs(recs);
    } catch (err: any) {
      console.error('[MobileCameraScreen] ❌ fetchProductRecs failed:', err?.message);
      setProductRecs([]);
    }
    setPhase('results');
  }, []);

  // Keep the ref in sync with the latest handleMoodDetected
  useEffect(() => {
    onMoodDetectedRef.current = handleMoodDetected;
  }, [handleMoodDetected]);

  // Permission denied → error phase
  useEffect(() => {
    if (permissionDenied) setPhase('error');
  }, [permissionDenied]);

  // Permission granted → scanning phase
  useEffect(() => {
    if (hasPermission === true && phase === 'initialising') setPhase('scanning');
  }, [hasPermission, phase]);

  const handleConfirm = useCallback(() => {
    if (!detectedMood) return;
    const meta = MOODS_META.find(m => m.key === detectedMood)!;
    setMood(detectedMood);
    if (profile?.id) NotificationService.moodSelected(profile.id, meta.label, meta.emoji);
    router.back();
  }, [detectedMood, setMood, profile, router]);

  const handleOverride = useCallback(async (moodKey: MoodKey) => {
    setDetectedMood(moodKey);
    setPhase('fetching_recs');
    const meta = MOODS_META.find(m => m.key === moodKey)!;
    try {
      const recs = await fetchProductRecs(moodKey, meta.emoji);
      setProductRecs(recs);
    } catch (err: any) {
      console.error('[MobileCameraScreen] ❌ fetchProductRecs (override) failed:', err?.message);
      setProductRecs([]);
    }
    setPhase('results');
  }, []);

  // Re-scan: reset all component state then let the hook restart capture
  const handleRescan = useCallback(() => {
    setDetectedMood(null);
    setProductRecs([]);
    setPhase('scanning');
    rescan();
  }, [rescan]);

  const pri  = theme.primary;
  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;

  return (
    <View style={[nativeStyles.container, { backgroundColor: bg }]}>

      {/* Hidden camera — rendered as soon as permission is granted so
          onCameraReady fires and cameraRef is populated before capture. */}
      {hasPermission === true && (
        <CameraView
          ref={cameraRef}
          facing="front"
          onCameraReady={onCameraReady}
          style={nativeStyles.hiddenCamera}
        />
      )}

      {/* TOP BAR */}
      <View style={[nativeStyles.topBar, { backgroundColor: card, borderBottomColor: bord }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[nativeStyles.backBtn, { borderColor: bord, backgroundColor: bg }]}
        >
          <Text style={[nativeStyles.backArrow, { color: tp }]}>←</Text>
        </TouchableOpacity>
        <View style={nativeStyles.topBarText}>
          <Text style={[nativeStyles.topBarTitle, { color: tp }]}>
            {phase === 'results' ? 'Your mood · Products' : 'Personalising your experience…'}
          </Text>
          <Text style={[nativeStyles.topBarSub, { color: ts }]}>
            {phase === 'results' ? 'Tap to confirm or switch your mood' : 'Just a moment while we set things up'}
          </Text>
        </View>
        {(phase === 'initialising' || phase === 'scanning') && (
          <TouchableOpacity
            onPress={() => setPhase('manual')}
            style={[nativeStyles.manualBtn, { borderColor: bord }]}
          >
            <Text style={[nativeStyles.manualBtnText, { color: ts }]}>Pick manually</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── PHASES ── */}

      {/* Scanning / initialising */}
      {(phase === 'initialising' || phase === 'scanning') && (
        <View style={nativeStyles.content}>
          <View style={[nativeStyles.iconBox, { backgroundColor: tint, borderColor: pri + '33' }]}>
            <EmojiText style={nativeStyles.iconEmoji}>✨</EmojiText>
          </View>
          <Text style={[nativeStyles.h1, { color: tp }]}>Reading your vibe…</Text>
          <Text style={[nativeStyles.body, { color: ts }]}>
            Hold still for a second while we{'\n'}personalise your recommendations.
          </Text>
          <ActivityIndicator size="small" color={pri} />
        </View>
      )}

      {/* Fetching recs */}
      {phase === 'fetching_recs' && detectedMood && (
        <View style={nativeStyles.content}>
          <EmojiText style={{ fontSize: 64, marginBottom: 20 }}>
            {MOODS_META.find(m => m.key === detectedMood)?.emoji}
          </EmojiText>
          <Text style={[nativeStyles.h1, { color: tp }]}>
            {MOODS_META.find(m => m.key === detectedMood)?.label} mood detected
          </Text>
          <Text style={[nativeStyles.body, { color: ts }]}>
            Finding products that match{'\n'}your energy right now…
          </Text>
          <ActivityIndicator size="small" color={pri} />
        </View>
      )}

      {/* Results */}
      {phase === 'results' && detectedMood && (
        <View style={{ flex: 1 }}>
          <NativeResultsScreen
            mood={detectedMood}
            recs={productRecs}
            onConfirm={handleConfirm}
            onOverride={handleOverride}
            theme={theme}
          />
          {/* Scan again — overlaid at the bottom */}
          <TouchableOpacity
            onPress={handleRescan}
            style={[nativeStyles.rescanBtn, { borderColor: bord, backgroundColor: bg }]}
          >
            <Text style={[nativeStyles.rescanBtnText, { color: ts }]}>🔄  Scan again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {phase === 'error' && (
        <View style={nativeStyles.content}>
          <View style={nativeStyles.errorBox}>
            <Text style={{ fontSize: 44 }}>⚠️</Text>
          </View>
          <Text style={[nativeStyles.h2, { color: tp }]}>Couldn't access camera</Text>
          <Text style={[nativeStyles.body, { color: ts }]}>
            Camera permission denied.{'\n'}Please pick your mood manually.
          </Text>
          <TouchableOpacity
            onPress={() => setPhase('manual')}
            style={[nativeStyles.primaryBtn, { backgroundColor: pri }]}
          >
            <Text style={nativeStyles.primaryBtnText}>Pick mood manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual picker */}
      {phase === 'manual' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Text style={[nativeStyles.h2, { color: tp, textAlign: 'center', marginBottom: 6 }]}>
            How are you <Text style={{ color: pri, fontStyle: 'italic' }}>feeling?</Text>
          </Text>
          <Text style={[nativeStyles.manualSub, { color: ts }]}>
            Pick your mood and we'll find the right products.
          </Text>
          <View style={nativeStyles.moodGrid}>
            {MOODS_META.map(m => {
              const pal = MOOD_PALETTES[m.key];
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => handleOverride(m.key)}
                  style={[nativeStyles.moodChip, { backgroundColor: pal.tint, borderColor: pal.secondary }]}
                  activeOpacity={0.75}
                >
                  <EmojiText style={nativeStyles.moodEmoji}>{m.emoji}</EmojiText>
                  <View>
                    <Text style={[nativeStyles.moodLabel, { color: pal.primary }]}>{m.label}</Text>
                    <Text style={[nativeStyles.moodDesc,  { color: pal.primary }]}>{m.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB CAMERA SCREEN
───────────────────────────────────────────────────────────────────────── */

function WebCameraScreen() {
  const router             = useRouter();
  const { theme, setMood } = useTheme();
  const { profile }        = useAuth();

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const pollingRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didDetect   = useRef(false);
  const pollCount   = useRef(0);

  const [phase,        setPhase]        = useState<Phase>('initialising');
  const [errMsg,       setErrMsg]       = useState('');
  const [detectedMood, setDetectedMood] = useState<MoodKey | null>(null);
  const [productRecs,  setProductRecs]  = useState<ProductRec[]>([]);

  const pri  = theme.primary;
  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;

  /* inject global CSS once */
  useEffect(() => {
    if (document.getElementById('cam-css')) return;
    const s = document.createElement('style');
    s.id = 'cam-css';
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Lora:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: ${bg}; }
      .cam-btn {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        border: none; border-radius: 14px; cursor: pointer;
        font-family: 'Sora', sans-serif; font-weight: 800;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .cam-btn:hover  { transform: translateY(-2px); opacity: 0.9; }
      .cam-btn:active { transform: translateY(0);    opacity: 0.8; }
      .cam-mood-chip {
        display: flex; align-items: center; gap: 10px;
        border-radius: 14px; border-width: 1.5px; border-style: solid;
        padding: 14px 16px; cursor: pointer;
        font-family: 'Sora', sans-serif;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        background: none;
      }
      .cam-mood-chip:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
      .cam-rec-card {
        display: flex; align-items: flex-start; gap: 14px;
        border-radius: 16px; border-width: 1.5px; border-style: solid;
        padding: 16px; cursor: default;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        animation: cam-slidein 0.4s ease both;
      }
      .cam-rec-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      .cam-override-chip {
        display: flex; align-items: center; gap: 8px;
        border-radius: 40px; border-width: 1.5px; border-style: solid;
        padding: 8px 16px; cursor: pointer; white-space: nowrap;
        font-family: 'Sora', sans-serif;
        transition: transform 0.15s ease;
        background: none;
      }
      .cam-override-chip:hover { transform: translateY(-2px); }
      @keyframes cam-pulse    { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes cam-spin     { to { transform: rotate(360deg); } }
      @keyframes cam-fadein   { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes cam-slidein  { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
    `;
    document.head.appendChild(s);
  }, [theme]);

  const stopAll = useCallback(() => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  /* After mood detected: fetch recs */
  const handleMoodDetected = useCallback(async (moodKey: MoodKey) => {
    if (didDetect.current) return;
    didDetect.current = true;
    stopAll();
    setDetectedMood(moodKey);
    setPhase('fetching_recs');
    const meta = MOODS_META.find(m => m.key === moodKey)!;
    try {
      const recs = await fetchProductRecs(moodKey, meta.emoji);
      setProductRecs(recs);
    } catch (err: any) {
      console.error('[WebCameraScreen] ❌ fetchProductRecs failed:', err?.message);
      setProductRecs([]);
    }
    setPhase('results');
  }, [stopAll]);

  /* User confirms */
  const handleConfirm = useCallback((moodKey: MoodKey) => {
    const meta = MOODS_META.find(m => m.key === moodKey)!;
    setMood(moodKey);
    if (profile?.id) NotificationService.moodSelected(profile.id, meta.label, meta.emoji);
    router.back();
  }, [setMood, profile, router]);

  /* User overrides */
  const handleOverride = useCallback(async (moodKey: MoodKey) => {
    didDetect.current = true;
    setDetectedMood(moodKey);
    setPhase('fetching_recs');
    const meta = MOODS_META.find(m => m.key === moodKey)!;
    try {
      const recs = await fetchProductRecs(moodKey, meta.emoji);
      setProductRecs(recs);
    } catch (err: any) {
      console.error('[WebCameraScreen] ❌ fetchProductRecs (override) failed:', err?.message);
      setProductRecs([]);
    }
    setPhase('results');
  }, []);

  const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const el = document.createElement('script');
      el.src = src;
      el.onload  = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(el);
    });

  const startPolling = useCallback((fa: any) => {
    const attempt = async () => {
      if (didDetect.current || !streamRef.current || !videoRef.current) return;

      pollCount.current += 1;
      if (pollCount.current > MAX_POLL_ATTEMPTS) {
        console.warn('[WebCameraScreen] Max poll attempts reached, falling back to manual');
        stopAll();
        setPhase('manual');
        return;
      }

      try {
        const detection = await fa
          .detectSingleFace(videoRef.current, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceExpressions();

        if (detection?.expressions) {
          const expressions = detection.expressions as Record<string, number>;
          const [topLabel, topScore] = Object.entries(expressions)
            .sort((a, b) => b[1] - a[1])[0];

          // Debug: shows real scores in the console so thresholds can be tuned
          console.log('[faceapi] top:', topLabel, topScore, JSON.stringify(expressions));

          const threshold = topLabel === 'neutral' ? NEUTRAL_THRESHOLD : CONFIDENCE_THRESHOLD;

          if (topScore >= threshold) {
            const moodKey = EMOTION_TO_MOOD[topLabel] ?? 'neutral';
            await handleMoodDetected(moodKey);
            return;
          }
        }
      } catch (err) {
        console.warn('[WebCameraScreen] Poll attempt failed, retrying…', err);
      }

      pollingRef.current = setTimeout(attempt, POLL_INTERVAL);
    };
    attempt();
  }, [handleMoodDetected, stopAll]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
        const fa = (window as any).faceapi;
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          fa.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await new Promise<void>(res => { videoRef.current!.onloadedmetadata = () => res(); });
        await videoRef.current.play();

        // Diagnostic log — if either dimension is 0 the video feed is broken
        console.log('[WebCam] Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);

        setPhase('scanning');
        startPolling(fa);
      } catch (err: any) {
        stopAll();
        console.error('[WebCameraScreen] ❌ Init failed:', err);
        const msg = (err?.message ?? '').toLowerCase();
        if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
          setErrMsg('Camera access was denied. Please allow camera access in your browser settings.');
        } else if (msg.includes('notfound') || msg.includes('no camera')) {
          setErrMsg('No camera found on this device.');
        } else {
          setErrMsg(err?.message || 'Something went wrong starting the camera.');
        }
        setPhase('error');
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const detectedMeta = detectedMood ? MOODS_META.find(m => m.key === detectedMood) : null;
  const detectedPal  = detectedMood ? MOOD_PALETTES[detectedMood] : null;

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: '"Sora", sans-serif', color: tp, display: 'flex', flexDirection: 'column' }}>
      <video
        ref={videoRef} autoPlay muted playsInline aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
      />

      {/* TOP BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: card, borderBottom: `1px solid ${bord}`, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => { stopAll(); router.back(); }}
          style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${bord}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: tp, flexShrink: 0 }}
        >←</button>
        <div>
          <div style={{ fontFamily: '"Lora", serif', fontSize: 18, fontWeight: 900, color: tp, letterSpacing: -0.3 }}>
            {phase === 'results' ? 'Your mood · Products' : 'Personalising your experience…'}
          </div>
          <div style={{ fontSize: 11, color: ts }}>
            {phase === 'results' ? 'Confirm your mood or switch it below' : 'Just a moment while we set things up'}
          </div>
        </div>
        {(phase === 'initialising' || phase === 'scanning') && (
          <button
            onClick={() => { stopAll(); setPhase('manual'); }}
            style={{ marginLeft: 'auto', background: 'none', border: `1.5px solid ${bord}`, borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 700, color: ts, cursor: 'pointer', fontFamily: '"Sora", sans-serif', whiteSpace: 'nowrap' }}
          >
            Pick manually
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: phase === 'results' ? 'flex-start' : 'center', padding: '32px 24px 60px', maxWidth: 680, margin: '0 auto', width: '100%' }}>

        {/* Scanning */}
        {(phase === 'initialising' || phase === 'scanning') && (
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: tint, border: `2px solid ${pri}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, margin: '0 auto 28px', animation: 'cam-pulse 2s ease-in-out infinite' }}>✨</div>
            <h1 style={{ fontFamily: '"Lora", serif', fontSize: 28, fontWeight: 900, color: tp, letterSpacing: -0.5, marginBottom: 12 }}>Reading your vibe…</h1>
            <p style={{ fontSize: 15, color: ts, lineHeight: 1.7, marginBottom: 32 }}>Hold still for a second while we personalise your recommendations.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {[0, 0.3, 0.6].map((delay, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: pri, animation: `cam-pulse 1.2s ease-in-out ${delay}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Fetching recs */}
        {phase === 'fetching_recs' && detectedMeta && (
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>{detectedMeta.emoji}</div>
            <h1 style={{ fontFamily: '"Lora", serif', fontSize: 28, fontWeight: 900, color: tp, letterSpacing: -0.5, marginBottom: 12 }}>{detectedMeta.label} mood detected</h1>
            <p style={{ fontSize: 15, color: ts, lineHeight: 1.7, marginBottom: 28 }}>Finding products that match your energy right now…</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {[0, 0.3, 0.6].map((delay, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: pri, animation: `cam-pulse 1.2s ease-in-out ${delay}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && detectedMeta && detectedPal && detectedMood && (
          <div style={{ width: '100%', animation: 'cam-fadein 0.5s ease both' }}>

            {/* Mood hero */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: detectedPal.tint, border: `1.5px solid ${detectedPal.secondary}`, borderRadius: 20, padding: '20px 24px', marginBottom: 28 }}>
              <span style={{ fontSize: 52 }}>{detectedMeta.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: detectedPal.primary, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>We detected your mood</div>
                <div style={{ fontFamily: '"Lora", serif', fontSize: 26, fontWeight: 900, color: detectedPal.primary, letterSpacing: -0.3 }}>{detectedMeta.label}</div>
                <div style={{ fontSize: 13, color: detectedPal.primary, opacity: 0.75, marginTop: 2 }}>{detectedMeta.description}</div>
              </div>
              <button
                className="cam-btn"
                onClick={() => handleConfirm(detectedMood)}
                style={{ marginLeft: 'auto', background: detectedPal.primary, color: '#fff', padding: '12px 20px', fontSize: 14, borderRadius: 12, flexShrink: 0 }}
              >
                Shop this vibe {detectedMeta.emoji}
              </button>
            </div>

            {/* Product recs */}
            {productRecs.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontFamily: '"Lora", serif', fontSize: 20, fontWeight: 900, color: tp, letterSpacing: -0.3 }}>Picked for your vibe ✦</span>
                  <span style={{ fontSize: 12, color: ts, fontWeight: 600 }}>{productRecs.length} items</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {productRecs.map((rec, i) => (
                    <div
                      key={i}
                      className="cam-rec-card"
                      style={{ background: card, borderColor: bord, animationDelay: `${i * 0.1}s` }}
                    >
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: detectedPal.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                        {rec.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: tp }}>{rec.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: detectedPal.primary }}>{rec.priceRange}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: ts, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{rec.category}</div>
                        <div style={{ fontSize: 13, color: ts, lineHeight: 1.5 }}>{rec.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Override */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: ts, fontWeight: 600 }}>Not how you feel?</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MOODS_META.filter(m => m.key !== detectedMood).map(m => {
                const p = MOOD_PALETTES[m.key];
                return (
                  <button
                    key={m.key}
                    className="cam-override-chip"
                    onClick={() => handleOverride(m.key)}
                    style={{ background: p.tint, borderColor: p.secondary }}
                  >
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: p.primary }}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={{ textAlign: 'center', maxWidth: 460 }}>
            <div style={{ width: 90, height: 90, borderRadius: 24, background: '#FEF2F2', border: '2px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto 24px' }}>⚠️</div>
            <h2 style={{ fontFamily: '"Lora", serif', fontSize: 24, fontWeight: 900, color: tp, marginBottom: 10 }}>Couldn't access camera</h2>
            <p style={{ fontSize: 14, color: ts, lineHeight: 1.7, marginBottom: 28 }}>{errMsg} Please pick your mood manually below.</p>
            <button className="cam-btn" onClick={() => setPhase('manual')} style={{ background: pri, color: '#fff', width: '100%', height: 50, fontSize: 15, borderRadius: 14 }}>
              Pick mood manually
            </button>
          </div>
        )}

        {/* Manual picker */}
        {phase === 'manual' && (
          <div style={{ width: '100%', maxWidth: 600 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ fontFamily: '"Lora", serif', fontSize: 28, fontWeight: 900, color: tp, letterSpacing: -0.5, marginBottom: 8 }}>
                How are you <em style={{ color: pri }}>feeling?</em>
              </h2>
              <p style={{ fontSize: 14, color: ts }}>Pick your mood and we'll find the right products.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {MOODS_META.map(m => {
                const pal = MOOD_PALETTES[m.key];
                return (
                  <button
                    key={m.key}
                    className="cam-mood-chip"
                    onClick={() => handleOverride(m.key)}
                    style={{ background: pal.tint, borderColor: pal.secondary, textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 34, flexShrink: 0 }}>{m.emoji}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: pal.primary, marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: pal.primary, opacity: 0.75 }}>{m.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NATIVE STYLES
───────────────────────────────────────────────────────────────────────── */

const nativeStyles = StyleSheet.create({
  container:      { flex: 1 },
  // Full-screen but behind all content — iOS will render it (so hardware inits)
  // and onCameraReady fires. opacity:0 + zIndex:-1 keeps it invisible to the user.
  hiddenCamera:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, zIndex: -1 },

  topBar:         { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  backBtn:        { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  backArrow:      { fontSize: 18 },
  topBarText:     { flex: 1 },
  topBarTitle:    { fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  topBarSub:      { fontSize: 11 },
  manualBtn:      { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  manualBtnText:  { fontSize: 12, fontWeight: '700' },

  content:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  iconBox:        { width: 96, height: 96, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  iconEmoji:      { fontSize: 48 },
  h1:             { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' },
  h2:             { fontSize: 20, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  body:           { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 28, opacity: 0.75 },

  errorBox:       { width: 90, height: 90, borderRadius: 24, backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#FECACA', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  primaryBtn:     { width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  manualSub:      { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  moodGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moodChip:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, padding: 14, width: '47%' },
  moodEmoji:      { fontSize: 32 },
  moodLabel:      { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  moodDesc:       { fontSize: 11, opacity: 0.75 },

  moodHero:       { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 24 },
  moodHeroEmoji:  { fontSize: 52 },
  moodHeroLabel:  { fontSize: 11, fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  moodHeroMood:   { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  moodHeroDesc:   { fontSize: 13, opacity: 0.75, marginTop: 2 },

  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:   { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sectionSub:     { fontSize: 12, fontWeight: '600' },

  recCard:        { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 10 },
  recEmojiBox:    { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recTopRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  recName:        { fontSize: 15, fontWeight: '800', flex: 1 },
  recPrice:       { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  recCategory:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, opacity: 0.6 },
  recReason:      { fontSize: 13, lineHeight: 18, opacity: 0.75 },

  ctaBtn:         { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 24 },
  ctaBtnText:     { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },

  overrideLabel:  { fontSize: 13, fontWeight: '600', marginBottom: 12, opacity: 0.7 },
  overrideChip:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 40, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  overrideChipText: { fontSize: 13, fontWeight: '700' },

  rescanBtn:     { alignSelf: 'center', marginBottom: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  rescanBtnText: { fontSize: 13, fontWeight: '700' },
});

export default function CameraRoute() {
  if (Platform.OS === 'web') return <WebCameraScreen />;
  return <MobileCameraScreen />;
}