// app/(auth)/signup.tsx

import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayoutWeb } from '@/components/AuthLayoutWeb';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

// ── Google Icon ───────────────────────────────────────────────────────────────

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

// ── Web Signup ────────────────────────────────────────────────────────────────

const WEB_CSS = `
  .su-features { display: flex; gap: 6px; margin-bottom: 28px; flex-wrap: wrap; }
  .su-feature-pill {
    display: flex; align-items: center; gap: 5px;
    background: #F9FAFB; border: 1px solid #F1F5F9;
    border-radius: 20px; padding: 5px 12px;
    font-size: 11px; font-weight: 600; color: #6B7280;
  }
  .su-google-btn {
    width: 100%; height: 52px;
    background: #fff; border: 1.5px solid #E5E7EB;
    border-radius: 14px; display: flex; align-items: center;
    justify-content: center; gap: 12px; cursor: pointer;
    font-size: 15px; font-weight: 700; color: #374151;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: box-shadow 0.18s, border-color 0.18s, transform 0.14s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .su-google-btn:hover { border-color: #4285F4; box-shadow: 0 4px 16px rgba(66,133,244,0.16); transform: translateY(-2px); }
  .su-google-btn:active { transform: translateY(0); }
  .su-strength-wrap { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .su-strength-bars { display: flex; gap: 4px; flex: 1; }
  .su-strength-bar { flex: 1; height: 5px; border-radius: 3px; transition: background 0.3s; }
  .su-terms { font-size: 12px; color: #9CA3AF; line-height: 1.6; margin-bottom: 20px; text-align: center; }
  .su-terms a { color: #FF7A8A; font-weight: 700; text-decoration: none; }
  .su-terms a:hover { text-decoration: underline; }
  .su-trust { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #F1F5F9; }
  .su-trust-item { font-size: 11px; font-weight: 600; color: #9CA3AF; }
`;

function SignupScreenWeb() {
  const router = useRouter();
  const { signUp, signInWithOAuth } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocused] = useState<string | null>(null);

  const isValidEmail = (val: string) =>
    /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(val.trim());

  const handleSignup = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address (e.g. you@example.com)'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try { await signUp(email.trim(), password, name); router.replace('/(tabs)'); }
    catch (err: any) { setError(err.message || 'Failed to create account'); }
    finally { setLoading(false); }
  };

  const getStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { level: 1, label: 'Too short', color: '#EF4444' };
    if (password.length < 8) return { level: 2, label: 'Weak', color: '#F97316' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { level: 3, label: 'Fair', color: '#EAB308' };
    return { level: 4, label: 'Strong', color: '#22C55E' };
  };
  const strength = getStrength();

  return (
    <AuthLayoutWeb
      eyebrow="Join MoodMarket"
      heading={<>Shop by <em>how you feel.</em></>}
      subheading="Create your free account and let AI curate your perfect vibe."
      error={error}
      footer={
        <>
          <span>Already have an account?</span>
          <button className="auth-footer-link" onClick={() => router.push('/login')}>Sign in</button>
        </>
      }
    >
      <style dangerouslySetInnerHTML={{ __html: WEB_CSS }} />

      <div className="su-features">
        {['🧠 AI Mood Scan', '🛍️ 10k+ Products', '🚀 Fast Delivery'].map(f => (
          <div key={f} className="su-feature-pill">{f}</div>
        ))}
      </div>

      <button className="su-google-btn" onClick={() => signInWithOAuth('google')}>
        <GoogleIcon size={20} /> Continue with Google
      </button>

      <div className="auth-divider">
        <div className="auth-divider-line" />
        <span className="auth-divider-text">or create with email</span>
        <div className="auth-divider-line" />
      </div>

      <div className="auth-field">
        <div className="auth-field-header"><label className="auth-field-label">Full name</label></div>
        <div className={`auth-input-wrap${focusedField === 'name' ? ' focused' : ''}`}>
          <span className="auth-input-icon">👤</span>
          <input type="text" placeholder="Jane Doe" value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && handleSignup()} autoComplete="name" />
        </div>
      </div>

      <div className="auth-field">
        <div className="auth-field-header"><label className="auth-field-label">Email address</label></div>
        <div className={`auth-input-wrap${focusedField === 'email' ? ' focused' : ''}`}>
          <span className="auth-input-icon">✉️</span>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && handleSignup()} autoComplete="email" />
        </div>
      </div>

      <div className="auth-field">
        <div className="auth-field-header"><label className="auth-field-label">Password</label></div>
        <div className={`auth-input-wrap${focusedField === 'password' ? ' focused' : ''}`}>
          <span className="auth-input-icon">🔒</span>
          <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters" value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && handleSignup()} autoComplete="new-password" />
          <button className="auth-eye-btn" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁️'}</button>
        </div>
        {strength && (
          <div className="su-strength-wrap">
            <div className="su-strength-bars">
              {[1,2,3,4].map(i => (
                <div key={i} className="su-strength-bar"
                  style={{ background: i <= strength.level ? strength.color : '#E5E7EB' }} />
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: strength.color, width: 60 }}>{strength.label}</span>
          </div>
        )}
      </div>

      <p className="su-terms">
        By signing up you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </p>

      <button className="auth-cta" onClick={handleSignup} disabled={loading}>
        {loading ? <div className="auth-spinner" /> : '✨ Create Free Account'}
      </button>

      <div className="su-trust">
        {['🔒 256-bit SSL', '🛡️ No spam ever', '✅ Free forever'].map(t => (
          <div key={t} className="su-trust-item">{t}</div>
        ))}
      </div>
    </AuthLayoutWeb>
  );
}

