// supabase/functions/send-email-notification/index.ts
// General-purpose transactional email dispatcher for MoodMarket.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotifType =
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
  | 'payout_processed';

function wrap(content: string): string {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1a0f2e 0%,#2d1a3a 100%);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff;">Mood<span style="color:#FF7A8A;">Market</span></h1>
      <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Shop by how you feel</p>
    </div>
    <div style="padding:36px 40px;">${content}</div>
    <div style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} MoodMarket. All rights reserved.</p>
    </div>
  </div>`;
}

const btn = (text: string, url: string) =>
  `<a href="${url}" style="display:inline-block;background:#FF7A8A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">${text}</a>`;

const box = (rows: string[], bg = '#f8fafc', border = '#e2e8f0') =>
  `<div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:20px;margin-bottom:24px;">${rows.map(r => `<p style="margin:0 0 4px;color:#1e293b;font-size:14px;">${r}</p>`).join('')}</div>`;

function buildEmail(type: NotifType, p: Record<string, any>): { subject: string; html: string } {
  const n = p.name ?? 'there';
  const brand = 'MoodMarket';
  const oid = String(p.orderId ?? '').slice(0,8).toUpperCase();

  switch (type) {
    case 'welcome':
      return {
        subject: `Welcome to MoodMarket, ${n}!`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:24px;color:#1e293b;">Welcome to ${brand}! Your mood-powered store awaits</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.7;">Hi ${n}, you've just joined the world's first mood-powered shopping experience. We scan your vibe and recommend products that match exactly how you feel today.</p>
          <div style="background:#fff5f6;border:1.5px solid #fecdd3;border-radius:14px;padding:24px;margin-bottom:28px;">
            <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;">Here's how to get started:</p>
            <p style="margin:0 0 8px;color:#64748b;font-size:14px;">&#128248; <strong>Scan your mood</strong> - let our AI camera read your vibe</p>
            <p style="margin:0 0 8px;color:#64748b;font-size:14px;">&#10024; <strong>Get recommendations</strong> - curated just for how you feel</p>
            <p style="margin:0;color:#64748b;font-size:14px;">&#128shopping_cart; <strong>Shop and enjoy</strong> - fast delivery across Ghana</p>
          </div>
          ${btn('Start Shopping', 'https://moodmarket.vercel.app/(tabs)')}
        `),
      };

    case 'cart_add':
      return {
        subject: `${p.productName ?? 'An item'} is waiting in your cart`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">You added something to your cart!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, <strong>${p.productName ?? 'an item'}</strong> is now sitting in your ${brand} cart.</p>
          ${box([`<strong>${p.productName ?? 'Your item'}</strong>`, `<span style="color:#FF7A8A;font-weight:700;">GH&#8373; ${Number(p.price ?? 0).toFixed(2)}</span>`], '#fff5f6', '#fecdd3')}
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px;">Don't forget - complete your purchase before your item sells out!</p>
          ${btn('View My Cart', 'https://moodmarket.vercel.app/(tabs)/cart')}
        `),
      };

    case 'order_placed':
      return {
        subject: `Order Confirmed #${oid} - Thank you for shopping on MoodMarket!`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your order is confirmed!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, thanks for shopping on ${brand}. We have received your order and it is being prepared.</p>
          ${box([
            `<strong>Order ID:</strong> #${oid}`,
            `<strong>Items:</strong> ${p.itemCount ?? 1}`,
            `<strong>Total:</strong> GH&#8373; ${Number(p.total ?? 0).toFixed(2)}`,
            `<strong>Payment:</strong> ${p.paymentMethod ?? 'Online'}`,
          ])}
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px;">We will email you again when your order ships.</p>
          ${btn('View Order', 'https://moodmarket.vercel.app/(tabs)/profile')}
        `),
      };

    case 'order_status_update': {
      const status = p.status ?? 'updated';
      const emoji = status === 'shipped' ? '&#128230;' : status === 'delivered' ? '&#127881;' : status === 'cancelled' ? '&#10060;' : '&#128276;';
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      const msg = status === 'shipped' ? 'Your items are on their way! Estimated delivery in 2-5 business days.'
        : status === 'delivered' ? 'Your order has arrived. Enjoy your mood-matched products!'
        : status === 'cancelled' ? 'Your order has been cancelled. Contact support if you did not request this.'
        : `Your order status is now ${label}.`;
      return {
        subject: `${emoji} Order ${label} - #${oid}`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">${emoji} Your order has been ${status}!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, here is an update on your ${brand} order <strong>#${oid}</strong>.</p>
          ${box([`<span style="font-size:16px;font-weight:700;color:#FF7A8A;">${label}</span>`])}
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px;">${msg}</p>
          ${btn('Track My Order', 'https://moodmarket.vercel.app/(tabs)/profile')}
        `),
      };
    }

    case 'account_suspended':
      return {
        subject: `Your MoodMarket Account Has Been Suspended`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your account has been suspended</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, your ${brand} account has been temporarily suspended.</p>
          ${box([`<strong>Reason:</strong> ${p.reason ?? 'Violation of MoodMarket terms of service.'}`], '#fff7ed', '#fed7aa')}
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 12px;">While suspended you cannot log in, place orders, or access your profile.</p>
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">To appeal, contact us at <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;">support@moodmarket.com</a>.</p>
        `),
      };

    case 'account_unsuspended':
      return {
        subject: `Your MoodMarket Account Has Been Reinstated`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Welcome back! Your account is active again</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, your ${brand} account has been reinstated. You can log in and shop again now.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;"><p style="margin:0;font-size:16px;font-weight:700;color:#16a34a;">Your account is now fully active!</p></div>
          ${btn('Shop Now', 'https://moodmarket.vercel.app/(tabs)')}
        `),
      };

    case 'account_deleted':
      return {
        subject: `Your MoodMarket Account Has Been Deleted`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Account deleted</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, your MoodMarket account has been permanently deleted and all your data has been removed.</p>
          ${p.reason ? box([`<strong>Reason:</strong> ${p.reason}`], '#fff1f2', '#fecdd3') : ''}
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Contact us at <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;">support@moodmarket.com</a> if this was a mistake.</p>
        `),
      };

    case 'vendor_approved':
      return {
        subject: `Congratulations! Your Vendor Application is Approved`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">You are now a ${brand} vendor!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${p.storeName ?? n}, your vendor application has been approved. Your store is now live!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;"><p style="margin:0;font-size:16px;font-weight:700;color:#16a34a;">Your store is now LIVE!</p></div>
          ${btn('Go to Vendor Dashboard', 'https://moodmarket.vercel.app/vendor')}
        `),
      };

    case 'vendor_rejected':
      return {
        subject: `Update on Your MoodMarket Vendor Application`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Vendor Application Update</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, unfortunately your vendor application was not approved at this time.</p>
          ${p.reason ? box([`<strong>Reason:</strong> ${p.reason}`], '#fff1f2', '#fecdd3') : ''}
          <p style="color:#64748b;font-size:13px;margin:0;">You are welcome to re-apply after addressing the above. Questions? <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;">Contact us</a>.</p>
        `),
      };

    case 'vendor_suspended':
      return {
        subject: `Your MoodMarket Vendor Account Has Been Suspended`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your vendor account has been suspended</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${p.storeName ?? n}, your vendor account on ${brand} has been temporarily suspended.</p>
          ${box([`<strong>Reason:</strong> ${p.reason ?? 'Violation of vendor terms and conditions.'}`], '#fff7ed', '#fed7aa')}
          <p style="color:#64748b;font-size:13px;margin:0;">To appeal, contact us at <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;">support@moodmarket.com</a>.</p>
        `),
      };

    case 'vendor_unsuspended':
      return {
        subject: `Your MoodMarket Vendor Account Has Been Reinstated`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your vendor account is reinstated!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${p.storeName ?? n}, your vendor account has been reinstated. Your store is live again!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;"><p style="margin:0;font-size:16px;font-weight:700;color:#16a34a;">Your store is now active again!</p></div>
          ${btn('Go to Vendor Dashboard', 'https://moodmarket.vercel.app/vendor')}
        `),
      };

    case 'vendor_removed':
      return {
        subject: `Your MoodMarket Vendor Status Has Been Removed`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Vendor status removed</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${n}, your vendor status on ${brand} has been permanently removed.</p>
          ${p.reason ? box([`<strong>Reason:</strong> ${p.reason}`], '#fff1f2', '#fecdd3') : ''}
          <p style="color:#64748b;font-size:13px;margin:0;">Your customer account is still active. Questions? <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;">Contact us</a>.</p>
        `),
      };

    case 'payout_processed':
      return {
        subject: `Payout of GH&#8373;${Number(p.amount ?? 0).toFixed(2)} Processed`,
        html: wrap(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your payout has been processed!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${p.storeName ?? n}, your payout from ${brand} has been sent to your account.</p>
          ${box([
            `<strong>Amount:</strong> GH&#8373; ${Number(p.amount ?? 0).toFixed(2)}`,
            `<strong>Method:</strong> ${p.method ?? 'Mobile Money'}`,
            `<strong>Reference:</strong> ${String(p.reference ?? '').slice(0,12).toUpperCase() || 'N/A'}`,
          ], '#f0fdf4', '#bbf7d0')}
          <p style="color:#64748b;font-size:13px;margin:0;">Funds typically arrive within 1-3 business days.</p>
        `),
      };

    default:
      return { subject: 'Notification from MoodMarket', html: wrap(`<p style="color:#64748b;">${JSON.stringify(p)}</p>`) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { type, to, payload = {} } = await req.json();
    if (!type || !to) throw new Error('Missing required fields: type, to');
    console.log(`[send-email] ${type} -> ${to}`);

    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    if (!smtpUser || !smtpPass) throw new Error('SMTP credentials not configured.');

    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } });
    await transporter.verify();

    const { subject, html } = buildEmail(type as NotifType, payload);
    const info = await transporter.sendMail({ from: `"MoodMarket" <${smtpUser}>`, to, subject, html });
    console.log(`[send-email] Sent! MessageID: ${info.messageId}`);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (err: any) {
    console.error('[send-email] Error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
