import { useRideStore } from '@/store/rideStore';

const LeftScreen = () => {
  const { phase, activeIncident, firedIncidentIds, incidents } = useRideStore();

  return (
    <div
      data-cabin-panel
      className="insidemo-screen w-full h-full relative"
      style={{ width: '100%', height: '100%', padding: 0 }}
    >
      {phase === 'arrived' ? <ArrivalView /> : <SafetyPanel />}
    </div>
  );
};

const SafetyPanel = () => {
  const phase = useRideStore((s) => s.phase);
  const activeIncident = useRideStore((s) => s.activeIncident);
  const firedIncidentIds = useRideStore((s) => s.firedIncidentIds);
  const incidents = useRideStore((s) => s.incidents);

  const severityColors: Record<string, string> = {
    alert: 'hsl(0 85% 55%)',
    caution: 'hsl(38 92% 50%)',
    info: 'hsl(195 100% 50%)',
  };
  const severityIcons: Record<string, string> = {
    alert: '🛑',
    caution: '⚠️',
    info: 'ℹ️',
  };

  const pastIncidents = incidents.filter((inc) => firedIncidentIds.includes(inc.id));

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: activeIncident?.active
              ? severityColors[activeIncident.severity]
              : 'hsl(195 100% 50%)',
            boxShadow: activeIncident?.active
              ? `0 0 8px ${severityColors[activeIncident.severity]}`
              : 'none',
          }}
        />
        <span
          className="text-[8px] tracking-[0.15em] uppercase insidemo-mono"
          style={{ color: 'hsl(195 100% 50%)' }}
        >
          Safety Monitor
        </span>
      </div>

      {/* Active incident — prominent */}
      {activeIncident?.active && (
        <div
          className="rounded-lg p-2.5 animate-slide-up"
          style={{
            background: `${severityColors[activeIncident.severity]}08`,
            border: `1px solid ${severityColors[activeIncident.severity]}35`,
            boxShadow: `0 0 20px -8px ${severityColors[activeIncident.severity]}40`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs">{severityIcons[activeIncident.severity]}</span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider insidemo-mono"
              style={{ color: severityColors[activeIncident.severity] }}
            >
              {activeIncident.type.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[11px] font-semibold leading-tight mb-1">{activeIncident.headline}</p>
          <p
            className="text-[9px] leading-relaxed"
            style={{ color: 'rgba(200, 220, 240, 0.7)' }}
          >
            {activeIncident.explanation}
          </p>
        </div>
      )}

      {/* Past incidents log */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', minHeight: 0 }}>
        {phase === 'pre-ride' && (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <span className="text-lg">🛡️</span>
            <p className="text-[9px] text-muted-foreground text-center insidemo-mono">
              Safety alerts will appear here during your ride
            </p>
          </div>
        )}

        {(phase === 'takeoff' || phase === 'riding') && pastIncidents.length === 0 && !activeIncident?.active && (
          <div className="flex flex-col items-center justify-center h-full gap-1 opacity-40">
            <span className="text-sm">✅</span>
            <p className="text-[8px] text-muted-foreground text-center insidemo-mono">
              All clear — no incidents
            </p>
          </div>
        )}

        {pastIncidents
          .filter((inc) => inc.id !== activeIncident?.id)
          .reverse()
          .map((inc) => (
            <div
              key={inc.id}
              className="flex items-start gap-1.5 py-1.5 border-b"
              style={{ borderColor: 'hsl(220 15% 18% / 0.5)' }}
            >
              <span className="text-[9px] flex-shrink-0 mt-0.5">{severityIcons[inc.severity]}</span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium truncate">{inc.headline}</p>
                <p className="text-[7px] text-muted-foreground insidemo-mono">
                  {inc.hudCopy}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const ArrivalView = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ padding: 16 }}>
    <div className="text-lg insidemo-gradient-text font-semibold">Thanks for riding</div>
    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground insidemo-mono">
      Powered by InsideMo
    </div>
    <div
      className="mt-1 w-16 h-[2px] rounded-full"
      style={{
        background: 'linear-gradient(90deg, hsl(195 100% 50%), hsl(280 80% 60%))',
      }}
    />
  </div>
);

export default LeftScreen;
