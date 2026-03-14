import { useEffect, useRef, useState } from 'react';
import { useRideStore } from '@/store/rideStore';

const LeftScreen = () => {
  const { phase, passengerName, activeIncident } = useRideStore();

  const isDimmed = activeIncident?.active;

  return (
    <div
      className={`insidemo-screen w-full h-full relative transition-all duration-400 ${
        isDimmed ? 'insidemo-incident-dim' : ''
      }`}
      style={{ width: '100%', height: '100%', padding: 0 }}
    >
      {phase === 'arrived' ? <ArrivalView /> : <NavigationMapView name={passengerName} />}
    </div>
  );
};

const NavigationMapView = ({ name }: { name: string }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const phase = useRideStore((s) => s.phase);
  const routeProgress = useRideStore((s) => s.routeProgress);
  const destination = useRideStore((s) => s.destination);

  useEffect(() => {
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

    const origin = { lat: 37.78576, lng: -122.40587 };
    const dest = { lat: 37.8086, lng: -122.41251 };

    const map = new google.maps.Map(mapRef.current, {
      center: origin,
      zoom: 15,
      disableDefaultUI: true,
      gestureHandling: 'none',
      keyboardShortcuts: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#6a7a8a' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a3a' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a5a' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2b' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapInstanceRef.current = map;

    // Render directions route
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#00bfff',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    directionsService.route(
      {
        origin,
        destination: dest,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        }
      }
    );

    // Origin marker
    new google.maps.Marker({
      position: origin,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#00bfff',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });

    // Destination marker
    new google.maps.Marker({
      position: dest,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#a855f7',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });

    return () => {
      mapInstanceRef.current = null;
    };
  }, [mapLoaded]);

  // Update map center based on ride progress
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (phase === 'pre-ride') return;

    const origin = { lat: 37.78576, lng: -122.40587 };
    const dest = { lat: 37.8086, lng: -122.41251 };
    const t = routeProgress;
    const lat = origin.lat + (dest.lat - origin.lat) * t;
    const lng = origin.lng + (dest.lng - origin.lng) * t;
    mapInstanceRef.current.panTo({ lat, lng });
  }, [routeProgress, phase]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />
      {/* Top overlay with label */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded"
        style={{ background: 'hsl(220 18% 8% / 0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00bfff' }} />
        <span className="text-[8px] tracking-[0.15em] uppercase insidemo-mono" style={{ color: '#00bfff' }}>
          {phase === 'pre-ride' ? 'Route Preview' : 'Live Navigation'}
        </span>
      </div>
      {/* Bottom greeting overlay for pre-ride */}
    </div>
  );
};

const ArrivalView = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ padding: 16 }}>
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
