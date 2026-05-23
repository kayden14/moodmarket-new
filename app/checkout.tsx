/**
 * app/checkout.tsx
 * Paystack flow — works on BOTH web (inline iframe) and native (WebView)
 * Full dark/light theming, step dots, order confirmation
 *
 * ─── ANDROID CONFIRMATION FIX (root causes) ───────────────────────────────
 *
 * 1. WEBVIEW postMessage never reached handlePaymentMessage on Android.
 *    The native WebView posts messages via window.ReactNativeWebView.postMessage,
 *    NOT window.parent.postMessage. The Paystack HTML was built with
 *    `window.parent.postMessage(…, origin)` which only works inside an <iframe>
 *    (web). Inside a native WebView there is no parent frame, so the message
 *    was silently dropped.
 *
 *    Fix: buildHTML() now detects the platform and emits the correct call:
 *      - Native  → window.ReactNativeWebView.postMessage(JSON.stringify(data))
 *      - Web     → window.parent.postMessage(JSON.stringify(data), origin)
 *
 * 2. WebView onMessage receives e.nativeEvent.data (a string). The handler
 *    was already correct, but because no messages ever arrived (bug #1),
 *    the screen stayed on the spinner forever.
 *
 * 3. React Native state batching: setProcessing(false) + setConfirmedOrder +
 *    setStep('success') must all fire in the same synchronous block so React
 *    batches them into one re-render. This was already done in the web version
 *    but the native path had setProcessing(false) inside a finally block that
 *    ran AFTER the render cycle had already started with processing=true.
 *    Fixed by moving setProcessing(false) to be the very first call.
 *
 * 4. SafeAreaView on Android does not account for the status bar height the
 *    same way iOS does. The success screen header was hidden behind the
 *    status bar on Android. Fixed by using StatusBar.currentHeight padding.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, StatusBar, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/services/supabase';
import { NotificationService } from '@/services/notifications';
import {
  ChevronLeft, MapPin, Phone, User, CreditCard,
  CheckCircle, Package, Truck, ShieldCheck,
  Smartphone, ChevronRight, Clock, Hash, Home,
} from 'lucide-react-native';
import { useResponsive } from '@/hooks/useResponsive';

/* ── platform detection ── */
const IS_WEB = Platform.OS === 'web';

const PAYSTACK_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? 'pk_test_YOUR_KEY';
const SUCCESS_GREEN = '#22C55E';

type PayMethod    = 'card' | 'mobile_money';
type MomoProvider = 'mtn' | 'vod' | 'tigo';
type Step         = 'details' | 'payment' | 'paying' | 'success';

interface OrderDetails {
  reference: string; total: number; itemCount: number;
  payMethod: PayMethod; address: string; city: string;
  phone: string; name: string; createdAt: string;
}

/* ─────────────────────────── Paystack HTML ─────────────────────────────────
 *
 * KEY FIX: Two separate message-posting strategies depending on the host:
 *
 *   isNative = true  → window.ReactNativeWebView.postMessage(str)
 *                       This is the ONLY way to send a message from inside a
 *                       react-native-webview WebView. window.parent does not
 *                       exist in that environment.
 *
 *   isNative = false → window.parent.postMessage(str, origin)
 *                       Used when the page is loaded inside an <iframe> on web.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

function buildHTML(opts: {
  publicKey: string; email: string; amountKobo: number;
  reference: string; name: string; phone: string;
  channels: string; origin: string;
  isNative: boolean; // NEW — controls which postMessage API is used
}) {
  // Native WebView: use ReactNativeWebView.postMessage
  // Web iframe:     use window.parent.postMessage with origin
  const postFn = opts.isNative
    ? `function post(data){ window.ReactNativeWebView.postMessage(JSON.stringify(data)); }`
    : `function post(data){ window.parent.postMessage(JSON.stringify(data),'${opts.origin}'); }`;

  return `<!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <script src="https://js.paystack.co/v1/inline.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;background:#F7F7F7;font-family:-apple-system,sans-serif}
    .loader{width:48px;height:48px;border:3px solid #F2E6E8;border-top-color:#FF7A8A;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:16px}
    @keyframes spin{to{transform:rotate(360deg)}}
    p{color:#8A8A8A;font-size:14px}
  </style>
  </head><body>
  <div class="loader"></div>
  <p>Connecting to Paystack…</p>
  <script>
    ${postFn}
    window.onload = function(){
      var h = PaystackPop.setup({
        key: '${opts.publicKey}',
        email: '${opts.email}',
        amount: ${opts.amountKobo},
        currency: 'GHS',
        ref: '${opts.reference}',
        firstname: '${opts.name.split(' ')[0]}',
        lastname: '${opts.name.split(' ').slice(1).join(' ') || ''}',
        phone: '${opts.phone}',
        label: 'MoodMarket Order',
        channels: ${opts.channels},
        onClose: function(){ post({ event: 'closed' }); },
        callback: function(r){ post({ event: 'success', reference: r.reference }); }
      });
      h.openIframe();
    };
  </script></body></html>`;
}

/* ─────────────────────────── Web Paystack iframe ───────────────────────── */

