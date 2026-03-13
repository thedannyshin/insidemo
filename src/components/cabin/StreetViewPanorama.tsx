import { useEffect, useRef, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';
import { densifyWaypoints } from '@/lib/densifyRoute';

/** Shortest-path lerp for angles in degrees */
const lerpAngle = (a: number, b: number, t: number) => {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const YOUTUBE_VIDEO_ID = 'c9OcB9CzKpA';

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeDataRef = useRef<any>(null);
  const playerReadyRef = useRef(false);

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }, []);

  // Load route data
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        if (data?.waypoints) {
          data.waypoints = densifyWaypoints(data.waypoints, 15);
        }
        routeDataRef.current = data;
      });
  }, []);

  // Listen for player ready message
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'yt360_ready') {
        playerReadyRef.current = true;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Sync heading/pitch and video timeline with route progress
  useEffect(() => {
    const rd = routeDataRef.current;
    if (!rd?.waypoints?.length || !playerReadyRef.current) return;

    const waypoints = rd.waypoints;
    const totalWp = waypoints.length;

    const floatIndex = routeProgress * (totalWp - 1);
    const idxA = Math.min(Math.floor(floatIndex), totalWp - 1);
    const idxB = Math.min(idxA + 1, totalWp - 1);
    const subT = floatIndex - idxA;

    const wpA = waypoints[idxA];
    const wpB = waypoints[idxB];

    const iHeading = lerpAngle(wpA.heading ?? 315, wpB.heading ?? 315, subT);

    // Apply user camera rotation as offset
    const headingOffsetDeg = (rotation.h * 180) / Math.PI;
    const pitchOffsetDeg = (rotation.v * 180) / Math.PI;
    const finalHeading = ((iHeading + 220 - headingOffsetDeg) % 360 + 360) % 360;
    const finalPitch = pitchOffsetDeg * 0.5 + 15; // +15° down to lower the horizon

    postToIframe({
      type: 'update_pov',
      heading: finalHeading,
      pitch: finalPitch,
    });

    // Sync video playback position with ride progress
    postToIframe({
      type: 'seek',
      progress: routeProgress,
    });
  }, [routeProgress, phase, rotation.h, rotation.v, postToIframe]);

  // Build the srcdoc HTML for the YouTube 360 player
  const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
#player{width:100%;height:100%}
</style>
</head>
<body>
<div id="player"></div>
<script>
var player, duration=0, ready=false;
var currentPov={yaw:315,pitch:0};
var targetPov={yaw:315,pitch:0};
var animFrame;

function lerpAngle(a,b,t){
  var d=((b-a+540)%360)-180;
  return a+d*t;
}

function animatePov(){
  if(player&&ready&&player.getSphericalProperties){
    var dy=Math.abs(((targetPov.yaw-currentPov.yaw+540)%360)-180);
    var dp=Math.abs(targetPov.pitch-currentPov.pitch);
    if(dy>0.05||dp>0.05){
      currentPov.yaw=lerpAngle(currentPov.yaw,targetPov.yaw,0.12);
      currentPov.pitch=currentPov.pitch+(targetPov.pitch-currentPov.pitch)*0.12;
      try{
        player.setSphericalProperties({yaw:currentPov.yaw,pitch:currentPov.pitch,roll:0,fov:100});
      }catch(e){}
    }
  }
  animFrame=requestAnimationFrame(animatePov);
}

function onYouTubeIframeAPIReady(){
  player=new YT.Player("player",{
    videoId:"${YOUTUBE_VIDEO_ID}",
    playerVars:{
      autoplay:1,
      mute:1,
      controls:0,
      disablekb:1,
      fs:0,
      modestbranding:1,
      rel:0,
      showinfo:0,
      iv_load_policy:3,
      playsinline:1,
      loop:1
    },
    events:{
      onReady:function(e){
        ready=true;
        duration=e.target.getDuration()||1;
        e.target.playVideo();
        parent.postMessage("yt360_ready","*");
        animatePov();
      }
    }
  });
}

window.addEventListener("message",function(e){
  var d;
  try{d=JSON.parse(e.data)}catch(x){return}
  if(!d||!d.type)return;
  if(d.type==="update_pov"){
    targetPov.yaw=d.heading||0;
    targetPov.pitch=d.pitch||0;
  }
  if(d.type==="seek"&&ready&&duration>0){
    var t=d.progress*duration;
    var ct=player.getCurrentTime()||0;
    if(Math.abs(ct-t)>2){
      player.seekTo(t,true);
    }
  }
});
</script>
<script src="https://www.youtube.com/iframe_api"></script>
</body>
</html>`;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#000', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        style={{ position: 'absolute', width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; gyroscope; autoplay"
        title="360 Video View"
      />
    </div>
  );
};

export default StreetViewPanorama;
