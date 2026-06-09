import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getVendorOrders } from '@/services/vendorService';
import { supabase } from '@/services/supabase';
import { VendorOrder } from '@/types/vendor';

export function useVendorOrdersData() {
  const { profile } = useAuth();
  const [orders,     setOrders]     = useState<VendorOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await getVendorOrders(profile.id);
      setOrders(data);
    } catch (e) {
      console.error('[Vendor Orders]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime: auto-refresh whenever an order for this vendor is inserted or updated
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`vendor-orders-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${profile.id}`,
        },
        () => { fetchOrders(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, fetchOrders]);

  return { orders, loading, refreshing, setRefreshing, fetchOrders };
}
