import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Package, ShoppingCart, Users, DollarSign, 
  Clock, CheckCircle, Truck, Gift, ChevronRight,
  TrendingUp, TrendingDown, MoreHorizontal
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAdminData } from '@/hooks/useAdminData';
import { useTheme } from '@/contexts/ThemeContext';

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

export default function AdminDashboard() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats } = useAdminData();

  const text = theme.textPrimary;
  const sub = theme.textSecondary;
  const card = theme.card;
  const border = theme.border;

  const STAT_ITEMS = [
    { icon: Package, label: 'Total Products', value: String(stats.totalProducts),           color: '#38BDF8', trend: '+12%' },
    { icon: ShoppingCart, label: 'Total Orders', value: String(stats.totalOrders),             color: '#4ADE80', trend: '+5%' },
    { icon: Users, label: 'Total Users',        value: String(stats.totalUsers),              color: '#A78BFA', trend: '+24%' },
    { icon: DollarSign, label: 'Total Revenue',      value: `GH₵${stats.totalRevenue.toFixed(0)}`, color: PRIMARY,   trend: '+18%' },
  ];

  const STATUS_ROWS = [
    { label: 'Pending',   value: stats.pendingOrders,   color: '#94A3B8', icon: Clock },
    { label: 'Paid',      value: stats.paidOrders,      color: '#38BDF8', icon: CheckCircle },
    { label: 'Shipped',   value: stats.shippedOrders,   color: '#A78BFA', icon: Truck },
    { label: 'Delivered', value: stats.deliveredOrders, color: '#4ADE80', icon: Gift },
  ];

  if (loading) return (
    <View style={[s.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: theme.background }} 
      contentContainerStyle={{ padding: Platform.OS === 'web' ? 32 : 20, maxWidth: 1400, alignSelf: 'center', width: '100%' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={PRIMARY} />}
    >
      <View style={{ marginBottom: 32 }}>
        <Text style={[s.heading, { color: text }]}>System Overview</Text>
        <Text style={[s.subheading, { color: sub }]}>Monitor your marketplace metrics and activities.</Text>
      </View>

      {/* Stat Grid */}
      <View style={s.statGrid}>
        {STAT_ITEMS.map((item, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: card, borderColor: border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={[s.statIcon, { backgroundColor: item.color + '15' }]}>
                <item.icon size={22} color={item.color} />
              </View>
              <View style={[s.trendBadge, { backgroundColor: '#4ADE8015' }]}>
                <TrendingUp size={12} color="#4ADE80" />
                <Text style={s.trendText}>{item.trend}</Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <Text style={[s.statLabel, { color: sub }]}>{item.label}</Text>
              <Text style={[s.statValue, { color: text }]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={s.bottomRow}>
        {/* Order Status Distribution */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border }]}>
            <Text style={[s.sectionTitle, { color: text }]}>Order Status</Text>
            <TouchableOpacity><MoreHorizontal size={18} color={sub} /></TouchableOpacity>
          </View>
          <View style={{ padding: 8 }}>
            {STATUS_ROWS.map((row, i) => (
              <View key={i} style={s.statusRow}>
                <View style={[s.rowIcon, { backgroundColor: row.color + '12' }]}>
                  <row.icon size={16} color={row.color} />
                </View>
                <Text style={[s.rowLabel, { color: text }]}>{row.label}</Text>
                <View style={[s.statusValueWrap, { backgroundColor: isDark ? '#222' : '#F8FAFC' }]}>
                  <Text style={[s.rowValue, { color: row.color }]}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Orders List */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border, flex: 2 }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border }]}>
            <Text style={[s.sectionTitle, { color: text }]}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/admin/orders' as any)}>
              <Text style={{ color: PRIMARY, fontSize: 13, fontWeight: '700' }}>View all orders</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 8 }}>
            {recentOrders.length === 0 ? (
              <View style={{ padding: 48, alignItems: 'center' }}>
                <Package size={40} color={sub} strokeWidth={1} style={{ marginBottom: 12 }} />
                <Text style={{ color: sub, fontSize: 14 }}>No orders found yet</Text>
              </View>
            ) : recentOrders.map((order, i) => (
              <TouchableOpacity 
                key={order.id} 
                style={[s.orderRow, { borderBottomColor: i < recentOrders.length - 1 ? border : 'transparent' }]}
                onPress={() => router.push('/admin/orders' as any)}
              >
                <View style={s.orderMainInfo}>
                  <View style={s.orderAvatar}>
                    <Text style={s.orderAvatarText}>{(order.delivery_phone || 'U')[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={[s.orderId, { color: text }]}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={[s.orderDate, { color: sub }]}>
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                    </Text>
                  </View>
                </View>
                
                <View style={s.orderMetaInfo}>
                  <Text style={[s.orderPrice, { color: text }]}>GH₵{Number(order.total_price).toFixed(2)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: statusColor(order.status) + '15' }]}>
                    <Text style={[s.statusText, { color: statusColor(order.status) }]}>{order.status}</Text>
                  </View>
                  <ChevronRight size={18} color={sub} style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  subheading: { fontSize: 16, fontWeight: '500', opacity: 0.8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -10, marginBottom: 32 },
  statCard: { flex: 1, minWidth: 260, margin: 10, padding: 24, borderRadius: 20, borderWidth: 1, ...Platform.select({ web: { boxShadow: '0 4px 20px rgba(0,0,0,0.03)' } as any }) },
  statIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  statLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  trendText: { fontSize: 11, fontWeight: '800', color: '#4ADE80' },
  bottomRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 24 },
  sectionCard: { flex: 1, borderRadius: 20, borderWidth: 1, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 10px 30px rgba(0,0,0,0.04)' } as any }) },
  sectionHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  statusValueWrap: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  rowValue: { fontSize: 16, fontWeight: '800' },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  orderMainInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  orderAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF7A8A20', alignItems: 'center', justifyContent: 'center' },
  orderAvatarText: { color: '#FF7A8A', fontWeight: '800', fontSize: 16 },
  orderId: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  orderDate: { fontSize: 12, fontWeight: '500' },
  orderMetaInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderPrice: { fontSize: 15, fontWeight: '800' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, minWidth: 80, alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
});

