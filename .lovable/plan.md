

# Add Floor Plane to Block Cabin Underside

Add a dark, opaque flat box/plane below the cabin model in `CabinScene3D` to hide the outside view showing through the car's floor.

## Change

In `src/components/cabin/CabinScene.tsx`, add a flat box mesh right after `<CabinModel />` (line 126):

```tsx
{/* Floor to block outside view beneath cabin */}
<mesh position={[0, -0.01, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[4, 6]} />
  <meshStandardMaterial color="#1a1a1a" roughness={1} />
</mesh>
```

This places a wide dark plane at the cabin's floor level, blocking any see-through gaps. Position/size may need minor tweaking after visual check.

