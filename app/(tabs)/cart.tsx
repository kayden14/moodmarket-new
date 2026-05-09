/**
 * app/(tabs)/cart.tsx
 * Fully themed for light & dark mode via ThemeContext
 */

import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Trash2, Plus, Minus, ShoppingBag,
  ArrowRight, Truck, ShoppingCart, Lock, Zap,
} from 'lucide-react-native';

// ─── Cart Row ─────────────────────────────────────────────────────────────────

function CartRow({ item, index, onQtyChange, onRemove }: {
  item: any; index: number;
  onQtyChange: (id: string, qty: number) => void;
  onRemove:    (id: string) => void;
}) {
  const { theme } = useTheme();
  const line  = (item.products.price * item.quantity).toFixed(2);
  const atMin = item.quantity <= 1;

  return (
    <View style={[row.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[row.indexNum, { color: theme.inactive }]}>
        {String(index + 1).padStart(2, '0')}
      </Text>

      <View style={[row.imgWrap, { backgroundColor: theme.background }]}>
        <Image source={{ uri: item.products.image }} style={row.img} />
      </View>

      <View style={row.body}>
        <Text style={[row.name, { color: theme.textPrimary }]} numberOfLines={2}>
          {item.products.name}
        </Text>
        <Text style={[row.unit, { color: theme.textSecondary }]}>
          GH₵ {item.products.price.toFixed(2)} / unit
        </Text>

        <View style={row.footer}>
          <View style={[row.stepper, {
            backgroundColor: theme.background,
            borderColor: theme.border,
          }]}>
            <TouchableOpacity
              style={[row.stepBtn, { backgroundColor: theme.background }, atMin && row.stepOff]}
              onPress={() => onQtyChange(item.id, item.quantity - 1)}
              disabled={atMin}
            >
              <Minus size={10} strokeWidth={3} color={atMin ? theme.inactive : theme.primary} />
            </TouchableOpacity>
            <Text style={[row.qty, { color: theme.textPrimary }]}>{item.quantity}</Text>
            <TouchableOpacity
              style={[row.stepBtnAdd, { backgroundColor: theme.primary }]}
              onPress={() => onQtyChange(item.id, item.quantity + 1)}
            >
              <Plus size={10} strokeWidth={3} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[row.lineTotal, { color: theme.primary }]}>GH₵ {line}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[row.del, {
          backgroundColor: theme.isDark ? '#2D1515' : '#FFF0F0',
          borderColor:     theme.isDark ? '#4D2525' : '#FFD6D6',
        }]}
        onPress={() => onRemove(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Trash2 size={13} strokeWidth={2.5} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );
}

const row = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, position: 'relative', overflow: 'hidden',
                ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  indexNum:   { fontSize: 10, fontWeight: '800', position: 'absolute', top: 10, left: 10, letterSpacing: 1 },
  imgWrap:    { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', marginLeft: 8 },
  img:        { width: '100%', height: '100%', resizeMode: 'cover' },
  body:       { flex: 1, marginLeft: 12, gap: 3 },
  name:       { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  unit:       { fontSize: 11 },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepper:    { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  stepBtn:    { width: 28, height: 26, justifyContent: 'center', alignItems: 'center' },
  stepBtnAdd: { width: 28, height: 26, justifyContent: 'center', alignItems: 'center' },
  stepOff:    { opacity: 0.4 },
  qty:        { minWidth: 26, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  lineTotal:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.4 },
  del:        { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8, alignSelf: 'flex-start', marginTop: 2, borderWidth: 1 },
});

// ─── Delivery Banner ──────────────────────────────────────────────────────────

function DeliveryBanner({ subtotal }: { subtotal: number }) {
  const { theme } = useTheme();
  const pct  = Math.min(subtotal / 200, 1);
  const free = subtotal >= 200;

  return (
    <View style={[del.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={del.row}>
        <View style={[del.iconPill, {
          backgroundColor: free
            ? (theme.isDark ? '#0D2B1A' : '#E8F8F2')
            : (theme.isDark ? '#2D1820' : '#FFF0F2'),
        }]}>
          <Truck size={13} color={free ? '#00A86B' : theme.primary} strokeWidth={2.5} />
        </View>
        <Text style={[del.txt, { color: free ? '#00A86B' : theme.textSecondary }]}>
          {free
            ? '🎉 Free delivery unlocked!'
            : `GH₵ ${(200 - subtotal).toFixed(2)} away from free delivery`}
        </Text>
      </View>
      {!free && (
        <View style={[del.track, { backgroundColor: theme.border }]}>
          <View style={[del.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: theme.primary }]} />
        </View>
      )}
    </View>
  );
}

const del = StyleSheet.create({
  wrap:     { borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconPill: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txt:      { fontSize: 12, fontWeight: '600', flex: 1 },
  track:    { height: 3, borderRadius: 100, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 100 },
});

// ─── Checkout Block ───────────────────────────────────────────────────────────

function CheckoutBlock({ subtotal, onCheckout }: { subtotal: number; onCheckout: () => void }) {
  const { theme } = useTheme();
  const shipping = subtotal >= 200 ? 0 : 15;
  const total    = subtotal + shipping;

  return (
    <View style={[chk.wrap, { marginBottom: Platform.OS === 'ios' ? 110 : 90 }]}>
      <View style={chk.labelRow}>
        <View style={[chk.line, { backgroundColor: theme.border }]} />
        <Text style={[chk.labelTxt, { color: theme.inactive }]}>ORDER SUMMARY</Text>
        <View style={[chk.line, { backgroundColor: theme.border }]} />
      </View>

      <View style={[chk.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[
          { label: 'Subtotal', value: `GH₵ ${subtotal.toFixed(2)}`, color: theme.textPrimary },
          { label: 'Delivery', value: shipping === 0 ? 'FREE' : `GH₵ ${shipping.toFixed(2)}`, color: shipping === 0 ? '#00A86B' : theme.textPrimary },
        ].map(r => (
          <View key={r.label} style={chk.row}>
            <Text style={[chk.rowLbl, { color: theme.textSecondary }]}>{r.label}</Text>
            <Text style={[chk.rowVal, { color: r.color }]}>{r.value}</Text>
          </View>
        ))}
        <View style={[chk.totalRow, { borderTopColor: theme.border }]}>
          <Text style={[chk.totalLbl, { color: theme.textPrimary }]}>Total</Text>
          <Text style={[chk.totalVal, { color: theme.primary }]}>GH₵ {total.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={[chk.btn, { backgroundColor: theme.primary }]} onPress={onCheckout} activeOpacity={0.88}>
        <Zap size={16} color="#fff" strokeWidth={2.5} fill="#fff" />
        <Text style={chk.btnTxt}>Checkout Now</Text>
        <View style={chk.btnArrow}>
          <ArrowRight size={14} color={theme.primary} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>

      <View style={chk.secureRow}>
        <Lock size={10} color={theme.inactive} strokeWidth={2} />
        <Text style={[chk.secureTxt, { color: theme.inactive }]}>Secured by Paystack · 256-bit SSL</Text>
      </View>
    </View>
  );
}

const chk = StyleSheet.create({
  wrap:        { marginTop: 8 },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  line:        { flex: 1, height: 1 },
  labelTxt:    { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  summaryCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14, gap: 10,
                 ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 1 } }) },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLbl:      { fontSize: 13 },
  rowVal:      { fontSize: 13, fontWeight: '700' },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, marginTop: 2 },
  totalLbl:    { fontSize: 15, fontWeight: '700' },
  totalVal:    { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 17, paddingHorizontal: 24, gap: 10,
                 ...Platform.select({ ios: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 }, android: { elevation: 8 } }) },
  btnTxt:      { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  btnArrow:    { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  secureRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  secureTxt:   { fontSize: 11, letterSpacing: 0.2 },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

function Empty({ title, sub, cta, onCta }: {
  title: string; sub: string; cta: string; onCta: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[emp.wrap, { backgroundColor: theme.background }]}>
      <View style={[emp.iconWrap, {
        backgroundColor: theme.isDark ? '#2D1820' : '#FFF0F2',
        borderColor:     theme.isDark ? '#3D2030' : '#FFD6DE',
      }]}>
        <ShoppingBag size={36} color={theme.primary} strokeWidth={1.5} />
      </View>
      <Text style={[emp.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[emp.sub,   { color: theme.textSecondary }]}>{sub}</Text>
      <TouchableOpacity style={[emp.btn, { backgroundColor: theme.primary }]} onPress={onCta} activeOpacity={0.85}>
        <Text style={emp.btnTxt}>{cta}</Text>
        <ArrowRight size={15} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const emp = StyleSheet.create({
  wrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  iconWrap: { width: 90, height: 90, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 28, borderWidth: 1 },
  title:    { fontSize: 26, fontWeight: '900', marginBottom: 10, letterSpacing: -0.8, textAlign: 'center' },
  sub:      { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  btn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  btnTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter();
  const { user }  = useAuth();
  const { theme, isDark } = useTheme();
  const { cartItems, cartCount, cartTotal, loading, removeFromCart, updateQuantity } = useCart();

  if (!user) return <Empty title="Sign in first" sub="Log in to view your cart and check out." cta="Sign In" onCta={() => router.push('/login')} />;
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}><ActivityIndicator size="large" color={theme.primary} /></View>;
  if (cartItems.length === 0) return <Empty title="Cart is empty" sub="Browse our collection and add items that match your mood." cta="Start Shopping" onCta={() => router.push('/(tabs)')} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* ── Header ── */}
      <View style={[s.header, {
        backgroundColor:   theme.background,
        borderBottomColor: theme.border,
      }]}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <Text style={[s.headerEyebrow, { color: theme.primary }]}>YOUR ORDER</Text>
            <Text style={[s.headerTitle,   { color: theme.textPrimary }]}>My Cart</Text>
          </View>
          <View style={[s.cartBadge, {
            backgroundColor: theme.isDark ? '#2D1820' : '#FFF0F2',
            borderColor:     theme.isDark ? '#3D2030' : '#FFD6DE',
          }]}>
            <ShoppingCart size={16} color={theme.primary} strokeWidth={2.5} />
            <Text style={[s.cartBadgeTxt, { color: theme.textPrimary }]}>{cartCount}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={i => i.id}
        renderItem={({ item, index }) => (
          <CartRow item={item} index={index} onQtyChange={updateQuantity} onRemove={removeFromCart} />
        )}
        ListHeaderComponent={<DeliveryBanner subtotal={cartTotal} />}
        ListFooterComponent={
          <CheckoutBlock subtotal={cartTotal} onCheckout={() => router.push('/checkout')} />
        }
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 18, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerLeft:   { gap: 2 },
  headerEyebrow:{ fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  headerTitle:  { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  cartBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  cartBadgeTxt: { fontSize: 14, fontWeight: '800' },
  list:         { padding: 16, paddingBottom: 120 },
});