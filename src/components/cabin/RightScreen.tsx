import { useState, useEffect, useRef } from 'react';
import { useRideStore } from '@/store/rideStore';
import { supabase } from '@/integrations/supabase/client';

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const RightScreen = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  const {
    phase, destination, setDestination, speed, currentStreet,
    nextTurn, eta, activeIncident, expandIncident, routeProgress,
  } = useRideStore();

  return (
    <div
      className="insidemo-screen w-full h-full relative"
      style={{ width: 320, height: 200, padding: 16 }}
    >
      {phase === 'pre-ride' && (
        <PreRideNav
          destination={destination}
          setDestination={setDestination}
          onStart={onStartRide}
        />
      )}

      {(phase === 'takeoff' || phase === 'riding') && (
        <NavigationView
          speed={speed}
          street={currentStreet}
          nextTurn={nextTurn}
          eta={eta}
          progress={routeProgress}
        />
      )}

      {phase === 'arrived' && <TripSummary onReplay={onReplay} />}

      {/* Incident overlay */}
      {activeIncident?.active && (
        <IncidentOverlay
          severity={activeIncident.severity}
          headline={activeIncident.headline}
          explanation={activeIncident.explanation}
          expanded={activeIncident.expanded}
          onTap={expandIncident}
        />
      )}
    </div>
  );
};

