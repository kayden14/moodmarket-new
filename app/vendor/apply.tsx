/**
 * app/vendor/apply.tsx
 * Vendor application screen — both web and mobile.
 * Customers fill in store details and submit for admin review.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { applyToBeVendor, getMyApplication } from '@/services/vendorService';
import type { VendorApplication } from '@/services/vendorService';
import { Store, Mail, FileText, ChevronLeft } from 'lucide-react-native';

const PRIMARY = '#FF7A8A';
const BG = '#0F172A';
const CARD = '#1E293B';
const BORDER = '#334155';
const TEXT = '#F1F5F9';
const SUB = '#94A3B8';

const STATUS_CONFIG = {
  pending: {
    icon: '⏳',
    title: 'Application Pending',
    body: "Our team is reviewing your store application. This usually takes 1–2 business days. We'll notify you once a decision has been made.",
    color: '#F59E0B',
  },
  approved: {
    icon: '🎉',
    title: "You're Approved!",
    body: 'Your store is live. Head to your vendor dashboard to start adding products and selling.',
    color: '#4ADE80',
  },
  rejected: {
    icon: '❌',
    title: 'Application Not Approved',
    body: 'Unfortunately your application was not approved at this time. You may re-apply with updated information.',
    color: '#F87171',
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function VendorApplyWeb() {
  const { user, isVendor, refreshProfile } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<VendorApplication | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    email: '',
  });
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (isVendor) {
      router.replace('/vendor' as any);
      return;
    }
    if (user?.id) {
      getMyApplication(user.id).then((app) => {
        setApplication(app);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, isVendor]);

  const handleSubmit = async () => {
    if (!form.storeName.trim()) {
      alert('Please enter your store name.');
      return;
    }
    if (!user?.id) {
      alert('You must be signed in to apply.');
      return;
    }
    setSubmitting(true);
    try {
      await applyToBeVendor({
        userId: user.id,
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      const app = await getMyApplication(user.id);
      setApplication(app);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes va-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes va-spin   { to { transform: rotate(360deg); } }
    @keyframes va-float  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .va-root { display: flex; min-height: 100vh; }
    .va-left {
      width: 44%; background: linear-gradient(160deg, #0A0F1E 0%, #0F1829 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 48px; position: relative; overflow: hidden;
    }
    .va-right {
      flex: 1; background: ${BG}; display: flex; align-items: center; justify-content: center;
      padding: 48px 60px;
    }
    .va-form-wrap { width: 100%; max-width: 460px; animation: va-fadein .4s ease both; }
    .va-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(255,122,138,.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,122,138,.05) 1px, transparent 1px);
      background-size: 48px 48px;
    }
    .va-glow { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .va-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: ${PRIMARY}; margin-bottom: 10px; }
    .va-heading { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 900; color: ${TEXT}; letter-spacing: -.7px; margin-bottom: 6px; }
    .va-sub { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 28px; }
    .va-field { margin-bottom: 16px; }
    .va-label { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 7px; display: block; }
    .va-input-wrap {
      display: flex; align-items: center; gap: 10px;
      background: ${CARD}; border: 1.5px solid ${BORDER};
      border-radius: 13px; padding: 0 16px; min-height: 50px;
      transition: border-color .18s, box-shadow .18s;
    }
    .va-input-wrap.focused { border-color: ${PRIMARY}; box-shadow: 0 0 0 3px ${PRIMARY}22; }
    .va-input-wrap input, .va-input-wrap textarea {
      flex: 1; background: none; border: none; outline: none;
      font-size: 15px; color: ${TEXT}; font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 12px 0;
    }
    .va-input-wrap input::placeholder, .va-input-wrap textarea::placeholder { color: ${BORDER}; }
    .va-btn {
      width: 100%; height: 52px; background: ${PRIMARY}; color: #fff; border: none;
      border-radius: 13px; font-size: 15px; font-weight: 800; cursor: pointer; margin-top: 4px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      box-shadow: 0 8px 24px ${PRIMARY}44;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: transform .15s ease, opacity .15s;
    }
    .va-btn:hover:not(:disabled) { transform: translateY(-2px); opacity: .92; }
    .va-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
    .va-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: va-spin .7s linear infinite; }
    .va-back { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid ${BORDER}; border-radius: 20px; padding: 6px 14px; color: #64748B; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 12px; transition: border-color .15s, color .15s; }
    .va-back:hover { border-color: #475569; color: #94A3B8; }
    .va-back-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .va-vendor-link { background: none; border: none; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; text-decoration: underline; padding: 0; transition: color .15s; }
    .va-vendor-link:hover { color: #94A3B8; }
    .va-status-card {
      background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 20px; padding: 32px; text-align: center;
    }
    @media (max-width: 768px) { .va-left { display: none; } .va-right { padding: 40px 24px; } }
  `;

  if (loading)
    return (
      <div
        style={{
          height: '100vh',
          background: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="va-spinner" style={{ width: 36, height: 36 }} />
      </div>
    );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="va-root">
        {/* LEFT — brand panel */}
        <div className="va-left">
          <div className="va-grid" />
          <div
            className="va-glow"
            style={{
              width: 340,
              height: 340,
              background: `${PRIMARY}14`,
              top: -120,
              right: -80,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 48,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: PRIMARY,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  boxShadow: `0 8px 24px ${PRIMARY}55`,
                  animation: 'va-float 4s ease-in-out infinite',
                }}
              >
                🏪
              </div>
              <div>
                <div
                  style={{
                    fontFamily: '"Fraunces", serif',
                    fontSize: 22,
                    fontWeight: 900,
                    color: TEXT,
                    letterSpacing: -0.4,
                  }}
                >
                  MoodMarket
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: PRIMARY,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Vendor Portal
                </div>
              </div>
            </div>

            <div
              style={{
                fontFamily: '"Fraunces", serif',
                fontSize: 28,
                fontWeight: 900,
                color: TEXT,
                letterSpacing: -0.6,
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              Start Selling,
              <br />
              <span style={{ color: PRIMARY, fontStyle: 'italic' }}>
                Start Growing.
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>
              Join hundreds of vendors reaching customers through mood-based
              discovery. Apply today and get approved in 24 hours.
            </p>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="va-right">
          <div className="va-form-wrap">
            <div className="va-back-row">
              <button
                className="va-back"
                onClick={() => router.replace('/')}
              >
                ← Back to Store
              </button>
              <button
                className="va-vendor-link"
                onClick={() => router.push('/vendor/login' as any)}
              >
                Already a vendor? Login
              </button>
            </div>

            {application ? (
              <div className="va-status-card">
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                  {STATUS_CONFIG[application.status].icon}
                </div>
                <h2
                  style={{
                    fontFamily: '"Fraunces", serif',
                    fontSize: 22,
                    fontWeight: 900,
                    color: STATUS_CONFIG[application.status].color,
                    marginBottom: 10,
                  }}
                >
                  {STATUS_CONFIG[application.status].title}
                </h2>
                <p style={{ fontSize: 14, color: SUB, lineHeight: 1.7 }}>
                  {STATUS_CONFIG[application.status].body}
                </p>
                {application.admin_note && (
                  <div
                    style={{
                      marginTop: 20,
                      background: 'rgba(255,255,255,.03)',
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 13,
                      color: TEXT,
                      textAlign: 'left',
                      borderLeft: `3px solid ${STATUS_CONFIG[application.status].color}`,
                    }}
                  >
                    <strong>Admin Note:</strong> {application.admin_note}
                  </div>
                )}
                {application.status === 'approved' && (
                  <button
                    className="va-btn"
                    onClick={async () => {
                      await refreshProfile();
                      router.replace('/vendor' as any);
                    }}
                    style={{ marginTop: 24 }}
                  >
                    Go to Dashboard →
                  </button>
                )}
                {application.status === 'rejected' && (
                  <button
                    className="va-btn"
                    onClick={() => setApplication(null)}
                    style={{
                      marginTop: 24,
                      background: 'none',
                      border: `1.5px solid ${BORDER}`,
                    }}
                  >
                    Apply Again
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="va-eyebrow">✨ New Vendor Application</div>
                <h1 className="va-heading">Apply to Sell</h1>
                <p className="va-sub">
                  Tell us about your store. We'll review your application and
                  get back to you shortly.
                </p>

                <div className="va-field">
                  <label className="va-label">Store Name *</label>
                  <div
                    className={`va-input-wrap${focused === 'name' ? ' focused' : ''}`}
                  >
                    <input
                      placeholder="e.g. Afia's Wellness Corner"
                      value={form.storeName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          storeName: e.target.value,
                        }))
                      }
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                    />
                  </div>
                </div>

                <div className="va-field">
                  <label className="va-label">Contact Email Address</label>
                  <div
                    className={`va-input-wrap${focused === 'email' ? ' focused' : ''}`}
                  >
                    <input
                      type="email"
                      placeholder="you@yourstore.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                    />
                  </div>
                </div>

                <div className="va-field">
                  <label className="va-label">About Your Store</label>
                  <div
                    className={`va-input-wrap${focused === 'desc' ? ' focused' : ''}`}
                  >
                    <textarea
                      placeholder="What do you sell? (optional)"
                      rows={3}
                      value={form.storeDescription}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          storeDescription: e.target.value,
                        }))
                      }
                      onFocus={() => setFocused('desc')}
                      onBlur={() => setFocused(null)}
                    />
                  </div>
                </div>

                <button
                  className="va-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="va-spinner" />
                  ) : (
                    '🚀 Submit Vendor Application'
                  )}
                </button>

                <p
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: BORDER,
                    marginTop: 20,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  Secure Vendor Onboarding · MoodMarket
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION
───────────────────────────────────────────────────────────────────────── */

