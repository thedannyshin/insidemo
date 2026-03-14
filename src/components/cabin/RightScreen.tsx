import { useRideStore } from '@/store/rideStore';
import { VIDEO_DESTINATIONS } from '@/lib/videoDestinations';


const RightScreen = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  const phase = useRideStore((s) => s.phase);

  return (
    <div
      className="insidemo-screen w-full h-full relative"
      style={{ width: '100%', height: '100%', padding: 16 }}
    >
      {phase === 'arrived' ? (
        <TripSummary onReplay={onReplay} />
      ) : (
        <RideControls onStart={onStartRide} />
      )}
    </div>
  );
};

const RideControls = ({ onStart }: { onStart: () => void }) => {
  const { selectedVideoId, setSelectedVideoId, setDestination, phase } = useRideStore();
  const isRiding = phase === 'takeoff' || phase === 'riding';

  const handleSelect = (dest: typeof VIDEO_DESTINATIONS[0]) => {
    if (isRiding) return; // can't change destination mid-ride
    setSelectedVideoId(dest.videoId);
    setDestination(`${dest.landmark}, ${dest.city}`);
  };

  const controls = [
    { label: 'Start Ride', emoji: '🟢', command: 'play', startsRide: true },
    { label: 'Stop Ride', emoji: '🛑', command: 'pause', startsRide: false },
  ] as const;

  return (
    <div data-cabin-panel className="flex flex-col h-full gap-1">
      <div className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono mb-0.5">
        {isRiding ? 'Vehicle Controls' : 'Choose Destination'}
      </div>

      {/* Destination list */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', minHeight: 0, opacity: isRiding ? 0.5 : 1 }}
      >
        <div className="flex flex-col gap-[3px]">
          {VIDEO_DESTINATIONS.map((dest) => {
            const isActive = dest.videoId === selectedVideoId;
            return (
              <button
                key={dest.id}
                className="w-full text-left rounded-md px-2 py-[6px] transition-all flex items-center gap-1.5"
                style={{
                  background: isActive
                    ? 'hsl(195 100% 50% / 0.15)'
                    : 'hsl(220 18% 12% / 0.5)',
                  border: isActive
                    ? '1px solid hsl(195 100% 50% / 0.4)'
                    : '1px solid hsl(220 15% 20% / 0.3)',
                  color: isActive
                    ? 'hsl(195 100% 70%)'
                    : 'rgba(200, 220, 240, 0.75)',
                  pointerEvents: isRiding ? 'none' : 'auto',
                }}
                onClick={() => handleSelect(dest)}
              >
                <span className="text-xs flex-shrink-0">{dest.emoji}</span>
                <span className="text-[10px] leading-tight truncate">{dest.landmark}</span>
                <span className="text-[7px] text-muted-foreground ml-auto flex-shrink-0 insidemo-mono">{dest.city.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle control buttons */}
      <div className="flex gap-1 mt-0.5 flex-shrink-0">
        {controls.map(({ label, emoji, command, startsRide }) => (
          <button
            key={label}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              background: startsRide
                ? 'linear-gradient(135deg, hsl(195 100% 50%), hsl(280 80% 60%))'
                : 'hsl(220 18% 12% / 0.8)',
              color: startsRide ? 'hsl(220 20% 4%)' : 'rgba(200, 220, 240, 0.8)',
              border: startsRide ? 'none' : '1px solid hsl(220 15% 22% / 0.5)',
            }}
            onClick={() => {
              if (startsRide && phase === 'pre-ride') onStart();
              if (label === 'Stop') {
                window.dispatchEvent(new CustomEvent('stop_ride'));
              }
              window.dispatchEvent(new CustomEvent('video_control', { detail: command }));
            }}
          >
            {emoji} {label}
          </button>
        ))}
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
