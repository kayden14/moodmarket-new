export type Profile = {
  id: string;
  name: string;
  email: string;
  social_id?: string;
  mood_history: Array<{ date: string; mood: string }>;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  mood_tags: string[];
  rating: number;
  created_at: string;
  vendor_id?: string | null;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
};

export type Order = {
  id: string;
  user_id: string;
  products: Array<{ productId: string; quantity: number; name: string; price: number }>;
  total_price: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
};

export type Mood = {
  id: string;
  mood_name: string;
  emoji: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  product_id?: string;
};
