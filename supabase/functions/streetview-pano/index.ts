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

  // Enhanced HTML with smooth crossfade transitions between panoramas
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
#pano{width:100%;height:100%;transition:opacity 0.5s ease-in-out}
#pano.fading{opacity:0.7}
</style>
</head>
<body>
<div id="pano"></div>
<script>
var pano, panoEl, fadeTimer, povAnimFrame;
var currentPov = {heading:${heading}, pitch:${pitch}};
var targetPov = {heading:${heading}, pitch:${pitch}};

function lerpAngle(a,b,t){
  var d=((b-a+540)%360)-180;
  return a+d*t;
}

function animatePov(){
  var dh=Math.abs(((targetPov.heading-currentPov.heading+540)%360)-180);
  var dp=Math.abs(targetPov.pitch-currentPov.pitch);
  if(dh>0.05||dp>0.05){
    currentPov.heading=lerpAngle(currentPov.heading,targetPov.heading,0.1);
    currentPov.pitch=currentPov.pitch+(targetPov.pitch-currentPov.pitch)*0.1;
    pano.setPov(currentPov);
  }
  povAnimFrame=requestAnimationFrame(animatePov);
}

function initPano(){
  panoEl=document.getElementById("pano");
  pano=new google.maps.StreetViewPanorama(panoEl,{
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

  // Start smooth POV animation loop
  animatePov();

  window.addEventListener("message",function(e){
    if(!e.data||!pano)return;
    if(e.data.type==="update_pov"){
      targetPov.heading=e.data.heading||0;
      targetPov.pitch=e.data.pitch||0;
    }
    if(e.data.type==="update_position"){
      // Crossfade on position change
      panoEl.classList.add("fading");
      pano.setPosition({lat:e.data.lat,lng:e.data.lng});
      clearTimeout(fadeTimer);
      fadeTimer=setTimeout(function(){panoEl.classList.remove("fading")},300);
    }
    if(e.data.type==="update_all"){
      // Crossfade on position change
      panoEl.classList.add("fading");
      pano.setPosition({lat:e.data.lat,lng:e.data.lng});
      targetPov.heading=e.data.heading||0;
      targetPov.pitch=e.data.pitch||0;
      clearTimeout(fadeTimer);
      fadeTimer=setTimeout(function(){panoEl.classList.remove("fading")},300);
    }
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
