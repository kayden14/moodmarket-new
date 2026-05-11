// services/vendorService.ts
// Centralised data-access layer for all vendor-related Supabase operations.

import { supabase } from '@/services/supabase';

/* ─── Types ────────────────────────────────────────────────────────────── */

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
  email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Stats ────────────────────────────────────────────────────────────── */

export async function getVendorStats(vendorId: string): Promise<VendorStats> {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  const [
    { count: totalProducts },
    { count: activeProducts },
    { data: orders },
    { data: monthOrders },
    { count: lowStock },
    { count: unread },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('total_price, status')
      .eq('vendor_id', vendorId),
    supabase
      .from('orders')
      .select('total_price')
      .eq('vendor_id', vendorId)
      .gte('created_at', monthStart),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .lt('stock_count', 5),
    supabase
      .from('vendor_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('is_read', false),
  ]);

  const totalRevenue =
    orders?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
  const monthRevenue =
    monthOrders?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
  const pendingOrders =
    orders?.filter((o) => o.status === 'pending').length ?? 0;

  return {
    totalProducts: totalProducts ?? 0,
    activeProducts: activeProducts ?? 0,
    totalOrders: orders?.length ?? 0,
    pendingOrders,
    totalRevenue,
    monthRevenue,
    lowStockCount: lowStock ?? 0,
    unreadNotifications: unread ?? 0,
  };
}

/* ─── Products ─────────────────────────────────────────────────────────── */

