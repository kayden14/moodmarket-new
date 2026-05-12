/**
 * app/data-deletion.tsx
 * Required by Facebook OAuth — accessible at /data-deletion
 * Facebook also accepts this as the "Data Deletion Callback URL"
 */

import { Platform, ScrollView, Text, View, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';

const CONTACT_EMAIL = 'support@moodmarket.app';
const APP_NAME = 'MoodMarket';

const steps = [
  {
    num: '01',
    title: 'Remove app from Facebook',
    body: 'Go to your Facebook Settings → Security and Login → Apps and Websites. Find MoodMarket and click Remove.',
  },
  {
    num: '02',
    title: 'Delete your MoodMarket account',
    body: 'Open MoodMarket, go to Profile → Settings → Delete Account. This will permanently remove your account and all associated data from our servers.',
  },
  {
    num: '03',
    title: 'Or email us directly',
    body: `Send a deletion request to ${CONTACT_EMAIL} with the subject line "Data Deletion Request". Include the email address associated with your account. We will process your request within 30 days and send a confirmation.`,
  },
];

export default function DataDeletionPage() {
  const { isDark } = useTheme();
  const router = useRouter();

  const bg     = isDark ? '#0B0F1A' : '#F8FAFC';
  const card   = isDark ? '#1A2236' : '#FFFFFF';
  const border = isDark ? '#1F2D42' : '#E2E8F0';
  const tp     = isDark ? '#F1F5F9' : '#0F172A';
  const ts     = isDark ? '#94A3B8' : '#475569';
  const pri    = '#6C63FF';
  const red    = '#EF4444';

  if (Platform.OS === 'web') {
    const CSS = `
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700;900&family=Sora:wght@400;500;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Sora', sans-serif; background: ${bg}; color: ${tp}; }
      a { color: ${pri}; }
    `;

    return (
      <>
        {/* @ts-ignore */}
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div style={{ minHeight: '100vh', background: bg, fontFamily: '"Sora", sans-serif', color: tp }}>
          {/* Header */}
          <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '28px 0 20px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
              <button
                onClick={() => router.back()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: ts, fontFamily: '"Sora", sans-serif', fontSize: 13, marginBottom: 16 }}
              >
                ← Back
              </button>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: red, textTransform: 'uppercase', marginBottom: 8 }}>
                Legal
              </p>
              <h1 style={{ fontFamily: '"Lora", serif', fontSize: 36, fontWeight: 900, color: tp, letterSpacing: -0.5 }}>
                Data Deletion
              </h1>
              <p style={{ color: ts, marginTop: 8, fontSize: 14 }}>
                You have the right to request deletion of all personal data we hold about you.
              </p>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
            {/* Info banner */}
            <div style={{ background: isDark ? '#2D0D0D' : '#FEF2F2', border: `1px solid ${isDark ? '#5C1A1A' : '#FECACA'}`, borderRadius: 16, padding: '20px 24px', marginBottom: 32 }}>
              <p style={{ fontSize: 14, color: isDark ? '#FCA5A5' : '#DC2626', lineHeight: 1.75 }}>
                When you delete your data, we permanently remove your account, mood history, orders, and all personal information from our systems. This action <strong>cannot be undone</strong>.
              </p>
            </div>

            <h2 style={{ fontFamily: '"Lora", serif', fontSize: 22, fontWeight: 900, color: tp, marginBottom: 20 }}>
              How to delete your data
            </h2>

            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, background: card, borderRadius: 16, border: `1px solid ${border}`, padding: '24px 28px', marginBottom: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: `${pri}55`, flexShrink: 0, minWidth: 40, fontFamily: '"Lora", serif' }}>{s.num}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: tp, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: ts, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{s.body}</p>
                </div>
              </div>
            ))}

            {/* Email CTA */}
            <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, padding: '28px', marginTop: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: ts, marginBottom: 16 }}>Ready to delete your data? Email us directly:</p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Data Deletion Request&body=Please delete all data associated with my account. My registered email is: `}
                style={{
                  display: 'inline-block',
                  background: red,
                  color: '#fff',
                  borderRadius: 12,
                  padding: '12px 28px',
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: 'none',
                  fontFamily: '"Sora", sans-serif',
                }}
              >
                Send Deletion Request →
              </a>
              <p style={{ fontSize: 12, color: ts, marginTop: 12 }}>We will confirm deletion within 30 days.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Mobile
  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: red, textTransform: 'uppercase', marginBottom: 8 }}>Legal</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: tp }}>Data Deletion</Text>
        <Text style={{ color: ts, marginTop: 6, fontSize: 13, lineHeight: 20 }}>
          You have the right to request deletion of all personal data we hold.
        </Text>
      </View>

      <View style={{ backgroundColor: isDark ? '#2D0D0D' : '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: isDark ? '#5C1A1A' : '#FECACA', padding: 16, marginBottom: 24 }}>
        <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontSize: 13, lineHeight: 20 }}>
          Deleting your data permanently removes your account, mood history, orders, and all personal information. This cannot be undone.
        </Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', color: tp, marginBottom: 16 }}>How to delete your data</Text>

      {steps.map((s, i) => (
        <View key={i} style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20, marginBottom: 10, flexDirection: 'row', gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: `${pri}88`, minWidth: 32 }}>{s.num}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: tp, marginBottom: 6 }}>{s.title}</Text>
            <Text style={{ fontSize: 13, color: ts, lineHeight: 20 }}>{s.body}</Text>
          </View>
        </View>
      ))}

      <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20, marginTop: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: ts, marginBottom: 14, textAlign: 'center' }}>Email us to request data deletion:</Text>
        <Text
          style={{ color: red, fontWeight: '700', fontSize: 14 }}
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Data Deletion Request`)}
        >
          {CONTACT_EMAIL}
        </Text>
        <Text style={{ fontSize: 12, color: ts, marginTop: 10 }}>We will confirm deletion within 30 days.</Text>
      </View>
    </ScrollView>
  );
}
