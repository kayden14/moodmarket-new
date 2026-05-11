// hooks/useMoodDetection.ts
//
// React hook for passive mood detection using the front camera.
//
// Usage:
//   const { detecting, permissionDenied, hasPermission, onCameraReady, rescan, cameraRef }
//     = useMoodDetection({ onMoodDetected: (mood) => console.log(mood) });
//
// IMPORTANT: You MUST:
//  1. Render a hidden <CameraView ref={cameraRef} facing="front" onCameraReady={onCameraReady} />
//     in your component as soon as hasPermission === true.
//  2. Pass onCameraReady to the CameraView — this is what triggers the actual capture.
//     Without it the hook waits forever and never takes a photo.
//
// Example:
//   {hasPermission === true && (
//     <CameraView
//       ref={cameraRef}
//       facing="front"
//       onCameraReady={onCameraReady}
//       style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
//     />
//   )}

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera } from 'expo-camera';
import { MoodKey } from '@/types/mood';
import { detectMoodFromImage } from '@/services/moodDetection';

// Small settling delay AFTER onCameraReady fires — gives auto-exposure time to settle
const SETTLE_DELAY_MS = 1200;

// If onCameraReady never fires within this many ms, fall back to neutral
const CAMERA_READY_TIMEOUT_MS = 12000;

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// ─── Public API ───────────────────────────────────────────────────────────────

type UseMoodDetectionOptions = {
  onMoodDetected: (mood: MoodKey) => void;
};

