import { useRef, useEffect, useCallback } from 'react';
import { useRideStore, Incident } from '@/store/rideStore';

export function useRideEngine() {
  const {
    phase, setPhase, speed, setSpeed, setEta, setCurrentStreet,
    setNextTurn, setRouteProgress, incidents, setIncidents,
    fireIncident, clearIncident, activeIncident, firedIncidentIds,
    rideStartTime, setRideStartTime, setRideElapsed, setMusic, resetRide,
  } = useRideStore();

  const frameRef = useRef<number>();
  const incidentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load route and incident data
  useEffect(() => {
    fetch('/data/incidents.json')
      .then((r) => r.json())
      .then((data) => setIncidents(data.incidents));
  }, [setIncidents]);

  const speakExplanation = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleFireIncident = useCallback(
    (incident: Incident) => {
      fireIncident(incident);
      speakExplanation(incident.voiceExplanation);

      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        clearIncident();
      }, 6000);
      incidentTimersRef.current.push(timer);
    },
    [fireIncident, clearIncident, speakExplanation]
  );

  // Route waypoint simulation
  const routeDataRef = useRef<any>(null);

  useEffect(() => {
    fetch('/data/route.json')
      .then((r) => r.json())
      .then((data) => {
        routeDataRef.current = data;
      });
  }, []);

  const startRide = useCallback(() => {
    const now = Date.now();
    setRideStartTime(now);
    setPhase('takeoff');
    setMusic({ isPlaying: true });

    // Speed ramp: 0 → cruising over 4 seconds
    let rampStart = Date.now();
    const rampDuration = 4000;
    const targetSpeed = 25;

    const rampUp = () => {
      const elapsed = Date.now() - rampStart;
      const progress = Math.min(elapsed / rampDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setSpeed(Math.round(targetSpeed * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(rampUp);
      } else {
        setPhase('riding');
        startRoutePlayback(now);
      }
    };
    frameRef.current = requestAnimationFrame(rampUp);
  }, [setPhase, setSpeed, setRideStartTime, setMusic]);

  const startRoutePlayback = useCallback(
    (startTime: number) => {
      const route = routeDataRef.current;
      if (!route) return;

      const totalTime = route.estimatedTime;
      const waypoints = route.waypoints;

      // Schedule incidents
      incidents.forEach((incident) => {
        if (firedIncidentIds.includes(incident.id)) return;
        const timer = setTimeout(() => {
          handleFireIncident(incident);
        }, incident.timestamp * 1000);
        incidentTimersRef.current.push(timer);
      });

      // Animate route progress
      const tick = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / totalTime, 1);
        setRideElapsed(elapsed);
        setRouteProgress(progress);

        // Find current waypoint
        const wpIndex = Math.min(
          Math.floor(progress * (waypoints.length - 1)),
          waypoints.length - 1
        );
        const wp = waypoints[wpIndex];

        setCurrentStreet(wp.streetName);
        setSpeed(wp.speed);
        setEta(Math.max(0, Math.round(totalTime - elapsed)));

        if (wp.turnInstruction) {
          setNextTurn(wp.turnInstruction);
        }

        if (progress >= 1) {
          setPhase('arrived');
          setSpeed(0);
          setMusic({ isPlaying: false });
          return;
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [
      incidents, firedIncidentIds, handleFireIncident,
      setRideElapsed, setRouteProgress, setCurrentStreet,
      setSpeed, setEta, setNextTurn, setPhase, setMusic,
    ]
  );

  const replayRide = useCallback(() => {
    // Clear all timers
    incidentTimersRef.current.forEach(clearTimeout);
    incidentTimersRef.current = [];
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    window.speechSynthesis?.cancel();
    resetRide();
  }, [resetRide]);

  // Cleanup
  useEffect(() => {
    return () => {
      incidentTimersRef.current.forEach(clearTimeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { startRide, replayRide };
}
