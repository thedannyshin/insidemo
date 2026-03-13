import { create } from 'zustand';

interface CameraOffsetState {
  offset: { x: number; y: number; z: number };
  rotation: { h: number; v: number }; // horizontal & vertical look angles
  move: (dx: number, dy: number, dz: number) => void;
  rotate: (dh: number, dv: number) => void;
  reset: () => void;
}

export const useCameraOffset = create<CameraOffsetState>((set) => ({
  offset: { x: 0, y: 0, z: 0 },
  rotation: { h: 0, v: 0 },
  move: (dx, dy, dz) =>
    set((s) => ({
      offset: {
        x: Math.max(-1.2, Math.min(1.2, s.offset.x + dx)),
        y: Math.max(-0.4, Math.min(0.6, s.offset.y + dy)),
        z: Math.max(-1.5, Math.min(1.5, s.offset.z + dz)),
      },
    })),
  rotate: (dh, dv) =>
    set((s) => ({
      rotation: {
        h: Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, s.rotation.h + dh)),
        v: Math.max(-0.4, Math.min(0.5, s.rotation.v + dv)),
      },
    })),
  reset: () => set({ offset: { x: 0, y: 0, z: 0 }, rotation: { h: 0, v: 0 } }),
}));

const step = 0.15;

const btn = (label: string, onDown: () => void) => (
  <button
    key={label}
    onPointerDown={(e) => { e.stopPropagation(); onDown(); }}
    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold select-none active:scale-90 transition-transform"
    style={{
      background: 'hsl(220 20% 15% / 0.85)',
      border: '1px solid hsl(195 80% 50% / 0.3)',
      color: 'hsl(195 100% 70%)',
      backdropFilter: 'blur(8px)',
    }}
  >
    {label}
  </button>
);

const rotStep = 0.2;

const CameraDPad = () => {
  const move = useCameraOffset((s) => s.move);
  const rotate = useCameraOffset((s) => s.rotate);
  const reset = useCameraOffset((s) => s.reset);

  return (
    <div className="flex gap-4" style={{ pointerEvents: 'auto' }}>
      {/* Position controls */}
      <div className="flex flex-col items-center gap-1">
        <div className="text-[8px] tracking-widest uppercase mb-0.5" style={{ color: 'hsl(195 80% 60%)' }}>
          Move
        </div>
        <div className="flex gap-1">
          {btn('↑', () => move(0, step, 0))}
        </div>
        <div className="flex gap-1">
          {btn('←', () => move(-step, 0, 0))}
          {btn('●', reset)}
          {btn('→', () => move(step, 0, 0))}
        </div>
        <div className="flex gap-1">
          {btn('↓', () => move(0, -step, 0))}
        </div>
        <div className="flex gap-1 mt-0.5">
          {btn('▲', () => move(0, 0, step))}
          {btn('▼', () => move(0, 0, -step))}
        </div>
      </div>

      {/* Rotation controls */}
      <div className="flex flex-col items-center gap-1">
        <div className="text-[8px] tracking-widest uppercase mb-0.5" style={{ color: 'hsl(280 70% 65%)' }}>
          Look
        </div>
        <div className="flex gap-1">
          {btn('⬆', () => rotate(0, rotStep))}
        </div>
        <div className="flex gap-1">
          {btn('⬅', () => rotate(rotStep, 0))}
          {btn('⬇', () => rotate(0, -rotStep))}
          {btn('➡', () => rotate(-rotStep, 0))}
        </div>
      </div>
    </div>
  );
};

export default CameraDPad;
