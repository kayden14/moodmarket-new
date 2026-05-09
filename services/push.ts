// services/push.ts
//
// Call these from anywhere in your app to send real-time push
// notifications to any user via the Supabase Edge Function.
//
// Usage:
//   import { Push } from '@/services/push';
//   await Push.orderShipped(userId, orderId);

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

async function sendPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: userId, title, body, data }),
      }
    );
    return await res.json();
  } catch (err) {
    console.error('[Push] Failed to send notification:', err);
  }
}

export const Push = {
  // Call after mood scan to tell user about new matching products
  moodProducts: (userId: string, mood: string) =>
    sendPush(
      userId,
      '✨ New mood matches!',
      `New products match your ${mood} mood today. Check them out!`,
      { screen: '/(tabs)' }
    ),

  // Call after order status changes to 'shipped'
  orderShipped: (userId: string, orderId: string) =>
    sendPush(
      userId,
      '📦 Your order is on its way!',
      'Your MoodMarket order has been shipped and is heading to you.',
      { screen: '/(tabs)/profile', orderId }
    ),

  // Call after order status changes to 'delivered'
  orderDelivered: (userId: string) =>
    sendPush(
      userId,
      '🎉 Order delivered!',
      'Your order has arrived. Enjoy your mood-matched products!',
      { screen: '/(tabs)/profile' }
    ),

  // Call when a wishlisted product goes on sale
  wishlistSale: (userId: string, productName: string, productId: string) =>
    sendPush(
      userId,
      '🏷️ Wishlist item on sale!',
      `"${productName}" from your wishlist is now discounted!`,
      { screen: `/product/${productId}` }
    ),

  // Call after a new user signs up
  welcome: (userId: string, name: string) =>
    sendPush(
      userId,
      `Welcome to MoodMarket, ${name}! 🛍️`,
      'Scan your mood and get personalised product recommendations just for you.',
      { screen: '/camera' }
    ),

  // Generic — use for any custom notification
  custom: (userId: string, title: string, body: string, screen?: string) =>
    sendPush(userId, title, body, screen ? { screen } : {}),
};
