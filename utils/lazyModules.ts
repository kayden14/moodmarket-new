import { Platform } from 'react-native';
import * as Camera from 'expo-camera';
import * as Notifications from 'expo-notifications';

/**
 * utils/lazyModules.ts
 *
 * Provides access to native modules like expo-camera and expo-notifications.
 * Now using direct imports to avoid dynamic require lag.
 */

export const getLazyCamera = () => {
  if (Platform.OS === 'web') return null;
  return Camera;
};

export const getLazyNotifications = () => {
  if (Platform.OS === 'web') return null;
  return Notifications;
};