type UseMoodDetectionReturn = {
  /** True while the permission request, capture, or Gemini call is in-flight. */
  detecting: boolean;

  /** True if the user denied camera permission. Show a fallback UI when this is set. */
  permissionDenied: boolean;

  /**
   * Tri-state permission flag:
   *  null  = not yet asked
   *  true  = granted — render <CameraView ref={cameraRef} onCameraReady={onCameraReady} />
   *  false = denied  — show manual mood picker
   */
  hasPermission: boolean | null;

  /**
   * Pass this to <CameraView onCameraReady={onCameraReady} />.
   * This is what actually triggers the capture — the hook waits for this
   * signal instead of using a blind timer, so the camera is guaranteed
   * to be mounted and warmed up before takePictureAsync is called.
   */
  onCameraReady: () => void;

  /**
   * Re-run detection. Resets guard flags and fires a fresh capture
   * without unmounting/remounting the camera (avoids the onCameraReady
   * never-fires bug that breaks the Re-scan button).
   */
  rescan: () => void;

  /**
   * Attach this ref to your <CameraView />.
   */
  cameraRef: React.MutableRefObject<any>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMoodDetection({
  onMoodDetected,
}: UseMoodDetectionOptions): UseMoodDetectionReturn {
  const [detecting,        setDetecting]        = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasPermission,    setHasPermission]    = useState<boolean | null>(null);

  const cameraRef               = useRef<any>(null);
  const isCapturing             = useRef(false);   // prevents double-capture
  const hasDetected             = useRef(false);   // prevents re-running after success
  const cameraReadyRef          = useRef(false);   // tracks whether onCameraReady has fired
  const cameraReadyTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Capture + detect (called after camera is confirmed ready) ──────────────
  const capture = useCallback(async () => {
    if (isCapturing.current || hasDetected.current) return;
    isCapturing.current = true;
    setDetecting(true);

    try {
      // Small settle delay so auto-exposure stabilises after onCameraReady
      await sleep(SETTLE_DELAY_MS);

      if (!cameraRef.current) {
        console.warn(
          '[useMoodDetection] cameraRef.current is null after onCameraReady.\n' +
          'Ensure <CameraView ref={cameraRef} onCameraReady={onCameraReady} /> ' +
          'is rendered while hasPermission === true.'
        );
        if (!hasDetected.current) {
          hasDetected.current = true;
          onMoodDetected('neutral');
        }
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
        console.warn('[useMoodDetection] Photo capture returned empty or invalid data');
        if (!hasDetected.current) {
          hasDetected.current = true;
          onMoodDetected('neutral');
        }
        return;
      }

      console.log('[useMoodDetection] Sending to Gemini…');

      const result = await detectMoodFromImage(photo.base64, photo.uri);

      console.log(
        `[useMoodDetection] Detected: ${result.mood} (${Math.round(result.confidence * 100)}%)`
      );

      hasDetected.current = true;
      onMoodDetected(result.mood);

    } catch (err: any) {
      const msg: string = err?.message ?? '';
      console.error('[useMoodDetection] ❌ Capture/detect failed:', msg);

      if (!hasDetected.current) {
        hasDetected.current = true;
        onMoodDetected('neutral');
      }
    } finally {
      setDetecting(false);
      isCapturing.current = false;
    }
  }, [onMoodDetected]);

  // ── onCameraReady: fired by CameraView when hardware is ready ──────────────
  const onCameraReady = useCallback(() => {
    console.log('[useMoodDetection] Camera ready — starting capture');
    cameraReadyRef.current = true;
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (captureFallbackTimerRef.current) {
      clearTimeout(captureFallbackTimerRef.current);
      captureFallbackTimerRef.current = null;
    }
    capture();
  }, [capture]);

  // ── Request permission on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const requestPermission = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();

        if (cancelled) return;

        if (status !== 'granted') {
          console.warn('[useMoodDetection] Camera permission denied');
          setPermissionDenied(true);
          setHasPermission(false);
          return;
        }

        setHasPermission(true);

        // Safety net A: if onCameraReady never fires within 12 s, fall back to neutral.
        cameraReadyTimerRef.current = setTimeout(() => {
          if (!cameraReadyRef.current && !hasDetected.current) {
            console.warn('[useMoodDetection] ⚠️ onCameraReady timeout — falling back to neutral');
            hasDetected.current = true;
            onMoodDetected('neutral');
          }
        }, CAMERA_READY_TIMEOUT_MS);

        // Safety net B: attempt capture after 3 s if onCameraReady hasn't fired.
        captureFallbackTimerRef.current = setTimeout(() => {
          if (!cameraReadyRef.current && !hasDetected.current && !isCapturing.current) {
            console.log('[useMoodDetection] 🔄 onCameraReady not yet fired — attempting capture directly');
            capture();
          }
        }, 3000);

      } catch (err: any) {
        if (cancelled) return;
        console.error('[useMoodDetection] ❌ Permission request error:', err?.message);
        setPermissionDenied(true);
        setHasPermission(false);
      }
    };

    requestPermission();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── rescan: reset guard flags and re-capture without touching hasPermission ─
  //
  // FIX: The previous implementation set hasPermission → null → true, which caused
  // the <HiddenCamera> in index.tsx to unmount and remount. Because the camera was
  // only rendered while `detecting` was true (not while `hasPermission` was true),
  // the remounted CameraView's onCameraReady callback never fired, so the Re-scan
  // button appeared to do nothing.
  //
  // The fix: don't touch hasPermission at all. The camera is already mounted and
  // warmed up. Just reset the guard refs and call capture() directly.
  const rescan = useCallback(() => {
    // Clear any pending safety-net timers from the initial mount
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (captureFallbackTimerRef.current) {
      clearTimeout(captureFallbackTimerRef.current);
      captureFallbackTimerRef.current = null;
    }

    // Reset guards so capture() is allowed to run again
    hasDetected.current    = false;
    isCapturing.current    = false;
    // cameraReadyRef stays true — the camera is still mounted and ready

    console.log('[useMoodDetection] 🔄 Re-scan triggered — capturing again');
    capture();
  }, [capture]);

  return {
    detecting,
    permissionDenied,
    hasPermission,
    onCameraReady,
    rescan,
    cameraRef,
  };
}