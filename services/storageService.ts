import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

/**
 * Uploads an image to Supabase Storage.
 * Works on both Web (base64) and Mobile (file URI).
 */
export async function uploadImage(uri: string, isBase64Web?: boolean, base64Data?: string): Promise<string> {
  const fileName = `product_${Date.now()}.jpg`;
  const filePath = `products/${fileName}`;

  let base64 = '';

  if (base64Data) {
    // If base64 is provided directly (e.g., from ImagePicker with base64: true)
    base64 = base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data;
  } else if (Platform.OS === 'web' && uri.startsWith('data:')) {
    // Web: data URI from picker
    base64 = uri.split(',')[1];
  } else if (Platform.OS !== 'web') {
    // Mobile fallback: local file URI
    base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  } else {
    throw new Error('Unsupported upload method for platform');
  }

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}
