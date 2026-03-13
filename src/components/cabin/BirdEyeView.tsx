import { useRef, useEffect, useCallback } from 'react';
import { useRideStore } from '@/store/rideStore';

const WAYPOINTS = [
  { lat: 37.7855, lng: -122.4057 },
  { lat: 37.7862, lng: -122.4065 },
  { lat: 37.7878, lng: -122.408 },
  { lat: 37.7895, lng: -122.4072 },
  { lat: 37.792, lng: -122.4055 },
  { lat: 37.7945, lng: -122.404 },
  { lat: 37.797, lng: -122.4075 },
  { lat: 37.799, lng: -122.4095 },
  { lat: 37.801, lng: -122.411 },
  { lat: 37.8035, lng: -122.4125 },
  { lat: 37.8055, lng: -122.4148 },
  { lat: 37.8075, lng: -122.417 },
  { lat: 37.808, lng: -122.4177 },
  { lat: 37.8083, lng: -122.418 },
];

const BirdEyeView = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const routeProgress = useRideStore((s) => s.routeProgress);
  const phase = useRideStore((s) => s.phase);
  const speed = useRideStore((s) => s.speed);
  const currentStreet = useRideStore((s) => s.currentStreet);
  const eta = useRideStore((s) => s.eta);
  const activeIncident = useRideStore((s) => s.activeIncident);
  const animRef = useRef<number>();

  const toCanvas = useCallback((lat: number, lng: number, w: number, h: number) => {
    const minLat = 37.784, maxLat = 37.81;
    const minLng = -122.42, maxLng = -122.40;
    const px = 60 + ((lng - minLng) / (maxLng - minLng)) * (w - 120);
    const py = h - 60 - ((lat - minLat) / (maxLat - minLat)) * (h - 120);
    return { x: px, y: py };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Sky gradient - sunny SF
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.3, '#B0E0F0');
    skyGrad.addColorStop(0.6, '#E8F4E8');
    skyGrad.addColorStop(1, '#D4E4C8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid streets (subtle)
    ctx.strokeStyle = 'rgba(180, 200, 180, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = (h / 20) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      const x = (w / 20) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Block fills (parks, buildings)
    ctx.fillStyle = 'rgba(120, 180, 120, 0.15)';
    ctx.fillRect(w * 0.1, h * 0.6, w * 0.15, h * 0.15);
    ctx.fillRect(w * 0.7, h * 0.2, w * 0.12, h * 0.1);
    ctx.fillStyle = 'rgba(200, 190, 170, 0.2)';
    ctx.fillRect(w * 0.3, h * 0.3, w * 0.1, h * 0.08);
    ctx.fillRect(w * 0.5, h * 0.5, w * 0.08, h * 0.12);

    // Draw full route path (unfilled portion)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(100, 140, 200, 0.3)';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    WAYPOINTS.forEach((wp, i) => {
      const p = toCanvas(wp.lat, wp.lng, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw traveled route
    const traveledIndex = Math.floor(routeProgress * (WAYPOINTS.length - 1));
    if (traveledIndex > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#FF6B35';
      ctx.shadowBlur = 8;
      for (let i = 0; i <= traveledIndex; i++) {
        const p = toCanvas(WAYPOINTS[i].lat, WAYPOINTS[i].lng, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Origin marker
    const origin = toCanvas(WAYPOINTS[0].lat, WAYPOINTS[0].lng, w, h);
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2E7D32';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('START', origin.x, origin.y - 14);

    // Destination marker
    const dest = toCanvas(WAYPOINTS[WAYPOINTS.length - 1].lat, WAYPOINTS[WAYPOINTS.length - 1].lng, w, h);
    ctx.beginPath();
    ctx.arc(dest.x, dest.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#E53935';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#B71C1C';
    ctx.font = 'bold 9px system-ui';
    ctx.fillText('ARRIVE', dest.x, dest.y - 14);

    // Vehicle position
    if (phase !== 'pre-ride') {
      const wpIdx = Math.min(traveledIndex, WAYPOINTS.length - 1);
      const vp = toCanvas(WAYPOINTS[wpIdx].lat, WAYPOINTS[wpIdx].lng, w, h);

      // Pulse ring
      const t = Date.now() / 1000;
      const pulseR = 14 + Math.sin(t * 3) * 4;
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 107, 53, ${0.15 + Math.sin(t * 3) * 0.05})`;
      ctx.fill();

      // Vehicle dot
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FF6B35';
      ctx.shadowColor = '#FF6B35';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Incident indicator
      if (activeIncident?.active) {
        const colors: Record<string, string> = { alert: '#E53935', caution: '#FFA726', info: '#29B6F6' };
        const c = colors[activeIncident.severity] || colors.info;
        ctx.beginPath();
        ctx.arc(vp.x, vp.y, 22 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Info overlay - top left
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    roundRect(ctx, 16, 16, 180, 72, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('San Francisco', 28, 36);
    ctx.fillStyle = '#666';
    ctx.font = '10px system-ui';
    ctx.fillText(currentStreet, 28, 52);
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(`${speed} mph`, 28, 72);
    ctx.fillStyle = '#999';
    ctx.font = '10px system-ui';
    const etaMin = Math.floor(eta / 60);
    const etaSec = String(eta % 60).padStart(2, '0');
    ctx.fillText(`ETA ${etaMin}:${etaSec}`, 110, 72);

    // "BIRD'S EYE" label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText("BIRD'S EYE VIEW", w - 20, 30);

    animRef.current = requestAnimationFrame(draw);
  }, [routeProgress, phase, speed, currentStreet, eta, activeIncident, toCanvas]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export default BirdEyeView;
