/**
 * components/MoodShareCard.tsx
 * 
 * A beautiful, shareable card that showcases the user's current mood.
 * Uses expo-sharing to let users viralize their MoodMarket experience.
 */

import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Share, Platform 
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import { MOOD_META } from '@/constants/moods';
import EmojiText from './EmojiText';
import { Share2, Sparkles, Heart } from 'lucide-react-native';

interface MoodShareCardProps {
  mood: string;
  userName?: string;
  streak?: number;
  onClose?: () => void;
}

export default function MoodShareCard({ mood, userName, streak, onClose }: MoodShareCardProps) {
  const { theme, isDark } = useTheme();
  const meta = MOOD_META[mood.toLowerCase()] || MOOD_META['neutral'];
  
  const handleShare = async () => {
    try {
      const message = `I'm feeling ${mood} today! Check out my personalized MoodMarket recommendations. ✨ #MoodMarket #Wellness`;
      const url = 'https://moodmarket.vercel.app'; // Replace with real URL
      
      await Share.share({
        message: Platform.OS === 'ios' ? message : `${message} ${url}`,
        url: Platform.OS === 'ios' ? url : undefined,
        title: 'My Mood Today',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[s.gradientBg, { backgroundColor: isDark ? meta.darkBg : meta.lightBg }]}>
        <View style={s.sparkles}>
          <Sparkles size={100} color={meta.color} opacity={0.1} />
        </View>
        
        <View style={s.content}>
          <View style={[s.badge, { backgroundColor: theme.card }]}>
            <Text style={[s.badgeText, { color: meta.color, fontFamily: theme.fontHeading }]}>{streak ? `${streak} DAY STREAK 🔥` : 'DAILY VIBE'}</Text>
          </View>
          
          <EmojiText style={s.emoji}>{meta.emoji}</EmojiText>
          <Text style={[s.moodName, { color: meta.color, fontFamily: theme.fontHeading }]}>{mood.toUpperCase()}</Text>
          
          <View style={s.divider} />
          
          <Text style={[s.quote, { color: theme.textSecondary, fontFamily: theme.fontBody }]}>
            "Your mood is a canvas, and today you're painting with colors of {mood}."
          </Text>
          
          {userName && (
            <Text style={[s.userLabel, { color: theme.inactive, fontFamily: theme.fontHeading }]}>— {userName}</Text>
          )}
        </View>
        
        <View style={s.footer}>
          <View style={s.logoRow}>
            <Heart size={14} color={theme.primary} fill={theme.primary} />
            <Text style={[s.logoText, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>MoodMarket</Text>
          </View>
          
          <TouchableOpacity 
            style={[s.shareButton, { backgroundColor: theme.primary }]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={16} color="#fff" />
            <Text style={s.shareText}>Share Vibe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 10,
  },
  gradientBg: {
    padding: 24,
    minHeight: 340,
    justifyContent: 'space-between',
  },
  sparkles: {
    position: 'absolute',
    top: -20,
    right: -20,
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  moodName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    marginVertical: 20,
  },
  quote: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  userLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  shareText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
