/**
 * app/reviews.web.tsx — Reviews with web layout
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import WebShell from '@/components/WebShell';
import { Star, MessageSquare, ShoppingBag, Trash2, Pencil } from 'lucide-react';

interface Review {
  id: string; user_id: string; product_id: string;
  rating: number; comment: string; created_at: string;
  reviewer_name: string;
  products?: { id: string; name: string; image: string; price: number };
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} color="#F59E0B" fill={i <= Math.round(rating) ? '#F59E0B' : 'transparent'} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export default function ReviewsScreenWeb() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const pri = theme.primary;
  const tp = isDark ? '#F2F2F2' : '#111';
  const ts = isDark ? '#888' : '#666';
  const card = isDark ? '#141414' : '#fff';
  const bord = isDark ? '#222' : '#EAEAEA';

  const fetchReviews = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('reviews')
      .select(`*, products (id, name, image, price)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data as Review[]);
    if (error) console.error('[Reviews]', error);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleDelete = async (review: Review) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    await supabase.from('reviews').delete().eq('id', review.id);
    setReviews(prev => prev.filter(r => r.id !== review.id));
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <WebShell activeNav="profile" title="Reviews" subtitle="My Reviews">
      <div style={{ maxWidth: 720 }}>
        {/* stats */}
        {reviews.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            background: card, border: `1px solid ${bord}`, borderRadius: 18,
            marginBottom: 20, overflow: 'hidden',
          }}>
            {[
              { value: String(reviews.length), label: 'Total Reviews' },
              { value: `${avgRating} ⭐`, label: 'Avg Rating' },
              { value: String(reviews.filter(r => r.rating >= 4).length), label: 'Positive' },
            ].map((stat, i) => (
              <div key={i} style={{
                padding: '18px 0', textAlign: 'center',
                borderRight: i < 2 ? `1px solid ${bord}` : 'none',
              }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: tp, letterSpacing: -0.4, fontFamily: '"Sora", sans-serif' }}>{stat.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: ts, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, fontFamily: '"Sora", sans-serif' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, gap: 12 }}>
            <div className="spinner" style={{
              width: 28, height: 28,
              border: `2px solid ${bord}`, borderTopColor: pri,
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
            <p style={{ fontSize: 14, color: ts, fontFamily: '"Sora", sans-serif' }}>Loading your reviews…</p>
          </div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <MessageSquare size={32} color={pri} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: tp, marginBottom: 8, fontFamily: '"Sora", sans-serif' }}>Sign in to see reviews</p>
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <ShoppingBag size={32} color={pri} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: tp, marginBottom: 8, fontFamily: '"Sora", sans-serif' }}>No reviews yet</p>
            <p style={{ fontSize: 14, color: ts, lineHeight: 1.65, marginBottom: 24, fontFamily: '"Sora", sans-serif' }}>
              Buy products and share your thoughts to help others find what matches their mood.
            </p>
            <button onClick={() => router.push('/(tabs)')} style={{
              background: pri, color: '#fff', border: 'none', borderRadius: 14,
              padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: '"Sora", sans-serif',
            }}>Start Shopping</button>
          </div>
        ) : (
          <div>
            <p style={{
              fontSize: 12, fontWeight: 500, color: ts, marginBottom: 14, textAlign: 'center',
              fontFamily: '"Sora", sans-serif',
            }}>
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} · click any to view the product
            </p>
            {reviews.map(review => {
              const date = new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
              return (
                <div key={review.id} style={{
                  background: card, border: `1px solid ${bord}`, borderRadius: 18,
                  padding: 16, marginBottom: 12,
                  transition: 'all 0.12s',
                }}>
                  {/* product */}
                  <div
                    onClick={() => router.push(`/product/${review.product_id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, cursor: 'pointer',
                    }}
                  >
                    <img
                      src={review.products?.image ?? 'https://picsum.photos/200'}
                      alt={review.products?.name}
                      style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 700, lineHeight: 1.3,
                        color: tp, marginBottom: 3, fontFamily: '"Sora", sans-serif',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{review.products?.name ?? 'Product'}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ts, fontFamily: '"Sora", sans-serif' }}>
                        GH₵{review.products?.price?.toFixed(2)}
                      </p>
                    </div>
                    <span style={{ color: ts, fontSize: 16, fontFamily: '"Sora", sans-serif' }}>›</span>
                  </div>

                  <div style={{ height: 1, background: bord, marginBottom: 12 }} />

                  {/* review */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Stars rating={review.rating} size={16} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', fontFamily: '"Sora", sans-serif' }}>{labels[review.rating]}</span>
                      <span style={{ fontSize: 11, color: ts, marginLeft: 'auto', fontFamily: '"Sora", sans-serif' }}>{date}</span>
                    </div>
                    {review.comment && (
                      <p style={{
                        fontSize: 13, lineHeight: 1.55, color: ts,
                        fontFamily: '"Sora", sans-serif',
                      }}>{review.comment}</p>
                    )}
                  </div>

                  {/* actions */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => router.push(`/product/${review.product_id}`)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 10,
                      background: isDark ? '#0D1F2D' : '#EBF4F8',
                      color: '#0A7EA4', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: '"Sora", sans-serif',
                    }}>
                      <Pencil size={13} strokeWidth={2} /> Edit
                    </button>
                    <button onClick={() => handleDelete(review)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 10,
                      background: isDark ? '#2D1515' : '#FFF0F0',
                      color: '#E53E3E', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: '"Sora", sans-serif',
                    }}>
                      <Trash2 size={13} strokeWidth={2} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </WebShell>
  );
}
