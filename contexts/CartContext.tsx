// contexts/CartContext.tsx
//
// Cart state with Supabase backend.
// - Gracefully handles network timeouts
// - Falls back silently if Realtime is unavailable
// - Optimistic UI updates for remove/update

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { emailService } from '@/services/emailService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id:         string;
  product_id: string;
  quantity:   number;
  products: {
    id:    string;
    name:  string;
    price: number;
    image: string;
    vendor_id?: string;
  };
}

interface CartContextValue {
  cartItems:      CartItem[];
  cartCount:      number;
  cartTotal:      number;
  loading:        boolean;
  addToCart:      (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart:      () => Promise<void>;
  refreshCart:    () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.products.price * i.quantity, 0);

  // ── Fetch cart ──────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!user?.id) { setCartItems([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`id, product_id, quantity, products (id, name, price, image, vendor_id)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const isNetworkError = error.message?.toLowerCase().includes('timeout') ||
                               error.message?.toLowerCase().includes('network') ||
                               error.message?.toLowerCase().includes('fetch');
        if (isNetworkError && retryCount.current < 3) {
          const delay = Math.pow(2, retryCount.current) * 1500;
          retryCount.current += 1;
          console.log(`[CartContext] Network error, retry ${retryCount.current} in ${delay}ms`);
          retryTimer.current = setTimeout(fetchCart, delay);
        } else {
          retryCount.current = 0;
          console.warn('[CartContext] fetchCart error:', error.message);
        }
        return;
      }

      retryCount.current = 0;
      if (data) setCartItems(data as unknown as CartItem[]);

    } catch (err: any) {
      console.warn('[CartContext] fetchCart exception:', err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── Setup: fetch + realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setCartItems([]);
      return;
    }

    fetchCart();

    // Realtime subscription — silently skip if unavailable
    let channel: any = null;
    try {
      channel = supabase
        .channel(`cart:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` },
          () => fetchCart()
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[CartContext] Realtime connected for user', user.id);
          }
          // CHANNEL_ERROR / TIMED_OUT — silently ignore, cart still works via direct fetch
        });
    } catch {
      // Realtime not available — cart updates happen on each action instead
    }

    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {});
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [user?.id]);

  // ── Add to cart ─────────────────────────────────────────────────────────────
  const addToCart = async (productId: string, quantity = 1) => {
    if (!user?.id) return;
    try {
      // Try RPC
      const { error: rpcError } = await supabase.rpc('upsert_cart_item', {
        p_user_id:    user.id,
        p_product_id: productId,
        p_quantity:   quantity,
      });

      if (rpcError) {
        // Manual fallback
        const { data: existing } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('cart_items')
            .insert({ user_id: user.id, product_id: productId, quantity });
        }
      }
      await fetchCart();

      // Trigger Cart Add Email
      if (user?.email) {
        const { data: p } = await supabase.from('products').select('name, price').eq('id', productId).single();
        if (p) {
          const userName = user.user_metadata?.name || user.email.split('@')[0] || 'Customer';
          emailService.cartAdd(user.email, userName, p.name, p.price);
        }
      }
    } catch (err: any) {
      console.warn('[CartContext] addToCart error:', err?.message);
    }
  };

  // ── Remove from cart ────────────────────────────────────────────────────────
  const removeFromCart = async (itemId: string) => {
    if (!user?.id) return;
    setCartItems(prev => prev.filter(i => i.id !== itemId)); // optimistic
    try {
      await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', user.id);
    } catch (err: any) {
      console.warn('[CartContext] removeFromCart error:', err?.message);
      fetchCart(); // revert
    }
  };

  // ── Update quantity ─────────────────────────────────────────────────────────
  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user?.id) return;
    if (quantity <= 0) { await removeFromCart(itemId); return; }
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i)); // optimistic
    try {
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .eq('user_id', user.id);
    } catch (err: any) {
      console.warn('[CartContext] updateQuantity error:', err?.message);
      fetchCart(); // revert
    }
  };

  // ── Clear cart ──────────────────────────────────────────────────────────────
  const clearCart = async () => {
    if (!user?.id) return;
    setCartItems([]);
    try {
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    } catch (err: any) {
      console.warn('[CartContext] clearCart error:', err?.message);
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems, cartCount, cartTotal, loading,
      addToCart, removeFromCart, updateQuantity,
      clearCart, refreshCart: fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}