import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Decode Google's encoded polyline into lat/lng pairs
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Calculate distance between two points in meters (Haversine)
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Sample points at regular intervals along the polyline
function sampleAtInterval(points: { lat: number; lng: number }[], intervalMeters: number): { lat: number; lng: number }[] {
  if (points.length < 2) return points;

  const sampled: { lat: number; lng: number }[] = [points[0]];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const dist = haversine(points[i - 1], points[i]);
    accumulated += dist;

    if (accumulated >= intervalMeters) {
      sampled.push(points[i]);
      accumulated = 0;
    }
  }

  // Always include last point
  const last = points[points.length - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (lastSampled.lat !== last.lat || lastSampled.lng !== last.lng) {
    sampled.push(last);
  }

  return sampled;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!GOOGLE_MAPS_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing GOOGLE_MAPS_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { origin, destination, intervalMeters = 30 } = body;

    if (!origin || !destination) {
      return new Response(JSON.stringify({ error: "origin and destination required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Google Directions API
    const dirUrl = new URL("https://maps.googleapis.com/maps/api/directions/json");
    dirUrl.searchParams.set("origin", origin);
    dirUrl.searchParams.set("destination", destination);
    dirUrl.searchParams.set("mode", "driving");
    dirUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    const dirRes = await fetch(dirUrl.toString());
    const dirData = await dirRes.json();

    if (dirData.status !== "OK" || !dirData.routes?.length) {
      return new Response(JSON.stringify({ error: `Directions API: ${dirData.status}`, details: dirData.error_message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const route = dirData.routes[0];
    const leg = route.legs[0];

    // Decode overview polyline for dense points
    const allPoints = decodePolyline(route.overview_polyline.points);

    // Sample at specified interval (default 30m ≈ one panorama)
    const sampled = sampleAtInterval(allPoints, intervalMeters);

    // Build waypoints with metadata from steps
    const steps = leg.steps || [];
    const totalDurationSec = leg.duration.value;
    const totalDistanceM = leg.distance.value;

    // Assign speed and street info by matching to nearest step
    const waypoints = sampled.map((pt, idx) => {
      // Find which step this point belongs to by accumulated distance
      let cumDist = 0;
      let matchedStep = steps[0];
      for (const step of steps) {
        const stepEnd = cumDist + step.distance.value;
        // Check if this point's approximate distance along the route falls within this step
        const ptProgress = idx / (sampled.length - 1);
        const ptDist = ptProgress * totalDistanceM;
        if (ptDist <= stepEnd) {
          matchedStep = step;
          break;
        }
        cumDist = stepEnd;
      }

      const speedMph = Math.round((matchedStep?.duration?.value > 0
        ? (matchedStep.distance.value / matchedStep.duration.value) * 2.237 // m/s to mph
        : 25));

      const progress = idx / (sampled.length - 1);
      const eta = Math.max(0, Math.round(totalDurationSec * (1 - progress)));

      // Extract street name from instructions
      const instruction = matchedStep?.html_instructions || "";
      const streetMatch = instruction.match(/(?:onto|on|along)\s+<b>(.+?)<\/b>/i);
      const streetName = streetMatch ? streetMatch[1] : (matchedStep?.name || "");

      // Turn instruction for first/last and when street changes
      let turnInstruction: string | undefined;
      if (idx === 0) turnInstruction = "Start";
      else if (idx === sampled.length - 1) turnInstruction = "Arrived";
      else if (matchedStep?.maneuver) {
        const maneuver = matchedStep.maneuver.replace(/-/g, " ");
        turnInstruction = `${maneuver.charAt(0).toUpperCase() + maneuver.slice(1)}${streetName ? ` onto ${streetName}` : ""}`;
      }

      return {
        lat: pt.lat,
        lng: pt.lng,
        speed: Math.max(0, Math.min(45, speedMph)),
        streetName: streetName || "Road",
        ...(turnInstruction ? { turnInstruction } : {}),
        eta,
      };
    });

    return new Response(
      JSON.stringify({
        origin: leg.start_address,
        destination: leg.end_address,
        totalDistance: leg.distance.text,
        estimatedTime: totalDurationSec,
        waypoints,
        rawPointCount: allPoints.length,
        sampledPointCount: sampled.length,
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
