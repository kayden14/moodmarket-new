/**
 * app/cart.web.tsx — MoodMarket Cart (Web)
 * RESPONSIVE: Full coverage for mobile (320px+), tablet (600–960px), laptop (960–1280px), desktop (1280px+)
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ShoppingCart, ShoppingBag, Zap, CheckCircle, ArrowRight, ArrowLeft, Trash2, Truck, PartyPopper, Lock, Sun, Moon, User } from 'lucide-react';

const WebEmoji = ({ children, style }: any) => <span style={{ ...style, fontFamily: undefined }}>{children}</span>;

// ─── Quantity Stepper ─────────────────────────────────────────────────────────

function Stepper({
  value, onDecrement, onIncrement, theme,
}: { value: number; onDecrement: () => void; onIncrement: () => void; theme: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button
        onClick={onDecrement}
        disabled={value <= 1}
        style={{
          width: 32, height: 32,
          border: `1.5px solid ${theme.border}`,
          borderRadius: '8px 0 0 8px',
          background: theme.background,
          color: value <= 1 ? theme.inactive : theme.primary,
          fontSize: 18, fontWeight: 700,
          cursor: value <= 1 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: value <= 1 ? 0.4 : 1,
          transition: 'all 0.12s',
        }}
      >−</button>
      <div style={{
        width: 42, height: 32,
        border: `1.5px solid ${theme.border}`,
        borderLeft: 'none', borderRight: 'none',
        background: theme.card,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800,
        color: theme.textPrimary,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}>
        {value}
      </div>
      <button
        onClick={onIncrement}
        style={{
          width: 32, height: 32,
          border: `1.5px solid ${theme.border}`,
          borderRadius: '0 8px 8px 0',
          background: theme.primary,
          color: '#fff',
          fontSize: 18, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s',
        }}
      >+</button>
    </div>
  );
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

function CartItemRow({
  item, index, onQtyChange, onRemove, theme, isDark,
}: {
  item: any; index: number;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  theme: any; isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const lineTotal = (item.products.price * item.quantity).toFixed(2);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cart-item-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: theme.card,
        border: `1px solid ${hovered ? theme.primary : theme.border}`,
        borderRadius: 16,
        marginBottom: 10,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? `0 4px 20px ${theme.primary}18` : '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
      }}
    >
      {/* Index */}
      <span style={{
        position: 'absolute', top: 8, left: 10,
        fontSize: 9, fontWeight: 800, letterSpacing: 1,
        color: theme.inactive,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Image */}
      <div className="cart-item-image" style={{
        width: 72, height: 72,
        borderRadius: 12,
        overflow: 'hidden',
        background: theme.tint,
        flexShrink: 0,
        marginLeft: 8,
      }}>
        <Image
          source={{ uri: item.products.image }}
          style={{ width: '100%', height: '100%' } as any}
          contentFit="cover"
          transition={200}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: '0 0 3px',
          fontSize: 13, fontWeight: 700,
          color: theme.textPrimary,
          fontFamily: '"Playfair Display", serif',
          letterSpacing: -0.2,
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.products.name}
        </p>
        <p style={{
          margin: '0 0 10px',
          fontSize: 11, color: theme.textSecondary,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>
          GH₵ {item.products.price.toFixed(2)} / unit
        </p>
        <Stepper
          value={item.quantity}
          onDecrement={() => onQtyChange(item.id, item.quantity - 1)}
          onIncrement={() => onQtyChange(item.id, item.quantity + 1)}
          theme={theme}
        />
      </div>

      {/* Line total + delete */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: 8, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: theme.primary,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          letterSpacing: -0.4,
        }}>
          GH₵ {lineTotal}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          style={{
            width: 30, height: 30,
            borderRadius: 8,
            border: `1px solid ${isDark ? '#4D2525' : '#FFD6D6'}`,
            background: isDark ? '#2D1515' : '#FFF5F5',
            color: '#EF4444',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
            transition: 'all 0.13s',
          }}
          title="Remove item"
        >
          <Trash2 size={14} color="#EF4444" />
        </button>
      </div>
    </div>
  );
}

// ─── Delivery Progress ────────────────────────────────────────────────────────

