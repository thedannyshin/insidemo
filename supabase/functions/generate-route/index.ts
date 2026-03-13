import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Decode Google's encoded polyline format
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
function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Calculate heading from point a to point b (in degrees)
function calcHeading(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const heading = (Math.atan2(y, x) * 180) / Math.PI;
  return ((heading % 360) + 360) % 360;
}

// Subsample polyline points to a target spacing in meters
function subsample(
  points: { lat: number; lng: number }[],
  spacingMeters: number
): { lat: number; lng: number }[] {
  if (points.length < 2) return points;
  const result = [points[0]];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    accumulated += haversineDistance(points[i - 1], points[i]);
    if (accumulated >= spacingMeters) {
      result.push(points[i]);
      accumulated = 0;
    }
  }

  // Always include the last point
  const last = points[points.length - 1];
  const lastAdded = result[result.length - 1];
  if (last.lat !== lastAdded.lat || last.lng !== lastAdded.lng) {
    result.push(last);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!GOOGLE_MAPS_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing GOOGLE_MAPS_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { origin, destination, spacingMeters = 30 } = body;

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: "origin and destination required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Directions API
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK" || !data.routes?.length) {
      return new Response(
        JSON.stringify({ error: `Directions API: ${data.status}`, details: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Decode the full polyline for maximum detail
    const allPoints = decodePolyline(route.overview_polyline.points);

    // Also decode step-level polylines for even more detail
    let detailedPoints: { lat: number; lng: number }[] = [];
    for (const step of leg.steps) {
      const stepPoints = decodePolyline(step.polyline.points);
      // Avoid duplicating the junction point
      if (detailedPoints.length > 0 && stepPoints.length > 0) {
        stepPoints.shift();
      }
      detailedPoints = detailedPoints.concat(stepPoints);
    }

    // Use whichever has more points
    const rawPoints = detailedPoints.length > allPoints.length ? detailedPoints : allPoints;

    // Subsample to target spacing
    const sampled = subsample(rawPoints, spacingMeters);

    // Build waypoints with heading calculated from road direction
    const waypoints = sampled.map((pt, i) => {
      const next = sampled[Math.min(i + 1, sampled.length - 1)];
      const heading = calcHeading(pt, next);
      // Estimate speed based on position in route
      const progress = i / (sampled.length - 1);
      let speed = 25;
      if (progress < 0.05 || progress > 0.95) speed = 10;
      else if (progress < 0.1 || progress > 0.9) speed = 15;
      else speed = 20 + Math.random() * 10;

      return {
        lat: pt.lat,
        lng: pt.lng,
        heading: Math.round(heading * 10) / 10,
        speed: Math.round(speed),
        eta: Math.round((1 - progress) * (leg.duration.value / 60)),
      };
    });

    // Build step instructions for turn annotations
    const steps = leg.steps.map((s: any) => ({
      instruction: s.html_instructions?.replace(/<[^>]*>/g, "") || "",
      distance: s.distance?.text || "",
      duration: s.duration?.text || "",
      startLat: s.start_location?.lat,
      startLng: s.start_location?.lng,
    }));

    const result = {
      origin: leg.start_address,
      destination: leg.end_address,
      totalDistance: leg.distance.text,
      estimatedTime: Math.round(leg.duration.value / 60),
      waypointCount: waypoints.length,
      rawPointCount: rawPoints.length,
      waypoints,
      steps,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
