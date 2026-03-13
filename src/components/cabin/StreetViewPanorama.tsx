import { useEffect, useRef, useState, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const buildUrl = (lat: number, lng: number, heading: number, pitch: number, fov: number) => {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    heading: String(Math.round(((heading % 360) + 360) % 360)),
    pitch: String(Math.round(Math.max(-90, Math.min(90, pitch)))),
    fov: String(Math.round(Math.max(30, Math.min(120, fov)))),
    w: '1920',
    h: '1080',
    t: String(Date.now()),
  });
  return `${SUPABASE_URL}/functions/v1/streetview?${params.toString()}`;
};

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const fov = useCameraOffset((s) => s.fov);
  const routeDataRef = useRef<any>(null);
  const baseHeadingRef = useRef(315);
  const [imageUrl, setImageUrl] = useState('');
  const loadingRef = useRef(false);
  const lastFetchRef = useRef(0);
  // Track the heading/pitch at which the current image was fetched
  const fetchedRotRef = useRef({ h: 0, v: 0 });

  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        routeDataRef.current = data;
        const first = data?.waypoints?.[0];
        if (first) loadImage(first.lat, first.lng, 315, 0, 100);
      });
    return () => {
      if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    };
  }, []);

  const loadImage = useCallback(async (lat: number, lng: number, heading: number, pitch: number, viewFov: number) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || loadingRef.current) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 800) return; // throttle more to reduce flicker
    loadingRef.current = true;
    lastFetchRef.current = now;

    // Record rotation at fetch time
    const currentRot = useCameraOffset.getState().rotation;
    fetchedRotRef.current = { h: currentRot.h, v: currentRot.v };

    try {
      const url = buildUrl(lat, lng, heading, pitch, viewFov);
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImageUrl((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      // Update fetchedRot to current rotation at image arrival
      const arrivalRot = useCameraOffset.getState().rotation;
      fetchedRotRef.current = { h: arrivalRot.h, v: arrivalRot.v };
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Fetch new image on route progress change
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

    const headingOffset = (rotation.h * 180) / Math.PI;
    const pitchOffset = (rotation.v * 180) / Math.PI;

    loadImage(wp.lat, wp.lng, heading - headingOffset, pitchOffset * 0.5, fov);
  }, [routeProgress, phase, loadImage]);

  // Also fetch on significant rotation changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
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

      const headingOffset = (rotation.h * 180) / Math.PI;
      const pitchOffset = (rotation.v * 180) / Math.PI;
      loadImage(wp.lat, wp.lng, heading - headingOffset, pitchOffset * 0.5, fov);
    }, 400);
    return () => clearTimeout(timer);
  }, [rotation.h, rotation.v, fov]);

  // Compute CSS offset to instantly pan the image based on rotation delta from fetch time
  const deltaH = rotation.h - fetchedRotRef.current.h;
  const deltaV = rotation.v - fetchedRotRef.current.v;
  // Convert radians to percentage of viewport for panning
  // ~45° (0.78 rad) of rotation = ~50% viewport shift
  const panX = (deltaH / 0.78) * 50;
  const panY = -(deltaV / 0.5) * 30;

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
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Street view"
          style={{
            position: 'absolute',
            // Oversize the image so we have room to pan
            width: '160%',
            height: '140%',
            top: '-20%',
            left: '-30%',
            objectFit: 'cover',
            filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
            transform: `translate(${panX}%, ${panY}%)`,
            transition: 'transform 0.05s linear',
            willChange: 'transform',
          }}
          draggable={false}
        />
      )}
    </div>
  );
};

export default StreetViewPanorama;
