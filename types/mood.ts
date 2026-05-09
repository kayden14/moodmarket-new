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

export type MoodDetectionResult = {
  mood: MoodKey;
  emoji: string;
  confidence: number;
};