function WebPaystackFrame({ html, onMessage }: {
  html: string; onMessage: (data: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobRef   = useRef<string | null>(null);
  const { theme } = useTheme();

  // useEffect only runs on web so this is safe
  if (IS_WEB) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useEffect } = require('react');
    useEffect(() => {
      const handler = (e: MessageEvent) => {
        try {
          const d = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
          onMessage(d);
        } catch {}
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onMessage]);

    useEffect(() => {
      if (!html || !iframeRef.current) return;
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      blobRef.current = url;
      iframeRef.current.src = url;
      return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
    }, [html]);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.background }}>
      <iframe
        ref={iframeRef as any}
        style={{ flex: 1, border: 'none', width: '100%', minHeight: 500 }}
        title="Paystack Payment"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}

/* ─────────────────────────── StepDots ──────────────────────────────────── */

function StepDots({ step }: { step: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 24 }}>
      {['Details', 'Payment', 'Confirm'].map((label, i) => {
        const n = i + 1; const active = n === step; const done = n < step;
        return (
          <View key={n} style={{ alignItems: 'center', gap: 4 }}>
            <View style={[sd.dot,
              active && { backgroundColor: theme.primary },
              done   && { backgroundColor: SUCCESS_GREEN },
              !active && !done && { backgroundColor: theme.border },
            ]}>
              {done   && <CheckCircle size={10} color="#fff" strokeWidth={3} />}
              {active && <Text style={sd.activeTxt}>{n}</Text>}
              {!done && !active && <Text style={[sd.inactiveTxt, { color: theme.inactive }]}>{n}</Text>}
            </View>
            <Text style={[sd.label, { color: active ? theme.primary : theme.inactive }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
const sd = StyleSheet.create({
  dot:        { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeTxt:  { fontSize: 11, fontWeight: '800', color: '#fff' },
  inactiveTxt:{ fontSize: 11, fontWeight: '700' },
  label:      { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
});

/* ─────────────────────────── Field ─────────────────────────────────────── */

function Field({ icon, label, value, onChange, placeholder, keyboardType }: {
  icon: React.ReactNode; label: string; value: string;
  onChange: (v: string) => void; placeholder: string; keyboardType?: any;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[fld.label, { color: theme.inactive }]}>{label}</Text>
      <View style={[fld.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[fld.icon, {
          backgroundColor: theme.isDark ? '#1E1E2E' : '#FFF6F7',
          borderRightColor: theme.border,
        }]}>{icon}</View>
        <TextInput
          style={[fld.input, { color: theme.textPrimary }]}
          value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={theme.inactive}
          keyboardType={keyboardType} autoCorrect={false}
        />
      </View>
    </View>
  );
}
const fld = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  row:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  icon:  { width: 46, height: 50, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1 },
  input: { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 14 },
});

/* ─────────────────────────── PayMethodCard ─────────────────────────────── */

function PayMethodCard({ method, selected, onSelect }: {
  method: PayMethod; selected: boolean; onSelect: () => void;
}) {
  const { theme } = useTheme();
  const cfg = method === 'card'
    ? { Icon: CreditCard, title: 'Bank Card',    subtitle: 'Visa · Mastercard · Verve',   accent: '#0A7EA4', bg: theme.isDark ? '#0D1F2D' : '#EBF4F8', networks: ['VISA','MC','VERVE'] }
    : { Icon: Smartphone, title: 'Mobile Money', subtitle: 'MTN · Vodafone · AirtelTigo', accent: '#F59E0B', bg: theme.isDark ? '#1A1400' : '#FEF3C7', networks: ['MTN','VOD','AT']   };
  return (
    <TouchableOpacity
      style={[pm.card, { backgroundColor: theme.card, borderColor: selected ? theme.primary : theme.border }, selected && { borderWidth: 2 }]}
      onPress={onSelect} activeOpacity={0.85}
    >
      <View style={[pm.iconWrap, { backgroundColor: cfg.bg }]}>
        <cfg.Icon size={22} color={cfg.accent} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[pm.title, { color: theme.textPrimary }]}>{cfg.title}</Text>
        <Text style={[pm.subtitle, { color: theme.textSecondary }]}>{cfg.subtitle}</Text>
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
          {cfg.networks.map(n => (
            <View key={n} style={[pm.pill, {
              backgroundColor: selected ? (theme.isDark ? '#2D1820' : '#FFF0F2') : theme.background,
              borderColor:     selected ? (theme.isDark ? '#3D2030' : '#FFD6DE') : theme.border,
            }]}>
              <Text style={[pm.pillTxt, { color: selected ? theme.primary : theme.inactive }]}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[pm.radio, { borderColor: selected ? theme.primary : theme.inactive }]}>
        {selected && <View style={[pm.radioDot, { backgroundColor: theme.primary }]} />}
      </View>
    </TouchableOpacity>
  );
}
const pm = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1.5, gap: 14 },
  iconWrap:{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  subtitle:{ fontSize: 12, fontWeight: '500' },
  pill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  pillTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  radio:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:{ width: 10, height: 10, borderRadius: 5 },
});

/* ─────────────────────────── MomoSelector ──────────────────────────────── */

function MomoSelector({ selected, onSelect, momoNumber, onNumberChange }: {
  selected: MomoProvider | null; onSelect: (p: MomoProvider) => void;
  momoNumber: string; onNumberChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  const providers = [
    { id: 'mtn'  as MomoProvider, label: 'MTN',        color: '#F59E0B', bg: theme.isDark ? '#1A1400' : '#FEF3C7' },
    { id: 'vod'  as MomoProvider, label: 'Vodafone',   color: '#E53E3E', bg: theme.isDark ? '#2D1515' : '#FFF0F0' },
    { id: 'tigo' as MomoProvider, label: 'AirtelTigo', color: '#DC2626', bg: theme.isDark ? '#2D1515' : '#FFF5F5' },
  ];
  return (
    <View style={[mmS.wrap, { borderTopColor: theme.border }]}>
      <Text style={[fld.label, { color: theme.inactive }]}>SELECT NETWORK</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {providers.map(p => (
          <TouchableOpacity key={p.id}
            style={[mmS.btn, { borderColor: selected === p.id ? p.color : theme.border, backgroundColor: selected === p.id ? p.bg : theme.card }]}
            onPress={() => onSelect(p.id)} activeOpacity={0.8}>
            <Text style={[mmS.btnTxt, { color: selected === p.id ? p.color : theme.inactive }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[fld.label, { color: theme.inactive }]}>MOMO NUMBER</Text>
      <View style={[fld.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[fld.icon, { backgroundColor: theme.isDark ? '#1E1E2E' : '#FFF6F7', borderRightColor: theme.border }]}>
          <Phone size={16} color={theme.primary} />
        </View>
        <TextInput style={[fld.input, { color: theme.textPrimary }]} value={momoNumber} onChangeText={onNumberChange}
          placeholder="e.g. 0244000000" placeholderTextColor={theme.inactive} keyboardType="phone-pad" />
      </View>
    </View>
  );
}
const mmS = StyleSheet.create({
  wrap:  { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  btn:   { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  btnTxt:{ fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
});

/* ─────────────────────────── OrderConfirmation ─────────────────────────── */

function OrderConfirmation({ order, onGoHome, onViewOrders }: {
  order: OrderDetails; onGoHome: () => void; onViewOrders: () => void;
}) {
  const { theme, isDark } = useTheme();
  const payLabel = order.payMethod === 'card' ? 'Bank Card' : 'Mobile Money';

  // Android status bar padding so content doesn't sit behind the bar
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={oc.infoRow}>
      <Text style={[oc.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[oc.infoValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 24, paddingTop: 24 + statusBarHeight, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Success badge ── */}
      <View style={oc.badge}>
        <View style={[oc.circle, {
          backgroundColor: isDark ? '#0D2B1A' : '#EDFBF1',
          borderColor:     isDark ? '#1A4D2E' : '#A8E6C8',
        }]}>
          <CheckCircle size={56} color={SUCCESS_GREEN} strokeWidth={1.5} />
        </View>
        <Text style={[oc.title, { color: theme.textPrimary }]}>Order Confirmed!</Text>
        <Text style={[oc.sub, { color: theme.textSecondary }]}>
          Your payment was successful and your order is being processed.
        </Text>
      </View>

      {/* ── Reference ── */}
      <View style={[oc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={oc.cardHeader}>
          <Hash size={14} color={theme.primary} strokeWidth={2.5} />
          <Text style={[oc.cardHeaderTxt, { color: theme.inactive }]}>ORDER REFERENCE</Text>
        </View>
        <Text style={[oc.refNum, { color: theme.textPrimary }]}>{order.reference}</Text>
        <View style={[oc.divider, { backgroundColor: theme.border }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={13} color={theme.inactive} strokeWidth={2} />
          <Text style={[oc.cardHeaderTxt, { color: theme.inactive, letterSpacing: 0 }]}>{order.createdAt}</Text>
        </View>
      </View>

      {/* ── Summary ── */}
      <View style={[oc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={oc.cardHeader}>
          <Package size={14} color={theme.primary} strokeWidth={2.5} />
          <Text style={[oc.cardHeaderTxt, { color: theme.inactive }]}>ORDER SUMMARY</Text>
        </View>
        <InfoRow label="Items"   value={`${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`} />
        <InfoRow label="Payment" value={payLabel} />
        <View style={[oc.divider, { backgroundColor: theme.border }]} />
        <View style={oc.infoRow}>
          <Text style={[oc.totalLabel, { color: theme.textPrimary }]}>Total Paid</Text>
          <Text style={[oc.totalValue, { color: theme.primary }]}>GH₵ {order.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* ── Delivery ── */}
      <View style={[oc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={oc.cardHeader}>
          <Truck size={14} color={theme.primary} strokeWidth={2.5} />
          <Text style={[oc.cardHeaderTxt, { color: theme.inactive }]}>DELIVERY DETAILS</Text>
        </View>
        <InfoRow label="Name"    value={order.name} />
        <InfoRow label="Phone"   value={order.phone} />
        <InfoRow label="Address" value={`${order.address}, ${order.city}`} />
      </View>

      {/* ── Order status timeline ── */}
      <View style={[oc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={oc.cardHeader}>
          <Clock size={14} color={theme.primary} strokeWidth={2.5} />
          <Text style={[oc.cardHeaderTxt, { color: theme.inactive }]}>ORDER STATUS</Text>
        </View>
        {[
          { Icon: CheckCircle, label: 'Payment confirmed',  sub: 'Your payment has been received', done: true,  active: false },
          { Icon: Package,     label: 'Order being packed', sub: 'We are preparing your items',    done: false, active: true  },
          { Icon: Truck,       label: 'Out for delivery',   sub: 'Estimated 2–4 business days',    done: false, active: false },
          { Icon: Home,        label: 'Delivered',          sub: 'Your order will arrive soon',    done: false, active: false },
        ].map((stepItem, i) => (
          <View key={i} style={oc.timelineRow}>
            <View style={[oc.timelineDot, {
              backgroundColor: stepItem.done
                ? (isDark ? '#0D2B1A' : '#EDFBF1')
                : stepItem.active
                ? (isDark ? '#2D1820' : '#FFF0F2')
                : theme.background,
            }]}>
              <stepItem.Icon
                size={14}
                color={stepItem.done ? SUCCESS_GREEN : stepItem.active ? theme.primary : theme.inactive}
                strokeWidth={2}
              />
            </View>
            {i < 3 && (
              <View style={[oc.timelineLine, { backgroundColor: stepItem.done ? SUCCESS_GREEN : theme.border }]} />
            )}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={[oc.timelineLabel, { color: (stepItem.done || stepItem.active) ? theme.textPrimary : theme.inactive }]}>
                {stepItem.label}
              </Text>
              <Text style={[oc.timelineSub, { color: theme.textSecondary }]}>{stepItem.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Actions ── */}
      <TouchableOpacity
        style={[oc.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={onGoHome}
        activeOpacity={0.88}
      >
        <Home size={18} color="#fff" strokeWidth={2} />
        <Text style={oc.primaryBtnTxt}>Back to Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[oc.secondaryBtn, { borderColor: theme.primary }]}
        onPress={onViewOrders}
        activeOpacity={0.75}
      >
        <Package size={16} color={theme.primary} strokeWidth={2} />
        <Text style={[oc.secondaryBtnTxt, { color: theme.primary }]}>View My Orders</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const oc = StyleSheet.create({
  badge:         { alignItems: 'center', paddingVertical: 28 },
  circle:        { width: 108, height: 108, borderRadius: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1.5 },
  title:         { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginBottom: 8 },
  sub:           { fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 16 },
  card:          { borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardHeaderTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  divider:       { height: 1, marginVertical: 10 },
  refNum:        { fontSize: 18, fontWeight: '900', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  infoLabel:     { fontSize: 13 },
  infoValue:     { fontSize: 13, fontWeight: '700' },
  totalLabel:    { fontSize: 15, fontWeight: '700' },
  totalValue:    { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  timelineRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, position: 'relative' },
  timelineDot:   { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  timelineLine:  { position: 'absolute', left: 15, top: 32, width: 2, height: 28 },
  timelineLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  timelineSub:   { fontSize: 11 },
  primaryBtn:    { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  primaryBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn:  { borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnTxt:{ fontSize: 14, fontWeight: '700' },
});

/* ─────────────────────────── Main Screen ───────────────────────────────── */

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { theme, isDark } = useTheme();
  const { isWide, isDesktop } = useResponsive();

  const [step,           setStep]           = useState<Step>('details');
  const [processing,     setProcessing]     = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderDetails | null>(null);

  const shipping = cartTotal > 200 ? 0 : 15;
  const total    = cartTotal + shipping;

  const [name,         setName]         = useState(profile?.name ?? '');
  const [phone,        setPhone]        = useState('');
  const [address,      setAddress]      = useState('');
  const [city,         setCity]         = useState('');
  const [payMethod,    setPayMethod]    = useState<PayMethod | null>(null);
  const [momoProvider, setMomoProvider] = useState<MomoProvider | null>(null);
  const [momoNumber,   setMomoNumber]   = useState('');
  const [paystackHTML, setPaystackHTML] = useState('');

  const paystackRef = useRef(
    `moodmarket-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const validateDetails = () => {
    if (!name.trim())    { Alert.alert('Missing info', 'Please enter your full name.');        return false; }
    if (!phone.trim())   { Alert.alert('Missing info', 'Please enter your phone number.');     return false; }
    if (!/^\d+$/.test(phone.trim())) { Alert.alert('Invalid phone', 'Phone number must contain only numbers.'); return false; }
    if (!address.trim()) { Alert.alert('Missing info', 'Please enter your delivery address.'); return false; }
    if (!city.trim())    { Alert.alert('Missing info', 'Please enter your city.');             return false; }
    return true;
  };

  const validatePayment = () => {
    if (!payMethod) { Alert.alert('Select payment', 'Please choose a payment method.'); return false; }
    if (payMethod === 'mobile_money') {
      if (!momoProvider)      { Alert.alert('Select network', 'Please select your MoMo network.'); return false; }
      if (!momoNumber.trim()) { Alert.alert('Missing info',   'Please enter your MoMo number.');   return false; }
      if (!/^\d+$/.test(momoNumber.trim())) { Alert.alert('Invalid number', 'MoMo number must contain only numbers.'); return false; }
    }
    return true;
  };

  const initiatePayment = () => {
    if (!validatePayment()) return;
    const origin = IS_WEB ? window.location.origin : '*';
    setPaystackHTML(buildHTML({
      publicKey:  PAYSTACK_KEY,
      email:      user?.email ?? 'customer@moodmarket.com',
      amountKobo: Math.round(total * 100),
      reference:  paystackRef.current,
      name,
      phone: payMethod === 'mobile_money' ? momoNumber : phone,
      channels: payMethod === 'card' ? '["card"]' : '["mobile_money"]',
      origin,
      isNative: !IS_WEB, // ← KEY: tells buildHTML which postMessage to use
    }));
    setStep('paying');
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * handlePaymentMessage
   *
   * Called by:
   *   - Web:    window 'message' event listener via WebPaystackFrame
   *   - Native: WebView onMessage → e.nativeEvent.data
   *
   * Fix summary:
   *   1. Native WebView messages were never arriving (see buildHTML fix above).
   *   2. setProcessing(false) is now called FIRST, then confirmedOrder + step
   *      in the same synchronous block so React batches all three into one
   *      re-render — the success screen sees processing=false and a populated
   *      confirmedOrder simultaneously with no intermediate render.
   * ───────────────────────────────────────────────────────────────────────── */
  const handlePaymentMessage = async (data: string) => {
    try {
      const msg = JSON.parse(data);

      if (msg.event === 'closed') {
        setStep('payment');
        return;
      }

      if (msg.event === 'success') {
        setProcessing(true);

        try {
          /* 1. Save order */
          const { error } = await supabase.from('orders').insert({
            user_id:           user!.id,
            products:          cartItems.map(i => ({
              productId: i.product_id,
              name:      i.products.name,
              price:     i.products.price,
              quantity:  i.quantity,
            })),
            total_price:       total,
            status:            'paid',
            payment_reference: msg.reference,
            payment_method:    payMethod,
            delivery_address:  `${address}, ${city}`,
            delivery_phone:    phone,
          });

          if (error) {
            console.error('[Checkout] Supabase error:', error);
            Alert.alert(
              'Order Save Failed',
              `Payment received but order could not be saved.\nRef: ${msg.reference}`,
            );
            return;
          }

          /* 2. Clear cart */
          await clearCart();

          /* 3. Notification (non-blocking) */
          try {
            await NotificationService.send(
              '🎉 Order Confirmed!',
              `GH₵${total.toFixed(2)} order placed successfully.`,
            );
          } catch {}

          /* 4. Build confirmed order */
          const confirmed: OrderDetails = {
            reference: msg.reference,
            total,
            itemCount: cartItems.length,
            payMethod: payMethod!,
            address,
            city,
            phone,
            name,
            createdAt: new Date().toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            }),
          };

          /* 5. ── THE FIX ──────────────────────────────────────────────────
           * Clear spinner FIRST, then set both confirmedOrder and step in the
           * same synchronous block. React 18 batches all three setX() calls
           * into one re-render so the success screen renders with:
           *   processing    = false   (no spinner)
           *   confirmedOrder = {...}  (non-null, safe to render)
           *   step           = 'success'
           * ─────────────────────────────────────────────────────────────── */
          setProcessing(false);
          setConfirmedOrder(confirmed);
          setStep('success');

        } finally {
          // Safety net: if an exception was thrown before the explicit
          // setProcessing(false) above, this clears the spinner. React dedupes
          // multiple calls to the same setter so calling it twice is safe.
          setProcessing(false);
        }
      }
    } catch (err) {
      console.error('[Checkout] message parse error:', err);
      setProcessing(false);
    }
  };

  /* ── Not logged in ── */
  if (!user) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, gap: 16 }}>
      <Text style={{ fontSize: 16, color: theme.textSecondary }}>Please log in to checkout.</Text>
      <TouchableOpacity
        style={{ backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        onPress={() => router.push('/login')}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Log In</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── Success ─────────────────────────────────────────────────────────────
   *
   * Android fix: We no longer render a custom header bar here because the
   * OrderConfirmation ScrollView already handles its own top padding
   * (StatusBar.currentHeight). A redundant header was causing a double
   * top-bar on Android and clipping the success content.
   *
   * Both checks (step === 'success' AND confirmedOrder !== null) are required.
   * confirmedOrder is set in the same batch as step so they are always both
   * truthy together, but the null guard keeps TypeScript happy and prevents
   * any edge-case flash.
   * ───────────────────────────────────────────────────────────────────────── */
  if (step === 'success' && confirmedOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={s.container}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={theme.background}
            translucent={false}
          />
          <OrderConfirmation
            order={confirmedOrder}
            onGoHome={() => router.replace('/(tabs)')}
            onViewOrders={() => router.replace('/(tabs)/profile')}
          />
        </View>
      </View>
    );
  }

  /* ── Paying ── */
  if (step === 'paying') {
    const header = (
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2' }]}
          onPress={() => setStep('payment')}
        >
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Secure Payment</Text>
        <ShieldCheck size={18} color={SUCCESS_GREEN} />
      </View>
    );

    const spinner = (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Saving your order…</Text>
        <Text style={{ color: theme.inactive, fontSize: 12 }}>Please don't close this screen</Text>
      </View>
    );

    /* ── Web: iframe ── */
    if (IS_WEB) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={s.container}>
            {header}
            {processing ? spinner : (
              <WebPaystackFrame html={paystackHTML} onMessage={handlePaymentMessage} />
            )}
          </View>
        </View>
      );
    }

    /* ── Native: WebView ─────────────────────────────────────────────────
     *
     * onMessage receives e.nativeEvent.data (string).
     * The Paystack HTML uses window.ReactNativeWebView.postMessage() (see
     * buildHTML isNative=true) which is the only valid channel for native
     * WebView → RN communication.
     *
     * injectedJavaScript ensures ReactNativeWebView is available even on
     * Android WebView versions that initialise it slightly late.
     * ─────────────────────────────────────────────────────────────────── */
    const WebViewNative = require('react-native-webview').WebView;
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={s.container}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />
          {header}
          {processing ? spinner : (
            <WebViewNative
              source={{ html: paystackHTML }}
              style={{ flex: 1 }}
              // ── KEY: this is the ONLY onMessage prop that fires for native ──
              onMessage={(e: any) => handlePaymentMessage(e.nativeEvent.data)}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              // Ensures window.ReactNativeWebView is ready before Paystack
              // calls window.onload and tries to use it
              injectedJavaScriptBeforeContentLoaded={`
                (function(){
                  if(!window.ReactNativeWebView){
                    window.ReactNativeWebView = {
                      postMessage: function(msg){ window.originalPostMessage && window.originalPostMessage(msg,'*'); }
                    };
                  }
                })();
                true;
              `}
              renderLoading={() => (
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: theme.background,
                }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
            />
          )}
        </View>
      </View>
    );
  }

  if (step === 'payment') return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2' }]} onPress={() => setStep('details')}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Payment</Text>
          <StepDots step={2} />
        </View>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[s.summaryStrip, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2', borderColor: isDark ? '#3D2030' : '#FFD6DE' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Package size={15} color={theme.primary} />
            <Text style={[s.summaryTxt, { color: theme.textPrimary }]}>{cartCount} {cartCount === 1 ? 'item' : 'items'}</Text>
          </View>
          <Text style={[s.summaryTotal, { color: theme.primary }]}>GH₵ {total.toFixed(2)}</Text>
        </View>

        <Text style={[s.sectionLabel, { color: theme.inactive }]}>CHOOSE PAYMENT METHOD</Text>
        <PayMethodCard method="card"         selected={payMethod === 'card'}         onSelect={() => setPayMethod('card')} />
        <PayMethodCard method="mobile_money" selected={payMethod === 'mobile_money'} onSelect={() => setPayMethod('mobile_money')} />

        {payMethod === 'mobile_money' && (
          <View style={[s.momoWrap, { backgroundColor: theme.card, borderColor: theme.primary }]}>
            <MomoSelector selected={momoProvider} onSelect={setMomoProvider} momoNumber={momoNumber} onNumberChange={v => setMomoNumber(v.replace(/[^0-9]/g, ''))} />
          </View>
        )}

        <TouchableOpacity
          style={[s.payBtn, { backgroundColor: theme.primary }, !payMethod && { opacity: 0.45 }]}
          onPress={initiatePayment} disabled={!payMethod} activeOpacity={0.88}
        >
          {payMethod === 'mobile_money'
            ? <Smartphone size={18} color="#fff" strokeWidth={2} />
            : <CreditCard  size={18} color="#fff" strokeWidth={2} />
          }
          <Text style={s.payBtnTxt}>
            Pay GH₵ {total.toFixed(2)}{payMethod === 'card' ? ' with Card' : payMethod === 'mobile_money' ? ' with MoMo' : ''}
          </Text>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 }}>
          {[
            { Icon: ShieldCheck, txt: '256-bit SSL',         color: SUCCESS_GREEN  },
            { Icon: CreditCard,  txt: 'Powered by Paystack', color: theme.inactive },
          ].map(({ Icon, txt, color }) => (
            <View key={txt} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon size={13} color={color} />
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>{txt}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );

  /* ── Details step (default) ── */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2' }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={theme.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Checkout</Text>
          <StepDots step={1} />
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[s.summaryStrip, { backgroundColor: isDark ? '#2D1820' : '#FFF0F2', borderColor: isDark ? '#3D2030' : '#FFD6DE' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Package size={15} color={theme.primary} />
            <Text style={[s.summaryTxt, { color: theme.textPrimary }]}>{cartCount} {cartCount === 1 ? 'item' : 'items'}</Text>
          </View>
          <Text style={[s.summaryTotal, { color: theme.primary }]}>GH₵ {total.toFixed(2)}</Text>
        </View>

        <Text style={[s.sectionLabel, { color: theme.inactive }]}>DELIVERY DETAILS</Text>
        <Field icon={<User   size={16} color={theme.primary} />} label="Full Name"      value={name}    onChange={setName}    placeholder="e.g. Ama Owusu" />
        <Field icon={<Phone  size={16} color={theme.primary} />} label="Phone Number"   value={phone}   onChange={v => setPhone(v.replace(/[^0-9]/g, ''))}   placeholder="e.g. 0244000000" keyboardType="phone-pad" />
        <Field icon={<MapPin size={16} color={theme.primary} />} label="Street Address" value={address} onChange={setAddress} placeholder="e.g. 14 Osu Badu Street" />
        <Field icon={<MapPin size={16} color={theme.primary} />} label="City"           value={city}    onChange={setCity}    placeholder="e.g. Accra" />

        <Text style={[s.sectionLabel, { color: theme.inactive, marginTop: 8 }]}>ORDER SUMMARY</Text>
        <View style={[s.priceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { label: `Subtotal (${cartCount} items)`, value: `GH₵ ${cartTotal.toFixed(2)}`, color: theme.textPrimary },
            { label: 'Delivery', value: shipping === 0 ? 'FREE' : `GH₵ ${shipping.toFixed(2)}`, color: shipping === 0 ? SUCCESS_GREEN : theme.textPrimary },
          ].map(r => (
            <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>{r.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: r.color }}>{r.value}</Text>
            </View>
          ))}
          <View style={[{ height: 1, marginVertical: 8 }, { backgroundColor: theme.border }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>Total</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.primary, letterSpacing: -0.6 }}>GH₵ {total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.payBtn, { backgroundColor: theme.primary }]}
          onPress={() => { if (validateDetails()) setStep('payment'); }}
          activeOpacity={0.88}
        >
          <Text style={s.payBtnTxt}>Continue to Payment</Text>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
        </TouchableOpacity>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 1200 },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    // Android: use StatusBar.currentHeight so content clears the status bar
    paddingTop: Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 24) + 12
      : Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1,
  },
  backBtn:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  scroll:      { padding: 20, paddingBottom: 80 },
  summaryStrip:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 22, borderWidth: 1 },
  summaryTxt:  { fontSize: 13, fontWeight: '600' },
  summaryTotal:{ fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  sectionLabel:{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  momoWrap:    { borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 16 },
  priceCard:   { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  payBtn:      { borderRadius: 16, paddingVertical: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  payBtnTxt:   { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
});