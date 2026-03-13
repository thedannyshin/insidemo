import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRideStore } from '@/store/rideStore';
import HUDOverlay from './HUDOverlay';

const CarModel = () => {
  const { scene } = useGLTF('/models/cabin.glb');
  const groupRef = useRef<THREE.Group>(null);
  const phase = useRideStore((s) => s.phase);

  useEffect(() => {
    const cloned = scene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.x += cloned.position.x - center.x;
    cloned.position.y += cloned.position.y - box.min.y;
    cloned.position.z += cloned.position.z - center.z;

    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (groupRef.current) {
      groupRef.current.clear();
      groupRef.current.add(cloned);
    }
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    if (phase === 'riding') {
      groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.008;
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.01;
    }
  });

  return <group ref={groupRef} />;
};

const BirdEyeView = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);

  const mapCenter = useMemo(() => {
    // Route: Market St to Fisherman's Wharf, SF
    const start = { lat: 37.78576, lng: -122.40587 };
    const end = { lat: 37.8086, lng: -122.41251 };
    const t = routeProgress;
    return {
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    };
  }, [Math.round(routeProgress * 20) / 20]); // Update every 5% progress

  return (
    <div className="w-full h-full relative">
      {/* Google Maps satellite view as background */}
      <iframe
        src={`https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&center=${mapCenter.lat},${mapCenter.lng}&zoom=18`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          zIndex: 0,
        }}
        loading="lazy"
        allowFullScreen
      />

      {/* 3D car overlay on top of map */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <Canvas
          camera={{ position: [-1.0, 5.63, 3], fov: 50, near: 0.1, far: 500 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 2.0,
            alpha: true,
          }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={3.0} color="#fff8e7" />
          <directionalLight position={[5, 10, 5]} intensity={4.0} color="#ffecd2" castShadow />
          <directionalLight position={[-3, 6, -4]} intensity={1.5} color="#87CEEB" />
          <hemisphereLight args={['#87CEEB', '#E8D8B4', 2.0]} />

          <CarModel />

          <OrbitControls
            makeDefault
            enablePan
            maxPolarAngle={Math.PI / 2.5}
            minPolarAngle={0}
            maxDistance={10}
            minDistance={3}
            target={[-1.0, 0.63, 0]}
          />
        </Canvas>
      </div>

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
