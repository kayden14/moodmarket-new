/**
 * app/data-deletion+api.ts
 *
 * Facebook Data Deletion Callback endpoint.
 * Facebook sends a signed POST request here when a user
 * requests deletion of their data via Facebook Login.
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role key — never expose this client-side
);

/**
 * Parse and verify Facebook's signed_request parameter.
 * signed_request = base64(signature) + '.' + base64(payload)
 */
async function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<Record<string, any> | null> {
  try {
    const [encodedSig, payload] = signedRequest.split('.');

    // Decode payload
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );

    // Verify signature using HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBuffer = Buffer.from(
      encodedSig.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuffer,
      encoder.encode(payload),
    );

    if (!valid) {
      console.error('[DataDeletion] Invalid signature');
      return null;
    }

    return data;
  } catch (err) {
    console.error('[DataDeletion] parseSignedRequest error:', err);
    return null;
  }
}

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get('signed_request');

    if (!signedRequest) {
      return ExpoResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appSecret) {
      console.error('[DataDeletion] FACEBOOK_APP_SECRET not set');
      return ExpoResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Verify and decode the signed request
    const data = await parseSignedRequest(signedRequest, appSecret);
    if (!data) {
      return ExpoResponse.json({ error: 'Invalid signed_request' }, { status: 400 });
    }

    const facebookUserId: string = data.user_id;
    const confirmationCode = `del_${facebookUserId}_${Date.now()}`;

    // Find and delete the user from Supabase by their Facebook ID
    // Adjust this query to match how you store the Facebook user ID
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('facebook_id', facebookUserId);

    if (deleteError) {
      console.error('[DataDeletion] Supabase delete error:', deleteError);
      // Don't block the response — Facebook doesn't retry on 500s well.
      // Log it and still return a confirmation so the user isn't stuck.
    }

    // Also delete the Supabase Auth user if you have their auth ID
    // You'd need to look up the auth user by facebook_id first if needed.

    console.log(`[DataDeletion] Processed deletion for Facebook user: ${facebookUserId}`);

    // Facebook expects this exact JSON shape
    return ExpoResponse.json({
      url: `${process.env.EXPO_PUBLIC_APP_URL}/data-deletion-status?id=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });

  } catch (err) {
    console.error('[DataDeletion] Unexpected error:', err);
    return ExpoResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET — renders a human-readable page for users who visit the URL directly.
 * Also satisfies Facebook's "Data Deletion Instructions URL" field.
 */
export async function GET(_request: ExpoRequest): Promise<ExpoResponse> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Data Deletion — MoodMarket</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 24px; color: #0f172a; line-height: 1.7; }
    h1   { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    p    { color: #475569; margin-bottom: 16px; }
    a    { color: #6366f1; }
  </style>
</head>
<body>
  <h1>Data Deletion Request</h1>
  <p>If you used Facebook Login with MoodMarket and would like your data deleted, you can do either of the following:</p>
  <ul>
    <li>Delete your account from within the MoodMarket app under <strong>Settings → Delete Account</strong>.</li>
    <li>Email us at <a href="mailto:support@moodmarket.app">support@moodmarket.app</a> with the subject line <strong>"Data Deletion Request"</strong> and we will remove your data within 30 days.</li>
  </ul>
  <p>When your data is deleted, we remove your mood history, profile, and any associated information from our servers.</p>
</body>
</html>`;

  return new ExpoResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}