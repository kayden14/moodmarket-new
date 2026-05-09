/**
 * app/camera.tsx
 * Updated: passes photo.uri to detectMoodFromImage for image compression
 */

import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
  Animated, Easing,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTheme, MoodKey } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications';
import {
  detectMoodFromImage,
  MoodDetectionResult,
  pickImageFromGallery,
} from '@/lib/mood-detection';
import {
  ArrowLeft, Upload, CheckCircle,
  RefreshCw, RotateCcw, Zap, Camera,
} from 'lucide-react-native';

const MOOD_STYLES: Record<string, {
  lightBg: string; darkBg: string; emoji: string; label: string; accent: string;
}> = {
  happy:   { lightBg: '#FFF9E6', darkBg: '#1A1400', emoji: '😊', label: 'Happy',   accent: '#F59E0B' },
  calm:    { lightBg: '#EBF5FB', darkBg: '#0D1F2D', emoji: '😌', label: 'Calm',    accent: '#3B82F6' },
  excited: { lightBg: '#FEF2F2', darkBg: '#2D1515', emoji: '🤩', label: 'Excited', accent: '#EF4444' },
  sad:     { lightBg: '#EEF2FF', darkBg: '#0D1020', emoji: '😢', label: 'Sad',     accent: '#6366F1' },
  angry:   { lightBg: '#FEF2F2', darkBg: '#2D1515', emoji: '😠', label: 'Angry',   accent: '#DC2626' },
  tired:   { lightBg: '#F5F3FF', darkBg: '#1E1428', emoji: '😴', label: 'Tired',   accent: '#8B5CF6' },
  anxious: { lightBg: '#ECFDF5', darkBg: '#0D2B1F', emoji: '😰', label: 'Anxious', accent: '#10B981' },
  neutral: { lightBg: '#F7F7F7', darkBg: '#1A1A1A', emoji: '😐', label: 'Neutral', accent: '#FF7A8A' },
};

function ScanOverlay() {
  const scanY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = scanY.interpolate({ inputRange: [0, 1], outputRange: [-130, 130] });

  return (
    <View style={scan.wrap} pointerEvents="none">
      <View style={scan.oval} />
      <Animated.View style={[scan.line, { transform: [{ translateY }] }]} />
      {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx, sy], i) => (
        <View key={i} style={[scan.bracket, {
          top:    sy === -1 ? '22%' : undefined,
          bottom: sy ===  1 ? '22%' : undefined,
          left:   sx === -1 ? '22%' : undefined,
          right:  sx ===  1 ? '22%' : undefined,
          borderTopWidth:    sy === -1 ? 3 : 0,
          borderBottomWidth: sy ===  1 ? 3 : 0,
          borderLeftWidth:   sx === -1 ? 3 : 0,
          borderRightWidth:  sx ===  1 ? 3 : 0,
        }]} />
      ))}
      <Text style={scan.hint}>Position your face here</Text>
    </View>
  );
}

const scan = StyleSheet.create({
  wrap:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  oval:    { width: 240, height: 310, borderRadius: 120, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
  line:    { position: 'absolute', width: 230, height: 2, backgroundColor: 'rgba(255,122,138,0.7)', borderRadius: 1 },
  bracket: { position: 'absolute', width: 20, height: 20, borderColor: '#FF7A8A' },
  hint:    { position: 'absolute', bottom: '18%', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
});

function AiDetectBtn({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [loading]);

  return (
    <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.8} style={{ alignItems: 'center', gap: 6, width: 70 }}>
      <Animated.View style={[ai.btn, { transform: [{ scale: pulse }] }, loading && ai.btnActive]}>
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Zap size={20} color="#fff" strokeWidth={2.5} fill="#fff" />
        }
      </Animated.View>
      <Text style={ai.label}>{loading ? 'Detecting…' : 'AI Detect'}</Text>
    </TouchableOpacity>
  );
}

