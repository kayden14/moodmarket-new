/**
 * hooks/useAdminData.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';

interface AdminStats {
  totalProducts:   number;
  totalOrders:     number;
  totalUsers:      number;
  totalRevenue:    number;
  pendingOrders:   number;
  paidOrders:      number;
  shippedOrders:   number;
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
      // ── DEBUG: remove this block once everything is working ──────────────
      const { data: { session } } = await supabase.auth.getSession();
      console.log('=== ADMIN DEBUG ===');
      console.log('Session user:', session?.user?.id, session?.user?.email);

      const { data: selfProfile } = await supabase
        .from('profiles')
        .select('id, role, is_admin')
        .eq('id', session?.user?.id ?? '')
        .single();
      console.log('Self profile:', selfProfile);

      const { data: testOrders, error: testError } = await supabase
        .from('orders')
        .select('id')
        .limit(3);
      console.log('Test orders:', testOrders, 'Error:', testError?.message);
      // ── END DEBUG ────────────────────────────────────────────────────────

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
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*',   { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),

        supabase
          .from('orders')
          .select('total_price')
          .not('status', 'eq', 'cancelled'),

        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'shipped'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),

        supabase
          .from('orders')
          .select('id, total_price, status, created_at, profiles(name, email)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // ── DEBUG: log every result so we can see what's null ────────────────
      console.log('productsRes count:', productsRes.count, 'error:', productsRes.error?.message);
      console.log('ordersRes count:',   ordersRes.count,   'error:', ordersRes.error?.message);
      console.log('usersRes count:',    usersRes.count,    'error:', usersRes.error?.message);
      console.log('revenueRes data:',   revenueRes.data,   'error:', revenueRes.error?.message);
      console.log('recentRes data:',    recentRes.data,    'error:', recentRes.error?.message);
      // ── END DEBUG ────────────────────────────────────────────────────────

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