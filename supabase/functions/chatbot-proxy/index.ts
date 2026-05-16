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
    const { message, profileName, conversationHistory } = body;

    console.log(`[Chatbot] Request from ${profileName}: ${message}`);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error('[Chatbot] GEMINI_API_KEY is missing');
      throw new Error('GEMINI_API_KEY not set in Supabase secrets');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a helpful AI assistant for MoodMarket, a mood-aware online marketplace based in Ghana.
The user's name is ${profileName || 'User'}.

You can help with TWO types of questions — handle BOTH intelligently:

1. MOOD & EMOTIONAL SUPPORT:
   - Detect the user's mood from their message
   - Offer empathy and comfort when they feel low
   - Celebrate with them when they're happy
   - Suggest they try the mood scanner feature for personalized product recommendations

2. APP & SHOPPING QUESTIONS (answer these directly and helpfully):
   - How to place an order: Browse products → tap a product → tap "Add to Cart" → go to Cart tab → tap Checkout → fill in delivery details → confirm order
   - How to use the app: The home screen shows mood-based product recommendations. Use the bottom tabs to navigate: Home, Search, Cart, Profile
   - How to scan mood: Tap the camera icon or "Re-scan" button at the top to scan your face for mood detection
   - Payments: Supported via mobile money and card at checkout
   - Delivery: Vendors handle delivery; you can track orders in your Profile → Orders
   - Account: Sign up/login via email. Edit profile in Profile tab
   - Products: Browse by mood category or search by name
   - Vendors: Sellers can apply to become a vendor via Profile → Become a Vendor
   - Prices: Listed in Ghana Cedis (GH₵)
   - Support: Users can chat here anytime for help

Always be concise, warm, and helpful. If you don't know a specific detail, say so honestly and suggest they check the app or contact support.
Never ignore a question — always give a direct, useful answer.`;

    // Build conversation contents
    const contents = [];
    
    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        }
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
