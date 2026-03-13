import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRideStore } from '@/store/rideStore';
import HUDOverlay from './HUDOverlay';

const CarModel = () => {
  const { scene } = useGLTF('/models/cabin.glb');
  const groupRef = useRef<THREE.Group>(null);
  const phase = useRideStore((s) => s.phase);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Gentle sway while driving
    if (phase === 'riding') {
      groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.008;
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} scale={1} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />
    </group>
  );
};

const BirdEyeView = () => {
  const phase = useRideStore((s) => s.phase);

  return (
    <div className="w-full h-full relative" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #A8D8EA 50%, #E8E0D0 100%)' }}>
      <Canvas
        camera={{ position: [4, 3, -5], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 2.0 }}
        className="absolute inset-0"
      >
        <ambientLight intensity={3.0} color="#fff8e7" />
        <directionalLight position={[5, 10, 5]} intensity={4.0} color="#ffecd2" castShadow />
        <directionalLight position={[-3, 6, -4]} intensity={1.5} color="#87CEEB" />
        <hemisphereLight args={['#87CEEB', '#E8D8B4', 2.0]} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#C8C0B0" roughness={0.9} />
        </mesh>

        {/* Road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2]}>
          <planeGeometry args={[6, 30]} />
          <meshStandardMaterial color="#555555" roughness={0.8} />
        </mesh>

        {/* Road lines */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}>
          <planeGeometry args={[0.1, 30]} />
          <meshStandardMaterial color="#FFD700" roughness={0.5} />
        </mesh>

        <CarModel />
        <Environment preset="sunset" background blur={0.8} />
        <OrbitControls
          makeDefault
          enablePan={false}
          maxPolarAngle={Math.PI * 0.45}
          minPolarAngle={Math.PI * 0.15}
          maxDistance={10}
          minDistance={3}
          target={[0, 0.8, 1]}
        />
      </Canvas>

      {/* Overlay HUD */}
      <div
        className="absolute bottom-4 left-0 right-0 z-50 flex justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <HUDOverlay />
        </div>
      </div>
    </div>
  );
};

export default BirdEyeView;
