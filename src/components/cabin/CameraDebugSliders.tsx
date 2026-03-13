import { create } from 'zustand';

interface CameraBaseState {
  baseX: number;
  baseY: number;
  baseZ: number;
  setBase: (axis: 'baseX' | 'baseY' | 'baseZ', value: number) => void;
}

export const useCameraBase = create<CameraBaseState>((set) => ({
  baseX: -0.3,
  baseY: 0.39,
  baseZ: 0.16,
  setBase: (axis, value) => set({ [axis]: value }),
}));

const CameraDebugSliders = () => {
  const { baseX, baseY, baseZ, setBase } = useCameraBase();

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: '16px 20px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 260,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#7dd3fc' }}>
        📷 Camera Position
      </div>
      {([
        { label: 'X', key: 'baseX' as const, value: baseX, min: -2, max: 2 },
        { label: 'Y', key: 'baseY' as const, value: baseY, min: -1, max: 2 },
        { label: 'Z', key: 'baseZ' as const, value: baseZ, min: -2, max: 2 },
      ]).map(({ label, key, value, min, max }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, color: '#94a3b8' }}>{label}</span>
          <input
            type="range"
            min={min}
            max={max}
            step={0.01}
            value={value}
            onChange={(e) => setBase(key, parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#38bdf8' }}
          />
          <span style={{ width: 50, textAlign: 'right', color: '#e2e8f0' }}>
            {value.toFixed(2)}
          </span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
        Copy values when done, then remove this panel
      </div>
    </div>
  );
};

export default CameraDebugSliders;
