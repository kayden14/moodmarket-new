import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme, MoodKey, MOOD_PALETTES } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { 
  Search, Sun, Moon, Bell, ShoppingCart, User, 
  Menu, X, ChevronRight, ArrowRight, RefreshCw, Ban,
  LayoutGrid, Sparkles, Coffee, BookOpen, Gem, Flower2
} from 'lucide-react';
import { supabase } from '@/services/supabase';
import { NotificationService } from '@/services/notifications';
import { useMoodDetection } from '@/hooks/useMoodDetection';

/* ── helpers ───────────────────────────────────────────────────────────── */

function HiddenCamera({ cameraRef, onCameraReady }: { cameraRef: any; onCameraReady: () => void }) {
  if (Platform.OS === 'web') return null; 
  try {
    const { CameraView } = require('expo-camera');
    return (
      <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
        <CameraView
          ref={cameraRef}
          facing="front"
          onCameraReady={onCameraReady}
          style={{ flex: 1 }}
        />
      </View>
    );
  } catch {
    return null;
  }
}

function WebEmoji({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, emoji', ...style }}>
      {children}
    </span>
  );
}

function CategoryIcon({ id, size = 13, color = 'currentColor' }: { id: string; size?: number; color?: string }) {
  switch (id) {
    case 'all': return <LayoutGrid size={size} color={color} />;
    case 'self-care': return <Sparkles size={size} color={color} />;
    case 'food': return <Coffee size={size} color={color} />;
    case 'books': return <BookOpen size={size} color={color} />;
    case 'accessories': return <Gem size={size} color={color} />;
    case 'relaxation': return <Flower2 size={size} color={color} />;
    default: return null;
  }
}

const MOODS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: 'happy',   emoji: '😊', label: 'Happy'   },
  { key: 'calm',    emoji: '😌', label: 'Calm'     },
  { key: 'excited', emoji: '🤩', label: 'Excited'  },
  { key: 'sad',     emoji: '😢', label: 'Sad'      },
  { key: 'angry',   emoji: '😠', label: 'Angry'    },
  { key: 'tired',   emoji: '😴', label: 'Tired'    },
  { key: 'anxious', emoji: '😰', label: 'Anxious'  },
  { key: 'neutral', emoji: '😐', label: 'Neutral'  },
];

const CATEGORIES = [
  { id: 'all',         label: 'All Products',  emoji: '' },
  { id: 'self-care',   label: 'Self Care',      emoji: '' },
  { id: 'food',        label: 'Food & Drink',   emoji: '' },
  { id: 'books',       label: 'Books',          emoji: '' },
  { id: 'accessories', label: 'Accessories',    emoji: '' },
  { id: 'relaxation',  label: 'Relaxation',     emoji: '' },
];

interface WebShellProps {
  children: React.ReactNode;
  activeNav?: string;
  title?: string;
  showSidebar?: boolean;
}

