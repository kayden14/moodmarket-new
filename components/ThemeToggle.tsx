// components/ThemeToggle.tsx
//
// Two variants:
//
//  1. <ThemeToggle />          — full settings row with label + switch
//  2. <ThemeToggleIcon />      — compact icon button for the header
//
// Both read/write from ThemeContext so they stay in sync everywhere.

import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react-native';

// ─── Full row (for settings page) ────────────────────────────────────────────

export function ThemeToggle() {
  const { isDark, toggleDark, theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        row.wrap,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={toggleDark}
      activeOpacity={0.8}
    >
      {/* Icon */}
      <View style={[row.iconBox, { backgroundColor: isDark ? '#1E1B4B' : '#FEF3C7' }]}>
        {isDark
          ? <Moon size={18} color="#818CF8" strokeWidth={2} />
          : <Sun  size={18} color="#F59E0B" strokeWidth={2} />
        }
      </View>

      {/* Text */}
      <View style={row.body}>
        <Text style={[row.label, { color: theme.textPrimary }]}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </Text>
        <Text style={[row.sub, { color: theme.textSecondary }]}>
          {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        </Text>
      </View>

      {/* Switch */}
      <Switch
        value={isDark}
        onValueChange={toggleDark}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 13,
    borderRadius: 0, // used inside a section card so no rounding needed
  },
  iconBox: {
    width: 34, height: 34,
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  body:  { flex: 1 },
  label: { fontSize: 14, fontWeight: '600' },
  sub:   { fontSize: 12, marginTop: 1 },
});

// ─── Icon button (for home header) ───────────────────────────────────────────

export function ThemeToggleIcon() {
  const { isDark, toggleDark, theme } = useTheme();

  // Spin animation when toggling
  const spin = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    toggleDark();
    Animated.sequence([
      Animated.timing(spin, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 0, duration: 0,   useNativeDriver: true }),
    ]).start();
  };

  const rotate = spin.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      style={[
        icon.btn,
        {
          backgroundColor: isDark ? '#1A1A2E' : '#FEF3C7',
          borderColor:     isDark ? '#2A2A4A' : '#FDE68A',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        {isDark
          ? <Moon size={17} color="#818CF8" strokeWidth={2} />
          : <Sun  size={17} color="#F59E0B" strokeWidth={2} />
        }
      </Animated.View>
    </TouchableOpacity>
  );
}

const icon = StyleSheet.create({
  btn: {
    width: 40, height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});