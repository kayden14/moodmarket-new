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
import { X, User, Package, MapPin, Phone, CreditCard } from 'lucide-react-native';
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

const STATUS_FILTERS = ['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function AdminOrdersScreen() {
  const { theme, isDark } = useTheme();
  const { orders, loading, refreshing, setRefreshing, fetchOrders } = useOrdersData();
  const [selected,     setSelected]     = useState<AdminOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  const card   = theme.card;
  const border = theme.border;
  const text   = theme.textPrimary;
  const sub    = theme.textSecondary;
  const bg     = theme.background;

  const filtered = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus);

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
        {item.profiles?.name
          ? <Text style={[s.orderCustomer, { color: sub }]}>{item.profiles.name}</Text>
          : null}
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
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Status filter tabs */}
      <View style={[s.filterBar, { backgroundColor: card, borderBottomColor: border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {STATUS_FILTERS.map(status => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[s.filterTab, {
                borderColor:       filterStatus === status ? PRIMARY : border,
                backgroundColor:   filterStatus === status ? `${PRIMARY}15` : 'transparent',
              }]}
            >
              <Text style={[s.filterTabText, { color: filterStatus === status ? PRIMARY : sub }]}>
                {status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ color: sub, fontSize: 14 }}>
            No {filterStatus === 'all' ? '' : filterStatus + ' '}orders found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>

            {/* Header */}
            <View style={[s.modalHeader, { borderBottomColor: border }]}>
              <Text style={[s.modalTitle, { color: text }]}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X size={24} color={sub} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>

                {/* Order ID + status */}
                <View style={s.detailHeader}>
                  <Text style={[s.detailId, { color: text }]}>
                    #{selected.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <View style={[s.statusBadgeLarge, { backgroundColor: statusColor(selected.status) + '18' }]}>
                    <Text style={[s.statusTextLarge, { color: statusColor(selected.status) }]}>
                      {selected.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[s.orderDateDetail, { color: sub }]}>
                  {new Date(selected.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>

                <View style={[s.divider, { backgroundColor: border }]} />

                {/* Customer */}
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <User size={14} color={sub} />
                    <Text style={[s.sectionTitle, { color: sub }]}>CUSTOMER</Text>
                  </View>
                  <Text style={[s.detailText, { color: text }]}>
                    {selected.profiles?.name || 'Unknown'}
                  </Text>
                  {selected.profiles?.email
                    ? <Text style={[s.detailSubText, { color: sub }]}>{selected.profiles.email}</Text>
                    : null}
                </View>

                {/* Delivery */}
                {(selected.shipping_address || selected.delivery_phone) && (
                  <>
                    <View style={[s.divider, { backgroundColor: border }]} />
                    <View style={s.section}>
                      {selected.shipping_address && (
                        <>
                          <View style={s.sectionHeader}>
                            <MapPin size={14} color={sub} />
                            <Text style={[s.sectionTitle, { color: sub }]}>DELIVERY ADDRESS</Text>
                          </View>
                          <Text style={[s.detailText, { color: text }]}>{selected.shipping_address}</Text>
                        </>
                      )}
                      {selected.delivery_phone && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <Phone size={14} color={sub} />
                          <Text style={[s.detailSubText, { color: sub }]}>{selected.delivery_phone}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Payment */}
                {selected.payment_method && (
                  <>
                    <View style={[s.divider, { backgroundColor: border }]} />
                    <View style={s.section}>
                      <View style={s.sectionHeader}>
                        <CreditCard size={14} color={sub} />
                        <Text style={[s.sectionTitle, { color: sub }]}>PAYMENT</Text>
                      </View>
                      <Text style={[s.detailText, { color: text, textTransform: 'capitalize' }]}>
                        {selected.payment_method}
                      </Text>
                      {selected.payment_reference && (
                        <Text style={[s.detailSubText, { color: sub }]}>
                          Ref: {selected.payment_reference}
                        </Text>
                      )}
                    </View>
                  </>
                )}

                <View style={[s.divider, { backgroundColor: border }]} />

                {/* Products */}
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <Package size={14} color={sub} />
                    <Text style={[s.sectionTitle, { color: sub }]}>PRODUCTS</Text>
                  </View>
                  {selected.products.length === 0 ? (
                    <Text style={[s.detailSubText, { color: sub }]}>No product details available</Text>
                  ) : (
                    selected.products.map((p, i) => (
                      <View key={i} style={s.productRow}>
                        <Text style={[s.productName, { color: text }]}>
                          {p.name} ×{p.quantity}
                        </Text>
                        <Text style={[s.productPrice, { color: text }]}>
                          GH₵{(p.price * p.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={[s.divider, { backgroundColor: border, marginVertical: 12 }]} />

                  <View style={s.totalRow}>
                    <Text style={[s.totalLabel, { color: text }]}>Total</Text>
                    <Text style={[s.totalPrice, { color: PRIMARY }]}>
                      GH₵{Number(selected.total_price).toFixed(2)}
                    </Text>
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
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar:        { borderBottomWidth: 1, paddingVertical: 12 },
  filterTab:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterTabText:    { fontSize: 11, fontWeight: '800' },
  orderCard:        { flex: 1, margin: 8, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center' },
  orderId:          { fontSize: 14, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  orderDate:        { fontSize: 12, marginTop: 2 },
  orderCustomer:    { fontSize: 11, marginTop: 2 },
  orderPrice:       { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText:       { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent:     { width: '100%', maxWidth: 600, borderRadius: 20, borderWidth: 1, overflow: 'hidden', maxHeight: '90%' },
  modalHeader:      { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:       { fontSize: 20, fontWeight: '900' },
  modalBody:        { padding: 20 },
  detailHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  detailId:         { fontSize: 16, fontWeight: '800' },
  orderDateDetail:  { fontSize: 12, marginBottom: 16 },
  statusBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusTextLarge:  { fontSize: 12, fontWeight: '900' },
  divider:          { height: 1, marginVertical: 16 },
  section:          { marginBottom: 4 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  detailText:       { fontSize: 15, fontWeight: '700' },
  detailSubText:    { fontSize: 13, marginTop: 2 },
  productRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName:      { fontSize: 14, flex: 1, marginRight: 8 },
  productPrice:     { fontSize: 14, fontWeight: '600' },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:       { fontSize: 16, fontWeight: '800' },
  totalPrice:       { fontSize: 20, fontWeight: '900' },
});