export async function getVendorProducts(
  vendorId: string,
): Promise<VendorProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertVendorProduct(
  vendorId: string,
  payload: Omit<VendorProduct, 'id' | 'vendor_id' | 'created_at'>,
  productId?: string,
): Promise<void> {
  if (productId) {
    const { error } = await supabase
      .from('products')
      .update({ ...payload, vendor_id: vendorId })
      .eq('id', productId)
      .eq('vendor_id', vendorId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('products')
      .insert({ ...payload, vendor_id: vendorId });
    if (error) throw error;
  }
}

export async function deleteVendorProduct(
  vendorId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('vendor_id', vendorId);
  if (error) throw error;
}

export async function toggleProductActive(
  vendorId: string,
  productId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
    .eq('vendor_id', vendorId);
  if (error) throw error;
}

export async function updateStockCount(
  vendorId: string,
  productId: string,
  delta: number,
): Promise<void> {
  // Use RPC or a direct update — direct update with guard
  const { data: product } = await supabase
    .from('products')
    .select('stock_count')
    .eq('id', productId)
    .single();
  const newCount = Math.max(0, (product?.stock_count ?? 0) + delta);
  const { error } = await supabase
    .from('products')
    .update({ stock_count: newCount })
    .eq('id', productId)
    .eq('vendor_id', vendorId);
  if (error) throw error;
}

/* ─── Orders ───────────────────────────────────────────────────────────── */

export async function getVendorOrders(
  vendorId: string,
  options?: { limit?: number; status?: string },
): Promise<VendorOrder[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;

  // Trigger customer email notification (non-blocking)
  if (['shipped', 'delivered', 'cancelled'].includes(status)) {
    void Promise.resolve(
      supabase
        .from('orders')
        .select('user_id, total_price, profiles!user_id(name, email)')
        .eq('id', orderId)
        .single()
    ).then(({ data }: any) => {
      if (!data) return;
      const email = data.profiles?.email;
      const name = data.profiles?.name;
      if (!email) return;
      supabase.functions
        .invoke('send-email-notification', {
          body: {
            type: 'order_status_update',
            to: email,
            payload: { orderId, status, name, total: data.total_price },
          },
        })
        .catch(console.error);
    }).catch(console.error);
  }
}

/* ─── Payouts ──────────────────────────────────────────────────────────── */

export async function getVendorPayouts(
  vendorId: string,
): Promise<VendorPayout[]> {
  const { data, error } = await supabase
    .from('vendor_payouts')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function requestPayout(payload: {
  vendorId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  paymentMethod: 'bank' | 'momo';
  accountName: string;
  accountNumber: string;
  bankCode?: string;
}): Promise<void> {
  const { error } = await supabase.from('vendor_payouts').insert({
    vendor_id: payload.vendorId,
    amount: payload.amount,
    currency: 'GHS',
    period_start: payload.periodStart,
    period_end: payload.periodEnd,
    payment_method: payload.paymentMethod,
    account_name: payload.accountName,
    account_number: payload.accountNumber,
    bank_code: payload.bankCode,
    status: 'pending',
  });
  if (error) throw error;
}

/* ─── Notifications ────────────────────────────────────────────────────── */

export async function getVendorNotifications(
  vendorId: string,
): Promise<VendorNotification[]> {
  const { data, error } = await supabase
    .from('vendor_notifications')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('vendor_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(
  vendorId: string,
): Promise<void> {
  const { error } = await supabase
    .from('vendor_notifications')
    .update({ is_read: true })
    .eq('vendor_id', vendorId)
    .eq('is_read', false);
  if (error) throw error;
}

/* ─── Applications ─────────────────────────────────────────────────────── */

export async function getMyApplication(
  userId: string,
): Promise<VendorApplication | null> {
  const { data } = await supabase
    .from('vendor_applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function applyToBeVendor(payload: {
  userId: string;
  storeName: string;
  storeDescription?: string;
  email?: string;
}): Promise<void> {
  const { error } = await supabase.from('vendor_applications').insert({
    user_id: payload.userId,
    store_name: payload.storeName,
    store_description: payload.storeDescription,
    email: payload.email,
  });
  if (error) throw error;
}

/* ─── Admin: Approve / Reject application ─────────────────────────────── */

export async function approveVendorApplication(
  application: VendorApplication & { user_email?: string },
): Promise<void> {
  // 1. Update the application status
  const { error: appError } = await supabase
    .from('vendor_applications')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', application.id);
  if (appError) throw appError;

  // 2. Promote the user to vendor role in profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'vendor' })
    .eq('id', application.user_id);
  if (profileError) throw profileError;

  // 3. Create entry in vendors table
  const { error: vendorError } = await supabase
    .from('vendors')
    .insert({
      user_id: application.user_id,
      store_name: application.store_name,
      store_description: application.store_description,
      contact_email: application.email || application.user_email,
      contact_phone: application.phone,
    });
  if (vendorError) throw vendorError;

  // 4. Send a notification to the vendor
  await supabase.from('vendor_notifications').insert({
    vendor_id: application.user_id,
    title: '🎉 Your store is approved!',
    body: `Welcome to MoodMarket, ${application.store_name}! You can now start adding products and selling.`,
    type: 'approval',
    meta: { application_id: application.id },
  });

  // 5. Trigger Edge Function to send email and reset password
  if (application.user_email) {
    const { error: funcError } = await supabase.functions.invoke(
      'vendor-approval',
      {
        body: {
          action: 'approve_vendor',
          vendorId: application.user_id,
          storeName: application.store_name,
          vendorEmail: application.user_email,
        },
      },
    );
    if (funcError) {
      console.error('Failed to trigger vendor approval email:', funcError);
    }
  }
}

export async function rejectVendorApplication(
  applicationId: string,
  adminNote?: string,
): Promise<void> {
  // 1. Fetch application + applicant details before updating
  const { data: app } = await supabase
    .from('vendor_applications')
    .select('*, profiles!user_id(name, email)')
    .eq('id', applicationId)
    .single();

  const { error } = await supabase
    .from('vendor_applications')
    .update({
      status: 'rejected',
      admin_note: adminNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);
  if (error) throw error;

  // 2. Email the applicant (non-blocking)
  const email = (app as any)?.profiles?.email;
  const name = (app as any)?.profiles?.name;
  if (email) {
    supabase.functions
      .invoke('send-email-notification', {
        body: {
          type: 'vendor_rejected',
          to: email,
          payload: {
            name,
            storeName: (app as any)?.store_name,
            adminNote,
          },
        },
      })
      .catch(console.error);
  }
}

/* ─── Admin: Payout helpers ────────────────────────────────────────────── */

export async function getAllVendorPayouts(
  status?: string,
): Promise<(VendorPayout & { vendor_name: string })[]> {
  let query = supabase
    .from('vendor_payouts')
    .select('*, profiles!vendor_id(name, store_name)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    ...p,
    vendor_name: p.profiles?.store_name || p.profiles?.name || 'Unknown',
  }));
}

export async function updatePayoutStatus(
  payoutId: string,
  status: 'pending' | 'processing' | 'paid' | 'failed',
  fields?: {
    paystack_transfer_code?: string;
    paystack_reference?: string;
    admin_note?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('vendor_payouts')
    .update({ status, updated_at: new Date().toISOString(), ...fields })
    .eq('id', payoutId);
  if (error) throw error;

  // Email the vendor when payout is confirmed paid (non-blocking)
  if (status === 'paid') {
    void Promise.resolve(
      supabase
        .from('vendor_payouts')
        .select(
          'amount, payment_method, account_number, vendor_id, profiles!vendor_id(name, email, store_name)',
        )
        .eq('id', payoutId)
        .single()
    ).then(({ data }: any) => {
      const email = data?.profiles?.email;
      if (!email) return;
      supabase.functions
        .invoke('send-email-notification', {
          body: {
            type: 'payout_processed',
            to: email,
            payload: {
              storeName: data.profiles?.store_name || data.profiles?.name,
              amount: data.amount,
              method: data.payment_method,
              accountNumber: data.account_number,
            },
          },
        })
        .catch(console.error);
    }).catch(console.error);
  }
}

/* ─── Admin: All vendor applications ──────────────────────────────────── */

export async function getAllApplications(
  status?: string,
): Promise<(VendorApplication & { user_name: string; user_email: string })[]> {
  let query = supabase
    .from('vendor_applications')
    .select('*, profiles!user_id(name, email)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((a: any) => ({
    ...a,
    user_name: a.profiles?.name ?? 'Unknown',
    user_email: a.profiles?.email ?? '',
  }));
}

/* ─── Admin: All vendors ───────────────────────────────────────────────── */

export async function getAllVendors(): Promise<any[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*, profiles!user_id(name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((v: any) => ({
    ...v,
    name: v.profiles?.name,
    email: v.profiles?.email,
  }));
}

export async function suspendAccount(
  userId: string,
  suspend: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .update({ is_suspended: suspend })
    .eq('user_id', userId);
  if (error) throw error;

  // Also update profile for consistency
  await supabase
    .from('profiles')
    .update({ is_suspended: suspend })
    .eq('id', userId);
}
