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

  return (
    <div
      className="insidemo-glass rounded-xl flex flex-col items-center gap-2"
      style={{
        width: 360,
        padding: '12px 20px',
        background: 'hsl(220 18% 8% / 0.9)',
        border: '1px solid hsl(220 15% 20% / 0.4)',
        boxShadow: '0 0 30px -5px hsl(195 100% 50% / 0.2), 0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Persistent HUD row */}
      <div className="flex items-center justify-between w-full">
        <div className="text-left">
          <span className="text-xl font-semibold insidemo-mono" style={{ color: 'hsl(195 100% 50%)' }}>
            {speed}
          </span>
          <span className="text-[9px] text-muted-foreground ml-1 insidemo-mono">MPH</span>
        </div>
        <div className="text-center">
          <span className="text-sm" style={{ color: 'rgba(200, 220, 240, 0.8)' }}>
            {currentStreet}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium insidemo-mono" style={{ color: 'rgba(200, 220, 240, 0.7)' }}>
            {etaMin}:{etaSec}
          </span>
          <span className="text-[9px] text-muted-foreground ml-1 insidemo-mono">ETA</span>
        </div>
      </div>

      {/* Incident popup */}
      {activeIncident?.active && (
        <div
          className="w-full rounded-lg px-3 py-2 animate-slide-up"
          style={{
            background: 'rgba(10, 15, 25, 0.8)',
            border: `1px solid ${severityColors[activeIncident.severity] || severityColors.info}`,
          }}
        >
          <p
            className="text-xs font-semibold text-center insidemo-mono"
            style={{ color: severityColors[activeIncident.severity] || severityColors.info }}
          >
            {activeIncident.hudCopy}
          </p>
        </div>
      )}
    </div>
  );
};

export default HUDOverlay;
