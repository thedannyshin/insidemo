import { useEffect, useRef } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const StreetViewPanorama = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const routeDataRef = useRef<any>(null);
  const baseHeadingRef = useRef(315);
  const iframeReady = useRef(false);

  // Load route data
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => { routeDataRef.current = data; });
  }, []);

  // Mark iframe as ready after load
  const handleIframeLoad = () => {
    iframeReady.current = true;
  };

  // Sync camera rotation to panorama POV
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframeReady.current) return;
    const headingOffset = (rotation.h * 180) / Math.PI;
    const pitchOffset = (rotation.v * 180) / Math.PI;
    iframe.contentWindow.postMessage({
      type: 'update_pov',
      heading: baseHeadingRef.current - headingOffset,
      pitch: pitchOffset * 0.5,
    }, '*');
  }, [rotation.h, rotation.v]);

  // Sync route progress to panorama position
  useEffect(() => {
    const iframe = iframeRef.current;
    const rd = routeDataRef.current;
    if (!iframe?.contentWindow || !iframeReady.current || !rd?.waypoints?.length) return;

    const waypoints = rd.waypoints;
    const wpIndex = Math.min(
      Math.floor(routeProgress * (waypoints.length - 1)),
      waypoints.length - 1
    );
    const wp = waypoints[wpIndex];
    const nextWp = waypoints[Math.min(wpIndex + 1, waypoints.length - 1)];
    const dLng = nextWp.lng - wp.lng;
    const dLat = nextWp.lat - wp.lat;
    const rawHeading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    const heading = ((rawHeading % 360) + 360) % 360;
    baseHeadingRef.current = heading;

    const headingOffset = (rotation.h * 180) / Math.PI;
    const pitchOffset = (rotation.v * 180) / Math.PI;

    iframe.contentWindow.postMessage({
      type: 'update_all',
      lat: wp.lat,
      lng: wp.lng,
      heading: heading - headingOffset,
      pitch: pitchOffset * 0.5,
    }, '*');
  }, [routeProgress, phase]);

  // Listen for POV changes from the iframe (user dragging inside panorama)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'pov_changed') {
        // Could sync back to camera rotation here if needed
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const panoUrl = `${SUPABASE_URL}/functions/v1/streetview-pano?lat=37.7855&lng=-122.4057&heading=315&pitch=0`;

  return (
    <iframe
      ref={iframeRef}
      src={panoUrl}
      onLoad={handleIframeLoad}
      sandbox="allow-scripts allow-same-origin"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        zIndex: 0,
      }}
      allow="accelerometer; gyroscope"
      title="Street View Panorama"
    />
  );
};

export default StreetViewPanorama;
