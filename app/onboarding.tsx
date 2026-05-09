/**
 * app/onboarding.tsx
 *
 * Single file for both platforms:
 *  - Android/iOS  → OnboardingScreen (default export, ScrollView + SVG)
 *  - Web          → OnboardingScreenWeb (auto-used by Expo via Platform.OS === 'web')
 *
 * Expo automatically uses Platform.OS checks — no .web.tsx split needed here
 * because the web section is lightweight enough to co-locate.
 */

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import EmojiText from '@/components/EmojiText';
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import Svg, {
  Path, Circle, Rect, Ellipse, G,
  Defs, RadialGradient, LinearGradient, Stop, Line,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

/* ─────────────────────────────────────────────────────────────────────────
   SVG ILLUSTRATIONS  (shared between mobile + web preview)
───────────────────────────────────────────────────────────────────────── */

const SlideOneIllustration = () => (
  <Svg width={width * 0.75} height={width * 0.75} viewBox="0 0 300 300">
    <Defs>
      <RadialGradient id="bgGlow1" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FF7A8A" stopOpacity="0.18" />
        <Stop offset="100%" stopColor="#FF7A8A" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id="bagGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#FFB3BC" />
        <Stop offset="100%" stopColor="#FF7A8A" />
      </LinearGradient>
      <LinearGradient id="bagTop" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#FF5A6E" />
        <Stop offset="100%" stopColor="#FF7A8A" />
      </LinearGradient>
    </Defs>
    <Circle cx="150" cy="150" r="130" fill="url(#bgGlow1)" />
    <Rect x="80" y="120" width="140" height="120" rx="18" fill="url(#bagGrad)" />
    <Rect x="80" y="120" width="140" height="42" rx="18" fill="url(#bagTop)" />
    <Path d="M112 120 Q112 78 150 78 Q188 78 188 120" stroke="#FF7A8A" strokeWidth="11" strokeLinecap="round" fill="none" />
    <Path d="M112 120 Q112 78 150 78 Q188 78 188 120" stroke="#FFF9F9" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.4" />
    <Rect x="96" y="136" width="38" height="8" rx="4" fill="white" opacity="0.25" />
    <Rect x="132" y="167" width="36" height="26" rx="6" fill="white" opacity="0.2" />
    <Line x1="150" y1="167" x2="150" y2="160" stroke="white" strokeWidth="2" opacity="0.45" />
    <Circle cx="150" cy="158" r="3" fill="white" opacity="0.45" />
    <G opacity="0.95">
      <Path d="M58 82 L61 72 L64 82 L74 85 L64 88 L61 98 L58 88 L48 85 Z" fill="#FFC3B5" />
      <Path d="M232 58 L234 51 L236 58 L243 60 L236 62 L234 69 L232 62 L225 60 Z" fill="#FFC3B5" />
      <Path d="M242 172 L244 167 L246 172 L251 174 L246 176 L244 181 L242 176 L237 174 Z" fill="#FF7A8A" opacity="0.7" />
      <Circle cx="66" cy="182" r="4.5" fill="#FFC3B5" opacity="0.85" />
      <Circle cx="242" cy="112" r="3.5" fill="#FFB3BC" opacity="0.8" />
    </G>
  </Svg>
);

const SlideTwoIllustration = () => (
  <Svg width={width * 0.75} height={width * 0.75} viewBox="0 0 300 300">
    <Defs>
      <RadialGradient id="bgGlow2" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FF7A8A" stopOpacity="0.15" />
        <Stop offset="100%" stopColor="#FF7A8A" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id="phoneGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#FFF0F2" />
        <Stop offset="100%" stopColor="#FFE4E8" />
      </LinearGradient>
    </Defs>
    <Circle cx="150" cy="150" r="130" fill="url(#bgGlow2)" />
    <Rect x="88" y="68" width="124" height="174" rx="22" fill="#2B2B2B" />
    <Rect x="92" y="72" width="116" height="166" rx="19" fill="url(#phoneGrad)" />
    <Rect x="128" y="72" width="44" height="15" rx="7.5" fill="#2B2B2B" />
    <Circle cx="150" cy="79.5" r="4" fill="#3D3D3D" />
    <Ellipse cx="150" cy="156" rx="37" ry="43" stroke="#FF7A8A" strokeWidth="2" fill="none" strokeDasharray="5 3" />
    <Line x1="111" y1="147" x2="189" y2="147" stroke="#FF7A8A" strokeWidth="1.5" opacity="0.55" />
    <Path d="M111 122 L111 110 L123 110" stroke="#FF7A8A" strokeWidth="3" strokeLinecap="round" fill="none" />
    <Path d="M189 122 L189 110 L177 110" stroke="#FF7A8A" strokeWidth="3" strokeLinecap="round" fill="none" />
    <Path d="M111 190 L111 202 L123 202" stroke="#FF7A8A" strokeWidth="3" strokeLinecap="round" fill="none" />
    <Path d="M189 190 L189 202 L177 202" stroke="#FF7A8A" strokeWidth="3" strokeLinecap="round" fill="none" />
    <Circle cx="137" cy="149" r="4.5" fill="#FF7A8A" opacity="0.75" />
    <Circle cx="163" cy="149" r="4.5" fill="#FF7A8A" opacity="0.75" />
    <Path d="M137 169 Q150 180 163 169" stroke="#FF7A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75" />
  </Svg>
);

const SlideThreeIllustration = () => (
  <Svg width={width * 0.75} height={width * 0.75} viewBox="0 0 300 300">
    <Defs>
      <RadialGradient id="bgGlow3" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FF7A8A" stopOpacity="0.18" />
        <Stop offset="100%" stopColor="#FF7A8A" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id="cardFront" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#FF7A8A" />
        <Stop offset="100%" stopColor="#FF5A6E" />
      </LinearGradient>
      <LinearGradient id="cardImg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#FFC3B5" />
        <Stop offset="100%" stopColor="#FFB3BC" />
      </LinearGradient>
    </Defs>
    <Circle cx="150" cy="150" r="130" fill="url(#bgGlow3)" />
    <Rect x="115" y="82" width="108" height="138" rx="16" fill="#FFD0D7" opacity="0.85" transform="rotate(4 131 151)" />
    <Rect x="78" y="88" width="118" height="148" rx="16" fill="white" />
    <Rect x="86" y="96" width="102" height="76" rx="10" fill="url(#cardImg)" />
    <Path d="M137 135 L137 118 Q137 113 142 113 L150 113 Q152 113 153 115 L156 118 L162 118 Q164 118 164 120 L164 135 Q164 137 162 137 L139 137 Q137 137 137 135 Z" fill="white" opacity="0.75" />
    <Rect x="86" y="181" width="72" height="8" rx="4" fill="#F2E6E8" />
    <Rect x="86" y="195" width="52" height="6" rx="3" fill="#F2E6E8" />
    <Rect x="154" y="191" width="34" height="20" rx="8" fill="url(#cardFront)" />
    <Rect x="158" y="197" width="26" height="5" rx="2.5" fill="white" opacity="0.65" />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────────────────
   SLIDE DATA
───────────────────────────────────────────────────────────────────────── */

const slides = [
  {
    id: 1,
    label: '01 / 03',
    title: 'Welcome to\nMoodMarket',
    description: 'A smarter way to shop — products curated around how you feel, not just what you search.',
    bgTop: '#FFF0F2',
    bgBottom: '#FFF9F9',
    illustration: SlideOneIllustration,
    webEmoji: '🛍️',
    webAccent: '#FF7A8A',
  },
  {
    id: 2,
    label: '02 / 03',
    title: 'Read Your\nMood Instantly',
    description: 'Our AI analyzes your expression in seconds — no questionnaires, no guessing.',
    bgTop: '#FFF5F6',
    bgBottom: '#FFF9F9',
    illustration: SlideTwoIllustration,
    webEmoji: '🤳',
    webAccent: '#FF5A6E',
  },
  {
    id: 3,
    label: '03 / 03',
    title: 'Shop What\nFeels Right',
    description: 'Receive hyper-personalized picks that resonate with your emotions, every single time.',
    bgTop: '#FFF2F4',
    bgBottom: '#FFF9F9',
    illustration: SlideThreeIllustration,
    webEmoji: '✨',
    webAccent: '#FF7A8A',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   WEB ONBOARDING
   Beautiful full-screen split layout with animated slides
───────────────────────────────────────────────────────────────────────── */

function OnboardingScreenWeb() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  const goNext = () => {
    if (current < slides.length - 1) setCurrent(c => c + 1);
    else router.replace('/login');
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    .ob-root { height: 100vh; display: flex; font-family: 'Sora', sans-serif; background: #fff; }

    /* LEFT PANEL */
    .ob-left {
      width: 55%; position: relative; overflow: hidden;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      transition: background 0.6s ease;
    }
    .ob-left-bg {
      position: absolute; inset: 0;
      background: linear-gradient(145deg, #FFF0F2 0%, #FFF9F9 100%);
      transition: opacity 0.5s ease;
    }
    .ob-blob {
      position: absolute; border-radius: 50%; filter: blur(60px);
      pointer-events: none;
    }

    /* RIGHT PANEL */
    .ob-right {
      width: 45%; display: flex; flex-direction: column; justify-content: center;
      padding: 60px 56px; background: #fff; position: relative;
    }

    /* Slide counter pill */
    .ob-pill {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1px solid #FF7A8A44; background: #FF7A8A0D;
      border-radius: 20px; padding: 5px 13px;
      font-size: 11px; font-weight: 700; letter-spacing: 1.6px;
      color: #FF7A8A; text-transform: uppercase; margin-bottom: 32px;
      width: fit-content;
    }

    /* Title */
    .ob-title {
      font-family: 'Lora', serif;
      font-size: clamp(32px, 4vw, 52px);
      font-weight: 900; color: #1A1A1A; line-height: 1.12;
      letter-spacing: -1px; margin-bottom: 18px;
      white-space: pre-line;
    }
    .ob-title em { font-style: italic; color: #FF7A8A; }

    /* Description */
    .ob-desc {
      font-size: 16px; color: #6B7280; line-height: 1.7;
      max-width: 380px; margin-bottom: 44px; font-weight: 400;
    }

    /* Pagination dots */
    .ob-dots { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
    .ob-dot {
      height: 6px; border-radius: 3px;
      background: #F2E6E8; transition: all 0.35s cubic-bezier(.34,1.56,.64,1);
    }
    .ob-dot.active { width: 32px; background: #FF7A8A; }
    .ob-dot:not(.active) { width: 8px; cursor: pointer; }
    .ob-dot:not(.active):hover { background: #FFAAB5; }

    /* CTA button */
    .ob-cta {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: #FF7A8A; color: #fff; border: none; border-radius: 16px;
      padding: 17px 32px; font-size: 16px; font-weight: 800;
      cursor: pointer; width: 100%; max-width: 340px;
      font-family: 'Sora', sans-serif;
      box-shadow: 0 8px 24px rgba(255,122,138,0.35);
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.15s;
      letter-spacing: 0.2px;
    }
    .ob-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,122,138,0.45); }
    .ob-cta:active { transform: translateY(0); opacity: 0.88; }

    /* Skip */
    .ob-skip {
      position: absolute; top: 28px; right: 36px;
      background: none; border: 1px solid #E5E7EB; border-radius: 20px;
      padding: 7px 18px; font-size: 13px; font-weight: 600; color: #9CA3AF;
      cursor: pointer; font-family: 'Sora', sans-serif;
      transition: border-color 0.15s, color 0.15s;
    }
    .ob-skip:hover { border-color: #FF7A8A; color: #FF7A8A; }

    /* Sign-in link */
    .ob-signin { margin-top: 20px; font-size: 14px; color: #9CA3AF; text-align: center; max-width: 340px; }
    .ob-signin span { color: #FF7A8A; font-weight: 700; cursor: pointer; }
    .ob-signin span:hover { text-decoration: underline; }

    /* Illustration container */
    .ob-illus {
      position: relative; z-index: 2;
      display: flex; flex-direction: column; align-items: center; gap: 20px;
    }
    .ob-illus-emoji {
      width: 200px; height: 200px; border-radius: 48px;
      display: flex; align-items: center; justify-content: center;
      font-size: 88px;
      box-shadow: 0 24px 64px rgba(255,122,138,0.22);
      transition: background 0.5s ease;
    }
    .ob-feature-pills {
      display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px;
    }
    .ob-feature-pill {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255,255,255,0.9); border: 1px solid #FFE4E8;
      border-radius: 14px; padding: 12px 16px;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(255,122,138,0.08);
      font-size: 13px; font-weight: 600; color: #374151;
      animation: slide-in 0.5s ease both;
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(-16px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .ob-feature-pill .pill-icon { font-size: 20px; }

    /* Responsive */
    @media (max-width: 768px) {
      .ob-left { display: none; }
      .ob-right { width: 100%; padding: 48px 28px; }
    }
  `;

  const FEATURES = [
    [
      { icon: <span style={{ fontFamily: undefined }}>🛍️</span>, text: 'Mood-curated products' },
      { icon: <span style={{ fontFamily: undefined }}>⚡</span>, text: 'Instant recommendations' },
      { icon: <span style={{ fontFamily: undefined }}>🔒</span>, text: 'Secure & private shopping' },
    ],
    [
      { icon: <span style={{ fontFamily: undefined }}>📷</span>, text: 'Face scan in seconds' },
      { icon: <span style={{ fontFamily: undefined }}>🧠</span>, text: 'On-device AI — no data sent' },
      { icon: <span style={{ fontFamily: undefined }}>🎯</span>, text: '8 mood categories' },
    ],
    [
      { icon: <span style={{ fontFamily: undefined }}>✨</span>, text: 'Hyper-personalised picks' },
      { icon: <span style={{ fontFamily: undefined }}>🔄</span>, text: 'Syncs across all devices' },
      { icon: <span style={{ fontFamily: undefined }}>❤️</span>, text: 'Save your favourites' },
    ],
  ];

  const tintBg = [
    'linear-gradient(145deg, #FFF0F2 0%, #FFE4E8 100%)',
    'linear-gradient(145deg, #FFF5F6 0%, #FFE8EC 100%)',
    'linear-gradient(145deg, #FFF2F4 0%, #FFE0E5 100%)',
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ob-root">

        {/* ── LEFT PANEL ── */}
        <div className="ob-left" style={{ background: tintBg[current] }}>
          <div className="ob-illus">
            <div className="ob-illus-emoji" style={{ background: slides[current].bgTop }}>
              <span style={{ fontFamily: undefined }}>{slide.webEmoji}</span>
            </div>
            <div className="ob-feature-pills">
              {FEATURES[current].map((f, i) => (
                <div key={i} className="ob-feature-pill" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="pill-icon">{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          {/* decorative blobs */}
          <div className="ob-blob" style={{ width: 300, height: 300, background: 'rgba(255,122,138,0.12)', top: -80, right: -60 }} />
          <div className="ob-blob" style={{ width: 200, height: 200, background: 'rgba(255,180,190,0.15)', bottom: 40, left: -40 }} />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="ob-right">
          <button className="ob-skip" onClick={() => router.replace('/login')}>Skip</button>

          <div className="ob-pill">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF7A8A', display: 'inline-block' }} /> {slide.label}
          </div>

          <h1 className="ob-title">
            {current === 0 ? <>Welcome to<br /><em>MoodMarket</em></> :
             current === 1 ? <>Read Your<br />Mood <em>Instantly</em></> :
                            <>Shop What<br /><em>Feels Right</em></>}
          </h1>

          <p className="ob-desc">{slide.description}</p>

          {/* dots */}
          <div className="ob-dots">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`ob-dot${current === i ? ' active' : ''}`}
                onClick={() => i < current && setCurrent(i)}
              />
            ))}
          </div>

          <button className="ob-cta" onClick={goNext}>
            {current === slides.length - 1 ? 'Get Started →' : 'Continue →'}
          </button>

          {current === slides.length - 1 && (
            <p className="ob-signin">
              Already have an account?{' '}
              <span onClick={() => router.replace('/login')}>Sign in</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE ONBOARDING  (your original code, unchanged)
───────────────────────────────────────────────────────────────────────── */

function OnboardingScreenMobile() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({ x: width * (currentSlide + 1), animated: true });
    } else {
      router.replace('/login');
    }
  };

  const skip = () => router.replace('/login');
  const slide = slides[currentSlide];

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        ref={scrollViewRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFillObject}
      >
        {slides.map((sl) => {
          const Illustration = sl.illustration;
          return (
            <View key={sl.id} style={[s.slide, { backgroundColor: sl.bgTop }]}>
              <View style={s.labelRow}>
                <View style={s.labelPill}>
                  <Text style={s.labelText}>{sl.label}</Text>
                </View>
                <TouchableOpacity onPress={skip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={s.skipTopText}>Skip</Text>
                </TouchableOpacity>
              </View>
              <View style={s.illustrationWrapper}>
                <Illustration />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[s.bottomPanel, { backgroundColor: slide.bgBottom }]}>
        <View style={s.accentBar} />
        <Text style={s.slideTitle}>{slides[currentSlide].title}</Text>
        <Text style={s.slideDescription}>{slides[currentSlide].description}</Text>
        <View style={s.pagination}>
          {slides.map((_, i) => (
            <View key={i} style={[s.dot, currentSlide === i ? s.dotActive : s.dotInactive]} />
          ))}
        </View>
        <TouchableOpacity onPress={goToNextSlide} style={s.nextButton} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.nextText}>
              {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <ArrowRight size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        {currentSlide === slides.length - 1 && (
          <TouchableOpacity onPress={skip} style={s.signinLink}>
            <Text style={s.signinText}>
              Already have an account?{' '}
              <Text style={s.signinBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DEFAULT EXPORT — platform switch
───────────────────────────────────────────────────────────────────────── */

export default function OnboardingScreen() {
  if (Platform.OS === 'web') return <OnboardingScreenWeb />;
  return <OnboardingScreenMobile />;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE STYLES
───────────────────────────────────────────────────────────────────────── */

const BOTTOM_PANEL_HEIGHT = height * 0.42;

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#FFF9F9' },
  slide:        { width, height, paddingTop: 60, alignItems: 'center' },
  labelRow:     { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, marginBottom: 12 },
  labelPill:    { borderWidth: 1, borderColor: '#FF7A8A55', backgroundColor: '#FF7A8A12', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  labelText:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#FF7A8A' },
  skipTopText:  { fontSize: 14, color: '#8A8A8A', fontWeight: '600' },
  illustrationWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: BOTTOM_PANEL_HEIGHT - 24 },
  bottomPanel:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: BOTTOM_PANEL_HEIGHT, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 36, shadowColor: '#FF7A8A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10 },
  accentBar:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#FF7A8A', marginBottom: 20 },
  slideTitle:   { fontSize: 30, fontWeight: '800', color: '#2B2B2B', lineHeight: 38, letterSpacing: -0.5, marginBottom: 10 },
  slideDescription: { fontSize: 15, color: '#8A8A8A', lineHeight: 23, marginBottom: 22 },
  pagination:   { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 6 },
  dot:          { height: 6, borderRadius: 3 },
  dotActive:    { width: 28, backgroundColor: '#FF7A8A' },
  dotInactive:  { width: 8, backgroundColor: '#F2E6E8' },
  nextButton:   { backgroundColor: '#FF7A8A', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16, shadowColor: '#FF7A8A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  nextText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  signinLink:   { alignItems: 'center' },
  signinText:   { fontSize: 14, color: '#8A8A8A' },
  signinBold:   { color: '#FF7A8A', fontWeight: '700' },
});