const ai = StyleSheet.create({
  btn:       { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,122,138,0.85)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  btnActive: { backgroundColor: '#FF7A8A' },
  label:     { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
});

export default function CameraScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme, isDark, setMood } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing,       setFacing]       = useState<CameraType>('front');
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState('Analysing your expression…');
  const [error,        setError]        = useState('');
  const [detectedMood, setDetectedMood] = useState<MoodDetectionResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const resultScale   = useRef(new Animated.Value(0.85)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const showResult = () => {
    Animated.parallel([
      Animated.spring(resultScale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  // ── Core detection — now accepts uri for compression ───────────────────────
  const runDetection = async (base64: string, uri?: string) => {
    setLoadingMsg('Compressing image…');
    console.log('[Camera] Sending image to detect-mood, base64 length:', base64.length);

    try {
      setLoadingMsg('Analysing your expression…');
      const mood = await detectMoodFromImage(base64, uri);
      console.log('[Camera] Mood detected:', mood);

      setMood(mood.mood as MoodKey);
      setDetectedMood(mood);
      showResult();
      await saveMoodHistory(mood);
      if (user?.id) {
        NotificationService.moodSelected(user.id, mood.mood, mood.emoji);
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error('[Camera] Detection error:', msg);

      let friendly = 'Could not detect mood. Please try again.';
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
        friendly = 'Network error. Check your internet connection and try again.';
      } else if (msg.includes('daily AI limit') || msg.includes('quota')) {
        friendly = 'Daily AI limit reached. Please try again tomorrow or use the manual mood selector.';
      } else if (msg.includes('EXPO_PUBLIC_GEMINI_API_KEY') || msg.includes('not set')) {
        friendly = 'Gemini API key not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.';
      } else if (msg.includes('401') || msg.includes('403')) {
        friendly = 'Invalid API key. Check your EXPO_PUBLIC_GEMINI_API_KEY in .env';
      } else if (msg.includes('404')) {
        friendly = 'Gemini model not found. Please update the app.';
      } else if (msg.includes('500') || msg.includes('502')) {
        friendly = 'Gemini service error. Please try again in a moment.';
      }

      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  // ── Capture from camera ─────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!user) { router.push('/login'); return; }
    if (loading) return;

    if (!cameraRef.current) {
      setError('Camera not ready. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError('');
    setLoadingMsg('Capturing photo…');

    try {
      console.log('[Camera] Taking picture…');
      const photo = await cameraRef.current.takePictureAsync({
        base64:         true,
        quality:        0.8,
        exif:           false,
        skipProcessing: false,
      });

      console.log('[Camera] Photo captured, base64 length:', photo?.base64?.length ?? 0);

      if (!photo?.base64 || photo.base64.length < 100) {
        setError('Photo capture returned empty data. Try again in better lighting.');
        setLoading(false);
        return;
      }

      // Pass both base64 AND uri — uri is used by mood-detection to compress the image
      await runDetection(photo.base64, photo.uri);

    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error('[Camera] takePictureAsync error:', msg);
      setError(`Capture failed: ${msg}. Please try again.`);
      setLoading(false);
    }
  };

  const handleAiDetect = () => handleCapture();

  // ── Gallery pick ────────────────────────────────────────────────────────────
  const handleGallery = async () => {
    if (!user) { router.push('/login'); return; }
    if (loading) return;
    setLoading(true);
    setError('');
    setLoadingMsg('Loading photo…');
    try {
      const image = await pickImageFromGallery();
      if (!image) { setLoading(false); return; }
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      setLoadingMsg('Processing image…');
      const base64 = await readAsStringAsync(image.uri, { encoding: 'base64' });
      // Pass uri so mood-detection can compress via ImageManipulator
      await runDetection(base64, image.uri);
    } catch (err: any) {
      setError(err.message || 'Failed to load image.');
      setLoading(false);
    }
  };

  // ── Save to mood history ────────────────────────────────────────────────────
  const saveMoodHistory = async (mood: MoodDetectionResult) => {
    if (!user || !profile) return;
    try {
      const entry = {
        date: new Date().toLocaleDateString('en-GB', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        mood: mood.emoji,
      };
      const updated = [...(profile.mood_history ?? []), entry];
      await supabase.from('profiles').update({ mood_history: updated }).eq('id', user.id);
    } catch (e) {
      console.warn('[Camera] saveMoodHistory failed:', e);
    }
  };

  const reset = () => {
    setDetectedMood(null); setError('');
    resultScale.setValue(0.85); resultOpacity.setValue(0);
  };

  const moodStyle     = detectedMood ? (MOOD_STYLES[detectedMood.mood] ?? MOOD_STYLES.neutral) : null;
  const confidencePct = detectedMood ? Math.round(detectedMood.confidence * 100) : 0;

  if (!permission) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={s.permBox}>
          <Text style={s.permEmoji}>📷</Text>
          <Text style={[s.permTitle, { color: theme.textPrimary }]}>Camera access needed</Text>
          <Text style={[s.permSub, { color: theme.textSecondary }]}>
            MoodMarket uses your camera to detect your mood using AI. Your photo is never stored.
          </Text>
          <TouchableOpacity
            style={[s.permBtn, { backgroundColor: theme.primary }]}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Camera size={18} color="#fff" strokeWidth={2} />
            <Text style={s.permBtnTxt}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.galleryLink} onPress={handleGallery} activeOpacity={0.75}>
            <Upload size={15} color={theme.primary} strokeWidth={2} />
            <Text style={[s.galleryLinkTxt, { color: theme.primary }]}>
              Use a photo from gallery instead
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (detectedMood && moodStyle) {
    const bg        = isDark ? moodStyle.darkBg  : moodStyle.lightBg;
    const textColor = isDark ? '#FFFFFF'          : '#111111';
    const subColor  = isDark ? '#BBBBBB'          : '#666666';
    const trackBg   = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={s.resultHeader}>
          <TouchableOpacity
            style={[s.resultBackBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
            }]}
            onPress={reset}
          >
            <ArrowLeft size={20} color={textColor} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <Animated.View style={[s.resultBox, {
          transform: [{ scale: resultScale }], opacity: resultOpacity,
        }]}>
          <Text style={s.resultEmoji}>{moodStyle.emoji}</Text>
          <Text style={[s.resultMood, { color: textColor }]}>{moodStyle.label}</Text>
          <Text style={[s.resultSub, { color: subColor }]}>mood detected</Text>
          <View style={s.confWrap}>
            <View style={[s.confTrack, { backgroundColor: trackBg }]}>
              <View style={[s.confFill, {
                width: `${confidencePct}%` as any,
                backgroundColor: moodStyle.accent,
              }]} />
            </View>
            <Text style={[s.confTxt, { color: subColor }]}>
              {confidencePct}% confidence
            </Text>
          </View>
          <View style={[s.moodBadge, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
          }]}>
            <Text style={[s.moodBadgeTxt, { color: subColor }]}>
              We're curating products that match your{' '}
              <Text style={{ color: moodStyle.accent, fontWeight: '800' }}>
                {moodStyle.label.toLowerCase()}
              </Text>{' '}
              mood!
            </Text>
          </View>
        </Animated.View>
        <View style={s.resultActions}>
          <TouchableOpacity
            style={[s.seeRecsBtn, { backgroundColor: moodStyle.accent }]}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.88}
          >
            <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.seeRecsTxt}>See My Recommendations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.retryBtn, {
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
            }]}
            onPress={reset}
            activeOpacity={0.75}
          >
            <RefreshCw size={15} color={textColor} strokeWidth={2.5} />
            <Text style={[s.retryTxt, { color: textColor }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
      >
        <View style={{ flex: 1 }} />
      </CameraView>
      {!loading && <ScanOverlay />}
      {loading && (
        <View style={s.loadingOverlay}>
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color="#FF7A8A" />
            <Text style={s.loadingTitle}>Detecting Mood…</Text>
            <Text style={s.loadingMsg}>{loadingMsg}</Text>
          </View>
        </View>
      )}
      {!!error && !loading && (
        <View style={s.errorBanner}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')} style={s.errorDismiss}>
            <Text style={s.errorDismissTxt}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={s.camHeader}>
        <TouchableOpacity style={s.camIconBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.camTitle}>Detect Your Mood</Text>
          <Text style={s.camSubtitle}>AI-powered facial analysis</Text>
        </View>
        <TouchableOpacity
          style={s.camIconBtn}
          onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}
        >
          <RotateCcw size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <View style={s.camBottom}>
        {!loading && (
          <Text style={s.tipTxt}>
            Tap the shutter or AI Detect · Keep your face well-lit
          </Text>
        )}
        <View style={s.camControls}>
          <TouchableOpacity
            style={s.sideBtn}
            onPress={handleGallery}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={s.sideBtnIcon}>
              <Upload size={20} color="#fff" strokeWidth={2} />
            </View>
            <Text style={s.sideBtnTxt}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.captureBtn, loading && s.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="large" color="#FF7A8A" />
              : <View style={s.captureInner} />
            }
          </TouchableOpacity>
          <AiDetectBtn onPress={handleAiDetect} loading={loading} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  permBox:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  permEmoji:     { fontSize: 72, marginBottom: 20 },
  permTitle:     { fontSize: 24, fontWeight: '900', marginBottom: 10, textAlign: 'center', letterSpacing: -0.5 },
  permSub:       { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permBtn:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 32, marginBottom: 16 },
  permBtnTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
  galleryLink:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  galleryLinkTxt:{ fontSize: 14, fontWeight: '600' },
  camHeader:     { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingHorizontal: 20, paddingBottom: 12 },
  camIconBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  camTitle:      { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  camSubtitle:   { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', marginTop: 2 },
  loadingOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  loadingCard:   { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  loadingTitle:  { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  loadingMsg:    { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  errorBanner:   { position: 'absolute', bottom: 170, left: 16, right: 16, backgroundColor: 'rgba(180,30,30,0.95)', borderRadius: 14, padding: 14 },
  errorTxt:      { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  errorDismiss:  { alignSelf: 'center' },
  errorDismissTxt:{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  camBottom:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingBottom: Platform.OS === 'ios' ? 48 : 28 },
  camControls:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 },
  sideBtn:       { alignItems: 'center', gap: 6, width: 70 },
  sideBtnIcon:   { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sideBtnTxt:    { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  captureBtn:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.35)' },
  captureBtnDisabled: { opacity: 0.5 },
  captureInner:  { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FF7A8A' },
  tipTxt:        { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', paddingHorizontal: 32, paddingTop: 14, paddingBottom: 4 },
  resultHeader:  { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingHorizontal: 20, paddingBottom: 8 },
  resultBackBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  resultBox:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  resultEmoji:   { fontSize: 100, marginBottom: 16 },
  resultMood:    { fontSize: 44, fontWeight: '900', letterSpacing: -1.5, marginBottom: 4 },
  resultSub:     { fontSize: 14, fontWeight: '500', marginBottom: 28, textTransform: 'uppercase', letterSpacing: 2 },
  confWrap:      { width: '100%', alignItems: 'center', marginBottom: 20 },
  confTrack:     { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  confFill:      { height: '100%', borderRadius: 4 },
  confTxt:       { fontSize: 13, fontWeight: '600' },
  moodBadge:     { borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 14, marginTop: 8 },
  moodBadgeTxt:  { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  resultActions: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 52 : 36, gap: 12 },
  seeRecsBtn:    { borderRadius: 18, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  seeRecsTxt:    { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  retryTxt:      { fontSize: 15, fontWeight: '700' },
});