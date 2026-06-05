import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch customers
    const { data: customers, error } = await supabaseClient
      .from("profiles")
      .select("email, name")
      .in("role", ["customer", "vendor"]);

    if (error) {
      throw error;
    }

    let successCount = 0;
    
    // Dispatch emails (we can use the same edge function URL)
    const emailFuncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email-notification`;
    
    for (const customer of customers || []) {
      if (!customer.email) continue;
      
      const res = await fetch(emailFuncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({
          type: "check_in",
          to: customer.email,
          payload: { name: customer.name || "Customer" }
        })
      });
      
      if (res.ok) {
        successCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, count: successCount }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
