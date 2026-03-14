import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    if (!videoId) {
      return new Response(JSON.stringify({ error: "videoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // YouTube provides equirectangular thumbnails for 360 videos
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing equirectangular 360° panorama images from driving videos. Your job is to identify the forward driving direction (where the road ahead is) and return the yaw heading angle in degrees (0-360) where:
- 0° = the center of the equirectangular image
- 90° = 1/4 from the right
- 180° = the far right/left edge (they wrap)
- 270° = 1/4 from the left

In an equirectangular projection, the horizontal pixel position maps linearly to yaw angle. The center column = 0° (or 360°), left edge = -180° (or 180°), right edge = 180°.

Look for:
1. The main road/lane extending into the distance
2. Lane markings, road surface, vanishing point
3. The direction the vehicle appears to be traveling

Return ONLY a JSON object with a single "heading" field (number 0-360). No other text.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this equirectangular 360° panorama from a driving video. Find the forward driving direction and return the heading angle.",
              },
              {
                type: "image_url",
                image_url: { url: thumbnailUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract heading from response
    let heading = 315; // fallback
    try {
      const jsonMatch = content.match(/\{[^}]*"heading"\s*:\s*([\d.]+)[^}]*\}/);
      if (jsonMatch) {
        heading = parseFloat(jsonMatch[1]);
        if (isNaN(heading) || heading < 0 || heading > 360) heading = 315;
      }
    } catch {
      console.error("Failed to parse heading from:", content);
    }

    return new Response(JSON.stringify({ heading, videoId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-heading error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
