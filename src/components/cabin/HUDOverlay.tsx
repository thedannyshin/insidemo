import { useRideStore } from '@/store/rideStore';

const HUDOverlay = () => {
  const { speed, currentStreet, eta, activeIncident } = useRideStore();

  const etaMin = Math.floor(eta / 60);
  const etaSec = String(eta % 60).padStart(2, '0');

  const severityColors: Record<string, string> = {
    alert: 'hsl(0 85% 55%)',
    caution: 'hsl(38 92% 50%)',
    info: 'hsl(195 100% 50%)',
  };

  const isAlert = activeIncident?.active;
  const alertColor = isAlert
    ? severityColors[activeIncident.severity] || severityColors.info
    : undefined;

  return (
    <div
      className="rounded-xl flex flex-col items-center gap-2"
      style={{
        width: 740,
        padding: '10px 24px',
        background: 'hsl(220 20% 6% / 0.85)',
        backdropFilter: 'blur(24px)',
        border: isAlert
          ? `1px solid ${alertColor}40`
          : '1px solid hsl(220 15% 20% / 0.3)',
        boxShadow: isAlert
          ? `0 0 40px -10px ${alertColor}40, inset 0 1px 0 hsl(220 15% 25% / 0.2)`
          : '0 0 30px -5px hsl(195 100% 50% / 0.1), inset 0 1px 0 hsl(220 15% 25% / 0.2)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Persistent HUD row */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold insidemo-mono" style={{ color: 'hsl(195 100% 50%)' }}>
            {speed}
          </span>
          <span className="text-[9px] text-muted-foreground insidemo-mono">MPH</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium" style={{ color: 'rgba(200, 220, 240, 0.85)' }}>
            {currentStreet}
          </span>
          <div className="w-8 h-[1px] mt-1 rounded-full" style={{
            background: 'linear-gradient(90deg, transparent, hsl(195 100% 50% / 0.3), transparent)'
          }} />
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-medium insidemo-mono" style={{ color: 'rgba(200, 220, 240, 0.75)' }}>
            {etaMin}:{etaSec}
          </span>
          <span className="text-[9px] text-muted-foreground insidemo-mono">ETA</span>
        </div>
      </div>

      {/* Incident popup */}
      {isAlert && (
        <div
          className="w-full rounded-lg px-4 py-2 animate-slide-up flex items-center justify-center gap-2"
          style={{
            background: `${alertColor}10`,
            border: `1px solid ${alertColor}30`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: alertColor, boxShadow: `0 0 10px ${alertColor}` }}
          />
          <p
            className="text-xs font-bold tracking-wide insidemo-mono"
            style={{ color: alertColor }}
          >
            {activeIncident.hudCopy}
          </p>
        </div>
      )}
    </div>
  );
};

export default HUDOverlay;
