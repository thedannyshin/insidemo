import { useRef, useEffect, useMemo } from 'react';
import { useRideStore } from '@/store/rideStore';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const StreetViewWindow = ({ className, style }: { className?: string; style?: React.CSSProperties }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const routeDataRef = useRef<any>(null);
  const lastSentRef = useRef<string>('');

  // Load route data once
  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => { routeDataRef.current = data; });
  }, []);

  // Compute initial coords
  const initialUrl = useMemo(() => {
    return `${SUPABASE_URL}/functions/v1/streetview?lat=37.7855&lng=-122.4057&heading=315`;
  }, []);

  // Update Street View position as ride progresses
  useEffect(() => {
    if (!routeDataRef.current || phase === 'pre-ride') return;
    const waypoints = routeDataRef.current.waypoints;
    const wpIndex = Math.min(
      Math.floor(routeProgress * (waypoints.length - 1)),
      waypoints.length - 1
    );
    const wp = waypoints[wpIndex];
    const nextWp = waypoints[Math.min(wpIndex + 1, waypoints.length - 1)];

    // Calculate heading from current to next waypoint
    const dLng = nextWp.lng - wp.lng;
    const dLat = nextWp.lat - wp.lat;
    const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

    const key = `${wp.lat},${wp.lng}`;
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ lat: wp.lat, lng: wp.lng, heading }),
      '*'
    );
  }, [routeProgress, phase]);

  return (
    <iframe
      ref={iframeRef}
      src={initialUrl}
      className={className}
      style={{
        border: 'none',
        ...style,
      }}
      allow="accelerometer; gyroscope"
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default StreetViewWindow;
