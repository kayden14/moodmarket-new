// supabase/functions/vendor-approval/index.ts
// Triggered by approveVendorApplication() in vendorService.ts.
// 1. Resets the vendor's password to the default credentials.
// 2. Sends a beautifully branded approval email via Gmail SMTP (nodemailer).
//
// Required Supabase secrets:
//   SUPABASE_URL              (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided)
//   SMTP_USER  → your Gmail address  e.g. noreply@moodmarket.app
//   SMTP_PASS  → Gmail App Password  (NOT your normal Gmail password)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_PASSWORD = 'newPassword@12345';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, vendorId, storeName, vendorEmail } = await req.json();

    if (action !== 'approve_vendor') {
      throw new Error(`Invalid action: expected "approve_vendor", got "${action}"`);
    }
    if (!vendorId || !vendorEmail) {
      throw new Error('Missing required fields: vendorId, vendorEmail');
    }

    // ── 1. Supabase Admin Client ────────────────────────────────────────────
    const supabaseUrl        = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin      = createClient(supabaseUrl, supabaseServiceKey);

    // ── 2. Reset password to default credentials ────────────────────────────
    const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(vendorId, {
      password: DEFAULT_PASSWORD,
    });
    if (pwdError) throw new Error(`Password reset failed: ${pwdError.message}`);

    // ── 3. SMTP setup ───────────────────────────────────────────────────────
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    if (!smtpUser || !smtpPass) {
      throw new Error('SMTP_USER or SMTP_PASS not set in Supabase secrets.');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

    // ── 4. Build branded HTML email ─────────────────────────────────────────
    const displayName = storeName ?? vendorEmail.split('@')[0];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MoodMarket Vendor Approval</title>
</head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;border:1px solid #1f2d42;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0f2e 0%,#2d1a3a 60%,#3d1020 100%);padding:40px 40px 32px;text-align:center;">
              <div style="font-size:32px;margin-bottom:12px;">🎉</div>
              <h1 style="margin:0 0 6px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Mood<span style="color:#FF7A8A;">Market</span>
              </h1>
              <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">
                Shop by how you feel
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111827;padding:40px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">
                Welcome aboard, ${displayName}! 🏪
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
                We're thrilled to let you know that your vendor application has been
                <strong style="color:#4ade80;">approved</strong>. Your store is now live
                on MoodMarket — start adding products and reach customers through
                mood-based discovery!
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border:1px solid #334155;border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#FF7A8A;letter-spacing:2px;text-transform:uppercase;">
                      🔑 Your Default Login Credentials
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #334155;">
                          <span style="font-size:12px;color:#64748b;font-weight:600;">Email</span><br>
                          <span style="font-size:15px;color:#f1f5f9;font-weight:700;">${vendorEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#64748b;font-weight:600;">Password</span><br>
                          <span style="font-size:15px;color:#f1f5f9;font-weight:700;font-family:monospace;">${DEFAULT_PASSWORD}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.6;">
                      <strong>⚠️ Security:</strong> Please change your password immediately after
                      logging in. Go to <em>Vendor Portal → Settings → Change Password</em>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="https://moodmarket.vercel.app/vendor/login"
                   style="display:inline-block;background:linear-gradient(135deg,#FF7A8A,#e55d6c);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:14px;letter-spacing:0.2px;box-shadow:0 8px 24px rgba(255,122,138,0.4);">
                  Go to Vendor Portal →
                </a>
              </div>

              <!-- What's next -->
              <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#f1f5f9;">What's next?</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ['📦', 'Add your first product', 'Head to Products in your dashboard.'],
                  ['🛒', 'Manage orders', 'View and process incoming orders in real time.'],
                  ['💸', 'Request payouts', 'Once you have revenue, request a payout anytime.'],
                ].map(([icon, title, sub]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:20px;padding-right:14px;vertical-align:top;">${icon}</td>
                        <td>
                          <span style="font-size:13px;font-weight:700;color:#f1f5f9;">${title}</span><br>
                          <span style="font-size:12px;color:#64748b;">${sub}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0b0f1a;border-top:1px solid #1f2d42;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#475569;">
                © ${new Date().getFullYear()} MoodMarket. All rights reserved.
              </p>
              <p style="margin:0;font-size:11px;color:#334155;">
                You received this email because your vendor application was approved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ── 5. Send ─────────────────────────────────────────────────────────────
    await transporter.sendMail({
      from: `"MoodMarket" <${smtpUser}>`,
      to: vendorEmail,
      subject: `🎉 You're approved! Welcome to MoodMarket, ${displayName}`,
      html,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Vendor approved and email sent.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    console.error('[vendor-approval]', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
