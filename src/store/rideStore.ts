import { create } from 'zustand';
import { DEFAULT_VIDEO_ID } from '@/lib/videoDestinations';
export type RidePhase = 'pre-ride' | 'takeoff' | 'riding' | 'arrived';
export type ViewMode = 'cabin' | 'birdseye';
export type CabinMode = 'entertainment' | 'business' | 'relax' | 'party';
export type IncidentSeverity = 'alert' | 'caution' | 'info';

export interface Incident {
  id: string;
  timestamp: number; // seconds into ride
  type: string;
  severity: IncidentSeverity;
  hudCopy: string;
  headline: string;
  explanation: string;
  voiceExplanation: string;
  cameraJolt: boolean;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  speed: number; // mph
  streetName: string;
  turnInstruction?: string;
  eta?: number; // seconds remaining
}

export interface MusicState {
  track: string;
  artist: string;
  albumArt: string;
  isPlaying: boolean;
}

export interface ActiveIncident extends Incident {
  active: boolean;
  expanded: boolean;
  startTime: number;
}

interface RideState {
  // Core ride state
  phase: RidePhase;
  viewMode: ViewMode;
  passengerName: string;
  destination: string;
  selectedVideoId: string;
  cabinMode: CabinMode;
  initialHeading: number;

  // Route state
  speed: number;
  currentStreet: string;
  nextTurn: string;
  eta: number;
  routeProgress: number;
  rideStartTime: number | null;
  rideElapsed: number;

  // Incidents
  incidents: Incident[];
  activeIncident: ActiveIncident | null;
  firedIncidentIds: string[];

  // Entertainment
  music: MusicState;

  // Actions
  setPhase: (phase: RidePhase) => void;
  setViewMode: (mode: ViewMode) => void;
  setDestination: (destination: string) => void;
  setSelectedVideoId: (videoId: string) => void;
  setCabinMode: (mode: CabinMode) => void;
  setInitialHeading: (heading: number) => void;
  setSpeed: (speed: number) => void;
  setCurrentStreet: (street: string) => void;
  setNextTurn: (turn: string) => void;
  setEta: (eta: number) => void;
  setRouteProgress: (progress: number) => void;
  setRideStartTime: (time: number) => void;
  setRideElapsed: (elapsed: number) => void;
  setIncidents: (incidents: Incident[]) => void;
  fireIncident: (incident: Incident) => void;
  clearIncident: () => void;
  expandIncident: () => void;
  setMusic: (music: Partial<MusicState>) => void;
  resetRide: () => void;
}

const initialMusic: MusicState = {
  track: 'Midnight City',
  artist: 'M83',
  albumArt: '',
  isPlaying: false,
};

export const useRideStore = create<RideState>((set) => ({
  phase: 'pre-ride',
  viewMode: 'cabin',
  passengerName: 'Alex',
  destination: '',
  selectedVideoId: DEFAULT_VIDEO_ID,
  cabinMode: 'entertainment',
  initialHeading: 315,
  speed: 0,
  currentStreet: 'Market Street',
  nextTurn: '',
  eta: 1020,
  routeProgress: 0,
  rideStartTime: null,
  rideElapsed: 0,
  incidents: [],
  activeIncident: null,
  firedIncidentIds: [],
  music: initialMusic,

  setPhase: (phase) => set({ phase }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDestination: (destination) => set({ destination }),
  setSelectedVideoId: (videoId) => set({ selectedVideoId: videoId }),
  setCabinMode: (mode) => set({ cabinMode: mode }),
  setSpeed: (speed) => set({ speed }),
  setCurrentStreet: (street) => set({ currentStreet: street }),
  setNextTurn: (turn) => set({ nextTurn: turn }),
  setEta: (eta) => set({ eta }),
  setRouteProgress: (progress) => set({ routeProgress: progress }),
  setRideStartTime: (time) => set({ rideStartTime: time }),
  setRideElapsed: (elapsed) => set({ rideElapsed: elapsed }),
  setIncidents: (incidents) => set({ incidents }),

  fireIncident: (incident) =>
    set((state) => ({
      activeIncident: {
        ...incident,
        active: true,
        expanded: false,
        startTime: Date.now(),
      },
      firedIncidentIds: [...state.firedIncidentIds, incident.id],
    })),

  clearIncident: () => set({ activeIncident: null }),

  expandIncident: () =>
    set((state) => ({
      activeIncident: state.activeIncident
        ? { ...state.activeIncident, expanded: !state.activeIncident.expanded }
        : null,
    })),

  setMusic: (music) =>
    set((state) => ({ music: { ...state.music, ...music } })),

  resetRide: () =>
    set({
      phase: 'pre-ride',
      viewMode: 'cabin',
      speed: 0,
      currentStreet: 'Market Street',
      nextTurn: '',
      eta: 1020,
      routeProgress: 0,
      rideStartTime: null,
      rideElapsed: 0,
      activeIncident: null,
      firedIncidentIds: [],
      destination: '',
      selectedVideoId: DEFAULT_VIDEO_ID,
      music: initialMusic,
    }),
}));
