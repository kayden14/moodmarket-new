/**
 * app/mood-history.tsx
 *
 * Single file for both platforms:
 *  - Android/iOS  → MoodHistoryScreenMobile
 *  - Web          → MoodHistoryScreenWeb (realtime + full display)
 *
 * FIXES:
 * FIX 1: Entry cards were rendering as empty bars in light mode due to
 *         text/emoji colors collapsing against the card background.
 * FIX 2: Mood label never shows "Unknown" — resolves via item.label →
 *         MOOD_META label → raw moodKey → 'Unknown' as last resort.
 * FIX 3: MOOD_META and MOOD_EMOJI now include ALL lowercase mood_key values
 *         ('happy', 'calm', 'excited', 'sad', 'angry', 'tired', 'anxious',
 *         'neutral') that index.web.tsx saves via saveMoodToHistory().
 * FIX 4: getMoodEmoji now tries:
 *         direct key → lowercase → Title Case → emoji passthrough → fallback.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/services/supabase';
import { MOOD_META, MOOD_EMOJI } from '@/constants/moods';
import { MoodEntry } from '@/types/mood';
import { AIInsightService } from '@/services/aiInsights';
import MoodShareCard from '@/components/MoodShareCard';

function getMoodMeta(moodKey: string, isDark = false) {
  if (!moodKey) {
    return {
      label: 'Unknown',
      color: '#0A7EA4',
      bg: isDark ? '#0C2A38' : '#E0F2FE',
    };
  }

  const normalized = moodKey.trim();
  const lower = normalized.toLowerCase();
  const title =
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1).toLowerCase();

  const resolved =
    MOOD_META[normalized] ||
    MOOD_META[lower] ||
    MOOD_META[title];

  if (!resolved) {
    return {
      label: normalized,
      color: '#0A7EA4',
      bg: isDark ? '#0C2A38' : '#E0F2FE',
    };
  }

  return {
    label: resolved.label,
    color: resolved.color,
    bg: isDark ? resolved.darkBg : resolved.lightBg,
  };
}

function resolveDisplayLabel(entry: MoodEntry, isDark = false): string {
  if (entry.label?.trim()) {
    return entry.label.trim();
  }

  if (entry.mood_key) {
    return getMoodMeta(entry.mood_key, isDark).label;
  }

  if (entry.mood) {
    return getMoodMeta(entry.mood, isDark).label;
  }

  return 'Unknown';
}

function resolveKey(entry: MoodEntry): string {
  return entry.mood_key || entry.mood || entry.label || '';
}

/**
 * Updated emoji resolver
 */
function getMoodEmoji(moodKey: string): string {
  if (!moodKey) return '😶';

  const normalized = moodKey.trim();

  // Exact
  if (MOOD_EMOJI[normalized]) {
    return MOOD_EMOJI[normalized];
  }

  // lowercase
  const lower = normalized.toLowerCase();
  if (MOOD_EMOJI[lower]) {
    return MOOD_EMOJI[lower];
  }

  // Title Case
  const title =
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1).toLowerCase();

  if (MOOD_EMOJI[title]) {
    return MOOD_EMOJI[title];
  }

  // emoji passthrough
  if ([...normalized].length <= 2) {
    return normalized;
  }

  return '😶';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function parseMoodHistory(raw: unknown): MoodEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as MoodEntry[];
  if (typeof raw === 'object') {
    return Object.values(raw as object) as MoodEntry[];
  }
  return [];
}
/* ─────────────────────────────────────────────────────────────────────────
   SHARED DATA HOOK
───────────────────────────────────────────────────────────────────────── */

import { useQuery, useQueryClient } from '@tanstack/react-query';

function useMoodHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: moodHistory = [], isLoading: loading, isRefetching: refreshing, error } = useQuery({
    queryKey: ['mood_history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error: err } = await supabase
        .from('profiles').select('mood_history').eq('id', user.id).single();
      if (err) throw err;
      const parsed = parseMoodHistory(data?.mood_history);
      return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!user?.id,
  });

  const moodCounts = useMemo(() => {
    const c: Record<string, number> = {};
    moodHistory.forEach(e => {
      const key = resolveKey(e) || 'Unknown';
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [moodHistory]);

  const topMood = useMemo(() => {
    const e = Object.entries(moodCounts);
    return e.length ? e.sort((a, b) => b[1] - a[1])[0] : null;
  }, [moodCounts]);

  const streak = useMemo(() => {
    if (!moodHistory.length) return 0;
    const unique = [...new Set(moodHistory.map(e => new Date(e.date).toDateString()))];
    let count = 0;
    for (let i = 0; i < unique.length; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (unique.includes(d.toDateString())) count++; else break;
    }
    return count;
  }, [moodHistory]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['mood_history', user?.id] });

  const { data: insight = '' } = useQuery({
    queryKey: ['mood_insight', user?.id, moodHistory.length],
    queryFn: () => AIInsightService.getMoodTrendInsight(moodHistory),
    enabled: moodHistory.length >= 3,
  });

  return { 
    moodHistory, 
    loading, 
    refreshing, 
    error: error ? 'Could not load history' : null, 
    refresh, 
    moodCounts, 
    topMood, 
    streak,
    insight
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function MoodHistoryScreenWeb() {
  const router            = useRouter();
  const { user }          = useAuth();
  const { theme, isDark } = useTheme();
  const { moodHistory, loading, refreshing, error, refresh, moodCounts, topMood, streak, insight } = useMoodHistory();
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [showShare,  setShowShare]  = useState(false);

  const filteredHistory = useMemo(
    () => filterMood ? moodHistory.filter(e => resolveKey(e) === filterMood) : moodHistory,
    [filterMood, moodHistory],
  );

  // ── Explicit palette — never rely on CSS inheritance for text color ──
  const pri    = theme.primary;
  const bg     = isDark ? '#0B0F1A' : '#F8FAFC';
  const card   = isDark ? '#1A2236' : '#FFFFFF';
  const bord   = isDark ? '#1F2D42' : '#E2E8F0';
  const tp     = isDark ? '#F1F5F9' : '#0F172A';
  const ts     = isDark ? '#94A3B8' : '#475569';
  const inact  = isDark ? '#475569' : '#94A3B8';
  const noteBg = isDark ? '#111827' : '#F1F5F9';

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: ${bg}; }
    @keyframes fade-up  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin     { to   { transform: rotate(360deg); } }
    @keyframes bar-grow { from { width: 0; } }
    @keyframes shimmer  { 0%,100% { opacity:.4; } 50% { opacity:.8; } }

    .entry-card {
      display:flex; align-items:flex-start; gap:16px;
      padding:18px 20px; border-radius:18px;
      border:1.5px solid ${bord}; background:${card};
      animation:fade-up 0.3s ease both;
      transition:transform .15s, box-shadow .15s;
    }
    .entry-card:hover {
      transform:translateY(-2px);
      box-shadow: ${isDark ? '0 8px 28px rgba(0,0,0,.5)' : '0 6px 24px rgba(0,0,0,.07)'};
    }

    .filter-chip {
      display:inline-flex; align-items:center; gap:6px;
      padding:8px 16px; border-radius:999px; border:1.5px solid ${bord};
      background:none; cursor:pointer; font-size:13px; font-weight:700;
      font-family:'Sora',sans-serif; color:${tp};
      transition:all .15s; white-space:nowrap;
    }
    .filter-chip:hover  { border-color:${pri}; color:${pri}; }
    .filter-chip.active { color:#fff; border-color:transparent; }

    .stat-card {
      flex:1; min-width:130px; padding:20px;
      border-radius:18px; border:1.5px solid ${bord}; background:${card};
      transition:transform .15s;
    }
    .stat-card:hover { transform:translateY(-2px); }

    .refresh-btn {
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 20px; border-radius:12px; border:1.5px solid ${bord};
      background:${card}; cursor:pointer; font-size:13px; font-weight:700;
      font-family:'Sora',sans-serif; color:${pri}; transition:all .15s;
    }
    .refresh-btn:hover:not(:disabled) { border-color:${pri}; }
    .refresh-btn:disabled { opacity:.5; cursor:not-allowed; }

    .bar-fill { animation: bar-grow 0.9s ease both; }

    .spinner {
      width:14px; height:14px; display:inline-block;
      border:2px solid ${bord}; border-top-color:${pri};
      border-radius:50%; animation:spin .7s linear infinite;
    }

    @media(max-width:600px){
      .stats-row { flex-direction:column; }
      .stat-card  { min-width:unset; }
    }
  `;

  if (!user) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:40, background:bg, fontFamily:'"Sora",sans-serif' }}>
          <div style={{ fontSize:64 }}>✨</div>
          <h2 style={{ fontFamily:'"Lora",serif', fontSize:28, fontWeight:900, color:tp, textAlign:'center' }}>Sign in to see your mood history</h2>
          <p style={{ color:ts, fontSize:15, textAlign:'center', maxWidth:360, lineHeight:1.65 }}>Track your emotional journey and discover patterns over time.</p>
          <button onClick={() => router.push('/login' as any)} style={{ background:pri, border:'none', borderRadius:14, padding:'14px 36px', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'"Sora",sans-serif', boxShadow:`0 6px 20px ${pri}44` }}>
            Sign In →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ minHeight:'100vh', background:bg, fontFamily:'"Sora",sans-serif', color:tp }}>

        {/* PAGE HEADER */}
        <div style={{ background:card, borderBottom:`1px solid ${bord}`, padding:'28px 0 20px' }}>
          <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, fontSize:13, color:ts }}>
              <button onClick={() => router.push('/(tabs)' as any)} style={{ background:'none', border:'none', cursor:'pointer', color:ts, fontFamily:'"Sora",sans-serif', fontSize:13 }}>Home</button>
              <span style={{ color:inact }}>›</span>
              <span style={{ color:tp, fontWeight:600 }}>Mood History</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:3, color:pri, textTransform:'uppercase', marginBottom:6 }}>YOUR JOURNEY</p>
                <h1 style={{ fontFamily:'"Lora",serif', fontSize:36, fontWeight:900, color:tp, letterSpacing:-0.8, lineHeight:1.1 }}>Mood History</h1>
                <p style={{ color:ts, marginTop:8, fontSize:14 }}>
                  {loading ? 'Loading…' : `${moodHistory.length} entries · live updates enabled`}
                </p>
              </div>
              <button className="refresh-btn" onClick={refresh} disabled={refreshing || loading}>
                {refreshing ? <div className="spinner" /> : <span style={{ fontSize:16 }}>↻</span>}
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button className="refresh-btn" style={{ background:pri, color:'#fff', borderColor:'transparent' }} onClick={() => setShowShare(true)}>
                ✨ Share My Vibe
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px 80px' }}>

          {/* Error */}
          {!!error && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'14px 18px', borderRadius:14, background:isDark?'#2D0D0D':'#FEF2F2', border:`1px solid ${isDark?'#5C1A1A':'#FECACA'}`, marginBottom:24 }}>
              <span style={{ color:'#EF4444', fontSize:13 }}>{error}</span>
              <button onClick={refresh} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontWeight:700, fontSize:13, fontFamily:'"Sora",sans-serif' }}>Retry →</button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:18 }}>
              <div className="spinner" style={{ width:40, height:40, borderWidth:3 }} />
              <p style={{ color:ts, fontSize:14 }}>Loading your mood history…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && moodHistory.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:16, background:card, borderRadius:24, border:`1px solid ${bord}`, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:64 }}>✨</div>
              <h2 style={{ fontFamily:'"Lora",serif', fontSize:26, fontWeight:900, color:tp }}>No mood entries yet</h2>
              <p style={{ color:ts, fontSize:14, maxWidth:340, lineHeight:1.65 }}>Start tracking your mood on the app — your history will appear here automatically.</p>
            </div>
          )}

          {/* Data */}
          {!loading && moodHistory.length > 0 && (
            <>
              {/* AI INSIGHT CARD */}
              <div style={{ background:`linear-gradient(135deg, ${pri}11, ${pri}22)`, border:`1.5px solid ${pri}44`, borderRadius:24, padding:'24px 28px', marginBottom:28, display:'flex', gap:20, alignItems:'center' }}>
                <div style={{ fontSize:42 }}>🤖</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:pri, textTransform:'uppercase', marginBottom:6 }}>Personalized AI Insight</p>
                  <p style={{ fontFamily:'"Lora",serif', fontSize:17, fontWeight:600, color:tp, lineHeight:1.5 }}>
                    {insight || "Gathering insights from your journey..."}
                  </p>
                </div>
              </div>
              {/* STATS ROW */}
              <div className="stats-row" style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:28 }}>

                <div className="stat-card">
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:inact, textTransform:'uppercase', marginBottom:8 }}>Total Entries</p>
                  <p style={{ fontFamily:'"Lora",serif', fontSize:38, fontWeight:900, color:tp, lineHeight:1 }}>{moodHistory.length}</p>
                  <p style={{ fontSize:12, color:ts, marginTop:5 }}>moods logged</p>
                </div>

                <div className="stat-card">
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:inact, textTransform:'uppercase', marginBottom:8 }}>Day Streak</p>
                  <p style={{ fontFamily:'"Lora",serif', fontSize:38, fontWeight:900, color:pri, lineHeight:1 }}>{streak}</p>
                  <p style={{ fontSize:12, color:ts, marginTop:5 }}>days in a row 🔥</p>
                </div>

                {topMood && (() => {
                  const meta  = getMoodMeta(topMood[0], isDark);
                  const emoji = getMoodEmoji(topMood[0]);
                  return (
                    <div className="stat-card" style={{ background:meta.bg, borderColor:`${meta.color}55` }}>
                      <p style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:meta.color, textTransform:'uppercase', marginBottom:8 }}>Top Mood</p>
                      <p style={{ fontSize:38, lineHeight:1 }}>{emoji}</p>
                      <p style={{ fontSize:13, color:meta.color, fontWeight:700, marginTop:8 }}>{meta.label} · {topMood[1]}×</p>
                    </div>
                  );
                })()}

                <div className="stat-card">
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:inact, textTransform:'uppercase', marginBottom:8 }}>Variety</p>
                  <p style={{ fontFamily:'"Lora",serif', fontSize:38, fontWeight:900, color:tp, lineHeight:1 }}>{Object.keys(moodCounts).length}</p>
                  <p style={{ fontSize:12, color:ts, marginTop:5 }}>different moods</p>
                </div>
              </div>

              {/* BREAKDOWN BAR CHART */}
              <div style={{ background:card, border:`1.5px solid ${bord}`, borderRadius:18, padding:'22px 24px', marginBottom:24 }}>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:2.5, color:inact, textTransform:'uppercase', marginBottom:16 }}>Mood Breakdown</p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).map(([moodKey, count]) => {
                    const meta  = getMoodMeta(moodKey, isDark);
                    const emoji = getMoodEmoji(moodKey);
                    const pct   = Math.round((count / moodHistory.length) * 100);
                    return (
                      <div key={moodKey} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20, width:28, textAlign:'center', flexShrink:0 }}>{emoji}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:tp, width:95, flexShrink:0 }}>{meta.label}</span>
                        <div style={{ flex:1, height:9, background:isDark?'#1E293B':'#E2E8F0', borderRadius:99, overflow:'hidden' }}>
                          <div className="bar-fill" style={{ height:'100%', width:`${pct}%`, background:meta.color, borderRadius:99 }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:800, color:meta.color, width:42, textAlign:'right', flexShrink:0 }}>{pct}%</span>
                        <span style={{ fontSize:12, color:inact, width:26, textAlign:'right', flexShrink:0 }}>{count}×</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FILTER CHIPS */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
                <button className={`filter-chip${!filterMood?' active':''}`}
                  style={!filterMood ? { background:pri } : {}}
                  onClick={() => setFilterMood(null)}
                >
                  All <span style={{ fontSize:11, opacity:0.8 }}>{moodHistory.length}</span>
                </button>
                {Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).map(([moodKey, count]) => {
                  const meta   = getMoodMeta(moodKey, isDark);
                  const active = filterMood === moodKey;
                  return (
                    <button key={moodKey} className={`filter-chip${active?' active':''}`}
                      style={active ? { background:meta.color } : {}}
                      onClick={() => setFilterMood(active ? null : moodKey)}
                    >
                      {getMoodEmoji(moodKey)} {meta.label}
                      <span style={{ fontSize:11, opacity:0.75 }}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Filtered empty */}
              {filteredHistory.length === 0 && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:200, gap:14, background:card, borderRadius:18, border:`1px solid ${bord}`, padding:40, textAlign:'center' }}>
                  <div style={{ fontSize:44 }}>{filterMood ? getMoodEmoji(filterMood) : '🔍'}</div>
                  <p style={{ fontFamily:'"Lora",serif', fontSize:20, fontWeight:800, color:tp }}>No entries</p>
                  <button onClick={() => setFilterMood(null)} style={{ background:'none', border:`1.5px solid ${bord}`, borderRadius:20, padding:'8px 20px', color:tp, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'"Sora",sans-serif' }}>Clear filter</button>
                </div>
              )}

              {/* ── ENTRY CARDS ── */}
              {filteredHistory.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {filteredHistory.map((entry, index) => {
                    // Resolve the best key for this entry (handles all save formats)
                    const moodKey      = resolveKey(entry);
                    const meta         = getMoodMeta(moodKey, isDark);
                    const emoji        = getMoodEmoji(moodKey);
                    const displayLabel = resolveDisplayLabel(entry, isDark);

                    return (
                      <div
                        key={`${entry.date}-${index}`}
                        className="entry-card"
                        style={{ animationDelay:`${Math.min(index,12)*40}ms` }}
                      >
                        {/* Emoji bubble — explicit background so it's always visible */}
                        <div style={{
                          width: 56, height: 56, borderRadius: 18, flexShrink: 0,
                          background: meta.bg,
                          border: `1.5px solid ${meta.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28,
                          color: 'unset',
                        }}>
                          {emoji}
                        </div>

                        {/* Content — every text node has an explicit color */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                            {/* Mood label — accent color, always visible */}
                            <span style={{ fontSize:16, fontWeight:800, color:meta.color }}>
                              {displayLabel}
                            </span>
                            {/* Pill badge */}
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              color: meta.color,
                              background: meta.bg,
                              padding: '2px 9px', borderRadius: 8,
                              border: `1px solid ${meta.color}44`,
                            }}>
                              {emoji}
                            </span>
                          </div>

                          {/* Date — explicit secondary color */}
                          <p style={{ fontSize:13, color:ts, marginBottom: entry.note ? 8 : 0 }}>
                            🗓 {formatDate(entry.date)}
                          </p>

                          {/* Note — explicit colors */}
                          {!!entry.note && (
                            <p style={{
                              fontSize: 13, color: ts,
                              fontStyle: 'italic', lineHeight: 1.6,
                              padding: '9px 13px',
                              background: noteBg,
                              borderRadius: 10,
                              borderLeft: `3px solid ${meta.color}`,
                              marginTop: 4,
                            }}>
                              "{entry.note}"
                            </p>
                          )}
                        </div>

                        {/* Date badge — right side */}
                        <div style={{ flexShrink:0, textAlign:'right', paddingTop:2 }}>
                          <span style={{
                            fontSize: 11, color: ts, fontWeight: 600,
                            background: isDark ? '#0F172A' : '#F1F5F9',
                            padding: '4px 10px', borderRadius: 8,
                            whiteSpace: 'nowrap',
                            border: `1px solid ${bord}`,
                          }}>
                            {new Date(entry.date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showShare && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 1001 }} onPress={() => setShowShare(false)}>
             <Text style={{ color: '#fff', fontSize: 40 }}>×</Text>
          </TouchableOpacity>
          <MoodShareCard 
             mood={moodHistory[0]?.mood_key as any || 'neutral'} 
             streak={streak} 
             onClose={() => setShowShare(false)} 
          />
        </View>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION
───────────────────────────────────────────────────────────────────────── */

function MoodHistoryScreenMobile() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme, isDark } = useTheme();

  const [filterMood,  setFilterMood]  = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>(() => parseMoodHistory(profile?.mood_history));
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true); setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles').select('mood_history').eq('id', user.id).single();
      if (err) throw err;
      const fresh = parseMoodHistory(data?.mood_history);
      fresh.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMoodHistory(fresh);
    } catch { setError('Could not refresh. Check your connection and try again.'); }
    finally { setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredHistory = useMemo(
    () => filterMood ? moodHistory.filter(e => resolveKey(e) === filterMood) : moodHistory,
    [filterMood, moodHistory],
  );

  const moodCounts = useMemo(() => {
    const c: Record<string, number> = {};
    moodHistory.forEach(e => {
      const key = resolveKey(e) || 'Unknown';
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [moodHistory]);

  const topMood = useMemo(() => {
    const e = Object.entries(moodCounts);
    return e.length ? e.sort((a, b) => b[1] - a[1])[0] : null;
  }, [moodCounts]);

  const bg = theme.background; const card = theme.card; const border = theme.border;
  const text = theme.textPrimary; const secondary = theme.textSecondary; const primary = theme.primary;

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={[styles.title, { color: text }]}>Sign in to see your mood history</Text>
        <TouchableOpacity onPress={() => router.push('/login')} style={[styles.primaryButton, { backgroundColor: primary }]}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex:1, backgroundColor: bg }} contentContainerStyle={{ padding:20, paddingBottom:60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={primary} colors={[primary]} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { borderColor:border, backgroundColor:card }]}>
            <Text style={{ color:text, fontWeight:'600' }}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={refresh} disabled={refreshing} style={[styles.refreshButton, { borderColor:border, backgroundColor:card }]}>
            {refreshing ? <ActivityIndicator size="small" color={primary} /> : <Text style={{ color:primary, fontWeight:'600', fontSize:13 }}>↻ Refresh</Text>}
          </TouchableOpacity>
        </View>
        <Text style={[styles.heading, { color:text }]}>Mood History</Text>
        <Text style={{ color:secondary, marginTop:8 }}>{moodHistory.length} entries tracked</Text>
      </View>

      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor:'#FEF2F2', borderColor:'#FECACA' }]}>
          <Text style={{ color:'#DC2626', fontSize:13 }}>{error}</Text>
          <TouchableOpacity onPress={refresh}><Text style={{ color:'#DC2626', fontWeight:'700', fontSize:13 }}> Retry</Text></TouchableOpacity>
        </View>
      )}

      {!!Object.keys(moodCounts).length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:20 }}>
          <TouchableOpacity onPress={() => setFilterMood(null)} style={[styles.filterChip, { backgroundColor:!filterMood?primary:card, borderColor:border }]}>
            <Text style={{ color:!filterMood?'#fff':text, fontWeight:'700' }}>All</Text>
          </TouchableOpacity>
          {Object.entries(moodCounts).map(([moodKey, count]) => {
            const meta = getMoodMeta(moodKey, isDark); const active = filterMood === moodKey;
            return (
              <TouchableOpacity key={moodKey} onPress={() => setFilterMood(active?null:moodKey)}
                style={[styles.filterChip, { backgroundColor:active?meta.color:card, borderColor:active?meta.color:border }]}>
                <Text style={{ color:active?'#fff':text, fontWeight:'700' }}>{getMoodEmoji(moodKey)} {count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {refreshing && !moodHistory.length && <View style={styles.centered}><ActivityIndicator size="large" color={primary} /></View>}

      {!refreshing && !filteredHistory.length && (
        <View style={[styles.emptyCard, { backgroundColor:card, borderColor:border }]}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={[styles.emptyTitle, { color:text }]}>No mood entries yet</Text>
          <Text style={{ color:secondary, textAlign:'center', marginTop:10, lineHeight:22 }}>Your mood timeline will appear here.</Text>
        </View>
      )}

      {!!filteredHistory.length && (
        <>
          {topMood && (
            <View style={[styles.topMoodCard, { backgroundColor:getMoodMeta(topMood[0], isDark).bg, borderColor:getMoodMeta(topMood[0], isDark).color }]}>
              <Text style={styles.topMoodEmoji}>{getMoodEmoji(topMood[0])}</Text>
              <Text style={[styles.topMoodText, { color:text }]}>Your top mood is {getMoodMeta(topMood[0], isDark).label}</Text>
            </View>
          )}
          {filteredHistory.map((entry, index) => {
            const moodKey      = resolveKey(entry);
            const meta         = getMoodMeta(moodKey, isDark);
            const emoji        = getMoodEmoji(moodKey);
            const displayLabel = resolveDisplayLabel(entry, isDark);

            return (
              <View key={`${entry.date}-${index}`} style={[styles.entryCard, { backgroundColor:card, borderColor:border }]}>
                <View style={[styles.emojiBubble, { backgroundColor:meta.bg }]}>
                  <Text style={styles.entryEmoji}>{emoji}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={[styles.entryLabel, { color:meta.color }]}>{displayLabel}</Text>
                  <Text style={{ color:secondary, marginTop:4, fontSize:12 }}>{formatDate(entry.date)}</Text>
                  {!!entry.note && <Text style={{ color:secondary, marginTop:8, fontStyle:'italic', lineHeight:20 }}>"{entry.note}"</Text>}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DEFAULT EXPORT
───────────────────────────────────────────────────────────────────────── */

export default function MoodHistoryPage() {
  if (Platform.OS === 'web') return <MoodHistoryScreenWeb />;
  return <MoodHistoryScreenMobile />;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE STYLES
───────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  centered:          { flex:1, justifyContent:'center', alignItems:'center', padding:24 },
  emoji:             { fontSize:48 },
  title:             { fontSize:24, fontWeight:'700', marginTop:20, textAlign:'center' },
  primaryButton:     { marginTop:30, paddingHorizontal:28, paddingVertical:14, borderRadius:14 },
  primaryButtonText: { color:'#fff', fontWeight:'700', fontSize:15 },
  header:            { marginBottom:24 },
  headerTopRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  backButton:        { paddingHorizontal:14, paddingVertical:10, borderRadius:12, borderWidth:1 },
  refreshButton:     { paddingHorizontal:14, paddingVertical:10, borderRadius:12, borderWidth:1, minWidth:88, alignItems:'center' },
  heading:           { fontSize:32, fontWeight:'800' },
  errorBanner:       { flexDirection:'row', alignItems:'center', borderWidth:1, borderRadius:12, padding:12, marginBottom:16 },
  filterChip:        { paddingHorizontal:16, paddingVertical:10, borderRadius:999, borderWidth:1, marginRight:10 },
  emptyCard:         { borderWidth:1, borderRadius:24, padding:40, alignItems:'center' },
  emptyTitle:        { fontSize:22, fontWeight:'700', marginTop:20 },
  topMoodCard:       { borderWidth:1, borderRadius:20, padding:20, marginBottom:20, alignItems:'center' },
  topMoodEmoji:      { fontSize:44, marginBottom:10 },
  topMoodText:       { fontSize:18, fontWeight:'700' },
  entryCard:         { borderWidth:1, borderRadius:20, padding:18, marginBottom:14, flexDirection:'row', gap:16 },
  emojiBubble:       { width:54, height:54, borderRadius:18, justifyContent:'center', alignItems:'center' },
  entryEmoji:        { fontSize:26 },
  entryLabel:        { fontSize:16, fontWeight:'700' },
});