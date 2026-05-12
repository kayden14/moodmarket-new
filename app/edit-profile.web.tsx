/**
 * app/edit-profile.web.tsx
 * Edit Profile + Settings — web layout with sidebar
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import WebShell from '@/components/WebShell';
import {
  User, Mail, Phone, Bell, FileText, Lock, Shield,
  HelpCircle, MessageSquare, Star, Info, LogOut, Trash2,
  CheckCircle, Heart,
} from 'lucide-react';

const DANGER  = '#E53E3E';
const SUCCESS = '#22C55E';

function Toggle({ value, onChange, activeColor }: { value: boolean; onChange: (v: boolean) => void; activeColor: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: value ? activeColor : '#D1D5DB',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 2.5,
        color: isDark ? '#888' : '#999',
        textTransform: 'uppercase',
        marginBottom: 10,
        paddingLeft: 4,
      }}>{title}</p>
      <div style={{
        background: isDark ? '#141414' : '#fff',
        border: `1px solid ${isDark ? '#222' : '#EAEAEA'}`,
        borderRadius: 18,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  icon, label, sublabel, onClick, right, danger = false, last = false,
}: {
  icon: React.ReactNode; label: string; sublabel?: string;
  onClick?: () => void; right?: React.ReactNode; danger?: boolean; last?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const [hover, setHover] = useState(false);
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: last ? 'none' : `1px solid ${isDark ? '#222' : '#EAEAEA'}`,
        background: hover && onClick ? (isDark ? '#1A1A1A' : '#F9F9F9') : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: danger
          ? (isDark ? '#2D1515' : '#FFF0F0')
          : (isDark ? '#1E1E2E' : '#FFF0F2'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: danger ? DANGER : tp,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: ts, marginTop: 2, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{sublabel}</div>
        )}
      </div>
      {right ?? (onClick ? (
        <span style={{ color: ts, fontSize: 14, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>›</span>
      ) : null)}
    </div>
  );
}

function InputRow({
  icon, label, value, onChange, placeholder, type = 'text',
  editable = true, hint, last = false,
}: {
  icon: React.ReactNode; label: string; value: string;
  onChange?: (v: string) => void; placeholder?: string; type?: string;
  editable?: boolean; hint?: string; last?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 13,
      padding: '14px 16px',
      borderBottom: last ? 'none' : `1px solid ${isDark ? '#222' : '#EAEAEA'}`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: isDark ? '#1E1E2E' : '#FFF0F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <label style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
          color: ts, textTransform: 'uppercase',
          display: 'block', marginBottom: 5,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>{label}</label>
        {editable ? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              fontSize: 15, fontWeight: 600,
              color: tp,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          />
        ) : (
          <span style={{
            fontSize: 15, fontWeight: 600, color: ts,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>{value}</span>
        )}
        {hint && (
          <span style={{
            fontSize: 11, color: ts, marginTop: 3,
            display: 'block', fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>{hint}</span>
        )}
      </div>
    </div>
  );
}

export default function EditProfileWeb() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isDark, theme } = useTheme();

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState((profile as any)?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [moodReminders, setMoodReminders] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);
  const [orderOn, setOrderOn] = useState(true);

  const initials = name.trim()
    ? name.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const primary = theme.primary;
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';
  const bg = isDark ? '#0A0A0A' : '#F6F6F6';

  const handleSave = async () => {
    if (!user?.id) { alert('You must be logged in to save changes.'); return; }
    if (!name.trim()) { alert('Please enter your name.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) { alert(`Save failed: ${error.message}`); return; }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(`Unexpected error: ${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    if (!user?.email) return;
    if (!confirm(`A reset link will be sent to:\n${user.email}\n\nContinue?`)) return;
    supabase.auth.resetPasswordForEmail(user.email).then(({ error }) => {
      if (error) alert(error.message);
      else alert('Check your inbox for the password reset link.');
    });
  };

  const handleSignOut = () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    signOut().then(() => router.replace('/login'));
  };

  const handleDeleteAccount = () => {
    alert('Contact support@moodmarket.com to delete your account.');
  };

  return (
    <WebShell activeNav="profile" title="Edit Profile" subtitle="Settings">
      <div style={{ maxWidth: 720 }}>
        {/* Avatar */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 0', marginBottom: 4,
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: 26,
            background: primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
            fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            boxShadow: `0 8px 24px ${primary}55`,
          }}>
            {initials}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 900, color: tp, letterSpacing: -0.5,
            marginBottom: 3, fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            {name || 'Your Name'}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 500, color: ts,
            marginBottom: 10, fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            {user?.email}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderRadius: 20, padding: '5px 12px', border: `1px solid ${isDark ? '#1A4D2E' : '#A8E6C8'}`,
            background: isDark ? '#0D2B1A' : '#EDFBF1',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 3.5, background: SUCCESS, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: SUCCESS, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Active account</span>
          </div>
        </div>

        {/* Personal Info */}
        <Section title="Personal Info">
          <InputRow
            icon={<User size={16} color={primary} strokeWidth={2} />}
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Enter your full name"
          />
          <InputRow
            icon={<Mail size={16} color={ts} strokeWidth={2} />}
            label="Email Address"
            value={user?.email ?? ''}
            editable={false}
            hint="Email cannot be changed here"
          />
          <InputRow
            icon={<Phone size={16} color={primary} strokeWidth={2} />}
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            placeholder="e.g. 0244000000"
            last
          />
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row
            icon={<Heart size={16} color={primary} strokeWidth={2} />}
            label="Mood Reminders"
            sublabel="Daily check-in prompts"
            last
            right={<Toggle value={moodReminders} onChange={setMoodReminders} activeColor={primary} />}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon={<Bell size={16} color={primary} strokeWidth={2} />}
            label="Push Notifications"
            sublabel="Order updates and mood alerts"
            right={<Toggle value={pushOn} onChange={setPushOn} activeColor={primary} />}
          />
          <Row
            icon={<Mail size={16} color={primary} strokeWidth={2} />}
            label="Email Notifications"
            sublabel="Newsletters and promotions"
            right={<Toggle value={emailOn} onChange={setEmailOn} activeColor={primary} />}
          />
          <Row
            icon={<FileText size={16} color={primary} strokeWidth={2} />}
            label="Order Updates"
            sublabel="Shipping and delivery status"
            last
            right={<Toggle value={orderOn} onChange={setOrderOn} activeColor={primary} />}
          />
        </Section>

        {/* Security */}
        <Section title="Security">
          <Row
            icon={<Lock size={16} color={primary} strokeWidth={2} />}
            label="Change Password"
            sublabel="Send a reset link to your email"
            onClick={handleChangePassword}
          />
          <Row
            icon={<Shield size={16} color={primary} strokeWidth={2} />}
            label="Privacy Policy"
            sublabel="How we handle your data"
            onClick={() => window.open('https://moodmarket.com/privacy', '_blank')}
          />
          <Row
            icon={<FileText size={16} color={primary} strokeWidth={2} />}
            label="Terms of Service"
            sublabel="Our terms and conditions"
            last
            onClick={() => window.open('https://moodmarket.com/terms', '_blank')}
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <Row
            icon={<HelpCircle size={16} color={primary} strokeWidth={2} />}
            label="Help Centre"
            sublabel="Email support@moodmarket.com"
            onClick={() => alert('Email support@moodmarket.com')}
          />
          <Row
            icon={<MessageSquare size={16} color={primary} strokeWidth={2} />}
            label="Send Feedback"
            sublabel="Help us improve MoodMarket"
            onClick={() => alert('Email feedback@moodmarket.com')}
          />
          <Row
            icon={<Star size={16} color="#F59E0B" strokeWidth={2} />}
            label="Rate MoodMarket"
            sublabel="Thank you for supporting us!"
            onClick={() => alert('Thank you for supporting MoodMarket!')}
          />
          <Row
            icon={<Info size={16} color={primary} strokeWidth={2} />}
            label="App Version"
            sublabel="MoodMarket v1.0.0"
            last
          />
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row
            icon={<LogOut size={16} color={DANGER} strokeWidth={2} />}
            label="Sign Out"
            sublabel="Sign out of your account"
            onClick={handleSignOut}
            danger
          />
          <Row
            icon={<Trash2 size={16} color={DANGER} strokeWidth={2} />}
            label="Delete Account"
            sublabel="Permanently remove your data"
            onClick={handleDeleteAccount}
            danger
            last
          />
        </Section>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, marginBottom: 32 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: saved ? SUCCESS : primary,
              color: '#fff',
              border: 'none', borderRadius: 14,
              padding: '12px 28px',
              fontSize: 14, fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              opacity: saving ? 0.7 : 1,
              boxShadow: `0 6px 20px ${(saved ? SUCCESS : primary)}44`,
            }}
          >
            {saving ? (
              <span className="spinner" style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : saved ? (
              <><CheckCircle size={14} strokeWidth={3} /> Saved</>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        <p style={{
          textAlign: 'center', fontSize: 11,
          color: ts, marginTop: 8, marginBottom: 48,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>
          Made with <span style={{ fontFamily: undefined }}>❤️</span> in Ghana · MoodMarket © 2025
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </WebShell>
  );
}
