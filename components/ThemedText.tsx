// components/ThemedText.tsx
// Cross-platform themed text component with semantic typography variants.
// Works on iOS, Android, and web (via react-native-web).
//
// Usage:
//   <ThemedText variant="h1">Hello</ThemedText>
//   <ThemedText variant="body" color={theme.textSecondary}>Subtitle</ThemedText>

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { TYPOGRAPHY } from '@/constants/typography';
import { useTheme } from '@/contexts/ThemeContext';

export type TextVariant = keyof typeof TYPOGRAPHY;

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  children: React.ReactNode;
}

export default function ThemedText({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();
  const t = TYPOGRAPHY[variant];

  const baseStyle: TextStyle = {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    letterSpacing: t.letterSpacing,
    lineHeight: t.lineHeight,
    color: color ?? theme.textPrimary,
  };

  // Overline needs uppercase transformation
  if (variant === 'overline') {
    return (
      <Text
        style={[baseStyle, style]}
        maxFontSizeMultiplier={1.2}
        {...rest}
      >
        {String(children).toUpperCase()}
      </Text>
    );
  }

  return (
    <Text style={[baseStyle, style]} maxFontSizeMultiplier={1.2} {...rest}>
      {children}
    </Text>
  );
}
