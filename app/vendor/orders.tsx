/**
 * app/vendor/orders.tsx
 * Vendor order management — content only (Layout provided by _layout.tsx).
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView, Platform, Alert,
} from 'react-native';
import { useVendorOrdersData } from '@/hooks/useVendorOrdersData';
import { updateOrderStatus } from '@/services/vendorService';
import { useTheme } from '@/contexts/ThemeContext';
import { ShoppingBag, X, Calendar, User, Package, MapPin, Phone, CheckCircle } from 'lucide-react-native';
import { VendorOrder } from '@/types/vendor';

const PRIMARY = '#FF7A8A';

function statusColor(s: string) {
  switch (s) {
    case 'paid':      return '#38BDF8';
    case 'shipped':   return '#A78BFA';
    case 'delivered': return '#4ADE80';
    case 'cancelled': return '#F87171';
    default:          return '#94A3B8';
  }
}

export default function VendorOrders() {
  const { theme, isDark } = useTheme();
  const { orders, loading, refreshing, setRefreshing, fetchOrders } = useVendorOrdersData();
  const [selected, setSelected] = useState<VendorOrder | null>(null);
  const [updating, setUpdating] = useState(false);

  const card = theme.card;
  const border = theme.border;
  const text = theme.textPrimary;
  const sub = theme.textSecondary;

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, status);
      setSelected(prev => prev ? { ...prev, status } : null);
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const renderItem = ({ item }: { item: VendorOrder }) => (
    <TouchableOpacity 
      style={[s.orderCard, { backgroundColor: card, borderColor: border }]}
      onPress={() => setSelected(item)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.orderId, { color: text }]}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={[s.orderDate, { color: sub }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.orderPrice, { color: text }]}>GH₵{Number(item.total_price).toFixed(2)}</Text>
        <View style={[s.statusBadge, { backgroundColor: statusColor(item.status) + '18' }]}>
          <Text style={[s.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={[s.center, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          numColumns={Platform.OS === 'web' ? 2 : 1}
          key={Platform.OS === 'web' ? 'web' : 'mobile'}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={PRIMARY} />}
        />
      )}

      {/* DETAIL MODAL */}
      <Modal visible={!!selected} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.modalHeader, { borderBottomColor: border }]}>
              <Text style={[s.modalTitle, { color: text }]}>Order Info</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X size={24} color={sub} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView style={s.modalBody}>
                <View style={s.section}>
                  <Text style={[s.label, { color: sub }]}>STATUS</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {['paid', 'shipped', 'delivered'].map(st => (
                      <TouchableOpacity 
                        key={st}
                        style={[s.statusTab, { 
                          borderColor: selected.status === st ? statusColor(st) : border,
                          backgroundColor: selected.status === st ? statusColor(st) + '15' : 'transparent'
                        }]}
                        onPress={() => handleUpdateStatus(selected.id, st)}
                        disabled={updating}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: selected.status === st ? statusColor(st) : sub }}>
                          {st.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s.section}>
                  <Text style={[s.label, { color: sub }]}>CUSTOMER & DELIVERY</Text>
                  <Text style={[s.infoVal, { color: text }]}>{selected.delivery_name || 'Guest User'}</Text>
                  <Text style={[s.infoSub, { color: sub }]}>{selected.delivery_address}</Text>
                  <Text style={[s.infoSub, { color: sub }]}>{selected.delivery_phone}</Text>
                </View>

                <View style={s.section}>
                  <Text style={[s.label, { color: sub }]}>ITEMS</Text>
                  {selected.products.map((p, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={[s.itemName, { color: text }]}>{p.name} x{p.quantity}</Text>
                      <Text style={[s.itemPrice, { color: text }]}>GH₵{(p.price * p.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={s.totalRow}>
                    <Text style={[s.totalLabel, { color: text }]}>Total Earnings</Text>
                    <Text style={[s.totalVal, { color: PRIMARY }]}>GH₵{Number(selected.total_price).toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  orderCard: { flex: 1, margin: 8, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center' },
  orderId: { fontSize: 13, fontWeight: '800' },
  orderDate: { fontSize: 11, marginTop: 4 },
  orderPrice: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 20, maxHeight: 600 },
  section: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  statusTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  infoVal: { fontSize: 15, fontWeight: '700' },
  infoSub: { fontSize: 13, marginTop: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 12, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalVal: { fontSize: 18, fontWeight: '900' },
});
