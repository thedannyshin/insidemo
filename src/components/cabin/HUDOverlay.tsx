import { useCallback, useState } from 'react';
import { useRideStore } from '@/store/rideStore';
import { supabase } from '@/integrations/supabase/client';

const HUDOverlay = () => {
  const { speed, currentStreet, eta, selectedVideoId, setInitialHeading } = useRideStore();
  const [calibrating, setCalibrating] = useState(false);

  const etaMin = Math.floor(eta / 60);
  const etaSec = String(eta % 60).padStart(2, '0');

  const handleRecalibrate = useCallback(async () => {
    if (calibrating) return;
    setCalibrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-heading', {
        body: { videoId: selectedVideoId },
      });
      if (!error && data?.heading != null) {
        setInitialHeading(data.heading);
        console.log(`[InsideMo] Recalibrated heading: ${data.heading}°`);
      }
    } catch (e) {
      console.warn('[InsideMo] Recalibrate failed', e);
    }
    setCalibrating(false);
  }, [selectedVideoId, setInitialHeading, calibrating]);

  return (
    <div
      className="rounded-xl flex flex-col items-center gap-2"
      style={{
        width: 740,
        padding: '10px 24px',
        background: 'linear-gradient(180deg, hsl(220 18% 12%) 0%, hsl(220 20% 6%) 100%)',
        border: '1.5px solid hsl(220 15% 22% / 0.5)',
        borderTop: '1.5px solid hsl(220 15% 30% / 0.6)',
        boxShadow: '0 0 30px -5px hsl(195 100% 50% / 0.1), 0 6px 20px -4px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 hsl(220 15% 28% / 0.4), inset 0 -1px 0 hsl(220 15% 5% / 0.6)',
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div
          className="flex items-baseline gap-1 cursor-pointer select-none"
          onDoubleClick={handleRecalibrate}
          title="Double-click to recalibrate orientation"
        >
          <span
            className="text-2xl font-bold insidemo-mono"
            style={{ color: calibrating ? 'hsl(45 100% 60%)' : 'hsl(195 100% 50%)' }}
          >
            {calibrating ? '⏳' : speed}
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
    </div>
  );
};

export default HUDOverlay;
