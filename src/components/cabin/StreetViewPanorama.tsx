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
  const baseHeadingRef = useRef(315);
  const lastPositionRef = useRef({ lat: 0, lng: 0 });
  const iframeReadyRef = useRef(false);

  // Build the panorama URL (loaded once)
  const getPanoUrl = useCallback((lat: number, lng: number, heading: number) => {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      heading: String(Math.round(((heading % 360) + 360) % 360)),
      pitch: '0',
    });
    return `${SUPABASE_URL}/functions/v1/streetview-pano?${params.toString()}`;
  }, []);

  // Send message to iframe for instant POV/position updates
  const postToIframe = useCallback((data: any) => {
    if (!iframeRef.current?.contentWindow || !iframeReadyRef.current) return;
    iframeRef.current.contentWindow.postMessage(data, '*');
  }, []);

  // Load route data
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        routeDataRef.current = data;
      });
  }, []);

  // Listen for iframe ready
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'pov_changed') {
        // Panorama is interactive and ready
        iframeReadyRef.current = true;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    // Give the Google Maps script time to initialize
    setTimeout(() => {
      iframeReadyRef.current = true;
      // Send initial position
      const rd = routeDataRef.current;
      if (rd?.waypoints?.length) {
        const wp = rd.waypoints[0];
        postToIframe({ type: 'update_all', lat: wp.lat, lng: wp.lng, heading: 315, pitch: 0 });
      }
    }, 2000);
  }, [postToIframe]);

  // Update position on route progress (no refetch — just postMessage)
  useEffect(() => {
    const rd = routeDataRef.current;
    if (!rd?.waypoints?.length) return;

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

    // Only update position if it actually changed
    if (wp.lat !== lastPositionRef.current.lat || wp.lng !== lastPositionRef.current.lng) {
      lastPositionRef.current = { lat: wp.lat, lng: wp.lng };
      const headingOffset = (rotation.h * 180) / Math.PI;
      const pitchOffset = (rotation.v * 180) / Math.PI;
      postToIframe({
        type: 'update_all',
        lat: wp.lat,
        lng: wp.lng,
        heading: heading - headingOffset,
        pitch: pitchOffset * 0.5,
      });
    }
  }, [routeProgress, phase, postToIframe]);

  // Sync POV instantly on rotation change (no network call!)
  useEffect(() => {
    const headingOffset = (rotation.h * 180) / Math.PI;
    const pitchOffset = (rotation.v * 180) / Math.PI;
    postToIframe({
      type: 'update_pov',
      heading: baseHeadingRef.current - headingOffset,
      pitch: pitchOffset * 0.5,
    });
  }, [rotation.h, rotation.v, postToIframe]);

  // Build initial URL from first waypoint
  const rd = routeDataRef.current;
  const firstWp = rd?.waypoints?.[0];
  const lat = firstWp?.lat ?? 37.7855;
  const lng = firstWp?.lng ?? -122.4057;
  const panoUrl = getPanoUrl(lat, lng, 315);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: '#111',
        overflow: 'hidden',
      }}
    >
      {SUPABASE_URL && SUPABASE_ANON_KEY && (
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
      )}
    </div>
  );
};

export default StreetViewPanorama;
