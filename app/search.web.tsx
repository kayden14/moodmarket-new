/**
 * app/search.web.tsx — Search with web layout
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Product } from '@/types/database';
import WebShell from '@/components/WebShell';
import { Search, X, Star } from 'lucide-react';

const POPULAR = ['Skincare', 'Relaxing', 'Energy', 'Happy', 'Self-care', 'Cozy'];

export default function SearchScreenWeb() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearched(false); return; }
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const doSearch = async (q: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('products').select('*')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('rating', { ascending: false }).limit(30);
    setResults(data ?? []);
    setSearched(true);
    setLoading(false);
  };

  const clear = () => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); };

  const pri = theme.primary;
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';
  const card = isDark ? '#141414' : '#fff';
  const bord = isDark ? '#222' : '#EAEAEA';

  return (
    <WebShell activeNav="search" title="Search" subtitle="Find products">
      <div style={{ maxWidth: 800 }}>
        {/* search box */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: card, border: `1.5px solid ${bord}`,
          borderRadius: 14, padding: '10px 14px', marginBottom: 24,
        }}>
          <Search size={18} color={ts} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && query.trim() && doSearch(query)}
            placeholder="Search products, moods…"
            style={{
              flex: 1, fontSize: 15, fontWeight: 500,
              color: tp, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: '"Sora", sans-serif',
            }}
          />
          {query.length > 0 && (
            <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: ts }}>
              <X size={16} />
            </button>
          )}
        </div>

        {!searched && query.length < 2 ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14, fontFamily: '"Sora", sans-serif' }}>Popular searches</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {POPULAR.map(tag => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  style={{
                    padding: '8px 16px', borderRadius: 20,
                    border: `1.5px solid ${bord}`, background: card,
                    color: tp, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: '"Sora", sans-serif',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = pri; e.currentTarget.style.color = pri; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = bord; e.currentTarget.style.color = tp; }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{
              width: 28, height: 28,
              border: `2px solid ${bord}`, borderTopColor: pri,
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : results.length === 0 && searched ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12, fontFamily: undefined }}>🔍</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: tp, marginBottom: 6, fontFamily: '"Sora", sans-serif' }}>No results for "{query}"</p>
            <p style={{ fontSize: 13, color: ts, fontFamily: '"Sora", sans-serif' }}>Try a different keyword or mood</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: ts, marginBottom: 12, fontFamily: '"Sora", sans-serif' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {results.map(item => {
                const stars = Math.round(item.rating ?? 0);
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/product/${item.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', background: card,
                      borderRadius: 16, marginBottom: 10,
                      border: `1px solid ${bord}`, cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = pri; e.currentTarget.style.boxShadow = `0 4px 16px ${pri}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = bord; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <img
                      src={item.image ?? `https://picsum.photos/seed/${item.id}/120/120`}
                      alt={item.name}
                      style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 600, color: tp,
                        marginBottom: 4, lineHeight: 1.4,
                        fontFamily: '"Sora", sans-serif',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={10} color={pri} fill={i <= stars ? pri : 'transparent'} />
                        ))}
                        <span style={{ fontSize: 11, fontWeight: 600, color: ts, marginLeft: 2, fontFamily: '"Sora", sans-serif' }}>{item.rating?.toFixed(1)}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: pri, fontFamily: '"Sora", sans-serif' }}>GH₵{item.price.toFixed(2)}</p>
                    </div>
                    <span style={{ color: ts, fontSize: 18, fontFamily: '"Sora", sans-serif' }}>›</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </WebShell>
  );
}
