import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315];
const PITCHES = [-15, 0, 15];
const IMAGE_WIDTH = 1280;
const IMAGE_HEIGHT = 720;
const FOV = 100;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GOOGLE_MAPS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const waypoints: { lat: number; lng: number }[] = body.waypoints;

    if (!waypoints?.length) {
      return new Response(
        JSON.stringify({ error: "No waypoints provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { path: string; status: string }[] = [];
    let cached = 0;
    let downloaded = 0;

    for (const wp of waypoints) {
      for (const heading of HEADINGS) {
        for (const pitch of PITCHES) {
          const path = `${wp.lat.toFixed(4)}_${wp.lng.toFixed(4)}/${heading}_${pitch}.jpg`;

          // Check if already cached
          const { data: existing } = await supabase.storage
            .from("streetview-cache")
            .list(`${wp.lat.toFixed(4)}_${wp.lng.toFixed(4)}`, {
              search: `${heading}_${pitch}.jpg`,
            });

          if (existing && existing.length > 0) {
            cached++;
            results.push({ path, status: "already_cached" });
            continue;
          }

          // Fetch from Google Street View Static API
          const svUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
          svUrl.searchParams.set("size", `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
          svUrl.searchParams.set("location", `${wp.lat},${wp.lng}`);
          svUrl.searchParams.set("heading", String(heading));
          svUrl.searchParams.set("pitch", String(pitch));
          svUrl.searchParams.set("fov", String(FOV));
          svUrl.searchParams.set("source", "outdoor");
          svUrl.searchParams.set("return_error_code", "true");
          svUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);

          const response = await fetch(svUrl.toString());
          if (!response.ok) {
            results.push({ path, status: `fetch_error_${response.status}` });
            continue;
          }

          const imageBytes = new Uint8Array(await response.arrayBuffer());

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("streetview-cache")
            .upload(path, imageBytes, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (uploadError) {
            results.push({ path, status: `upload_error: ${uploadError.message}` });
          } else {
            downloaded++;
            results.push({ path, status: "downloaded" });
          }

          // Small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    }

    return new Response(
      JSON.stringify({
        total: results.length,
        cached,
        downloaded,
        errors: results.filter((r) => r.status.includes("error")).length,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
