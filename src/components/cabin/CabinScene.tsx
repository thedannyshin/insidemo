import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Html, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import LeftScreen from './LeftScreen';
import RightScreen from './RightScreen';
import WindshieldHUD from './WindshieldHUD';
import StreetViewWindow from './StreetViewWindow';
import { useRideStore } from '@/store/rideStore';

// Idle camera bob
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
        const joltIntensity = Math.sin(elapsed * 20) * 0.03 * (1 - elapsed * 2);
        groupRef.current.position.z = joltIntensity;
      }
    }
  });

  return <group ref={groupRef} />;
};

// Cabin model
const CabinModel = () => {
  const { scene } = useGLTF('/models/cabin.glb');
  return <primitive object={scene} scale={1} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />;
};

// The full cabin scene content
const CabinSceneContent = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1.2} color="#e8f0ff" />
      <pointLight position={[0, 2.5, 0]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, 1.5, -2]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-1.5, 1.5, -1]} intensity={0.6} color="#00b4d8" />
      <pointLight position={[1.5, 1.5, -1]} intensity={0.6} color="#7209b7" />
      <hemisphereLight args={['#b0d4f1', '#1a1a2e', 0.8]} />

      {/* Cabin model */}
      <CabinModel />

      {/* Camera bob */}
      <CameraBob />

      {/* Street View — behind windshield */}
      <Html
        position={[0, 1.4, 4]}
        rotation={[0, Math.PI, 0]}
        transform
        scale={0.008}
        style={{ pointerEvents: 'none' }}
      >
        <StreetViewWindow
          style={{
            width: 640,
            height: 400,
            borderRadius: 0,
            opacity: 0.9,
          }}
        />
      </Html>

      {/* Left screen — entertainment */}
      <Html
        position={[-0.5, 0.75, 0.8]}
        rotation={[-0.2, Math.PI - 0.25, 0]}
        transform
        scale={0.003}
        style={{ pointerEvents: 'auto' }}
        zIndexRange={[100, 0]}
      >
        <LeftScreen />
      </Html>

      {/* Right screen — navigation */}
      <Html
        position={[0.5, 0.75, 0.8]}
        rotation={[-0.2, Math.PI + 0.25, 0]}
        transform
        scale={0.003}
        style={{ pointerEvents: 'auto' }}
        zIndexRange={[100, 0]}
      >
        <RightScreen onStartRide={onStartRide} onReplay={onReplay} />
      </Html>

      {/* Windshield HUD — in front of street view */}
      <WindshieldHUD />

      {/* Environment for reflections */}
      <Environment preset="night" />

      {/* Debug camera controls */}
      <OrbitControls
        makeDefault
        enablePan={false}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.35}
        maxDistance={5}
        minDistance={1}
        target={[0, 1.0, 2]}
      />
    </>
  );
};

const CabinScene = ({
  onStartRide,
  onReplay,
}: {
  onStartRide: () => void;
  onReplay: () => void;
}) => {
  return (
    <div className="w-full h-screen" style={{ background: 'hsl(220, 20%, 4%)' }}>
      <Canvas
        camera={{
          position: [0, 0.9, -0.2],
          fov: 75,
          near: 0.05,
          far: 1000,
        }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <CabinSceneContent onStartRide={onStartRide} onReplay={onReplay} />
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/cabin.glb');

export default CabinScene;
