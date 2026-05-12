/**
 * app/privacy-policy.tsx
 * Required by Facebook OAuth — accessible at /privacy-policy
 */

import { Platform, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';

const LAST_UPDATED = 'May 12, 2025';
const APP_NAME = 'MoodMarket';
const CONTACT_EMAIL = 'support@moodmarket.app';

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly to us, including your name, email address, and any other information you choose to provide when you create an account or use our services.\n\nWhen you sign in using a third-party provider such as Google or Facebook, we receive basic profile information permitted by that provider, including your name and email address.\n\nWe also collect usage data such as mood scan history, product interactions, and order information to personalise your experience.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information we collect to:\n• Provide, maintain, and improve our services\n• Process transactions and send related information\n• Send you mood-based product recommendations\n• Respond to your comments and questions\n• Monitor and analyse usage trends\n• Detect and prevent fraudulent transactions`,
  },
  {
    title: '3. Sharing of Information',
    body: `We do not sell, rent, or share your personal information with third parties for their marketing purposes. We may share your information with:\n• Vendors on our platform solely to fulfil your orders\n• Service providers who assist in our operations\n• Law enforcement when required by law`,
  },
  {
    title: '4. Data from Facebook Login',
    body: `When you choose to log in with Facebook, we receive only your name and email address. We do not access your friends list, posts, photos, or any other Facebook data. You can revoke MoodMarket's access at any time via your Facebook Settings → Apps and Websites.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by visiting our Data Deletion page or emailing us.`,
  },
  {
    title: '6. Security',
    body: `We take reasonable measures to protect your personal information from loss, theft, misuse, and unauthorised access. Your data is stored securely via Supabase with row-level security policies enforced.`,
  },
  {
    title: '7. Your Rights',
    body: `You have the right to:\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data\n• Withdraw consent for data processing\n\nTo exercise these rights, contact us at ${CONTACT_EMAIL}.`,
  },
  {
    title: '8. Cookies',
    body: `Our web application may use cookies and similar tracking technologies to enhance your experience. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.`,
  },
  {
    title: "9. Children's Privacy",
    body: `${APP_NAME} is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.`,
  },
  {
    title: '11. Contact Us',
    body: `If you have questions about this Privacy Policy, please contact us at:\n\nEmail: ${CONTACT_EMAIL}\nApp: ${APP_NAME}`,
  },
];

export default function PrivacyPolicyPage() {
  const { isDark } = useTheme();
  const router = useRouter();

  const bg     = isDark ? '#0B0F1A' : '#F8FAFC';
  const card   = isDark ? '#1A2236' : '#FFFFFF';
  const border = isDark ? '#1F2D42' : '#E2E8F0';
  const tp     = isDark ? '#F1F5F9' : '#0F172A';
  const ts     = isDark ? '#94A3B8' : '#475569';
  const pri    = '#6C63FF';

  if (Platform.OS === 'web') {
    const CSS = `
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700;900&family=Sora:wght@400;500;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Plus Jakarta Sans', sans-serif; background: ${bg}; color: ${tp}; }
      a { color: ${pri}; text-decoration: none; }
      a:hover { text-decoration: underline; }
    `;

    return (
      <>
        {/* @ts-ignore */}
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div style={{ minHeight: '100vh', background: bg, fontFamily: '"Plus Jakarta Sans", sans-serif', color: tp }}>
          {/* Header */}
          <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '28px 0 20px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
              <button
                onClick={() => router.back()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13, marginBottom: 16 }}
              >
                ← Back
              </button>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: pri, textTransform: 'uppercase', marginBottom: 8 }}>
                Legal
              </p>
              <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, fontWeight: 900, color: tp, letterSpacing: -0.5 }}>
                Privacy Policy
              </h1>
              <p style={{ color: ts, marginTop: 8, fontSize: 14 }}>Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
            <div style={{ background: card, borderRadius: 20, border: `1px solid ${border}`, padding: '32px 36px', marginBottom: 24 }}>
              <p style={{ fontSize: 15, color: ts, lineHeight: 1.75 }}>
                Welcome to <strong style={{ color: tp }}>{APP_NAME}</strong>. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.
              </p>
            </div>

            {sections.map((s, i) => (
              <div key={i} style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, padding: '24px 28px', marginBottom: 12 }}>
                <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 15, fontWeight: 800, color: tp, marginBottom: 12 }}>{s.title}</h2>
                <p style={{ fontSize: 14, color: ts, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Mobile
  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: pri, textTransform: 'uppercase', marginBottom: 8 }}>Legal</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: tp }}>Privacy Policy</Text>
        <Text style={{ color: ts, marginTop: 6, fontSize: 13 }}>Last updated: {LAST_UPDATED}</Text>
      </View>

      <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 14, color: ts, lineHeight: 22 }}>
          Welcome to <Text style={{ color: tp, fontWeight: '700' }}>{APP_NAME}</Text>. This Privacy Policy explains how we collect, use, and protect your personal information.
        </Text>
      </View>

      {sections.map((s, i) => (
        <View key={i} style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: tp, marginBottom: 10 }}>{s.title}</Text>
          <Text style={{ fontSize: 13, color: ts, lineHeight: 21 }}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
