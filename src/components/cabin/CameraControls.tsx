import { create } from 'zustand';

interface CameraOffsetState {
  offset: { x: number; y: number; z: number };
  rotation: { h: number; v: number };
  fov: number;
  move: (dx: number, dy: number, dz: number) => void;
  rotate: (dh: number, dv: number) => void;
  zoom: (delta: number) => void;
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

/** Top-down minimap showing camera dot + look direction inside car outline */
const CabinMinimap = () => {
  const offset = useCameraOffset((s) => s.offset);
  const rotation = useCameraOffset((s) => s.rotation);

  // Map offset to minimap coords (car is ~2.4 wide, ~3.0 long)
  const mapW = 90;
  const mapH = 120;
  const cx = mapW / 2 + (offset.x / 1.2) * (mapW / 2 - 8);
  const cy = mapH / 2 - (offset.z / 1.5) * (mapH / 2 - 8);
  // Look direction arrow
  const arrowLen = 16;
  const ax = cx + Math.sin(rotation.h) * arrowLen;
  const ay = cy - Math.cos(rotation.h) * arrowLen;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[8px] tracking-widest uppercase mb-0.5" style={{ color: 'hsl(45 80% 65%)' }}>
        Position
      </div>
      <svg
        width={mapW}
        height={mapH}
        style={{
          background: 'hsl(220 20% 10% / 0.85)',
          border: '1px solid hsl(195 80% 50% / 0.3)',
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Car body outline */}
        <rect x={10} y={10} width={mapW - 20} height={mapH - 20} rx={12} ry={12}
          fill="none" stroke="hsl(195, 60%, 40%)" strokeWidth={1.5} strokeDasharray="4 2" />
        {/* Windshield indicator (front) */}
        <line x1={20} y1={14} x2={mapW - 20} y2={14}
          stroke="hsl(195, 80%, 55%)" strokeWidth={2} />
        {/* Seats */}
        {[
          [22, 55, 18, 22], // driver
          [mapW - 40, 55, 18, 22], // passenger
          [22, 82, 18, 18], // rear left
          [mapW - 40, 82, 18, 18], // rear right
        ].map(([sx, sy, sw, sh], i) => (
          <rect key={i} x={sx} y={sy} width={sw} height={sh} rx={3}
            fill="hsl(220, 15%, 18%)" stroke="hsl(220, 15%, 30%)" strokeWidth={0.5} />
        ))}
        {/* Look direction line */}
        <line x1={cx} y1={cy} x2={ax} y2={ay}
          stroke="hsl(280, 70%, 60%)" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
        {/* Camera dot */}
        <circle cx={cx} cy={cy} r={5} fill="hsl(195, 100%, 60%)" opacity={0.9} />
        <circle cx={cx} cy={cy} r={3} fill="hsl(195, 100%, 85%)" />
        {/* Arrow tip */}
        <circle cx={ax} cy={ay} r={2.5} fill="hsl(280, 70%, 65%)" opacity={0.7} />
      </svg>
    </div>
  );
};

const CameraDPad = () => {
  const move = useCameraOffset((s) => s.move);
  const rotate = useCameraOffset((s) => s.rotate);
  const reset = useCameraOffset((s) => s.reset);

  return (
    <div className="flex gap-4 items-start" style={{ pointerEvents: 'auto' }}>
      {/* Minimap */}
      <CabinMinimap />

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
