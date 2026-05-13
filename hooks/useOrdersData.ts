/**
 * hooks/useOrdersData.ts
 * FIXES:
 *  - Selects total_price, status, created_at, and joins profiles + order_items → products
 *  - Normalises the products array so the modal can render it
 *  - Added refreshing state
 *
 * NOTE: Adjust the nested select to match your exact Supabase schema.
 *  Common schema:  orders → order_items (quantity, price) → products (name)
 *  If you store products directly as JSONB on orders, replace the join with
 *  .select('*, profiles(name, email)') and map item.products directly.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { AdminOrder } from '@/types/admin';

export function useOrdersData() {
  const [orders,     setOrders]     = useState<AdminOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          total_price,
          status,
          created_at,
          shipping_address,
          profiles (
            name,
            email
          ),
          order_items (
            quantity,
            price,
            products (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalise order_items → products array expected by the UI
      const normalised: AdminOrder[] = (data ?? []).map((o: any) => ({
        id:               o.id,
        user_id:          o.user_id,
        total_price:      o.total_price,
        status:           o.status,
        created_at:       o.created_at,
        shipping_address: o.shipping_address ?? null,
        profiles:         o.profiles ?? null,
        products: (o.order_items ?? []).map((item: any) => ({
          name:     item.products?.name ?? 'Unknown product',
          quantity: item.quantity,
          price:    item.price,
        })),
      }));

      setOrders(normalised);
    } catch (err) {
      console.error('useOrdersData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refreshing, setRefreshing, fetchOrders };
}