// utils/webCapture.ts
//
// Web-only camera capture using the browser's getUserMedia API.
// Used by useMoodDetection when Platform.OS === 'web' since
// expo-camera's CameraView ref does not support takePictureAsync on web.
//
// FIX: The video element MUST be attached to the DOM before calling play().
// An off-DOM <video> in Chromium-based browsers never decodes frames —
// videoWidth / videoHeight stay 0 and drawImage() produces a blank black canvas.
// Gemini then reads the blank frame as "neutral". We mount it off-screen (invisible),
// capture, then immediately remove it.

export async function captureFromWebCamera(): Promise<string | null> {
  let video: HTMLVideoElement | null = null;
  let stream: MediaStream | null = null;

  try {
    console.log('[webCapture] Requesting camera stream...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API not available (check if using HTTPS or localhost)');
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('data-webcapture', 'true');

    // ── CRITICAL: attach to the DOM ───────────────────────────────────────────
    // Chromium will not decode any frames for a detached <video> element.
    // Without this, videoWidth/videoHeight remain 0 → blank canvas → Gemini
    // sees a blank face and returns "neutral" every time.
    Object.assign(video.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: '640px',
      height: '480px',
      opacity: '1',
      pointerEvents: 'none',
      zIndex: '-1000',
    });
    document.body.appendChild(video);

    // Wait for `canplay` — guarantees at least one decoded frame is available.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (video && video.readyState >= 3) {
          console.log('[webCapture] canplay timeout — readyState >= HAVE_FUTURE_DATA, proceeding');
          resolve();
        } else {
          reject(new Error('Camera stream not ready within 8 s'));
        }
      }, 8000);

      if (video && video.readyState >= 3) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      if (video) {
        video.oncanplay = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error(`Video error: ${String(e)}`));
        };
      }
    });

    await video.play();

    // Allow auto-exposure / white-balance to settle (≈ 1 frame @ 30fps ≈ 33ms,
    // but cameras need ~500–900ms to converge brightness).
    await new Promise((res) => setTimeout(res, 900));

    // Extra guard: if dimensions are still zero, the camera is likely blocked
    // by another tab or the browser denied access silently.
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('[webCapture] videoWidth=0 after settle — waiting extra 600ms');
      await new Promise((res) => setTimeout(res, 600));
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error(
        'Camera stream has no video dimensions — the camera may be in use by another tab, ' +
        'or browser permissions were denied after granting.'
      );
    }

    // Resize to ≤ 640px wide for AI efficiency
    const MAX_DIM = 640;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > MAX_DIM) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    ctx.drawImage(video, 0, 0, width, height);

    console.log(`[webCapture] Frame captured: ${width}×${height}`);

    // Stop camera tracks and detach the video element
    stream.getTracks().forEach((t) => t.stop());
    document.body.removeChild(video);
    video = null;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const base64 = dataUrl.split(',')[1] ?? '';

    if (base64.length < 500) {
      throw new Error(`Captured image is suspiciously small (${base64.length} chars) — likely a blank frame`);
    }

    console.log(`[webCapture] ✅ ${base64.length} base64 chars captured`);
    return base64;

  } catch (err: any) {
    console.error('[webCapture] ❌ Capture failed:', err.message);

    // Clean up stream and DOM element on any error path
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (video && video.parentNode) video.parentNode.removeChild(video);

    // Also sweep any leaked elements from previous failed attempts
    document.querySelectorAll('video[data-webcapture]').forEach((el) => el.remove());

    return null;
  }
}