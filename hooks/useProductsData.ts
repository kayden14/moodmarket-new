import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { AdminProduct } from '@/types/admin';

export function useProductsData() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, profiles!vendor_id(name, store_name)')
      .order('created_at', { ascending: false });
    if (error) console.error('[Admin Products]', error.message);
    if (data) setProducts(data.map((p: any) => ({
      ...p,
      vendor_name: p.profiles?.store_name || p.profiles?.name || null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, []);
  return { products, loading, fetchProducts };
}
