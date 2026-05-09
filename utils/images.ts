import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';

export function getProductImage(product: Product): string {
  if (!product.image) {
    // fallback if no image
    const seed = product.name
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
    return `https://picsum.photos/seed/${seed}/400/400`;
  }

  if (product.image.startsWith('http')) return product.image;

  // Supabase storage
  const { data } = supabase.storage
    .from('products') // bucket name
    .getPublicUrl(product.image);

  return data.publicUrl || '';
}