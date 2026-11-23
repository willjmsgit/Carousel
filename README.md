# IG Post Preview

Electron app: load images, reorder, edit, and preview them as an Instagram carousel post and on the profile grid. Exports 1080px-wide JPEGs.

## Run (Windows / macOS / Linux)

```
npm install
npm start
```

Tests for the crop/ratio maths: `npm test`
Installer: `npm run dist` (builds for the OS you run it on; NSIS on Windows, dmg on macOS, AppImage on Linux).

## Rules the preview implements

- Feed range 3:4 to 1.91:1; wider/taller is clamped. Presets: 3:4 (1080x1440), 4:5 (1080x1350), 1:1, 1.91:1.
- "Match first slide": first slide sets the frame, others are cropped to it (the long-standing behaviour, and what Meta's API does).
- "Mixed / Original": each slide keeps its own ratio. Instagram added this toggle in 2024, but how it sizes the frame is not documented, so this mode is an approximation.
- Profile grid: first slide only, centre-cropped to 3:4 (or 1:1 for the old grid). Drag a tile to shift the crop, like "Adjust preview".
- Max 20 slides. Export is JPEG q0.92, 1080px wide. HEIC is not readable by the app; convert to JPG/PNG first.

## Keys

Alt+Left/Right move the selected slide, Left/Right select, Delete removes.
