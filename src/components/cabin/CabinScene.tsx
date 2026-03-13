import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import LeftScreen from './LeftScreen';
import RightScreen from './RightScreen';
import CameraDPad, { useCameraOffset } from './CameraControls';
import HUDOverlay from './HUDOverlay';
import StreetViewWindow from './StreetViewWindow';
import { useRideStore } from '@/store/rideStore';

const CameraController = () => {
  const offset = useCameraOffset((s) => s.offset);
  const rotation = useCameraOffset((s) => s.rotation);
  const rotate = useCameraOffset((s) => s.rotate);
  const zoom = useCameraOffset((s) => s.zoom);
  const fov = useCameraOffset((s) => s.fov);
  const { camera } = useThree();
  const phase = useRideStore((s) => s.phase);
  const activeIncident = useRideStore((s) => s.activeIncident);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'CANVAS') return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      rotate(-dx * 0.004, dy * 0.004);
    };
    const onPointerUp = () => { isDragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY * 0.05);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, [rotate, zoom]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const bobIntensity = phase === 'riding' ? 0.008 : 0.004;
    let joltZ = 0;
    if (activeIncident?.cameraJolt && activeIncident.active) {
      const elapsed = (Date.now() - activeIncident.startTime) / 1000;
      if (elapsed < 0.5) {
        joltZ = Math.sin(elapsed * 20) * 0.03 * (1 - elapsed * 2);
      }
    }
    const cx = -0.25 + offset.x + Math.sin(t * 0.5) * bobIntensity * 0.5;
    const cy = 0.38 + offset.y + Math.sin(t * 0.8) * bobIntensity;
    const cz = 0.15 + offset.z + joltZ;
    camera.position.set(cx, cy, cz);

    const lookDist = 3;
    const tx = cx + Math.sin(rotation.h + Math.PI) * lookDist;
    const ty = cy + rotation.v * lookDist;
    const tz = cz + Math.cos(rotation.h + Math.PI) * lookDist;
    camera.lookAt(tx, ty, tz);
    (camera as THREE.PerspectiveCamera).fov = fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  });
  return null;
};

