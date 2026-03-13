import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEADINGS_OFFSETS = [0, 45, 90, 135, 180, 225, 270, 315]; // offsets from base heading
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
    const waypoints: { lat: number; lng: number; heading?: number }[] = body.waypoints;

    if (!waypoints?.length) {
      return new Response(
        JSON.stringify({ error: "No waypoints provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Fetch metadata for each waypoint to get real camera heading
    const metadataList: {
      lat: number;
      lng: number;
      panoLat: number;
      panoLng: number;
      heading: number;
      panoId: string;
    }[] = [];

    for (const wp of waypoints) {
      const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${wp.lat},${wp.lng}&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`;
      try {
        const metaRes = await fetch(metaUrl);
        const meta = await metaRes.json();
        if (meta.status === "OK") {
          // Calculate heading toward the next waypoint using the snapped pano position
          const wpIdx = waypoints.indexOf(wp);
          const nextWp = waypoints[Math.min(wpIdx + 1, waypoints.length - 1)];
          const dLng = nextWp.lng - (meta.location?.lng || wp.lng);
          const dLat = nextWp.lat - (meta.location?.lat || wp.lat);
          const calcHeading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
          const normalizedHeading = ((calcHeading % 360) + 360) % 360;

          metadataList.push({
            lat: wp.lat,
            lng: wp.lng,
            panoLat: meta.location?.lat || wp.lat,
            panoLng: meta.location?.lng || wp.lng,
            heading: normalizedHeading,
            panoId: meta.pano_id || "",
          });
        } else {
          // Fallback: calculate heading from waypoint vectors
          const wpIdx = waypoints.indexOf(wp);
          const nextWp = waypoints[Math.min(wpIdx + 1, waypoints.length - 1)];
          const dLng = nextWp.lng - wp.lng;
          const dLat = nextWp.lat - wp.lat;
          const calcHeading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
          metadataList.push({
            lat: wp.lat,
            lng: wp.lng,
            panoLat: wp.lat,
            panoLng: wp.lng,
            heading: ((calcHeading % 360) + 360) % 360,
            panoId: "",
          });
        }
      } catch {
        const wpIdx = waypoints.indexOf(wp);
        const nextWp = waypoints[Math.min(wpIdx + 1, waypoints.length - 1)];
        const dLng = nextWp.lng - wp.lng;
        const dLat = nextWp.lat - wp.lat;
        const calcHeading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        metadataList.push({
          lat: wp.lat,
          lng: wp.lng,
          panoLat: wp.lat,
          panoLng: wp.lng,
          heading: ((calcHeading % 360) + 360) % 360,
          panoId: "",
        });
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    // Step 2: Save metadata as JSON
    const metaJson = JSON.stringify(metadataList, null, 2);
    await supabase.storage
      .from("streetview-cache")
      .upload("metadata.json", new TextEncoder().encode(metaJson), {
        contentType: "application/json",
        upsert: true,
      });

    // Step 3: Download images at offsets from real heading
    let cached = 0;
    let downloaded = 0;
    const results: { path: string; status: string }[] = [];

    for (const meta of metadataList) {
      const folder = `${meta.lat.toFixed(4)}_${meta.lng.toFixed(4)}`;

      for (const offset of HEADINGS_OFFSETS) {
        const absHeading = ((meta.heading + offset) % 360 + 360) % 360;

        for (const pitch of PITCHES) {
          const path = `${folder}/${offset}_${pitch}.jpg`;

          // Check if already cached
          const { data: existing } = await supabase.storage
            .from("streetview-cache")
            .list(folder, { search: `${offset}_${pitch}.jpg` });

          if (existing && existing.length > 0) {
            cached++;
            results.push({ path, status: "already_cached" });
            continue;
          }

          // Fetch from Google using the actual pano position for better accuracy
          const svUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
          svUrl.searchParams.set("size", `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
          if (meta.panoId) {
            svUrl.searchParams.set("pano", meta.panoId);
          } else {
            svUrl.searchParams.set("location", `${meta.panoLat},${meta.panoLng}`);
          }
          svUrl.searchParams.set("heading", String(Math.round(absHeading)));
          svUrl.searchParams.set("pitch", String(pitch));
          svUrl.searchParams.set("fov", String(FOV));
          svUrl.searchParams.set("return_error_code", "true");
          svUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);

          const response = await fetch(svUrl.toString());
          if (!response.ok) {
            results.push({ path, status: `fetch_error_${response.status}` });
            continue;
          }

          const imageBytes = new Uint8Array(await response.arrayBuffer());
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
        metadata: metadataList,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
