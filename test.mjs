import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { error } = await supabase.from('orders').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    total_price: 10,
    status: 'pending',
    payment_reference: 'test',
    payment_method: 'card',
    delivery_name: 'test',
    delivery_address: 'test',
    delivery_phone: '123'
  });
  console.log('Insert Error:', error);
}

testInsert();
