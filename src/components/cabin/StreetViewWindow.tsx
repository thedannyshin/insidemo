import { useEffect, useMemo, useRef, useState } from 'react';
import { useRideStore } from '@/store/rideStore';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const StreetViewWindow = ({ className, style }: { className?: string; style?: React.CSSProperties }) => {
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const routeDataRef = useRef<any>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        routeDataRef.current = data;
      });
  }, []);

  const buildUrl = useMemo(() => {
    return (lat: number, lng: number, heading: number, pitch = 0) => {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        heading: String(Math.round(heading)),
        pitch: String(Math.round(pitch)),
        fov: '100',
        w: '1920',
        h: '1080',
        t: String(Date.now()),
      });
      return `${SUPABASE_URL}/functions/v1/streetview?${params.toString()}`;
    };
  }, []);

  useEffect(() => {
    if (!routeDataRef.current) return;

    const waypoints = routeDataRef.current.waypoints;
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

    setImageUrl(buildUrl(wp.lat, wp.lng, heading, phase === 'riding' ? 0 : -2));
  }, [buildUrl, phase, routeProgress]);

  return (
    <img
      src={imageUrl}
      className={className}
      style={{
        border: 'none',
        objectFit: 'cover',
        ...style,
      }}
      alt="Live street view"
      loading="eager"
      draggable={false}
    />
  );
};

export default StreetViewWindow;
