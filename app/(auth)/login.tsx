/**
 * app/login.tsx
 *
 * Single file for both platforms:
 *  - Android/iOS  → LoginScreenMobile (with branded logo mark)
 *  - Web          → LoginScreenWeb (beautiful split-panel design)
 *
 * Platform switch happens at the default export — no .web.tsx split needed.
 *
 * UPDATE: Tapping/clicking the MoodMarket logo mark navigates to /admin
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import EmojiText from '@/components/EmojiText';
import { ArrowRight } from 'lucide-react-native';

/* ─────────────────────────────────────────────────────────────────────────
   SOCIAL ICONS  (shared)
───────────────────────────────────────────────────────────────────────── */

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const AppleIcon = ({
  color = '#000',
  size = 20,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </Svg>
);

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
    <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────────────────
   WEB LOGIN
───────────────────────────────────────────────────────────────────────── */

function LoginScreenWeb() {
  const router = useRouter();
  const { signIn, signInWithOAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [focusedField, setFocused] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Lora:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }

    .auth-root {
      min-height: 100vh; display: flex;
      font-family: 'Sora', sans-serif; background: #fff;
    }

    .auth-left {
      width: 48%; background: linear-gradient(155deg, #FFF0F2 0%, #FFE0E6 60%, #FFDDE4 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 48px; position: relative; overflow: hidden;
    }
    .auth-left-blob {
      position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none;
    }
    .auth-brand { position: relative; z-index: 2; text-align: center; margin-bottom: 48px; }
    .auth-brand-mark {
      width: 72px; height: 72px; border-radius: 22px; background: #FF7A8A;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Lora', serif; font-size: 36px; font-weight: 700; color: #fff;
      margin: 0 auto 16px;
      box-shadow: 0 16px 40px rgba(255,122,138,0.4);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .auth-brand-mark:hover {
      transform: scale(1.07) translateY(-2px);
      box-shadow: 0 22px 48px rgba(255,122,138,0.52);
    }
    .auth-brand-mark:active {
      transform: scale(0.97);
    }
    .auth-brand-name {
      font-family: 'Lora', serif; font-size: 28px; font-weight: 700;
      color: #1A1A1A; letter-spacing: -0.5px; margin-bottom: 6px;
    }
    .auth-brand-tag { font-size: 14px; color: #9CA3AF; font-weight: 500; }

    .auth-testimonials { position: relative; z-index: 2; width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 12px; }
    .auth-testimonial {
      background: rgba(255,255,255,0.82); border: 1px solid #FFE4E8;
      border-radius: 16px; padding: 16px 18px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(255,122,138,0.08);
    }
    .auth-testimonial-text { font-size: 13px; color: #374151; line-height: 1.6; margin-bottom: 10px; font-style: italic; }
    .auth-testimonial-author { display: flex; align-items: center; gap: 8px; }
    .auth-testimonial-avatar {
      width: 28px; height: 28px; border-radius: 14px; background: #FF7A8A;
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff;
    }
    .auth-testimonial-name { font-size: 12px; font-weight: 700; color: #374151; }
    .auth-testimonial-stars { font-size: 11px; color: #FF7A8A; }

    .auth-right {
      width: 52%; display: flex; align-items: center; justify-content: center;
      padding: 48px 60px; background: #fff;
    }
    .auth-form-wrap { width: 100%; max-width: 420px; }

    .auth-eyebrow {
      font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
      color: #FF7A8A; margin-bottom: 10px;
    }
    .auth-heading {
      font-family: 'Lora', serif; font-size: clamp(28px, 3vw, 40px);
      font-weight: 900; color: #1A1A1A; letter-spacing: -0.8px; line-height: 1.15; margin-bottom: 8px;
    }
    .auth-heading em { font-style: italic; color: #FF7A8A; }
    .auth-subheading { font-size: 15px; color: #6B7280; margin-bottom: 32px; line-height: 1.5; }

    .auth-error {
      background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;
      padding: 12px 16px; margin-bottom: 20px;
      font-size: 14px; color: #DC2626; font-weight: 500; text-align: center;
    }

    .auth-field { margin-bottom: 18px; }
    .auth-field-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
    .auth-field-label { font-size: 13px; font-weight: 700; color: #374151; }
    .auth-field-link { font-size: 12px; font-weight: 600; color: #FF7A8A; cursor: pointer; background: none; border: none; font-family: 'Sora', sans-serif; }
    .auth-field-link:hover { text-decoration: underline; }

    .auth-input-wrap {
      display: flex; align-items: center; gap: 10px;
      background: #F9FAFB; border: 1.5px solid #E5E7EB;
      border-radius: 14px; padding: 0 16px; height: 52px;
      transition: border-color 0.18s, background 0.18s;
    }
    .auth-input-wrap.focused { border-color: #FF7A8A; background: #FFF5F6; }
    .auth-input-wrap.error   { border-color: #FCA5A5; background: #FFF5F5; }
    .auth-input-icon { font-size: 17px; flex-shrink: 0; color: #9CA3AF; }
    .auth-input-wrap input {
      flex: 1; background: none; border: none; outline: none;
      font-size: 15px; color: #111827; font-family: 'Sora', sans-serif;
    }
    .auth-input-wrap input::placeholder { color: #9CA3AF; }
    .auth-eye-btn { background: none; border: none; cursor: pointer; font-size: 16px; color: #9CA3AF; padding: 4px; }
    .auth-eye-btn:hover { color: #6B7280; }

    .auth-cta {
      width: 100%; background: #FF7A8A; color: #fff; border: none; border-radius: 14px;
      height: 52px; font-size: 16px; font-weight: 800; cursor: pointer; margin-top: 4px;
      font-family: 'Sora', sans-serif;
      box-shadow: 0 8px 24px rgba(255,122,138,0.3);
      transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .auth-cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,122,138,0.42); }
    .auth-cta:active { transform: translateY(0); opacity: 0.88; }
    .auth-cta:disabled { opacity: 0.55; cursor: not-allowed; }

    .auth-spinner {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-divider { display: flex; align-items: center; gap: 14px; margin: 22px 0; }
    .auth-divider-line { flex: 1; height: 1px; background: #E5E7EB; }
    .auth-divider-text { font-size: 13px; color: #9CA3AF; font-weight: 500; white-space: nowrap; }

    .auth-socials { display: flex; gap: 10px; }
    .auth-social-btn {
      flex: 1; height: 48px; background: #F9FAFB; border: 1.5px solid #E5E7EB;
      border-radius: 13px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.15s, border-color 0.15s, transform 0.12s;
      font-size: 19px;
    }
    .auth-social-btn:hover { background: #F3F4F6; border-color: #D1D5DB; transform: translateY(-1px); }
    .auth-social-btn:active { transform: translateY(0); }

    .auth-footer { display: flex; justify-content: center; align-items: center; gap: 5px; margin-top: 24px; font-size: 14px; color: #6B7280; }
    .auth-footer-link { color: #FF7A8A; font-weight: 700; cursor: pointer; background: none; border: none; font-size: 14px; font-family: 'Sora', sans-serif; }
    .auth-footer-link:hover { text-decoration: underline; }

    .auth-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 500; display: flex; align-items: center; justify-content: center; }
    .auth-modal {
      background: #fff; border-radius: 24px; padding: 32px;
      width: min(440px, 92vw); box-shadow: 0 40px 100px rgba(0,0,0,0.25);
      font-family: 'Sora', sans-serif;
    }
    .auth-modal-title { font-family: 'Lora', serif; font-size: 24px; font-weight: 700; color: #1A1A1A; margin-bottom: 6px; }
    .auth-modal-sub { font-size: 14px; color: #6B7280; margin-bottom: 24px; line-height: 1.6; }
    .auth-modal-close { position: absolute; top: 16px; right: 16px; background: none; border: 1px solid #E5E7EB; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px; color: #6B7280; display: flex; align-items: center; justify-content: center; }
    .auth-modal-close:hover { border-color: #FF7A8A; color: #FF7A8A; }
    .auth-modal-input {
      width: 100%; height: 50px; border: 1.5px solid #E5E7EB; border-radius: 13px;
      padding: 0 16px; font-size: 15px; color: #111827; margin-bottom: 16px;
      font-family: 'Sora', sans-serif; outline: none;
      transition: border-color 0.15s;
    }
    .auth-modal-input:focus { border-color: #FF7A8A; }
    .auth-modal-btn {
      width: 100%; height: 50px; background: #FF7A8A; color: #fff; border: none;
      border-radius: 13px; font-size: 15px; font-weight: 700; cursor: pointer;
      font-family: 'Sora', sans-serif;
      transition: opacity 0.15s, transform 0.15s;
    }
    .auth-modal-btn:hover { opacity: 0.88; transform: translateY(-1px); }
    .auth-modal-cancel { width: 100%; background: none; border: none; margin-top: 12px; color: #9CA3AF; font-size: 14px; cursor: pointer; font-family: 'Sora', sans-serif; }
    .auth-modal-cancel:hover { color: #6B7280; }
    .auth-success-icon { font-size: 48px; text-align: center; margin-bottom: 12px; }

    .auth-secure { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 20px; font-size: 11px; color: #9CA3AF; }

    @media (max-width: 768px) {
      .auth-left { display: none; }
      .auth-right { width: 100%; padding: 40px 24px; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="auth-root">
        <div className="auth-left">
          <div
            className="auth-left-blob"
            style={{
              width: 320,
              height: 320,
              background: 'rgba(255,122,138,0.14)',
              top: -100,
              right: -80,
            }}
          />
          <div
            className="auth-left-blob"
            style={{
              width: 220,
              height: 220,
              background: 'rgba(255,180,190,0.18)',
              bottom: 60,
              left: -50,
            }}
          />

          <div className="auth-brand">
            {/* ── Logo mark — click navigates to /admin ── */}
            <div
              className="auth-brand-mark"
              onClick={() => router.push('/admin')}
              title="Admin"
            >
              M
            </div>
            <div className="auth-brand-name">MoodMarket</div>
            <div className="auth-brand-tag">Shop by how you feel</div>
          </div>

          <div className="auth-testimonials">
            {[
              {
                text: '"Finally a shopping app that gets me. It knew I needed comfort food before I even did."',
                name: 'Ama A.',
                stars: '★★★★★',
              },
              {
                text: '"The mood scanner is scary accurate. Opened it stressed, it recommended a candle — instant calm."',
                name: 'Kofi M.',
                stars: '★★★★★',
              },
            ].map((t, i) => (
              <div key={i} className="auth-testimonial">
                <div className="auth-testimonial-text">{t.text}</div>
                <div className="auth-testimonial-author">
                  <div className="auth-testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <div className="auth-testimonial-name">{t.name}</div>
                    <div className="auth-testimonial-stars">{t.stars}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <div className="auth-eyebrow">Welcome back</div>
            <h1 className="auth-heading">
              Sign in to
              <br />
              <em>MoodMarket</em>
            </h1>
            <p className="auth-subheading">
              Your mood-curated cart is waiting for you.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <div className="auth-field-header">
                <label className="auth-field-label">Email address</label>
              </div>
              <div
                className={`auth-input-wrap${focusedField === 'email' ? ' focused' : ''}`}
              >
                <span className="auth-input-icon">
                  <span style={{ fontFamily: undefined }}>✉️</span>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-header">
                <label className="auth-field-label">Password</label>
                <button
                  className="auth-field-link"
                  onClick={() => {
                    setResetEmail(email);
                    setForgotOpen(true);
                    setResetSent(false);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div
                className={`auth-input-wrap${focusedField === 'password' ? ' focused' : ''}`}
              >
                <span className="auth-input-icon">
                  <span style={{ fontFamily: undefined }}>🔒</span>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                />
                <button
                  className="auth-eye-btn"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? (
                    <span style={{ fontFamily: undefined }}>🙈</span>
                  ) : (
                    <span style={{ fontFamily: undefined }}>👁️</span>
                  )}
                </button>
              </div>
            </div>

            <button
              className="auth-cta"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? <div className="auth-spinner" /> : 'Sign In →'}
            </button>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">or continue with</span>
              <div className="auth-divider-line" />
            </div>

            <div className="auth-socials">
              {[
                {
                  icon: <GoogleIcon size={20} />,
                  label: 'Google',
                  provider: 'google' as const,
                },
                {
                  icon: <AppleIcon size={20} color="#000" />,
                  label: 'Apple',
                  provider: 'apple' as const,
                },
                {
                  icon: <FacebookIcon size={20} />,
                  label: 'Facebook',
                  provider: 'facebook' as const,
                },
              ].map((s) => (
                <button
                  key={s.label}
                  className="auth-social-btn"
                  title={`Continue with ${s.label}`}
                  onClick={() => signInWithOAuth(s.provider)}
                >
                  {s.icon}
                </button>
              ))}
            </div>

            <div className="auth-footer">
              <span>Don't have an account?</span>
              <button
                className="auth-footer-link"
                onClick={() => router.push('/signup')}
              >
                Create one
              </button>
            </div>
          </div>
        </div>

        {forgotOpen && (
          <div
            className="auth-modal-backdrop"
            onClick={() => setForgotOpen(false)}
          >
            <div
              className="auth-modal"
              style={{ position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="auth-modal-close"
                onClick={() => setForgotOpen(false)}
              >
                ×
              </button>
              {resetSent ? (
                <>
                  <div className="auth-success-icon">
                    <span style={{ fontFamily: undefined }}>📬</span>
                  </div>
                  <div
                    className="auth-modal-title"
                    style={{ textAlign: 'center' }}
                  >
                    Check your email
                  </div>
                  <div
                    className="auth-modal-sub"
                    style={{ textAlign: 'center' }}
                  >
                    We sent a reset link to <strong>{resetEmail}</strong>. Check
                    your inbox and follow the instructions.
                  </div>
                  <button
                    className="auth-modal-btn"
                    onClick={() => setForgotOpen(false)}
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="auth-modal-title">Reset Password</div>
                  <div className="auth-modal-sub">
                    Enter your email and we'll send you a link to reset your
                    password.
                  </div>
                  <input
                    className="auth-modal-input"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                    autoFocus
                  />
                  <button className="auth-modal-btn" onClick={handleReset}>
                    Send Reset Link
                  </button>
                  <button
                    className="auth-modal-cancel"
                    onClick={() => setForgotOpen(false)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE LOGIN
───────────────────────────────────────────────────────────────────────── */

function LoginScreenMobile() {
  const router = useRouter();
  const { signIn, signInWithOAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setForgotVisible(true);
  };

  const getRedirectURL = () => {
    if (Platform.OS === 'web')
      return `${window.location.origin}/reset-password`;
    return Linking.createURL('reset-password');
  };

  const handleForgotSubmit = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Email required', 'Please enter your email address');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: getRedirectURL() },
      );
      if (error) throw error;
      Alert.alert('Check your email', 'We sent a reset link to your inbox.');
      setForgotVisible(false);
      setResetEmail('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    }
  };

  return (
    <KeyboardAvoidingView
      style={ms.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={ms.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER / BRAND ── */}
        <View style={ms.header}>
          {/* ── Logo mark — tap navigates to /admin ── */}
          <TouchableOpacity
            style={ms.logoMark}
            onPress={() => router.push('/admin')}
            activeOpacity={0.8}
          >
            <Text style={ms.logoMarkText}>M</Text>
          </TouchableOpacity>
          <Text style={ms.logo}>MoodMarket</Text>
          <Text style={ms.tagline}>Shop by how you feel</Text>
        </View>

        {/* ── FORM CARD ── */}
        <View style={ms.card}>
          <Text style={ms.cardTitle}>Welcome back</Text>
          <Text style={ms.cardSubtitle}>Sign in to your account</Text>

          {error ? (
            <View style={ms.errorBox}>
              <Text style={ms.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Text style={ms.label}>Email</Text>
          <View style={[ms.inputBox, emailFocused && ms.inputFocused]}>
            <Mail size={18} color={emailFocused ? '#FF7A8A' : '#9CA3AF'} />
            <TextInput
              style={ms.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password */}
          <View style={ms.labelRow}>
            <Text style={ms.label}>Password</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={ms.forgot}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[ms.inputBox, passwordFocused && ms.inputFocused]}>
            <Lock size={18} color={passwordFocused ? '#FF7A8A' : '#9CA3AF'} />
            <TextInput
              style={ms.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={ms.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={18} color="#9CA3AF" />
              ) : (
                <Eye size={18} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Sign In button */}
          <TouchableOpacity
            style={ms.button}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={ms.buttonText}>Sign In</Text>
                <ArrowRight size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={ms.divider}>
            <View style={ms.dividerLine} />
            <Text style={ms.dividerText}>or continue with</Text>
            <View style={ms.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={ms.socials}>
            <TouchableOpacity
              style={ms.socialBtn}
              activeOpacity={0.7}
              onPress={() => signInWithOAuth('google')}
            >
              <GoogleIcon size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={ms.socialBtn}
              activeOpacity={0.7}
              onPress={() => signInWithOAuth('apple')}
            >
              <AppleIcon size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={ms.socialBtn}
              activeOpacity={0.7}
              onPress={() => signInWithOAuth('facebook')}
            >
              <FacebookIcon size={20} />
            </TouchableOpacity>
          </View>

          {/* Sign up link */}
          <View style={ms.signupRow}>
            <Text style={ms.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={ms.signupLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {forgotVisible && (
        <View style={ms.modalOverlay}>
          <View style={ms.modalBox}>
            <Text style={ms.modalTitle}>Reset Password</Text>
            <Text style={ms.modalSub}>
              Enter your email and we'll send you a reset link.
            </Text>
            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              style={ms.modalInput}
            />
            <TouchableOpacity
              style={ms.modalButton}
              onPress={handleForgotSubmit}
              activeOpacity={0.85}
            >
              <Text style={ms.modalButtonText}>Send Reset Link</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForgotVisible(false)}>
              <Text style={ms.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DEFAULT EXPORT — platform switch
───────────────────────────────────────────────────────────────────────── */

export default function LoginScreen() {
  if (Platform.OS === 'web') return <LoginScreenWeb />;
  return <LoginScreenMobile />;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE STYLES
───────────────────────────────────────────────────────────────────────── */

const PRIMARY = '#FF7A8A';

const ms = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0F2',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 60,
  },

  /* ── Header / Brand ── */
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    // iOS shadow
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    // Android shadow
    elevation: 10,
  },
  logoMarkText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },

  /* ── Fields ── */
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  forgot: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#F9FAFB',
    height: 52,
    gap: 10,
  },
  inputFocused: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF5F6',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 4,
  },

  /* ── Sign In button ── */
  button: {
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  /* ── Divider ── */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  /* ── Social buttons ── */
  socials: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Sign up row ── */
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },

  /* ── Secure badge ── */
  secureBadge: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
  },

  /* ── Error ── */
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── Forgot password modal ── */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 13,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
    backgroundColor: '#F9FAFB',
  },
  modalButton: {
    backgroundColor: PRIMARY,
    height: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalCancel: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 6,
  },
});

