

# InsideMo — Autonomous Vehicle Passenger Experience Simulator

## Phase 1: Foundation & 3D Cabin Setup

### 1.1 Project Setup
- Install `@react-three/fiber@^8.18`, `three@^0.160`, `@react-three/drei@^9.122.0`, `zustand`
- Copy the GLB file to `public/models/cabin.glb`
- Create the Zustand `rideStore` as the single source of truth for ride state (phase, speed, ETA, incidents, music, passenger name, etc.)

### 1.2 3D Cabin Scene
- Load the GLB cabin model using `useGLTF`
- Set up a fixed passenger-eye-level camera with subtle sine-wave idle bob
- Add ambient interior lighting
- Create two `<Html>` planes from drei mapped to dashboard positions for left/right screens
- Create a `CanvasTexture` transparent mesh plane on the windshield for the HUD
- Side windows left as viewport openings for the outside view

### 1.3 Static Screen Content
- **Left Screen**: Welcome message, entertainment/music player UI mockup
- **Right Screen**: Destination input, nav view with street name, ETA, next turn
- **HUD**: Speed (top-left), street name (top-center), ETA (top-right)

## Phase 2: Route Data & Simulation Engine

### 2.1 Route & Incident JSON
- Create `public/data/route.json` with SF waypoints (lat/lng, speed, street name, turn instructions)
- Create `public/data/incidents.json` with the 5 incident events from the PRD (obstacle, lane merge, traffic, school zone, arrival)

### 2.2 Ride State Machine (4 Phases)
- **Phase 1 (Hail & Board)**: Stationary, welcome screen, destination input, "Start Ride" button
- **Phase 2 (Take Off)**: Speed ramps 0→cruising over 4s, screens transition to riding mode
- **Phase 3 (Ride & Incidents)**: Incidents fire at timestamps, camera jolts for alerts, all 3 channels activate simultaneously
- **Phase 4 (Arrival)**: Deceleration, trip summary, "Replay Ride" button, auto-loops after 10s

### 2.3 Incident Communication Engine
- `fireIncident()` simultaneously updates: right screen overlay (severity-coded card), HUD popup (center-top with color rim, fade in/out), and triggers voice
- Left screen dims to 40% + blur during incidents, resumes after
- Incident cards auto-dismiss after 6s or on tap; tap expands detail

## Phase 3: Google Maps 3D Tiles Integration

### 3.1 Edge Function Proxy
- Create `supabase/functions/maps-proxy/index.ts` to proxy Google Maps 3D Tiles API requests with the secret API key
- Store Google Maps API key as a Lovable secret

### 3.2 3D Tiles in Scene
- Integrate Google Maps 3D Tiles into the Three.js scene using `@googlemaps/three-js-solutions`
- Camera dolly follows lat/lng waypoints from `route.json` with speed-matched movement
- Tiles visible through windshield and side window openings
- Camera jolt effect on alert-severity incidents before explanation fires

## Phase 4: Voice & AI Explanations

### 4.1 Web Speech API
- Voice channel using `SpeechSynthesis` at rate 0.9, calm neutral voice
- Fires simultaneously with screen and HUD updates on each incident

### 4.2 Claude AI Dynamic Explanations
- Edge function using Lovable AI gateway to generate contextual incident explanations
- System prompt: respond as InsideMo — calm, brief, non-technical, passenger-first
- Replace static `voiceExplanation` strings with AI-generated variants for each ride

## Phase 5: Full Experience Polish

### 5.1 Dashboard Screens (Data-Driven)
- **Left Screen states**: Pre-ride welcome → music player in-ride → dim on incident → arrival thanks
- **Right Screen states**: Destination input → nav view (animated from route.json) → incident overlay → trip summary
- Cabin mode switcher (Business, Entertainment, Relax, Party) updating ambient lighting + screen themes

### 5.2 HUD Polish
- Persistent layer: speed, street name, ETA always visible
- Incident popup: high-contrast icon + status copy, severity color rim (red/amber/blue), 0.3s fade-in, 4s hold, fade-out

### 5.3 Final Touches
- Comfort controls UI (AC, heating, seat massage, lighting)
- "Replay Ride" auto-loop
- Debug free camera toggle
- Responsive layout for different viewport sizes

