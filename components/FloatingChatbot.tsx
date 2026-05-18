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
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, Send, Sparkles, Brain } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useResponsive } from '@/hooks/useResponsive';

const { height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const FALLBACK_SYSTEM_PROMPT = `You are a smart, helpful AI assistant for MoodMarket, a mood-aware online marketplace in Ghana.
Handle BOTH emotional/mood questions AND practical app questions directly.
For ordering: Browse → Add to Cart → Checkout → fill delivery details → confirm.
For navigation: Home, Search, Cart, Profile tabs at the bottom.
For mood scan: tap camera icon or Re-scan button at the top.
Payments: mobile money and card. Prices in GH₵.
Always give a direct, useful answer. Be warm and concise.`;

export const FloatingChatbot = () => {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet, width: windowWidth } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi ${profile?.name?.split(' ')[0] || 'there'}! 👋 I'm your MoodMarket assistant. I can help with your mood, finding products, placing orders, or anything about the app. What do you need?`,
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
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const currentInput = input.trim();

    const userMsg: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    // Build history to send (exclude the initial greeting, last 10 msgs)
    const conversationHistory = updatedMessages.slice(-10).map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    try {
      console.log(`[Chatbot] Sending to proxy: "${currentInput}"`);

      const invokePromise = supabase.functions.invoke('chatbot-proxy', {
        body: {
          message: currentInput,
          profileName: profile?.name || 'User',
          conversationHistory,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 20000)
      );

      const response = await Promise.race([invokePromise, timeoutPromise]) as any;
      const { data, error } = response;

      if (error) throw error;

      const botResponse = data?.text || "I'm here to help! Could you tell me more?";
      console.log('[Chatbot] ✅ Response from proxy');

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: botResponse.trim(), sender: 'bot', timestamp: new Date() },
      ]);
    } catch (error: any) {
      console.error('[Chatbot] ❌ Primary call failed:', error);

      // Fallback: direct Gemini call with proper system instruction
      try {
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error('No API key');

        console.log('[Chatbot] 🔄 Trying client-side fallback...');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const contents = conversationHistory.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: FALLBACK_SYSTEM_PROMPT }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const fallbackData = await res.json();
        const fallbackText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!fallbackText) throw new Error('Empty response');

        console.log('[Chatbot] ✅ Fallback response received');
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), text: fallbackText.trim(), sender: 'bot', timestamp: new Date() },
        ]);
      } catch (innerErr: any) {
        console.error('[Chatbot] ❌ Fallback failed:', innerErr);

        // Final rule-based fallback
        const lower = currentInput.toLowerCase();
        let demoResponse = "I'm having trouble connecting right now. Please try again in a moment! 🙏";

        if (lower.includes('order') || lower.includes('buy') || lower.includes('purchase')) {
          demoResponse = "To place an order: browse products on the Home screen → tap a product → tap 'Add to Cart' → go to the Cart tab → tap Checkout → fill in your delivery details → confirm. 🛒";
        } else if (lower.includes('how') && (lower.includes('use') || lower.includes('work') || lower.includes('app'))) {
          demoResponse = "MoodMarket detects your mood and recommends matching products! Use the bottom tabs to navigate: Home (recommendations), Search, Cart, and Profile. Tap 'Re-scan' at the top to scan your mood anytime. 😊";
        } else if (lower.includes('pay') || lower.includes('payment') || lower.includes('mobile money') || lower.includes('momo')) {
          demoResponse = "We support mobile money and card payments at checkout. All prices are in Ghana Cedis (GH₵). 💳";
        } else if (lower.includes('deliver') || lower.includes('shipping')) {
          demoResponse = "Vendors handle delivery. You can track your orders in Profile → Orders after placing them. 📦";
        } else if (lower.includes('vendor') || lower.includes('sell')) {
          demoResponse = "Want to sell on MoodMarket? Go to Profile → Become a Vendor and submit your application! 🏪";
        } else if (lower.includes('scan') || lower.includes('mood') || lower.includes('camera')) {
          demoResponse = "Tap the camera icon or the 'Re-scan' button at the top of the Home screen to scan your mood. We'll recommend products that match how you feel! 🎭";
        } else if (lower.includes('happy') || lower.includes('good') || lower.includes('great') || lower.includes('excited')) {
          demoResponse = "That's amazing! 🎉 Check out our 'Celebration' and 'Treat Yourself' sections — perfect for when you're on a high!";
        } else if (lower.includes('sad') || lower.includes('bad') || lower.includes('low') || lower.includes('tired') || lower.includes('stressed')) {
          demoResponse = "I'm sorry you're feeling that way. 🫂 Take it easy. Try scanning your mood — we have calming and comforting products picked just for you.";
        } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
          demoResponse = `Hi ${profile?.name?.split(' ')[0] || 'there'}! 👋 I can help with orders, the app, or just chat. What do you need?`;
        } else if (lower.includes('thank')) {
          demoResponse = "You're welcome! Happy shopping on MoodMarket! ❤️";
        } else if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
          demoResponse = "Prices vary by product and start from GH₵ 10. You'll see the price on each product page before adding to cart. 🏷️";
        }

        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), text: demoResponse, sender: 'bot', timestamp: new Date() },
        ]);
      }
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  return (
    <>
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
            },
          ]}
          onPress={toggleChat}
          activeOpacity={0.9}
        >
          <Sparkles size={24} color="#fff" />
          <View style={s.badge} />
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={toggleChat}>
        <TouchableWithoutFeedback onPress={toggleChat}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[s.modalOverlay, (isDesktop || isTablet) && s.modalOverlayWide]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              s.chatContainer,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                height: isDesktop || isTablet ? 600 : windowHeight * 0.7,
                width: isDesktop || isTablet ? 400 : '94%',
              },
            ]}
          >
            {/* Header */}
            <View style={[s.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
              <View style={s.headerTitleRow}>
                <View style={[s.botAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <Brain size={18} color={theme.primary} />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
                    Mood Assistant
                  </Text>
                  <View style={s.onlineRow}>
                    <View style={s.onlineDot} />
                    <Text style={[s.onlineText, { color: theme.textSecondary }]}>Always here to help</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChat} style={s.closeBtn} hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
                <View style={[s.closeBtnInner, { backgroundColor: theme.background }]}>
                  <X size={18} color={theme.textSecondary} />
                </View>
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
                  style={[s.messageRow, msg.sender === 'user' ? s.userRow : s.botRow]}
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
                        { color: msg.sender === 'user' ? '#fff' : theme.textPrimary, fontFamily: theme.fontBody },
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
                  placeholder="Ask me anything..."
                  placeholderTextColor={theme.inactive}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  onSubmitEditing={handleSend}
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
    ...Platform.select({ web: { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' } }),
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chatContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Platform.OS === 'ios' ? 0 : 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 20 },
      web: { 
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)', 
        marginBottom: 20,
        borderRadius: 20,
      } 
    }),
  },
  modalOverlayWide: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: 11 },
  closeBtn: { padding: 4 },
  closeBtnInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 16 },
  messageRow: { maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  botRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: { borderTopRightRadius: 4 },
  botBubble: { borderTopLeftRadius: 4, borderWidth: 1 },
  messageText: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 4 },
  inputArea: { padding: 12, borderTopWidth: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  input: { flex: 1, maxHeight: 100, fontSize: 14, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});