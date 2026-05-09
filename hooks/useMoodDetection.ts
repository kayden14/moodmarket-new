// hooks/useMoodDetection.ts
//
// React hook for passive mood detection using the front camera.
//
// Usage:
//   const { detecting, permissionDenied, rescan, cameraRef } = useMoodDetection({
//     onMoodDetected: (mood) => console.log(mood),
//   });

import { useState, useEffect, useRef, useCallback } from 'react';
import { MoodKey } from '@/types/mood';
import { detectMoodFromImage } from '@/services/moodDetection';

// ─── Capture delay before taking the silent photo ─────────────────────────────
const NATIVE_CAPTURE_DELAY = 2500;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

type UseMoodDetectionOptions = {
  onMoodDetected: (mood: MoodKey) => void;
};

type UseMoodDetectionReturn = {
  detecting: boolean;
  permissionDenied: boolean;
  rescan: () => void;
  cameraRef: React.MutableRefObject<any>;
};

export function useMoodDetection({
  onMoodDetected,
}: UseMoodDetectionOptions): UseMoodDetectionReturn {
  const [detecting, setDetecting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const hasDetected = useRef(false);
  const isDetecting = useRef(false);
  const cameraRef = useRef<any>(null);

  const detect = useCallback(async () => {
    if (isDetecting.current) return;
    isDetecting.current = true;
    setDetecting(true);

    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        console.warn('[useMoodDetection] Camera permission denied');
        setPermissionDenied(true);
        return;
      }

      await sleep(NATIVE_CAPTURE_DELAY);

      if (!cameraRef.current) {
        console.warn('[useMoodDetection] Camera ref not ready after delay');
        return;
      }

      console.log('[useMoodDetection] Taking silent picture…');

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        exif: false,
        skipProcessing: false,
      });

      if (!photo?.base64 || photo.base64.length < 100) {
        console.warn('[useMoodDetection] Photo capture returned empty data');
        return;
      }

      console.log('[useMoodDetection] Photo captured, sending to Gemini…');

      const result = await detectMoodFromImage(photo.base64, photo.uri);

      console.log(
        `[useMoodDetection] Detected: ${result.mood} (${Math.round(result.confidence * 100)}%)`
      );

      onMoodDetected(result.mood);
      hasDetected.current = true;
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('permission') || msg.includes('denied')) {
        setPermissionDenied(true);
      }
      console.warn('[useMoodDetection] Detection failed:', msg);
    } finally {
      setDetecting(false);
      isDetecting.current = false;
    }
  }, [onMoodDetected]);

  useEffect(() => {
    if (hasDetected.current) return;
    detect();
  }, [detect]);

  return { detecting, permissionDenied, rescan: detect, cameraRef };
}
