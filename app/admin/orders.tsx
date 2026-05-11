/**
 * app/admin/orders.tsx
 * Admin orders — content only (Layout provided by _layout.tsx).
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, ScrollView, Modal,
} from 'react-native';
import { useOrdersData } from '@/hooks/useOrdersData';
import { useTheme } from '@/contexts/ThemeContext';
import { ShoppingBag, X, Calendar, User, Package, MapPin, Phone, CreditCard } from 'lucide-react-native';
import { AdminOrder } from '@/types/admin';

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

export default function AdminOrdersScreen() {
  const { isDark } = useTheme();
  const { orders, loading, refreshing, setRefreshing, fetchOrders } = useOrdersData();
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const card = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text = isDark ? '#F1F5F9' : '#0F172A';
  const sub = isDark ? '#94A3B8' : '#64748B';

  const renderItem = ({ item }: { item: AdminOrder }) => (
    <TouchableOpacity 
      style={[s.orderCard, { backgroundColor: card, borderColor: border }]}
      onPress={() => setSelected(item)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.orderId, { color: text }]}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={[s.orderDate, { color: sub }]}>
          {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.orderPrice, { color: text }]}>GH₵{Number(item.total_price).toFixed(2)}</Text>
        <View style={[s.statusBadge, { backgroundColor: statusColor(item.status) + '18' }]}>
          <Text style={[s.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={{ color: sub, marginLeft: 12 }}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={s.center}>
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
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchOrders(); }}
        />
      )}

      {/* ORDER DETAIL MODAL */}
      <Modal visible={!!selected} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.modalHeader, { borderBottomColor: border }]}>
              <Text style={[s.modalTitle, { color: text }]}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X size={24} color={sub} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView style={s.modalBody}>
                <View style={s.detailHeader}>
                  <Text style={[s.detailId, { color: text }]}>#{selected.id.toUpperCase()}</Text>
                  <View style={[s.statusBadgeLarge, { backgroundColor: statusColor(selected.status) + '18' }]}>
                    <Text style={[s.statusTextLarge, { color: statusColor(selected.status) }]}>{selected.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <User size={16} color={sub} />
                    <Text style={[s.sectionTitle, { color: sub }]}>CUSTOMER</Text>
                  </View>
                  <Text style={[s.detailText, { color: text }]}>{selected.profiles?.name || 'Unknown'}</Text>
                  <Text style={[s.detailSubText, { color: sub }]}>{selected.profiles?.email}</Text>
                </View>

                <View style={s.section}>
                  <div style={{ height: 1, background: border, margin: '16px 0' }} />
                  <View style={s.sectionHeader}>
                    <Package size={16} color={sub} />
                    <Text style={[s.sectionTitle, { color: sub }]}>PRODUCTS</Text>
                  </View>
                  {selected.products.map((p, i) => (
                    <View key={i} style={s.productRow}>
                      <Text style={[s.productName, { color: text }]}>{p.name} x{p.quantity}</Text>
                      <Text style={[s.productPrice, { color: text }]}>GH₵{(p.price * p.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <div style={{ height: 1, background: border, margin: '12px 0' }} />
                  <View style={s.totalRow}>
                    <Text style={[s.totalLabel, { color: text }]}>Total</Text>
                    <Text style={[s.totalPrice, { color: PRIMARY }]}>GH₵{Number(selected.total_price).toFixed(2)}</Text>
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
  orderId: { fontSize: 14, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  orderDate: { fontSize: 12, marginTop: 4 },
  orderPrice: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 600, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalBody: { padding: 20, maxHeight: 600 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  detailId: { fontSize: 16, fontWeight: '800' },
  statusBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusTextLarge: { fontSize: 12, fontWeight: '900' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  detailText: { fontSize: 15, fontWeight: '700' },
  detailSubText: { fontSize: 13, marginTop: 2 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontSize: 14 },
  productPrice: { fontSize: 14, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalPrice: { fontSize: 20, fontWeight: '900' },
});
