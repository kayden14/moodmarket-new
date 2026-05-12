/**
 * app/admin/users.tsx
 * Admin users — content only (Layout provided by _layout.tsx).
 */

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, TextInput,
  Alert, Modal, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  Search, Shield, X, Calendar, Mail, Phone, Ban, CheckCircle, Store,
} from 'lucide-react-native';
import { useUsersData } from '@/hooks/useUsersData';
import { AdminProfile } from '@/types/admin';
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

export default function AdminUsersScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { users, loading, fetchUsers, setUsers } = useUsersData();

  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<AdminProfile | null>(null);
  const [userOrders,    setUserOrders]    = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterRole,    setFilterRole]    = useState<'all' | 'admin' | 'vendor' | 'user'>('all');
  const [confirmAction, setConfirmAction] = useState<{ type: 'admin' | 'vendor' | 'suspend' | 'delete'; user: AdminProfile } | null>(null);
  const [actioning,     setActioning]     = useState(false);

  const card    = isDark ? '#1E293B' : '#FFFFFF';
  const border  = isDark ? '#334155' : '#E2E8F0';
  const text    = isDark ? '#F1F5F9' : '#0F172A';
  const sub     = isDark ? '#94A3B8' : '#64748B';

  const filtered = users.filter(u => {
    const matchSearch = !search.trim() ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      filterRole === 'all'    ? true :
      filterRole === 'admin'  ? (u.role === 'admin'  || u.is_admin) :
      filterRole === 'vendor' ? u.role === 'vendor' :
                                (u.role === 'customer' || (!u.is_admin && u.role !== 'vendor'));
    return matchSearch && matchRole;
  });

  const openUser = async (user: AdminProfile) => {
    setSelected(user);
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setUserOrders(data ?? []);
    setLoadingOrders(false);
  };

  const handleToggleAdmin = async (user: AdminProfile) => {
    setActioning(true);
    const newIsAdmin = !user.is_admin;
    const newRole = newIsAdmin ? 'admin' : (user.role === 'admin' ? 'customer' : user.role);
    try {
      const { error } = await supabase.from('profiles').update({ is_admin: newIsAdmin, role: newRole }).eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: newIsAdmin, role: newRole as any } : u));
      if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, is_admin: newIsAdmin, role: newRole as any } : null);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const handleToggleVendor = async (user: AdminProfile) => {
    setActioning(true);
    const isVendor = user.role === 'vendor';
    const newRole = isVendor ? 'customer' : 'vendor';
    try {
      // 1. Update Profile Role
      const { error: profileError } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      if (profileError) throw profileError;

      // 2. Sync Vendors Table
      if (newRole === 'vendor') {
        const { error: vendorError } = await supabase.from('vendors').insert({
          user_id: user.id,
          store_name: `${user.name}'s Store`,
          contact_email: user.email,
        });
        if (vendorError) throw vendorError;
      } else {
        const { error: vendorError } = await supabase.from('vendors').delete().eq('user_id', user.id);
        if (vendorError) throw vendorError;
      }

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: (newRole as any) } : u));
      if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, role: (newRole as any) } : null);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const handleToggleSuspend = async (user: AdminProfile) => {
    setActioning(true);
    const newSuspended = !user.is_suspended;
    try {
      const { error } = await supabase.from('profiles').update({ is_suspended: newSuspended }).eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: newSuspended } : u));
      if (selected?.id === user.id) setSelected(prev => prev ? { ...prev, is_suspended: newSuspended } : null);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const handleDeleteUser = async (user: AdminProfile) => {
    setActioning(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSelected(null);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setActioning(false); setConfirmAction(null); }
  };

  const totalSpend = (orders: any[]) => orders.reduce((sum, o) => sum + Number(o.total_price), 0);
  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const renderItem = ({ item }: { item: AdminProfile }) => (
    <TouchableOpacity 
      style={[s.userCard, { backgroundColor: card, borderColor: border }]} 
      onPress={() => openUser(item)}
      activeOpacity={0.7}
    >
      <View style={[s.avatar, { backgroundColor: item.is_admin ? `${PRIMARY}22` : `${sub}22` }]}>
        <Text style={[s.avatarText, { color: item.is_admin ? PRIMARY : sub }]}>{initials(item.name)}</Text>
      </View>
      <View style={s.userInfo}>
        <Text style={[s.userName, { color: text }]} numberOfLines={1}>{item.name || 'Unknown'}</Text>
        <Text style={[s.userEmail, { color: sub }]} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={s.userBadgeRow}>
        {item.is_admin && (
          <View style={[s.badge, { backgroundColor: `${PRIMARY}15` }]}>
            <Shield size={10} color={PRIMARY} />
            <Text style={[s.badgeText, { color: PRIMARY }]}>Admin</Text>
          </View>
        )}
        {item.role === 'vendor' && (
          <View style={[s.badge, { backgroundColor: '#38BDF815' }]}>
            <Text style={[s.badgeText, { color: '#38BDF8' }]}>Vendor</Text>
          </View>
        )}
      </View>
      <Text style={{ color: sub, marginLeft: 8 }}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* ToolBar */}
      <View style={[s.toolBar, { backgroundColor: card, borderBottomColor: border }]}>
        <View style={[s.searchBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: border }]}>
          <Search size={18} color={sub} />
          <TextInput
            style={[s.searchInput, { color: text }]}
            placeholder="Search users..."
            placeholderTextColor={sub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'admin', 'vendor', 'user'] as const).map(role => (
            <TouchableOpacity 
              key={role} 
              onPress={() => setFilterRole(role)}
              style={[s.filterTab, { borderColor: border, backgroundColor: filterRole === role ? `${PRIMARY}15` : 'transparent' }]}
            >
              <Text style={[s.filterTabText, { color: filterRole === role ? PRIMARY : sub }]}>
                {role.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          numColumns={Platform.OS === 'web' ? 2 : 1}
          key={Platform.OS === 'web' ? 'web' : 'mobile'}
        />
      )}

      {/* USER DETAIL MODAL */}
      <Modal visible={!!selected} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.modalHeader, { borderBottomColor: border }]}>
              <Text style={[s.modalTitle, { color: text }]}>User Profile</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X size={24} color={sub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <View style={s.hero}>
                <View style={[s.heroAvatar, { backgroundColor: selected?.is_admin ? `${PRIMARY}22` : `${sub}22` }]}>
                  <Text style={[s.heroAvatarText, { color: selected?.is_admin ? PRIMARY : sub }]}>{selected ? initials(selected.name) : '?'}</Text>
                </View>
                <Text style={[s.heroName, { color: text }]}>{selected?.name || 'Unknown'}</Text>
                <Text style={[s.heroEmail, { color: sub }]}>{selected?.email}</Text>
              </View>

              <View style={s.statsRow}>
                <View style={[s.statItem, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                  <Text style={[s.statVal, { color: text }]}>{loadingOrders ? '...' : userOrders.length}</Text>
                  <Text style={[s.statLabel, { color: sub }]}>ORDERS</Text>
                </View>
                <View style={[s.statItem, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                  <Text style={[s.statVal, { color: text }]}>GH₵{loadingOrders ? '...' : totalSpend(userOrders).toFixed(0)}</Text>
                  <Text style={[s.statLabel, { color: sub }]}>SPENT</Text>
                </View>
                <View style={[s.statItem, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                  <Text style={[s.statVal, { color: text }]}>{selected?.mood_history?.length || 0}</Text>
                  <Text style={[s.statLabel, { color: sub }]}>SCANS</Text>
                </View>
              </View>

              {/* Actions Section */}
              <View style={s.actionSection}>
                <Text style={[s.sectionTitle, { color: sub }]}>ACTIONS</Text>
                <TouchableOpacity 
                  style={[s.actionBtn, { borderColor: border, backgroundColor: selected?.is_admin ? '#7F1D1D15' : '#1D4ED815' }]}
                  onPress={() => selected && setConfirmAction({ type: 'admin', user: selected })}
                >
                  <Shield size={18} color={selected?.is_admin ? '#F87171' : '#60A5FA'} />
                  <Text style={{ color: selected?.is_admin ? '#F87171' : '#60A5FA', fontWeight: '700' }}>
                    {selected?.is_admin ? 'Remove Admin Access' : 'Grant Admin Access'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s.actionBtn, { borderColor: border, backgroundColor: selected?.role === 'vendor' ? '#7F1D1D15' : '#05966915' }]}
                  onPress={() => selected && setConfirmAction({ type: 'vendor', user: selected })}
                >
                  <Store size={18} color={selected?.role === 'vendor' ? '#F87171' : '#10B981'} />
                  <Text style={{ color: selected?.role === 'vendor' ? '#F87171' : '#10B981', fontWeight: '700' }}>
                    {selected?.role === 'vendor' ? 'Remove Vendor Status' : 'Make Vendor'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s.actionBtn, { borderColor: border, backgroundColor: selected?.is_suspended ? '#05966915' : '#D9770615' }]}
                  onPress={() => selected && setConfirmAction({ type: 'suspend', user: selected })}
                >
                  <Ban size={18} color={selected?.is_suspended ? '#10B981' : '#F59E0B'} />
                  <Text style={{ color: selected?.is_suspended ? '#10B981' : '#F59E0B', fontWeight: '700' }}>
                    {selected?.is_suspended ? 'Unsuspend Account' : 'Suspend Account'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s.actionBtn, { borderColor: border, backgroundColor: '#7F1D1D15' }]}
                  onPress={() => selected && setConfirmAction({ type: 'delete', user: selected })}
                >
                  <Ban size={18} color="#F87171" />
                  <Text style={{ color: '#F87171', fontWeight: '700' }}>Delete User Profile</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CONFIRM MODAL */}
      {confirmAction && (
        <Modal visible={true} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.confirmBox, { backgroundColor: card, borderColor: border }]}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
              <Text style={[s.confirmTitle, { color: text }]}>Confirm Action</Text>
              <Text style={[s.confirmSub, { color: sub }]}>
                Are you sure you want to perform this action on {confirmAction.user.name}?
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity style={[s.cancelBtn, { flex: 1, borderColor: border }]} onPress={() => setConfirmAction(null)}>
                  <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.saveBtn, { flex: 1, backgroundColor: confirmAction.type === 'delete' ? '#450A0A' : PRIMARY }]} 
                  onPress={() => {
                    if (confirmAction.type === 'admin') handleToggleAdmin(confirmAction.user);
                    if (confirmAction.type === 'suspend') handleToggleSuspend(confirmAction.user);
                    if (confirmAction.type === 'delete') handleDeleteUser(confirmAction.user);
                    if (confirmAction.type === 'vendor') handleToggleVendor(confirmAction.user);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolBar: { padding: 16, borderBottomWidth: 1, gap: 12 },
  searchBox: { height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterTabText: { fontSize: 11, fontWeight: '800' },
  userCard: { flex: 1, margin: 4, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700' },
  userEmail: { fontSize: 12 },
  userBadgeRow: { flexDirection: 'row', gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalBody: { padding: 20, maxHeight: 600 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroAvatar: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroAvatarText: { fontSize: 28, fontWeight: '900' },
  heroName: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  heroEmail: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statItem: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  actionSection: { gap: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  modalFooter: { padding: 20, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  confirmBox: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  confirmSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});
