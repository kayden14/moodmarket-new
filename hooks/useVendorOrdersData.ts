import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getVendorOrders } from '@/services/vendorService';
import { VendorOrder } from '@/types/vendor';

export function useVendorOrdersData() {
  const { profile } = useAuth();
  const [orders,    setOrders]    = useState<VendorOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refreshing, setRefreshing, fetchOrders };
}
