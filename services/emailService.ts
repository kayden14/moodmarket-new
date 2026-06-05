// services/emailService.ts
//
// Client-side helper that invokes the send-email-notification Supabase Edge Function.
// Works on both Android/iOS and Web — uses supabase.functions.invoke() which
// handles auth headers automatically.
//
// Usage:
//   import { emailService } from '@/services/emailService';
//   await emailService.welcome(userEmail, userName);
//   await emailService.cartAdd(userEmail, userName, productName, price);
//   await emailService.orderPlaced(userEmail, userName, orderId, total, itemCount, paymentMethod);
//   await emailService.orderShipped(userEmail, userName, orderId);
//   await emailService.orderDelivered(userEmail, userName, orderId);
//   await emailService.accountSuspended(userEmail, userName, reason?);
//   await emailService.accountUnsuspended(userEmail, userName);

import { supabase } from './supabase';

type EmailType =
  | 'welcome'
  | 'cart_add'
  | 'order_placed'
  | 'order_status_update'
  | 'account_suspended'
  | 'account_unsuspended'
  | 'account_deleted'
  | 'vendor_approved'
  | 'vendor_rejected'
  | 'vendor_suspended'
  | 'vendor_unsuspended'
  | 'vendor_removed'
  | 'payout_processed'
  | 'role_updated'
  | 'check_in';

async function send(type: EmailType, to: string, payload: Record<string, any>): Promise<void> {
  if (!to) {
    console.warn(`[emailService] Skipping ${type} — no email address`);
    return;
  }

  try {
    const { error } = await supabase.functions.invoke('send-email-notification', {
      body: { type, to, payload },
    });

    if (error) {
      console.warn(`[emailService] ${type} to ${to} failed:`, error.message);
    } else {
      console.log(`[emailService] ${type} sent to ${to}`);
    }
  } catch (err: any) {
    // Never let email failures crash the app — fire-and-forget
    console.warn(`[emailService] ${type} error (non-blocking):`, err?.message);
  }
}

export const emailService = {
  /** Sent as a general check-in to see how the user is doing */
  checkIn: (email: string, name: string) =>
    send('check_in', email, { name }),

  /** Sent once when a brand-new user completes sign-up */
  welcome: (email: string, name: string) =>
    send('welcome', email, { name }),

  /** Sent when a user adds any item to their cart */
  cartAdd: (email: string, name: string, productName: string, price: number) =>
    send('cart_add', email, { name, productName, price }),

  /** Sent after a successful checkout */
  orderPlaced: (
    email: string,
    name: string,
    orderId: string,
    total: number,
    itemCount: number,
    paymentMethod = 'Online',
    address?: string,
    phone?: string,
  ) =>
    send('order_placed', email, { name, orderId, total, itemCount, paymentMethod, address, phone }),

  /** Sent when admin marks order as shipped */
  orderShipped: (email: string, name: string, orderId: string) =>
    send('order_status_update', email, { name, orderId, status: 'shipped' }),

  /** Sent when admin marks order as delivered */
  orderDelivered: (email: string, name: string, orderId: string) =>
    send('order_status_update', email, { name, orderId, status: 'delivered' }),

  /** Sent when admin cancels an order */
  orderCancelled: (email: string, name: string, orderId: string) =>
    send('order_status_update', email, { name, orderId, status: 'cancelled' }),

  /** Sent when admin suspends a customer account */
  accountSuspended: (email: string, name: string, reason?: string) =>
    send('account_suspended', email, { name, reason }),

  /** Sent when admin reinstates a customer account */
  accountUnsuspended: (email: string, name: string) =>
    send('account_unsuspended', email, { name }),

  /** Sent when admin permanently deletes an account */
  accountDeleted: (email: string, name: string, reason?: string) =>
    send('account_deleted', email, { name, reason }),

  /** Sent when a vendor application is approved */
  vendorApproved: (email: string, name: string, storeName: string) =>
    send('vendor_approved', email, { name, storeName }),

  /** Sent when a vendor application is rejected */
  vendorRejected: (email: string, name: string, reason?: string) =>
    send('vendor_rejected', email, { name, reason }),

  /** Sent when a vendor account is suspended */
  vendorSuspended: (email: string, name: string, storeName: string, reason?: string) =>
    send('vendor_suspended', email, { name, storeName, reason }),

  /** Sent when a vendor account is reinstated */
  vendorUnsuspended: (email: string, name: string, storeName: string) =>
    send('vendor_unsuspended', email, { name, storeName }),

  /** Sent when vendor status is permanently removed */
  vendorRemoved: (email: string, name: string, reason?: string) =>
    send('vendor_removed', email, { name, reason }),

  /** Sent when a vendor payout is processed */
  payoutProcessed: (
    email: string,
    name: string,
    storeName: string,
    amount: number,
    method: string,
    reference: string,
  ) =>
    send('payout_processed', email, { name, storeName, amount, method, reference }),

  /** Sent when user's role is changed (e.g. granted admin) */
  roleUpdated: (email: string, name: string, newRole: string) =>
    send('role_updated', email, { name, newRole }),
};
