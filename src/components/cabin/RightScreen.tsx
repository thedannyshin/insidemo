import { useRideStore } from '@/store/rideStore';
import { VIDEO_DESTINATIONS } from '@/lib/videoDestinations';
import { useState, useMemo } from 'react';

const RightScreen = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  const {
    phase,
    speed,
    currentStreet,
    nextTurn,
    eta,
    activeIncident,
    expandIncident,
    routeProgress,
  } = useRideStore();

  return (
    <div
      className="insidemo-screen w-full h-full relative"
      style={{ width: '100%', height: '100%', padding: 16 }}
    >
      {phase === 'pre-ride' && <PreRideNav onStart={onStartRide} />}

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
  onStart,
}: {
  onStart: () => void;
}) => {
  const { selectedVideoId, setSelectedVideoId, setDestination } = useRideStore();
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const cities = useMemo(() => {
    const map = new Map<string, typeof VIDEO_DESTINATIONS>();
    VIDEO_DESTINATIONS.forEach((d) => {
      if (!map.has(d.city)) map.set(d.city, []);
      map.get(d.city)!.push(d);
    });
    return Array.from(map.entries());
  }, []);

  const selected = VIDEO_DESTINATIONS.find((d) => d.videoId === selectedVideoId);

  const handleSelect = (dest: typeof VIDEO_DESTINATIONS[0]) => {
    setSelectedVideoId(dest.videoId);
    setDestination(`${dest.landmark}, ${dest.city}`);
  };

  return (
    <div className="flex flex-col h-full gap-1.5">
      <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono">
        Choose Destination
      </div>

      {/* Destination list grouped by city */}
      <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 120, scrollbarWidth: 'thin' }}>
        {cities.map(([city, destinations]) => (
          <div key={city} className="mb-1">
            <button
              className="w-full text-left text-[9px] font-bold uppercase tracking-wider insidemo-mono px-1.5 py-0.5 rounded"
              style={{
                color: expandedCity === city || (!expandedCity && destinations.some(d => d.videoId === selectedVideoId))
                  ? 'hsl(195 100% 50%)'
                  : 'rgba(200, 220, 240, 0.5)',
              }}
              onClick={() => setExpandedCity(expandedCity === city ? null : city)}
            >
              {city} ({destinations.length})
            </button>
            {(expandedCity === city || (!expandedCity && destinations.some(d => d.videoId === selectedVideoId))) && (
              <div className="flex flex-col gap-0.5 ml-1">
                {destinations.map((dest) => {
                  const isActive = dest.videoId === selectedVideoId;
                  return (
                    <button
                      key={dest.id}
                      className="w-full text-left rounded-md px-2 py-1 transition-all text-[10px]"
                      style={{
                        background: isActive
                          ? 'hsl(195 100% 50% / 0.12)'
                          : 'transparent',
                        border: isActive
                          ? '1px solid hsl(195 100% 50% / 0.3)'
                          : '1px solid transparent',
                        color: isActive
                          ? 'hsl(195 100% 70%)'
                          : 'rgba(200, 220, 240, 0.7)',
                      }}
                      onClick={() => handleSelect(dest)}
                    >
                      <span className="mr-1">{dest.emoji}</span>
                      {dest.landmark}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected destination display */}
      {selected && (
        <div className="insidemo-glass rounded-lg px-2 py-1.5 flex items-center gap-2">
          <span className="text-sm">{selected.emoji}</span>
          <div>
            <div className="text-[10px] font-medium">{selected.landmark}</div>
            <div className="text-[8px] text-muted-foreground">{selected.city} • 360° VR</div>
          </div>
        </div>
      )}

      {/* Go button */}
      <button
        className="w-full py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: 'linear-gradient(135deg, hsl(195 100% 50%), hsl(280 80% 60%))',
          color: 'hsl(220 20% 4%)',
        }}
        onClick={() => {
          onStart();
          window.dispatchEvent(new CustomEvent('video_control', { detail: 'play' }));
        }}
      >
        🟢 Start Ride
      </button>
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
  const icons: Record<string, string> = {
    alert: '🛑',
    caution: '⚠️',
    info: 'ℹ️',
  };
  const labels: Record<string, string> = {
    alert: 'SAFETY ALERT',
    caution: 'CAUTION',
    info: 'INFORMATION',
  };
  const borderColor = colors[severity] || colors.info;

  // Parse explanation into "Why" and "What's next"
  const sentences = explanation.split('. ');
  const why = sentences.slice(0, -1).join('. ') + '.';
  const whatsNext = sentences[sentences.length - 1];

  return (
    <div
      className="absolute inset-2 rounded-xl cursor-pointer animate-slide-up overflow-hidden"
      style={{
        background: 'hsl(220 20% 6% / 0.92)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${borderColor}40`,
        boxShadow: `0 0 40px -10px ${borderColor}60, inset 0 1px 0 hsl(220 15% 25% / 0.3)`,
      }}
      onClick={onTap}
    >
      {/* Severity color bar */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${borderColor}, transparent)` }} />

      <div className="p-3 flex flex-col gap-2 h-full">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-base">{icons[severity] || icons.info}</span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.15em] insidemo-mono px-2 py-0.5 rounded-full"
            style={{
              color: borderColor,
              background: `${borderColor}15`,
              border: `1px solid ${borderColor}30`,
            }}
          >
            {labels[severity] || labels.info}
          </span>
        </div>

        {/* Headline */}
        <p className="text-sm font-semibold leading-tight">{headline}</p>

        {/* Why section */}
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 insidemo-mono">Why</p>
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(200, 220, 240, 0.75)' }}>
            {why}
          </p>
        </div>

        {/* What's next */}
        {expanded && (
          <div className="animate-slide-up">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 insidemo-mono">What's Next</p>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(200, 220, 240, 0.75)' }}>
              {whatsNext}
            </p>
          </div>
        )}

        {/* Tap hint */}
        {!expanded && (
          <p className="text-[8px] text-muted-foreground/50 text-center insidemo-mono">
            Tap for details
          </p>
        )}
      </div>
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
