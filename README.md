# Obsidian Mermaid Zoom & Lazy Render

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-6%20passed-brightgreen.svg)]()
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple.svg)](https://obsidian.md)

**Mermaid Zoom** is a feature-packed Obsidian plugin providing smooth interactive zoom, pan, fullscreen modal inspection, high-DPI export, and an integrated **viewport lazy-rendering engine** for Mermaid diagrams.

Maintained and enhanced by **Vibish** ([@VibishnathanG](https://github.com/VibishnathanG)).

---

## Features

### 1. Viewport Lazy Rendering
- **Instant Note Opening**: Off-screen diagrams are deferred and replaced with lightweight placeholders, eliminating UI freeze when opening notes with dozens of diagrams.
- **Dual Trigger Modes**:
  - **Auto**: Automatically renders diagrams as you scroll near them.
  - **Manual**: Click placeholders or buttons on demand.
- **Configurable Viewport Margin**: Fine-tune pre-rendering distance (e.g. `200px`) so diagrams are ready right before scrolling into view.
- **Diagram Type Badges**: Displays diagram syntax (`flowchart`, `sequenceDiagram`, `block`, `sankey`, etc.) on unrendered placeholders.
- **Auto Re-render on Theme Change**: Automatically redraws visible diagrams when switching between light and dark themes.
- **Dedicated Master Toggle**: Turn lazy rendering on or off anytime directly from the settings panel.

### 2. Smooth Zoom & Pan
- **Mouse Wheel Zoom**: Smooth cursor-centered scaling from 10% to 500%.
- **Drag to Pan**: Grab and drag diagrams freely within their containers.
- **Mobile Touch Gestures**: Two-finger pinch to zoom and one-finger drag to pan on smartphones and tablets.
- **Wheel Lock Toggle**: Keep the note page scrolling naturally; unlock wheel zoom on specific diagrams when needed.
- **Fit to Width & 1:1 Reset**: One-click actions to adapt wide diagrams to your note's column width or reset zoom.

### 3. Fullscreen Modal Viewer
- **True Color Preservation**: Preserves exact native and Mermaid Genie palettes without destructive dark-mode color inversion or contrast wash-out.
- **Interactive Inspection**: Inspect complex diagrams with high-resolution vector scaling, pan, and escape-key dismissal.

### 4. High-DPI PNG Export
- Export diagrams directly to your vault's attachment folder or download locally.
- Inlines all computed styles and theme variables for pixel-perfect standalone images.

---

## Installation

### Manual Installation

1. Copy the following three files from the [`dist/`](dist/) folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. In your Obsidian vault, navigate to:
   ```text
   <vault>/.obsidian/plugins/
   ```
3. Create a folder named `mermaid-zoom-genie`:
   ```text
   <vault>/.obsidian/plugins/mermaid-zoom-genie/
   ```
4. Place the three files inside that folder.
5. In Obsidian, go to **Settings → Community plugins**, click **Reload plugins**, and enable **Mermaid Zoom**.

---

## Settings

### Zoom & Appearance
- **Zoom Sensitivity**: Multiplier on wheel and pinch gestures (0.2x to 3.0x, default `1x`).
- **Show Inline Zoom Buttons**: Show zoom in, zoom out, fit width, reset, and gesture lock controls directly on each diagram.
- **Default Alignment**: Align diagrams to `Left`, `Center`, or `Right`.
- **Preserve Normal Rendering Colors**: Render fullscreen diagrams with their exact colors and theme variables.
- **PNG Export Destination**: Save exported PNGs to your vault attachments folder or prompt system download.

### Viewport Lazy Rendering
- **Enable Lazy Rendering**: Master toggle. When turned off, restores native synchronous diagram rendering.
- **Render Trigger Mode**: Choose `Auto (on scroll near viewport)` or `Manual (click placeholder to render)`.
- **Pre-render Viewport Margin**: Set distance in pixels from the viewport before rendering begins (e.g. `200px`).
- **Show Diagram Type Badge**: Display diagram keyword badge on placeholders.
- **Re-render on Theme Switch**: Automatically re-render visible diagrams when toggling dark and light modes.

---

## Direct Configuration via data.json

All settings can be configured directly by editing `data.json` inside your plugin folder without opening the Obsidian UI.

For a full breakdown of all keys, allowed values, and ready-to-copy configurations, see the [**data.json Configuration Guide**](DATA_OPTIONS.md).

```json
{
  "enableLazyLoading": true,
  "lazyTrigger": "auto",
  "lazyRootMargin": "200px",
  "lazyShowType": true,
  "lazyRerenderOnThemeChange": true,
  "zoomSensitivity": 1.0,
  "showInlineZoomButtons": true,
  "alignment": "center",
  "preserveColors": true,
  "exportDestination": "vault"
}
```

---

## Commands

Access these commands from Obsidian's Command Palette (`Ctrl+P` / `Cmd+P`):

| Command | Action |
| :--- | :--- |
| **Render all diagrams in active note** | Forces immediate rendering of all unrendered Mermaid placeholders |
| **Render diagrams in current viewport** | Renders all placeholders currently visible within your screen |

---

## Development

```bash
# Install dependencies
npm install

# Run unit tests (6 tests)
npm test

# Build production bundle
npm run build
```

---

## License

MIT License — Copyright (c) 2026 [Vibish](https://github.com/VibishnathanG).
