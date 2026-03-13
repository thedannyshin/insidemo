import { useEffect, useRef, useState, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeDataRef = useRef<any>(null);
  const lastWpIndexRef = useRef(-1);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  // Load route data, then set initial iframe src
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        routeDataRef.current = data;
        const wp = data?.waypoints?.[0];
        const lat = wp?.lat ?? 37.7855;
        const lng = wp?.lng ?? -122.4057;
        const heading = wp?.heading ?? 315;
        const params = new URLSearchParams({
          lat: String(lat), lng: String(lng),
          heading: String(Math.round(heading)), pitch: '0',
        });
        setIframeSrc(`${SUPABASE_URL}/functions/v1/streetview-pano?${params.toString()}`);
      });
  }, []);

  // Update position/pov based on progress and camera rotation
  useEffect(() => {
    const rd = routeDataRef.current;
    if (!rd?.waypoints?.length) return;

    const waypoints = rd.waypoints;
    const wpIndex = Math.min(
      Math.floor(routeProgress * (waypoints.length - 1)),
      waypoints.length - 1
    );
    const wp = waypoints[wpIndex];
    const waypointHeading = wp.heading ?? 315;

    const headingOffsetDeg = (rotation.h * 180) / Math.PI;
    const pitchOffsetDeg = (rotation.v * 180) / Math.PI;
    const finalHeading = ((waypointHeading - headingOffsetDeg) % 360 + 360) % 360;
    const finalPitch = pitchOffsetDeg * 0.5;

    if (wpIndex !== lastWpIndexRef.current) {
      lastWpIndexRef.current = wpIndex;
      postToIframe({
        type: 'update_all',
        lat: wp.lat, lng: wp.lng,
        heading: finalHeading, pitch: finalPitch,
      });
    } else {
      postToIframe({
        type: 'update_pov',
        heading: finalHeading, pitch: finalPitch,
      });
    }
  }, [routeProgress, phase, rotation.h, rotation.v, postToIframe]);

  if (!iframeSrc) {
    return <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#111' }} />;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#111', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        style={{ position: 'absolute', width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; gyroscope"
        title="Street View"
      />
    </div>
  );
};

export default StreetViewPanorama;
