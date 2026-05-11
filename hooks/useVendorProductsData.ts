import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getVendorProducts } from '@/services/vendorService';
import { VendorProduct } from '@/types/vendor';

export function useVendorProductsData() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await getVendorProducts(profile.id);
      setProducts(data);
    } catch (e) {
      console.error('[Vendor Products]', e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, fetchProducts };
}
