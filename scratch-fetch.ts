import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await supabase.from('profiles').select('email, name, role');
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  if (data?.length) {
      console.log('Sample:', data[0]);
  }
}
run();
