import { useEffect, useRef, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeDataRef = useRef<any>(null);
  const lastWpIndexRef = useRef(-1);
  const baseHeadingRef = useRef(315);

  // Build iframe URL with initial position
  const getIframeUrl = useCallback((lat: number, lng: number, heading: number, pitch: number) => {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      heading: String(Math.round(heading)),
      pitch: String(Math.round(pitch)),
    });
    return `${SUPABASE_URL}/functions/v1/streetview-pano?${params.toString()}`;
  }, []);

  // Send message to iframe
  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  // Load route data
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        routeDataRef.current = data;
      });
  }, []);

  // Update position/pov based on progress and rotation
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

    // Camera rotation as degrees
    const headingOffsetDeg = (rotation.h * 180) / Math.PI;
    const pitchOffsetDeg = (rotation.v * 180) / Math.PI;

    const finalHeading = ((waypointHeading - headingOffsetDeg) % 360 + 360) % 360;
    const finalPitch = pitchOffsetDeg * 0.5;

    baseHeadingRef.current = waypointHeading;

    if (wpIndex !== lastWpIndexRef.current) {
      // Position changed — update both position and POV
      lastWpIndexRef.current = wpIndex;
      postToIframe({
        type: 'update_all',
        lat: wp.lat,
        lng: wp.lng,
        heading: finalHeading,
        pitch: finalPitch,
      });
    } else {
      // Only rotation changed — update POV only
      postToIframe({
        type: 'update_pov',
        heading: finalHeading,
        pitch: finalPitch,
      });
    }
  }, [routeProgress, phase, rotation.h, rotation.v, postToIframe]);

  // Initial waypoint for iframe src
  const rd = routeDataRef.current;
  const initialWp = rd?.waypoints?.[0];
  const initialLat = initialWp?.lat ?? 37.7855;
  const initialLng = initialWp?.lng ?? -122.4057;
  const initialHeading = initialWp?.heading ?? 315;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#111', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src={getIframeUrl(initialLat, initialLng, initialHeading, 0)}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allow="accelerometer; gyroscope"
        title="Street View"
      />
    </div>
  );
};

export default StreetViewPanorama;
