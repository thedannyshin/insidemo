import { useEffect, useRef, useState, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315];
const PITCHES = [-15, 0, 15];

// Find the closest cached heading
const snapToHeading = (h: number): number => {
  const norm = ((h % 360) + 360) % 360;
  let best = HEADINGS[0];
  let bestDist = 360;
  for (const ch of HEADINGS) {
    const dist = Math.min(Math.abs(norm - ch), 360 - Math.abs(norm - ch));
    if (dist < bestDist) {
      bestDist = dist;
      best = ch;
    }
  }
  return best;
};

const snapToPitch = (p: number): number => {
  let best = PITCHES[0];
  let bestDist = 999;
  for (const cp of PITCHES) {
    const dist = Math.abs(p - cp);
    if (dist < bestDist) {
      bestDist = dist;
      best = cp;
    }
  }
  return best;
};

const buildCachedUrl = (lat: number, lng: number, heading: number, pitch: number) => {
  const folder = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const snappedH = snapToHeading(heading);
  const snappedP = snapToPitch(pitch);
  return `${SUPABASE_URL}/storage/v1/object/public/streetview-cache/${folder}/${snappedH}_${snappedP}.jpg`;
};

const buildLiveUrl = (lat: number, lng: number, heading: number, pitch: number, fov: number) => {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    heading: String(Math.round(((heading % 360) + 360) % 360)),
    pitch: String(Math.round(Math.max(-90, Math.min(90, pitch)))),
    fov: String(Math.round(Math.max(30, Math.min(120, fov)))),
    w: '1920',
    h: '1080',
  });
  return `${SUPABASE_URL}/functions/v1/streetview?${params.toString()}`;
};

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const fov = useCameraOffset((s) => s.fov);
  const routeDataRef = useRef<any>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<string>('checking');
  const loadingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const fetchedRotRef = useRef({ h: 0, v: 0 });

  // Load route data & trigger caching
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then(async (data) => {
        routeDataRef.current = data;
        const waypoints = data?.waypoints;
        if (!waypoints?.length) return;

        // Check if cache exists by testing the first waypoint image
        const testUrl = buildCachedUrl(waypoints[0].lat, waypoints[0].lng, 0, 0);
        try {
          const testRes = await fetch(testUrl, { method: 'HEAD' });
          if (testRes.ok) {
            setCacheReady(true);
            setCacheStatus('ready');
            // Load initial image from cache
            const initialUrl = buildCachedUrl(waypoints[0].lat, waypoints[0].lng, 315, 0);
            setImageUrl(initialUrl);
            return;
          }
        } catch {}

        // Cache not ready — trigger caching
        setCacheStatus('downloading');
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/cache-streetview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              waypoints: waypoints.map((w: any) => ({ lat: w.lat, lng: w.lng })),
            }),
          });
          if (res.ok) {
            const result = await res.json();
            console.log('Street View cache result:', result);
            setCacheReady(true);
            setCacheStatus('ready');
            // Load initial image from cache
            const initialUrl = buildCachedUrl(waypoints[0].lat, waypoints[0].lng, 315, 0);
            setImageUrl(initialUrl);
          } else {
            console.error('Cache failed, falling back to live');
            setCacheStatus('fallback');
            // Fall back to live
            loadImageLive(waypoints[0].lat, waypoints[0].lng, 315, 0, 100);
          }
        } catch (err) {
          console.error('Cache error:', err);
          setCacheStatus('fallback');
          loadImageLive(waypoints[0].lat, waypoints[0].lng, 315, 0, 100);
        }
      });
  }, []);

  // Live fallback loader
  const loadImageLive = useCallback(async (lat: number, lng: number, heading: number, pitch: number, viewFov: number) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || loadingRef.current) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 800) return;
    loadingRef.current = true;
    lastFetchRef.current = now;

    const currentRot = useCameraOffset.getState().rotation;
    fetchedRotRef.current = { h: currentRot.h, v: currentRot.v };

    try {
      const url = buildLiveUrl(lat, lng, heading, pitch, viewFov);
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
      const arrivalRot = useCameraOffset.getState().rotation;
      fetchedRotRef.current = { h: arrivalRot.h, v: arrivalRot.v };
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Update image based on progress and rotation
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
    const baseHeading = ((rawHeading % 360) + 360) % 360;

    const headingOffset = (rotation.h * 180) / Math.PI;
    const pitchOffset = (rotation.v * 180) / Math.PI;
    const finalHeading = baseHeading - headingOffset;
    const finalPitch = pitchOffset * 0.5;

    if (cacheReady) {
      // Instant swap from cache — no network delay
      const cachedUrl = buildCachedUrl(wp.lat, wp.lng, finalHeading, finalPitch);
      fetchedRotRef.current = { h: rotation.h, v: rotation.v };
      setImageUrl(cachedUrl);
    } else if (cacheStatus === 'fallback') {
      loadImageLive(wp.lat, wp.lng, finalHeading, finalPitch, fov);
    }
  }, [routeProgress, phase, rotation.h, rotation.v, fov, cacheReady, cacheStatus]);

  // Compute CSS offset for smooth interpolation between cached angles
  const deltaH = rotation.h - fetchedRotRef.current.h;
  const deltaV = rotation.v - fetchedRotRef.current.v;
  const panX = cacheReady ? 0 : (deltaH / 0.78) * 50;
  const panY = cacheReady ? 0 : -(deltaV / 0.5) * 30;

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
      {/* Cache status indicator */}
      {cacheStatus === 'downloading' && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'monospace',
          }}
        >
          ⏳ Caching street view images…
        </div>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Street view"
          style={{
            position: 'absolute',
            width: cacheReady ? '100%' : '160%',
            height: cacheReady ? '100%' : '140%',
            top: cacheReady ? 0 : '-20%',
            left: cacheReady ? 0 : '-30%',
            objectFit: 'cover',
            filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
            transform: cacheReady ? 'none' : `translate(${panX}%, ${panY}%)`,
            transition: cacheReady ? 'none' : 'transform 0.05s linear',
            willChange: cacheReady ? 'auto' : 'transform',
          }}
          draggable={false}
        />
      )}
    </div>
  );
};

export default StreetViewPanorama;
