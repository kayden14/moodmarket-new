/**
 * constants/moods.ts
 *
 * Central source of truth for mood metadata, emojis, labels, and theme palettes.
 */

export type MoodKey =
  | 'happy' | 'calm' | 'excited' | 'sad'
  | 'angry' | 'tired' | 'anxious' | 'neutral';

export interface MoodPalette {
  primary:    string;  // buttons, highlights
  secondary:  string;  // borders, chips
  tint:       string;  // card backgrounds
  label:      string;  // display name
  emoji:      string;
}

export const MOOD_PALETTES: Record<MoodKey, MoodPalette> = {
  happy: {
    primary:   '#F59E0B',
    secondary: '#FDE68A',
    tint:      '#FFFBEB',
    label:     'Happy',
    emoji:     '😊',
  },
  calm: {
    primary:   '#3B82F6',
    secondary: '#BFDBFE',
    tint:      '#EFF6FF',
    label:     'Calm',
    emoji:     '😌',
  },
  excited: {
    primary:   '#EF4444',
    secondary: '#FECACA',
    tint:      '#FFF1F1',
    label:     'Excited',
    emoji:     '🤩',
  },
  sad: {
    primary:   '#6366F1',
    secondary: '#C7D2FE',
    tint:      '#EEF2FF',
    label:     'Sad',
    emoji:     '😢',
  },
  angry: {
    primary:   '#DC2626',
    secondary: '#FCA5A5',
    tint:      '#FEF2F2',
    label:     'Angry',
    emoji:     '😠',
  },
  tired: {
    primary:   '#8B5CF6',
    secondary: '#DDD6FE',
    tint:      '#F5F3FF',
    label:     'Tired',
    emoji:     '😴',
  },
  anxious: {
    primary:   '#10B981',
    secondary: '#A7F3D0',
    tint:      '#ECFDF5',
    label:     'Anxious',
    emoji:     '😰',
  },
  neutral: {
    primary:   '#FF7A8A',
    secondary: '#FFD6DE',
    tint:      '#FFF0F2',
    label:     'Neutral',
    emoji:     '😐',
  },
};

export const MOODS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: 'happy',   emoji: '😊', label: 'Happy'   },
  { key: 'calm',    emoji: '😌', label: 'Calm'     },
  { key: 'excited', emoji: '🤩', label: 'Excited'  },
  { key: 'sad',     emoji: '😢', label: 'Sad'      },
  { key: 'angry',   emoji: '😠', label: 'Angry'    },
  { key: 'tired',   emoji: '😴', label: 'Tired'    },
  { key: 'anxious', emoji: '😰', label: 'Anxious'  },
  { key: 'neutral', emoji: '😐', label: 'Neutral'  },
];

export const MOOD_META: Record<
  string,
  { label: string; color: string; lightBg: string; darkBg: string; emoji: string }
> = {
  happy:       { label: 'Happy',       color: '#F59E0B', lightBg: '#FFFBEB', darkBg: '#2D2200', emoji: '😊' },
  calm:        { label: 'Calm',        color: '#3B82F6', lightBg: '#EFF6FF', darkBg: '#0D1F3C', emoji: '😌' },
  excited:     { label: 'Excited',     color: '#EF4444', lightBg: '#FFF1F1', darkBg: '#2D0D0D', emoji: '🤩' },
  sad:         { label: 'Sad',         color: '#6366F1', lightBg: '#EEF2FF', darkBg: '#1C1040', emoji: '😢' },
  angry:       { label: 'Angry',       color: '#DC2626', lightBg: '#FEF2F2', darkBg: '#2D0D0D', emoji: '😠' },
  tired:       { label: 'Tired',       color: '#8B5CF6', lightBg: '#F5F3FF', darkBg: '#1C1040', emoji: '😴' },
  anxious:     { label: 'Anxious',     color: '#10B981', lightBg: '#ECFDF5', darkBg: '#052830', emoji: '😰' },
  neutral:     { label: 'Neutral',     color: '#FF7A8A', lightBg: '#FFF0F2', darkBg: '#1A1C1E', emoji: '😐' },
  
  // Emoji keys
  '😊': { label: 'Happy',       color: '#F59E0B', lightBg: '#FFFBEB', darkBg: '#2D2200', emoji: '😊' },
  '😌': { label: 'Calm',        color: '#3B82F6', lightBg: '#EFF6FF', darkBg: '#0D1F3C', emoji: '😌' },
  '🤩': { label: 'Excited',     color: '#EF4444', lightBg: '#FFF1F1', darkBg: '#2D0D0D', emoji: '🤩' },
  '😢': { label: 'Sad',         color: '#6366F1', lightBg: '#EEF2FF', darkBg: '#1C1040', emoji: '😢' },
  '😠': { label: 'Angry',       color: '#DC2626', lightBg: '#FEF2F2', darkBg: '#2D0D0D', emoji: '😠' },
  '😴': { label: 'Tired',       color: '#8B5CF6', lightBg: '#F5F3FF', darkBg: '#1C1040', emoji: '😴' },
  '😰': { label: 'Anxious',     color: '#10B981', lightBg: '#ECFDF5', darkBg: '#052830', emoji: '😰' },
  '😐': { label: 'Neutral',     color: '#FF7A8A', lightBg: '#FFF0F2', darkBg: '#1A1C1E', emoji: '😐' },
};

export const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', calm: '😌', excited: '🤩', sad: '😢', angry: '😠', tired: '😴', anxious: '😰', neutral: '😐',
  Happy: '😊', Calm: '😌', Excited: '🤩', Sad: '😢', Angry: '😠', Tired: '😴', Anxious: '😰', Neutral: '😐',
  '😊': '😊', '😌': '😌', '🤩': '🤩', '😢': '😢', '😠': '😠', '😴': '😴', '😰': '😰', '😐': '😐',
};
