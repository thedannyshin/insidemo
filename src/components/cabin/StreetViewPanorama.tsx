import { useEffect, useRef, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';
import { useCameraBase } from './CameraDebugSliders';
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
  const setEta = useRideStore((s) => s.setEta);
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

  // Listen for player ready message, ETA updates and video control commands
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'yt360_ready') {
        playerReadyRef.current = true;
        return;
      }

      if (
        e.data &&
        typeof e.data === 'object' &&
        'type' in e.data &&
        (e.data as { type?: string }).type === 'yt360_time' &&
        'remaining' in e.data
      ) {
        const remaining = Number((e.data as { remaining?: number }).remaining);
        if (Number.isFinite(remaining)) {
          setEta(Math.max(0, Math.round(remaining)));
        }
      }
    };

    const controlHandler = (e: Event) => {
      const cmd = (e as CustomEvent).detail;
      if (cmd === 'play' || cmd === 'pause') {
        postToIframe({ type: cmd });
      }
    };
    window.addEventListener('message', handler);
    window.addEventListener('video_control', controlHandler);
    return () => {
      window.removeEventListener('message', handler);
      window.removeEventListener('video_control', controlHandler);
    };
  }, [postToIframe, setEta]);

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

    const videoMaxH = useCameraBase.getState().videoMaxH;
    const videoMaxV = useCameraBase.getState().videoMaxV;
    const videoHeadingOffset = useCameraBase.getState().videoHeadingOffset;
    const videoInvertH = useCameraBase.getState().videoInvertH;

    const maxCabinH = Math.PI * 0.45;
    const maxCabinV = 0.5;

    const rotationH = (rotation.h / maxCabinH) * videoMaxH * videoInvertH;
    const rotationV = (rotation.v / maxCabinV) * videoMaxV;

    const finalHeading = ((iHeading + videoHeadingOffset + rotationH) % 360 + 360) % 360;
    const finalPitch = rotationV;

    postToIframe({
      type: 'update_pov',
      heading: finalHeading,
      pitch: finalPitch,
    });

  }, [routeProgress, phase, rotation, postToIframe]);

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
var animFrame, etaTimer;

function lerpAngle(a,b,t){
  var d=((b-a+540)%360)-180;
  return a+d*t;
}

function reportRemaining(){
  if(!player||!ready||duration<=0||!player.getCurrentTime)return;
  var ct=player.getCurrentTime()||0;
  parent.postMessage({type:"yt360_time",remaining:Math.max(0,Math.round(duration-ct))},"*");
}

function animatePov(){
  if(player&&ready&&player.getSphericalProperties){
    try{
      player.setSphericalProperties({yaw:targetPov.yaw,pitch:targetPov.pitch,roll:0,fov:100});
    }catch(e){}
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
      loop:0,
      end:0,
      annotation:0
    },
    events:{
      onReady:function(e){
        ready=true;
        duration=e.target.getDuration()||1;
        e.target.playVideo();
        parent.postMessage("yt360_ready","*");
        reportRemaining();
        etaTimer=setInterval(reportRemaining,500);
        animatePov();
      },
      onStateChange:function(e){
        // YT.PlayerState.ENDED === 0 — seek back to freeze on last frame
        if(e.data===0&&duration>0){
          player.seekTo(duration-0.5,true);
          player.pauseVideo();
        }
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
  if(d.type==="play"&&ready){player.playVideo();}
  if(d.type==="pause"&&ready){player.pauseVideo();}
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
