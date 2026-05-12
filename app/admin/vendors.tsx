/**
 * app/admin/vendors.tsx
 * Admin vendors — content only (Layout provided by _layout.tsx).
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, ScrollView, Modal, Alert, TextInput,
} from 'react-native';
import { useVendorsData } from '@/hooks/useVendorsData';
import { approveVendorApplication, rejectVendorApplication, suspendAccount } from '@/services/vendorService';
import { useTheme } from '@/contexts/ThemeContext';
import { CheckCircle, XCircle, Ban, Store, User, Mail, Calendar } from 'lucide-react-native';

const PRIMARY = '#FF7A8A';

export default function AdminVendorsScreen() {
  const { isDark } = useTheme();
  const { vendors, apps, loading, fetchData } = useVendorsData();
  const [tab, setTab] = useState<'active' | 'pending'>('active');
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Rejection Modal State
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionAppId, setRejectionAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const card = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text = isDark ? '#F1F5F9' : '#0F172A';
  const sub = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0F172A' : '#F8FAFC';

  const handleApprove = async (app: any) => {
    // BUG FIX: Ensure the application status is still pending before approving
    if (app.status !== 'pending') {
      Alert.alert('Error', 'This application has already been processed.');
      fetchData();
      return;
    }

    setProcessing(app.id);
    try {
      await approveVendorApplication(app);
      Alert.alert('Success', 'Vendor application approved.');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcessing(null);
    }
  };

  const openRejectionModal = (appId: string) => {
    setRejectionAppId(appId);
    setRejectionReason('');
    setRejectionModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim() || !rejectionAppId) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }
    
    setProcessing(rejectionAppId);
    setRejectionModalVisible(false);
    
    try {
      await rejectVendorApplication(rejectionAppId, rejectionReason.trim());
      Alert.alert('Success', 'Application rejected.');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcessing(null);
      setRejectionAppId(null);
    }
  };

  const handleSuspend = async (vendor: any) => {
    const action = vendor.is_suspended ? 'unsuspend' : 'suspend';
    Alert.alert('Confirm', `Are you sure you want to ${action} ${vendor.store_name || vendor.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try {
          await suspendAccount(vendor.user_id, !vendor.is_suspended);
          fetchData();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  const renderVendor = ({ item }: { item: any }) => (
    <View style={[s.card, { backgroundColor: card, borderColor: border }]}>
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: `${PRIMARY}22` }]}>
          <Store size={20} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.vendorName, { color: text }]}>{item.store_name || item.name}</Text>
          <Text style={[s.vendorEmail, { color: sub }]}>{item.email}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: item.is_suspended ? '#7F1D1D22' : '#05966922' }]}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: item.is_suspended ? '#F87171' : '#10B981' }}>
            {item.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
          </Text>
        </View>
      </View>
      
      <View style={s.cardActions}>
        <TouchableOpacity 
          style={[s.actionBtn, { borderColor: border }]}
          onPress={() => handleSuspend(item)}
        >
          <Ban size={16} color={item.is_suspended ? '#10B981' : '#F87171'} />
          <Text style={{ color: item.is_suspended ? '#10B981' : '#F87171', fontWeight: '700', fontSize: 13 }}>
            {item.is_suspended ? 'Unsuspend' : 'Suspend'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApp = ({ item }: { item: any }) => (
    <View style={[s.card, { backgroundColor: card, borderColor: border }]}>
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: '#38BDF822' }]}>
          <User size={20} color="#38BDF8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.vendorName, { color: text }]}>{item.store_name}</Text>
          <Text style={[s.vendorEmail, { color: sub }]}>Applicant: {item.user_name}</Text>
        </View>
        <Text style={{ fontSize: 11, color: sub }}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      
      <Text style={[s.appDesc, { color: text }]}>{item.store_description || 'No description provided.'}</Text>
      
      <View style={s.cardActions}>
        <TouchableOpacity 
          style={[s.actionBtn, { borderColor: border, backgroundColor: '#05966915' }]}
          onPress={() => handleApprove(item)}
          disabled={!!processing || item.status !== 'pending'}
        >
          <CheckCircle size={16} color="#10B981" />
          <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 13 }}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.actionBtn, { borderColor: border, backgroundColor: '#7F1D1D15' }]}
          onPress={() => openRejectionModal(item.id)}
          disabled={!!processing || item.status !== 'pending'}
        >
          <XCircle size={16} color="#F87171" />
          <Text style={{ color: '#F87171', fontWeight: '700', fontSize: 13 }}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.toolBar, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity 
          onPress={() => setTab('active')}
          style={[s.tab, tab === 'active' && { borderBottomColor: PRIMARY }]}
        >
          <Text style={[s.tabText, { color: tab === 'active' ? PRIMARY : sub }]}>
            Active Vendors ({vendors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setTab('pending')}
          style={[s.tab, tab === 'pending' && { borderBottomColor: PRIMARY }]}
        >
          <Text style={[s.tabText, { color: tab === 'pending' ? PRIMARY : sub }]}>
            Pending Applications ({apps.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={tab === 'active' ? vendors : apps}
          renderItem={tab === 'active' ? renderVendor : renderApp}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          numColumns={Platform.OS === 'web' ? 2 : 1}
          key={Platform.OS === 'web' ? 'web' : 'mobile'}
          ListEmptyComponent={
            <View style={s.empty}>
              <Store size={48} color={sub} />
              <Text style={{ color: sub, marginTop: 12 }}>No {tab} vendors found.</Text>
            </View>
          }
        />
      )}

      {/* Rejection Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectionModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>
            <Text style={[s.modalTitle, { color: text }]}>Reject Application</Text>
            <Text style={[s.modalSub, { color: sub }]}>Please provide a reason for rejecting this vendor application. This will be sent to the applicant.</Text>
            
            <TextInput
              style={[s.reasonInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
              placeholder="e.g. Incomplete store information, inappropriate content, etc."
              placeholderTextColor={sub}
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={s.modalActions}>
              <TouchableOpacity 
                style={[s.modalBtn, { borderColor: border }]} 
                onPress={() => setRejectionModalVisible(false)}
              >
                <Text style={{ color: sub, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.modalBtn, { backgroundColor: '#F87171', borderColor: '#F87171' }]} 
                onPress={handleConfirmReject}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Reject Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: { paddingVertical: 16, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '700' },
  card: { flex: 1, margin: 8, borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vendorName: { fontSize: 16, fontWeight: '800' },
  vendorEmail: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  appDesc: { fontSize: 13, lineHeight: 18, marginBottom: 20 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  modalSub: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  reasonInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 100, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
