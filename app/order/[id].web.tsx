/**
 * app/order/[id].web.tsx — Order tracking with web layout
 */

import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import WebShell from '@/components/WebShell';
import {
  Package, CheckCircle, Truck, Home, Clock, Hash,
  ShoppingBag, CreditCard, MapPin,
} from 'lucide-react';

const SUCCESS_GREEN = '#22C55E';

interface OrderProduct { productId: string; name: string; price: number; quantity: number; }
interface Order {
  id: string; user_id: string; products: OrderProduct[];
  total_price: number; status: string; created_at: string;
  payment_reference: string | null; payment_method: string | null;
  delivery_address: string | null; delivery_phone: string | null;
}

function getStatusConfig(status: string, isDark: boolean) {
  switch (status) {
    case 'paid':      return { label: 'Paid',      color: '#0A7EA4', bg: isDark ? '#0D1F2D' : '#E8F4F8', Icon: CheckCircle };
    case 'shipped':   return { label: 'Shipped',   color: '#7C5CBF', bg: isDark ? '#1E1428' : '#F0EBF8', Icon: Truck };
    case 'delivered': return { label: 'Delivered', color: SUCCESS_GREEN, bg: isDark ? '#0D2B1A' : '#EDFBF1', Icon: CheckCircle };
    case 'cancelled': return { label: 'Cancelled', color: '#E53E3E', bg: isDark ? '#2D1515' : '#FFF0F0', Icon: Package };
    default:          return { label: status,      color: '#888',    bg: isDark ? '#222' : '#F5F5F5',    Icon: Clock };
  }
}

