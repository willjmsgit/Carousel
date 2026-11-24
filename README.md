# IG Post Preview

Electron app: load photos, edit them, layer one photo on top of another, reorder, and preview them as an Instagram carousel and on the profile grid.

## Run

```
npm install
npm start
```

Tests for the crop/ratio maths: `npm test`. Installer: `npm run dist`.

## Views

- **Edit**: drag the photo to reposition it, scroll to zoom. Drag a slide from the left rail onto the canvas (or onto the middle of another slide) to place it as a layer. Layers can be moved, resized (corner handles), rotated (top handle, Shift snaps to 15°), faded, flipped and reordered. Hold Alt while dropping to keep the original slide.
- **Feed**: phone preview with username, caption and light/dark.
- **Profile grid**: first-slide crop on the 3:4 (or classic 1:1) grid. Drag a tile to move the crop.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z. Alt+Left/Right reorders the open slide, Delete removes the layer or slide.

## Keeping your files intact

- Photos you did not change are exported as the exact original file (same bytes, EXIF, colour profile, format, name).
- Edited photos are rendered at the photo's native resolution (never downscaled, capped at 8192px on the long side) as JPEG q0.97 or PNG. This drops EXIF and the embedded colour profile; choose PNG to avoid JPEG recompression.
- Export always goes into a new `ig-export-<timestamp>` folder and never overwrites.

## Rules the preview implements

- Feed range 3:4 to 1.91:1; wider/taller is clamped. Presets: 3:4, 4:5, 1:1, 1.91:1.
- "Match first slide": first slide sets the frame, others are cropped to it (what Meta's API does).
- "Mixed sizes": each slide keeps its own ratio. Instagram added this in 2024 but does not document how it sizes the frame, so this is an approximation.
- Profile grid: first slide only, centre-cropped to 3:4 (or 1:1 for the old grid).
- Max 20 slides. HEIC is not readable by the app; convert to JPG/PNG first.
