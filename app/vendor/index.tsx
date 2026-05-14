/**
 * app/vendor/index.tsx
 * Vendor dashboard — content only (Layout provided by _layout.tsx).
 */

import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVendorData } from '@/hooks/useVendorData';
import { useTheme } from '@/contexts/ThemeContext';
import { Package, ShoppingBag, DollarSign, TrendingUp, Bell, ChevronRight } from 'lucide-react-native';

const PRIMARY = '#FF7A8A';

export default function VendorDashboard() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { stats, loading, refreshing, setRefreshing, fetchStats } = useVendorData();

  const text = theme.textPrimary;
  const sub = theme.textSecondary;
  const card = theme.card;
  const border = theme.border;

  const STAT_ITEMS = [
    { icon: <Package size={20} color="#38BDF8" />, label: 'Active Products', value: String(stats?.activeProducts || 0), color: '#38BDF8', bg: '#38BDF815' },
    { icon: <ShoppingBag size={20} color="#4ADE80" />, label: 'Pending Orders', value: String(stats?.pendingOrders || 0), color: '#4ADE80', bg: '#4ADE8015' },
    { icon: <DollarSign size={20} color={PRIMARY} />, label: 'Month Revenue', value: `GH₵${stats?.monthRevenue.toFixed(0) || 0}`, color: PRIMARY, bg: `${PRIMARY}15` },
    { icon: <TrendingUp size={20} color="#A78BFA" />, label: 'Total Sales', value: String(stats?.totalOrders || 0), color: '#A78BFA', bg: '#A78BFA15' },
  ];

  if (loading) return (
    <View style={[s.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  return (
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={PRIMARY} />}
    >
      {/* Stat Grid */}
      <View style={s.statGrid}>
        {STAT_ITEMS.map((item, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.statIcon, { backgroundColor: item.bg }]}>
              {item.icon}
            </View>
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[s.statLabel, { color: sub }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.bottomRow}>
        {/* Quick Actions */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border }]}>
            <Text style={[s.sectionTitle, { color: sub }]}>QUICK ACTIONS</Text>
          </View>
          <TouchableOpacity style={[s.row, { borderBottomColor: border }]} onPress={() => router.push('/vendor/products')}>
            <Text style={[s.rowLabel, { color: text }]}>Manage Products</Text>
            <ChevronRight size={18} color={sub} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.row, { borderBottomColor: border }]} onPress={() => router.push('/vendor/orders')}>
            <Text style={[s.rowLabel, { color: text }]}>View Orders</Text>
            <ChevronRight size={18} color={sub} />
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={() => router.push('/vendor/earnings')}>
            <Text style={[s.rowLabel, { color: text }]}>Earnings & Payouts</Text>
            <ChevronRight size={18} color={sub} />
          </TouchableOpacity>
        </View>

        {/* Notifications Preview */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border, flex: 1.4 }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border, flexDirection: 'row', justifyContent: 'space-between' }]}>
            <Text style={[s.sectionTitle, { color: sub }]}>RECENT ALERTS</Text>
            {stats?.unreadNotifications ? (
              <View style={{ backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{stats.unreadNotifications} NEW</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={{ padding: 20, alignItems: 'center' }} onPress={() => router.push('/vendor/notifications')}>
            <Bell size={32} color={sub} style={{ marginBottom: 12 }} />
            <Text style={{ color: text, fontWeight: '700' }}>Check Notifications</Text>
            <Text style={{ color: sub, fontSize: 12, marginTop: 4 }}>Stay updated with your store activity.</Text>
          </TouchableOpacity>
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
  statCard: { flex: 1, minWidth: Platform.OS === 'web' ? 200 : '45%', margin: 8, padding: 20, borderRadius: 16, borderWidth: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  bottomRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 20 },
  sectionCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
});
