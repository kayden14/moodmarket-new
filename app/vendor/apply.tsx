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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { applyToBeVendor, getMyApplication } from '@/services/vendorService';
import type { VendorApplication } from '@/services/vendorService';

const PRIMARY = '#FF7A8A';
const BG = '#0B0F1A';
const CARD = '#1A2236';
const BORDER = '#1F2D42';
const TEXT = '#F1F5F9';
const SUB = '#64748B';

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
  const { user, profile, isVendor } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<VendorApplication | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    phone: '',
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
      alert('Please enter your store name.');
      return;
    }
    if (!user?.id) return;
    setSubmitting(true);
    try {
      await applyToBeVendor({
        userId: user.id,
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim() || undefined,
        phone: form.phone.trim() || undefined,
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
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; background: ${BG}; }
    @keyframes va-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes va-spin { to { transform: rotate(360deg); } }
    .va-input { width: 100%; background: ${BG}; border: 1.5px solid ${BORDER}; border-radius: 12px; padding: 13px 16px; font-size: 14px; color: ${TEXT}; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color .18s; }
    .va-input:focus { border-color: ${PRIMARY}; }
    .va-input::placeholder { color: #334155; }
    .va-btn { display: flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 14px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 15px; transition: all .15s; }
    .va-btn:hover { opacity: .88; transform: translateY(-2px); }
    .va-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
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
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${BORDER}`,
            borderTopColor: PRIMARY,
            borderRadius: '50%',
            animation: 'va-spin .8s linear infinite',
          }}
        />
      </div>
    );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            animation: 'va-in .4s ease both',
          }}
        >
          {/* Logo / header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 3,
                color: PRIMARY,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              MoodMarket Vendor
            </p>
            <h1
              style={{
                fontFamily: '"Fraunces", serif',
                fontSize: 32,
                fontWeight: 900,
                color: TEXT,
                letterSpacing: -0.8,
              }}
            >
              Sell on MoodMarket
            </h1>
            <p
              style={{
                fontSize: 14,
                color: SUB,
                marginTop: 10,
                lineHeight: 1.6,
              }}
            >
              Join hundreds of vendors reaching customers through mood-based
              discovery.
            </p>
          </div>

          {/* Status card if application exists */}
          {application &&
            (() => {
              const cfg = STATUS_CONFIG[application.status];
              return (
                <div
                  style={{
                    background: CARD,
                    border: `1px solid ${cfg.color}44`,
                    borderRadius: 20,
                    padding: 32,
                    textAlign: 'center',
                    marginBottom: 24,
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {cfg.icon}
                  </div>
                  <h2
                    style={{
                      fontFamily: '"Fraunces", serif',
                      fontSize: 22,
                      fontWeight: 900,
                      color: cfg.color,
                      marginBottom: 10,
                    }}
                  >
                    {cfg.title}
                  </h2>
                  <p style={{ fontSize: 14, color: SUB, lineHeight: 1.7 }}>
                    {cfg.body}
                  </p>
                  {application.admin_note && (
                    <div
                      style={{
                        marginTop: 16,
                        background: `${cfg.color}12`,
                        border: `1px solid ${cfg.color}33`,
                        borderRadius: 12,
                        padding: '12px 16px',
                        fontSize: 13,
                        color: TEXT,
                        textAlign: 'left',
                      }}
                    >
                      <strong style={{ color: cfg.color }}>
                        Note from admin:{' '}
                      </strong>
                      {application.admin_note}
                    </div>
                  )}
                  {application.status === 'approved' && (
                    <button
                      className="va-btn"
                      onClick={() => router.replace('/vendor' as any)}
                      style={{
                        marginTop: 24,
                        background: PRIMARY,
                        color: '#fff',
                        padding: '14px 32px',
                        width: '100%',
                        boxShadow: `0 6px 20px ${PRIMARY}44`,
                      }}
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
                        background: `${PRIMARY}22`,
                        border: `1px solid ${PRIMARY}55`,
                        color: PRIMARY,
                        padding: '14px 32px',
                        width: '100%',
                      }}
                    >
                      Apply Again
                    </button>
                  )}
                </div>
              );
            })()}

          {/* Application form */}
          {!application && (
            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: 32,
              }}
            >
              <h2
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: 20,
                  fontWeight: 900,
                  color: TEXT,
                  marginBottom: 24,
                }}
              >
                Store Information
              </h2>

              {[
                {
                  label: 'Store Name *',
                  key: 'storeName',
                  placeholder: "e.g. Afia's Wellness Corner",
                  type: 'text',
                },
                {
                  label: 'Email',
                  key: 'email',
                  placeholder: 'example@example.com',
                  type: 'email',
                },
              ].map((f) => (
                <div key={f.key} style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      color: SUB,
                      display: 'block',
                      marginBottom: 7,
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="va-input"
                  />
                </div>
              ))}

              <div style={{ marginBottom: 28 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: SUB,
                    display: 'block',
                    marginBottom: 7,
                  }}
                >
                  Tell us about your store
                </label>
                <textarea
                  placeholder="What do you sell? What makes your store special? (optional)"
                  value={form.storeDescription}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      storeDescription: e.target.value,
                    }))
                  }
                  className="va-input"
                  style={{ height: 100, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <button
                className="va-btn"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  background: PRIMARY,
                  color: '#fff',
                  padding: '15px',
                  boxShadow: `0 6px 20px ${PRIMARY}44`,
                }}
              >
                {submitting ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(255,255,255,.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'va-spin .7s linear infinite',
                    }}
                  />
                ) : (
                  '🚀 Submit Application'
                )}
              </button>

              <p
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: SUB,
                  marginTop: 16,
                  lineHeight: 1.5,
                }}
              >
                By submitting, you agree to the MoodMarket Vendor Terms.
                Applications are reviewed within 1–2 business days.
              </p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => router.replace('/(tabs)' as any)}
              style={{
                background: 'none',
                border: 'none',
                color: SUB,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontWeight: 600,
              }}
            >
              ← Back to store
            </button>
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
  const { user, isVendor } = useAuth();
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
    if (!user?.id) return;
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
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: Platform.OS === 'ios' ? 60 : 44,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 3,
              color: PRIMARY,
              marginBottom: 8,
            }}
          >
            MOODMARKET VENDOR
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '900',
              color: TEXT,
              letterSpacing: -0.6,
              textAlign: 'center',
            }}
          >
            Sell on MoodMarket
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: SUB,
              marginTop: 8,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            Join vendors reaching customers through mood-based discovery.
          </Text>
        </View>

        {/* Status card */}
        {application &&
          (() => {
            const cfg = STATUS_CONFIG[application.status];
            return (
              <View
                style={{
                  backgroundColor: CARD,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: cfg.color + '44',
                  padding: 24,
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <Text style={{ fontSize: 40, marginBottom: 12 }}>
                  {cfg.icon}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '900',
                    color: cfg.color,
                    marginBottom: 8,
                  }}
                >
                  {cfg.title}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: SUB,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  {cfg.body}
                </Text>
                {application.admin_note && (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: cfg.color + '15',
                      borderRadius: 10,
                      padding: 12,
                      width: '100%',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: TEXT, lineHeight: 18 }}>
                      <Text style={{ fontWeight: '700', color: cfg.color }}>
                        Note:{' '}
                      </Text>
                      {application.admin_note}
                    </Text>
                  </View>
                )}
                {application.status === 'approved' && (
                  <TouchableOpacity
                    style={[
                      ms.btn,
                      { marginTop: 20, backgroundColor: PRIMARY },
                    ]}
                    onPress={() => router.replace('/vendor' as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={ms.btnTxt}>Go to Dashboard →</Text>
                  </TouchableOpacity>
                )}
                {application.status === 'rejected' && (
                  <TouchableOpacity
                    style={[
                      ms.btn,
                      {
                        marginTop: 20,
                        backgroundColor: PRIMARY + '22',
                        borderWidth: 1,
                        borderColor: PRIMARY + '55',
                      },
                    ]}
                    onPress={() => setApplication(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={[ms.btnTxt, { color: PRIMARY }]}>
                      Apply Again
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

        {/* Form */}
        {!application && (
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: BORDER,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: TEXT,
                marginBottom: 24,
              }}
            >
              Store Information
            </Text>

            {[
              {
                label: 'Store Name *',
                key: 'storeName',
                placeholder: "e.g. Afia's Wellness Corner",
                keyboard: 'default' as const,
              },
              {
                label: 'Email',
                key: 'email',
                placeholder: 'example@example.com',
                keyboard: 'default' as const,
              },
            ].map((f) => (
              <View key={f.key} style={{ marginBottom: 16 }}>
                <Text style={ms.label}>{f.label}</Text>
                <TextInput
                  style={ms.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={SUB}
                  value={(form as any)[f.key]}
                  onChangeText={(v) =>
                    setForm((prev) => ({ ...prev, [f.key]: v }))
                  }
                  keyboardType={f.keyboard}
                />
              </View>
            ))}

            <View style={{ marginBottom: 28 }}>
              <Text style={ms.label}>About Your Store</Text>
              <TextInput
                style={[ms.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="What do you sell? What makes your store special? (optional)"
                placeholderTextColor={SUB}
                value={form.storeDescription}
                multiline
                onChangeText={(v) =>
                  setForm((prev) => ({ ...prev, storeDescription: v }))
                }
              />
            </View>

            <TouchableOpacity
              style={[
                ms.btn,
                { backgroundColor: PRIMARY, opacity: submitting ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={ms.btnTxt}>🚀 Submit Application</Text>
              )}
            </TouchableOpacity>

            <Text
              style={{
                textAlign: 'center',
                fontSize: 11,
                color: SUB,
                marginTop: 14,
                lineHeight: 18,
              }}
            >
              Applications are reviewed within 1–2 business days.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{ alignItems: 'center', marginTop: 28, paddingBottom: 40 }}
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Text style={{ color: SUB, fontSize: 13, fontWeight: '600' }}>
            ← Back to store
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function VendorApplyScreen() {
  if (Platform.OS === 'web') return <VendorApplyWeb />;
  return <VendorApplyMobile />;
}

const ms = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: SUB,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: TEXT,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
