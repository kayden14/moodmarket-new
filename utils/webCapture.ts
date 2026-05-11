// utils/webCapture.ts
//
// Web-only camera capture using the browser's getUserMedia API.
// Used by useMoodDetection when Platform.OS === 'web' since
// expo-camera's CameraView ref does not support takePictureAsync on web.

export async function captureFromWebCamera(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    // Wait for video metadata to load
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    await video.play();

    // Let the camera settle (auto-exposure, etc.)
    await new Promise((res) => setTimeout(res, 1200));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    // Release the camera
    stream.getTracks().forEach((t) => t.stop());

    // Return raw base64 (strip the data:image/jpeg;base64, prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return dataUrl.split(',')[1];
  } catch (err: any) {
    console.error('[webCapture] Failed to capture from web camera:', err.message);
    return null;
  }
}