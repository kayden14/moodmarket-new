import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react-native';

const PRIMARY = '#FF7A8A';
const BG = '#0F0F0F';
const CARD = '#1E1E1E';
const BORDER = '#2A2A2A';
const TEXT = '#F1F5F9';
const SUB = '#A0A0A0';

/* ─── shared auth logic ─── */
async function attemptVendorLogin(
  email: string,
  password: string,
): Promise<string | null> {
  // Returns null on success, error string on failure
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
  if (authError) return authError.message;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', authData.user.id)
    .single();
  if (profileError) return profileError.message;

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return 'Your vendor account has been suspended. Please contact support.';
  }
  if (profile?.role !== 'vendor') {
    await supabase.auth.signOut();
    return 'Access denied. This portal is for approved vendors only. If you have applied, please wait for admin approval.';
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function VendorLoginWeb() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    const err = await attemptVendorLogin(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    await refreshProfile();
    router.replace('/vendor' as any);
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes vl-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes vl-spin   { to { transform: rotate(360deg); } }
    @keyframes vl-float  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .vl-root { display: flex; min-height: 100vh; }
    .vl-left {
      width: 44%; background: #0F0F0F;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 48px; position: relative; overflow: hidden;
    }
    .vl-right {
      flex: 1; background: ${BG}; display: flex; align-items: center; justify-content: center;
      padding: 48px 60px;
    }
    .vl-form-wrap { width: 100%; max-width: 420px; animation: vl-fadein .4s ease both; }
    .vl-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(255,122,138,.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,122,138,.05) 1px, transparent 1px);
      background-size: 48px 48px;
    }
    .vl-glow { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .vl-card {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
      border-radius: 16px; padding: 16px 18px; backdrop-filter: blur(8px);
      animation: vl-fadein .5s ease both;
    }
    .vl-card-icon { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .vl-card-val  { font-size: 20px; font-weight: 900; color: ${TEXT}; font-family: 'JetBrains Mono', monospace; letter-spacing: -0.5px; }
    .vl-card-lbl  { font-size: 11px; color: #64748B; font-weight: 600; letter-spacing: .5px; }
    .vl-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: ${PRIMARY}; margin-bottom: 10px; }
    .vl-heading { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 900; color: ${TEXT}; letter-spacing: -.7px; margin-bottom: 6px; }
    .vl-sub { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 28px; }
    .vl-error { background: #450A0A; border: 1px solid #7F1D1D; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #FCA5A5; font-weight: 500; line-height: 1.5; }
    .vl-field { margin-bottom: 16px; }
    .vl-label { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 7px; display: block; }
    .vl-input-wrap {
      display: flex; align-items: center; gap: 10px;
      background: ${CARD}; border: 1.5px solid ${BORDER};
      border-radius: 13px; padding: 0 16px; height: 50px;
      transition: border-color .18s, box-shadow .18s;
    }
    .vl-input-wrap.focused { border-color: ${PRIMARY}; box-shadow: 0 0 0 3px ${PRIMARY}22; }
    .vl-input-icon { font-size: 16px; color: #475569; flex-shrink: 0; }
    .vl-input-wrap input {
      flex: 1; background: none; border: none; outline: none;
      font-size: 15px; color: ${TEXT}; font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .vl-input-wrap input::placeholder { color: ${BORDER}; }
    .vl-eye { background: none; border: none; cursor: pointer; font-size: 15px; color: #475569; padding: 4px; transition: color .15s; }
    .vl-eye:hover { color: #94A3B8; }
    .vl-btn {
      width: 100%; height: 52px; background: ${PRIMARY}; color: #fff; border: none;
      border-radius: 13px; font-size: 15px; font-weight: 800; cursor: pointer; margin-top: 4px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      box-shadow: 0 8px 24px ${PRIMARY}44;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: transform .15s ease, opacity .15s;
    }
    .vl-btn:hover:not(:disabled) { transform: translateY(-2px); opacity: .92; }
    .vl-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
    .vl-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: vl-spin .7s linear infinite; }
    .vl-back { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid ${BORDER}; border-radius: 20px; padding: 6px 14px; color: #64748B; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 24px; transition: border-color .15s, color .15s; }
    .vl-back:hover { border-color: #475569; color: #94A3B8; }
    .vl-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
    .vl-divider-line { flex: 1; height: 1px; background: ${BORDER}; }
    .vl-divider-txt { font-size: 12px; color: #475569; font-weight: 600; }
    .vl-apply-btn { width: 100%; height: 46px; background: none; border: 1.5px solid ${BORDER}; border-radius: 13px; font-size: 13px; font-weight: 700; color: #64748B; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .vl-apply-btn:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
    .vl-footer { text-align: center; color: #1E293B; font-size: 11px; margin-top: 24px; font-family: 'JetBrains Mono', monospace; }
    @media (max-width: 768px) { .vl-left { display: none; } .vl-right { padding: 40px 24px; } }
  `;

  const PERKS = [
    {
      icon: '📦',
      label: 'Products published',
      val: 'Live',
      color: '#38BDF822',
      delay: '0ms',
    },
    {
      icon: '💰',
      label: 'Paystack payouts',
      val: 'GHS',
      color: '#4ADE8022',
      delay: '80ms',
    },
    {
      icon: '📊',
      label: 'Real-time analytics',
      val: 'Live',
      color: `${PRIMARY}22`,
      delay: '160ms',
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vl-root">
        {/* LEFT — brand panel */}
        <div className="vl-left">
          <div className="vl-grid" />
          <div
            className="vl-glow"
            style={{
              width: 340,
              height: 340,
              background: `${PRIMARY}14`,
              top: -120,
              right: -80,
            }}
          />
          <div
            className="vl-glow"
            style={{
              width: 220,
              height: 220,
              background: 'rgba(56,189,248,.08)',
              bottom: 40,
              left: -60,
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
            {/* logo */}
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
                  animation: 'vl-float 4s ease-in-out infinite',
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
                marginBottom: 8,
                lineHeight: 1.2,
              }}
            >
              Your Store,
              <br />
              <span style={{ color: PRIMARY, fontStyle: 'italic' }}>
                Your Rules.
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#475569',
                lineHeight: 1.65,
                marginBottom: 36,
              }}
            >
              Manage products, track orders, and receive instant payouts — all
              from one dashboard.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PERKS.map((p, i) => (
                <div
                  key={i}
                  className="vl-card"
                  style={{ animationDelay: p.delay }}
                >
                  <div className="vl-card-icon" style={{ background: p.color }}>
                    {p.icon}
                  </div>
                  <div>
                    <div className="vl-card-val">{p.val}</div>
                    <div className="vl-card-lbl">{p.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="vl-right">
          <div className="vl-form-wrap">
            <button
              className="vl-back"
              onClick={() => router.replace('/')}
            >
              ← Back to store
            </button>

            <div className="vl-eyebrow">🏪 Vendor Access</div>
            <h1 className="vl-heading">Vendor Sign In</h1>
            <p className="vl-sub">
              Sign in with your approved vendor account to access the dashboard.
            </p>

            {error && <div className="vl-error">{error}</div>}

            <div className="vl-field">
              <label className="vl-label">Email Address</label>
              <div
                className={`vl-input-wrap${focused === 'email' ? ' focused' : ''}`}
              >
                <span className="vl-input-icon">✉️</span>
                <input
                  type="email"
                  placeholder="you@yourstore.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="vl-field">
              <label className="vl-label">Password</label>
              <div
                className={`vl-input-wrap${focused === 'pw' ? ' focused' : ''}`}
              >
                <span className="vl-input-icon">🔐</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                />
                <button className="vl-eye" onClick={() => setShowPw(!showPw)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="vl-btn" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <div className="vl-spinner" />
              ) : (
                '🏪 Sign In to Vendor Portal'
              )}
            </button>

            <div className="vl-divider">
              <div className="vl-divider-line" />
              <span className="vl-divider-txt">Don't have an account?</span>
              <div className="vl-divider-line" />
            </div>

            <button
              className="vl-apply-btn"
              onClick={() => router.push('/vendor/apply' as any)}
            >
              ✨ Apply to become a vendor
            </button>

            <div className="vl-footer">
              MoodMarket Vendor Portal · Approved vendors only
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION
───────────────────────────────────────────────────────────────────────── */

function VendorLoginMobile() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    const err = await attemptVendorLogin(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    await refreshProfile();
    router.replace('/vendor' as any);
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <View style={s.inner}>
        {/* Back button */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.replace('/')}
        >
          <ChevronLeft size={20} color={SUB} />
          <Text style={s.backBtnTxt}>Back to Store</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Store size={32} color="#fff" strokeWidth={2} />
          </View>
          <Text style={s.logoTitle}>MoodMarket</Text>
          <Text style={s.logoSub}>Vendor Portal</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Vendor Sign In</Text>
          <Text style={s.cardSub}>
            Sign in with your approved vendor account.
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputRow}>
              <Mail size={16} color={SUB} style={{ marginRight: 10 }} />
              <TextInput
                style={s.input}
                placeholder="you@yourstore.com"
                placeholderTextColor={SUB}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <Lock size={16} color={SUB} style={{ marginRight: 10 }} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={SUB}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={16} color={SUB} />
                ) : (
                  <Eye size={16} color={SUB} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnTxt}>Sign In to Vendor Portal</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Apply link */}
        <TouchableOpacity
          style={s.applyLink}
          onPress={() => router.push('/vendor/apply' as any)}
          activeOpacity={0.75}
        >
          <Text style={s.applyLinkTxt}>Not a vendor yet? </Text>
          <Text style={[s.applyLinkTxt, { color: PRIMARY, fontWeight: '700' }]}>
            Apply here →
          </Text>
        </TouchableOpacity>

        <Text style={s.footer}>Approved vendors only · MoodMarket</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function VendorLoginScreen() {
  if (Platform.OS === 'web') return <VendorLoginWeb />;
  return <VendorLoginMobile />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    zIndex: 10,
  },
  backBtnTxt: { color: SUB, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.8,
  },
  logoSub: {
    fontSize: 13,
    color: SUB,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 6 },
  cardSub: { fontSize: 13, color: SUB, marginBottom: 20, lineHeight: 19 },
  errorBox: {
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorTxt: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  fieldWrap: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: SUB,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    height: 50,
  },
  input: { flex: 1, fontSize: 14, color: TEXT },
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  applyLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  applyLinkTxt: { fontSize: 14, color: SUB },
  footer: { textAlign: 'center', color: BORDER, fontSize: 11, marginTop: 16 },
});
