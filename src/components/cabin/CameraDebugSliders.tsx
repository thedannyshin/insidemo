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
  setBase: (axis: string, value: number) => void;
}

export const useCameraBase = create<CameraBaseState>((set) => ({
  baseX: -0.3,
  baseY: 0.39,
  baseZ: 0.16,
  lookPitch: 0,
  lookYaw: Math.PI,
  hudX: -0.14,
  hudY: 0.17,
  hudZ: -0.26,
  hudRotX: -0.20,
  hudScale: 0.0385,
  setBase: (axis, value) => set({ [axis]: value }),
}));

const CameraDebugSliders = () => {
  const state = useCameraBase();

  const sections = [
    {
      title: '📷 Camera Position & Angle',
      color: '#7dd3fc',
      sliders: [
        { label: 'X', key: 'baseX', value: state.baseX, min: -2, max: 2, step: 0.01 },
        { label: 'Y', key: 'baseY', value: state.baseY, min: -1, max: 2, step: 0.01 },
        { label: 'Z', key: 'baseZ', value: state.baseZ, min: -2, max: 2, step: 0.01 },
        { label: 'Pitch', key: 'lookPitch', value: state.lookPitch, min: -1, max: 1, step: 0.01 },
        { label: 'Yaw', key: 'lookYaw', value: state.lookYaw, min: 0, max: Math.PI * 2, step: 0.01 },
      ],
    },
    {
      title: '🖥️ HUD Panel',
      color: '#a78bfa',
      sliders: [
        { label: 'X', key: 'hudX', value: state.hudX, min: -1, max: 1, step: 0.01 },
        { label: 'Y', key: 'hudY', value: state.hudY, min: -0.5, max: 1, step: 0.01 },
        { label: 'Z', key: 'hudZ', value: state.hudZ, min: -1, max: 1, step: 0.01 },
        { label: 'Tilt', key: 'hudRotX', value: state.hudRotX, min: -1, max: 1, step: 0.01 },
        { label: 'Scale', key: 'hudScale', value: state.hudScale, min: 0.01, max: 0.1, step: 0.001 },
      ],
    },
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
        gap: 14,
        minWidth: 280,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      {sections.map((section) => (
        <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 'bold', color: section.color }}>{section.title}</div>
          {section.sliders.map(({ label, key, value, min, max, step }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 40, color: '#94a3b8', fontSize: 11 }}>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => state.setBase(key, parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: section.color }}
              />
              <span style={{ width: 55, textAlign: 'right', color: '#e2e8f0' }}>
                {value.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#64748b' }}>Share values when done</div>
    </div>
  );
};

export default CameraDebugSliders;
