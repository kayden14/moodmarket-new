/**
 * app/edit-profile.tsx
 * Edit Profile + Settings — fully themed for light & dark mode
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, StatusBar, Switch, Alert,
  ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, User, Mail, Phone, ChevronRight,
  Bell, Shield, HelpCircle, FileText, Star,
  LogOut, Trash2, Lock, MessageSquare,
  CheckCircle, Info, Heart,
} from 'lucide-react-native';

const DANGER  = '#E53E3E';
const SUCCESS = '#22C55E';

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  icon, label, sublabel, onPress, right, danger = false, last = false,
}: {
  icon:      React.ReactNode;
  label:     string;
  sublabel?: string;
  onPress?:  () => void;
  right?:    React.ReactNode;
  danger?:   boolean;
  last?:     boolean;
}) {
  const { theme } = useTheme();
  return (
    <>
      <TouchableOpacity
        style={r.row}
        onPress={onPress}
        activeOpacity={onPress ? 0.65 : 1}
        disabled={!onPress && !right}
      >
        <View style={[
          r.iconBox,
          { backgroundColor: danger
              ? (theme.isDark ? '#2D1515' : '#FFF0F0')
              : (theme.isDark ? '#1E1E2E' : '#FFF0F2')
          },
        ]}>
          {icon}
        </View>
        <View style={r.body}>
          <Text style={[r.label, { color: danger ? DANGER : theme.textPrimary }]}>
            {label}
          </Text>
          {sublabel
            ? <Text style={[r.sublabel, { color: theme.textSecondary }]}>{sublabel}</Text>
            : null
          }
        </View>
        {right ?? (onPress
          ? <ChevronRight size={15} color={theme.inactive} strokeWidth={2} />
          : null
        )}
      </TouchableOpacity>
      {!last && <View style={[r.divider, { backgroundColor: theme.border, marginLeft: 63 }]} />}
    </>
  );
}

const r = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 13 },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  body:    { flex: 1 },
  label:   { fontSize: 14, fontWeight: '600' },
  sublabel:{ fontSize: 12, marginTop: 1 },
  divider: { height: 1 },
});

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={sec.wrap}>
      <Text style={[sec.title, { color: theme.inactive }]}>{title}</Text>
      <View style={[sec.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap:  { marginBottom: 20 },
  title: { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 8, paddingHorizontal: 4, textTransform: 'uppercase' },
  card:  { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
});

// ─── Input Field ──────────────────────────────────────────────────────────────

function InputField({
  icon, label, value, onChange, placeholder,
  keyboardType, editable = true, hint, last = false,
}: {
  icon:          React.ReactNode;
  label:         string;
  value:         string;
  onChange:      (v: string) => void;
  placeholder:   string;
  keyboardType?: any;
  editable?:     boolean;
  hint?:         string;
  last?:         boolean;
}) {
  const { theme } = useTheme();
  return (
    <>
      <View style={inf.wrap}>
        <View style={[inf.iconCol, {
          backgroundColor: theme.isDark ? '#1E1E2E' : '#FFF0F2',
        }]}>
          {icon}
        </View>
        <View style={inf.body}>
          <Text style={[inf.label, { color: theme.textSecondary }]}>{label}</Text>
          {editable ? (
            <TextInput
              style={[inf.input, { color: theme.textPrimary }]}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={theme.inactive}
              keyboardType={keyboardType}
              autoCorrect={false}
              autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
            />
          ) : (
            <Text style={[inf.readOnly, { color: theme.textSecondary }]}>{value}</Text>
          )}
          {hint ? <Text style={[inf.hint, { color: theme.inactive }]}>{hint}</Text> : null}
        </View>
      </View>
      {!last && <View style={[{ height: 1, marginLeft: 63 }, { backgroundColor: theme.border }]} />}
    </>
  );
}

const inf = StyleSheet.create({
  wrap:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 13, alignItems: 'flex-start' },
  iconCol:  { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  body:     { flex: 1 },
  label:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5, textTransform: 'uppercase' },
  input:    { fontSize: 15, fontWeight: '600', paddingVertical: 0, paddingBottom: 2 },
  readOnly: { fontSize: 15, fontWeight: '600' },
  hint:     { fontSize: 11, marginTop: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isDark, theme } = useTheme();

  const [name,  setName]  = useState(profile?.name ?? '');
  const [phone, setPhone] = useState((profile as any)?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const [moodReminders, setMoodReminders] = useState(true);
  const [pushOn,  setPushOn]  = useState(true);
  const [emailOn, setEmailOn] = useState(true);
  const [orderOn, setOrderOn] = useState(true);

  const initials = name.trim()
    ? name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save changes.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      console.log('[EditProfile] Saving for user:', user.id);
      console.log('[EditProfile] Data:', { name: name.trim(), phone: phone.trim() || null });

      const { data, error } = await supabase
        .from('profiles')
        .update({
          name:       name.trim(),
          phone:      phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[EditProfile] Supabase error:', JSON.stringify(error));
        Alert.alert(
          'Save Failed',
          `Error: ${error.message}\nCode: ${error.code}\n\nPlease try again.`
        );
        return;
      }

      console.log('[EditProfile] Saved successfully:', data);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

    } catch (err: any) {
      console.error('[EditProfile] Unexpected error:', err);
      Alert.alert('Error', `Unexpected error: ${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      `A reset link will be sent to:\n${user?.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            Alert.alert('Email Sent ✓', 'Check your inbox for the password reset link.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await signOut(); router.replace('/login'); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => Alert.alert('Contact Support', 'Email support@moodmarket.com to delete your account.'),
        },
      ]
    );
  };

  const primary = theme.primary;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F5F5F5', borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <Text style={[s.headerEye,   { color: primary }]}>SETTINGS</Text>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Edit Profile</Text>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saved ? SUCCESS : primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : saved ? (
            <><CheckCircle size={13} color="#fff" strokeWidth={3} /><Text style={s.saveTxt}>Saved</Text></>
          ) : (
            <Text style={s.saveTxt}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar ── */}
        <View style={s.avatarSection}>
          <View style={[s.avatar, { backgroundColor: primary }]}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={[s.avatarName,  { color: theme.textPrimary }]}>{name || 'Your Name'}</Text>
          <Text style={[s.avatarEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          <View style={[s.avatarBadge, { backgroundColor: isDark ? '#0D2B1A' : '#EDFBF1', borderColor: isDark ? '#1A4D2E' : '#A8E6C8' }]}>
            <View style={s.onlineDot} />
            <Text style={[s.avatarBadgeTxt, { color: SUCCESS }]}>Active account</Text>
          </View>
        </View>

        {/* ── Personal Info ── */}
        <Section title="Personal Info">
          <InputField
            icon={<User size={16} color={primary} strokeWidth={2} />}
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Enter your full name"
          />
          <InputField
            icon={<Mail size={16} color={theme.inactive} strokeWidth={2} />}
            label="Email Address"
            value={user?.email ?? ''}
            onChange={() => {}}
            placeholder=""
            editable={false}
            hint="Email cannot be changed here"
          />
          <InputField
            icon={<Phone size={16} color={primary} strokeWidth={2} />}
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            placeholder="e.g. 0244000000"
            keyboardType="phone-pad"
            last
          />
        </Section>

        {/* ── Preferences ── */}
        <Section title="Preferences">
          <ThemeToggle />
          <Row
            icon={<Heart size={16} color={primary} strokeWidth={2} />}
            label="Mood Reminders"
            sublabel="Daily check-in prompts"
            last
            right={
              <Switch
                value={moodReminders}
                onValueChange={setMoodReminders}
                trackColor={{ false: theme.border, true: primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications">
          <Row
            icon={<Bell size={16} color={primary} strokeWidth={2} />}
            label="Push Notifications"
            sublabel="Order updates and mood alerts"
            right={<Switch value={pushOn} onValueChange={setPushOn} trackColor={{ false: theme.border, true: primary }} thumbColor="#fff" />}
          />
          <Row
            icon={<Mail size={16} color={primary} strokeWidth={2} />}
            label="Email Notifications"
            sublabel="Newsletters and promotions"
            right={<Switch value={emailOn} onValueChange={setEmailOn} trackColor={{ false: theme.border, true: primary }} thumbColor="#fff" />}
          />
          <Row
            icon={<FileText size={16} color={primary} strokeWidth={2} />}
            label="Order Updates"
            sublabel="Shipping and delivery status"
            last
            right={<Switch value={orderOn} onValueChange={setOrderOn} trackColor={{ false: theme.border, true: primary }} thumbColor="#fff" />}
          />
        </Section>

        {/* ── Security ── */}
        <Section title="Security">
          <Row
            icon={<Lock size={16} color={primary} strokeWidth={2} />}
            label="Change Password"
            sublabel="Send a reset link to your email"
            onPress={handleChangePassword}
          />
          <Row
            icon={<Shield size={16} color={primary} strokeWidth={2} />}
            label="Privacy Policy"
            sublabel="How we handle your data"
            onPress={() => Linking.openURL('https://moodmarket.com/privacy')}
          />
          <Row
            icon={<FileText size={16} color={primary} strokeWidth={2} />}
            label="Terms of Service"
            sublabel="Our terms and conditions"
            last
            onPress={() => Linking.openURL('https://moodmarket.com/terms')}
          />
        </Section>

        {/* ── Support ── */}
        <Section title="Support">
          <Row
            icon={<HelpCircle size={16} color={primary} strokeWidth={2} />}
            label="Help Centre"
            sublabel="FAQs and how-to guides"
            onPress={() => Alert.alert('Help Centre', 'Email support@moodmarket.com')}
          />
          <Row
            icon={<MessageSquare size={16} color={primary} strokeWidth={2} />}
            label="Send Feedback"
            sublabel="Help us improve MoodMarket"
            onPress={() => Alert.alert('Feedback', 'Email feedback@moodmarket.com')}
          />
          <Row
            icon={<Star size={16} color="#F59E0B" strokeWidth={2} />}
            label="Rate MoodMarket"
            sublabel="Leave us a review on the App Store"
            onPress={() => Alert.alert('Rate Us', 'Thank you for supporting MoodMarket!')}
          />
          <Row
            icon={<Info size={16} color={primary} strokeWidth={2} />}
            label="App Version"
            sublabel="MoodMarket v1.0.0"
            last
          />
        </Section>

        {/* ── Account ── */}
        <Section title="Account">
          <Row
            icon={<LogOut size={16} color={DANGER} strokeWidth={2} />}
            label="Sign Out"
            sublabel="Sign out of your account"
            onPress={handleSignOut}
            danger
          />
          <Row
            icon={<Trash2 size={16} color={DANGER} strokeWidth={2} />}
            label="Delete Account"
            sublabel="Permanently remove your data"
            onPress={handleDeleteAccount}
            danger
            last
          />
        </Section>

        <Text style={[s.footer, { color: theme.inactive }]}>
          Made with ❤️ in Ghana · MoodMarket © 2025
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 14, paddingHorizontal: 18,
    borderBottomWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  backBtn:     { width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerMid:   { flex: 1, paddingHorizontal: 12 },
  headerEye:   { fontSize: 9, fontWeight: '800', letterSpacing: 3, marginBottom: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  saveBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, minWidth: 60, justifyContent: 'center' },
  saveTxt:     { fontSize: 13, fontWeight: '800', color: '#fff' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },

  avatarSection:  { alignItems: 'center', paddingVertical: 28, marginBottom: 4 },
  avatar: {
    width: 88, height: 88, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    ...Platform.select({
      ios:     { shadowColor: '#FF7A8A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  avatarTxt:      { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  avatarName:     { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 3 },
  avatarEmail:    { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  avatarBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  onlineDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: SUCCESS },
  avatarBadgeTxt: { fontSize: 11, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 11, marginTop: 8 },
});