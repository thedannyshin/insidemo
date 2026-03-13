

# Options for Smooth Street-Level Driving

## The Core Problem
Currently, you're showing discrete static images that "jump" between waypoints. For a smooth driving experience, you need continuous visual movement.

## Option 1: Google Street View JavaScript API (Interactive Panoramas)
- Use the official Street View JS SDK to embed an interactive panorama
- Programmatically animate between `pano_id`s using `StreetViewPanorama.setPano()` with smooth transitions
- Google handles all rendering, orientation, and transitions natively
- **Pros**: Smoothest result, Google handles everything, free-look works natively
- **Cons**: Requires displaying Google branding/attribution, limited visual customization, API usage costs

## Option 2: Video-Based (Pre-recorded or AI-generated)
- Use a pre-recorded dashcam video of the route (e.g., from YouTube or recorded yourself)
- Or use an AI video generation model to create driving footage from waypoint images
- Sync video playback position to ride progress
- **Pros**: Perfectly smooth, no API calls during playback, most cinematic
- **Cons**: Route-specific (need new video per route), large file sizes, AI-generated may look uncanny

## Option 3: Rapid Image Crossfade (Current approach, improved)
- Densify waypoints further (every 10-20m instead of 50m)
- Add crossfade transitions between images (opacity blend over 200-300ms)
- Pre-fetch next 2-3 images ahead for instant transitions
- **Pros**: Works with current architecture, no new APIs
- **Cons**: Still discrete frames (not truly smooth), higher storage/API costs for more waypoints

## Option 4: Google Street View Tiles API + Three.js Rendering
- Use the new [Map Tiles API](https://developers.google.com/maps/documentation/tile/streetview) to get photosphere tiles
- Render them on a Three.js sphere, then smoothly interpolate camera position between panorama locations
- **Pros**: Full 3D control, can blend between panoramas, integrates with your existing Three.js scene
- **Cons**: Complex to implement, still discrete panorama locations (not continuous)

## Recommendation
**Option 1 (Street View JS API)** gives the best smooth driving experience with the least effort. Google's built-in transitions between panoramas are already optimized for this exact use case. You'd embed it as the background instead of static images, and programmatically drive it along the route using `setPano()` + `setPov()`.

**Option 2 (Video)** is best if you want a fixed, cinematic experience for specific routes.

