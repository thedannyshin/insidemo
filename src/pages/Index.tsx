import CabinScene from '@/components/cabin/CabinScene';
import BirdEyeView from '@/components/cabin/BirdEyeView';
import { useRideEngine } from '@/hooks/useRideEngine';
import { useRideStore } from '@/store/rideStore';
import { Suspense } from 'react';

const Index = () => {
  const { startRide, stopRide, replayRide } = useRideEngine();
  const phase = useRideStore((s) => s.phase);
  const viewMode = useRideStore((s) => s.viewMode);
  const setViewMode = useRideStore((s) => s.setViewMode);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'hsl(210, 30%, 96%)' }}>
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
        {/* View layer */}
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: viewMode === 'cabin' ? 1 : 0, pointerEvents: viewMode === 'cabin' ? 'auto' : 'none' }}>
          <CabinScene onStartRide={startRide} onReplay={replayRide} />
        </div>
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: viewMode === 'birdseye' ? 1 : 0, pointerEvents: viewMode === 'birdseye' ? 'auto' : 'none' }}>
          <BirdEyeView />
        </div>
      </Suspense>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        {/* Phase indicator */}
        <div className="insidemo-glass rounded-lg px-3 py-1.5">
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

        {/* View toggle */}
        <div className="insidemo-glass rounded-lg flex overflow-hidden">
          <button
            onClick={() => setViewMode('cabin')}
            className="px-3 py-1.5 text-[10px] uppercase tracking-wider insidemo-mono transition-all"
            style={{
              color: viewMode === 'cabin' ? 'hsl(195, 100%, 50%)' : 'rgba(200,220,240,0.5)',
              background: viewMode === 'cabin' ? 'hsl(195 100% 50% / 0.1)' : 'transparent',
            }}
          >
            🚘 Cabin
          </button>
          <div className="w-px" style={{ background: 'hsl(220 15% 25% / 0.4)' }} />
          <button
            onClick={() => setViewMode('birdseye')}
            className="px-3 py-1.5 text-[10px] uppercase tracking-wider insidemo-mono transition-all"
            style={{
              color: viewMode === 'birdseye' ? 'hsl(195, 100%, 50%)' : 'rgba(200,220,240,0.5)',
              background: viewMode === 'birdseye' ? 'hsl(195 100% 50% / 0.1)' : 'transparent',
            }}
          >
            🗺️ Bird's Eye
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
