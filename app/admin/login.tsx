/**
 * app/admin/login.tsx
 * Admin login — both platforms in one file.
 *  - Mobile: original dark KeyboardAvoidingView layout
 *  - Web:    split-panel design (left brand + right form)
 */

import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

const PRIMARY = '#FF7A8A';

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function AdminLoginWeb() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role, is_suspended').eq('id', authData.user.id).single();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') { 
        await supabase.auth.signOut(); 
        setError('Access denied. This portal is for administrators only.'); 
        return; 
      }
      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        setError('Your account has been suspended.');
        return;
      }
      router.replace('/admin' as any);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes al-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes al-pulse  { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
    @keyframes al-spin   { to { transform: rotate(360deg); } }
    .al-root { display: flex; min-height: 100vh; }
    .al-left {
      width: 44%; background: #0A0F1E;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 48px; position: relative; overflow: hidden;
    }
    .al-right {
      flex: 1; background: #0F172A; display: flex; align-items: center; justify-content: center;
      padding: 48px 60px;
    }
    .al-form-wrap { width: 100%; max-width: 420px; animation: al-fadein .4s ease both; }
    .al-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(255,122,138,.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,122,138,.06) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .al-glow { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .al-stat {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px; padding: 16px 18px; backdrop-filter: blur(8px);
      animation: al-fadein .5s ease both;
    }
    .al-stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .al-stat-val  { font-size: 22px; font-weight: 900; color: #F1F5F9; font-family: 'JetBrains Mono', monospace; }
    .al-stat-lbl  { font-size: 11px; color: #64748B; font-weight: 600; letter-spacing: .5px; }
    .al-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: ${PRIMARY}; margin-bottom: 10px; }
    .al-heading { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 900; color: #F1F5F9; letter-spacing: -.7px; margin-bottom: 6px; }
    .al-sub { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 28px; }
    .al-error { background: #450A0A; border: 1px solid #7F1D1D; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #FCA5A5; font-weight: 500; }
    .al-field { margin-bottom: 16px; }
    .al-label { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 7px; display: block; }
    .al-input-wrap {
      display: flex; align-items: center; gap: 10px;
      background: #1E293B; border: 1.5px solid #334155;
      border-radius: 13px; padding: 0 16px; height: 50px;
      transition: border-color .18s, box-shadow .18s;
    }
    .al-input-wrap.focused { border-color: ${PRIMARY}; box-shadow: 0 0 0 3px ${PRIMARY}22; }
    .al-input-icon { font-size: 16px; color: #475569; flex-shrink: 0; }
    .al-input-wrap input {
      flex: 1; background: none; border: none; outline: none;
      font-size: 15px; color: #F1F5F9; font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .al-input-wrap input::placeholder { color: #334155; }
    .al-eye { background: none; border: none; cursor: pointer; font-size: 15px; color: #475569; padding: 4px; transition: color .15s; }
    .al-eye:hover { color: #94A3B8; }
    .al-btn {
      width: 100%; height: 52px; background: ${PRIMARY}; color: #fff; border: none;
      border-radius: 13px; font-size: 15px; font-weight: 800; cursor: pointer; margin-top: 4px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      box-shadow: 0 8px 24px ${PRIMARY}44;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: transform .15s ease, opacity .15s;
    }
    .al-btn:hover:not(:disabled) { transform: translateY(-2px); }
    .al-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
    .al-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: al-spin .7s linear infinite; }
    .al-back { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid #334155; border-radius: 20px; padding: 6px 14px; color: #64748B; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 24px; transition: border-color .15s, color .15s; }
    .al-back:hover { border-color: #475569; color: #94A3B8; }
    .al-footer { text-align: center; color: #1E293B; font-size: 11px; margin-top: 24px; font-family: 'JetBrains Mono', monospace; }
    @media (max-width: 768px) { .al-left { display: none; } .al-right { padding: 40px 24px; } }
  `;

  const STATS = [
    { icon: '📦', label: 'Products live', val: '—', delay: '0ms', color: '#38BDF822' },
    { icon: '🛒', label: 'Total orders',  val: '—', delay: '80ms', color: '#4ADE8022' },
    { icon: '👥', label: 'Active users',  val: '—', delay: '160ms', color: '#A78BFA22' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="al-root">

        {/* LEFT */}
        <div className="al-left">
          <div className="al-grid" />
          <div className="al-glow" style={{ width: 320, height: 320, background: `${PRIMARY}18`, top: -100, right: -60 }} />
          <div className="al-glow" style={{ width: 200, height: 200, background: 'rgba(167,139,250,.1)', bottom: 40, left: -40 }} />

          <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 320 }}>
            {/* brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: `0 8px 24px ${PRIMARY}55` }}>🛡️</div>
              <div>
                <div style={{ fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 900, color: '#F1F5F9', letterSpacing: -.4 }}>MoodMarket</div>
                <div style={{ fontSize: 11, color: PRIMARY, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin Portal</div>
              </div>
            </div>

            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 28, fontWeight: 900, color: '#F1F5F9', letterSpacing: -.6, marginBottom: 8, lineHeight: 1.15 }}>
              Command<br /><span style={{ color: PRIMARY, fontStyle: 'italic' }}>Center</span>
            </div>
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, marginBottom: 36 }}>
              Manage products, orders, and users from one unified dashboard.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STATS.map((s, i) => (
                <div key={i} className="al-stat" style={{ animationDelay: s.delay }}>
                  <div className="al-stat-icon" style={{ background: s.color }}>{s.icon}</div>
                  <div>
                    <div className="al-stat-val">{s.val}</div>
                    <div className="al-stat-lbl">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="al-right">
          <div className="al-form-wrap">
            <button className="al-back" onClick={() => router.push('/(tabs)' as any)}>← Back to store</button>

            <div className="al-eyebrow">🔒 Restricted Access</div>
            <h1 className="al-heading">Admin Sign In</h1>
            <p className="al-sub">Only authorised administrators can access this portal.</p>

            {error && <div className="al-error">{error}</div>}

            <div className="al-field">
              <label className="al-label">Email Address</label>
              <div className={`al-input-wrap${focused === 'email' ? ' focused' : ''}`}>
                <span className="al-input-icon">✉️</span>
                <input type="email" placeholder="admin@moodmarket.com" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="email" />
              </div>
            </div>

            <div className="al-field">
              <label className="al-label">Password</label>
              <div className={`al-input-wrap${focused === 'pw' ? ' focused' : ''}`}>
                <span className="al-input-icon">🔐</span>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
                <button className="al-eye" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁️'}</button>
              </div>
            </div>

            <button className="al-btn" onClick={handleLogin} disabled={loading}>
              {loading ? <div className="al-spinner" /> : '🛡️ Sign In to Admin Portal'}
            </button>

            <div className="al-footer">MoodMarket Admin v1.0 · Restricted Access</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION (original, unchanged)
───────────────────────────────────────────────────────────────────────── */

function AdminLoginMobile() {
  const router = useRouter();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role, is_suspended').eq('id', authData.user.id).single();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') { 
        await supabase.auth.signOut(); 
        setError('Access denied. This portal is for administrators only.'); 
        return; 
      }
      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        setError('Your account has been suspended.');
        return;
      }
      router.replace('/admin' as any);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.logoWrap}>
          <View style={s.logoCircle}><Shield size={32} color="#fff" strokeWidth={2} /></View>
          <Text style={s.logoTitle}>MoodMarket</Text>
          <Text style={s.logoSub}>Admin Portal</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Admin Sign In</Text>
          <Text style={s.cardSub}>Only authorised administrators can access this portal.</Text>
          {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputRow}>
              <Mail size={16} color="#9CA3AF" style={{ marginRight: 10 }} />
              <TextInput style={s.input} placeholder="admin@moodmarket.com" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <Lock size={16} color="#9CA3AF" style={{ marginRight: 10 }} />
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} color="#9CA3AF" /> : <Eye size={16} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Sign In to Admin Portal</Text>}
          </TouchableOpacity>
        </View>
        <Text style={s.footer}>MoodMarket Admin v1.0 · Restricted Access</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function AdminLoginScreen() {
  if (Platform.OS === 'web') return <AdminLoginWeb />;
  return <AdminLoginMobile />;
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0F172A' },
  inner:      { flex: 1, justifyContent: 'center', padding: 24 },
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 72, height: 72, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  logoTitle:  { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.8 },
  logoSub:    { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 4, letterSpacing: 1 },
  card:       { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#334155' },
  cardTitle:  { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  cardSub:    { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 19 },
  errorBox:   { backgroundColor: '#450A0A', borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:   { color: '#FCA5A5', fontSize: 13, fontWeight: '500' },
  fieldWrap:  { marginBottom: 14 },
  label:      { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 6, letterSpacing: 0.5 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#334155', height: 50 },
  input:      { flex: 1, fontSize: 14, color: '#fff' },
  btn:        { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnTxt:     { color: '#fff', fontSize: 15, fontWeight: '800' },
  footer:     { textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 24 },
});