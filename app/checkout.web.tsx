/**
 * app/checkout.web.tsx — MoodMarket Checkout (Web)
 *
 * Full web version of the checkout screen.
 * - Step 1: Delivery details
 * - Step 2: Payment method (Card / Mobile Money)
 * - Step 3: Paystack inline iframe
 * - Step 4: Order confirmation with timeline
 * - Matches MoodMarket design: Sora + Lora, theme context, CSS-in-JS
 * - Scroll fixed: body uses min-height, not height:100%
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYSTACK_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? 'pk_test_YOUR_KEY';
const SUCCESS_GREEN = '#22C55E';
const SUCCESS_GREEN_BG_LIGHT = '#EDFBF1';
const SUCCESS_GREEN_BG_DARK  = '#0D2B1A';
const SUCCESS_GREEN_BORDER_LIGHT = '#A8E6C8';
const SUCCESS_GREEN_BORDER_DARK  = '#1A4D2E';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayMethod    = 'card' | 'mobile_money';
type MomoProvider = 'mtn' | 'vod' | 'tigo';
type Step         = 'details' | 'payment' | 'paying' | 'processing' | 'success';

interface OrderDetails {
  reference: string;
  total: number;
  itemCount: number;
  payMethod: PayMethod;
  address: string;
  city: string;
  phone: string;
  name: string;
  createdAt: string;
}

// ─── Paystack HTML builder ────────────────────────────────────────────────────

function buildPaystackHTML(opts: {
  publicKey: string; email: string; amountKobo: number;
  reference: string; name: string; phone: string;
  channels: string; origin: string;
}) {
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
    function post(data){ window.parent.postMessage(JSON.stringify(data),'${opts.origin}'); }
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

// ─── Step Dots ────────────────────────────────────────────────────────────────

function StepDots({ step, theme, isDark }: { step: number; theme: any; isDark: boolean }) {
  const steps = ['Details', 'Payment', 'Confirm'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done   = n < step;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: done ? SUCCESS_GREEN : active ? theme.primary : theme.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                color: (done || active) ? '#fff' : theme.inactive,
                fontFamily: '"Sora", sans-serif',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: 0.2,
                color: active ? theme.primary : theme.inactive,
                fontFamily: '"Sora", sans-serif',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 22, height: 2, borderRadius: 1,
                background: done ? SUCCESS_GREEN : theme.border,
                marginBottom: 14,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ icon, label, value, onChange, placeholder, type = 'text' }: {
  icon: string; label: string; value: string;
  onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  const { theme, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
        color: theme.inactive, fontFamily: '"Sora", sans-serif', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${focused ? theme.primary : theme.border}`,
        borderRadius: 13, overflow: 'hidden',
        background: theme.card, transition: 'border-color 0.15s',
      }}>
        <div style={{
          width: 44, height: 46,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, borderRight: `1px solid ${theme.border}`,
          background: isDark ? '#1E1E2E' : '#FFF6F7', flexShrink: 0,
        }}>
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1, height: 46, padding: '0 13px',
            fontSize: 13, color: theme.textPrimary,
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: '"Sora", sans-serif',
          }}
        />
      </div>
    </div>
  );
}

// ─── Pay Method Card ──────────────────────────────────────────────────────────

function PayMethodCard({ method, selected, onSelect, theme, isDark }: {
  method: PayMethod; selected: boolean; onSelect: () => void; theme: any; isDark: boolean;
}) {
  const cfg = method === 'card'
    ? { icon: '💳', title: 'Bank Card',    sub: 'Visa · Mastercard · Verve',   bg: isDark ? '#0D1F2D' : '#EBF4F8', pills: ['VISA','MC','VERVE'] }
    : { icon: '📱', title: 'Mobile Money', sub: 'MTN · Vodafone · AirtelTigo', bg: isDark ? '#1A1400' : '#FEF3C7', pills: ['MTN','VOD','AT']   };
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 13,
        background: theme.card,
        border: `${selected ? 2 : 1.5}px solid ${selected ? theme.primary : theme.border}`,
        borderRadius: 17, padding: 15, marginBottom: 9, cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{
        width: 50, height: 50, borderRadius: 13, fontSize: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.bg, flexShrink: 0,
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: theme.textPrimary,
          fontFamily: '"Sora", sans-serif', marginBottom: 2, letterSpacing: -0.2,
        }}>
          {cfg.title}
        </div>
        <div style={{
          fontSize: 11, color: theme.textSecondary,
          fontFamily: '"Sora", sans-serif', marginBottom: 7,
        }}>
          {cfg.sub}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {cfg.pills.map(p => (
            <div key={p} style={{
              padding: '2px 8px', borderRadius: 5, fontSize: 9, fontWeight: 800,
              letterSpacing: 0.5, fontFamily: '"Sora", sans-serif',
              border: `1px solid ${selected ? (isDark ? '#3D2030' : '#FFD6DE') : theme.border}`,
              background: selected ? (isDark ? '#2D1820' : '#FFF0F2') : theme.background,
              color: selected ? theme.primary : theme.inactive,
            }}>
              {p}
            </div>
          ))}
        </div>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${selected ? theme.primary : theme.inactive}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && (
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: theme.primary,
          }} />
        )}
      </div>
    </div>
  );
}

// ─── MoMo Selector ────────────────────────────────────────────────────────────

function MomoSelector({ selected, onSelect, momoNumber, onNumberChange, theme, isDark }: {
  selected: MomoProvider | null; onSelect: (p: MomoProvider) => void;
  momoNumber: string; onNumberChange: (v: string) => void;
  theme: any; isDark: boolean;
}) {
  const providers: { id: MomoProvider; label: string; color: string; bg: string }[] = [
    { id: 'mtn',  label: 'MTN',        color: '#F59E0B', bg: isDark ? '#1A1400' : '#FEF3C7' },
    { id: 'vod',  label: 'Vodafone',   color: '#E53E3E', bg: isDark ? '#2D1515' : '#FFF0F0' },
    { id: 'tigo', label: 'AirtelTigo', color: '#DC2626', bg: isDark ? '#2D1515' : '#FFF5F5' },
  ];
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      background: theme.card, border: `1.5px solid ${theme.primary}`,
      borderRadius: 15, padding: 15, marginBottom: 14,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
        color: theme.inactive, fontFamily: '"Sora", sans-serif', marginBottom: 8,
      }}>
        Select Network
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 13 }}>
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 9,
              border: `1.5px solid ${selected === p.id ? p.color : theme.border}`,
              background: selected === p.id ? p.bg : theme.background,
              color: selected === p.id ? p.color : theme.inactive,
              fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
              cursor: 'pointer', fontFamily: '"Sora", sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
        color: theme.inactive, fontFamily: '"Sora", sans-serif', marginBottom: 5,
      }}>
        MoMo Number
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${focused ? theme.primary : theme.border}`,
        borderRadius: 13, overflow: 'hidden', background: theme.card,
        transition: 'border-color 0.15s',
      }}>
        <div style={{
          width: 44, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, borderRight: `1px solid ${theme.border}`,
          background: isDark ? '#1E1E2E' : '#FFF6F7', flexShrink: 0,
        }}>📞</div>
        <input
          type="tel"
          value={momoNumber}
          onChange={e => onNumberChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="e.g. 0244000000"
          style={{
            flex: 1, height: 46, padding: '0 13px',
            fontSize: 13, color: theme.textPrimary,
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: '"Sora", sans-serif',
          }}
        />
      </div>
    </div>
  );
}

// ─── Paystack iframe ──────────────────────────────────────────────────────────

function WebPaystackFrame({ html, onMessage }: {
  html: string; onMessage: (data: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobRef   = useRef<string | null>(null);
  const { theme } = useTheme();

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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.background }}>
      <iframe
        ref={iframeRef}
        style={{ flex: 1, border: 'none', width: '100%', minHeight: 520 }}
        title="Paystack Payment"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}

// ─── Order Confirmation ───────────────────────────────────────────────────────

function OrderConfirmation({ order, onGoHome, onViewOrders, theme, isDark }: {
  order: OrderDetails; onGoHome: () => void; onViewOrders: () => void;
  theme: any; isDark: boolean;
}) {
  const payLabel = order.payMethod === 'card' ? 'Bank Card' : 'Mobile Money';

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7,
    }}>
      <span style={{ fontSize: 12, color: theme.textSecondary, fontFamily: '"Sora", sans-serif' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary, fontFamily: '"Sora", sans-serif' }}>{value}</span>
    </div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 17, padding: 18, marginBottom: 13,
    }}>
      {children}
    </div>
  );

  const CardHeader = ({ icon, label }: { icon: string; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
        color: theme.inactive, fontFamily: '"Sora", sans-serif',
      }}>
        {label}
      </span>
    </div>
  );

  const Divider = () => (
    <div style={{ height: 1, background: theme.border, margin: '10px 0' }} />
  );

  const timelineItems = [
    { icon: '✅', label: 'Payment confirmed',  sub: 'Your payment has been received',  done: true,  active: false },
    { icon: '📦', label: 'Order being packed', sub: 'We are preparing your items',     done: false, active: true  },
    { icon: '🚚', label: 'Out for delivery',   sub: 'Estimated 2–4 business days',     done: false, active: false },
    { icon: '🏠', label: 'Delivered',          sub: 'Your order will arrive soon',     done: false, active: false },
  ];

  return (
    <div style={{ padding: '0 24px 60px' }}>
      {/* Badge */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: isDark ? SUCCESS_GREEN_BG_DARK : SUCCESS_GREEN_BG_LIGHT,
          border: `1.5px solid ${isDark ? SUCCESS_GREEN_BORDER_DARK : SUCCESS_GREEN_BORDER_LIGHT}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, margin: '0 auto 20px',
        }}>
          ✅
        </div>
        <h2 style={{
          fontSize: 26, fontWeight: 900, color: theme.textPrimary,
          fontFamily: '"Lora", serif', letterSpacing: -0.5, marginBottom: 8,
        }}>
          Order Confirmed!
        </h2>
        <p style={{
          fontSize: 13, color: theme.textSecondary, lineHeight: 1.6,
          maxWidth: 280, margin: '0 auto', fontFamily: '"Sora", sans-serif',
        }}>
          Your payment was successful and your order is being processed.
        </p>
      </div>

      {/* Reference */}
      <Card>
        <CardHeader icon="#️⃣" label="Order Reference" />
        <div style={{
          fontSize: 17, fontWeight: 900, color: theme.textPrimary,
          fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8,
        }}>
          {order.reference}
        </div>
        <Divider />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>
          🕐 {order.createdAt}
        </div>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader icon="📦" label="Order Summary" />
        <InfoRow label="Items"   value={`${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`} />
        <InfoRow label="Payment" value={payLabel} />
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, fontFamily: '"Sora", sans-serif' }}>Total Paid</span>
          <span style={{ fontSize: 21, fontWeight: 900, color: theme.primary, fontFamily: '"Sora", sans-serif', letterSpacing: -0.5 }}>
            GH₵ {order.total.toFixed(2)}
          </span>
        </div>
      </Card>

      {/* Delivery */}
      <Card>
        <CardHeader icon="🚚" label="Delivery Details" />
        <InfoRow label="Name"    value={order.name} />
        <InfoRow label="Phone"   value={order.phone} />
        <InfoRow label="Address" value={`${order.address}, ${order.city}`} />
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader icon="🕐" label="Order Status" />
        {timelineItems.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative', marginBottom: 3 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: item.done
                  ? (isDark ? SUCCESS_GREEN_BG_DARK : SUCCESS_GREEN_BG_LIGHT)
                  : item.active
                  ? (isDark ? '#2D1820' : '#FFF0F2')
                  : theme.background,
              }}>
                {item.icon}
              </div>
              {i < timelineItems.length - 1 && (
                <div style={{
                  width: 2, height: 22,
                  background: item.done ? SUCCESS_GREEN : theme.border,
                }} />
              )}
            </div>
            <div style={{ paddingLeft: 12, paddingBottom: 10 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, marginBottom: 2,
                color: (item.done || item.active) ? theme.textPrimary : theme.inactive,
                fontFamily: '"Sora", sans-serif',
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, color: theme.textSecondary, fontFamily: '"Sora", sans-serif' }}>
                {item.sub}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Actions */}
      <button
        onClick={onGoHome}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
          background: theme.primary, color: '#fff',
          fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: '"Sora", sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          marginBottom: 11, transition: 'opacity 0.15s',
        }}
      >
        🏠 Back to Home
      </button>
      <button
        onClick={onViewOrders}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 14,
          border: `1.5px solid ${theme.primary}`, background: 'transparent',
          color: theme.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: '"Sora", sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'opacity 0.15s',
        }}
      >
        📦 View My Orders
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CheckoutWeb() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { theme, isDark } = useTheme();

  const [step,           setStep]           = useState<Step>('details');
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

  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const pri  = theme.primary;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;
  const inact = theme.inactive;

  // ── Validation ──

  const validateDetails = () => {
    if (!name.trim())    { alert('Please enter your full name.');        return false; }
    if (!phone.trim())   { alert('Please enter your phone number.');     return false; }
    if (!address.trim()) { alert('Please enter your delivery address.'); return false; }
    if (!city.trim())    { alert('Please enter your city.');             return false; }
    return true;
  };

  const validatePayment = () => {
    if (!payMethod) { alert('Please choose a payment method.'); return false; }
    if (payMethod === 'mobile_money') {
      if (!momoProvider)      { alert('Please select your MoMo network.'); return false; }
      if (!momoNumber.trim()) { alert('Please enter your MoMo number.');   return false; }
    }
    return true;
  };

  // ── Initiate Paystack ──

  const initiatePayment = () => {
    if (!validatePayment()) return;
    const origin = window.location.origin;
    setPaystackHTML(buildPaystackHTML({
      publicKey:  PAYSTACK_KEY,
      email:      user?.email ?? 'customer@moodmarket.com',
      amountKobo: Math.round(total * 100),
      reference:  paystackRef.current,
      name,
      phone: payMethod === 'mobile_money' ? momoNumber : phone,
      channels: payMethod === 'card' ? '["card"]' : '["mobile_money"]',
      origin,
    }));
    setStep('paying');
  };

  // ── Handle Paystack message ──

  const handlePaymentMessage = useCallback(async (data: string) => {
    try {
      const msg = JSON.parse(data);

      if (msg.event === 'closed') {
        setStep('payment');
        return;
      }

      if (msg.event === 'success') {
        setStep('processing');

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
          alert(`Payment received but order could not be saved.\nRef: ${msg.reference}`);
          setStep('payment');
          return;
        }

        await clearCart();

        try {
          await NotificationService.send(
            '🎉 Order Confirmed!',
            `GH₵${total.toFixed(2)} order placed successfully.`
          );
        } catch {}

        setConfirmedOrder({
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
        });

        setStep('success');
      }
    } catch (err) {
      console.error('[Checkout] message error:', err);
    }
  }, [user, cartItems, total, payMethod, address, city, phone, name, clearCart]);

  // ── Shared styles ──

  const navStyle: React.CSSProperties = {
    height: 56, background: card, borderBottom: `1px solid ${bord}`,
    display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
    position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
  };

  const backBtnStyle: React.CSSProperties = {
    background: isDark ? '#2D1820' : '#FFF0F2',
    border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
    borderRadius: 10, padding: '6px 13px',
    fontSize: 12, fontWeight: 700, color: pri,
    cursor: 'pointer', fontFamily: '"Sora", sans-serif',
    transition: 'opacity 0.15s', flexShrink: 0,
  };

  const logoStyle: React.CSSProperties = {
    fontFamily: '"Lora", serif', fontSize: 17, fontWeight: 600,
    color: tp, cursor: 'pointer', marginRight: 'auto',
  };

  const sumStripStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: isDark ? '#2D1820' : '#FFF0F2',
    border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
    borderRadius: 13, padding: '11px 16px', marginBottom: 22,
  };

  const secLabelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, letterSpacing: 1.8,
    textTransform: 'uppercase', color: inact,
    fontFamily: '"Sora", sans-serif', marginBottom: 12,
  };

  const payBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '15px 0', borderRadius: 15, border: 'none',
    background: pri, color: '#fff',
    fontSize: 14, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: '"Sora", sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    opacity: disabled ? 0.45 : 1, transition: 'opacity 0.15s', marginBottom: 12,
    letterSpacing: 0.1,
  });

  // ── Not signed in ──

  if (!user) return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🛒</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: tp, fontFamily: '"Lora", serif', marginBottom: 10 }}>Please log in to checkout</h2>
        <p style={{ fontSize: 14, color: ts, fontFamily: '"Sora", sans-serif', marginBottom: 28 }}>Sign in to complete your purchase.</p>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: pri, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: '"Sora", sans-serif',
            boxShadow: `0 6px 20px ${pri}44`,
          }}
        >
          Sign In →
        </button>
      </div>
    </>
  );

  // ── Success ──

  if (step === 'success' && confirmedOrder) return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <nav style={navStyle}>
          <div style={{ width: 60 }} />
          <span style={{ ...logoStyle, margin: '0 auto' }}>Mood<span style={{ color: pri }}>Market</span></span>
          <span style={{ fontSize: 18, marginLeft: 'auto' }}>✅</span>
        </nav>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: 560, margin: '0 auto', width: '100%' }}>
          <OrderConfirmation
            order={confirmedOrder}
            onGoHome={() => router.replace('/(tabs)')}
            onViewOrders={() => router.replace('/profile')}
            theme={theme}
            isDark={isDark}
          />
        </div>
      </div>
    </>
  );

  // ── Processing ──

  if (step === 'processing') return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>
        <nav style={navStyle}>
          <div style={{ width: 60 }} />
          <span style={{ ...logoStyle, margin: '0 auto' }}>Mood<span style={{ color: pri }}>Market</span></span>
          <div style={{ width: 60 }} />
        </nav>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 60 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: `3px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
            borderTopColor: pri, animation: 'spin .7s linear infinite',
          }} />
          <p style={{ fontSize: 13, color: ts, fontFamily: '"Sora", sans-serif' }}>Confirming your order…</p>
        </div>
      </div>
    </>
  );

  // ── Paystack iframe ──

  if (step === 'paying') return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <nav style={navStyle}>
          <button style={backBtnStyle} onClick={() => setStep('payment')}>← Back</button>
          <span style={{ ...logoStyle }}>Mood<span style={{ color: pri }}>Market</span></span>
          <span style={{ fontSize: 16 }}>🔒</span>
        </nav>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WebPaystackFrame html={paystackHTML} onMessage={handlePaymentMessage} />
        </div>
      </div>
    </>
  );

  // ── Payment step ──

  if (step === 'payment') return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <nav style={navStyle}>
          <button style={backBtnStyle} onClick={() => setStep('details')}>← Back</button>
          <div style={{ margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: tp, fontFamily: '"Sora", sans-serif' }}>Payment</div>
            <div style={{ marginTop: 5, display: 'flex', justifyContent: 'center' }}>
              <StepDots step={2} theme={theme} isDark={isDark} />
            </div>
          </div>
          <div style={{ width: 60 }} />
        </nav>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: 560, margin: '0 auto', width: '100%', padding: '20px 24px 48px' }}>
          <div style={sumStripStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: tp, fontFamily: '"Sora", sans-serif' }}>
              📦 {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: pri, fontFamily: '"Sora", sans-serif', letterSpacing: -0.4 }}>
              GH₵ {total.toFixed(2)}
            </div>
          </div>

          <div style={secLabelStyle}>Choose Payment Method</div>
          <PayMethodCard method="card"         selected={payMethod === 'card'}         onSelect={() => setPayMethod('card')}         theme={theme} isDark={isDark} />
          <PayMethodCard method="mobile_money" selected={payMethod === 'mobile_money'} onSelect={() => setPayMethod('mobile_money')} theme={theme} isDark={isDark} />

          {payMethod === 'mobile_money' && (
            <MomoSelector
              selected={momoProvider}
              onSelect={setMomoProvider}
              momoNumber={momoNumber}
              onNumberChange={setMomoNumber}
              theme={theme}
              isDark={isDark}
            />
          )}

          <button
            style={payBtnStyle(!payMethod)}
            onClick={initiatePayment}
            disabled={!payMethod}
          >
            <span style={{ fontSize: 15 }}>
              {payMethod === 'mobile_money' ? '📱' : '💳'}
            </span>
            Pay GH₵ {total.toFixed(2)}
            {payMethod === 'card' ? ' with Card' : payMethod === 'mobile_money' ? ' with MoMo' : ''}
            <span>›</span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            {[
              { icon: '🔒', text: '256-bit SSL'         },
              { icon: '⚡', text: 'Powered by Paystack' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: ts, fontFamily: '"Sora", sans-serif' }}>
                <span>{icon}</span> {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // ── Details step (default) ──

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <nav style={navStyle}>
          <button style={backBtnStyle} onClick={() => router.back()}>← Back</button>
          <div style={{ margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: tp, fontFamily: '"Sora", sans-serif' }}>Checkout</div>
            <div style={{ marginTop: 5, display: 'flex', justifyContent: 'center' }}>
              <StepDots step={1} theme={theme} isDark={isDark} />
            </div>
          </div>
          <div style={{ width: 60 }} />
        </nav>

        <div style={{ flex: 1, overflowY: 'auto', maxWidth: 560, margin: '0 auto', width: '100%', padding: '20px 24px 48px' }}>
          <div style={sumStripStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: tp, fontFamily: '"Sora", sans-serif' }}>
              📦 {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: pri, fontFamily: '"Sora", sans-serif', letterSpacing: -0.4 }}>
              GH₵ {total.toFixed(2)}
            </div>
          </div>

          <div style={secLabelStyle}>Delivery Details</div>
          <Field icon="👤" label="Full Name"      value={name}    onChange={setName}    placeholder="e.g. Ama Owusu" />
          <Field icon="📞" label="Phone Number"   value={phone}   onChange={setPhone}   placeholder="e.g. 0244000000" type="tel" />
          <Field icon="📍" label="Street Address" value={address} onChange={setAddress} placeholder="e.g. 14 Osu Badu Street" />
          <Field icon="🏙️" label="City"           value={city}    onChange={setCity}    placeholder="e.g. Accra" />

          <div style={{ ...secLabelStyle, marginTop: 18 }}>Order Summary</div>
          <div style={{
            background: card, border: `1px solid ${bord}`,
            borderRadius: 15, padding: 16, marginBottom: 18,
          }}>
            {[
              { label: `Subtotal (${cartCount} items)`, value: `GH₵ ${cartTotal.toFixed(2)}`, green: false },
              { label: 'Delivery', value: shipping === 0 ? 'FREE' : `GH₵ ${shipping.toFixed(2)}`, green: shipping === 0 },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: ts, fontFamily: '"Sora", sans-serif' }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.green ? SUCCESS_GREEN : tp, fontFamily: '"Sora", sans-serif' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ height: 1, background: bord, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: tp, fontFamily: '"Sora", sans-serif' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: pri, fontFamily: '"Sora", sans-serif', letterSpacing: -0.6 }}>
                GH₵ {total.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            style={payBtnStyle(false)}
            onClick={() => { if (validateDetails()) setStep('payment'); }}
          >
            Continue to Payment <span>›</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Global styles (scroll fix + font + spinner) ──────────────────────────────

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: "Sora", sans-serif; }
  body { min-height: 100%; font-family: "Sora", sans-serif; overflow-y: auto; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;