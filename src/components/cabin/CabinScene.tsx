import { useRef, useEffect, useCallback, useState } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import LeftScreen from './LeftScreen';
import RightScreen from './RightScreen';
import { useCameraOffset } from './CameraControls';
import HUDOverlay from './HUDOverlay';
import StreetViewPanorama from './StreetViewPanorama';
import { useRideStore } from '@/store/rideStore';
import { useCameraBase } from './CameraDebugSliders';

const CameraController = () => {
  const baseX = useCameraBase((s) => s.baseX);
  const baseY = useCameraBase((s) => s.baseY);
  const baseZ = useCameraBase((s) => s.baseZ);
  const lookPitch = useCameraBase((s) => s.lookPitch);
  const lookYaw = useCameraBase((s) => s.lookYaw);
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
    const isInsideHtmlPanel = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest('[data-cabin-panel]');
    };
    const onPointerDown = (e: PointerEvent) => {
      if (isInsideHtmlPanel(e.target)) return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
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
      if (isInsideHtmlPanel(e.target)) return;
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
    const cx = baseX + offset.x + Math.sin(t * 0.5) * bobIntensity * 0.5;
    const cy = baseY + offset.y + Math.sin(t * 0.8) * bobIntensity;
    const cz = baseZ + offset.z + joltZ;
    camera.position.set(cx, cy, cz);

    const lookDist = 3;
    const baseYaw = lookYaw + rotation.h;
    const tx = cx + Math.sin(baseYaw) * lookDist;
    const ty = cy + (lookPitch + rotation.v) * lookDist;
    const tz = cz + Math.cos(baseYaw) * lookDist;
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
        mat.opacity = 0.08;
        mat.depthWrite = false;
        mat.side = THREE.DoubleSide;
        mat.color = new THREE.Color('#aaddff');
        mat.roughness = 0.05;
        mat.metalness = 0.1;
        mat.envMapIntensity = 1.0;
        mat.needsUpdate = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} scale={1} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />;
};

const CabinScene3D = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  const hudX = useCameraBase((s) => s.hudX);
  const hudY = useCameraBase((s) => s.hudY);
  const hudZ = useCameraBase((s) => s.hudZ);
  const hudRotX = useCameraBase((s) => s.hudRotX);
  const hudScale = useCameraBase((s) => s.hudScale);

  return (
  <>
    <ambientLight intensity={2.5} color="#fff8e7" />
    <directionalLight position={[5, 10, 5]} intensity={2.0} color="#ffecd2" castShadow />
    <directionalLight position={[-3, 6, 8]} intensity={1.0} color="#87CEEB" />
    <pointLight position={[0, 2.5, 0]} intensity={1.5} color="#ffffff" />
    <pointLight position={[0, 1.5, 4]} intensity={1.5} color="#ffd89b" />
    <hemisphereLight args={['#87CEEB', '#F5E6CA', 1.0]} />
    <CabinModel />
    {/* Floor to block outside view beneath cabin */}
    <mesh position={[0, -1, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4, 6]} />
      <meshStandardMaterial color="#000000" roughness={1} />
    </mesh>
    <CameraController />

    {/* Combined dashboard panel */}
    <Html
      position={[hudX, hudY, hudZ]}
      rotation={[hudRotX, 0, 0]}
      transform
      scale={hudScale}
      style={{ pointerEvents: 'auto' }}
    >
      <div data-cabin-panel style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <HUDOverlay />
        <div data-cabin-panel style={{ display: 'flex', gap: 12 }}>
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
  </>
  );
};

const RecalibrateButton = () => {
  const [loading, setLoading] = useState(false);
  const selectedVideoId = useRideStore((s) => s.selectedVideoId);
  const setInitialHeading = useRideStore((s) => s.setInitialHeading);

  const handleRecalibrate = useCallback(async () => {
    setLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
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
    setLoading(false);
  }, [selectedVideoId, setInitialHeading]);

  return (
    <button
      onClick={handleRecalibrate}
      disabled={loading}
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        padding: '6px 12px',
        borderRadius: 8,
        background: 'hsl(220 18% 12% / 0.85)',
        border: '1px solid hsl(220 15% 22% / 0.5)',
        color: 'rgba(200, 220, 240, 0.85)',
        fontSize: 11,
        fontWeight: 600,
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}
    >
      {loading ? '⏳ Calibrating...' : '🧭 Recalibrate'}
    </button>
  );
};

const CabinScene = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => (
  <div className="w-full h-screen relative" style={{ background: '#000' }}>
    <StreetViewPanorama />
    <RecalibrateButton />
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />
    <Canvas
      camera={{ position: [0, 0.55, 0.3], fov: 72, near: 0.01, far: 1000 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.8,
        alpha: true,
      }}
      style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'transparent', pointerEvents: 'none' }}
    >
      <CabinScene3D onStartRide={onStartRide} onReplay={onReplay} />
    </Canvas>
  </div>
);

useGLTF.preload('/models/cabin.glb');
export default CabinScene;
