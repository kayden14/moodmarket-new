/**
 * hooks/useVendorsData.ts
 *
 * FIXES:
 *  - Delegates to getAllVendors() and getAllApplications() from vendorService
 *    so the returned shape (user_name, user_email, contact_email, etc.) exactly
 *    matches what vendors.tsx and approveVendorApplication() expect.
 *  - Only fetches 'pending' applications so approved/rejected don't reappear.
 *  - Added refreshing state for pull-to-refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAllVendors, getAllApplications } from '@/services/vendorService';

export function useVendorsData() {
  const [vendors,    setVendors]    = useState<any[]>([]);
  const [apps,       setApps]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Run both fetches in parallel
      const [vendorData, appData] = await Promise.all([
        getAllVendors(),
        getAllApplications('pending'), // only pending — keeps the list clean
      ]);
      setVendors(vendorData);
      setApps(appData);
    } catch (err) {
      console.error('useVendorsData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { vendors, apps, loading, refreshing, setRefreshing, fetchData };
}