// supabase/functions/send-email-notification/index.ts
// General-purpose transactional email dispatcher for MoodMarket.
// Invoked by vendorService or any server-side trigger with:
//   { type, to, payload }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ─── Email templates ──────────────────────────────────────────────────────── */

type NotifType =
  | 'order_placed'
  | 'order_status_update'
  | 'payout_processed'
  | 'vendor_approved'
  | 'vendor_rejected'
  | 'welcome';

function buildEmailHTML(type: NotifType, payload: Record<string, any>): { subject: string; html: string } {
  const brand = `<span style="color:#FF7A8A;font-weight:900;">MoodMarket</span>`;

  const wrapper = (content: string) => `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a0f2e 0%,#2d1a3a 100%);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
          Mood<span style="color:#FF7A8A;">Market</span>
        </h1>
        <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">
          Shop by how you feel
        </p>
      </div>
      <!-- Body -->
      <div style="padding:36px 40px;background:#ffffff;">
        ${content}
      </div>
      <!-- Footer -->
      <div style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          © ${new Date().getFullYear()} MoodMarket. All rights reserved.<br>
          You received this email because you have an account on MoodMarket.
        </p>
      </div>
    </div>`;

  switch (type) {

    case 'order_placed':
      return {
        subject: `🛍️ Order Confirmed – #${String(payload.orderId ?? '').slice(0, 8).toUpperCase()}`,
        html: wrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your order is confirmed! 🎉</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
            Hi ${payload.name ?? 'there'}, thanks for shopping on ${brand}. We've received your order and it's being prepared.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Order Details</p>
            <p style="margin:0 0 4px;color:#1e293b;"><strong>Order ID:</strong> #${String(payload.orderId ?? '').slice(0, 8).toUpperCase()}</p>
            <p style="margin:0 0 4px;color:#1e293b;"><strong>Total:</strong> GH₵ ${Number(payload.total ?? 0).toFixed(2)}</p>
            <p style="margin:0;color:#1e293b;"><strong>Payment:</strong> ${payload.paymentMethod ?? 'Online'}</p>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
            We'll send you another email when your order ships. In the meantime, you can track your order from your profile.
          </p>
        `),
      };

    case 'order_status_update': {
      const statusEmoji: Record<string, string> = { shipped: '📦', delivered: '🎉', cancelled: '❌' };
      const emoji = statusEmoji[payload.status] ?? '🔔';
      return {
        subject: `${emoji} Order Update – ${String(payload.status).charAt(0).toUpperCase() + String(payload.status).slice(1)}`,
        html: wrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">${emoji} Your order has been ${payload.status}!</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
            Hi ${payload.name ?? 'there'}, your ${brand} order <strong>#${String(payload.orderId ?? '').slice(0, 8).toUpperCase()}</strong> has been updated.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Status Update</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#FF7A8A;text-transform:capitalize;">${payload.status}</p>
          </div>
          ${payload.status === 'shipped' ? `<p style="color:#64748b;font-size:13px;">Your items are on their way! Estimated delivery in 2–5 business days.</p>` : ''}
          ${payload.status === 'delivered' ? `<p style="color:#64748b;font-size:13px;">Enjoy your mood-matched products! 🛍️ Leave a review to help other shoppers.</p>` : ''}
        `),
      };
    }

    case 'payout_processed':
      return {
        subject: `💸 Payout of GH₵${Number(payload.amount ?? 0).toFixed(2)} Processed`,
        html: wrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Your payout has been sent! 💸</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
            Hi ${payload.storeName ?? 'Vendor'}, your ${brand} earnings payout has been processed.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">Payout Details</p>
            <p style="margin:0 0 4px;color:#1e293b;"><strong>Amount:</strong> GH₵ ${Number(payload.amount ?? 0).toFixed(2)}</p>
            <p style="margin:0 0 4px;color:#1e293b;"><strong>Method:</strong> ${payload.method === 'momo' ? '📱 Mobile Money' : '🏦 Bank Transfer'}</p>
            <p style="margin:0;color:#1e293b;"><strong>Account:</strong> ${payload.accountNumber ?? 'N/A'}</p>
          </div>
          <p style="color:#64748b;font-size:13px;">Funds typically arrive within 1–3 business days depending on your bank.</p>
        `),
      };

    case 'vendor_approved': {
      const displayName = payload.storeName ?? payload.vendorEmail?.split('@')[0] ?? 'Vendor';
      return {
        subject: `🎉 You're approved! Welcome to MoodMarket, ${displayName}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1a0f2e 0%,#2d1a3a 60%,#3d1020 100%);padding:40px 40px 32px;text-align:center;">
              <div style="font-size:32px;margin-bottom:12px;">🎉</div>
              <h1 style="margin:0 0 6px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Mood<span style="color:#FF7A8A;">Market</span>
              </h1>
              <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">
                Shop by how you feel
              </p>
            </div>

            <!-- Body -->
            <div style="background:#111827;padding:40px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">
                Welcome aboard, ${displayName}! 🏪
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
                We're thrilled to let you know that your vendor application has been
                <strong style="color:#4ade80;">approved</strong>. Your store is now live
                on MoodMarket — start adding products and reach customers through
                mood-based discovery!
              </p>

              <!-- Login details box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border:1px solid #334155;border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#FF7A8A;letter-spacing:2px;text-transform:uppercase;">
                      🔑 Your Login Details
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #334155;">
                          <span style="font-size:12px;color:#64748b;font-weight:600;">Email</span><br>
                          <span style="font-size:15px;color:#f1f5f9;font-weight:700;">${payload.vendorEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#64748b;font-weight:600;">Password</span><br>
                          <span style="font-size:14px;color:#94a3b8;">Use the button below to set your password securely.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${payload.actionLink}"
                   style="display:inline-block;background:linear-gradient(135deg,#FF7A8A,#e55d6c);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:14px;letter-spacing:0.2px;box-shadow:0 8px 24px rgba(255,122,138,0.4);">
                  Set Password &amp; Log In →
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:12px;color:#475569;text-align:center;">
                This link expires in 24 hours. After setting your password you can always log in at
                <a href="https://moodmarket.vercel.app/vendor/login" style="color:#FF7A8A;">moodmarket.vercel.app</a>
              </p>

              <!-- What's next -->
              <p style="margin:28px 0 16px;font-size:13px;font-weight:700;color:#f1f5f9;">What's next?</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:20px;padding-right:14px;vertical-align:top;">📦</td>
                    <td><span style="font-size:13px;font-weight:700;color:#f1f5f9;">Add your first product</span><br>
                        <span style="font-size:12px;color:#64748b;">Head to Products in your dashboard.</span></td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:20px;padding-right:14px;vertical-align:top;">🛒</td>
                    <td><span style="font-size:13px;font-weight:700;color:#f1f5f9;">Manage orders</span><br>
                        <span style="font-size:12px;color:#64748b;">View and process incoming orders in real time.</span></td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:10px 0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:20px;padding-right:14px;vertical-align:top;">💸</td>
                    <td><span style="font-size:13px;font-weight:700;color:#f1f5f9;">Request payouts</span><br>
                        <span style="font-size:12px;color:#64748b;">Once you have revenue, request a payout anytime.</span></td>
                  </tr></table>
                </td></tr>
              </table>
            </div>

            <!-- Footer -->
            <div style="background:#0b0f1a;border-top:1px solid #1f2d42;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#475569;">
                © ${new Date().getFullYear()} MoodMarket. All rights reserved.
              </p>
              <p style="margin:0;font-size:11px;color:#334155;">
                You received this email because your vendor application was approved.
              </p>
            </div>
          </div>
        `,
      };
    }

    case 'vendor_rejected':
      return {
        subject: `❌ MoodMarket Vendor Application Update`,
        html: wrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Application Update</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
            Hi ${payload.name ?? 'there'}, thank you for applying to sell on ${brand}.
            Unfortunately, your application for <strong>${payload.storeName ?? 'your store'}</strong> was not approved at this time.
          </p>
          ${payload.adminNote ? `
          <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:0.5px;">Note from our team</p>
            <p style="margin:0;color:#1e293b;">${payload.adminNote}</p>
          </div>` : ''}
          <p style="color:#64748b;font-size:13px;">You're welcome to update your store information and re-apply. We'd love to have you on the platform!</p>
        `),
      };

    case 'welcome':
      return {
        subject: `🎉 Welcome to MoodMarket, ${payload.name ?? 'there'}!`,
        html: wrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">Welcome to ${brand}! 🎉</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
            Hi ${payload.name ?? 'there'}, you're all set! Start exploring products curated for your mood.
          </p>
          <div style="background:linear-gradient(135deg,#FF7A8A22,#7C3AED22);border:1px solid #FF7A8A33;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#1e293b;">✨ Scan your mood to get started</p>
            <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Use the camera feature to detect your mood and discover matching products.</p>
          </div>
        `),
      };

    default:
      return { subject: 'Notification from MoodMarket', html: wrapper(`<p>${JSON.stringify(payload)}</p>`) };
  }
}

/* ─── Handler ──────────────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, to, payload } = await req.json() as {
      type: NotifType;
      to: string;
      payload: Record<string, any>;
    };

    if (!type || !to) throw new Error('Missing required fields: type, to');

    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    if (!smtpUser || !smtpPass) throw new Error('SMTP credentials not configured');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

    const { subject, html } = buildEmailHTML(type, payload);

    await transporter.sendMail({
      from: `"MoodMarket" <${smtpUser}>`,
      to,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: any) {
    console.error('[send-email-notification]', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});