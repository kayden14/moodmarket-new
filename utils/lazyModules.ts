import { Platform } from 'react-native';

/**
 * utils/lazyModules.ts
 *
 * Caches and provides access to native-only modules like expo-camera and expo-notifications.
 * This avoids repeated dynamic require() calls inside components, which can cause
 * UI lag on Android.
 */

let cachedCamera: typeof import('expo-camera') | null = null;
let cachedNotifications: typeof import('expo-notifications') | null = null;

export const getLazyCamera = () => {
  if (Platform.OS === 'web') return null;
  if (cachedCamera) return cachedCamera;
  
  try {
    cachedCamera = require('expo-camera');
    return cachedCamera;
  } catch (err) {
    console.warn('[lazyModules] expo-camera not available');
    return null;
  }
};

export const getLazyNotifications = () => {
  if (Platform.OS === 'web') return null;
  if (cachedNotifications) return cachedNotifications;
  
  try {
    cachedNotifications = require('expo-notifications');
    return cachedNotifications;
  } catch (err) {
    console.warn('[lazyModules] expo-notifications not available');
    return null;
  }
};
