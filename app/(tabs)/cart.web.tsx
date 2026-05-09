/**
 * app/cart.web.tsx — MoodMarket Cart (Web)
 *
 * Full web version of the cart screen.
 * - Two-column layout: items list left, order summary sticky right
 * - Matches MoodMarket design: Sora + Lora, theme context, CSS-in-JS
 * - Quantity stepper, line totals, remove items
 * - Delivery progress bar, coupon field, Paystack checkout CTA
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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
        fontFamily: '"Sora", sans-serif',
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 20px',
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
        position: 'absolute', top: 10, left: 12,
        fontSize: 9, fontWeight: 800, letterSpacing: 1,
        color: theme.inactive,
        fontFamily: '"Sora", sans-serif',
      }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Image */}
      <div style={{
        width: 80, height: 80,
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
          margin: '0 0 4px',
          fontSize: 14, fontWeight: 700,
          color: theme.textPrimary,
          fontFamily: '"Lora", serif',
          letterSpacing: -0.2,
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.products.name}
        </p>
        <p style={{
          margin: '0 0 12px',
          fontSize: 12, color: theme.textSecondary,
          fontFamily: '"Sora", sans-serif',
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
        alignItems: 'flex-end', gap: 10, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 17, fontWeight: 800,
          color: theme.primary,
          fontFamily: '"Sora", sans-serif',
          letterSpacing: -0.4,
        }}>
          GH₵ {lineTotal}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            border: `1px solid ${isDark ? '#4D2525' : '#FFD6D6'}`,
            background: isDark ? '#2D1515' : '#FFF5F5',
            color: '#EF4444',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
            transition: 'all 0.13s',
          }}
          title="Remove item"
        >
          🗑
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
      padding: '14px 18px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30,
          borderRadius: 8,
          background: isFree
            ? (isDark ? '#0D2B1A' : '#E8F8F2')
            : (isDark ? '#2D1820' : '#FFF0F2'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>
          🚚
        </div>
        <p style={{
          margin: 0, flex: 1,
          fontSize: 13, fontWeight: 600,
          color: isFree ? '#22C55E' : theme.textSecondary,
          fontFamily: '"Sora", sans-serif',
        }}>
          {isFree
            ? '🎉 Free delivery unlocked!'
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
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{
            margin: '0 0 2px',
            fontSize: 10, fontWeight: 800,
            letterSpacing: 2,
            color: theme.primary,
            fontFamily: '"Sora", sans-serif',
            textTransform: 'uppercase',
          }}>
            ORDER SUMMARY
          </p>
          <h3 style={{
            margin: 0,
            fontSize: 18, fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: '"Lora", serif',
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
          padding: '6px 12px',
        }}>
          <span style={{ fontSize: 14 }}>🛒</span>
          <span style={{
            fontSize: 14, fontWeight: 800,
            color: theme.textPrimary,
            fontFamily: '"Sora", sans-serif',
          }}>
            {cartCount}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div style={{ padding: '20px 24px' }}>
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
            alignItems: 'center', marginBottom: 12,
          }}>
            <span style={{
              fontSize: 13, color: theme.textSecondary,
              fontFamily: '"Sora", sans-serif',
            }}>
              {row.label}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: row.color,
              fontFamily: '"Sora", sans-serif',
            }}>
              {row.value}
            </span>
          </div>
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: theme.border, margin: '16px 0' }} />

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 20,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: '"Sora", sans-serif',
          }}>
            Total
          </span>
          <span style={{
            fontSize: 30, fontWeight: 900,
            color: theme.primary,
            fontFamily: '"Sora", sans-serif',
            letterSpacing: -1,
          }}>
            GH₵ {total.toFixed(2)}
          </span>
        </div>

        {/* Coupon */}
        {!couponApplied && (
          <div style={{
            display: 'flex', gap: 8, marginBottom: 20,
          }}>
            <input
              value={couponInput}
              onChange={e => setCouponInput(e.target.value)}
              onFocus={() => setCouponFocused(true)}
              onBlur={() => setCouponFocused(false)}
              placeholder="Coupon code…"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: `1.5px solid ${couponFocused ? theme.primary : theme.border}`,
                background: theme.background,
                color: theme.textPrimary,
                fontSize: 13,
                fontFamily: '"Sora", sans-serif',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={handleApplyCoupon}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: `1.5px solid ${theme.primary}`,
                background: 'none',
                color: theme.primary,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"Sora", sans-serif',
                whiteSpace: 'nowrap',
                transition: 'all 0.13s',
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
            borderRadius: 10, padding: '10px 14px',
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>✅</span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#22C55E',
              fontFamily: '"Sora", sans-serif', flex: 1,
            }}>
              10% discount applied!
            </span>
            <button
              onClick={() => { setCouponApplied(false); setCouponInput(''); }}
              style={{
                background: 'none', border: 'none',
                color: '#22C55E', cursor: 'pointer',
                fontSize: 13, fontFamily: '"Sora", sans-serif',
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
            width: '100%', padding: '16px 0',
            borderRadius: 14, border: 'none',
            background: theme.primary,
            color: '#fff',
            fontSize: 15, fontWeight: 800,
            cursor: 'pointer',
            fontFamily: '"Sora", sans-serif',
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
          <span style={{ fontSize: 17 }}>⚡</span>
          Checkout Now
          <div style={{
            width: 30, height: 30,
            borderRadius: 8,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, color: theme.primary, fontWeight: 900 }}>→</span>
          </div>
        </button>

        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 12,
        }}>
          <span style={{ fontSize: 11 }}>🔒</span>
          <span style={{
            fontSize: 11, color: theme.inactive,
            fontFamily: '"Sora", sans-serif',
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
      padding: '80px 40px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 100, height: 100, borderRadius: 28,
        background: isDark ? '#2D1820' : '#FFF0F2',
        border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40, marginBottom: 28,
      }}>
        🛍️
      </div>
      <h2 style={{
        margin: '0 0 10px',
        fontSize: 24, fontWeight: 700,
        color: theme.textPrimary,
        fontFamily: '"Lora", serif',
        letterSpacing: -0.5,
      }}>
        Your cart is empty
      </h2>
      <p style={{
        margin: '0 0 32px',
        fontSize: 14,
        color: theme.textSecondary,
        fontFamily: '"Sora", sans-serif',
        lineHeight: 1.65,
        maxWidth: 320,
      }}>
        Browse our collection and add items that match your mood.
      </p>
      <button
        onClick={onShop}
        style={{
          padding: '14px 32px',
          borderRadius: 14, border: 'none',
          background: theme.primary, color: '#fff',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer',
          fontFamily: '"Sora", sans-serif',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 6px 20px ${theme.primary}44`,
        }}
      >
        Start Shopping →
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

  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const pri  = theme.primary;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;
  const inact = theme.inactive;

  return (
    <>
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

          *,
          *::before,
          *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          /* ───────────────── GLOBAL SCROLL FIX ───────────────── */

          html,
          body,
          #root {
            width: 100%;
            min-height: 100%;
            height: auto !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            position: static !important;
            font-family: "Sora", sans-serif;
            -webkit-overflow-scrolling: touch;
          }

          body {
            background: ${bg};
          }

          /* Expo Router / RN Web wrappers */
          body > div,
          #root > div {
            min-height: 100vh;
            overflow: visible !important;
          }

          ::-webkit-scrollbar {
            width: 5px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: ${bord};
            border-radius: 10px;
          }

          /* ───────────────── APP ───────────────── */

          .cart-app {
            min-height: 100vh;
            background: ${bg};
            color: ${tp};

            /* IMPORTANT */
            overflow-x: hidden;
            overflow-y: visible;
            position: relative;
          }

          /* ───────────────── TOP NAV ───────────────── */

          .cart-topnav {
            height: 58px;
            background: ${card};
            border-bottom: 1px solid ${bord};

            display: flex;
            align-items: center;
            gap: 16px;

            padding: 0 40px;

            position: sticky;
            top: 0;
            z-index: 100;

            backdrop-filter: blur(10px);
          }

          .cart-back {
            display: flex;
            align-items: center;
            gap: 7px;

            background: none;
            border: 1px solid ${bord};

            border-radius: 9px;
            padding: 7px 14px;

            font-size: 13px;
            font-weight: 600;
            color: ${ts};

            cursor: pointer;
            font-family: "Sora", sans-serif;

            transition: all 0.15s;
          }

          .cart-back:hover {
            border-color: ${pri};
            color: ${pri};
            background: ${tint};
          }

          .cart-logo {
            font-family: "Lora", serif;
            font-size: 18px;
            font-weight: 700;
            color: ${tp};
            letter-spacing: -0.3px;
            margin-right: auto;
          }

          .cart-logo span {
            color: ${pri};
          }

          /* ───────────────── BODY ───────────────── */

          .cart-body {
            max-width: 1180px;
            width: 100%;

            margin: 0 auto;

            padding: 40px 40px 80px;

            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 32px;

            align-items: start;

            /* IMPORTANT */
            overflow: visible;
          }

          /* Sticky summary works ONLY if parents don't hide overflow */
          .cart-summary-col {
            position: sticky;
            top: 78px;

            align-self: start;

            overflow: visible;
          }

          /* ───────────────── PAGE TITLE ───────────────── */

          .cart-page-title {
            margin-bottom: 28px;
          }

          .cart-eyebrow {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 3px;

            color: ${pri};

            margin-bottom: 4px;

            font-family: "Sora", sans-serif;
            text-transform: uppercase;
          }

          .cart-h1 {
            font-size: 34px;
            font-weight: 700;

            color: ${tp};

            font-family: "Lora", serif;

            letter-spacing: -0.8px;
            line-height: 1.1;
          }

          /* ───────────────── RESPONSIVE ───────────────── */

          @media (max-width: 960px) {
            .cart-body {
              grid-template-columns: 1fr;
              padding: 24px 24px 60px;
            }

            .cart-summary-col {
              position: static;
            }

            .cart-topnav {
              padding: 0 24px;
            }
          }

          @media (max-width: 640px) {
            .cart-body {
              padding: 16px 16px 60px;
              gap: 20px;
            }

            .cart-topnav {
              padding: 0 16px;
            }

            .cart-h1 {
              font-size: 26px;
            }
          }
        `}</style>

      <div className="cart-app">

        {/* ── TOP NAV ── */}
        <nav className="cart-topnav">
          <button className="cart-back" onClick={() => router.back()}>← Back</button>
          <span className="cart-logo">Mood<span>Market</span></span>
          <button
            style={{
              background: 'none', border: `1px solid ${bord}`,
              borderRadius: 9, width: 36, height: 36,
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onClick={toggleDark}
            title="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </nav>

        {/* ── CONTENT ── */}
        {!user ? (
          <div style={{
            maxWidth: 480, margin: '80px auto', textAlign: 'center',
            padding: '0 24px',
          }}>
            <div style={{
              width: 90, height: 90, borderRadius: 24, margin: '0 auto 24px',
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38,
            }}>👤</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: tp, fontFamily: '"Lora", serif', marginBottom: 10 }}>
              Sign in first
            </h2>
            <p style={{ fontSize: 14, color: ts, lineHeight: 1.65, marginBottom: 28, fontFamily: '"Sora", sans-serif' }}>
              Log in to view your cart and check out.
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 32px', borderRadius: 14,
                border: 'none', background: pri, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: '"Sora", sans-serif',
                boxShadow: `0 6px 20px ${pri}44`,
              }}
            >
              Sign In →
            </button>
          </div>
        ) : loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 300, color: inact, fontSize: 14,
            fontFamily: '"Sora", sans-serif',
          }}>
            Loading cart…
          </div>
        ) : cartItems.length === 0 ? (
          <CartEmpty theme={theme} isDark={isDark} onShop={() => router.push('/(tabs)')} />
        ) : (
          <div className="cart-body">

            {/* ── LEFT: items ── */}
            <div>
              <div className="cart-page-title">
                <p className="cart-eyebrow">YOUR ORDER</p>
                <h1 className="cart-h1">My Cart</h1>
              </div>

              <DeliveryProgress subtotal={cartTotal} theme={theme} isDark={isDark} />

              <div style={{ marginTop: 12 }}>
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

              {/* Continue shopping link */}
              <button
                onClick={() => router.push('/(tabs)')}
                style={{
                  marginTop: 16,
                  background: 'none',
                  border: 'none',
                  color: pri,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '"Sora", sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 0',
                  opacity: 0.85,
                  transition: 'opacity 0.13s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
              >
                ← Continue Shopping
              </button>
            </div>

            {/* ── RIGHT: summary ── */}
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
        )}
      </div>
    </>
  );
}