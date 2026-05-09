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
    } from 'react-native';
    import { useRouter } from 'expo-router';
    import { Colors } from '@/constants/colors';
    import { useAuth } from '@/contexts/AuthContext';
    import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
    import Svg, { Path } from 'react-native-svg';

    // ── Social Icon Components ──────────────────────────────────────────────────

    const GoogleIcon = () => (
      <Svg width="20" height="20" viewBox="0 0 24 24">
        <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </Svg>
    );

    const AppleIcon = ({ color = '#000' }: { color?: string }) => (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
        <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </Svg>
    );

    const FacebookIcon = () => (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
        <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </Svg>
    );

    // ── Main Screen ─────────────────────────────────────────────────────────────

    export default function SignupScreen() {
      const router = useRouter();
      const { signUp } = useAuth();
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [nameFocused, setNameFocused] = useState(false);
      const [emailFocused, setEmailFocused] = useState(false);
      const [passwordFocused, setPasswordFocused] = useState(false);

      const handleSignup = async () => {
        if (!name || !email || !password) {
          setError('Please fill in all fields');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        setLoading(true);
        setError('');
        try {
          await signUp(email, password, name);
          // AuthContext handles profile creation + welcome notification
          router.replace('/(tabs)');
        } catch (err: any) {
          setError(err.message || 'Failed to create account');
        } finally {
          setLoading(false);
        }
      };

      const getStrength = () => {
        if (password.length === 0) return null;
        if (password.length < 6) return { level: 1, label: 'Too short', color: '#EF4444' };
        if (password.length < 8) return { level: 2, label: 'Weak', color: '#F97316' };
        if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { level: 3, label: 'Fair', color: '#EAB308' };
        return { level: 4, label: 'Strong', color: '#22C55E' };
      };
      const strength = getStrength();

      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>M</Text>
              </View>
              <Text style={styles.logo}>MoodMarket</Text>
              <Text style={styles.subtitle}>Create your free account</Text>
            </View>

            <View style={styles.card}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Full Name */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>Full name</Text>
                <View style={[styles.inputContainer, nameFocused && styles.inputFocused]}>
                  <User size={18} color={nameFocused ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Jane Doe"
                    placeholderTextColor={Colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>Email address</Text>
                <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                  <Mail size={18} color={emailFocused ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, passwordFocused && styles.inputFocused]}>
                  <Lock size={18} color={passwordFocused ? Colors.primary : Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={Colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword
                      ? <EyeOff size={18} color={Colors.textSecondary} />
                      : <Eye size={18} color={Colors.textSecondary} />}
                  </TouchableOpacity>
                </View>
                {strength && (
                  <View style={styles.strengthWrapper}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: i <= strength.level ? strength.color : '#E5E7EB' },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.termsText}>
                By creating an account you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign up with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
                  <GoogleIcon />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
                  <AppleIcon color="#000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
                  <FacebookIcon />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.link}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    const styles = StyleSheet.create({
      container: { flex: 1, backgroundColor: '#F5F6FA' },
      scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 48,
      },
      header: { alignItems: 'center', marginBottom: 32 },
      logoMark: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
      },
      logoMarkText: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1 },
      logo: { fontSize: 26, fontWeight: '700', color: '#111827', letterSpacing: -0.5, marginBottom: 4 },
      subtitle: { fontSize: 15, color: '#6B7280', fontWeight: '400' },
      card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
      },
      errorContainer: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
      },
      errorText: { color: '#DC2626', textAlign: 'center', fontSize: 14, fontWeight: '500' },
      fieldWrapper: { marginBottom: 16 },
      label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, letterSpacing: 0.1 },
      inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
      },
      inputFocused: { borderColor: Colors.primary, backgroundColor: '#FFF5F6' },
      inputIcon: { marginRight: 10 },
      eyeIcon: { padding: 4 },
      input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
      strengthWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
      strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
      strengthBar: { flex: 1, height: 4, borderRadius: 2 },
      strengthLabel: { fontSize: 12, fontWeight: '600', width: 56, textAlign: 'right' },
      termsText: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, marginBottom: 16 },
      termsLink: { color: Colors.primary, fontWeight: '600' },
      button: {
        backgroundColor: Colors.primary,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
      },
      buttonDisabled: { opacity: 0.55 },
      buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
      divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
      dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
      dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
      socialButtons: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
      socialButton: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
      },
      footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
      footerText: { color: '#6B7280', fontSize: 14 },
      link: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
    });