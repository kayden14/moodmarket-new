import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { AdminOrder } from '@/types/admin';

export function useOrdersData() {
  const [orders,    setOrders]    = useState<AdminOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles!user_id(name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data as AdminOrder[]);
    } catch (e) {
      console.error('[Admin Orders]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, []);
  return { orders, loading, refreshing, setRefreshing, fetchOrders, setOrders };
}