// ── Mobile Signup — mirrors Login design exactly ──────────────────────────────

function SignupScreenMobile() {
  const router = useRouter();
  const { signUp, signInWithOAuth } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const isValidEmail = (val: string) =>
    /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(val.trim());

  const handleSignup = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address (e.g. you@example.com)'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try { await signUp(email.trim(), password, name); router.replace('/(tabs)'); }
    catch (err: any) { setError(err.message || 'Failed to create account'); }
    finally { setLoading(false); }
  };

  const getStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { level: 1, label: 'Too short', color: '#EF4444' };
    if (password.length < 8) return { level: 2, label: 'Weak', color: '#F97316' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { level: 3, label: 'Fair', color: '#EAB308' };
    return { level: 4, label: 'Strong', color: '#22C55E' };
  };
  const strength = getStrength();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF0F2' }}>
      <KeyboardAvoidingView style={ms.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Back Button */}
        <TouchableOpacity style={ms.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={ms.backArrow}>←</Text>
        </TouchableOpacity>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.scrollContent} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">

          {/* Header — identical to login */}
          <View style={ms.header}>
          <View style={ms.logoMark}>
            <Text style={ms.logoMarkText}>M</Text>
          </View>
          <Text style={ms.logo}>MoodMarket</Text>
          <Text style={ms.tagline}>Shop by how you feel</Text>
        </View>

        {/* Card — identical card design to login */}
        <View style={ms.card}>
          <Text style={ms.cardTitle}>Create account</Text>
          <Text style={ms.cardSubtitle}>Join thousands shopping by mood</Text>

          {error ? (
            <View style={ms.errorBox}><Text style={ms.errorText}>{error}</Text></View>
          ) : null}

          {/* Full Name */}
          <Text style={ms.label}>Full name</Text>
          <View style={[ms.inputBox, nameFocused && ms.inputFocused]}>
            <User size={18} color={nameFocused ? PRIMARY : '#9CA3AF'} />
            <TextInput style={ms.input} value={name} onChangeText={setName}
              placeholder="Jane Doe" placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)} />
          </View>

          {/* Email */}
          <Text style={ms.label}>Email</Text>
          <View style={[ms.inputBox, emailFocused && ms.inputFocused]}>
            <Mail size={18} color={emailFocused ? PRIMARY : '#9CA3AF'} />
            <TextInput style={ms.input} value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor="#9CA3AF"
              autoCapitalize="none" keyboardType="email-address"
              onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} />
          </View>

          {/* Password */}
          <Text style={ms.label}>Password</Text>
          <View style={[ms.inputBox, passwordFocused && ms.inputFocused]}>
            <Lock size={18} color={passwordFocused ? PRIMARY : '#9CA3AF'} />
            <TextInput style={ms.input} value={password} onChangeText={setPassword}
              placeholder="Min. 6 characters" placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={ms.eyeBtn}>
              {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
            </TouchableOpacity>
          </View>

          {/* Strength bars */}
          {strength && (
            <View style={ms.strengthRow}>
              <View style={ms.strengthBars}>
                {[1,2,3,4].map(i => (
                  <View key={i} style={[ms.strengthBar, { backgroundColor: i <= strength.level ? strength.color : '#E5E7EB' }]} />
                ))}
              </View>
              <Text style={[ms.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {/* Create Account button */}
          <TouchableOpacity style={ms.button} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={ms.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={ms.divider}>
            <View style={ms.dividerLine} />
            <Text style={ms.dividerText}>or continue with</Text>
            <View style={ms.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={ms.socialBtn} activeOpacity={0.85} onPress={() => signInWithOAuth('google')}>
            <GoogleIcon size={20} />
            <Text style={ms.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* ← Already have an account — same position as login's "Don't have an account?" */}
          <View style={ms.signinRow}>
            <Text style={ms.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={ms.signinLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <Text style={ms.secureBadge}>🔒 Secured with 256-bit encryption</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  if (Platform.OS === 'web') return <SignupScreenWeb />;
  return <SignupScreenMobile />;
}

// ── Mobile Styles (mirrors login's `ms` stylesheet exactly) ──────────────────

const PRIMARY = '#FF7A8A';

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F2' },
  scrollContent: { padding: 16, paddingBottom: 80 },

  backBtn: {
    position: 'absolute', top: 12, left: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#1A1A1A', fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: 16, marginTop: 10 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38, shadowRadius: 16, elevation: 8,
  },
  logoMarkText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  logo: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 2 },
  tagline: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  card: {
    backgroundColor: '#fff', padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.4, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },

  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 12,
    marginBottom: 10, backgroundColor: '#F9FAFB',
    height: 46, gap: 10,
  },
  inputFocused: { borderColor: PRIMARY, backgroundColor: '#FFF5F6' },
  input: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 0 },
  eyeBtn: { padding: 4 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4, marginBottom: 10 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 10, fontWeight: '700', width: 50, textAlign: 'right' },

  button: {
    backgroundColor: PRIMARY, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 48, backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 16,
  },
  socialBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },

  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  signinText: { fontSize: 13, color: '#1F2937', fontWeight: '600' },
  signinLink: { fontSize: 13, fontWeight: '800', color: '#E11D48' },

  secureBadge: { textAlign: 'center', fontSize: 10, color: '#9CA3AF' },

  errorBox: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  errorText: { color: '#DC2626', textAlign: 'center', fontSize: 12, fontWeight: '500' },
});
