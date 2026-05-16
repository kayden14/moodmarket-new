/**
 * app/chat/[id].tsx
 * 
 * Real-time chat room between a user and a vendor.
 * Supports live messaging via Supabase Realtime.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Message } from '@/types/database';
import { Send, ArrowLeft, MoreVertical, CheckCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ChatRoomScreen() {
  const { id: receiverId, name: receiverName } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;

    fetchMessages();

    // ── REALTIME SUBSCRIPTION ──
    const channel = supabase
      .channel(`chat:${user.id}:${receiverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id}))`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, receiverId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    const messageContent = inputText.trim();
    setInputText('');

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: messageContent,
      });

      if (error) throw error;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback: if table doesn't exist, we show a mock UI
      if ((error as any).code === '42P01') {
        alert("The 'messages' table doesn't exist in Supabase yet. Please create it to enable chat.");
      }
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[s.messageRow, isMe ? s.myMessageRow : s.theirMessageRow]}>
        <View style={[
          s.bubble,
          isMe 
            ? { backgroundColor: theme.primary } 
            : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
        ]}>
          <Text style={[s.messageText, { color: isMe ? '#fff' : theme.textPrimary, fontFamily: theme.fontBody }]}>
            {item.content}
          </Text>
          <View style={s.bubbleFooter}>
            <Text style={[s.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.inactive }]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && <CheckCheck size={12} color="rgba(255,255,255,0.8)" />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[s.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={s.headerInfo}>
          <Text style={[s.headerName, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{receiverName || 'Vendor'}</Text>
          <Text style={[s.headerStatus, { color: theme.primary, fontFamily: theme.fontBody }]}>Online</Text>
        </View>

        <TouchableOpacity style={s.headerBtn}>
          <MoreVertical size={24} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input */}
      <View style={[s.inputArea, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={[s.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <TextInput
            style={[s.input, { color: theme.textPrimary, fontFamily: theme.fontBody }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.inactive}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[s.sendBtn, { backgroundColor: theme.primary }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 8 },
  headerName: { fontSize: 16, fontWeight: '800' },
  headerStatus: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 32 },
  messageRow: { marginBottom: 12, flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  bubbleFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-end', 
    gap: 4,
    marginTop: 4 
  },
  timeText: { fontSize: 10 },
  inputArea: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
