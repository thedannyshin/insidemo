import { create } from 'zustand';

interface CameraBaseState {
  baseX: number;
  baseY: number;
  baseZ: number;
  lookPitch: number;
  lookYaw: number;
  setBase: (axis: string, value: number) => void;
}

export const useCameraBase = create<CameraBaseState>((set) => ({
  baseX: -0.3,
  baseY: 0.39,
  baseZ: 0.16,
  lookPitch: 0,
  lookYaw: Math.PI,
  setBase: (axis, value) => set({ [axis]: value }),
}));

const CameraDebugSliders = () => {
  const state = useCameraBase();

  const sliders = [
    { label: 'X', key: 'baseX', value: state.baseX, min: -2, max: 2, step: 0.01 },
    { label: 'Y', key: 'baseY', value: state.baseY, min: -1, max: 2, step: 0.01 },
    { label: 'Z', key: 'baseZ', value: state.baseZ, min: -2, max: 2, step: 0.01 },
    { label: 'Pitch', key: 'lookPitch', value: state.lookPitch, min: -1, max: 1, step: 0.01 },
    { label: 'Yaw', key: 'lookYaw', value: state.lookYaw, min: 0, max: Math.PI * 2, step: 0.01 },
  ];

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
        minWidth: 280,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#7dd3fc' }}>
        📷 Camera Position & Angle
      </div>
      {sliders.map(({ label, key, value, min, max, step }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 40, color: '#94a3b8', fontSize: 11 }}>{label}</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => state.setBase(key, parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#38bdf8' }}
          />
          <span style={{ width: 50, textAlign: 'right', color: '#e2e8f0' }}>
            {value.toFixed(2)}
          </span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
        Share values when done
      </div>
    </div>
  );
};

export default CameraDebugSliders;
