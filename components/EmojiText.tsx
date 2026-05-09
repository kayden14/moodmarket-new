// components/EmojiText.tsx
//
// Wrapper for text that contains emoji characters.
// Explicitly strips custom fontFamily so the OS can fall back to its emoji font.
// This fixes broken emoji rendering on Samsung devices when custom fonts (Sora/Lora)
// are loaded via expo-font.
//
// Usage:
//   <EmojiText style={{ fontSize: 16 }}>😊 Happy</EmojiText>
//   <EmojiText>🧴 Self Care</EmojiText>

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface EmojiTextProps extends TextProps {
  children: React.ReactNode;
}

export default function EmojiText({ style, children, ...rest }: EmojiTextProps) {
  // Flatten style and remove fontFamily so the system emoji font is used
  const flattened = StyleSheet.flatten(style);
  const emojiStyle = {
    ...(flattened || {}),
    fontFamily: undefined,
  };

  return (
    <Text style={emojiStyle} maxFontSizeMultiplier={1.3} {...rest}>
      {children}
    </Text>
  );
}