const PreRideNav = ({
  destination,
  setDestination,
  onStart,
}: {
  destination: string;
  setDestination: (d: string) => void;
  onStart: () => void;
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchPlaces = async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('maps-proxy', {
        body: { action: 'autocomplete', input },
      });
      if (!error && data?.predictions) {
        setPredictions(data.predictions.slice(0, 4));
        setShowDropdown(true);
      }
    } catch {
      // Fallback: show nothing
    }
    setIsSearching(false);
  };

  const selectPlace = async (prediction: PlacePrediction) => {
    setDestination(prediction.structured_formatting.main_text);
    setQuery(prediction.structured_formatting.main_text);
    setShowDropdown(false);
    setPredictions([]);

    // Fetch directions for ETA/distance
    try {
      const { data } = await supabase.functions.invoke('maps-proxy', {
        body: {
          action: 'directions',
          input: prediction.description,
        },
      });
      if (data?.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
        });
      }
    } catch {
      // Use fallback info
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchPlaces(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono">
        Where to?
      </div>

      <div className="flex flex-col gap-2">
        <div className="insidemo-glass rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground mb-0.5">📍 Pickup</div>
          <div className="text-[10px]">Market St & 4th St, San Francisco</div>
        </div>

        <div className="insidemo-glass rounded-lg p-2 relative">
          <div className="text-[9px] text-muted-foreground mb-0.5">🏁 Destination</div>
          <input
            className="text-[10px] bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50"
            placeholder="Search for a destination..."
            value={query || destination}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setDestination('');
            }}
            onFocus={() => setShowDropdown(predictions.length > 0)}
          />
          {isSearching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 border border-primary/50 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Autocomplete dropdown */}
          {showDropdown && predictions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: 'hsl(220 18% 10% / 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid hsl(220 15% 20% / 0.5)',
              }}
            >
              {predictions.map((p) => (
                <button
                  key={p.place_id}
                  className="w-full text-left px-3 py-2 hover:bg-primary/10 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'hsl(220 15% 18% / 0.5)' }}
                  onClick={() => selectPlace(p)}
                >
                  <div className="text-[10px] font-medium">
                    {p.structured_formatting.main_text}
                  </div>
                  <div className="text-[8px] text-muted-foreground truncate">
                    {p.structured_formatting.secondary_text}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested destinations */}
      {!destination && (
        <div className="flex flex-wrap gap-1 mt-1">
          {[
            { name: "Fisherman's Wharf", emoji: '🦀' },
            { name: 'Golden Gate Bridge', emoji: '🌉' },
            { name: 'Union Square', emoji: '🛍️' },
          ].map(({ name, emoji }) => (
            <button
              key={name}
              className="text-[8px] px-2 py-1 rounded-full transition-colors"
              style={{
                background: 'hsl(195 100% 50% / 0.08)',
                border: '1px solid hsl(195 100% 50% / 0.2)',
              }}
              onClick={() => {
                setDestination(name);
                setQuery(name);
                setRouteInfo({ distance: '4.2 mi', duration: '~12 min' });
              }}
            >
              {emoji} {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="text-[10px] text-muted-foreground">
          {routeInfo
            ? `ETA ${routeInfo.duration} • ${routeInfo.distance}`
            : destination
            ? 'Calculating route...'
            : 'Select a destination'}
        </div>
        <button
          className="px-4 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30"
          style={{
            background: destination
              ? 'linear-gradient(135deg, hsl(195 100% 50%), hsl(280 80% 60%))'
              : 'hsl(220 15% 15%)',
            color: destination ? 'hsl(220 20% 4%)' : 'hsl(215 12% 40%)',
          }}
          disabled={!destination}
          onClick={onStart}
        >
          Start Ride
        </button>
      </div>
    </div>
  );
};

const NavigationView = ({
  speed,
  street,
  nextTurn,
  eta,
  progress,
}: {
  speed: number;
  street: string;
  nextTurn: string;
  eta: number;
  progress: number;
}) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono">
        Navigation
      </span>
      <span className="text-[10px] insidemo-mono" style={{ color: 'hsl(195 100% 50%)' }}>
        {Math.floor(eta / 60)}:{String(eta % 60).padStart(2, '0')} ETA
      </span>
    </div>

    {/* Mini map placeholder */}
    <div
      className="flex-1 rounded-lg mb-3 relative overflow-hidden"
      style={{ background: 'hsl(220 18% 10%)' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-[10px] text-muted-foreground insidemo-mono">
          🗺️ Map View
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'hsl(220 15% 15%)' }}>
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, hsl(195 100% 50%), hsl(280 80% 60%))',
          }}
        />
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium">{street}</p>
        {nextTurn && (
          <p className="text-[10px] text-muted-foreground">{nextTurn}</p>
        )}
      </div>
      <div className="text-right insidemo-mono">
        <p className="text-sm font-semibold" style={{ color: 'hsl(195 100% 50%)' }}>
          {speed}
        </p>
        <p className="text-[8px] text-muted-foreground">MPH</p>
      </div>
    </div>
  </div>
);

const IncidentOverlay = ({
  severity,
  headline,
  explanation,
  expanded,
  onTap,
}: {
  severity: string;
  headline: string;
  explanation: string;
  expanded: boolean;
  onTap: () => void;
}) => {
  const colors: Record<string, string> = {
    alert: 'hsl(0 85% 55%)',
    caution: 'hsl(38 92% 50%)',
    info: 'hsl(195 100% 50%)',
  };
  const borderColor = colors[severity] || colors.info;

  return (
    <div
      className="absolute top-2 left-2 right-2 insidemo-glass rounded-lg p-3 animate-slide-up cursor-pointer"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={onTap}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: borderColor, boxShadow: `0 0 8px ${borderColor}` }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: borderColor }}>
          {severity}
        </span>
      </div>
      <p className="text-xs font-medium">{headline}</p>
      {expanded && (
        <p className="text-[10px] text-muted-foreground mt-1 animate-slide-up">
          {explanation}
        </p>
      )}
    </div>
  );
};

const TripSummary = ({ onReplay }: { onReplay: () => void }) => (
  <div className="flex flex-col h-full">
    <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono mb-3">
      Trip Complete
    </div>

    <div className="flex-1 flex flex-col gap-2">
      {[
        { label: 'Duration', value: '~12 min' },
        { label: 'Distance', value: '4.2 miles' },
        { label: 'Route', value: 'Market → Columbus → Bay' },
        { label: 'Incidents', value: '5 explained' },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-[10px] insidemo-mono">{value}</span>
        </div>
      ))}
    </div>

    <button
      className="mt-auto w-full py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: 'linear-gradient(135deg, hsl(195 100% 50%), hsl(280 80% 60%))',
        color: 'hsl(220 20% 4%)',
      }}
      onClick={onReplay}
    >
      Replay Ride
    </button>
  </div>
);

export default RightScreen;