function getTimeline(status: string) {
  const steps = [
    { key: 'paid',      Icon: CheckCircle, label: 'Payment Confirmed', sub: 'Your payment has been received' },
    { key: 'packed',    Icon: Package,     label: 'Order Packed',      sub: 'Your items are being prepared' },
    { key: 'shipped',   Icon: Truck,       label: 'Out for Delivery',  sub: 'Your order is on its way' },
    { key: 'delivered', Icon: Home,        label: 'Delivered',         sub: 'Your order has arrived' },
  ];
  const currentIndex = status === 'paid' ? 0 : status === 'shipped' ? 2 : status === 'delivered' ? 3 : status === 'cancelled' ? -1 : 0;
  return steps.map((step, i) => ({
    ...step,
    done: i < currentIndex || (i === currentIndex && status === 'delivered'),
    active: i === currentIndex && status !== 'delivered',
  }));
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <div style={{
      background: isDark ? '#141414' : '#fff',
      border: `1px solid ${isDark ? '#222' : '#EAEAEA'}`,
      borderRadius: 18, padding: 18, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        {icon}
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 2,
          color: isDark ? '#888' : '#999', textTransform: 'uppercase',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function OrderTrackingWeb() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setError('Order not found.');
        else setOrder(data);
        setLoading(false);
      });
  }, [id]);

  const pri = theme.primary;
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';
  const cardBg = isDark ? '#141414' : '#fff';
  const bord = isDark ? '#222' : '#EAEAEA';

  if (loading) return (
    <WebShell activeNav="profile" title="Order" subtitle="Loading…">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <div className="spinner" style={{
          width: 28, height: 28,
          border: `2px solid ${bord}`, borderTopColor: pri,
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </WebShell>
  );

  if (error || !order) return (
    <WebShell activeNav="profile" title="Order Not Found">
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Package size={48} color={ts} strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 18, fontWeight: 800, color: tp, marginBottom: 8, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Order Not Found</p>
        <p style={{ fontSize: 14, color: ts, marginBottom: 24, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>We couldn't find this order. It may have been removed.</p>
        <button onClick={() => router.back()} style={{
          background: pri, color: '#fff', border: 'none', borderRadius: 14,
          padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>Go Back</button>
      </div>
    </WebShell>
  );

  const cfg = getStatusConfig(order.status, isDark);
  const StatusIcon = cfg.Icon;
  const timeline = getTimeline(order.status);
  const isCancelled = order.status === 'cancelled';
  const payLabel = order.payment_method === 'card' ? 'Bank Card' : order.payment_method === 'mobile_money' ? 'Mobile Money' : order.payment_method ?? '—';

  return (
    <WebShell activeNav="profile" title={`#${order.id.slice(0, 8).toUpperCase()}`} subtitle="Order Tracking">
      <div style={{ maxWidth: 640 }}>
        {/* status banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: cfg.bg, borderRadius: 18, padding: 18, marginBottom: 14,
        }}>
          <StatusIcon size={28} color={cfg.color} strokeWidth={1.8} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: cfg.color, letterSpacing: -0.3, marginBottom: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{cfg.label}</p>
            <p style={{ fontSize: 13, lineHeight: 1.4, color: cfg.color, opacity: 0.75, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {order.status === 'paid' ? 'Your order is confirmed and being prepared' :
               order.status === 'shipped' ? 'Your order is on its way to you' :
               order.status === 'delivered' ? 'Your order has been delivered successfully' :
               order.status === 'cancelled' ? 'This order has been cancelled' : 'Order status updated'}
            </p>
          </div>
        </div>

        {/* timeline */}
        {!isCancelled && (
          <Card icon={<Clock size={14} color={pri} strokeWidth={2.5} />} title="Order Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {timeline.map((step, i) => (
                <div key={step.key} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: step.done ? (isDark ? '#0D2B1A' : '#EDFBF1') : step.active ? (isDark ? '#2D1820' : '#FFF0F2') : 'transparent',
                      border: step.active ? `2px solid ${pri}` : '2px solid transparent',
                    }}>
                      <step.Icon size={15} color={step.done ? SUCCESS_GREEN : step.active ? pri : ts} strokeWidth={2} />
                    </div>
                    {i < timeline.length - 1 && (
                      <div style={{
                        width: 2, flex: 1, minHeight: 20, marginTop: 2,
                        background: step.done ? SUCCESS_GREEN : bord,
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingTop: 8, paddingBottom: i < timeline.length - 1 ? 20 : 0 }}>
                    <p style={{
                      fontSize: 14, marginBottom: 3,
                      color: step.done || step.active ? tp : ts,
                      fontWeight: step.active ? 800 : 600,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}>{step.label}</p>
                    <p style={{ fontSize: 12, lineHeight: 1.4, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* reference */}
        <Card icon={<Hash size={14} color={pri} strokeWidth={2.5} />} title="Order Reference">
          <p style={{
            fontSize: 16, fontWeight: 900, letterSpacing: 0.5,
            color: tp, fontFamily: '"JetBrains Mono", monospace',
          }}>{order.payment_reference ?? order.id.slice(0, 16).toUpperCase()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Clock size={12} color={ts} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 500, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </Card>

        {/* items */}
        <Card icon={<ShoppingBag size={14} color={pri} strokeWidth={2.5} />} title="Items Ordered">
          {order.products.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0',
              borderBottom: i < order.products.length - 1 ? `1px solid ${bord}` : 'none',
            }}>
              <span style={{
                padding: '4px 8px', borderRadius: 8,
                background: theme.tint, color: pri,
                fontSize: 12, fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>×{item.quantity}</span>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 600, color: tp,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>{item.name}</span>
              <span style={{
                fontSize: 13, fontWeight: 800, color: pri,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>GH₵{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 12, paddingTop: 12, borderTop: `1px solid ${bord}`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: tp, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Total Paid</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: pri, letterSpacing: -0.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>GH₵ {Number(order.total_price).toFixed(2)}</span>
          </div>
        </Card>

        {/* payment */}
        <Card icon={<CreditCard size={14} color={pri} strokeWidth={2.5} />} title="Payment">
          <InfoRow label="Method" value={payLabel} />
          <InfoRow label="Status" value="Paid" accent={SUCCESS_GREEN} />
          {order.payment_reference && (
            <InfoRow label="Reference" value={order.payment_reference.slice(0, 24) + '…'} />
          )}
        </Card>

        {/* delivery */}
        {(order.delivery_address || order.delivery_phone) && (
          <Card icon={<MapPin size={14} color={pri} strokeWidth={2.5} />} title="Delivery Details">
            {order.delivery_address && <InfoRow label="Address" value={order.delivery_address} />}
            {order.delivery_phone && <InfoRow label="Phone" value={order.delivery_phone} />}
          </Card>
        )}

        {/* actions */}
        <button onClick={() => router.replace('/(tabs)')} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: pri, color: '#fff', border: 'none', borderRadius: 16,
          padding: '16px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer',
          fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 12,
        }}>
          <Home size={16} strokeWidth={2} /> Back to Home
        </button>
        <button onClick={() => router.replace('/(tabs)/profile')} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'transparent', color: pri, border: `1.5px solid ${pri}`,
          borderRadius: 16, padding: '14px 0', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 8,
        }}>
          <Package size={15} strokeWidth={2} /> All My Orders
        </button>
      </div>
    </WebShell>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { isDark } = useTheme();
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: ts, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, color: accent ?? tp,
        textAlign: 'right', marginLeft: 16, fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}>{value}</span>
    </div>
  );
}
