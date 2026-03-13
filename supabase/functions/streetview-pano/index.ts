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
  const lat = url.searchParams.get("lat") || "37.7855";
  const lng = url.searchParams.get("lng") || "-122.4057";
  const heading = url.searchParams.get("heading") || "315";
  const pitch = url.searchParams.get("pitch") || "0";

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0}
  html,body{width:100%;height:100%;overflow:hidden;background:#000}
  #pano{width:100%;height:100%}
</style>
</head><body>
<div id="pano"></div>
<script>
let panorama;
function initPano(){
  panorama=new google.maps.StreetViewPanorama(document.getElementById('pano'),{
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
    disableDoubleClickZoom:true,
  });
  // Listen for POV changes and report back to parent
  panorama.addListener('pov_changed',function(){
    const pov=panorama.getPov();
    window.parent.postMessage({type:'pov_changed',heading:pov.heading,pitch:pov.pitch},'*');
  });
}
window.addEventListener('message',function(e){
  if(!panorama||!e.data) return;
  if(e.data.type==='update_position'){
    panorama.setPosition({lat:e.data.lat,lng:e.data.lng});
  }
  if(e.data.type==='update_pov'){
    panorama.setPov({heading:e.data.heading||0,pitch:e.data.pitch||0});
  }
  if(e.data.type==='update_all'){
    panorama.setPosition({lat:e.data.lat,lng:e.data.lng});
    panorama.setPov({heading:e.data.heading||0,pitch:e.data.pitch||0});
  }
});
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initPano" async defer></script>
</body></html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
});
