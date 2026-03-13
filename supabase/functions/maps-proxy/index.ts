import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

    const { action, input, placeId } = await req.json();

    if (action === "autocomplete") {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment|geocode&location=37.7749,-122.4194&radius=20000&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "details") {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "directions") {
      const { origin, destination: dest } = await req.json().catch(() => ({ origin: null, destination: null }));
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin || "Market St & 4th St, San Francisco")}&destination=${encodeURIComponent(dest || input)}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("maps-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
