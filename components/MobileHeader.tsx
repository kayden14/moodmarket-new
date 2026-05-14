import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Bell, ShoppingCart, Settings } from 'lucide-react-native';
import { ThemeToggleIcon } from './ThemeToggle';
import EmojiText from './EmojiText';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  greeting?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showThemeToggle?: boolean;
  showCartBadge?: boolean;
  cartCount?: number;
  showSettings?: boolean;
  onSettingsPress?: () => void;
}

export default function MobileHeader({
  title,
  subtitle,
  greeting,
  showSearch = false,
  showNotifications = false,
  showThemeToggle = false,
  showCartBadge = false,
  cartCount = 0,
  showSettings = false,
  onSettingsPress,
}: MobileHeaderProps) {
  const router = useRouter();
  const { theme, moodPalette } = useTheme();

  const [logoClicks, setLogoClicks] = React.useState(0);
  const logoTimerRef = React.useRef<any>(null);

  const handleLogoClick = () => {
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    const newCount = logoClicks + 1;
    if (newCount >= 5) {
      setLogoClicks(0);
      router.push('/admin');
    } else {
      setLogoClicks(newCount);
      logoTimerRef.current = setTimeout(() => setLogoClicks(0), 3000);
    }
  };

  return (
    <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={s.headerTop}>
        <TouchableOpacity activeOpacity={1} onPress={handleLogoClick}>
          {greeting && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: moodPalette.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10 }}>🛍️</Text>
              </View>
              <Text style={[s.greeting, { color: theme.primary }]}>{greeting} <EmojiText>👋</EmojiText></Text>
            </View>
          )}
          {subtitle && <Text style={[s.subtitle, { color: theme.primary }]}>{subtitle}</Text>}
          <Text style={[s.title, { color: theme.textPrimary }]}>{title}</Text>
        </TouchableOpacity>
        
        <View style={s.headerIcons}>
          {showSearch && (
            <TouchableOpacity 
              style={[s.headerIconBtn, { backgroundColor: theme.background, borderColor: theme.border }]} 
              onPress={() => router.push('/search')} 
              activeOpacity={0.75}
            >
              <Search size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          )}
          
          {showThemeToggle && <ThemeToggleIcon />}
          
          {showNotifications && (
            <TouchableOpacity 
              style={[s.headerIconBtn, { backgroundColor: theme.background, borderColor: theme.border }]} 
              onPress={() => router.push('/notifications')} 
              activeOpacity={0.75}
            >
              <Bell size={18} color={theme.textPrimary} />
              <View style={[s.notifDot, { backgroundColor: theme.primary, borderColor: theme.card }]} />
            </TouchableOpacity>
          )}

          {showCartBadge && (
            <View style={[s.cartBadge, { backgroundColor: theme.isDark ? '#2D1820' : '#FFF0F2', borderColor: theme.isDark ? '#3D2030' : '#FFD6DE' }]}>
              <ShoppingCart size={16} color={theme.primary} strokeWidth={2.5} />
              <Text style={[s.cartBadgeTxt, { color: theme.textPrimary }]}>{cartCount}</Text>
            </View>
          )}

          {showSettings && (
            <TouchableOpacity
              style={[s.settingsBtn, { backgroundColor: theme.isDark ? '#2D1820' : '#FFF0F2', borderColor: theme.isDark ? '#3D2030' : '#FFD6DE' }]}
              onPress={onSettingsPress}
              activeOpacity={0.75}
            >
              <Settings size={18} color={theme.primary} strokeWidth={2} />
              <Text style={[s.settingsBtnTxt, { color: theme.primary }]}>Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 18, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting:      { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2, textTransform: 'uppercase' },
  subtitle:      { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  title:         { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  headerIcons:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notifDot:      { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5 },
  cartBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  cartBadgeTxt: { fontSize: 14, fontWeight: '800' },
  settingsBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  settingsBtnTxt:{ fontSize: 12, fontWeight: '700' },
});
