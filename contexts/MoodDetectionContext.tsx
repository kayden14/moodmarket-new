import React, { createContext, useContext, useCallback } from 'react';
import { useMoodDetection } from '@/hooks/useMoodDetection';
import { useTheme, MoodKey } from './ThemeContext';
import { useAuth } from './AuthContext';
import { MOODS } from '@/constants/moods';
import { NotificationService } from '@/services/notifications';
import { notifyUser } from '@/services/notifyUser';

interface MoodDetectionContextType {
  detecting: boolean;
  permissionDenied: boolean;
  hasPermission: boolean | null;
  rescan: () => void;
  cameraRef: any;
  onCameraReady: () => void;
}

const MoodDetectionContext = createContext<MoodDetectionContextType | undefined>(undefined);

export const MoodDetectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setMood } = useTheme();
  const { profile } = useAuth();

  const handleMoodDetected = useCallback((detectedMood: MoodKey) => {
    setMood(detectedMood);
    const meta = MOODS.find(m => m.key === detectedMood);
    if (profile?.id && meta) {
      NotificationService.moodSelected(profile.id, meta.label, meta.emoji);
      notifyUser.moodDetected(profile.id, meta.label, meta.emoji);
    }
  }, [setMood, profile?.id]);

  const detection = useMoodDetection({ onMoodDetected: handleMoodDetected });

  return (
    <MoodDetectionContext.Provider value={detection}>
      {children}
    </MoodDetectionContext.Provider>
  );
};

export const useMoodDetectionContext = () => {
  const context = useContext(MoodDetectionContext);
  if (context === undefined) {
    throw new Error('useMoodDetectionContext must be used within a MoodDetectionProvider');
  }
  return context;
};
