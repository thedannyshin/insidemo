import { useEffect, useRef, useCallback, useState } from 'react';
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

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const initialHeading = useRideStore((s) => s.initialHeading);
  const setEta = useRideStore((s) => s.setEta);
  const selectedVideoId = useRideStore((s) => s.selectedVideoId);
  const rotation = useCameraOffset((s) => s.rotation);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeDataRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }, []);

  // Reset ready state when video changes
  useEffect(() => {
    setPlayerReady(false);
  }, [selectedVideoId]);

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
        setPlayerReady(true);
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
    if (!playerReady) return;

    const rd = routeDataRef.current;
    let iHeading = initialHeading; // AI-detected or default heading

    if (phase === 'riding' && rd?.waypoints?.length && routeProgress > 0) {
      const waypoints = rd.waypoints;
      const totalWp = waypoints.length;
      const floatIndex = routeProgress * (totalWp - 1);
      const idxA = Math.min(Math.floor(floatIndex), totalWp - 1);
      const idxB = Math.min(idxA + 1, totalWp - 1);
      const subT = floatIndex - idxA;
      iHeading = lerpAngle(waypoints[idxA].heading ?? initialHeading, waypoints[idxB].heading ?? initialHeading, subT);
    }

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

  }, [routeProgress, phase, rotation, postToIframe, playerReady, initialHeading]);

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
/* Hide all YouTube UI overlays */
.ytp-chrome-top,.ytp-chrome-bottom,.ytp-gradient-top,.ytp-gradient-bottom,
.ytp-watermark,.ytp-show-cards-title,.ytp-pause-overlay,.ytp-spinner,
.ytp-title,.ytp-button,.ytp-menuitem,.ytp-popup,.ytp-tooltip,
.ytp-share-button-visible,.ytp-overflow-button,.iv-branding,
.annotation,.ytp-ce-element,.ytp-endscreen-content,
.ytp-impression-link,.branding-img-container{
  display:none!important;opacity:0!important;pointer-events:none!important;
}
iframe{border:none}
</style>
</head>
<body>
<div id="player"></div>
<script>
var player, duration=0, ready=false;
var currentPov={yaw:315,pitch:0};
var etaTimer, povEnforcer;

function lerpAngle(a,b,t){
  var d=((b-a+540)%360)-180;
  return a+d*t;
}

function reportRemaining(){
  if(!player||!ready||duration<=0||!player.getCurrentTime)return;
  var ct=player.getCurrentTime()||0;
  parent.postMessage({type:"yt360_time",remaining:Math.max(0,Math.round(duration-ct))},"*");
}

function setPov(){
  if(player&&ready&&player.setSphericalProperties){
    try{
      player.setSphericalProperties({yaw:currentPov.yaw,pitch:currentPov.pitch,roll:0,fov:100,enableOrientationSensor:false});
    }catch(e){}
  }
}

function onYouTubeIframeAPIReady(){
  player=new YT.Player("player",{
    videoId:"${selectedVideoId}",
    playerVars:{
      autoplay:0,
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
        e.target.mute();
        e.target.seekTo(0,true);
        e.target.playVideo();
        setTimeout(function(){ e.target.pauseVideo(); },300);
        parent.postMessage("yt360_ready","*");
        reportRemaining();
        etaTimer=setInterval(reportRemaining,500);
        // Enforce POV periodically to prevent YouTube auto-rotation
        povEnforcer=setInterval(setPov,10);
        setPov();
      },
      onStateChange:function(e){
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
    currentPov.yaw=d.heading||0;
    currentPov.pitch=d.pitch||0;
    setPov();
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
        key={selectedVideoId}
        ref={iframeRef}
        srcDoc={srcdoc}
        style={{ position: 'absolute', width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
        allow="accelerometer; gyroscope; autoplay"
        title="360 Video View"
      />
    </div>
  );
};

export default StreetViewPanorama;
