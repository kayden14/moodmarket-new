/**
 * app/product/[id].web.tsx — MoodMarket Product Detail (Web)
 *
 * Full web rewrite of the Android product detail screen.
 * - Sticky image left column, scrollable details + reviews right column
 * - Matches MoodMarket design system: Sora + Lora, theme context, CSS-in-JS
 * - Inline review form with star picker, edit/delete
 * - Topnav with back, wishlist, cart badge, share
 * - No React Native primitives — pure HTML/CSS
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getProductImage } from '@/utils/images';
import { notifyUser } from '@/services/notifyUser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id:            string;
  user_id:       string;
  product_id:    string;
  rating:        number;
  comment:       string;
  created_at:    string;
  reviewer_name: string;
}

// ─── Star components ──────────────────────────────────────────────────────────

function StarInput({ value, onChange, disabled = false }: {
  value: number; onChange: (r: number) => void; disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          onClick={() => !disabled && onChange(i)}
          onMouseEnter={() => !disabled && setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          disabled={disabled}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: disabled ? 'default' : 'pointer',
            fontSize: 32,
            color: i <= active ? '#F59E0B' : '#ccc',
            transition: 'color 0.12s, transform 0.1s',
            transform: hovered === i ? 'scale(1.25)' : 'scale(1)',
            lineHeight: 1,
          }}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          {i <= active ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= full ? '#F59E0B' : '#ddd', lineHeight: 1 }}>
          {i <= full ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, isOwn, onEdit, onDelete, theme }: {
  review: Review; isOwn: boolean; onEdit: () => void; onDelete: () => void; theme: any;
}) {
  const [hovered, setHovered] = useState(false);
  const initials = (review.reviewer_name || 'A').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
  const date = new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.card,
        border: `1px solid ${hovered ? theme.secondary : theme.border}`,
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 12,
        transition: 'border-color 0.18s, box-shadow 0.18s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {/* avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: theme.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
          fontFamily: '"Sora", sans-serif',
        }}>
          {initials}
        </div>

        {/* name + stars */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary, marginBottom: 3, fontFamily: '"Sora", sans-serif' }}>
            {review.reviewer_name || 'Anonymous'}
          </div>
          <StarDisplay rating={review.rating} size={13} />
        </div>

        {/* date + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 11, color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>{date}</span>
          {isOwn && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onEdit} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: theme.primary, padding: '2px 4px',
                fontFamily: '"Sora", sans-serif', fontWeight: 600,
                transition: 'opacity 0.13s',
              }}>✏ Edit</button>
              <button onClick={onDelete} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#EF4444', padding: '2px 4px',
                fontFamily: '"Sora", sans-serif', fontWeight: 600,
                transition: 'opacity 0.13s',
              }}>🗑 Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* comment */}
      {!!review.comment && (
        <p style={{
          margin: 0, fontSize: 14, lineHeight: 1.65,
          color: theme.textSecondary, fontFamily: '"Sora", sans-serif',
        }}>
          {review.comment}
        </p>
      )}
    </div>
  );
}

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({ productId, userId, userProfile, onAverageUpdate, theme, isDark }: {
  productId: string; userId: string | undefined; userProfile: any;
  onAverageUpdate: (avg: number, count: number) => void;
  theme: any; isDark: boolean;
}) {
  const [reviews,      setReviews]      = useState<Review[]>([]);
  const [myReview,     setMyReview]     = useState<Review | null>(null);
  const [draftRating,  setDraftRating]  = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase.from('reviews').select('*')
      .eq('product_id', productId).order('created_at', { ascending: false });
    if (data) {
      setReviews(data);
      const mine = data.find((r: Review) => r.user_id === userId) ?? null;
      setMyReview(mine);
      if (data.length > 0) {
        const avg = data.reduce((s: number, r: Review) => s + r.rating, 0) / data.length;
        onAverageUpdate(avg, data.length);
      }
    }
    setLoading(false);
  }, [productId, userId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!userId) return;
    if (draftRating === 0) return;
    setSubmitting(true);
    const payload = {
      user_id: userId, product_id: productId,
      rating: draftRating, comment: draftComment.trim(),
      reviewer_name: userProfile?.name ?? 'Anonymous',
    };
    const { error } = myReview
      ? await supabase.from('reviews').update(payload).eq('id', myReview.id)
      : await supabase.from('reviews').insert(payload);
    setSubmitting(false);
    if (error) return;
    setShowForm(false); setDraftRating(0); setDraftComment('');
    fetchReviews();
  };

  const handleEdit = (review: Review) => {
    setDraftRating(review.rating);
    setDraftComment(review.comment ?? '');
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleDelete = async () => {
    if (!myReview) return;
    await supabase.from('reviews').delete().eq('id', myReview.id);
    setMyReview(null); setDeleteConfirm(false); fetchReviews();
  };

  const canReview   = !!userId && !myReview;
  const hasReviewed = !!myReview;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.textPrimary, fontFamily: '"Lora", serif', letterSpacing: -0.3 }}>
            Reviews
          </h3>
          {reviews.length > 0 && (
            <span style={{
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              borderRadius: 20, padding: '2px 9px',
              fontSize: 12, fontWeight: 700, color: theme.primary,
              fontFamily: '"Sora", sans-serif',
            }}>
              {reviews.length}
            </span>
          )}
        </div>

        {(canReview || hasReviewed) && !showForm && (
          <button
            onClick={() => { if (hasReviewed) handleEdit(myReview!); else setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              borderRadius: 10, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, color: theme.primary,
              cursor: 'pointer', fontFamily: '"Sora", sans-serif',
              transition: 'opacity 0.15s',
            }}
          >
            ✏ {hasReviewed ? 'Edit yours' : 'Write a review'}
          </button>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <div id="review-form" style={{
          background: theme.card,
          border: `2px solid ${theme.primary}`,
          borderRadius: 18, padding: 28,
          marginBottom: 24,
          boxShadow: `0 8px 32px ${theme.primary}18`,
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: 1.6, color: theme.inactive, textTransform: 'uppercase', fontFamily: '"Sora", sans-serif' }}>
            YOUR RATING
          </p>
          <StarInput value={draftRating} onChange={setDraftRating} />

          <p style={{ margin: '20px 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: 1.6, color: theme.inactive, textTransform: 'uppercase', fontFamily: '"Sora", sans-serif' }}>
            YOUR REVIEW (optional)
          </p>
          <textarea
            value={draftComment}
            onChange={e => setDraftComment(e.target.value)}
            placeholder="Share your experience with this product…"
            maxLength={500}
            rows={4}
            style={{
              width: '100%', borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.background,
              color: theme.textPrimary,
              padding: '14px 16px',
              fontSize: 14, fontFamily: '"Sora", sans-serif',
              resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = theme.primary; }}
            onBlur={e => { e.target.style.borderColor = theme.border; }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: theme.inactive, marginTop: 4, marginBottom: 18, fontFamily: '"Sora", sans-serif' }}>
            {draftComment.length}/500
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setShowForm(false); setDraftRating(0); setDraftComment(''); }}
              style={{
                flex: 1, padding: '12px 0',
                borderRadius: 12, border: `1.5px solid ${theme.border}`,
                background: 'none', color: theme.textSecondary,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: '"Sora", sans-serif', transition: 'all 0.15s',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || draftRating === 0}
              style={{
                flex: 2, padding: '12px 0',
                borderRadius: 12, border: 'none',
                background: draftRating === 0 ? theme.border : theme.primary,
                color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: draftRating === 0 ? 'not-allowed' : 'pointer',
                fontFamily: '"Sora", sans-serif',
                opacity: submitting ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
                boxShadow: draftRating > 0 ? `0 4px 14px ${theme.primary}44` : 'none',
              }}
            >
              {submitting ? '…' : '↑ Submit Review'}
            </button>
          </div>
        </div>
      )}

      {/* Guest prompt */}
      {!userId && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 16 }}>👤</span>
          <span style={{ fontSize: 13, color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>
            Sign in to leave a review
          </span>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 14, color: '#991B1B', fontFamily: '"Sora", sans-serif', flex: 1 }}>
            Delete your review?
          </span>
          <button onClick={() => setDeleteConfirm(false)} style={{ background: 'none', border: `1px solid #FECACA`, borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#991B1B', cursor: 'pointer', fontFamily: '"Sora", sans-serif' }}>
            Cancel
          </button>
          <button onClick={handleDelete} style={{ background: '#EF4444', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: '"Sora", sans-serif' }}>
            Delete
          </button>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: theme.inactive, fontFamily: '"Sora", sans-serif' }}>Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 36 }}>⭐</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: '"Lora", serif' }}>No reviews yet</p>
          <p style={{ fontSize: 13, color: theme.textSecondary, margin: 0, fontFamily: '"Sora", sans-serif' }}>Be the first to share your thoughts!</p>
        </div>
      ) : (
        reviews.map(r => (
          <ReviewCard
            key={r.id}
            review={r}
            isOwn={r.user_id === userId}
            onEdit={() => handleEdit(r)}
            onDelete={() => setDeleteConfirm(true)}
            theme={theme}
          />
        ))
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProductDetailWeb() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { addToCart, cartCount } = useCart();
  const { theme, isDark, toggleDark } = useTheme();

  const [product,      setProduct]      = useState<Product | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [added,        setAdded]        = useState(false);
  const [wished,       setWished]       = useState(false);
  const [quantity,     setQuantity]     = useState(1);
  const [liveRating,   setLiveRating]   = useState<{ avg: number; count: number } | null>(null);
  const [imgHovered,   setImgHovered]   = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      if (data) setProduct(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { router.push('/login'); return; }
    setAddingToCart(true);
    await addToCart(id as string, quantity);
    setAddingToCart(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2800);
    if (user?.id && product) notifyUser.addedToCart(user.id, product.name);
  };

  const handleShare = () => {
    if (!product) return;
    if (navigator.share) {
      navigator.share({ title: product.name, text: `Check out ${product.name} on MoodMarket — GH₵${product.price.toFixed(2)}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const displayRating = liveRating?.avg ?? product?.rating ?? 0;
  const displayCount  = liveRating?.count ?? 0;

  const bg   = theme.background;
  const card = theme.card;
  const bord = theme.border;
  const pri  = theme.primary;
  const tp   = theme.textPrimary;
  const ts   = theme.textSecondary;
  const tint = theme.tint;
  const inact = theme.inactive;

  // ── Loading ──
  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{ height: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: '"Sora", sans-serif' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛍️</div>
        <p style={{ color: ts, fontSize: 14, fontWeight: 500 }}>Loading product…</p>
      </div>
    </>
  );

  // ── Not found ──
  if (!product) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ height: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: '"Sora", sans-serif' }}>
        <span style={{ fontSize: 48 }}>📦</span>
        <p style={{ fontSize: 18, fontWeight: 700, color: tp }}>Product not found</p>
        <button onClick={() => router.back()} style={{ marginTop: 8, padding: '12px 28px', background: pri, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"Sora", sans-serif' }}>
          ← Go Back
        </button>
      </div>
    </>
  );

  const totalPrice = (product.price * quantity).toFixed(2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: "Sora", sans-serif; }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${bord}; border-radius: 10px; }

        .pd-app { height: 100vh; background: ${bg}; display: flex; flex-direction: column; overflow: hidden; color: ${tp}; }

        /* ── TOP NAV ── */
        .pd-topnav {
          height: 58px; background: ${card};
          border-bottom: 1px solid ${bord};
          display: flex; align-items: center;
          padding: 0 28px; gap: 16px;
          flex-shrink: 0; z-index: 100;
          backdrop-filter: blur(20px);
        }
        .pd-back-btn {
          display: flex; align-items: center; gap: 7px;
          background: none; border: 1px solid ${bord};
          border-radius: 9px; padding: 7px 14px;
          font-size: 13px; font-weight: 600; color: ${ts};
          cursor: pointer; font-family: "Sora", sans-serif;
          transition: all 0.15s;
        }
        .pd-back-btn:hover { border-color: ${pri}; color: ${pri}; background: ${tint}; }
        .pd-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: ${ts}; font-family: "Sora", sans-serif;
        }
        .pd-breadcrumb span.sep { color: ${bord}; }
        .pd-breadcrumb span.current { color: ${tp}; font-weight: 600; }
        .pd-nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .pd-nav-btn {
          height: 36px; width: 36px; border-radius: 9px;
          background: none; border: 1px solid ${bord};
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 16px; transition: all 0.15s; position: relative;
        }
        .pd-nav-btn:hover { border-color: ${pri}; background: ${tint}; }
        .pd-cart-badge {
          position: absolute; top: -5px; right: -5px;
          background: ${pri}; color: #fff;
          width: 16px; height: 16px; border-radius: 50%;
          font-size: 8px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid ${card};
          font-family: "Sora", sans-serif;
        }

        /* ── BODY: split pane ── */
        .pd-body { display: flex; flex: 1; overflow: hidden; }

        /* ── LEFT: sticky image ── */
        .pd-left {
          flex: 0 0 48%;
          padding: 36px 32px 36px 36px;
          position: sticky; top: 0;
          align-self: flex-start;
          height: calc(100vh - 58px);
          display: flex; flex-direction: column; gap: 20px;
          overflow: hidden;
        }
        .pd-img-wrap {
          position: relative;
          border-radius: 22px; overflow: hidden;
          background: ${tint};
          border: 1px solid ${bord};
          transition: box-shadow 0.25s;
          flex: 1;
        }
        .pd-img-wrap:hover { box-shadow: 0 20px 60px rgba(0,0,0,0.14); }
        .pd-img { width: 100%; height: 100%; object-fit: cover; }
        .pd-img-badge {
          position: absolute; top: 16px; left: 16px;
          background: ${pri}; color: #fff;
          border-radius: 8px; padding: '6px 12px';
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; font-family: "Sora", sans-serif;
        }

        /* Mood tag chips in left column */
        .pd-mood-chips {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .pd-mood-chip {
          background: ${isDark ? '#2D1820' : '#FFF0F2'};
          border: 1px solid ${isDark ? '#3D2030' : '#FFD6DE'};
          border-radius: 20px; padding: 6px 14px;
          font-size: 12px; font-weight: 600; color: ${pri};
          font-family: "Sora", sans-serif;
        }

        /* ── RIGHT: scrollable ── */
        .pd-right {
          flex: 1;
          overflow-y: auto;
          height: calc(100vh - 58px);
          border-left: 1px solid ${bord};
        }
        .pd-right-inner {
          padding: 36px 40px 80px 40px;
          max-width: 680px;
        }

        /* ── DETAILS CARD ── */
        .pd-details-card {
          background: ${card};
          border: 1px solid ${bord};
          border-radius: 22px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }

        /* name + price */
        .pd-name-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
        .pd-name { font-family: "Lora", serif; font-size: 26px; font-weight: 600; color: ${tp}; line-height: 1.3; letter-spacing: -0.4px; flex: 1; }
        .pd-price { font-family: "Sora", sans-serif; font-size: 26px; font-weight: 700; color: ${pri}; letter-spacing: -0.5px; white-space: nowrap; }
        .pd-currency { font-size: 14px; font-weight: 500; color: ${ts}; }

        /* rating row */
        .pd-rating-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
        .pd-stars-row { display: flex; align-items: center; gap: 6px; }
        .pd-rating-val { font-size: 14px; font-weight: 700; color: ${tp}; font-family: "Sora", sans-serif; }
        .pd-rating-count { font-size: 12px; color: ${ts}; font-family: "Sora", sans-serif; }
        .pd-stock-badge {
          display: flex; align-items: center; gap: 6px;
          background: ${isDark ? '#0D2B1A' : '#EDFBF1'};
          border-radius: 20px; padding: 5px 12px;
          font-size: 12px; font-weight: 600; color: #22C55E;
          font-family: "Sora", sans-serif;
        }
        .pd-stock-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; }

        /* divider */
        .pd-divider { height: 1px; background: ${bord}; margin: 22px 0; }

        /* section */
        .pd-section { margin-bottom: 24px; }
        .pd-section-title { font-size: 13px; font-weight: 700; color: ${tp}; margin-bottom: 10px; letter-spacing: 0.2px; font-family: "Sora", sans-serif; text-transform: uppercase; font-size: 11px; letter-spacing: 1.2px; color: ${inact}; }
        .pd-desc { font-size: 14px; line-height: 1.75; color: ${ts}; font-family: "Sora", sans-serif; }

        /* quantity */
        .pd-qty-row { display: flex; align-items: center; gap: 14px; }
        .pd-qty-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: 1.5px solid ${bord};
          background: ${bg};
          font-size: 20px; font-weight: 500; color: ${tp};
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.14s; font-family: "Sora", sans-serif;
          line-height: 1;
        }
        .pd-qty-btn:hover:not(:disabled) { border-color: ${pri}; color: ${pri}; background: ${tint}; }
        .pd-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pd-qty-val { font-size: 17px; font-weight: 700; color: ${tp}; min-width: 28px; text-align: center; font-family: "Sora", sans-serif; }
        .pd-qty-total { font-size: 14px; font-weight: 500; color: ${ts}; font-family: "Sora", sans-serif; margin-left: 4px; }

        /* CTA footer */
        .pd-cta { display: flex; align-items: center; gap: 10px; margin-top: 28px; }
        .pd-wish-btn {
          width: 52px; height: 52px; border-radius: 14px;
          border: 1.5px solid ${bord}; background: ${bg};
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 22px; transition: all 0.15s; flex-shrink: 0;
        }
        .pd-wish-btn:hover { border-color: ${pri}; background: ${tint}; transform: scale(1.05); }
        .pd-add-btn {
          flex: 1; height: 52px; border-radius: 14px;
          border: none; background: ${pri};
          color: #fff; font-size: 15px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px;
          font-family: "Sora", sans-serif;
          box-shadow: 0 6px 20px ${pri}44;
          transition: transform 0.15s, opacity 0.15s, background 0.25s;
          letter-spacing: 0.1px;
        }
        .pd-add-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px ${pri}55; }
        .pd-add-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .pd-add-btn.added { background: #22C55E; box-shadow: 0 6px 20px #22C55E44; }
        .pd-view-cart-btn {
          height: 52px; padding: 0 18px; border-radius: 14px;
          border: 1.5px solid ${isDark ? '#3D2030' : '#FFD6DE'};
          background: ${isDark ? '#2D1820' : '#FFF0F2'};
          color: ${pri}; font-size: 13px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          font-family: "Sora", sans-serif; transition: all 0.15s; white-space: nowrap;
        }
        .pd-view-cart-btn:hover { opacity: 0.85; }

        /* reviews section card */
        .pd-reviews-card {
          background: ${card};
          border: 1px solid ${bord};
          border-radius: 22px;
          padding: 32px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .pd-left { flex: 0 0 42%; padding: 24px 20px 24px 24px; }
          .pd-right-inner { padding: 24px 24px 60px; }
          .pd-name { font-size: 22px; }
          .pd-price { font-size: 22px; }
          .pd-details-card { padding: 24px; }
          .pd-reviews-card { padding: 24px; }
        }
        @media (max-width: 720px) {
          .pd-body { flex-direction: column; }
          .pd-left { flex: none; height: auto; position: static; padding: 20px; }
          .pd-img-wrap { height: 280px; flex: none; }
          .pd-right { height: auto; border-left: none; border-top: 1px solid ${bord}; }
          .pd-right-inner { padding: 20px 18px 60px; }
          .pd-mood-chips { display: none; }
        }
      `}</style>

      <div className="pd-app">

        {/* ══ TOP NAV ══ */}
        <nav className="pd-topnav">
          <button className="pd-back-btn" onClick={() => router.back()}>
            ← Back
          </button>

          {/* breadcrumb */}
          <div className="pd-breadcrumb">
            <span onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>Home</span>
            <span className="sep">›</span>
            <span className="current" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </span>
          </div>

          <div className="pd-nav-actions">
            <button className="pd-nav-btn" onClick={toggleDark} title="Toggle theme">
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              className="pd-nav-btn"
              onClick={() => setWished(w => {
                const next = !w;
                if (next && user?.id && product) notifyUser.likedProduct(user.id, product.name);
                return next;
              })}
              title={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              style={{ fontSize: 18, color: wished ? pri : ts }}
            >
              {wished ? '♥' : '♡'}
            </button>
            <button className="pd-nav-btn" onClick={() => router.push('/(tabs)/cart')} title="Cart" style={{ position: 'relative' }}>
              🛒
              {cartCount > 0 && (
                <span className="pd-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </button>
            <button className="pd-nav-btn" onClick={handleShare} title="Share">
              🔗
            </button>
          </div>
        </nav>

        {/* ══ BODY ══ */}
        <div className="pd-body">

          {/* ── LEFT: sticky image ── */}
          <div className="pd-left">
            <div
              className="pd-img-wrap"
              onMouseEnter={() => setImgHovered(true)}
              onMouseLeave={() => setImgHovered(false)}
            >
              <Image
                source={{ uri: getProductImage(product) }}
                style={{ width: '100%', height: '100%' } as any}
                contentFit="cover"
                transition={300}
              />
              {/* "In Stock" badge on image */}
              <div style={{
                position: 'absolute', top: 16, left: 16,
                background: '#22C55E', color: '#fff',
                borderRadius: 8, padding: '5px 12px',
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                textTransform: 'uppercase', fontFamily: '"Sora", sans-serif',
                boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
              }}>
                In Stock
              </div>
              {/* zoom hint */}
              <div style={{
                position: 'absolute', bottom: 14, right: 14,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                borderRadius: 8, padding: '5px 10px',
                fontSize: 11, fontFamily: '"Sora", sans-serif',
                opacity: imgHovered ? 1 : 0,
                transition: 'opacity 0.2s',
              }}>
                🔍 Product image
              </div>
            </div>

            {/* mood tags in left column */}
            {product.mood_tags && product.mood_tags.length > 0 && (
              <div className="pd-mood-chips">
                {product.mood_tags.map((tag: string, i: number) => (
                  <span key={i} className="pd-mood-chip">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: scrollable details + reviews ── */}
          <div className="pd-right">
            <div className="pd-right-inner">

              {/* ── DETAILS CARD ── */}
              <div className="pd-details-card">

                {/* Name + Price */}
                <div className="pd-name-row">
                  <h1 className="pd-name">{product.name}</h1>
                  <div className="pd-price">
                    <span className="pd-currency">GH₵ </span>
                    {product.price.toFixed(2)}
                  </div>
                </div>

                {/* Rating + Stock */}
                <div className="pd-rating-row">
                  <div className="pd-stars-row">
                    <StarDisplay rating={displayRating} size={15} />
                    <span className="pd-rating-val">{displayRating.toFixed(1)}</span>
                    <span className="pd-rating-count">
                      ({displayCount} {displayCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                  <div className="pd-stock-badge">
                    <span className="pd-stock-dot" />
                    In Stock
                  </div>
                </div>

                <div className="pd-divider" />

                {/* Description */}
                <div className="pd-section">
                  <p className="pd-section-title">About this product</p>
                  <p className="pd-desc">{product.description}</p>
                </div>

                {/* Mood tags (right column, smaller screens) */}
                {product.mood_tags && product.mood_tags.length > 0 && (
                  <div className="pd-section" style={{ display: 'none' }}>
                    <p className="pd-section-title">Mood Tags</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {product.mood_tags.map((tag: string, i: number) => (
                        <span key={i} style={{
                          background: isDark ? '#2D1820' : '#FFF0F2',
                          border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
                          borderRadius: 20, padding: '6px 14px',
                          fontSize: 12, fontWeight: 600, color: pri,
                          fontFamily: '"Sora", sans-serif',
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pd-divider" />

                {/* Quantity */}
                <div className="pd-section" style={{ marginBottom: 0 }}>
                  <p className="pd-section-title">Quantity</p>
                  <div className="pd-qty-row">
                    <button
                      className="pd-qty-btn"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <span className="pd-qty-val">{quantity}</span>
                    <button
                      className="pd-qty-btn"
                      onClick={() => setQuantity(q => q + 1)}
                    >
                      +
                    </button>
                    <span className="pd-qty-total">= GH₵{totalPrice}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="pd-cta">
                  <button
                    className="pd-wish-btn"
                    onClick={() => setWished(w => {
                      const next = !w;
                      if (next && user?.id && product) notifyUser.likedProduct(user.id, product.name);
                      return next;
                    })}
                    title={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                    style={{ color: wished ? pri : inact, borderColor: wished ? pri : bord, background: wished ? tint : bg }}
                  >
                    {wished ? '♥' : '♡'}
                  </button>

                  <button
                    className={`pd-add-btn${added ? ' added' : ''}`}
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                  >
                    {addingToCart ? (
                      <span style={{ fontSize: 13 }}>Adding…</span>
                    ) : added ? (
                      <><span style={{ fontSize: 18 }}>✓</span> Added to Cart!</>
                    ) : (
                      <><span style={{ fontSize: 18 }}>🛒</span> Add to Cart</>
                    )}
                  </button>

                  {added && !addingToCart && (
                    <button
                      className="pd-view-cart-btn"
                      onClick={() => router.push('/(tabs)/cart')}
                    >
                      View Cart
                      {cartCount > 0 && (
                        <span style={{
                          background: pri, color: '#fff',
                          borderRadius: 10, minWidth: 20, height: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, padding: '0 5px',
                        }}>
                          {cartCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ── REVIEWS ── */}
              <div className="pd-reviews-card">
                <ReviewSection
                  productId={id as string}
                  userId={user?.id}
                  userProfile={profile}
                  onAverageUpdate={(avg, count) => setLiveRating({ avg, count })}
                  theme={theme}
                  isDark={isDark}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}