export default function WebShell({
  children,
  activeNav,
  title,
  showSidebar = true,
}: WebShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, mood, setMood, moodPalette, isDark, toggleDark } = useTheme();
  const { user, profile } = useAuth();
  const { cartCount } = useCart();
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useStorefront();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const handleMoodDetected = useCallback((detectedMood: MoodKey) => {
    setMood(detectedMood);
    const meta = MOODS.find(m => m.key === detectedMood);
    if (profile?.id && meta) {
      NotificationService.moodSelected(profile.id, meta.label, meta.emoji);
    }
  }, [setMood, profile?.id]);

  const { detecting, permissionDenied, rescan, cameraRef, onCameraReady, hasPermission } = useMoodDetection({ onMoodDetected: handleMoodDetected });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const update = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setSidebarOpen(false);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const channel = supabase
      .channel('notifications-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const selectedMood = MOODS.find(m => m.key === mood) ?? MOODS[7];
  const firstName = profile?.name?.split(' ')[0] ?? null;
  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const bg = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const pri = theme.primary;
  const tp = theme.textPrimary;
  const ts = theme.textSecondary;
  const tint = theme.tint;
  const inact = theme.inactive;

  const sidebarWidth = 240;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { background: ${bg}; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        .mm-app {
          height: 100vh;
          background: ${bg};
          font-family: "Sora", sans-serif;
          color: ${tp};
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mm-topnav {
          position: sticky; top: 0; z-index: 300;
          height: 60px;
          background: ${card};
          border-bottom: 1px solid ${bord};
          display: flex; align-items: center;
          padding: 0 24px; gap: 12px;
          flex-shrink: 0;
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
        }

        .mm-logo {
          display: flex; align-items: center; gap: 9px;
          flex-shrink: 0; text-decoration: none; cursor: pointer;
        }
        .mm-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: ${pri};
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex-shrink: 0;
        }
        .mm-logo-text {
          font-family: "Lora", serif; font-size: 19px;
          font-weight: 600; color: ${tp}; letter-spacing: -0.4px;
        }
        .mm-logo-text em { font-style: italic; color: ${pri}; }

        .mm-topnav-search {
          flex: 1; max-width: 480px; position: relative;
        }
        .mm-topnav-search input {
          width: 100%; height: 38px;
          background: ${bg}; border: 1px solid ${bord};
          border-radius: 9px; padding: 0 14px 0 38px;
          font-size: 13.5px; font-family: "Sora", sans-serif;
          color: ${tp}; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .mm-topnav-search input:focus {
          border-color: ${pri}; box-shadow: 0 0 0 3px ${pri}18;
        }
        .mm-topnav-search input::placeholder { color: ${ts}; }

        .mm-mobile-search {
          background: ${card};
          border-bottom: 1px solid ${bord};
          padding: 8px 14px;
          z-index: 299;
          flex-shrink: 0;
          position: relative;
        }
        .mm-mobile-search input {
          width: 100%; height: 40px;
          background: ${bg}; border: 1px solid ${bord};
          border-radius: 9px; padding: 0 14px 0 38px;
          font-size: 14px; font-family: "Sora", sans-serif;
          color: ${tp}; outline: none;
        }

        .mm-topnav-actions {
          display: flex; align-items: center;
          gap: 8px; margin-left: auto; flex-shrink: 0;
        }

        .mm-icon-btn {
          height: 38px; min-width: 38px;
          border-radius: 9px;
          background: transparent; border: 1px solid ${bord};
          color: ${ts}; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 6px; font-size: 13px; font-weight: 500;
          font-family: "Sora", sans-serif;
          transition: all 0.15s; white-space: nowrap;
          padding: 0 12px; position: relative;
          flex-shrink: 0;
        }
        .mm-icon-btn:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }

        .mm-search-toggle { display: none; }

        .mm-cart-badge {
          position: absolute; top: -5px; right: -5px;
          background: ${pri}; color: #fff;
          width: 18px; height: 18px; border-radius: 50%;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid ${card};
        }
        .mm-notif-badge {
          position: absolute; top: -5px; right: -5px;
          background: #EF4444; color: #fff;
          min-width: 18px; height: 18px; border-radius: 9px;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid ${card}; padding: 0 3px;
        }
        .mm-spinner {
          width: 16px; height: 16px;
          border: 2px solid ${moodPalette.secondary};
          border-top-color: ${moodPalette.primary};
          border-radius: 50%;
          animation: mm-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes mm-spin { to { transform: rotate(360deg); } }
        
        .mm-avatar {
          width: 36px; height: 36px;
          background: ${pri}; color: #fff;
          font-size: 12px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; border-radius: 50%;
          border: 1px solid ${bord}; flex-shrink: 0;
        }

        .mm-burger { flex-direction: column; gap: 4px; padding: 0 10px; min-width: 42px; border: none; }
        .mm-burger span {
          display: block; height: 1.5px;
          border-radius: 2px; background: ${ts};
          transition: all 0.2s; width: 18px;
        }

        .mm-desktop-only { display: flex; }
        .mm-mobile-only  { display: none; }

        .mm-more-menu-wrap { position: relative; }
        .mm-more-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 240px; background: ${card}; border: 1px solid ${bord};
          border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.22);
          z-index: 500; overflow: hidden;
          transform-origin: top right;
          animation: mm-dropdown-in 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        @keyframes mm-dropdown-in {
          from { opacity: 0; transform: scale(0.90) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }

        .mm-more-header { padding: 16px 16px 12px; display: flex; align-items: center; gap: 12px; }
        .mm-more-header-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: ${pri}; color: #fff; font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .mm-more-header-name { font-size: 13.5px; font-weight: 600; color: ${tp}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mm-more-header-email { font-size: 11px; color: ${ts}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .mm-more-divider { height: 1px; background: ${bord}; margin: 2px 0; }
        .mm-more-item {
          display: flex; align-items: center; gap: 11px; width: 100%;
          padding: 12px 16px; background: transparent; border: none;
          cursor: pointer; font-family: "Sora", sans-serif; font-size: 13.5px;
          font-weight: 500; color: ${tp}; text-align: left;
        }
        .mm-more-item:hover { background: ${bg}; }

        .mm-toggle-pill {
          margin-left: auto; width: 40px; height: 22px; border-radius: 11px;
          cursor: pointer; position: relative; background: ${pri};
        }
        .mm-toggle-pill-knob {
          position: absolute; top: 3px; width: 16px; height: 16px;
          border-radius: 50%; background: #fff; transition: left 0.2s;
        }

        .mm-body { display: flex; flex: 1; min-height: 0; overflow: hidden; position: relative; }

        .mm-overlay {
          display: none; position: fixed; inset: 0; z-index: 400;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
        }

        .mm-sidebar {
          background: ${card}; border-right: 1px solid ${bord};
          overflow-y: auto; overflow-x: hidden; z-index: 401; flex-shrink: 0;
        }
        .mm-sidebar-inner { width: ${sidebarWidth}px; padding: 20px 0 80px; }

        @media (min-width: 900px) {
          .mm-sidebar { transition: width 0.25s ease; height: 100%; position: sticky; top: 0; }
        }

        @media (max-width: 899px) {
          .mm-sidebar {
            position: fixed; top: 0; left: 0; width: ${sidebarWidth}px !important;
            height: 100vh; transform: translateX(-100%); transition: transform 0.26s;
          }
          .mm-sidebar.open { transform: translateX(0); }
          .mm-overlay.open { display: block; }
        }

        .mm-sidebar-section { padding: 0 14px 20px; }
        .mm-sidebar-label {
          font-size: 10px; font-weight: 600; letter-spacing: 1.4px;
          text-transform: uppercase; color: ${inact}; padding: 0 8px;
          margin-bottom: 6px; display: block;
        }

        .mm-mood-item {
          display: flex; align-items: center; gap: 9px; padding: 9px 10px;
          border-radius: 8px; width: 100%; background: transparent;
          border: 1px solid transparent; cursor: pointer; transition: all 0.13s;
          text-align: left; min-height: 44px; font-family: "Sora", sans-serif;
        }
        .mm-mood-item:hover { background: ${bg}; border-color: ${bord}; }
        .mm-mood-item.active { background: ${tint}; border-color: ${theme.secondary}; }
        .mm-mood-emoji { font-size: 16px; width: 22px; text-align: center; }
        .mm-mood-label { font-size: 13px; font-weight: 500; color: ${ts}; }
        .mm-mood-item.active .mm-mood-label { color: ${pri}; font-weight: 600; }

        .mm-cat-item {
          display: flex; align-items: center; gap: 9px; padding: 8px 10px;
          border-radius: 7px; width: 100%; background: transparent;
          border: 1px solid transparent; cursor: pointer; transition: all 0.13s;
          text-align: left; min-height: 40px; font-family: "Sora", sans-serif;
        }
        .mm-cat-item:hover { background: ${bg}; }
        .mm-cat-item.active { background: ${tint}; }
        .mm-cat-label { font-size: 12.5px; font-weight: 500; color: ${ts}; }
        .mm-cat-item.active .mm-cat-label { color: ${pri}; font-weight: 600; }

        .mm-main { flex: 1; min-width: 0; overflow-y: auto; height: 100%; }
        .mm-main-inner { padding: 24px 24px 60px; width: 100%; max-width: 1600px; margin: 0 auto; }

        @media (max-width: 700px) {
          .mm-topnav-search { display: none; }
          .mm-search-toggle { display: flex; }
          .mm-desktop-only { display: none !important; }
          .mm-mobile-only  { display: flex; }
          .mm-btn-label { display: none; }
        }
      `}</style>

      <div className="mm-app">
        {hasPermission === true && <HiddenCamera cameraRef={cameraRef} onCameraReady={onCameraReady} />}
        
        <nav className="mm-topnav">
          {showSidebar && (
            <button className="mm-icon-btn mm-burger" onClick={() => setSidebarOpen(v => !v)}>
              <span style={{ width: sidebarOpen ? 14 : 18 }} />
              <span style={{ width: 18 }} />
              <span style={{ width: sidebarOpen ? 18 : 14 }} />
            </button>
          )}

          <div className="mm-logo" onClick={() => router.push('/')}>
            <div className="mm-logo-icon"><WebEmoji style={{ fontSize: 17 }}>{selectedMood.emoji}</WebEmoji></div>
            <span className="mm-logo-text">Mood<em>Market</em></span>
          </div>

          <div className="mm-topnav-search">
            <Search size={14} color={ts} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="mm-topnav-actions">
            <button className="mm-icon-btn mm-search-toggle" onClick={() => setShowMobileSearch(v => !v)}>
              <Search size={14} color={ts} />
            </button>

            <button className="mm-icon-btn mm-desktop-only" onClick={rescan} disabled={detecting}>
              {detecting ? <div className="mm-spinner" /> : (permissionDenied ? <Ban size={14} /> : <RefreshCw size={14} />)}
              <span className="mm-btn-label">{detecting ? 'Detecting…' : 'Re-scan'}</span>
            </button>

            <button className="mm-icon-btn mm-desktop-only" onClick={toggleDark}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="mm-icon-btn mm-desktop-only" onClick={() => router.push('/notifications')}>
              <Bell size={16} />
              {unreadCount > 0 && <span className="mm-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            <button className="mm-icon-btn" onClick={() => router.push('/(tabs)/cart')}>
              <ShoppingCart size={14} /> <span className="mm-btn-label">Cart</span>
              {cartCount > 0 && <span className="mm-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>}
            </button>

            <button className="mm-avatar mm-desktop-only" onClick={() => router.push('/profile')}>
              {initials}
            </button>

            <div className="mm-more-menu-wrap mm-mobile-only" ref={moreMenuRef}>
              <button className="mm-avatar" onClick={() => setMoreMenuOpen(v => !v)}>
                {initials}
              </button>

              {moreMenuOpen && (
                <div className="mm-more-dropdown">
                  <div className="mm-more-header">
                    <div className="mm-more-header-avatar">{initials}</div>
                    <div className="mm-more-header-info">
                      <div className="mm-more-header-name">{profile?.name ?? 'Account'}</div>
                      <div className="mm-more-header-email">{user?.email ?? ''}</div>
                    </div>
                  </div>
                  <div className="mm-more-divider" />
                  <button className="mm-more-item" onClick={() => { router.push('/profile'); setMoreMenuOpen(false); }}>
                    <User size={18} style={{ marginRight: 11 }} /> Profile
                  </button>
                  <button className="mm-more-item" onClick={() => { router.push('/notifications'); setMoreMenuOpen(false); }}>
                    <Bell size={18} style={{ marginRight: 11 }} /> Notifications
                    {unreadCount > 0 && <span className="mm-more-badge">{unreadCount}</span>}
                  </button>
                  <button className="mm-more-item" onClick={() => { toggleDark(); setMoreMenuOpen(false); }}>
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    <span style={{ marginLeft: 11 }}>{isDark ? 'Light mode' : 'Dark mode'}</span>
                    <div className="mm-toggle-pill" style={{ background: isDark ? pri : bord }}>
                      <div className="mm-toggle-pill-knob" style={{ left: isDark ? '21px' : '3px' }} />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {showMobileSearch && (
          <div className="mm-mobile-search">
            <Search size={14} color={ts} style={{ position: 'absolute', left: 25, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
        )}

        <div className="mm-body">
          <div className={`mm-overlay${sidebarOpen && !isDesktop ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

          {showSidebar && (
            <aside className={`mm-sidebar${sidebarOpen ? ' open' : ''}`} style={isDesktop ? { width: sidebarOpen ? sidebarWidth : 0 } : {}}>
              <div className="mm-sidebar-inner">
                <div style={{ padding: '4px 22px 18px' }}>
                  <p style={{ fontSize: 11, color: ts }}>{greeting}</p>
                  <p style={{ fontFamily: '"Lora", serif', fontSize: 22, fontWeight: 700, color: tp, marginTop: 2 }}>
                    {firstName ?? 'Welcome'}
                  </p>
                </div>

                <div className="mm-sidebar-section">
                  <span className="mm-sidebar-label">Mood Detection</span>
                  <div style={{ padding: 10, background: bg, border: `1px solid ${bord}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: moodPalette.tint, border: `1px solid ${moodPalette.secondary}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {detecting ? <div className="mm-spinner" /> : <WebEmoji style={{ fontSize: 18 }}>{selectedMood.emoji}</WebEmoji>}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{detecting ? 'Detecting…' : selectedMood.label}</p>
                      <p style={{ fontSize: 10, color: inact }}>Auto-detected</p>
                    </div>
                  </div>
                </div>

                <div className="mm-sidebar-section">
                  <span className="mm-sidebar-label">How are you feeling?</span>
                  {MOODS.map(m => {
                    const active = mood === m.key;
                    const palette = MOOD_PALETTES[m.key];
                    return (
                      <button key={m.key} className={`mm-mood-item${active ? ' active' : ''}`} onClick={() => setMood(m.key)} style={active ? { background: palette.tint, borderColor: palette.secondary } : {}}>
                        <span className="mm-mood-emoji"><WebEmoji>{m.emoji}</WebEmoji></span>
                        <span className="mm-mood-label" style={active ? { color: palette.primary } : {}}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mm-sidebar-section">
                  <span className="mm-sidebar-label">Categories</span>
                  {CATEGORIES.map(cat => {
                    const active = selectedCategory === cat.id;
                    return (
                      <button key={cat.id} className={`mm-cat-item${active ? ' active' : ''}`} onClick={() => setSelectedCategory(cat.id)}>
                        <CategoryIcon id={cat.id} size={13} color={active ? pri : ts} />
                        <span className="mm-cat-label" style={active ? { color: pri, fontWeight: 600 } : {}}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}

          <main className="mm-main">
            <div className="mm-main-inner">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
