import { useEffect, useRef, useState, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';
import { useCameraOffset } from './CameraControls';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Lerp between two values */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shortest-path lerp for angles in degrees */
const lerpAngle = (a: number, b: number, t: number) => {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
};

/** Haversine distance in meters */
const haversineDist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** Densify waypoints to ~targetSpacing meters apart via linear interpolation */
const densifyWaypoints = (waypoints: any[], targetSpacing = 10) => {
  if (waypoints.length < 2) return waypoints;
  const result = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const dist = haversineDist(prev, curr);
    const segments = Math.max(1, Math.round(dist / targetSpacing));
    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      result.push({
        lat: lerp(prev.lat, curr.lat, t),
        lng: lerp(prev.lng, curr.lng, t),
        heading: lerpAngle(prev.heading ?? 0, curr.heading ?? 0, t),
        speed: lerp(prev.speed ?? 20, curr.speed ?? 20, t),
        eta: lerp(prev.eta ?? 0, curr.eta ?? 0, t),
      });
    }
  }
  return result;
};

const StreetViewPanorama = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const rotation = useCameraOffset((s) => s.rotation);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeDataRef = useRef<any>(null);
  const lastSentPos = useRef<{ lat: number; lng: number } | null>(null);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  // Load route data and fetch panorama HTML
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then(async (data) => {
        // Densify waypoints to ~10m spacing for ultra-smooth movement
        if (data?.waypoints) {
          data.waypoints = densifyWaypoints(data.waypoints, 10);
        }
        routeDataRef.current = data;
        const wp = data?.waypoints?.[0];
        const lat = wp?.lat ?? 37.7855;
        const lng = wp?.lng ?? -122.4057;
        const heading = wp?.heading ?? 315;
        const params = new URLSearchParams({
          lat: String(lat), lng: String(lng),
          heading: String(Math.round(heading)), pitch: '0',
        });
        const url = `${SUPABASE_URL}/functions/v1/streetview-pano?${params.toString()}`;
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (res.ok) {
          const html = await res.text();
          setSrcdoc(html);
        }
      });
  }, []);

  // Smoothly interpolate between waypoints and throttle position updates
  useEffect(() => {
    const rd = routeDataRef.current;
    if (!rd?.waypoints?.length || !srcdoc) return;

    const waypoints = rd.waypoints;
    const totalWp = waypoints.length;

    // Continuous float index for sub-waypoint interpolation
    const floatIndex = routeProgress * (totalWp - 1);
    const idxA = Math.min(Math.floor(floatIndex), totalWp - 1);
    const idxB = Math.min(idxA + 1, totalWp - 1);
    const subT = floatIndex - idxA;

    const wpA = waypoints[idxA];
    const wpB = waypoints[idxB];

    // Interpolated position and heading
    const iLat = lerp(wpA.lat, wpB.lat, subT);
    const iLng = lerp(wpA.lng, wpB.lng, subT);
    const iHeading = lerpAngle(wpA.heading ?? 315, wpB.heading ?? 315, subT);

    // Apply user camera rotation as offset
    const headingOffsetDeg = (rotation.h * 180) / Math.PI;
    const pitchOffsetDeg = (rotation.v * 180) / Math.PI;
    const finalHeading = ((iHeading - headingOffsetDeg) % 360 + 360) % 360;
    const finalPitch = pitchOffsetDeg * 0.5;

    // Only send position update when moved enough (~15m) to avoid constant pano-snapping
    const MIN_DIST = 0.00015; // ~15m in degrees
    const lastPos = lastSentPos.current;
    const needsPositionUpdate =
      !lastPos ||
      Math.abs(iLat - lastPos.lat) > MIN_DIST ||
      Math.abs(iLng - lastPos.lng) > MIN_DIST;

    if (needsPositionUpdate) {
      lastSentPos.current = { lat: iLat, lng: iLng };
      postToIframe({
        type: 'update_all',
        lat: iLat, lng: iLng,
        heading: finalHeading, pitch: finalPitch,
      });
    } else {
      // Just rotate the view smoothly
      postToIframe({
        type: 'update_pov',
        heading: finalHeading, pitch: finalPitch,
      });
    }
  }, [routeProgress, phase, rotation.h, rotation.v, postToIframe, srcdoc]);

  if (!srcdoc) {
    return <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#111' }} />;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#111', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        style={{ position: 'absolute', width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; gyroscope"
        title="Street View"
      />
    </div>
  );
};

export default StreetViewPanorama;
