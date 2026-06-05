// services/moodShiftDetector.ts
//
// Detects emotionally significant mood changes within the same day.
// Used to prompt users to re-scan when their mood has shifted noticeably
// (e.g. happy in the morning → sad in the afternoon).

export type MoodShiftResult = {
  hasShifted: boolean;
  previousMood: string;
  previousEmoji: string;
  /** Formatted time string of the previous mood entry, e.g. "09:30 AM" */
  previousTime: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
};

// Pairs where a change in either direction is considered a major shift
const SHIFT_PAIRS: [string, string][] = [
  ['happy',   'sad'],
  ['happy',   'angry'],
  ['happy',   'anxious'],
  ['happy',   'tired'],
  ['excited', 'sad'],
  ['excited', 'angry'],
  ['excited', 'tired'],
  ['excited', 'anxious'],
  ['calm',    'angry'],
  ['calm',    'anxious'],
  ['calm',    'excited'],
  ['neutral', 'sad'],
  ['neutral', 'angry'],
  ['neutral', 'anxious'],
];

export function isMajorMoodShift(moodA: string, moodB: string): boolean {
  const a = (moodA ?? '').toLowerCase().trim();
  const b = (moodB ?? '').toLowerCase().trim();
  if (!a || !b || a === b) return false;
  return SHIFT_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function getTimeOfDay(h: number): MoodShiftResult['timeOfDay'] {
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/**
 * Checks whether the newly detected mood is a major shift from any
 * mood the user already logged today.
 *
 * @param moodHistory  Array of `{ date, mood, emoji }` entries from the user profile.
 * @param newMood      The just-detected mood key (e.g. "sad").
 * @returns MoodShiftResult if a significant shift is found, otherwise null.
 */
export function detectMoodShift(
  moodHistory: Array<{ date: string; mood: string; emoji?: string }>,
  newMood: string
): MoodShiftResult | null {
  if (!Array.isArray(moodHistory) || moodHistory.length === 0) return null;

  const now     = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Most recent entry logged today (excluding the current detection)
  const todaysEntry = [...moodHistory]
    .filter(e => {
      try { return new Date(e.date).toISOString().split('T')[0] === todayStr; }
      catch { return false; }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!todaysEntry) return null;

  const prevMood = (todaysEntry.mood ?? '').toLowerCase().trim();
  const currMood = (newMood ?? '').toLowerCase().trim();

  if (!isMajorMoodShift(prevMood, currMood)) return null;

  const entryDate = new Date(todaysEntry.date);

  return {
    hasShifted:    true,
    previousMood:  todaysEntry.mood,
    previousEmoji: todaysEntry.emoji ?? '😐',
    previousTime:  entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timeOfDay:     getTimeOfDay(entryDate.getHours()),
  };
}
