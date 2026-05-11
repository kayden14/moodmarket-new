/**
 * app/admin/vendors.tsx
 * Admin vendor management — applications + active vendors + payouts.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert, Platform, StatusBar, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  getAllApplications, getAllVendors, getAllVendorPayouts,
  approveVendorApplication, rejectVendorApplication,
  updatePayoutStatus, suspendAccount,
} from '@/services/vendorService';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { useFocusEffect } from 'expo-router';

const P = '#FF7A8A';
const BG = '#0F172A', CARD = '#1E293B', BORDER = '#334155', TEXT = '#F1F5F9', SUB = '#94A3B8';

type Tab = 'vendors' | 'applications' | 'payouts';

function statusColor(s: string) {
  const m: Record<string, string> = { approved: '#4ADE80', active: '#4ADE80', pending: '#F59E0B', rejected: '#F87171', failed: '#F87171', processing: '#38BDF8', paid: '#4ADE80' };
  return m[s] ?? '#94A3B8';
}

export default function AdminVendors() {
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>('vendors');
  const [vendors, setVendors]       = useState<any[]>([]);
  const [applications, setApps]     = useState<any[]>([]);
  const [payouts, setPayouts]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<any | null>(null);
  const [actioning, setActioning]   = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [payoutModal, setPayoutModal] = useState<any | null>(null);
  const [transferCode, setTransferCode] = useState('');

  const load = useCallback(async () => {
    const [v, a, p] = await Promise.all([getAllVendors(), getAllApplications(), getAllVendorPayouts()]);
    setVendors(v); setApps(a); setPayouts(p); setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useRealtimeChannel({ channelName: 'admin-vendor-apps', table: 'vendor_applications', onEvent: load });
  useRealtimeChannel({ channelName: 'admin-vendor-payouts', table: 'vendor_payouts', onEvent: load });

  const approve = async (app: any) => {
    setActioning(true);
    try { await approveVendorApplication(app); await load(); Alert.alert('Approved ✓', `${app.store_name} is now live.`); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActioning(false); }
  };

  const reject = async () => {
    if (!rejectModal) return;
    setActioning(true);
    try { await rejectVendorApplication(rejectModal.id, rejectNote.trim() || undefined); setRejectModal(null); setRejectNote(''); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActioning(false); }
  };

  const markPaid = async () => {
    if (!payoutModal) return;
    setActioning(true);
    try {
      await updatePayoutStatus(payoutModal.id, 'paid', { paystack_transfer_code: transferCode.trim() || undefined });
      // notify vendor
      await supabase.from('vendor_notifications').insert({ vendor_id: payoutModal.vendor_id, title: '💸 Payout Processed!', body: `GH₵${Number(payoutModal.amount).toFixed(2)} has been sent to your ${payoutModal.payment_method === 'momo' ? 'mobile money' : 'bank'} account.`, type: 'payout', meta: { payout_id: payoutModal.id } });
      setPayoutModal(null); setTransferCode(''); await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActioning(false); }
  };

  const toggleSuspend = async (vendor: any) => {
    Alert.alert(vendor.is_suspended ? 'Reinstate Vendor' : 'Suspend Vendor',
      `Are you sure you want to ${vendor.is_suspended ? 'reinstate' : 'suspend'} ${vendor.store_name ?? vendor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: async () => {
          await suspendAccount(vendor.id, !vendor.is_suspended); await load();
        }},
      ]);
  };

  const pendingApps = applications.filter(a => a.status === 'pending');

  const renderVendor = ({ item }: { item: any }) => (
    <TouchableOpacity style={[s.card, { backgroundColor: CARD, borderColor: BORDER }]} onPress={() => setSelected(item)} activeOpacity={0.8}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: P + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>🏪</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{item.store_name ?? item.name}</Text>
        <Text style={{ fontSize: 12, color: SUB }}>{item.email}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {item.is_suspended && <View style={{ backgroundColor: '#F8717122', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, fontWeight: '800', color: '#F87171' }}>SUSPENDED</Text></View>}
        <Text style={{ fontSize: 10, color: SUB }}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderApp = ({ item }: { item: any }) => (
    <View style={[s.card, { backgroundColor: CARD, borderColor: statusColor(item.status) + '44' }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{item.store_name}</Text>
        <Text style={{ fontSize: 12, color: SUB }}>{item.user_name} · {item.user_email}</Text>
        {item.store_description && <Text style={{ fontSize: 12, color: SUB, marginTop: 4 }} numberOfLines={2}>{item.store_description}</Text>}
        <Text style={{ fontSize: 11, color: SUB, marginTop: 4 }}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
      {item.status === 'pending' && (
        <View style={{ gap: 8 }}>
          <TouchableOpacity style={{ backgroundColor: '#4ADE8022', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#4ADE8044', opacity: actioning ? 0.5 : 1 }}
            onPress={() => approve(item)} disabled={actioning}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#4ADE80' }}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#F8717122', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#F8717144' }}
            onPress={() => { setRejectModal(item); setRejectNote(''); }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#F87171' }}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status !== 'pending' && (
        <View style={{ backgroundColor: statusColor(item.status) + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(item.status), textTransform: 'capitalize' }}>{item.status}</Text>
        </View>
      )}
    </View>
  );

  const renderPayout = ({ item }: { item: any }) => (
    <View style={[s.card, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>GH₵ {Number(item.amount).toFixed(2)}</Text>
        <Text style={{ fontSize: 12, color: SUB }}>{item.vendor_name} · {item.payment_method === 'momo' ? '📱' : '🏦'} {item.account_number}</Text>
        <Text style={{ fontSize: 11, color: SUB, marginTop: 4 }}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={{ backgroundColor: statusColor(item.status) + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(item.status), textTransform: 'capitalize' }}>{item.status}</Text>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity style={{ backgroundColor: '#38BDF822', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#38BDF844' }}
            onPress={() => { setPayoutModal(item); setTransferCode(''); }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#38BDF8' }}>Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'vendors',      label: '🏪 Vendors',      badge: vendors.length },
    { key: 'applications', label: '📋 Applications', badge: pendingApps.length },
    { key: 'payouts',      label: '💸 Payouts',       badge: payouts.filter(p => p.status === 'pending').length },
  ];

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={P} size="large" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: TEXT, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: P, letterSpacing: 3 }}>ADMIN</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT }}>Vendors</Text>
        </View>
        {pendingApps.length > 0 && (
          <View style={{ backgroundColor: '#F59E0B22', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#F59E0B44' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B' }}>{pendingApps.length} pending</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? P : 'transparent' }}
            onPress={() => setTab(t.key)}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t.key ? P : SUB }}>
              {t.label}{t.badge ? ` (${t.badge})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'vendors' && (
        <FlatList data={vendors} keyExtractor={i => i.id} renderItem={renderVendor} contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 40, marginBottom: 12 }}>🏪</Text><Text style={{ color: SUB }}>No vendors yet.</Text></View>} />
      )}
      {tab === 'applications' && (
        <FlatList data={applications} keyExtractor={i => i.id} renderItem={renderApp} contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text><Text style={{ color: SUB }}>No applications.</Text></View>} />
      )}
      {tab === 'payouts' && (
        <FlatList data={payouts} keyExtractor={i => i.id} renderItem={renderPayout} contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 40, marginBottom: 12 }}>💸</Text><Text style={{ color: SUB }}>No payout requests.</Text></View>} />
      )}

      {/* Vendor detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
              <TouchableOpacity onPress={() => setSelected(null)} style={{ marginRight: 12 }}><Text style={{ color: TEXT, fontSize: 22 }}>✕</Text></TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: TEXT }}>Vendor Profile</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={{ alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 20 }}>
                <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: P + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 32 }}>🏪</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 4 }}>{selected.store_name ?? selected.name}</Text>
                <Text style={{ fontSize: 13, color: SUB }}>{selected.email}</Text>
                {selected.store_description && <Text style={{ fontSize: 13, color: SUB, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{selected.store_description}</Text>}
                {selected.is_suspended && <View style={{ marginTop: 10, backgroundColor: '#F8717122', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontSize: 12, fontWeight: '800', color: '#F87171' }}>SUSPENDED</Text></View>}
              </View>

              <Text style={s.sectionLabel}>ACTIONS</Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: selected.is_suspended ? '#4ADE8018' : '#F8717118', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: selected.is_suspended ? '#4ADE8044' : '#F8717144', marginBottom: 40 }}
                onPress={() => { toggleSuspend(selected); setSelected(null); }}>
                <Text style={{ fontSize: 18 }}>{selected.is_suspended ? '✅' : '🚫'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: selected.is_suspended ? '#4ADE80' : '#F87171' }}>
                  {selected.is_suspended ? 'Reinstate Vendor' : 'Suspend Vendor'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal visible={!!rejectModal} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT, marginBottom: 6 }}>Reject Application</Text>
            <Text style={{ fontSize: 13, color: SUB, marginBottom: 18 }}>Optionally add a note for the applicant.</Text>
            <TextInput style={{ backgroundColor: BG, borderRadius: 12, padding: 14, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER, height: 80, textAlignVertical: 'top', marginBottom: 18 }}
              placeholder="Reason for rejection (optional)…" placeholderTextColor={SUB} value={rejectNote} onChangeText={setRejectNote} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' }} onPress={() => setRejectModal(null)}>
                <Text style={{ color: TEXT, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#450A0A', borderWidth: 1, borderColor: '#7F1D1D', alignItems: 'center', opacity: actioning ? 0.5 : 1 }} onPress={reject} disabled={actioning}>
                {actioning ? <ActivityIndicator color="#F87171" size="small" /> : <Text style={{ color: '#F87171', fontWeight: '800' }}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mark paid modal */}
      <Modal visible={!!payoutModal} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT, marginBottom: 4 }}>Mark Payout as Paid</Text>
            <Text style={{ fontSize: 13, color: SUB, marginBottom: 18 }}>GH₵{Number(payoutModal?.amount ?? 0).toFixed(2)} to {payoutModal?.vendor_name}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: SUB, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paystack Transfer Code (optional)</Text>
            <TextInput style={{ backgroundColor: BG, borderRadius: 12, padding: 14, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER, marginBottom: 18 }}
              placeholder="TRF_XXXXXXXX…" placeholderTextColor={SUB} value={transferCode} onChangeText={setTransferCode} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' }} onPress={() => setPayoutModal(null)}>
                <Text style={{ color: TEXT, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#4ADE8022', borderWidth: 1, borderColor: '#4ADE8044', alignItems: 'center', opacity: actioning ? 0.5 : 1 }} onPress={markPaid} disabled={actioning}>
                {actioning ? <ActivityIndicator color="#4ADE80" size="small" /> : <Text style={{ color: '#4ADE80', fontWeight: '800' }}>✓ Mark Paid</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  card:         { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, alignItems: 'center' },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: SUB, letterSpacing: 2, marginBottom: 10 },
});
