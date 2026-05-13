/**
 * hooks/useOrdersData.ts
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
          products,
          delivery_address,
          delivery_phone,
          payment_method,
          payment_reference,
          profiles!orders_user_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalised: AdminOrder[] = (data ?? []).map((o: any) => ({
        id:                o.id,
        user_id:           o.user_id,
        total_price:       o.total_price,
        status:            o.status,
        created_at:        o.created_at,
        shipping_address:  o.delivery_address  ?? null,
        delivery_phone:    o.delivery_phone    ?? null,
        payment_method:    o.payment_method    ?? null,
        payment_reference: o.payment_reference ?? null,
        profiles:          o.profiles          ?? null,
        products:          Array.isArray(o.products) ? o.products : [],
      }));

      setOrders(normalised);
    } catch (err) {
      console.error('useOrdersData error:', err);
      setOrders([]);
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