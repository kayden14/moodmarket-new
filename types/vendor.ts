export interface VendorStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  lowStockCount: number;
  unreadNotifications: number;
}

export interface VendorProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  mood_tags: string[];
  rating: number;
  stock_count: number;
  is_active: boolean;
  category: string | null;
  vendor_id: string;
  created_at: string;
}

export interface VendorOrder {
  id: string;
  user_id: string;
  vendor_id: string;
  products: { name: string; price: number; quantity: number; image?: string }[];
  total_price: number;
  status: string;
  delivery_name: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorPayout {
  id: string;
  vendor_id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paystack_recipient_code: string | null;
  paystack_transfer_code: string | null;
  paystack_reference: string | null;
  payment_method: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_code: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorNotification {
  id: string;
  vendor_id: string;
  title: string;
  body: string;
  type: 'info' | 'order' | 'payout' | 'warning' | 'approval';
  is_read: boolean;
  meta: Record<string, any>;
  created_at: string;
}

export interface VendorApplication {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}
