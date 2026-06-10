import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log("Invoking edge function...");
  const { data, error } = await supabase.functions.invoke('send-email-notification', {
    body: {
      type: 'order_status_update',
      to: 'test@example.com', // use a dummy email to see if the function itself errors out early or succeeds
      payload: { orderId: 'test1234', status: 'delivered', name: 'Test', total: 100, items: [] },
    },
  });
  console.log("Data:", data);
  console.log("Error:", error);
}
check();
