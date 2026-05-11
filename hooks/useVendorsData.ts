import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { getAllApplications, getAllVendors } from '@/services/vendorService';

export function useVendorsData() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [apps,    setApps]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [v, a] = await Promise.all([
        getAllVendors(),
        getAllApplications('pending'),
      ]);
      setVendors(v);
      setApps(a);
    } catch (e) {
      console.error('[Admin Vendors]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);
  return { vendors, apps, loading, fetchData, setVendors, setApps };
}