const CabinModel = () => {
  const { scene } = useGLTF('/models/cabin.glb');

  useEffect(() => {
    scene.traverse((child: any) => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (!mat) return;
      const name = (mat.name || '').toLowerCase();
      const meshName = (child.name || '').toLowerCase();
      const isGlass =
        name.includes('glass') || name.includes('window') || name.includes('windshield') ||
        name.includes('transparent') || meshName.includes('glass') || meshName.includes('window') ||
        meshName.includes('windshield');

      if (isGlass || (mat.opacity !== undefined && mat.opacity < 0.9 && mat.opacity > 0)) {
        mat.transparent = true;
        mat.opacity = 0.15;
        mat.depthWrite = false;
        mat.side = THREE.DoubleSide;
        mat.color = new THREE.Color('#aaddff');
        mat.roughness = 0.05;
        mat.metalness = 0.1;
        mat.envMapIntensity = 2.0;
        mat.needsUpdate = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} scale={1} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />;
};

const CabinScene3D = ({
  onStartRide,
  onReplay,
  dashPos,
  dashRot,
  dashScale,
}: {
  onStartRide: () => void;
  onReplay: () => void;
  dashPos: [number, number, number];
  dashRot: [number, number, number];
  dashScale: number;
}) => (
  <>
    <ambientLight intensity={3.5} color="#fff8e7" />
    <directionalLight position={[5, 10, 5]} intensity={4.0} color="#ffecd2" castShadow />
    <directionalLight position={[-3, 6, 8]} intensity={2.0} color="#87CEEB" />
    <pointLight position={[0, 2.5, 0]} intensity={2.0} color="#ffffff" />
    <pointLight position={[0, 1.5, 4]} intensity={3.0} color="#ffd89b" />
    <pointLight position={[-1.5, 1.5, -1]} intensity={1.0} color="#87CEEB" />
    <pointLight position={[1.5, 1.5, -1]} intensity={1.0} color="#98D8C8" />
    <hemisphereLight args={['#87CEEB', '#F5E6CA', 2.0]} />
    <CabinModel />
    <CameraController />

    {/* Windshield street view */}
    <Html
      position={[0, 1.4, 4]}
      rotation={[0, Math.PI, 0]}
      transform
      scale={0.008}
      style={{ pointerEvents: 'none' }}
    >
      <StreetViewWindow style={{ width: 640, height: 400, borderRadius: 0, opacity: 0.9 }} />
    </Html>

    {/* Combined dashboard panel */}
    <Html
      position={dashPos}
      rotation={dashRot}
      transform
      scale={dashScale}
      style={{ pointerEvents: 'auto' }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <HUDOverlay />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: 360, height: 200, borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 0 30px -5px hsl(195 100% 50% / 0.2), 0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid hsl(220 15% 20% / 0.4)', background: 'hsl(220 18% 8%)',
          }}>
            <LeftScreen />
          </div>
          <div style={{
            width: 360, height: 200, borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 0 30px -5px hsl(195 100% 50% / 0.2), 0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid hsl(220 15% 20% / 0.4)', background: 'hsl(220 18% 8%)',
          }}>
            <RightScreen onStartRide={onStartRide} onReplay={onReplay} />
          </div>
        </div>
      </div>
    </Html>

    <Environment preset="sunset" background blur={0.5} />
  </>
);

/* Dev controls for positioning the dashboard */
const DevControls = ({
  pos, setPos, rot, setRot, scale, setScale,
}: {
  pos: [number, number, number]; setPos: (v: [number, number, number]) => void;
  rot: [number, number, number]; setRot: (v: [number, number, number]) => void;
  scale: number; setScale: (v: number) => void;
}) => {
  const labels = ['X', 'Y', 'Z'];
  return (
    <div
      className="absolute top-16 left-4 z-[100] rounded-xl p-3 flex flex-col gap-2 text-[10px] font-mono"
      style={{
        background: 'hsl(220 18% 8% / 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid hsl(220 15% 20% / 0.4)',
        color: 'rgba(200,220,240,0.8)',
        width: 220,
        pointerEvents: 'auto',
      }}
    >
      <div className="font-bold text-xs" style={{ color: 'hsl(195 100% 50%)' }}>Dashboard Placement</div>
      
      <div className="font-bold mt-1">Position</div>
      {labels.map((l, i) => (
        <label key={`p${l}`} className="flex items-center gap-2">
          <span className="w-3">{l}</span>
          <input type="range" min={-3} max={3} step={0.01}
            value={pos[i]}
            onChange={e => { const n = [...pos] as [number, number, number]; n[i] = +e.target.value; setPos(n); }}
            className="flex-1 h-1 accent-cyan-400"
          />
          <span className="w-10 text-right">{pos[i].toFixed(2)}</span>
        </label>
      ))}

      <div className="font-bold mt-1">Rotation</div>
      {labels.map((l, i) => (
        <label key={`r${l}`} className="flex items-center gap-2">
          <span className="w-3">{l}</span>
          <input type="range" min={-3.14} max={3.14} step={0.01}
            value={rot[i]}
            onChange={e => { const n = [...rot] as [number, number, number]; n[i] = +e.target.value; setRot(n); }}
            className="flex-1 h-1 accent-cyan-400"
          />
          <span className="w-10 text-right">{rot[i].toFixed(2)}</span>
        </label>
      ))}

      <div className="font-bold mt-1">Scale</div>
      <label className="flex items-center gap-2">
        <span className="w-3">S</span>
        <input type="range" min={0.001} max={0.05} step={0.0005}
          value={scale}
          onChange={e => setScale(+e.target.value)}
          className="flex-1 h-1 accent-cyan-400"
        />
        <span className="w-10 text-right">{scale.toFixed(4)}</span>
      </label>

      <button
        className="mt-2 px-2 py-1 rounded text-[9px] font-bold"
        style={{ background: 'hsl(195 100% 50% / 0.2)', border: '1px solid hsl(195 100% 50% / 0.3)', color: 'hsl(195 100% 50%)' }}
        onClick={() => {
          const code = `position={[${pos.map(v => v.toFixed(2)).join(', ')}]} rotation={[${rot.map(v => v.toFixed(2)).join(', ')}]} scale={${scale.toFixed(4)}}`;
          navigator.clipboard.writeText(code);
          console.log('📋 Dashboard values:', code);
        }}
      >
        📋 Copy Values
      </button>
    </div>
  );
};

const CabinScene = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  const [dashPos, setDashPos] = useState<[number, number, number]>([0, 0.2, -0.4]);
  const [dashRot, setDashRot] = useState<[number, number, number]>([-0.3, 0, 0]);
  const [dashScale, setDashScale] = useState(0.012);

  return (
    <div className="w-full h-screen relative" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B8D8E8 40%, #E8D8C0 100%)' }}>
      <Canvas
        camera={{ position: [0, 0.55, 0.3], fov: 72, near: 0.01, far: 1000 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.8 }}
        className="absolute inset-0"
      >
        <CabinScene3D
          onStartRide={onStartRide}
          onReplay={onReplay}
          dashPos={dashPos}
          dashRot={dashRot}
          dashScale={dashScale}
        />
      </Canvas>

      {/* Dev controls for manual placement */}
      <DevControls
        pos={dashPos} setPos={setDashPos}
        rot={dashRot} setRot={setDashRot}
        scale={dashScale} setScale={setDashScale}
      />
    </div>
  );
};

useGLTF.preload('/models/cabin.glb');
export default CabinScene;
