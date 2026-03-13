import CabinScene from '@/components/cabin/CabinScene';
import { useRideEngine } from '@/hooks/useRideEngine';
import { useRideStore } from '@/store/rideStore';
import { Suspense } from 'react';

const Index = () => {
  const { startRide, replayRide } = useRideEngine();
  const phase = useRideStore((s) => s.phase);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'hsl(220, 20%, 4%)' }}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-screen">
            <div className="text-center">
              <div className="text-2xl font-semibold insidemo-gradient-text mb-2">
                InsideMo
              </div>
              <p className="text-sm text-muted-foreground insidemo-mono">
                Loading cabin experience...
              </p>
            </div>
          </div>
        }
      >
        <CabinScene onStartRide={startRide} onReplay={replayRide} />
      </Suspense>

      {/* Phase indicator */}
      <div className="absolute top-4 left-4 insidemo-glass rounded-lg px-3 py-1.5">
        <span className="text-[10px] tracking-[0.2em] uppercase insidemo-mono text-muted-foreground">
          InsideMo
        </span>
        <span className="text-[10px] ml-2 insidemo-mono" style={{ color: 'hsl(195, 100%, 50%)' }}>
          {phase === 'pre-ride' && '● Ready'}
          {phase === 'takeoff' && '● Departing'}
          {phase === 'riding' && '● En Route'}
          {phase === 'arrived' && '● Arrived'}
        </span>
      </div>
    </div>
  );
};

export default Index;
