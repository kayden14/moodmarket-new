// supabase/functions/vendor-approval/index.ts
/// <reference lib="deno.ns" />
// Triggered by approveVendorApplication() in vendorService.ts.
// 1. Generates a secure password-reset link (vendor sets their own password).
// 2. Calls send-email-notification with type: 'vendor_approved'.
//
// Required Supabase secrets:
//   SUPABASE_URL              (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided)
//   SMTP_USER                 → your Gmail address
//   SMTP_PASS                 → Gmail App Password
//   VENDOR_LOGIN_URL          → e.g. https://moodmarket.vercel.app/vendor/login

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabaseUrl        = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const vendorLoginUrl     = Deno.env.get('VENDOR_LOGIN_URL') ?? 'https://moodmarket.vercel.app/vendor/login';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Generate a temporary password
    const tempPassword = `Mood-${Math.random().toString(36).slice(-6).toUpperCase()}`;

    // 2. Update the user's password using Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      vendorId,
      { password: tempPassword }
    );
    
    if (updateError) {
      console.error('[vendor-approval] Error updating password:', updateError);
      throw new Error(`Failed to set temporary password: ${updateError.message}`);
    }

    const actionLink = vendorLoginUrl;

    console.log(`[vendor-approval] Generated temp password for ${vendorEmail}. Dispatching email...`);

    // 3. Hand off to send-email-notification
    const { error: sendError } = await supabaseAdmin.functions.invoke(
      'send-email-notification',
      {
        body: {
          type: 'vendor_approved',
          to: vendorEmail,
          payload: { storeName, actionLink, vendorEmail, tempPassword },
        },
      },
    );

    if (sendError) {
      console.error('[vendor-approval] send-email-notification error:', sendError);
      throw new Error(`Email send failed: ${sendError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Vendor approved and email sent.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err: any) {
    console.error('[vendor-approval]', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});