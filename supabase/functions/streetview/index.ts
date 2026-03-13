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
  const lat = Number(url.searchParams.get("lat") || "37.7855");
  const lng = Number(url.searchParams.get("lng") || "-122.4057");
  const heading = Number(url.searchParams.get("heading") || "0");
  const pitch = Number(url.searchParams.get("pitch") || "0");

  const safeLat = Number.isFinite(lat) ? lat : 37.7855;
  const safeLng = Number.isFinite(lng) ? lng : -122.4057;
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  const safePitch = Number.isFinite(pitch) ? pitch : 0;

  const html = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0}
  html,body,#pano{width:100%;height:100%;overflow:hidden;background:#0a0e1a}
  .gm-style .gm-bundled-control,.gm-style .gmnoprint,.gm-style .gm-style-cc,
  .gm-style a[href],.gm-style .gm-iv-address,.gm-style .gm-compass,
  .gm-style .gm-fullscreen-control{display:none!important}
</style>
</head><body>
<div id="pano"></div>
<script>
let panorama;
let streetViewService;
let lastKnownLocation={lat:${safeLat},lng:${safeLng}};

function normalizeHeading(h){
  return ((h % 360) + 360) % 360;
}

function applyNearestPanorama(lat,lng,heading,pitch){
  if(!streetViewService||!panorama) return;
  const target={lat,lng};
  streetViewService.getPanorama(
    { location: target, radius: 120, source: google.maps.StreetViewSource.OUTDOOR },
    function(data,status){
      if(status==='OK' && data && data.location && data.location.pano){
        panorama.setPano(data.location.pano);
        panorama.setPov({heading: normalizeHeading(heading), pitch: pitch || 0});
        panorama.setVisible(true);
        if(data.location.latLng){
          lastKnownLocation={lat:data.location.latLng.lat(),lng:data.location.latLng.lng()};
        }
      }else{
        panorama.setPosition(lastKnownLocation);
        panorama.setPov({heading: normalizeHeading(heading), pitch: pitch || 0});
      }
    }
  );
}

function initMap(){
  streetViewService=new google.maps.StreetViewService();
  panorama=new google.maps.StreetViewPanorama(document.getElementById('pano'),{
    position:{lat:${safeLat},lng:${safeLng}},
    pov:{heading:${safeHeading},pitch:${safePitch}},
    zoom:1,
    disableDefaultUI:true,
    showRoadLabels:false,
    motionTracking:false,
    clickToGo:false,
    scrollwheel:false,
    linksControl:false,
    panControl:false,
    zoomControl:false,
    fullscreenControl:false,
    addressControl:false,
    enableCloseButton:false,
    visible:true,
  });

  applyNearestPanorama(${safeLat}, ${safeLng}, ${safeHeading}, ${safePitch});
}

window.addEventListener('message',function(e){
  if(!panorama||!e.data) return;
  try{
    const d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.lat!==undefined&&d.lng!==undefined){
      applyNearestPanorama(Number(d.lat), Number(d.lng), Number(d.heading||0), Number(d.pitch||0));
    }
  }catch{}
});
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap" async defer></script>
</body></html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "ALLOWALL",
    },
  });
});
