<p align="center">
  <img src="docs/banner.svg" alt="Carousel Studio" width="100%">
</p>

Load photos, edit them, layer photos and text, reorder, and preview them live as an Instagram carousel and on the profile grid.

## Run

```
npm install
npm start
```

Tests for the crop/ratio maths: `npm test`. Installer: `npm run dist`.

## Layout

The editor is always on the left. **Live preview** (top bar) puts the Instagram feed or your profile grid beside it and repaints as you edit. Turn it off for a bigger canvas.

- **Edit**: drag the photo to reposition it, scroll to zoom it. Ctrl+scroll (or pinch) zooms the canvas itself; middle-drag or Space+drag pans; Ctrl+0 resets.
- **Layers**: add photos or text on top of any slide, or drag a slide from the rail onto the canvas (Alt keeps the original). Move, resize (corner handles), rotate (top handle, Shift snaps to 15°), fade and reorder.
- **Text**: five styles (Classic, Modern, Neon, Typewriter, Strong) in system fonts, colours, alignment and an optional text background. Double-click text on the canvas to edit it.
- **Backgrounds**: solid colours and Instagram-style gradients. They show behind a photo set to "Fit with border", and fill a **blank slide** (the tile at the bottom of the rail).
- **Feed / Profile**: username, caption, light/dark and options live in the preview pane.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z. Alt+Left/Right reorders the open slide, Delete removes the layer or slide.

## Keeping your files intact

- Photos you did not change are exported as the exact original file (same bytes, EXIF, colour profile, format, name).
- Edited photos are rendered at the photo's native resolution (never downscaled, capped at 8192px on the long side) as JPEG q0.97 or PNG. This drops EXIF and the embedded colour profile; choose PNG to avoid JPEG recompression.
- Export always goes into a new `ig-export-<timestamp>` folder and never overwrites.

## Rules the preview implements

- Feed range 3:4 to 1.91:1; wider/taller is clamped. Presets: 3:4, 4:5, 1:1, 1.91:1.
- "Match first slide": first slide sets the frame, others are cropped to it (what Meta's API does).
- "Mixed sizes": each slide keeps its own ratio. Instagram added this in 2024 but does not document how it sizes the frame, so this is an approximation.
- Profile grid: first slide only, centre-cropped to 3:4.
- Max 20 slides. HEIC is not readable by the app; convert to JPG/PNG first.
