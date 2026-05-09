/**
 * components/ProductRecommendations.web.tsx
 *
 * "You might also like" section for product detail page.
 * - Fetches products with overlapping mood_tags or same category
 * - Horizontal scroll on small screens, 4-column grid on large
 * - Matches MoodMarket design: Sora + Lora, theme context, inline CSS
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { getProductImage } from '@/utils/images';
import type { Product } from '@/types/database';

function RecommendationCard({ product, theme, isDark }: {
  product: Product;
  theme: any;
  isDark: boolean;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const stars = Math.round(product.rating ?? 0);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/product/${product.id}`)}
      style={{
        background: theme.card,
        border: `1px solid ${hovered ? theme.primary : theme.border}`,
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 36px ${theme.primary}22`
          : '0 2px 8px rgba(0,0,0,0.05)',
        flexShrink: 0,
        width: '100%',
      }}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        height: 180,
        background: theme.tint,
        overflow: 'hidden',
      }}>
        <Image
          source={{ uri: getProductImage(product) }}
          style={{ width: '100%', height: '100%' } as any}
          contentFit="cover"
          transition={200}
        />
        {/* Overlay on hover */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `${theme.primary}18`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.18s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: theme.primary,
            color: '#fff',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: '"Sora", sans-serif',
            transform: hovered ? 'scale(1)' : 'scale(0.85)',
            transition: 'transform 0.18s',
          }}>
            View Product →
          </div>
        </div>
        {/* Mood tag badge */}
        {product.mood_tags && product.mood_tags[0] && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: isDark ? 'rgba(45,24,32,0.9)' : 'rgba(255,240,242,0.92)',
            border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 10,
            fontWeight: 700,
            color: theme.primary,
            fontFamily: '"Sora", sans-serif',
            backdropFilter: 'blur(8px)',
          }}>
            #{product.mood_tags[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Stars */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{
              fontSize: 11,
              color: i <= stars ? '#F59E0B' : isDark ? '#3A3030' : '#E5E7EB',
              lineHeight: 1,
            }}>
              {i <= stars ? '★' : '☆'}
            </span>
          ))}
          {product.rating && (
            <span style={{
              fontSize: 10,
              color: theme.inactive,
              marginLeft: 4,
              fontFamily: '"Sora", sans-serif',
              fontWeight: 600,
            }}>
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Name */}
        <p style={{
          margin: '0 0 6px',
          fontSize: 14,
          fontWeight: 600,
          color: theme.textPrimary,
          fontFamily: '"Lora", serif',
          lineHeight: 1.4,
          letterSpacing: -0.2,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.name}
        </p>

        {/* Price */}
        <p style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 800,
          color: theme.primary,
          fontFamily: '"Sora", sans-serif',
          letterSpacing: -0.3,
        }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: theme.textSecondary }}>GH₵ </span>
          {product.price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export default function ProductRecommendations({
  currentProductId,
  moodTags,
  category,
}: {
  currentProductId: string;
  moodTags?: string[];
  category?: string;
}) {
  const { theme, isDark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      let query = supabase
        .from('products')
        .select('*')
        .neq('id', currentProductId)
        .limit(8);

      // prefer same category first
      if (category) {
        query = query.eq('category', category);
      }

      const { data } = await query;

      // if fewer than 4 results, also fetch by mood tags
      if ((!data || data.length < 4) && moodTags && moodTags.length > 0) {
        const { data: tagData } = await supabase
          .from('products')
          .select('*')
          .neq('id', currentProductId)
          .overlaps('mood_tags', moodTags)
          .limit(8);

        const merged = [...(data ?? []), ...(tagData ?? [])];
        const unique = merged.filter(
          (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
        );
        setProducts(unique.slice(0, 6));
      } else {
        setProducts((data ?? []).slice(0, 6));
      }
      setLoading(false);
    };

    fetchRecs();
  }, [currentProductId, moodTags, category]);

  if (loading) return (
    <div style={{
      padding: '32px 0',
      textAlign: 'center',
      color: theme.inactive,
      fontFamily: '"Sora", sans-serif',
      fontSize: 13,
    }}>
      Loading recommendations…
    </div>
  );

  if (products.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes mm-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rec-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .rec-grid > * {
          animation: mm-fade-up 0.35s ease both;
        }
        .rec-grid > *:nth-child(1) { animation-delay: 0.05s; }
        .rec-grid > *:nth-child(2) { animation-delay: 0.10s; }
        .rec-grid > *:nth-child(3) { animation-delay: 0.15s; }
        .rec-grid > *:nth-child(4) { animation-delay: 0.20s; }
        .rec-grid > *:nth-child(5) { animation-delay: 0.25s; }
        .rec-grid > *:nth-child(6) { animation-delay: 0.30s; }
        @media (max-width: 960px) {
          .rec-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
        }
        @media (max-width: 600px) {
          .rec-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>

      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 22,
        padding: 32,
        marginBottom: 0,
      }}>
        {/* Section header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <h3 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: theme.textPrimary,
              fontFamily: '"Lora", serif',
              letterSpacing: -0.3,
            }}>
              You might also like
            </h3>
            <span style={{
              background: isDark ? '#2D1820' : '#FFF0F2',
              border: `1px solid ${isDark ? '#3D2030' : '#FFD6DE'}`,
              borderRadius: 20,
              padding: '2px 9px',
              fontSize: 12,
              fontWeight: 700,
              color: theme.primary,
              fontFamily: '"Sora", sans-serif',
            }}>
              {products.length}
            </span>
          </div>
          <span style={{
            fontSize: 11,
            color: theme.inactive,
            fontFamily: '"Sora", sans-serif',
            fontWeight: 500,
            letterSpacing: 0.3,
          }}>
            Based on mood & category
          </span>
        </div>

        {/* Decorative divider */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, ${theme.primary}33 0%, ${theme.border} 60%, transparent 100%)`,
          marginBottom: 24,
        }} />

        {/* Grid */}
        <div className="rec-grid">
          {products.map(p => (
            <RecommendationCard
              key={p.id}
              product={p}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </div>
      </div>
    </>
  );
}