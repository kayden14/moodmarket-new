/**
 * app/order/[id].tsx
 * Order tracking page — shows full order details + live status timeline
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowLeft, Package, CheckCircle, Truck, Home,
  Clock, Hash, MapPin, Phone, CreditCard,
  Smartphone, ShoppingBag, XCircle, RefreshCw,
} from 'lucide-react-native';
import { useResponsive } from '@/hooks/useResponsive';

const SUCCESS_GREEN = '#22C55E';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderProduct {
  productId: string;
  name:      string;
  price:     number;
  quantity:  number;
}

interface Order {
  id:                string;
  user_id:           string;
  products:          OrderProduct[];
  total_price:       number;
  status:            string;
  created_at:        string;
  payment_reference: string | null;
  payment_method:    string | null;
  delivery_address:  string | null;
  delivery_phone:    string | null;
}

// ─── Status config ────────────────────────────────────────────────────────────

function getStatusConfig(status: string, isDark: boolean) {
  switch (status) {
    case 'paid':      return { label: 'Paid',      color: '#0A7EA4', bg: isDark ? '#0D1F2D' : '#E8F4F8', Icon: CheckCircle };
    case 'shipped':   return { label: 'Shipped',   color: '#7C5CBF', bg: isDark ? '#1E1428' : '#F0EBF8', Icon: Truck       };
    case 'delivered': return { label: 'Delivered', color: SUCCESS_GREEN, bg: isDark ? '#0D2B1A' : '#EDFBF1', Icon: CheckCircle };
    case 'cancelled': return { label: 'Cancelled', color: '#E53E3E', bg: isDark ? '#2D1515' : '#FFF0F0', Icon: XCircle     };
    default:          return { label: status,      color: '#888888', bg: isDark ? '#222222' : '#F5F5F5', Icon: Clock        };
  }
}

// ─── Timeline steps ───────────────────────────────────────────────────────────

function getTimelineSteps(status: string) {
  const steps = [
    { key: 'paid',      Icon: CheckCircle, label: 'Payment Confirmed', sub: 'Your payment has been received'      },
    { key: 'packed',    Icon: Package,     label: 'Order Packed',      sub: 'Your items are being prepared'       },
    { key: 'shipped',   Icon: Truck,       label: 'Out for Delivery',  sub: 'Your order is on its way'            },
    { key: 'delivered', Icon: Home,        label: 'Delivered',         sub: 'Your order has arrived'              },
  ];

  const ORDER = ['paid', 'packed', 'shipped', 'delivered'];
  const currentIndex = status === 'paid' ? 0
    : status === 'shipped'   ? 2
    : status === 'delivered' ? 3
    : status === 'cancelled' ? -1
    : 0;

  return steps.map((step, i) => ({
    ...step,
    done:   i < currentIndex || (i === currentIndex && status === 'delivered'),
    active: i === currentIndex && status !== 'delivered',
  }));
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { theme } = useTheme();
  return (
    <View style={ir.row}>
      <Text style={[ir.label, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[ir.value, { color: accent ?? theme.textPrimary }]}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 16 },
});

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={[cd.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={cd.header}>
        {icon}
        <Text style={[cd.title, { color: theme.inactive }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const cd = StyleSheet.create({
  card:   { borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  title:  { fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderTrackingScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const { isWide, isDesktop } = useResponsive();

  const [order,     setOrder]     = useState<Order | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState('');

  const fetchOrder = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      setError('Order not found.');
    } else {
      setOrder(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleRefresh = () => { setRefreshing(true); fetchOrder(); };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );

  if (error || !order) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 32 }}>
      <Package size={48} color={theme.inactive} strokeWidth={1.5} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>Order Not Found</Text>
      <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>
        We couldn't find this order. It may have been removed.
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
        onPress={() => router.back()}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const cfg           = getStatusConfig(order.status, isDark);
  const StatusIcon    = cfg.Icon;
  const timelineSteps = getTimelineSteps(order.status);
  const isCancelled   = order.status === 'cancelled';
  const payLabel      = order.payment_method === 'card' ? 'Bank Card' : order.payment_method === 'mobile_money' ? 'Mobile Money' : order.payment_method ?? '—';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={s.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2' }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={[s.headerEye, { color: theme.primary }]}>ORDER TRACKING</Text>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity
          style={[s.refreshBtn, { backgroundColor: isDark ? '#1E1E2E' : '#F5F5F5' }]}
          onPress={handleRefresh}
        >
          <RefreshCw size={16} color={theme.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Status Banner ── */}
        <View style={[s.statusBanner, { backgroundColor: cfg.bg }]}>
          <StatusIcon size={28} color={cfg.color} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={[s.statusSub, { color: cfg.color, opacity: 0.75 }]}>
              {order.status === 'paid'      ? 'Your order is confirmed and being prepared'  :
               order.status === 'shipped'   ? 'Your order is on its way to you'             :
               order.status === 'delivered' ? 'Your order has been delivered successfully'  :
               order.status === 'cancelled' ? 'This order has been cancelled'               :
               'Order status updated'}
            </Text>
          </View>
        </View>

        {/* ── Timeline ── */}
        {!isCancelled && (
          <Card icon={<Clock size={14} color={theme.primary} strokeWidth={2.5} />} title="Order Status">
            {timelineSteps.map((step, i) => (
              <View key={step.key} style={s.timelineRow}>
                <View style={{ alignItems: 'center', width: 36 }}>
                  <View style={[s.timelineDot, {
                    backgroundColor:
                      step.done   ? (isDark ? '#0D2B1A' : '#EDFBF1') :
                      step.active ? (isDark ? '#2D1820' : '#FFF0F2') :
                      theme.background,
                    borderWidth: step.active ? 2 : 0,
                    borderColor: step.active ? theme.primary : 'transparent',
                  }]}>
                    <step.Icon
                      size={15}
                      color={step.done ? SUCCESS_GREEN : step.active ? theme.primary : theme.inactive}
                      strokeWidth={2}
                    />
                  </View>
                  {i < timelineSteps.length - 1 && (
                    <View style={[s.timelineLine, {
                      backgroundColor: step.done ? SUCCESS_GREEN : theme.border,
                    }]} />
                  )}
                </View>
                <View style={[s.timelineContent, i < timelineSteps.length - 1 && { paddingBottom: 20 }]}>
                  <Text style={[s.timelineLabel, {
                    color: step.done || step.active ? theme.textPrimary : theme.inactive,
                    fontWeight: step.active ? '800' : '600',
                  }]}>{step.label}</Text>
                  <Text style={[s.timelineSub, { color: theme.textSecondary }]}>{step.sub}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ── Order Reference ── */}
        <Card icon={<Hash size={14} color={theme.primary} strokeWidth={2.5} />} title="Order Reference">
          <Text style={[s.refNum, { color: theme.textPrimary }]}>
            {order.payment_reference ?? order.id.slice(0, 16).toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Clock size={12} color={theme.inactive} strokeWidth={2} />
            <Text style={[s.refDate, { color: theme.inactive }]}>
              {new Date(order.created_at).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        </Card>

        {/* ── Items ── */}
        <Card icon={<ShoppingBag size={14} color={theme.primary} strokeWidth={2.5} />} title="Items Ordered">
          {order.products.map((item, i) => (
            <View key={i} style={[s.itemRow, {
              borderBottomColor: theme.border,
              borderBottomWidth: i < order.products.length - 1 ? 1 : 0,
            }]}>
              <View style={[s.itemQtyBadge, { backgroundColor: theme.tint }]}>
                <Text style={[s.itemQty, { color: theme.primary }]}>×{item.quantity}</Text>
              </View>
              <Text style={[s.itemName, { color: theme.textPrimary }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[s.itemPrice, { color: theme.primary }]}>GH₵{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[s.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[s.totalLabel, { color: theme.textPrimary }]}>Total Paid</Text>
            <Text style={[s.totalValue, { color: theme.primary }]}>GH₵ {Number(order.total_price).toFixed(2)}</Text>
          </View>
        </Card>

        {/* ── Payment ── */}
        <Card icon={<CreditCard size={14} color={theme.primary} strokeWidth={2.5} />} title="Payment">
          <InfoRow label="Method" value={payLabel} />
          <InfoRow label="Status" value="Paid" accent={SUCCESS_GREEN} />
          {order.payment_reference && (
            <InfoRow label="Reference" value={order.payment_reference.slice(0, 24) + '…'} />
          )}
        </Card>

        {/* ── Delivery ── */}
        {(order.delivery_address || order.delivery_phone) && (
          <Card icon={<MapPin size={14} color={theme.primary} strokeWidth={2.5} />} title="Delivery Details">
            {order.delivery_address && <InfoRow label="Address" value={order.delivery_address} />}
            {order.delivery_phone  && <InfoRow label="Phone"   value={order.delivery_phone}   />}
          </Card>
        )}

        {/* ── Actions ── */}
        <TouchableOpacity
          style={[s.homeBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.88}
        >
          <Home size={16} color="#fff" strokeWidth={2} />
          <Text style={s.homeBtnTxt}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.ordersBtn, { borderColor: theme.primary }]}
          onPress={() => router.replace('/(tabs)/profile')}
          activeOpacity={0.75}
        >
          <Package size={15} color={theme.primary} strokeWidth={2} />
          <Text style={[s.ordersBtnTxt, { color: theme.primary }]}>All My Orders</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 1200 },
  header:       { flexDirection: 'row', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  refreshBtn:   { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerEye:    { fontSize: 9, fontWeight: '800', letterSpacing: 3, marginBottom: 2 },
  headerTitle:  { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

  scroll: { padding: 16, paddingBottom: 60 },

  statusBanner: { borderRadius: 18, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusLabel:  { fontSize: 18, fontWeight: '900', letterSpacing: -0.3, marginBottom: 4 },
  statusSub:    { fontSize: 13, lineHeight: 18 },

  timelineRow:     { flexDirection: 'row', gap: 12 },
  timelineDot:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  timelineLine:    { width: 2, flex: 1, minHeight: 20, marginTop: 2 },
  timelineContent: { flex: 1, paddingTop: 8 },
  timelineLabel:   { fontSize: 14, marginBottom: 3 },
  timelineSub:     { fontSize: 12, lineHeight: 17 },

  refNum:  { fontSize: 16, fontWeight: '900', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  refDate: { fontSize: 12, fontWeight: '500' },

  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  itemQtyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  itemQty:      { fontSize: 12, fontWeight: '800' },
  itemName:     { flex: 1, fontSize: 13, fontWeight: '600' },
  itemPrice:    { fontSize: 13, fontWeight: '800' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  totalLabel:   { fontSize: 14, fontWeight: '700' },
  totalValue:   { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  homeBtn:      { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  homeBtnTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },
  ordersBtn:    { borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  ordersBtnTxt: { fontSize: 14, fontWeight: '700' },
});