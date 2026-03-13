import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useRideStore } from '@/store/rideStore';
import HUDOverlay from './HUDOverlay';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const MapOverlay = () => {
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const routeProgress = useRideStore((s) => s.routeProgress);

  useEffect(() => {
    if (!map || !maps) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let carModel: THREE.Object3D;

    const overlay = new maps.WebGLOverlayView();

    overlay.onAdd = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera();
      
      const loader = new GLTFLoader();
      loader.load('/models/cabin.glb', (gltf) => {
        carModel = gltf.scene;
        scene.add(carModel);
      });

      scene.add(new THREE.AmbientLight(0xffffff, 3.0));
      const dirLight = new THREE.DirectionalLight(0xffecd2, 4.0);
      dirLight.position.set(5, 10, 5);
      scene.add(dirLight);
    };

    overlay.onDraw = ({ transformer }) => {
      const webGLRenderer = transformer.getWebGLRenderer();
      if (!renderer) {
        renderer = webGLRenderer;
      }
      
      const t = routeProgress;
      const start = { lat: 37.78576, lng: -122.40587 };
      const end = { lat: 37.8086, lng: -122.41251 };
      
      const currentPos = {
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      };
      const nextT = Math.min(t + 0.001, 1);
      const nextPos = {
        lat: start.lat + (end.lat - start.lat) * nextT,
        lng: start.lng + (end.lng - start.lng) * nextT,
      };

      const angleRad = Math.atan2(nextPos.lng - currentPos.lng, nextPos.lat - currentPos.lat);
      const matrix = transformer.fromLatLngAltitude({
        lat: currentPos.lat,
        lng: currentPos.lng,
        altitude: 1,
      });

      if (carModel) {
        carModel.position.set(matrix.elements[12], matrix.elements[13], matrix.elements[14]);
        carModel.rotation.set(Math.PI / 2, 0, -angleRad);
        carModel.scale.set(0.1, 0.1, 0.1);
      }

      renderer.render(scene, camera);
      overlay.requestRedraw();
    };
    
    overlay.setMap(map);

    return () => overlay.setMap(null);
  }, [map, maps, routeProgress]);

  return null;
};

const BirdEyeView = () => {
  const routeProgress = useRideStore((s) => s.routeProgress);

  const mapParams = useMemo(() => {
    const start = { lat: 37.78576, lng: -122.40587 };
    const end = { lat: 37.8086, lng: -122.41251 };
    const t = routeProgress;
    
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;

    const nextT = Math.min(t + 0.001, 1);
    const nextLat = start.lat + (end.lat - start.lat) * nextT;
    const nextLng = start.lng + (end.lng - start.lng) * nextT;

    const angleRad = Math.atan2(nextLng - lng, nextLat - lat);
    const angleDeg = angleRad * (180 / Math.PI);

    return {
      center: { lat, lng },
      heading: angleDeg,
    };
  }, [routeProgress]);

  return (
    <div className="w-full h-full relative">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
        <Map
          center={mapParams.center}
          zoom={18}
          tilt={60}
          heading={mapParams.heading}
          mapId="DEMO_MAP_ID"
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
        >
          <MapOverlay />
        </Map>
      </APIProvider>

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
