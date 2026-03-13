import { useRef, useEffect, useCallback } from 'react';
import { useRideStore, Incident } from '@/store/rideStore';

type IncidentEvent = {
  incident: Incident;
  fireAt: number; // absolute timestamp
};

export function useRideEngine() {
  const {
    phase, setPhase, speed, setSpeed, setEta, setCurrentStreet,
    setNextTurn, setRouteProgress, incidents, setIncidents,
    fireIncident, clearIncident, activeIncident, firedIncidentIds,
    rideStartTime, setRideStartTime, setRideElapsed, setMusic, resetRide,
  } = useRideStore();

  const frameRef = useRef<number>();
  const incidentQueueRef = useRef<IncidentEvent[]>([]);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const routeDataRef = useRef<any>(null);

  // Load data
  useEffect(() => {
    fetch('/data/incidents.json')
      .then((r) => r.json())
      .then((data) => setIncidents(data.incidents));

    // Fetch dense route from Directions API
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${SUPABASE_URL}/functions/v1/get-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        origin: 'Market St & 4th St, San Francisco',
        destination: "Fisherman's Wharf, San Francisco",
        intervalMeters: 30,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log(`Route loaded: ${data.sampledPointCount} waypoints (from ${data.rawPointCount} raw points)`);
        routeDataRef.current = data;
      })
      .catch((err) => {
        console.error('Failed to load route from API, falling back to static:', err);
        fetch('/data/route.json')
          .then((r) => r.json())
          .then((data) => { routeDataRef.current = data; });
      });
  }, [setIncidents]);

  const speakExplanation = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      // Try to find a more natural voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')
      );
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleFireIncident = useCallback(
    (incident: Incident) => {
      // Synchronized dispatch: all channels fire at once
      const now = performance.now();

      // 1. Visual: update store (HUD + card)
      fireIncident(incident);

      // 2. Audio: voice narration
      speakExplanation(incident.voiceExplanation);

      // 3. Schedule auto-dismiss
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        clearIncident();
      }, 6000);

      const latency = performance.now() - now;
      if (latency > 16) console.warn(`[InsideMo] Incident dispatch took ${latency.toFixed(1)}ms`);
    },
    [fireIncident, clearIncident, speakExplanation]
  );

  // Event queue processor — checks queue every frame
  const processQueue = useCallback((rideStart: number) => {
    const now = Date.now();
    const queue = incidentQueueRef.current;

    while (queue.length > 0 && queue[0].fireAt <= now) {
      const event = queue.shift()!;
      const state = useRideStore.getState();
      if (!state.firedIncidentIds.includes(event.incident.id)) {
        handleFireIncident(event.incident);
      }
    }
  }, [handleFireIncident]);

  const startRide = useCallback(() => {
    const now = Date.now();
    setRideStartTime(now);
    setPhase('takeoff');
    setMusic({ isPlaying: true });

    // Build sorted event queue
    incidentQueueRef.current = incidents
      .filter(inc => !firedIncidentIds.includes(inc.id))
      .map(inc => ({ incident: inc, fireAt: now + inc.timestamp * 1000 }))
      .sort((a, b) => a.fireAt - b.fireAt);

    // Speed ramp
    const rampStart = Date.now();
    const rampDuration = 4000;
    const targetSpeed = 25;

    const rampUp = () => {
      const elapsed = Date.now() - rampStart;
      const progress = Math.min(elapsed / rampDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setSpeed(Math.round(targetSpeed * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(rampUp);
      } else {
        setPhase('riding');
        startRoutePlayback(now);
      }
    };
    frameRef.current = requestAnimationFrame(rampUp);
  }, [setPhase, setSpeed, setRideStartTime, setMusic, incidents, firedIncidentIds]);

  const startRoutePlayback = useCallback(
    (startTime: number) => {
      const route = routeDataRef.current;
      if (!route) return;

      const totalTime = route.estimatedTime;
      const waypoints = route.waypoints;

      const tick = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / totalTime, 1);
        setRideElapsed(elapsed);
        setRouteProgress(progress);

        // Process event queue
        processQueue(startTime);

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
      processQueue, setRideElapsed, setRouteProgress, setCurrentStreet,
      setSpeed, setEta, setNextTurn, setPhase, setMusic,
    ]
  );

  const replayRide = useCallback(() => {
    incidentQueueRef.current = [];
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    window.speechSynthesis?.cancel();
    resetRide();
  }, [resetRide]);

  useEffect(() => {
    return () => {
      incidentQueueRef.current = [];
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { startRide, replayRide };
}
