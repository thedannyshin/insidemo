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

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "37.7855");
  const lng = parseFloat(url.searchParams.get("lng") || "-122.4057");
  const heading = parseFloat(url.searchParams.get("heading") || "315");
  const pitch = parseFloat(url.searchParams.get("pitch") || "0");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}html,body,#pano{width:100%;height:100%;overflow:hidden;background:#000}</style>
</head>
<body>
<div id="pano"></div>
<script>
function initPano(){
  var p=new google.maps.StreetViewPanorama(document.getElementById("pano"),{
    position:{lat:${lat},lng:${lng}},
    pov:{heading:${heading},pitch:${pitch}},
    zoom:0,
    disableDefaultUI:true,
    showRoadLabels:false,
    motionTracking:false,
    motionTrackingControl:false,
    linksControl:false,
    clickToGo:false,
    scrollwheel:false,
    disableDoubleClickZoom:true
  });
  p.addListener("pov_changed",function(){
    var v=p.getPov();
    window.parent.postMessage({type:"pov_changed",heading:v.heading,pitch:v.pitch},"*");
  });
  window.addEventListener("message",function(e){
    if(!e.data||!p)return;
    if(e.data.type==="update_pov"){p.setPov({heading:e.data.heading||0,pitch:e.data.pitch||0})}
    if(e.data.type==="update_position"){p.setPosition({lat:e.data.lat,lng:e.data.lng})}
    if(e.data.type==="update_all"){p.setPosition({lat:e.data.lat,lng:e.data.lng});p.setPov({heading:e.data.heading||0,pitch:e.data.pitch||0})}
  });
}
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initPano"></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
