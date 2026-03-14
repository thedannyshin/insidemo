import { useEffect, useRef, useState } from 'react';
import { useRideStore } from '@/store/rideStore';

const LeftScreen = () => {
  const { phase, passengerName, activeIncident, music, cabinMode } = useRideStore();

  const isDimmed = activeIncident?.active;

  return (
    <div
      className={`insidemo-screen w-full h-full relative transition-all duration-400 ${
        isDimmed ? 'insidemo-incident-dim' : ''
      }`}
      style={{ width: '100%', height: '100%', padding: 16 }}
    >
      {phase === 'pre-ride' && <PreRideView name={passengerName} />}
      {(phase === 'takeoff' || phase === 'riding') && (
        <EntertainmentView music={music} mode={cabinMode} />
      )}
      {phase === 'arrived' && <ArrivalView />}
    </div>
  );
};

const PreRideView = ({ name }: { name: string }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if ((window as any).google?.maps) {
      setMapLoaded(true);
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      existing.addEventListener('load', () => setMapLoaded(true));
      if ((window as any).google?.maps) setMapLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    const center = { lat: 37.78576, lng: -122.40587 };
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      tilt: 45,
      heading: 0,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: true,
      gestureHandling: 'none',
      keyboardShortcuts: false,
    });

    // Slowly rotate the map heading
    let heading = 0;
    const interval = setInterval(() => {
      heading = (heading + 0.3) % 360;
      map.setHeading(heading);
    }, 50);

    return () => clearInterval(interval);
  }, [mapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      <div ref={mapRef} className="absolute inset-0" />
      {/* Overlay with passenger info */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 z-10"
        style={{ background: 'linear-gradient(to bottom, transparent 40%, hsl(220 18% 8% / 0.85) 100%)' }}>
        <h2 className="text-sm font-semibold insidemo-gradient-text">
          Welcome back, {name}
        </h2>
        <p className="text-[9px] text-muted-foreground mt-1">
          Your autonomous ride awaits
        </p>
      </div>
    </div>
  );
};

const EntertainmentView = ({
  music,
  mode,
}: {
  music: { track: string; artist: string; isPlaying: boolean };
  mode: string;
}) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono">
        {mode} mode
      </span>
      <div className="flex gap-1">
        {['🎵', '🎬', '🌙'].map((icon, i) => (
          <button
            key={i}
            className="w-5 h-5 rounded text-[10px] flex items-center justify-center"
            style={{
              background: i === 0 ? 'hsl(195 100% 50% / 0.15)' : 'transparent',
              border: i === 0 ? '1px solid hsl(195 100% 50% / 0.3)' : '1px solid transparent',
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>

    <div className="flex-1 flex items-center gap-3">
      <div
        className="w-14 h-14 rounded-lg flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, hsl(280 80% 40%), hsl(195 100% 40%))',
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{music.track}</p>
        <p className="text-[10px] text-muted-foreground">{music.artist}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[2px] rounded-full" style={{ background: 'hsl(220 15% 20%)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: '35%',
                background: 'linear-gradient(90deg, hsl(195 100% 50%), hsl(280 80% 60%))',
              }}
            />
          </div>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-center gap-4 mt-2">
      {['⏮', music.isPlaying ? '⏸' : '▶', '⏭'].map((icon, i) => (
        <button
          key={i}
          className="text-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          {icon}
        </button>
      ))}
    </div>
  </div>
);

const ArrivalView = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3">
    <div className="text-lg insidemo-gradient-text font-semibold">
      Thanks for riding
    </div>
    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono">
      Powered by InsideMo
    </div>
    <div className="mt-1 w-16 h-[2px] rounded-full" style={{
      background: 'linear-gradient(90deg, hsl(195 100% 50%), hsl(280 80% 60%))'
    }} />
  </div>
);

export default LeftScreen;
