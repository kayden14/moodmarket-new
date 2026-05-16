/**
 * app/chat/index.tsx
 * 
 * Lists all active conversations for the current user.
 */

import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, ChevronRight, User } from 'lucide-react-native';

export default function ChatListScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // This is a complex query: get all unique people I've messaged
      // For simplicity in MVP, we'll fetch all messages where I'm sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by unique contact
      const contacts: Record<string, any> = {};
      data.forEach((m: any) => {
        const otherPerson = m.sender_id === user.id ? m.receiver : m.sender;
        if (!otherPerson) return;
        if (!contacts[otherPerson.id]) {
          contacts[otherPerson.id] = {
            id: otherPerson.id,
            name: otherPerson.name,
            lastMessage: m.content,
            time: m.created_at,
            unread: !m.is_read && m.receiver_id === user.id
          };
        }
      });

      return Object.values(contacts);
    },
    enabled: !!user?.id,
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[s.chatRow, { borderBottomColor: theme.border }]}
      onPress={() => router.push(`/chat/${item.id}?name=${encodeURIComponent(item.name || 'Vendor')}` as any)}
    >
      <View style={[s.avatar, { backgroundColor: theme.primary }]}>
        <Text style={s.avatarText}>{item.name?.[0].toUpperCase() || '?'}</Text>
      </View>
      
      <View style={s.chatInfo}>
        <View style={s.chatTop}>
          <Text style={[s.chatName, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{item.name || 'Vendor'}</Text>
          <Text style={[s.chatTime, { color: theme.inactive, fontFamily: theme.fontBody }]}>
            {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={s.chatBottom}>
          <Text style={[s.lastMsg, { color: theme.textSecondary, fontFamily: theme.fontBody }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread && <View style={[s.unreadDot, { backgroundColor: theme.primary }]} />}
        </View>
      </View>
      
      <ChevronRight size={16} color={theme.inactive} />
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={s.empty}>
          <MessageSquare size={64} color={theme.border} />
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No messages yet</Text>
          <Text style={[s.emptySub, { color: theme.textSecondary }]}>When you contact a vendor, your conversations will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
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
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  listContent: { paddingHorizontal: 16 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '700' },
  chatTime: { fontSize: 12 },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 14, flex: 1, marginRight: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 20 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
