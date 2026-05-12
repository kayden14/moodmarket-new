/**
 * app/admin/index.tsx
 * Admin dashboard — content only (Layout provided by _layout.tsx).
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAdminData } from '@/hooks/useAdminData'; // I should move the data hook to a separate file too
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
  const { isDark } = useTheme();
  const { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats } = useAdminData();

  const text = isDark ? '#F1F5F9' : '#0F172A';
  const sub = isDark ? '#64748B' : '#64748B';
  const card = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';

  const STAT_ITEMS = [
    { icon: '📦', label: 'Products',     value: String(stats.totalProducts),           color: '#38BDF8', bg: '#38BDF818' },
    { icon: '🛒', label: 'Total Orders', value: String(stats.totalOrders),             color: '#4ADE80', bg: '#4ADE8018' },
    { icon: '👥', label: 'Users',        value: String(stats.totalUsers),              color: '#A78BFA', bg: '#A78BFA18' },
    { icon: '💰', label: 'Revenue',      value: `GH₵${stats.totalRevenue.toFixed(0)}`, color: PRIMARY,   bg: `${PRIMARY}18` },
  ];

  const STATUS_ROWS = [
    { label: 'Pending',   value: stats.pendingOrders,   color: '#94A3B8', icon: '⏳' },
    { label: 'Paid',      value: stats.paidOrders,      color: '#38BDF8', icon: '✅' },
    { label: 'Shipped',   value: stats.shippedOrders,   color: '#A78BFA', icon: '🚚' },
    { label: 'Delivered', value: stats.deliveredOrders, color: '#4ADE80', icon: '🎁' },
  ];

  if (loading) return (
    <View style={[s.center, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  return (
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={PRIMARY} />}
    >
      <View style={s.eyebrowWrap}>
        <Text style={[s.eyebrow, { color: PRIMARY }]}>OVERVIEW</Text>
        <Text style={[s.heading, { color: text }]}>Dashboard</Text>
      </View>

      {/* Stat Grid */}
      <View style={s.statGrid}>
        {STAT_ITEMS.map((item, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.statIcon, { backgroundColor: item.bg }]}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[s.statLabel, { color: sub }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.bottomRow}>
        {/* Order Status */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border }]}>
            <Text style={[s.sectionTitle, { color: sub }]}>ORDER STATUS</Text>
          </View>
          {STATUS_ROWS.map((row, i) => (
            <View key={i} style={[s.row, { borderBottomColor: i < STATUS_ROWS.length - 1 ? border : 'transparent' }]}>
              <View style={[s.rowIcon, { backgroundColor: row.color + '18' }]}>
                <Text style={{ fontSize: 16 }}>{row.icon}</Text>
              </View>
              <Text style={[s.rowLabel, { color: text }]}>{row.label}</Text>
              <Text style={[s.rowValue, { color: row.color }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Recent Orders */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border, flex: 1.6 }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border, justifyContent: 'space-between', flexDirection: 'row' }]}>
            <Text style={[s.sectionTitle, { color: sub }]}>RECENT ORDERS</Text>
            <TouchableOpacity onPress={() => router.push('/admin/orders' as any)}>
              <Text style={{ color: PRIMARY, fontSize: 12, fontWeight: '700' }}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: sub, fontSize: 13 }}>No orders yet</Text>
            </View>
          ) : recentOrders.map((order, i) => (
            <TouchableOpacity 
              key={order.id} 
              style={[s.row, { borderBottomColor: i < recentOrders.length - 1 ? border : 'transparent' }]}
              onPress={() => router.push('/admin/orders' as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.orderId, { color: text }]}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={[s.orderDate, { color: sub }]}>
                  {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[s.orderPrice, { color: text }]}>GH₵{Number(order.total_price).toFixed(0)}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor(order.status) + '18' }]}>
                <Text style={[s.statusText, { color: statusColor(order.status) }]}>{order.status}</Text>
              </View>
              <Text style={{ color: sub, marginLeft: 10 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eyebrowWrap: { marginBottom: 24 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 6 },
  heading: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 200, margin: 8, padding: 20, borderRadius: 16, borderWidth: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statValue: { fontSize: 28, fontWeight: '600', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  bottomRow: { flexDirection: Platform            .OS === 'web' ? 'row' : 'column', gap: 20 },
  sectionCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { padding: 16, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 20, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  orderId: { fontSize: 12, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  orderDate: { fontSize: 10, marginTop: 2 },
  orderPrice: { fontSize: 13, fontWeight: '700', marginRight: 15 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
});
