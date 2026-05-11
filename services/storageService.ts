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

  if (Platform.OS === 'web' && isBase64Web && base64Data) {
    // Web: base64 string
    const base64 = base64Data.split(',')[1];
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } else if (Platform.OS !== 'web') {
    // Mobile: local file URI
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } else if (Platform.OS === 'web' && uri.startsWith('data:')) {
     // Web: data URI from picker
     const base64 = uri.split(',')[1];
     const { error } = await supabase.storage
       .from('product-images')
       .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });
     if (error) throw error;
  } else {
    throw new Error('Unsupported upload method for platform');
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}
