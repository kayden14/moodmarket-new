// contexts/ThemeContext.tsx
//
// Provides two things:
//  1. Light / Dark mode toggle (persisted to AsyncStorage)
//  2. Mood-based accent colour palette (changes when mood is selected)
//
// Usage:
//   const { isDark, toggleDark, moodTheme, setMood, theme } = useTheme();
//   theme.background  → '#FFFFFF' or '#111111' depending on mode + mood

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodKey, MoodPalette, MOOD_PALETTES, MOOD_META } from '@/constants/moods';
import { BaseTheme, AppTheme } from '@/types/theme';

// Re-export types for backward compatibility
export type { MoodKey, MoodPalette } from '@/constants/moods';
export { MOOD_PALETTES } from '@/constants/moods';
export type { BaseTheme, AppTheme } from '@/types/theme';

// ─── Base theme (light / dark) ────────────────────────────────────────────────

const LIGHT: BaseTheme = {
  background:    '#F7F7F7',
  card:          '#FFFFFF',
  border:        '#EBEBEB',
  textPrimary:   '#111111',
  textSecondary: '#666666',
  inactive:      '#AAAAAA',
};

const DARK: BaseTheme = {
  background:    '#0F0F0F',
  card:          '#1A1A1A',
  border:        '#2A2A2A',
  textPrimary:   '#FFFFFF',
  textSecondary: '#AAAAAA',
  inactive:      '#555555',
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  isDark:     boolean;
  toggleDark: () => void;
  mood:       MoodKey;
  setMood:    (mood: MoodKey) => void;
  moodPalette: MoodPalette;
  theme:      AppTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY_DARK = '@moodmarket_dark_mode';
const STORAGE_KEY_MOOD = '@moodmarket_mood';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mood, setMoodState] = useState<MoodKey>('neutral');

  // Load persisted preferences on mount
  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY_DARK, STORAGE_KEY_MOOD]).then((pairs) => {
      const darkVal = pairs[0][1];
      const moodVal = pairs[1][1];
      if (darkVal !== null) setIsDark(darkVal === 'true');
      if (moodVal !== null && moodVal in MOOD_PALETTES) {
        setMoodState(moodVal as MoodKey);
      }
    });
  }, []);

  const moodMeta = MOOD_META[mood];
  const dynamicBackground = isDark ? moodMeta.darkBg : moodMeta.lightBg;

  // Web background color fix
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = dynamicBackground;
      document.body.style.transition = 'background-color 0.8s ease-out';
    }
  }, [dynamicBackground]);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY_DARK, String(next));
      return next;
    });
  }, []);

  const setMood = useCallback((newMood: MoodKey) => {
    setMoodState(newMood);
    AsyncStorage.setItem(STORAGE_KEY_MOOD, newMood);
  }, []);

  const base = isDark ? DARK : LIGHT;
  const moodPalette = MOOD_PALETTES[mood];
  
  const theme: AppTheme = {
    ...base,
    background: dynamicBackground, // Overwrite base background with mood-tinted one
    primary:   moodPalette.primary,
    secondary: moodPalette.secondary,
    tint:      moodPalette.tint,
    fontHeading: moodPalette.fontHeading,
    fontBody:    moodPalette.fontBody,
    isDark,
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, mood, setMood, moodPalette, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
