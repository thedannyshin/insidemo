import { create } from 'zustand';

interface CameraBaseState {
  baseX: number;
  baseY: number;
  baseZ: number;
  lookPitch: number;
  lookYaw: number;
  hudX: number;
  hudY: number;
  hudZ: number;
  hudRotX: number;
  hudScale: number;
  videoMaxH: number;
  videoMaxV: number;
  videoHeadingOffset: number;
  videoInvertH: number;
  setBase: (axis: string, value: number) => void;
}

export const useCameraBase = create<CameraBaseState>((set) => ({
  baseX: -0.36,
  baseY: 0.33,
  baseZ: 0.47,
  lookPitch: 0.06,
  lookYaw: 3.14,
  hudX: -0.145,
  hudY: 0.09,
  hudZ: -0.26,
  hudRotX: -0.04,
  hudScale: 0.052,
  videoMaxH: 60,
  videoMaxV: 20,
  videoHeadingOffset: 220,
  videoInvertH: 1,
  setBase: (axis, value) => set({ [axis]: value }),
}));

const SliderGroup = ({
  title,
  color,
  sliders,
  onChange,
}: {
  title: string;
  color: string;
  sliders: { label: string; key: string; value: number; min: number; max: number; step: number }[];
  onChange: (key: string, value: number) => void;
}) => (
  <>
    <div style={{ fontWeight: 'bold', marginBottom: 4, marginTop: 8, color }}>
      {title}
    </div>
    {sliders.map(({ label, key, value, min, max, step }) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 50, color: '#94a3b8', fontSize: 11 }}>{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(key, parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: color }}
        />
        <span style={{ width: 50, textAlign: 'right', color: '#e2e8f0' }}>
          {value.toFixed(3)}
        </span>
      </div>
    ))}
  </>
);

const CameraDebugSliders = () => {
  const state = useCameraBase();

  const cameraSliders = [
    { label: 'X', key: 'baseX', value: state.baseX, min: -2, max: 2, step: 0.01 },
    { label: 'Y', key: 'baseY', value: state.baseY, min: -1, max: 2, step: 0.01 },
    { label: 'Z', key: 'baseZ', value: state.baseZ, min: -2, max: 2, step: 0.01 },
    { label: 'Pitch', key: 'lookPitch', value: state.lookPitch, min: -1, max: 1, step: 0.01 },
    { label: 'Yaw', key: 'lookYaw', value: state.lookYaw, min: 0, max: Math.PI * 2, step: 0.01 },
  ];

  const hudSliders = [
    { label: 'X', key: 'hudX', value: state.hudX, min: -1, max: 1, step: 0.005 },
    { label: 'Y', key: 'hudY', value: state.hudY, min: -0.5, max: 1, step: 0.005 },
    { label: 'Z', key: 'hudZ', value: state.hudZ, min: -1, max: 1, step: 0.005 },
    { label: 'Tilt', key: 'hudRotX', value: state.hudRotX, min: -1, max: 0.5, step: 0.01 },
    { label: 'Scale', key: 'hudScale', value: state.hudScale, min: 0.01, max: 0.08, step: 0.0005 },
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
        minWidth: 300,
        maxHeight: '90vh',
        overflowY: 'auto',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <SliderGroup title="📷 Camera" color="#38bdf8" sliders={cameraSliders} onChange={state.setBase} />
      <SliderGroup title="🖥️ HUD Panel" color="#a78bfa" sliders={hudSliders} onChange={state.setBase} />
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
        Share values when done
      </div>
    </div>
  );
};

export default CameraDebugSliders;
