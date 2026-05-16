// utils/webCapture.ts
//
// Web-only camera capture using the browser's getUserMedia API.
// Used by useMoodDetection when Platform.OS === 'web' since
// expo-camera's CameraView ref does not support takePictureAsync on web.

export async function captureFromWebCamera(): Promise<string | null> {
  try {
    console.log('[webCapture] Requesting camera stream...');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API not available (check if using HTTPS)');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    // Wait for video metadata to load with a timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (video.readyState >= 1) {
          console.log('[webCapture] Metadata timeout but readyState >= 1, proceeding');
          resolve();
        } else {
          reject(new Error('Camera metadata timeout'));
        }
      }, 5000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      // If already loaded
      if (video.readyState >= 1) {
        clearTimeout(timeout);
        resolve();
      }
    });

    await video.play();

    // Let the camera settle (auto-exposure, etc.)
    await new Promise((res) => setTimeout(res, 800));

    const canvas = document.createElement('canvas');
    
    // Resize to reasonable dimensions for AI (max 640px)
    const MAX_DIM = 640;
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    if (width > MAX_DIM) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.drawImage(video, 0, 0, width, height);

    // Release the camera
    stream.getTracks().forEach((t) => t.stop());

    // Return raw base64 (strip the data:image/jpeg;base64, prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    return dataUrl.split(',')[1];
  } catch (err: any) {
    console.error('[webCapture] ❌ Failed to capture from web camera:', err.message);
    return null;
  }
}