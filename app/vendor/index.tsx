import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Package, ShoppingBag, DollarSign, TrendingUp, 
  Bell, ChevronRight, LayoutGrid, ArrowUpRight,
  PlusCircle, CreditCard
} from 'lucide-react-native';
import { useVendorData } from '@/hooks/useVendorData';
import { useTheme } from '@/contexts/ThemeContext';

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
    { icon: Package, label: 'Active Products', value: String(stats?.activeProducts || 0), color: '#38BDF8' },
    { icon: ShoppingBag, label: 'Pending Orders', value: String(stats?.pendingOrders || 0), color: '#4ADE80' },
    { icon: DollarSign, label: 'Month Revenue', value: `GH₵${stats?.monthRevenue.toFixed(0) || 0}`, color: PRIMARY },
    { icon: TrendingUp, label: 'Total Sales', value: String(stats?.totalOrders || 0), color: '#A78BFA' },
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
        <Text style={[s.heading, { color: text }]}>Vendor Dashboard</Text>
        <Text style={[s.subheading, { color: sub }]}>Welcome back! Here's what's happening with your store today.</Text>
      </View>

      {/* Stat Grid */}
      <View style={s.statGrid}>
        {STAT_ITEMS.map((item, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.statIcon, { backgroundColor: item.color + '12' }]}>
              <item.icon size={22} color={item.color} />
            </View>
            <View style={{ marginTop: 16 }}>
              <Text style={[s.statLabel, { color: sub }]}>{item.label}</Text>
              <Text style={[s.statValue, { color: text }]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={s.bottomRow}>
        {/* Quick Actions */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border }]}>
            <Text style={[s.sectionTitle, { color: text }]}>Quick Actions</Text>
          </View>
          <View style={{ padding: 8 }}>
            <ActionRow 
              icon={<PlusCircle size={18} color={PRIMARY} />} 
              label="Add New Product" 
              onPress={() => router.push('/vendor/products')}
              isDark={isDark}
            />
            <ActionRow 
              icon={<Package size={18} color="#38BDF8" />} 
              label="Manage Inventory" 
              onPress={() => router.push('/vendor/products')}
              isDark={isDark}
            />
            <ActionRow 
              icon={<ShoppingCart size={18} color="#4ADE80" /> as any} 
              label="Active Orders" 
              onPress={() => router.push('/vendor/orders')}
              isDark={isDark}
            />
            <ActionRow 
              icon={<CreditCard size={18} color="#A78BFA" />} 
              label="Payout History" 
              onPress={() => router.push('/vendor/earnings')}
              isDark={isDark}
              last
            />
          </View>
        </View>

        {/* Notifications Preview */}
        <View style={[s.sectionCard, { backgroundColor: card, borderColor: border, flex: 1.5 }]}>
          <View style={[s.sectionHeader, { borderBottomColor: border }]}>
            <Text style={[s.sectionTitle, { color: text }]}>Recent Notifications</Text>
            <TouchableOpacity onPress={() => router.push('/vendor/notifications')}>
              <Text style={{ color: PRIMARY, fontSize: 13, fontWeight: '700' }}>View all</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={{ padding: 48, alignItems: 'center' }} 
            onPress={() => router.push('/vendor/notifications')}
          >
            <View style={s.bellIconWrap}>
              <Bell size={28} color={PRIMARY} />
              {stats?.unreadNotifications ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{stats.unreadNotifications}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: text, fontWeight: '800', fontSize: 16, marginTop: 16 }}>Store Alerts</Text>
            <Text style={{ color: sub, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Check your latest order updates and platform announcements.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function ActionRow({ icon, label, onPress, isDark, last = false }: any) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        s.actionRow, 
        { borderBottomColor: last ? 'transparent' : theme.border }
      ]}
    >
      <View style={s.actionIconWrap}>{icon}</View>
      <Text style={[s.actionLabel, { color: theme.textPrimary }]}>{label}</Text>
      <ArrowUpRight size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  subheading: { fontSize: 16, fontWeight: '500', opacity: 0.8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -10, marginBottom: 32 },
  statCard: { flex: 1, minWidth: 260, margin: 10, padding: 24, borderRadius: 20, borderWidth: 1 },
  statIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  statLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  bottomRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 24 },
  sectionCard: { flex: 1, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  actionIconWrap: { marginRight: 14 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  bellIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FF7A8A15', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: PRIMARY, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});

