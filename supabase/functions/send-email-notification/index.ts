// supabase/functions/send-email-notification/index.ts
// Premium transactional email dispatcher for MoodMarket.

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
  | 'payout_processed'
  | 'role_updated';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wrap(body: string, accentColor = '#FF7A8A'): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>MoodMarket</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
    body{margin:0!important;padding:0!important;width:100%!important;background:#f1f5f9}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important}
      .stack-column,.stack-column-center{display:block!important;width:100%!important;max-width:100%!important}
      .pad-sm{padding:24px 20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a0f2e 0%,#2d1a3a 100%);padding:40px 48px;text-align:center;">
            <div style="display:inline-block;width:52px;height:52px;background:${accentColor};border-radius:14px;line-height:52px;font-size:24px;font-weight:900;color:#fff;margin-bottom:14px;">M</div>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Mood<span style="color:${accentColor};">Market</span></h1>
            <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Elevate Your Vibe</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="pad-sm" style="padding:40px 48px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:28px 48px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">You're receiving this because of activity on your MoodMarket account.</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;">&copy; ${new Date().getFullYear()} MoodMarket &bull; Accra, Ghana</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const h2 = (text: string) =>
  `<h2 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#1e293b;letter-spacing:-0.5px;line-height:1.3;">${text}</h2>`;

const p = (text: string, extra = '') =>
  `<p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.75;${extra}">${text}</p>`;

const btn = (text: string, url: string, color = '#FF7A8A') =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:15px 40px;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 16px ${color}55;">${text} &rarr;</a>
    </td></tr>
  </table>`;

const infoBox = (rows: string[], title?: string, borderColor = '#e2e8f0', bgColor = '#f8fafc') =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${bgColor};border:1.5px solid ${borderColor};border-radius:14px;margin:0 0 24px;">
    <tr><td style="padding:20px 24px;">
      ${title ? `<p style="margin:0 0 14px;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">${title}</p>` : ''}
      ${rows.map(r => `<p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.6;">${r}</p>`).join('')}
    </td></tr>
  </table>`;

const statusBadge = (text: string, color: string, bg: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${bg};border:1.5px solid ${color}33;border-radius:14px;margin:0 0 24px;">
    <tr><td style="padding:24px;text-align:center;">
      <p style="margin:0;font-size:18px;font-weight:900;color:${color};letter-spacing:0.5px;">${text}</p>
    </td></tr>
  </table>`;

const divider = () =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td style="border-top:1px solid #e2e8f0;"></td></tr>
  </table>`;

// ─── Email Builder ────────────────────────────────────────────────────────────

function buildEmail(type: NotifType, p_: Record<string, any>): { subject: string; html: string } {
  const name = p_.name ?? 'Valued Customer';
  const brand = 'MoodMarket';
  const oid = String(p_.orderId ?? '').slice(0, 8).toUpperCase();
  const accent = '#FF7A8A';

  switch (type) {

    case 'welcome':
      return {
        subject: `Welcome to MoodMarket, ${name}! ✨`,
        html: wrap(`
          ${h2(`Welcome aboard, ${name}! 🎉`)}
          ${p(`You've just joined the world's first AI-powered mood marketplace. We match products to your vibe — because the best shopping starts with how you <em>feel</em>.`)}
          ${infoBox([
            '🧠 <strong>Instant Mood Scan</strong> — AI reads your energy and curates your feed.',
            '✨ <strong>Vibe Collections</strong> — Hand-picked sets for every emotion.',
            '🚀 <strong>Express Delivery</strong> — Joy, delivered to your door.',
          ], 'WHAT\'S WAITING FOR YOU')}
          ${btn('Start Your First Mood Scan', 'https://moodmarket.vercel.app/(tabs)')}
          ${p('Have questions? We\'re here at <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;font-weight:700;">support@moodmarket.com</a>.', 'margin-bottom:0;font-size:13px;color:#94a3b8;')}
        `),
      };

    case 'cart_add':
      return {
        subject: `🛒 You left something behind on MoodMarket`,
        html: wrap(`
          ${h2(`Still thinking about it?`)}
          ${p(`Hi ${name}, you added <strong>${p_.productName ?? 'an item'}</strong> to your cart but haven't checked out yet. Don't let your vibe pass you by!`)}
          ${infoBox([
            `🛍️ <strong>Item:</strong> ${p_.productName ?? 'Your saved item'}`,
            `💰 <strong>Price:</strong> GH₵ ${Number(p_.price ?? 0).toFixed(2)}`,
          ], 'SAVED IN YOUR CART')}
          ${btn('Complete Your Order', 'https://moodmarket.vercel.app/cart')}
        `),
      };

    case 'order_placed':
      return {
        subject: `✅ Order #${oid} Confirmed — Thanks for shopping!`,
        html: wrap(`
          ${h2(`Order Confirmed! 🎊`)}
          ${p(`Hi ${name}, we've received your order and our team is already preparing it with care. You'll get a notification as soon as it ships.`)}
          ${infoBox([
            `📦 <strong>Order ID:</strong> <span style="font-family:monospace;font-weight:700;">#${oid}</span>`,
            `💳 <strong>Total Paid:</strong> GH₵ ${Number(p_.total ?? 0).toFixed(2)}`,
            `🛍️ <strong>Items:</strong> ${p_.itemCount ?? 1} item(s)`,
            `📍 <strong>Delivering to:</strong> ${p_.address ?? 'your saved address'}`,
          ], 'ORDER SUMMARY', '#bbf7d0', '#f0fdf4')}
          ${btn('Track My Order', 'https://moodmarket.vercel.app/(tabs)/profile')}
          ${divider()}
          ${p('Need help? Reach us at <a href="mailto:support@moodmarket.com" style="color:#FF7A8A;font-weight:700;">support@moodmarket.com</a>', 'font-size:13px;color:#94a3b8;margin-bottom:0;')}
        `),
      };

    case 'order_status_update':
      return {
        subject: `📦 Order #${oid} Status Update`,
        html: wrap(`
          ${h2(`Your order is on the move!`)}
          ${p(`Hi ${name}, here's a quick update on order <strong>#${oid}</strong>.`)}
          ${infoBox([
            `📦 <strong>Order ID:</strong> <span style="font-family:monospace;">#${oid}</span>`,
            `🔄 <strong>New Status:</strong> <span style="color:${accent};font-weight:800;">${String(p_.status ?? 'Updated').toUpperCase()}</span>`,
            p_.message ? `💬 <strong>Note:</strong> ${p_.message}` : '',
          ].filter(Boolean), 'STATUS UPDATE', '#fde68a', '#fffbeb')}
          ${btn('View Order Details', 'https://moodmarket.vercel.app/(tabs)/profile')}
        `),
      };

    case 'account_suspended':
      return {
        subject: `⚠️ Important: Your MoodMarket Account Has Been Suspended`,
        html: wrap(`
          ${h2(`Account Suspended`)}
          ${p(`Hi ${name}, we're writing to let you know your ${brand} account has been temporarily suspended.`)}
          ${infoBox([
            `🚫 <strong>Status:</strong> <span style="color:#ef4444;font-weight:800;">Suspended</span>`,
            `📋 <strong>Reason:</strong> ${p_.reason ?? 'Violation of community guidelines or terms of service.'}`,
            `⏰ <strong>Effective:</strong> Immediately`,
          ], 'SUSPENSION DETAILS', '#fecaca', '#fef2f2')}
          ${p(`While suspended, you cannot log in, place orders, or access your mood history. We take these actions to protect all marketplace participants.`)}
          ${p(`If you believe this is a mistake, please appeal at <a href="mailto:support@moodmarket.com" style="color:#ef4444;font-weight:700;">support@moodmarket.com</a>.`, 'margin-bottom:0;font-size:14px;')}
        `, '#ef4444'),
      };

    case 'account_unsuspended':
      return {
        subject: `🎉 Great News: Your MoodMarket Account is Reinstated!`,
        html: wrap(`
          ${h2(`Welcome Back, ${name}!`)}
          ${p(`We've reviewed your account and are happy to confirm your access has been fully restored. Your vibes are back!`)}
          ${statusBadge('✅ ACCOUNT ACTIVE', '#16a34a', '#f0fdf4')}
          ${btn('Return to MoodMarket', 'https://moodmarket.vercel.app/(tabs)', '#16a34a')}
        `, '#16a34a'),
      };

    case 'account_deleted':
      return {
        subject: `Confirmation: Your MoodMarket Account Has Been Deleted`,
        html: wrap(`
          ${h2(`Farewell, ${name}.`)}
          ${p(`As requested, your ${brand} account and all personal data have been permanently and securely removed from our systems.`)}
          ${infoBox([
            '🗑️ Your profile and order history have been erased.',
            '🧠 Your mood scan data has been purged.',
            '📧 You will no longer receive marketing communications.',
          ], 'WHAT THIS MEANS', '#e2e8f0', '#f8fafc')}
          ${p(`We're sorry to see you go. If you ever change your mind, you're always welcome to create a new account.`, 'font-size:14px;color:#94a3b8;margin-bottom:0;')}
        `, '#64748b'),
      };

    case 'role_updated': {
      const role = String(p_.newRole ?? 'customer').toUpperCase();
      const isAdmin = role === 'ADMIN';
      const isVendor = role === 'VENDOR';
      const roleColor = isAdmin ? '#7c3aed' : isVendor ? '#0891b2' : accent;
      return {
        subject: `🔐 Your MoodMarket Permissions Have Been Updated`,
        html: wrap(`
          ${h2(`Account Permissions Updated`)}
          ${p(`Hi ${name}, an administrator has updated your ${brand} account permissions.`)}
          ${infoBox([
            `👤 <strong>New Role:</strong> <span style="color:${roleColor};font-weight:900;">${role}</span>`,
            `📅 <strong>Effective:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          ], 'UPDATED PERMISSIONS', '#e0e7ff', '#eef2ff')}
          ${p(
            isAdmin ? 'You now have full administrative access to manage users, products, and platform settings. Please use these privileges responsibly.' :
            isVendor ? 'You can now access the Vendor Dashboard to manage your store, list products, and track earnings.' :
            'Your role has been set to Customer. Enjoy personalized mood-based shopping!'
          )}
          ${btn(
            isAdmin ? 'Open Admin Panel' : isVendor ? 'Open Vendor Dashboard' : 'Shop MoodMarket',
            isAdmin ? 'https://moodmarket.vercel.app/admin' : isVendor ? 'https://moodmarket.vercel.app/vendor' : 'https://moodmarket.vercel.app/(tabs)',
            roleColor
          )}
        `, roleColor),
      };
    }

    case 'vendor_approved':
      return {
        subject: `🎊 Congratulations! Your Vendor Store is LIVE on MoodMarket!`,
        html: wrap(`
          ${h2(`Your Store is Approved! 🚀`)}
          ${p(`Hi ${p_.storeName ?? name}, congratulations! Your vendor application has been approved. You can now start listing products and reach thousands of mood-driven customers.`)}
          ${statusBadge('🟢 STORE STATUS: ACTIVE', '#16a34a', '#f0fdf4')}
          ${infoBox([
            '📦 List your first product from the Vendor Dashboard.',
            '📊 Track sales, revenue, and order status in real time.',
            '💰 Payouts are processed on a regular schedule.',
          ], 'GETTING STARTED', '#bbf7d0', '#f0fdf4')}
          ${btn('Access Vendor Dashboard', 'https://moodmarket.vercel.app/vendor', '#16a34a')}
        `, '#16a34a'),
      };

    case 'vendor_rejected':
      return {
        subject: `Update on Your Vendor Application — MoodMarket`,
        html: wrap(`
          ${h2(`Application Update`)}
          ${p(`Hi ${name}, thank you for your interest in selling on ${brand}. After reviewing your application, we're unable to approve it at this time.`)}
          ${infoBox([
            `📋 <strong>Reason:</strong> ${p_.reason ?? 'Does not meet current vendor requirements.'}`,
          ], 'REVIEW DETAILS', '#fecaca', '#fef2f2')}
          ${p(`This doesn't mean you can never sell on MoodMarket. You're welcome to reapply once you've addressed the points above.`)}
          ${p(`Questions? Contact us at <a href="mailto:vendors@moodmarket.com" style="color:${accent};font-weight:700;">vendors@moodmarket.com</a>.`, 'font-size:14px;margin-bottom:0;')}
        `, '#ef4444'),
      };

    case 'vendor_suspended':
      return {
        subject: `⚠️ Your Vendor Store Has Been Temporarily Suspended`,
        html: wrap(`
          ${h2(`Store Temporarily Suspended`)}
          ${p(`Hi ${name}, your vendor store on ${brand} has been temporarily suspended. Your products have been hidden from the marketplace.`)}
          ${infoBox([
            `🚫 <strong>Status:</strong> <span style="color:#ef4444;font-weight:800;">Suspended</span>`,
            `📋 <strong>Reason:</strong> ${p_.reason ?? 'Policy violation or quality concern.'}`,
          ], 'SUSPENSION DETAILS', '#fecaca', '#fef2f2')}
          ${p(`To resolve this and reinstate your store, please contact our vendor support team.`)}
          ${btn('Contact Vendor Support', 'mailto:vendors@moodmarket.com', '#ef4444')}
        `, '#ef4444'),
      };

    case 'vendor_unsuspended':
      return {
        subject: `🎉 Your MoodMarket Vendor Store is Back Online!`,
        html: wrap(`
          ${h2(`Store Reinstated!`)}
          ${p(`Hi ${name}, great news! Your vendor store suspension has been lifted. Your products are now visible on the marketplace again.`)}
          ${statusBadge('🟢 STORE STATUS: ACTIVE', '#16a34a', '#f0fdf4')}
          ${btn('Return to Vendor Dashboard', 'https://moodmarket.vercel.app/vendor', '#16a34a')}
        `, '#16a34a'),
      };

    case 'vendor_removed':
      return {
        subject: `Important: Your Vendor Status Has Been Removed`,
        html: wrap(`
          ${h2(`Vendor Status Removed`)}
          ${p(`Hi ${name}, your vendor status on ${brand} has been permanently removed.`)}
          ${infoBox([
            `🚫 <strong>Status:</strong> <span style="color:#ef4444;font-weight:800;">Deactivated</span>`,
            `📋 <strong>Reason:</strong> ${p_.reason ?? 'Account cleanup or administrative decision.'}`,
          ], 'STATUS DETAILS', '#fecaca', '#fef2f2')}
          ${p(`Your products have been unlisted. However, your customer account remains fully active for personal shopping. Any pending payouts will be processed per our standard schedule.`)}
          ${p(`Questions? Email us at <a href="mailto:support@moodmarket.com" style="color:${accent};font-weight:700;">support@moodmarket.com</a>.`, 'font-size:14px;margin-bottom:0;')}
        `, '#ef4444'),
      };

    case 'payout_processed':
      return {
        subject: `💰 Payout Processed — GH₵ ${Number(p_.amount ?? 0).toFixed(2)} Sent!`,
        html: wrap(`
          ${h2(`Your Payout is on Its Way! 💸`)}
          ${p(`Hi ${name}, great news! Your earnings have been processed and are heading to your account.`)}
          ${infoBox([
            `💰 <strong>Amount:</strong> <span style="color:#16a34a;font-weight:900;font-size:18px;">GH₵ ${Number(p_.amount ?? 0).toFixed(2)}</span>`,
            `🏦 <strong>Method:</strong> ${p_.method ?? 'Mobile Money / Bank Transfer'}`,
            `📅 <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            `🆔 <strong>Reference:</strong> <span style="font-family:monospace;">${p_.reference ?? 'MM-' + Date.now().toString(36).toUpperCase()}</span>`,
          ], 'PAYOUT DETAILS', '#bbf7d0', '#f0fdf4')}
          ${p('Funds typically arrive within 1–3 business days depending on your bank or mobile money provider.', 'font-size:14px;color:#64748b;')}
          ${btn('View Earnings Dashboard', 'https://moodmarket.vercel.app/vendor', '#16a34a')}
        `, '#16a34a'),
      };

    default:
      return {
        subject: `Notification from MoodMarket`,
        html: wrap(`
          ${h2('A note from MoodMarket')}
          ${p('You have a new notification. Please log in to your account to view the details.')}
          ${btn('Go to MoodMarket', 'https://moodmarket.vercel.app/(tabs)')}
        `),
      };
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { type, to, payload = {} } = await req.json();
    if (!type || !to) throw new Error('Missing required fields: type, to');

    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    if (!smtpUser || !smtpPass) throw new Error('SMTP credentials not configured.');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.verify();

    const { subject, html } = buildEmail(type as NotifType, payload);
    const info = await transporter.sendMail({
      from: `"MoodMarket" <${smtpUser}>`,
      to,
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
