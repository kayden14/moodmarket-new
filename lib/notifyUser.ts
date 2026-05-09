// lib/notifyUser.ts
//
// Inserts a real notification into the Supabase notifications table.
// This triggers the realtime listener in notifications.tsx instantly.
//
// Usage:
//   import { notifyUser } from '@/lib/notifyUser';
//   await notifyUser.addedToCart(userId, productName);
//   await notifyUser.likedProduct(userId, productName);
//   await notifyUser.orderPlaced(userId, total, itemCount);

import { supabase } from './supabase';

async function insert(
  userId: string,
  type: 'mood' | 'order' | 'deal' | 'system',
  title: string,
  body: string,
  screen?: string
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    screen: screen ?? null,
    read: false,
  });

  if (error) {
    console.warn('[notifyUser] Failed to insert notification:', error.message);
  }
}

export const notifyUser = {
  // Called when user taps the cart button on a product card or product page
  addedToCart: (userId: string, productName: string) =>
    insert(
      userId,
      'order',
      '🛒 Added to Cart',
      `"${productName}" has been added to your cart.`,
      '/(tabs)/cart'
    ),

  // Called when user taps the heart/wishlist button
  likedProduct: (userId: string, productName: string) =>
    insert(
      userId,
      'deal',
      '❤️ Added to Wishlist',
      `"${productName}" was saved to your wishlist.`,
      '/(tabs)'
    ),

  // Called after a successful checkout/payment
  orderPlaced: (userId: string, total: number, itemCount: number) =>
    insert(
      userId,
      'order',
      '🎉 Order Placed!',
      `Your order of ${itemCount} ${itemCount === 1 ? 'item' : 'items'} totalling GH₵ ${total.toFixed(2)} has been placed.`,
      '/(tabs)/profile'
    ),

  // Called after order status changes to shipped
  orderShipped: (userId: string) =>
    insert(
      userId,
      'order',
      '📦 Order Shipped!',
      'Your MoodMarket order is on its way to you.',
      '/(tabs)/profile'
    ),

  // Called after mood is detected from camera
  moodDetected: (userId: string, mood: string, emoji: string) =>
    insert(
      userId,
      'mood',
      `${emoji} Mood Detected`,
      `Your ${mood} mood was detected! Check out these personalised recommendations.`,
      '/(tabs)'
    ),
};