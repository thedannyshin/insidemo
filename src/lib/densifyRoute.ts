/** Linearly interpolate between two numbers */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shortest-path lerp for angles in degrees */
const lerpAngle = (a: number, b: number, t: number) => {
  const diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
};

export interface Waypoint {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  eta: number;
  streetName?: string;
  turnInstruction?: string;
}

/**
 * Densify a waypoint array by inserting interpolated points between each pair.
 * `factor` controls how many sub-segments per original segment (e.g., 5 = 5x more points).
 */
export function densifyWaypoints(waypoints: Waypoint[], factor = 5): Waypoint[] {
  if (waypoints.length < 2) return waypoints;

  const result: Waypoint[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];

    for (let s = 0; s < factor; s++) {
      const t = s / factor;
      result.push({
        lat: lerp(a.lat, b.lat, t),
        lng: lerp(a.lng, b.lng, t),
        heading: Math.round(lerpAngle(a.heading, b.heading, t) * 10) / 10,
        speed: Math.round(lerp(a.speed, b.speed, t)),
        eta: Math.round(lerp(a.eta, b.eta, t)),
        // Keep metadata on the original points only
        ...(s === 0 && a.streetName ? { streetName: a.streetName } : {}),
        ...(s === 0 && a.turnInstruction ? { turnInstruction: a.turnInstruction } : {}),
      });
    }
  }

  // Add the last waypoint
  result.push(waypoints[waypoints.length - 1]);

  return result;
}
