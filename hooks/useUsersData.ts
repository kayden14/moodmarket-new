import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { AdminProfile } from '@/types/admin';

export function useUsersData() {
  const [users,   setUsers]   = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) console.error('[Admin Users]', error.message);
    if (data) setUsers(data as AdminProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, []);
  return { users, loading, fetchUsers, setUsers };
}
