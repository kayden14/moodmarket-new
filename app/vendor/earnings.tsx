/**
 * app/vendor/earnings.tsx
 * Vendor financial dashboard — revenue breakdown + Paystack payout request.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getVendorStats, getVendorPayouts, requestPayout } from '@/services/vendorService';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import type { VendorStats, VendorPayout } from '@/services/vendorService';
import { useFocusEffect } from 'expo-router';

const P = '#FF7A8A';

function statusColor(s: string) {
  const m: Record<string, string> = { paid: '#4ADE80', processing: '#38BDF8', failed: '#F87171' };
  return m[s] ?? '#F59E0B';
}

export default function VendorEarnings() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const BG = '#ffffff';
  const CARD = theme.card;
  const BORDER = theme.border;
  const TEXT = theme.textPrimary;
  const SUB = theme.textSecondary;
  const [stats, setStats]     = useState<VendorStats | null>(null);
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '', method: 'momo' as 'momo' | 'bank',
    accountName: '', accountNumber: '', bankCode: '',
  });

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const [s, p] = await Promise.all([getVendorStats(profile.id), getVendorPayouts(profile.id)]);
    setStats(s); setPayouts(p); setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useRealtimeChannel({
    channelName: `vendor-payouts-${profile?.id}`,
    table: 'vendor_payouts',
    filter: profile?.id ? `vendor_id=eq.${profile.id}` : undefined,
    onEvent: load,
    enabled: !!profile?.id,
  });

  const submitPayout = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    if (!form.accountName.trim() || !form.accountNumber.trim()) { Alert.alert('Error', 'Account name and number are required.'); return; }
    if (form.method === 'bank' && !form.bankCode.trim()) { Alert.alert('Error', 'Bank code is required for bank transfers.'); return; }
    setSubmitting(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      await requestPayout({
        vendorId: profile!.id,
        amount: amt,
        periodStart: monthStart,
        periodEnd: now.toISOString(),
        paymentMethod: form.method,
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        bankCode: form.method === 'bank' ? form.bankCode.trim() : undefined,
      });
      setModalOpen(false);
      setForm({ amount: '', method: 'momo', accountName: '', accountNumber: '', bankCode: '' });
      await load();
      Alert.alert('Submitted ✓', 'Your payout request has been sent to admin for approval.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={P} size="large" />
    </View>
  );

  const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'processing');

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: TEXT, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: P, letterSpacing: 3 }}>VENDOR</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT }}>Earnings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Revenue cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 11, color: SUB, fontWeight: '600', marginBottom: 8 }}>TOTAL REVENUE</Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#4ADE80', letterSpacing: -0.5 }}>GH₵{(stats?.totalRevenue ?? 0).toFixed(2)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 11, color: SUB, fontWeight: '600', marginBottom: 8 }}>THIS MONTH</Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: P, letterSpacing: -0.5 }}>GH₵{(stats?.monthRevenue ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Total orders */}
        <View style={{ backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
          {[
            { label: 'Total Orders',   value: String(stats?.totalOrders ?? 0) },
            { label: 'Pending Orders', value: String(stats?.pendingOrders ?? 0) },
            { label: 'Active Products', value: String(stats?.activeProducts ?? 0) },
          ].map((r, i, arr) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: BORDER }}>
              <Text style={{ fontSize: 13, color: SUB }}>{r.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Request payout CTA */}
        {pendingPayouts.length === 0 ? (
          <TouchableOpacity style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 24, shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}
            onPress={() => setModalOpen(true)} activeOpacity={0.85}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>💸 Request Payout</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor: '#F59E0B18', borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B44', padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>⏳</Text>
            <Text style={{ flex: 1, fontSize: 13, color: '#F59E0B', fontWeight: '700' }}>You have a pending payout request. Wait for it to be processed before requesting another.</Text>
          </View>
        )}

        {/* Payout history */}
        <Text style={[s.sectionLabel, { color: SUB }]}>PAYOUT HISTORY</Text>
        {payouts.length === 0
          ? <Text style={{ color: SUB, textAlign: 'center', padding: 20, fontSize: 13 }}>No payout requests yet.</Text>
          : payouts.map((payout, i) => (
            <View key={payout.id} style={{ backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>GH₵ {Number(payout.amount).toFixed(2)}</Text>
                <View style={{ backgroundColor: statusColor(payout.status) + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(payout.status), textTransform: 'capitalize' }}>{payout.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: SUB }}>{payout.payment_method === 'momo' ? '📱 Mobile Money' : '🏦 Bank'} · {payout.account_number}</Text>
              <Text style={{ fontSize: 11, color: SUB, marginTop: 4 }}>{new Date(payout.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              {payout.admin_note && <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 6 }}>Note: {payout.admin_note}</Text>}
            </View>
          ))
        }
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payout request modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)} style={{ marginRight: 12 }}>
              <Text style={{ color: TEXT, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: TEXT }}>Request Payout</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 13, color: SUB, marginBottom: 20, lineHeight: 20 }}>
              Your payout will be processed via Paystack. Enter the amount and your payment details below.
            </Text>

            <Text style={[s.label, { color: SUB }]}>Amount (GH₵) *</Text>
            <TextInput style={[s.input, { backgroundColor: CARD, color: TEXT, borderColor: BORDER }]} placeholder="0.00" placeholderTextColor={SUB} keyboardType="numeric" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} />

            <Text style={[s.label, { color: SUB, marginTop: 16 }]}>Payment Method</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              {(['momo', 'bank'] as const).map(m => (
                <TouchableOpacity key={m} style={{ flex: 1, paddingVertical: 12, borderRadius: 11, borderWidth: 1.5, borderColor: form.method === m ? P : BORDER, backgroundColor: form.method === m ? P + '18' : CARD, alignItems: 'center' }}
                  onPress={() => setForm(f => ({ ...f, method: m }))}>
                  <Text style={{ fontWeight: '700', color: form.method === m ? P : SUB, fontSize: 13 }}>{m === 'momo' ? '📱 Mobile Money' : '🏦 Bank Transfer'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { label: 'Account Name *',   key: 'accountName',   placeholder: 'Full name on account' },
              { label: form.method === 'momo' ? 'Mobile Number *' : 'Account Number *', key: 'accountNumber', placeholder: form.method === 'momo' ? '024XXXXXXX' : '1234567890' },
              ...(form.method === 'bank' ? [{ label: 'Bank Code *', key: 'bankCode', placeholder: 'e.g. 030100' }] : []),
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 16 }}>
                <Text style={[s.label, { color: SUB }]}>{f.label}</Text>
                <TextInput style={[s.input, { backgroundColor: CARD, color: TEXT, borderColor: BORDER }]} placeholder={f.placeholder} placeholderTextColor={SUB} value={(form as any)[f.key]} onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))} />
              </View>
            ))}

            <Text style={{ fontSize: 12, color: SUB, lineHeight: 18, marginBottom: 24 }}>
              ⚠️ Payouts are reviewed by admin before disbursement. Ensure your account details are correct.
            </Text>

            <TouchableOpacity style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
              onPress={submitPayout} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Submit Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  label:        { fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input:        { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, marginBottom: 4 },
});
