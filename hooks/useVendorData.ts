import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getVendorStats, VendorStats } from '@/services/vendorService';

export function useVendorData() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await getVendorStats(profile.id);
      setStats(data);
    } catch (e) {
      console.error('[Vendor Dashboard]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refreshing, setRefreshing, fetchStats };
}
