import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRideStore } from '@/store/rideStore';

const HUD_WIDTH = 512;
const HUD_HEIGHT = 160;

const WindshieldHUD = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = HUD_WIDTH;
    c.height = HUD_HEIGHT;
    canvasRef.current = c;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;
    return { canvas: c, texture: tex };
  }, []);

  useFrame(() => {
    const ctx = canvas.canvas.getContext('2d');
    if (!ctx) return;

    const state = useRideStore.getState();
    const { speed, currentStreet, eta, activeIncident } = state;

    // Clear
    ctx.clearRect(0, 0, HUD_WIDTH, HUD_HEIGHT);

    // Persistent HUD layer
    ctx.font = '600 28px "Space Grotesk", sans-serif';

    // Speed — top left
    ctx.fillStyle = 'hsl(195, 100%, 50%)';
    ctx.textAlign = 'left';
    ctx.fillText(`${speed}`, 20, 35);
    ctx.font = '400 10px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(200, 220, 240, 0.6)';
    ctx.fillText('MPH', 20, 50);

    // Street name — top center
    ctx.font = '400 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(200, 220, 240, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(currentStreet, HUD_WIDTH / 2, 35);

    // ETA — top right
    const etaMin = Math.floor(eta / 60);
    const etaSec = String(eta % 60).padStart(2, '0');
    ctx.font = '500 16px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(200, 220, 240, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(`${etaMin}:${etaSec}`, HUD_WIDTH - 20, 35);
    ctx.font = '400 9px "Space Grotesk", sans-serif';
    ctx.fillText('ETA', HUD_WIDTH - 20, 48);

    // Incident popup — center
    if (activeIncident?.active) {
      const severityColors: Record<string, string> = {
        alert: 'hsl(0, 85%, 55%)',
        caution: 'hsl(38, 92%, 50%)',
        info: 'hsl(195, 100%, 50%)',
      };
      const color = severityColors[activeIncident.severity] || severityColors.info;

      // Background
      const popupY = 70;
      const popupW = 360;
      const popupH = 50;
      const popupX = (HUD_WIDTH - popupW) / 2;

      ctx.fillStyle = 'rgba(10, 15, 25, 0.8)';
      ctx.beginPath();
      ctx.roundRect(popupX, popupY, popupW, popupH, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(popupX, popupY, popupW, popupH, 8);
      ctx.stroke();

      // Icon + text
      ctx.font = '600 16px "Space Grotesk", sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(activeIncident.hudCopy, HUD_WIDTH / 2, popupY + 32);
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 1.3, 2.5]} rotation={[-0.1, Math.PI, 0]}>
      <planeGeometry args={[3.2, 1]} />
      <meshBasicMaterial
        map={canvas.texture}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default WindshieldHUD;
