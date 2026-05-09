/**
 * components/WebShell.tsx
 *
 * Responsive web layout shell:
 *   - Desktop / Tablet (≥768px): sticky sidebar with navigation
 *   - Mobile (<768px): top navbar + collapsible drawer
 *
 * Usage:
 *   <WebShell activeNav="profile">
 *     <div>…your page content…</div>
 *   </WebShell>
 */

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  House, ShoppingBag, UserCircle, Search, Menu, X,
} from 'lucide-react';

const NAV = [
  { key: 'home',    label: 'Home',    path: '/(tabs)',      icon: House       },
  { key: 'cart',    label: 'Cart',    path: '/cart',        icon: ShoppingBag },
  { key: 'profile', label: 'Profile', path: '/(tabs)/profile', icon: UserCircle  },
  { key: 'search',  label: 'Search',  path: '/search',      icon: Search      },
];

function WebEmoji({ children, style }: any) {
  return <span style={{ ...style, fontFamily: undefined }}>{children}</span>;
}

export default function WebShell({
  children,
  activeNav,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  activeNav?: string;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, isDark } = useTheme();
  const { user, profile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const active = activeNav ?? NAV.find(n => pathname?.startsWith(n.path))?.key ?? 'home';
  const initials = (profile?.name ?? user?.email ?? '?')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const bg = isDark ? '#0A0A0A' : '#F6F6F6';
  const card = isDark ? '#141414' : '#FFFFFF';
  const bord = isDark ? '#222222' : '#EAEAEA';
  const tp = isDark ? '#F2F2F2' : '#111111';
  const ts = isDark ? '#888888' : '#666666';
  const pri = theme.primary;
  const tint = pri + '12';

  const sidebar = (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        position: 'sticky',
        top: 24,
        height: 'fit-content',
        display: isDesktop ? 'block' : 'none',
      }}
    >
      {/* brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 28,
          paddingLeft: 4,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: pri,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: '"Sora", sans-serif',
          }}
        >
          M
        </div>
        <span
          style={{
            fontFamily: '"Lora", serif',
            fontSize: 18,
            fontWeight: 700,
            color: tp,
            letterSpacing: -0.4,
          }}
        >
          MoodMarket
        </span>
      </div>

      {/* user card */}
      {user && (
        <div
          style={{
            background: card,
            border: `1px solid ${bord}`,
            borderRadius: 18,
            padding: '16px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: tint,
              color: pri,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              fontFamily: '"Sora", sans-serif',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: tp,
                fontFamily: '"Sora", sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {profile?.name ?? 'User'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: ts,
                fontFamily: '"Sora", sans-serif',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.email}
            </div>
          </div>
        </div>
      )}

      {/* nav */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {NAV.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => router.push(item.path as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 14,
                border: 'none',
                background: isActive
                  ? isDark
                    ? '#2D1820'
                    : '#FFF0F2'
                  : 'transparent',
                color: isActive ? pri : ts,
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                fontFamily: '"Sora", sans-serif',
                transition: 'all 0.12s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = isDark ? '#1A1A1A' : '#F5F5F5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
              {item.label}
              {isActive && (
                <span style={{ marginLeft: 'auto', fontSize: 11 }}>›</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        fontFamily: '"Sora", sans-serif',
        color: tp,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* mobile top bar */}
      {!isDesktop && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: card,
            borderBottom: `1px solid ${bord}`,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: tp,
                padding: 4,
              }}
            >
              <Menu size={22} />
            </button>
            <span
              style={{
                fontFamily: '"Lora", serif',
                fontSize: 16,
                fontWeight: 700,
                color: tp,
              }}
            >
              MoodMarket
            </span>
          </div>
          {title && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: ts,
              }}
            >
              {title}
            </span>
          )}
        </div>
      )}

      {/* mobile drawer overlay */}
      {drawerOpen && !isDesktop && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 280,
              maxWidth: '80vw',
              height: '100%',
              background: card,
              borderRight: `1px solid ${bord}`,
              padding: '20px 16px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontFamily: '"Lora", serif',
                  fontSize: 18,
                  fontWeight: 700,
                  color: tp,
                }}
              >
                MoodMarket
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tp,
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      {/* main layout */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          maxWidth: 1400,
          margin: '0 auto',
          width: '100%',
          padding: isDesktop ? '24px 32px 48px' : '0 0 32px',
          gap: 28,
        }}
      >
        {sidebar}

        <main style={{ flex: 1, minWidth: 0 }}>
          {/* page header */}
          {(title || subtitle) && (
            <div style={{ marginBottom: 24 }}>
              {subtitle && (
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 3,
                    color: pri,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {subtitle}
                </p>
              )}
              {title && (
                <h1
                  style={{
                    fontFamily: '"Lora", serif',
                    fontSize: isDesktop ? 32 : 24,
                    fontWeight: 900,
                    color: tp,
                    letterSpacing: -0.8,
                    lineHeight: 1.1,
                    margin: 0,
                  }}
                >
                  {title}
                </h1>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
