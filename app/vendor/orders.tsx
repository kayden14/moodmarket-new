/**
 * app/vendor/orders.tsx
 * Vendor order tracking — real-time, status updates, detail modal.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { getVendorOrders, updateOrderStatus } from '@/services/vendorService';
import type { VendorOrder } from '@/services/vendorService';
import { useFocusEffect } from 'expo-router';

const P = '#FF7A8A';
const BG = '#0F172A', CARD = '#1E293B', BORDER = '#334155', TEXT = '#F1F5F9', SUB = '#94A3B8';
const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

function statusColor(s: string) {
  const map: Record<string, string> = { paid: '#38BDF8', shipped: '#A78BFA', delivered: '#4ADE80', cancelled: '#F87171' };
  return map[s] ?? '#94A3B8';
}
function statusEmoji(s: string) {
  const map: Record<string, string> = { pending: '⏳', paid: '✅', shipped: '🚚', delivered: '🎁', cancelled: '❌' };
  return map[s] ?? '⏳';
}

// Vendors can only move to 'shipped' (paid→shipped). Other transitions are admin/customer.
const VENDOR_ALLOWED: Record<string, string[]> = {
  pending: [], paid: ['shipped'], shipped: [], delivered: [], cancelled: [],
};

export default function VendorOrders() {
  const { profile } = useAuth();
  const router = useRouter();
  const [orders, setOrders]         = useState<VendorOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<VendorOrder | null>(null);
  const [filter, setFilter]         = useState('all');
  const [updating, setUpdating]     = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const data = await getVendorOrders(profile.id);
    setOrders(data);
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { isConnected } = useRealtimeChannel({
    channelName: `vendor-orders-${profile?.id}`,
    table: 'orders',
    filter: profile?.id ? `vendor_id=eq.${profile.id}` : undefined,
    onEvent: load,
    enabled: !!profile?.id,
  });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      await load();
      setSelected(prev => prev?.id === orderId ? { ...prev, status: newStatus } : prev);
      Alert.alert('Updated ✓', `Order marked as ${newStatus}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setUpdating(false); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const countBy  = (s: string) => orders.filter(o => o.status === s).length;

  const renderOrder = ({ item }: { item: VendorOrder }) => (
    <TouchableOpacity style={[s.card, { backgroundColor: CARD, borderColor: BORDER }]} onPress={() => setSelected(item)} activeOpacity={0.75}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT }}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        <View style={{ backgroundColor: statusColor(item.status) + '22', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11 }}>{statusEmoji(item.status)}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(item.status), textTransform: 'capitalize' }}>{item.status}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: SUB }}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>GH₵ {Number(item.total_price).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: TEXT, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: P, letterSpacing: 3 }}>VENDOR</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT }}>Orders</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: isConnected ? '#4ADE80' : '#F59E0B' }}>{isConnected ? '🟢 Live' : '🟡 Sync'}</Text>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        {['all', ...STATUSES].map(st => {
          const active = filter === st;
          return (
            <TouchableOpacity key={st} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: active ? P : BG, borderColor: active ? P : BORDER }}
              onPress={() => setFilter(st)}>
              {st !== 'all' && <Text style={{ fontSize: 11 }}>{statusEmoji(st)}</Text>}
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : SUB, textTransform: 'capitalize' }}>
                {st === 'all' ? `All (${orders.length})` : `${st} (${countBy(st)})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={P} size="large" /></View>
        : <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderOrder} contentContainerStyle={{ padding: 14 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 40, marginBottom: 12 }}>🛒</Text><Text style={{ color: SUB }}>No orders yet.</Text></View>} />
      }

      {/* Order detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
              <TouchableOpacity onPress={() => setSelected(null)} style={{ marginRight: 12 }}>
                <Text style={{ color: TEXT, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: TEXT }}>#{selected.id.slice(0, 8).toUpperCase()}</Text>
              <View style={{ backgroundColor: statusColor(selected.status) + '22', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor(selected.status), textTransform: 'capitalize' }}>{statusEmoji(selected.status)} {selected.status}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Allowed status transitions */}
              {VENDOR_ALLOWED[selected.status]?.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>UPDATE STATUS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {VENDOR_ALLOWED[selected.status].map(st => (
                      <TouchableOpacity key={st} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, backgroundColor: statusColor(st) + '18', borderColor: statusColor(st), opacity: updating ? 0.5 : 1 }}
                        onPress={() => handleStatusUpdate(selected.id, st)} disabled={updating}>
                        <Text style={{ fontSize: 13 }}>{statusEmoji(st)}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor(st), textTransform: 'capitalize' }}>{st}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={s.sectionLabel}>ORDER DETAILS</Text>
              <View style={[s.infoCard, { backgroundColor: CARD, borderColor: BORDER }]}>
                {[
                  { label: 'Date',   value: new Date(selected.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                  { label: 'Total',  value: `GH₵ ${Number(selected.total_price).toFixed(2)}` },
                  selected.payment_method && { label: 'Payment', value: selected.payment_method === 'card' ? 'Bank Card' : 'Mobile Money' },
                ].filter(Boolean).map((r: any, i) => (
                  <View key={i} style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: BORDER }]}>
                    <Text style={{ fontSize: 12, color: SUB }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT }}>{r.value}</Text>
                  </View>
                ))}
              </View>

              {(selected.products ?? []).length > 0 && (
                <>
                  <Text style={s.sectionLabel}>ITEMS</Text>
                  <View style={[s.infoCard, { backgroundColor: CARD, borderColor: BORDER, padding: 0, overflow: 'hidden' }]}>
                    {(selected.products ?? []).map((item: any, i: number, arr: any[]) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: BORDER }}>
                        <View style={{ backgroundColor: P + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: P }}>×{item.quantity}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: TEXT }}>{item.name}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: P }}>GH₵{(item.price * item.quantity).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {(selected.delivery_address || selected.delivery_phone) && (
                <>
                  <Text style={s.sectionLabel}>DELIVERY</Text>
                  <View style={[s.infoCard, { backgroundColor: CARD, borderColor: BORDER }]}>
                    {selected.delivery_name    && <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 4 }}>{selected.delivery_name}</Text>}
                    {selected.delivery_address && <Text style={{ fontSize: 13, color: SUB, marginBottom: 4 }}>📍 {selected.delivery_address}</Text>}
                    {selected.delivery_phone   && <Text style={{ fontSize: 13, color: SUB }}>📱 {selected.delivery_phone}</Text>}
                  </View>
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  card:        { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  infoCard:    { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 4 },
  sectionLabel:{ fontSize: 10, fontWeight: '800', color: SUB, letterSpacing: 2, marginBottom: 8, marginTop: 16 },
});
