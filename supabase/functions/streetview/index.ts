import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!GOOGLE_MAPS_API_KEY) {
    return new Response("GOOGLE_MAPS_API_KEY not configured", { status: 500, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat") || "37.7855");
    const lng = Number(url.searchParams.get("lng") || "-122.4057");
    const heading = Number(url.searchParams.get("heading") || "315");
    const pitch = Number(url.searchParams.get("pitch") || "0");
    const fov = Number(url.searchParams.get("fov") || "100");
    const width = Number(url.searchParams.get("w") || "1280");
    const height = Number(url.searchParams.get("h") || "720");

    const safeLat = Number.isFinite(lat) ? lat : 37.7855;
    const safeLng = Number.isFinite(lng) ? lng : -122.4057;
    const safeHeading = Number.isFinite(heading) ? ((heading % 360) + 360) % 360 : 315;
    const safePitch = Number.isFinite(pitch) ? Math.max(-90, Math.min(90, pitch)) : 0;
    const safeFov = Number.isFinite(fov) ? Math.max(10, Math.min(120, fov)) : 100;
    const safeW = Number.isFinite(width) ? Math.max(320, Math.min(1920, Math.round(width))) : 1280;
    const safeH = Number.isFinite(height) ? Math.max(240, Math.min(1080, Math.round(height))) : 720;

    const streetViewUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
    streetViewUrl.searchParams.set("size", `${safeW}x${safeH}`);
    streetViewUrl.searchParams.set("location", `${safeLat},${safeLng}`);
    streetViewUrl.searchParams.set("heading", String(safeHeading));
    streetViewUrl.searchParams.set("pitch", String(safePitch));
    streetViewUrl.searchParams.set("fov", String(safeFov));
    streetViewUrl.searchParams.set("source", "outdoor");
    streetViewUrl.searchParams.set("return_error_code", "true");
    streetViewUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(streetViewUrl.toString());

    if (!response.ok) {
      const body = await response.text();
      return new Response(JSON.stringify({
        error: "Street View upstream error",
        status: response.status,
        details: body,
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    const bytes = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
});
