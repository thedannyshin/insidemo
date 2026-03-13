import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import LeftScreen from './LeftScreen';
import RightScreen from './RightScreen';
import CameraDPad, { useCameraOffset } from './CameraControls';
import HUDOverlay from './HUDOverlay';
import StreetViewWindow from './StreetViewWindow';
import { useRideStore } from '@/store/rideStore';

const CameraBob = () => {
  const groupRef = useRef<THREE.Group>(null);
  const phase = useRideStore((s) => s.phase);
  const activeIncident = useRideStore((s) => s.activeIncident);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const bobIntensity = phase === 'riding' ? 0.008 : 0.004;
    groupRef.current.position.y = Math.sin(t * 0.8) * bobIntensity;
    groupRef.current.position.x = Math.sin(t * 0.5) * bobIntensity * 0.5;
    if (activeIncident?.cameraJolt && activeIncident.active) {
      const elapsed = (Date.now() - activeIncident.startTime) / 1000;
      if (elapsed < 0.5) {
        groupRef.current.position.z = Math.sin(elapsed * 20) * 0.03 * (1 - elapsed * 2);
      }
    }
  });
  return <group ref={groupRef} />;
};

const CabinModel = () => {
  const { scene } = useGLTF('/models/cabin.glb');
  return <primitive object={scene} scale={1} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />;
};

const CabinScene3D = () => (
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
    <CameraBob />
    <Html
      position={[0, 1.4, 4]}
      rotation={[0, Math.PI, 0]}
      transform
      scale={0.008}
      style={{ pointerEvents: 'none' }}
    >
      <StreetViewWindow style={{ width: 640, height: 400, borderRadius: 0, opacity: 0.9 }} />
    </Html>
    <Environment preset="sunset" background blur={0.5} />
    <OrbitControls
      makeDefault
      enablePan={false}
      enableZoom={false}
      maxPolarAngle={Math.PI * 0.6}
      minPolarAngle={Math.PI * 0.35}
      maxAzimuthAngle={Math.PI * 0.3}
      minAzimuthAngle={-Math.PI * 0.3}
      target={[0, 1.0, 2.5]}
    />
  </>
);

const CabinScene = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => (
  <div className="w-full h-screen relative" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B8D8E8 40%, #E8D8C0 100%)' }}>
    <Canvas
      camera={{ position: [0, 1.0, -0.3], fov: 72, near: 0.01, far: 1000 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.8 }}
      className="absolute inset-0"
    >
      <CabinScene3D />
    </Canvas>

    {/* 2D Dashboard overlay */}
    <div
      className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center gap-2 px-6 pb-2"
      style={{ pointerEvents: 'none' }}
    >
      {/* HUD bar */}
      <div style={{ pointerEvents: 'auto' }}>
        <HUDOverlay />
      </div>

      {/* Screens row */}
      <div className="flex justify-center gap-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            pointerEvents: 'auto',
            width: 360,
            height: 200,
            boxShadow: '0 0 30px -5px hsl(195 100% 50% / 0.2), 0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid hsl(220 15% 20% / 0.4)',
            background: 'hsl(220 18% 8%)',
          }}
        >
          <LeftScreen />
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            pointerEvents: 'auto',
            width: 360,
            height: 200,
            boxShadow: '0 0 30px -5px hsl(195 100% 50% / 0.2), 0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid hsl(220 15% 20% / 0.4)',
            background: 'hsl(220 18% 8%)',
          }}
        >
          <RightScreen onStartRide={onStartRide} onReplay={onReplay} />
        </div>
      </div>
    </div>
  </div>
);

useGLTF.preload('/models/cabin.glb');
export default CabinScene;
