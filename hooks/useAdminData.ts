import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';

export function useAdminData() {
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0, totalOrders: 0, totalUsers: 0, totalRevenue: 0,
    pendingOrders: 0, paidOrders: 0, shippedOrders: 0, deliveredOrders: 0,
    totalVendors: 0, pendingApplications: 0, pendingPayouts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: products }, { count: orders }, { count: users },
        { data: orderData }, { data: recent },
        { count: vendors }, { count: pendingApps }, { count: pendingPayouts },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price, status'),
        supabase.from('orders').select('id, total_price, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
        supabase.from('vendor_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('vendor_payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      const revenue = orderData?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
      setStats({
        totalProducts: products ?? 0, totalOrders: orders ?? 0, totalUsers: users ?? 0,
        totalRevenue: revenue,
        pendingOrders:   orderData?.filter(o => o.status === 'pending').length   ?? 0,
        paidOrders:      orderData?.filter(o => o.status === 'paid').length      ?? 0,
        shippedOrders:   orderData?.filter(o => o.status === 'shipped').length   ?? 0,
        deliveredOrders: orderData?.filter(o => o.status === 'delivered').length ?? 0,
        totalVendors: vendors ?? 0, pendingApplications: pendingApps ?? 0, pendingPayouts: pendingPayouts ?? 0,
      });
      setRecentOrders(recent ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const channel = supabase.channel('admin-dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_applications' }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  return { loading, refreshing, setRefreshing, stats, recentOrders, fetchStats };
}