function VendorApplyMobile() {
  const { user, isVendor, refreshProfile } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<VendorApplication | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    email: '',
  });

  useEffect(() => {
    if (isVendor) {
      router.replace('/vendor' as any);
      return;
    }
    if (user?.id) {
      getMyApplication(user.id).then((app) => {
        setApplication(app);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, isVendor]);

  const handleSubmit = async () => {
    if (!form.storeName.trim()) {
      Alert.alert('Error', 'Please enter your store name.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to apply.');
      return;
    }
    setSubmitting(true);
    try {
      await applyToBeVendor({
        userId: user.id,
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      const app = await getMyApplication(user.id);
      setApplication(app);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace('/')}
          >
            <ChevronLeft size={20} color={SUB} />
            <Text style={s.backBtnTxt}>Back to Store</Text>
          </TouchableOpacity>

          <View style={s.logoCircle}>
            <Store size={32} color="#fff" />
          </View>
          <Text style={s.title}>Become a Vendor</Text>
          <Text style={s.subtitle}>
            Reach more customers with mood-based discovery.
          </Text>
        </View>

        {application ? (
          <View style={s.statusCard}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>
              {STATUS_CONFIG[application.status].icon}
            </Text>
            <Text
              style={[
                s.statusTitle,
                { color: STATUS_CONFIG[application.status].color },
              ]}
            >
              {STATUS_CONFIG[application.status].title}
            </Text>
            <Text style={s.statusBody}>
              {STATUS_CONFIG[application.status].body}
            </Text>

            {application.admin_note && (
              <View style={s.adminNote}>
                <Text style={s.adminNoteTitle}>Admin Note:</Text>
                <Text style={s.adminNoteText}>{application.admin_note}</Text>
              </View>
            )}

            {application.status === 'approved' && (
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={async () => {
                  await refreshProfile();
                  router.replace('/vendor' as any);
                }}
              >
                <Text style={s.primaryBtnTxt}>Go to Dashboard →</Text>
              </TouchableOpacity>
            )}

            {application.status === 'rejected' && (
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => setApplication(null)}
              >
                <Text style={s.secondaryBtnTxt}>Apply Again</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.formCard}>
            {/* Store Name */}
            <View style={s.field}>
              <Text style={s.label}>Store Name *</Text>
              <View style={s.inputRow}>
                <Store size={16} color={SUB} style={{ marginRight: 10 }} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. Afia's Wellness Corner"
                  placeholderTextColor={SUB}
                  value={form.storeName}
                  onChangeText={(v) =>
                    setForm((prev) => ({ ...prev, storeName: v }))
                  }
                />
              </View>
            </View>

            {/* Email */}
            <View style={s.field}>
              <Text style={s.label}>Contact Email</Text>
              <View style={s.inputRow}>
                <Mail size={16} color={SUB} style={{ marginRight: 10 }} />
                <TextInput
                  style={s.input}
                  placeholder="you@yourstore.com"
                  placeholderTextColor={SUB}
                  value={form.email}
                  onChangeText={(v) =>
                    setForm((prev) => ({ ...prev, email: v }))
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Description */}
            <View style={s.field}>
              <Text style={s.label}>About Your Store</Text>
              <View style={[s.inputRow, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <FileText size={16} color={SUB} style={{ marginRight: 10, marginTop: 2 }} />
                <TextInput
                  style={[s.input, { height: '100%' }]}
                  placeholder="What do you sell?"
                  placeholderTextColor={SUB}
                  value={form.storeDescription}
                  onChangeText={(v) =>
                    setForm((prev) => ({ ...prev, storeDescription: v }))
                  }
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnTxt}>🚀 Submit Application</Text>
              )}
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              Applications are usually reviewed within 24 hours.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={s.footerLink}
          onPress={() => router.replace('/' as any)}
        >
          <Text style={s.footerLinkTxt}>← Back to Consumer Store</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function VendorApplyScreen() {
  if (Platform.OS === 'web') return <VendorApplyWeb />;
  return <VendorApplyMobile />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  scroll: { padding: 24, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: Platform.OS === 'ios' ? 20 : 0 },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  backBtnTxt: { color: SUB, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: 26, fontWeight: '900', color: TEXT, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: SUB, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  formCard: { backgroundColor: CARD, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: BORDER },
  statusCard: { backgroundColor: CARD, borderRadius: 24, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  statusTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  statusBody: { fontSize: 14, color: SUB, textAlign: 'center', lineHeight: 22 },
  adminNote: { backgroundColor: BG, padding: 16, borderRadius: 16, width: '100%', marginTop: 24, borderLeftWidth: 3, borderLeftColor: PRIMARY },
  adminNoteTitle: { fontSize: 12, fontWeight: '800', color: PRIMARY, marginBottom: 4 },
  adminNoteText: { fontSize: 13, color: TEXT, lineHeight: 18 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: SUB, marginBottom: 8, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    height: 54,
  },
  input: { flex: 1, fontSize: 15, color: TEXT },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    marginTop: 16,
    height: 50,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnTxt: { color: SUB, fontSize: 14, fontWeight: '700' },
  disclaimer: { textAlign: 'center', color: BORDER, fontSize: 11, marginTop: 16, fontWeight: '600' },
  footerLink: { marginTop: 32, alignItems: 'center' },
  footerLinkTxt: { color: SUB, fontSize: 13, fontWeight: '600' },
});
