import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { MessageSquare, X, Send, Sparkles, Brain } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export const FloatingChatbot = () => {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  // Removed auth check so user can see it immediately for verification
  // if (!user) return null;
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi ${profile?.name?.split(' ')[0] || 'there'}! I'm your MoodMarket AI assistant. How are you feeling today?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Use Supabase Edge Function to avoid CORS on web and centralize logic
      // Adding a 10s timeout to prevent "stuck loading" state
      console.log('Invoking chatbot-proxy...');
      const invokePromise = supabase.functions.invoke('chatbot-proxy', {
        body: { 
          message: input.trim(),
          profileName: profile?.name || 'User'
        },
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 10000)
      );

      const response = await Promise.race([invokePromise, timeoutPromise]) as any;
      const { data, error } = response;

      if (error) {
        console.warn('Edge Function error, falling back:', error);
        throw error;
      }
      
      const botResponse = data?.text || "I'm here for you! How can I help?";

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse.trim(),
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error('Chatbot primary failed:', error);
      
      // Fallback to direct client-side call
      try {
        // Fallback key added to ensure it works for the presentation if env vars fail to load on the client
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyCJPopXwgJnwRUx4PkNq8WjEzuExDOlPMc';
        console.log('Gemini API Key found:', !!apiKey);
        if (!apiKey) throw new Error('API Key missing (EXPO_PUBLIC_GEMINI_API_KEY)');
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are an AI assistant for MoodMarket. Keep it concise. User: ${input.trim()}` }] }],
            }),
          }
        );

        if (!response.ok) {
          const errBody = await response.text();
          console.error('Gemini API error body:', errBody);
          if (response.status === 429) {
            throw new Error('API Quota Exceeded (429). Too many requests.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const fallbackData = await response.json();
        const fallbackText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (fallbackText) {
          setMessages((prev) => [...prev, {
            id: (Date.now() + 1).toString(),
            text: fallbackText.trim(),
            sender: 'bot',
            timestamp: new Date(),
          }]);
          return;
        }
      } catch (innerErr) {
        console.error('Fallback failed:', innerErr);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "I'm having a bit of trouble thinking right now. Could you try again in a moment?",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <TouchableOpacity
          style={[
            s.floatingBtn,
            { 
              backgroundColor: theme.primary, 
              bottom: insets.bottom + (Platform.OS === 'ios' ? 88 : 96),
              right: 20,
              shadowColor: theme.primary,
              zIndex: 9999,
            }
          ]}
          onPress={toggleChat}
          activeOpacity={0.9}
        >
          <Sparkles size={24} color="#fff" />
          <View style={s.badge} />
        </TouchableOpacity>
      )}

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={toggleChat}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <Animated.View
            style={[
              s.chatContainer,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {/* Header */}
            <View style={[s.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
              <View style={s.headerTitleRow}>
                <View style={[s.botAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <Brain size={18} color={theme.primary} />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Mood Assistant</Text>
                  <View style={s.onlineRow}>
                    <View style={s.onlineDot} />
                    <Text style={[s.onlineText, { color: theme.textSecondary }]}>Always here to listen</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChat} style={s.closeBtn}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={s.messageList}
              contentContainerStyle={s.messageListContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    s.messageRow,
                    msg.sender === 'user' ? s.userRow : s.botRow,
                  ]}
                >
                  <View
                    style={[
                      s.bubble,
                      msg.sender === 'user'
                        ? [s.userBubble, { backgroundColor: theme.primary }]
                        : [s.botBubble, { backgroundColor: theme.card, borderColor: theme.border }],
                    ]}
                  >
                    <Text
                      style={[
                        s.messageText,
                        { color: msg.sender === 'user' ? '#fff' : theme.textPrimary, fontFamily: theme.fontBody }
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                  <Text style={[s.time, { color: theme.inactive }]}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
              {isTyping && (
                <View style={s.botRow}>
                  <View style={[s.bubble, s.botBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={[s.inputArea, { borderTopColor: theme.border, paddingBottom: Platform.OS === 'ios' ? 20 : 12 }]}>
              <View style={[s.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                  style={[s.input, { color: theme.textPrimary, fontFamily: theme.fontBody }]}
                  placeholder="Tell me how you're feeling..."
                  placeholderTextColor={theme.inactive}
                  value={input}
                  onChangeText={setInput}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!input.trim() || isTyping}
                  style={[s.sendBtn, { backgroundColor: input.trim() ? theme.primary : theme.border }]}
                >
                  <Send size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
    // Web shadow
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }
    }),
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chatContainer: {
    width: '94%',
    height: height * 0.7,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        marginBottom: 20,
      }
    }),
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  onlineText: {
    fontSize: 11,
  },
  closeBtn: {
    padding: 4,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  botRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  botBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  inputArea: {
    padding: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
