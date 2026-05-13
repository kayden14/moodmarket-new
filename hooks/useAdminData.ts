/**
 * hooks/useAdminData.ts
 * FIXES:
 *  - Revenue now sums total_price from ALL orders (not just paid) — adjust the
 *    .in('status', [...]) filter below if you only want paid/delivered revenue
 *  - Each count uses a separate lightweight query with { count: 'exact', head: true }
 *    so we don't pull full rows just for counts
 *  - recentOrders fetches the 5 most recent with profiles joined
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';

interface AdminStats {
  totalProducts:  number;
  totalOrders:    number;
  totalUsers:     number;
  totalRevenue:   number;
  pendingOrders:  number;
  paidOrders:     number;
  shippedOrders:  number;
  deliveredOrders: number;
}

const DEFAULT_STATS: AdminStats = {
  totalProducts:   0,
  totalOrders:     0,
  totalUsers:      0,
  totalRevenue:    0,
  pendingOrders:   0,
  paidOrders:      0,
  shippedOrders:   0,
  deliveredOrders: 0,
};

export function useAdminData() {
  const [stats,        setStats]        = useState<AdminStats>(DEFAULT_STATS);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // Run all queries in parallel for speed
      const [
        productsRes,
        ordersRes,
        usersRes,
        revenueRes,
        pendingRes,
        paidRes,
        shippedRes,
        deliveredRes,
        recentRes,
      ] = await Promise.all([
        // Counts using head:true — no rows transferred, just the count
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*',   { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),

        // Revenue — fetch total_price for all non-cancelled orders
        supabase
          .from('orders')
          .select('total_price')
          .not('status', 'eq', 'cancelled'),

        // Status counts
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'shipped'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),

        // Recent orders with customer name
        supabase
          .from('orders')
          .select('id, total_price, status, created_at, profiles(name, email)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const revenue = (revenueRes.data ?? []).reduce(
        (sum: number, o: any) => sum + Number(o.total_price ?? 0),
        0,
      );

      setStats({
        totalProducts:   productsRes.count  ?? 0,
        totalOrders:     ordersRes.count    ?? 0,
        totalUsers:      usersRes.count     ?? 0,
        totalRevenue:    revenue,
        pendingOrders:   pendingRes.count   ?? 0,
        paidOrders:      paidRes.count      ?? 0,
        shippedOrders:   shippedRes.count   ?? 0,
        deliveredOrders: deliveredRes.count ?? 0,
      });

      setRecentOrders(recentRes.data ?? []);
    } catch (err) {
      console.error('useAdminData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats };
}