function DeliveryProgress({ subtotal, theme, isDark }: { subtotal: number; theme: any; isDark: boolean }) {
  const FREE_THRESHOLD = 200;
  const pct = Math.min(subtotal / FREE_THRESHOLD, 1);
  const remaining = (FREE_THRESHOLD - subtotal).toFixed(2);
  const isFree = subtotal >= FREE_THRESHOLD;

  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 14,
      padding: '12px 16px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isFree ? 0 : 10 }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: 8,
          background: isFree
            ? (isDark ? '#0D2B1A' : '#E8F8F2')
            : (isDark ? '#2D1820' : '#FFF0F2'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0,
        }}>
          <Truck size={14} />
        </div>
        <p style={{
          margin: 0, flex: 1,
          fontSize: 12, fontWeight: 600,
          color: isFree ? '#22C55E' : theme.textSecondary,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>
          {isFree
            ? <><PartyPopper size={12} /> Free delivery unlocked!</>
            : `GH₵ ${remaining} away from free delivery`}
        </p>
      </div>
      {!isFree && (
        <div style={{
          height: 4, borderRadius: 100,
          background: theme.border, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round(pct * 100)}%`,
            background: theme.primary,
            borderRadius: 100,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Order Summary Panel ──────────────────────────────────────────────────────

function OrderSummary({
  subtotal, coupon, setCoupon, onCheckout, theme, isDark, cartCount,
}: {
  subtotal: number;
  coupon: string;
  setCoupon: (v: string) => void;
  onCheckout: () => void;
  theme: any; isDark: boolean; cartCount: number;
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponFocused, setCouponFocused] = useState(false);
  const shipping = subtotal >= 200 ? 0 : 15;
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const total = subtotal + shipping - discount;

  const handleApplyCoupon = () => {
    if (couponInput.trim()) setCouponApplied(true);
  };

  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 22,
      overflow: 'hidden',
      boxShadow: `0 4px 24px ${theme.primary}14`,
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{
            margin: '0 0 2px',
            fontSize: 10, fontWeight: 800,
            letterSpacing: 2,
            color: theme.primary,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            textTransform: 'uppercase',
          }}>
            ORDER SUMMARY
          </p>
          <h3 style={{
            margin: 0,
            fontSize: 17, fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: '"Playfair Display", serif',
            letterSpacing: -0.3,
          }}>
            Your Bag
          </h3>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: isDark ? '#2D1820' : '#FFF0F2',
          border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
          borderRadius: 12,
          padding: '5px 10px',
        }}>
          <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center' }}><ShoppingCart size={13} /></span>
          <span style={{
            fontSize: 13, fontWeight: 800,
            color: theme.textPrimary,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            {cartCount}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div style={{ padding: '18px 20px' }}>
        {[
          { label: 'Subtotal', value: `GH₵ ${subtotal.toFixed(2)}`, color: theme.textPrimary },
          {
            label: 'Delivery',
            value: shipping === 0 ? 'FREE' : `GH₵ ${shipping.toFixed(2)}`,
            color: shipping === 0 ? '#22C55E' : theme.textPrimary,
          },
          ...(couponApplied ? [{
            label: 'Coupon (10%)',
            value: `– GH₵ ${discount.toFixed(2)}`,
            color: '#22C55E',
          }] : []),
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10,
          }}>
            <span style={{
              fontSize: 13, color: theme.textSecondary,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}>
              {row.label}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: row.color,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}>
              {row.value}
            </span>
          </div>
        ))}

        <div style={{ height: 1, background: theme.border, margin: '14px 0' }} />

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 18,
        }}>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            Total
          </span>
          <span style={{
            fontSize: 26, fontWeight: 900,
            color: theme.primary,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            letterSpacing: -1,
          }}>
            GH₵ {total.toFixed(2)}
          </span>
        </div>

        {/* Coupon */}
        {!couponApplied && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              value={couponInput}
              onChange={e => setCouponInput(e.target.value)}
              onFocus={() => setCouponFocused(true)}
              onBlur={() => setCouponFocused(false)}
              placeholder="Coupon code…"
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: `1.5px solid ${couponFocused ? theme.primary : theme.border}`,
                background: theme.background,
                color: theme.textPrimary,
                fontSize: 12,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                outline: 'none',
                transition: 'border-color 0.15s',
                minWidth: 0,
              }}
            />
            <button
              onClick={handleApplyCoupon}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: `1.5px solid ${theme.primary}`,
                background: 'none',
                color: theme.primary,
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                whiteSpace: 'nowrap',
                transition: 'all 0.13s',
                flexShrink: 0,
              }}
            >
              Apply
            </button>
          </div>
        )}
        {couponApplied && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: isDark ? '#0D2B1A' : '#EDFBF1',
            border: '1px solid #86EFAC',
            borderRadius: 10, padding: '9px 12px',
            marginBottom: 18,
          }}>
            <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={13} color="#22C55E" /></span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#22C55E',
              fontFamily: '"Plus Jakarta Sans", sans-serif', flex: 1,
            }}>
              10% discount applied!
            </span>
            <button
              onClick={() => { setCouponApplied(false); setCouponInput(''); }}
              style={{
                background: 'none', border: 'none',
                color: '#22C55E', cursor: 'pointer',
                fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              Remove
            </button>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onCheckout}
          style={{
            width: '100%', padding: '14px 0',
            borderRadius: 14, border: 'none',
            background: theme.primary,
            color: '#fff',
            fontSize: 14, fontWeight: 800,
            cursor: 'pointer',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: `0 8px 24px ${theme.primary}44`,
            transition: 'transform 0.15s, box-shadow 0.15s',
            letterSpacing: 0.2,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 14px 32px ${theme.primary}55`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${theme.primary}44`;
          }}
        >
          <span style={{ fontSize: 16, display: 'inline-flex', alignItems: 'center' }}><Zap size={16} /></span>
          Checkout Now
          <div style={{
            width: 28, height: 28,
            borderRadius: 7,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><ArrowRight size={12} color={theme.primary} /></span>
          </div>
        </button>

        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 10,
        }}>
          <span style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center' }}><Lock size={10} /></span>
          <span style={{
            fontSize: 10, color: theme.inactive,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            letterSpacing: 0.2,
          }}>
            Secured by Paystack · 256-bit SSL
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function CartEmpty({ theme, isDark, onShop }: { theme: any; isDark: boolean; onShop: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 90, height: 90, borderRadius: 24,
        background: isDark ? '#2D1820' : '#FFF0F2',
        border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 24,
      }}>
        <ShoppingBag size={36} />
      </div>
      <h2 style={{
        margin: '0 0 10px',
        fontSize: 22, fontWeight: 700,
        color: theme.textPrimary,
        fontFamily: '"Playfair Display", serif',
        letterSpacing: -0.5,
      }}>
        Your cart is empty
      </h2>
      <p style={{
        margin: '0 0 28px',
        fontSize: 13,
        color: theme.textSecondary,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        lineHeight: 1.65,
        maxWidth: 300,
      }}>
        Browse our collection and add items that match your mood.
      </p>
      <button
        onClick={onShop}
        style={{
          padding: '13px 28px',
          borderRadius: 14, border: 'none',
          background: theme.primary, color: '#fff',
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 6px 20px ${theme.primary}44`,
        }}
      >
        Start Shopping <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CartWeb() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark, toggleDark } = useTheme();
  const { cartItems, cartCount, cartTotal, loading, removeFromCart, updateQuantity } = useCart();
  const [coupon, setCoupon] = useState('');

  const bg    = theme.background;
  const card  = theme.card;
  const bord  = theme.border;
  const pri   = theme.primary;
  const tp    = theme.textPrimary;
  const ts    = theme.textSecondary;
  const tint  = theme.tint;
  const inact = theme.inactive;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          height: auto !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          position: static !important;
          font-family: "Plus Jakarta Sans", sans-serif;
          -webkit-overflow-scrolling: touch;
        }

        body { background: ${bg}; }

        body > div, #root > div {
          min-height: 100vh;
          overflow: visible !important;
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        /* ── APP ── */
        .cart-app {
          min-height: 100vh;
          background: ${bg};
          color: ${tp};
          overflow-x: hidden;
          overflow-y: visible;
          position: relative;
        }

        /* ── TOP NAV ── */
        .cart-topnav {
          height: 56px;
          background: ${card};
          border-bottom: 1px solid ${bord};
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 40px;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .cart-back {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px solid ${bord};
          border-radius: 9px;
          padding: 6px 13px;
          font-size: 13px;
          font-weight: 600;
          color: ${ts};
          cursor: pointer;
          font-family: "Plus Jakarta Sans", sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .cart-back:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }

        .cart-logo {
          font-family: "Playfair Display", serif;
          font-size: 17px;
          font-weight: 700;
          color: ${tp};
          letter-spacing: -0.3px;
          margin-right: auto;
          white-space: nowrap;
        }
        .cart-logo span { color: ${pri}; }

        /* ── BODY GRID ── */
        .cart-body {
          max-width: 1180px;
          width: 100%;
          margin: 0 auto;
          padding: 36px 40px 80px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 28px;
          align-items: start;
          overflow: visible;
        }

        .cart-summary-col {
          position: sticky;
          top: 76px;
          align-self: start;
          overflow: visible;
        }

        .cart-page-title { margin-bottom: 22px; }

        .cart-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 3px;
          color: ${pri};
          margin-bottom: 3px;
          font-family: "Plus Jakarta Sans", sans-serif;
          text-transform: uppercase;
        }

        .cart-h1 {
          font-size: 30px;
          font-weight: 700;
          color: ${tp};
          font-family: "Playfair Display", serif;
          letter-spacing: -0.8px;
          line-height: 1.1;
        }

        /* ── BOTTOM STICKY BAR (mobile checkout) ── */
        .cart-sticky-checkout {
          display: none;
        }

        /* ─────────────────────────────────────────
           RESPONSIVE BREAKPOINTS
           ───────────────────────────────────────── */

        /* Laptop / medium desktop: 961px – 1280px */
        @media (min-width: 961px) and (max-width: 1280px) {
          .cart-body {
            grid-template-columns: 1fr 320px;
            padding: 28px 28px 60px;
            gap: 22px;
          }
        }

        /* Tablet landscape + small laptop: 769px – 960px */
        @media (min-width: 769px) and (max-width: 960px) {
          .cart-topnav { padding: 0 28px; }
          .cart-body {
            grid-template-columns: 1fr 300px;
            padding: 24px 28px 60px;
            gap: 18px;
          }
          .cart-h1 { font-size: 26px; }
        }

        /* Tablet portrait: 600px – 768px */
        @media (min-width: 600px) and (max-width: 768px) {
          .cart-topnav { padding: 0 20px; height: 52px; }
          .cart-body {
            grid-template-columns: 1fr;
            padding: 20px 20px 100px;
            gap: 16px;
          }
          .cart-summary-col { position: static; }
          .cart-h1 { font-size: 24px; }
          /* Show floating checkout bar on tablet portrait */
          .cart-sticky-checkout {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: ${card};
            border-top: 1px solid ${bord};
            padding: 12px 20px;
            gap: 12px;
            align-items: center;
            z-index: 90;
            backdrop-filter: blur(12px);
          }
        }

        /* Mobile large: 480px – 599px */
        @media (min-width: 480px) and (max-width: 599px) {
          .cart-topnav { padding: 0 16px; height: 50px; }
          .cart-body {
            grid-template-columns: 1fr;
            padding: 16px 16px 90px;
            gap: 14px;
          }
          .cart-summary-col { position: static; }
          .cart-h1 { font-size: 22px; }
          .cart-back span { display: none; } /* hide "Back" text, keep arrow */
          .cart-sticky-checkout {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: ${card};
            border-top: 1px solid ${bord};
            padding: 10px 16px;
            gap: 10px;
            align-items: center;
            z-index: 90;
            backdrop-filter: blur(12px);
          }
        }

        /* Mobile small: 320px – 479px */
        @media (max-width: 479px) {
          .cart-topnav {
            padding: 0 14px;
            height: 50px;
            gap: 10px;
          }
          .cart-body {
            grid-template-columns: 1fr;
            padding: 14px 14px 90px;
            gap: 12px;
          }
          .cart-summary-col { position: static; }
          .cart-h1 { font-size: 20px; }
          .cart-eyebrow { display: none; }
          .cart-back span { display: none; }
          /* On very small screens, hide the full summary panel — use sticky bar */
          .cart-summary-col { display: none; }
          .cart-sticky-checkout {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: ${card};
            border-top: 1px solid ${bord};
            padding: 10px 14px;
            gap: 10px;
            align-items: center;
            z-index: 90;
            backdrop-filter: blur(12px);
          }
          /* Show a mini total in the sticky bar label */
          .cart-sticky-total-label { display: block !important; }
        }

        /* Touch: remove hover-only effects on touch devices */
        @media (hover: none) {
          .cart-back:hover {
            border-color: ${bord};
            color: ${ts};
            background: none;
          }
        }

        /* Print */
        @media print {
          .cart-topnav, .cart-sticky-checkout { display: none; }
          .cart-body { grid-template-columns: 1fr; padding: 0; }
          .cart-summary-col { position: static; }
        }
      `}</style>

      <div className="cart-app">

        {/* ── TOP NAV ── */}
        <nav className="cart-topnav">
          <button className="cart-back" onClick={() => router.back()}>
            <ArrowLeft size={14} /> <span>Back</span>
          </button>
          <span className="cart-logo">Mood<span>Market</span></span>
          <button
            style={{
              background: 'none', border: `1px solid ${bord}`,
              borderRadius: 9, width: 34, height: 34,
              cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onClick={toggleDark}
            title="Toggle theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </nav>

        {/* ── CONTENT ── */}
        {!user ? (
          <div style={{
            maxWidth: 420, margin: '0 auto', textAlign: 'center',
            padding: '64px 24px',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 22, margin: '0 auto 22px',
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34,
            }}><User size={34} /></div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: tp, fontFamily: '"Playfair Display", serif', marginBottom: 10 }}>
              Sign in first
            </h2>
            <p style={{ fontSize: 13, color: ts, lineHeight: 1.65, marginBottom: 24, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Log in to view your cart and check out.
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '13px 28px', borderRadius: 14,
                border: 'none', background: pri, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                boxShadow: `0 6px 20px ${pri}44`,
              }}
            >
              Sign In <ArrowRight size={14} />
            </button>
          </div>
        ) : loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 260, color: inact, fontSize: 14,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            Loading cart…
          </div>
        ) : cartItems.length === 0 ? (
          <CartEmpty theme={theme} isDark={isDark} onShop={() => router.push('/(tabs)')} />
        ) : (
          <>
            <div className="cart-body">

              {/* ── LEFT: items ── */}
              <div>
                <div className="cart-page-title">
                  <p className="cart-eyebrow">YOUR ORDER</p>
                  <h1 className="cart-h1">My Cart</h1>
                </div>

                <DeliveryProgress subtotal={cartTotal} theme={theme} isDark={isDark} />

                <div style={{ marginTop: 10 }}>
                  {cartItems.map((item, index) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      onQtyChange={updateQuantity}
                      onRemove={removeFromCart}
                      theme={theme}
                      isDark={isDark}
                    />
                  ))}
                </div>

                <button
                  onClick={() => router.push('/(tabs)')}
                  style={{
                    marginTop: 14,
                    background: 'none',
                    border: 'none',
                    color: pri,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 0',
                    opacity: 0.85,
                    transition: 'opacity 0.13s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
                >
                  <ArrowLeft size={12} /> Continue Shopping
                </button>

                {/* Inline summary shown on mobile/tablet instead of side panel */}
                <div className="cart-summary-col" style={{ marginTop: 20 }}>
                  <OrderSummary
                    subtotal={cartTotal}
                    coupon={coupon}
                    setCoupon={setCoupon}
                    onCheckout={() => router.push('/checkout')}
                    theme={theme}
                    isDark={isDark}
                    cartCount={cartCount}
                  />
                </div>
              </div>

              {/* ── RIGHT: summary (desktop/laptop) ── */}
              <div className="cart-summary-col">
                <OrderSummary
                  subtotal={cartTotal}
                  coupon={coupon}
                  setCoupon={setCoupon}
                  onCheckout={() => router.push('/checkout')}
                  theme={theme}
                  isDark={isDark}
                  cartCount={cartCount}
                />
              </div>
            </div>

            {/* ── STICKY CHECKOUT BAR (small screens) ── */}
            <div className="cart-sticky-checkout">
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, color: inact, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}>
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: pri, fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: -0.5 }}>
                  GH₵ {(cartTotal + (cartTotal >= 200 ? 0 : 15)).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => router.push('/checkout')}
                style={{
                  padding: '12px 22px',
                  borderRadius: 12, border: 'none',
                  background: pri, color: '#fff',
                  fontSize: 13, fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: `0 6px 20px ${pri}44`,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Zap size={14} /> Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}