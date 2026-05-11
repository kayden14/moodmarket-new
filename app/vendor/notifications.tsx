/**
 * app/vendor/notifications.tsx
 * Vendor notification centre — driven by useRealtimeNotifications.
 * Surfaces browser/push notifications automatically on INSERT.
 */
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import type { VendorNotification } from '@/services/vendorService';

const P = '#FF7A8A';
const BG = '#0F172A', CARD = '#1E293B', BORDER = '#334155', TEXT = '#F1F5F9', SUB = '#94A3B8';

function typeIcon(t: string) {
  const m: Record<string, string> = { order: '🛒', payout: '💸', warning: '⚠️', approval: '🎉', info: 'ℹ️' };
  return m[t] ?? 'ℹ️';
}
function typeColor(t: string) {
  const m: Record<string, string> = { order: '#38BDF8', payout: '#4ADE80', warning: '#F59E0B', approval: '#A78BFA', info: '#64748B' };
  return m[t] ?? '#64748B';
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function VendorNotifications() {
  const { profile } = useAuth();
  const router = useRouter();

  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useRealtimeNotifications({ vendorId: profile?.id });

  const renderItem = ({ item }: { item: VendorNotification }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: item.is_read ? CARD : CARD + 'EE', borderColor: item.is_read ? BORDER : typeColor(item.type) + '55' }]}
      onPress={() => !item.is_read && markRead(item.id)}
      activeOpacity={0.8}
    >
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: typeColor(item.type) + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ fontSize: 20 }}>{typeIcon(item.type)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: item.is_read ? '600' : '800', color: TEXT, flex: 1, marginRight: 8 }} numberOfLines={1}>{item.title}</Text>
          {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: P, flexShrink: 0 }} />}
        </View>
        <Text style={{ fontSize: 12, color: SUB, lineHeight: 18 }} numberOfLines={2}>{item.body}</Text>
        <Text style={{ fontSize: 10, color: typeColor(item.type), fontWeight: '600', marginTop: 5 }}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: TEXT, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: P, letterSpacing: 3 }}>VENDOR</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT }}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={{ backgroundColor: P + '22', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: P + '44' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: P }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={P} size="large" /></View>
        : <FlatList
            data={notifications}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 60, gap: 12 }}>
                <Text style={{ fontSize: 48 }}>🔔</Text>
                <Text style={{ color: SUB, fontSize: 14, textAlign: 'center' }}>You're all caught up! Notifications will appear here.</Text>
              </View>
            }
          />
      }
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  card:   { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, alignItems: 'flex-start' },
});
