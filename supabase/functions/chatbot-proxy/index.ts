import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, profileName } = body;
    console.log(`[Chatbot] Request from ${profileName}: ${message}`);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error('[Chatbot] GEMINI_API_KEY is missing');
      throw new Error('GEMINI_API_KEY not set in Supabase secrets');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are an empathetic AI assistant for MoodMarket, a mood-aware marketplace. 
    The user's name is ${profileName || 'User'}. 
    Keep your responses helpful, concise, and empathetic. 
    If the user is feeling low, offer comfort and perhaps suggest they scan their mood or look at "Calming" products.
    If they are happy, celebrate with them.
    
    User message: ${message}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await res.json();
    console.log('[Chatbot] Gemini Response:', JSON.stringify(data));
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here for you! How can I help?";

    return new Response(
      JSON.stringify({ text: botResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    console.error('[chatbot-proxy]', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
