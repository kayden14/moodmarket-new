import { Profile as BaseProfile } from './database';

export interface AdminProfile extends BaseProfile {
  role: string;
  is_admin: boolean;
  is_suspended: boolean;
  store_name?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  mood_tags: string[];
  rating: number;
  vendor_id?: string | null;
  vendor_name?: string | null;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  total_price: number;
  status: string;
  created_at: string;
  shipping_address?: string | null;   // mapped from delivery_address
  delivery_phone?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  products: AdminOrderProduct[];
  profiles?: { name: string; email: string } | null;
}

export interface AdminOrderProduct {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}