<p align="center">
  <img src="https://img.shields.io/badge/InsideMo-Autonomous%20Cabin%20Experience-00bfff?style=for-the-badge&labelColor=0a0f19" alt="InsideMo" />
</p>

<h1 align="center">🚘 InsideMo</h1>

<p align="center">
  <strong>The future of autonomous vehicle passenger experiences.</strong><br/>
  <em>A real-time, immersive cabin simulation that transforms every ride into a journey.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-r3f-black?style=flat-square&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Zustand-State-orange?style=flat-square" />
</p>

---

## 🎯 The Problem

> Autonomous vehicles remove the driver — but what replaces the experience?

Passengers in self-driving cars face a void: no steering wheel to hold, no road to watch, no sense of control. The cabin becomes a waiting room. **InsideMo turns it into a command center.**

---

## 💡 The Vision

**InsideMo** is a full-stack cabin UI for autonomous vehicles — a real-time, WebGL-powered experience that keeps passengers informed, entertained, and in control.

Think **Tesla's infotainment × Google Maps × flight simulator HUD** — built for the post-driving era.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  InsideMo Cabin                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  3D GLB  │  │ YouTube  │  │  Google Maps  │  │
│  │  Cabin   │  │ 360° POV │  │  Navigation   │  │
│  │  Model   │  │  Stream  │  │    Engine      │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │          │
│       └──────────────┼────────────────┘          │
│                      │                           │
│              ┌───────▼────────┐                  │
│              │  Ride Engine   │                  │
│              │  (Zustand)     │                  │
│              └───────┬────────┘                  │
│                      │                           │
│       ┌──────────────┼──────────────┐            │
│       ▼              ▼              ▼            │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐       │
│  │   HUD   │  │ Incident  │  │  Voice   │       │
│  │ Overlay │  │  System   │  │ Narration│       │
│  └─────────┘  └───────────┘  └──────────┘       │
└─────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🎥 Immersive 360° Street View
A YouTube 360° video stream synced to route waypoints. The camera POV tracks the vehicle's heading in real-time — look around the cabin and the outside world follows.

- **Heading interpolation** from GPS waypoints
- **Camera-linked POV** — drag to look around, the video follows
- **Seamless full-length playback** — no loops, no jumps

### 🏎️ Real-Time HUD Dashboard
A translucent heads-up display rendered inside the 3D cabin, showing:

| Metric | Source |
|--------|--------|
| **MPH** | Waypoint speed data + natural variation |
| **Street Name** | Live route waypoint labels |
| **ETA** | YouTube player remaining time |
| **Incidents** | Severity-coded alert popups |

### 🚨 Incident System
A synchronized multi-channel alert system that fires across **visual**, **audio**, and **haptic** layers simultaneously:

- **HUD popup** with severity-coded borders (🔴 alert / 🟡 caution / 🔵 info)
- **Voice narration** via Web Speech API with natural voice selection
- **Camera jolt** — subtle shake effect on high-severity events
- **Incident card** on the right screen with "Why" and "What's next" breakdown
- **Sub-16ms dispatch** — all channels fire in a single frame

### 🗺️ Dual-Screen Dashboard
Two in-cabin screens rendered as HTML panels inside the 3D scene:

| Left Screen | Right Screen |
|-------------|--------------|
| Google Maps with dark theme | Pre-ride controls |
| Live route with progress tracking | Turn-by-turn navigation |
| Origin/destination markers | Incident detail cards |
| Auto-panning with ride progress | Trip summary on arrival |

### 🦅 Bird's Eye View
Toggle to an aerial Google Maps view with:
- **3D car model** (GLB) rendered via WebGL overlay
- **Real-time position** interpolated along the route
- **Dynamic heading** calculated from route trajectory
- **60° tilt** for cinematic perspective

### 🎭 3D Cabin Environment
A photorealistic vehicle interior rendered with Three.js / React Three Fiber:

- **GLB cabin model** with material-aware glass transparency
- **Dynamic lighting** — ambient, directional, hemisphere, point lights
- **Subtle camera bob** synced to ride phase
- **Pointer-drag look-around** with momentum
- **Scroll-to-zoom** FOV control

### 🎵 Ride Lifecycle Engine
A state machine that orchestrates the entire experience:

```
pre-ride → takeoff (speed ramp) → riding (route playback) → arrived
```

- **Speed ramp-up** with cubic easing during takeoff
- **Incident queue** — events scheduled by timestamp, fired frame-accurately
- **Auto-dismiss** with configurable timers
- **Replay** — full state reset and re-queue

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Rendering** | React Three Fiber + Three.js |
| **State** | Zustand (single store, selector pattern) |
| **Styling** | Tailwind CSS with HSL design tokens |
| **Maps** | Google Maps JavaScript API + `@vis.gl/react-google-maps` |
| **Video** | YouTube IFrame API (360° spherical) |
| **Voice** | Web Speech Synthesis API |
| **Backend** | Lovable Cloud (Edge Functions) |
| **Build** | Vite + TypeScript |

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

---

## 📐 Design System

InsideMo uses a custom dark-mode design language inspired by automotive HUDs:

- **Primary accent**: `hsl(195 100% 50%)` — electric cyan
- **Typography**: Space Grotesk (display) + JetBrains Mono (data)
- **Glass effects**: `backdrop-filter: blur()` with layered borders
- **Severity palette**: Red → Amber → Cyan for alert → caution → info

---

## 🛣️ Roadmap

- [ ] Multi-route selection with real-time traffic
- [ ] Passenger preference profiles (cabin modes)
- [ ] Real sensor data integration (V2X, LiDAR overlay)
- [ ] Multi-passenger sync via WebSocket
- [ ] AR windshield HUD projection
- [ ] Voice command interface

---

<p align="center">
  <strong>InsideMo</strong> — Because the ride is the destination.<br/>
  <sub>Built with ❤️ and WebGL</sub>
</p>
