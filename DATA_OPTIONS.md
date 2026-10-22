# Mermaid Zoom & Lazy Render — data.json Configuration Guide

This guide documents all configuration keys available in `data.json` for **Mermaid Zoom & Lazy Render** (`mermaid-zoom-genie`).

You can edit `data.json` directly with any text editor without using the Obsidian UI. Changes take effect as soon as Obsidian reloads (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>R</kbd> or run the command *"Reload app without saving"*).

---

## File Location

```text
<your-vault>/.obsidian/plugins/mermaid-zoom-genie/data.json
```

---

## Complete data.json Template (Default Settings)

```json
{
  "enableLazyLoading": true,
  "lazyTrigger": "auto",
  "lazyRootMargin": "200px",
  "lazyShowType": true,
  "lazyRerenderOnThemeChange": true,
  "zoomSensitivity": 1.0,
  "defaultScale": 1.0,
  "autoFitWidth": false,
  "showInlineZoomButtons": true,
  "showContainerBorder": false,
  "alignment": "center",
  "preserveColors": true,
  "exportDestination": "vault"
}
```

---

## Configuration Reference

| Option | Type | Allowed Values | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `enableLazyLoading` | `boolean` | `true`, `false` | `true` | **Master switch for lazy rendering.** When `false`, lazy loading is completely turned off and all Mermaid diagrams render normally upon opening the note. |
| `lazyTrigger` | `string` | `"auto"`, `"click"` | `"auto"` | How deferred placeholders are rendered into diagrams: `"auto"` renders automatically as you scroll near the diagram; `"click"` displays a placeholder button and renders only when clicked. |
| `lazyRootMargin` | `string` | Any CSS distance, e.g. `"200px"`, `"400px"`, `"0px"`, `"100px 0px"` | `"200px"` | Pre-render viewport margin. When `lazyTrigger` is `"auto"`, diagrams start rendering when they approach within this distance of entering the visible screen. |
| `lazyShowType` | `boolean` | `true`, `false` | `true` | Displays a diagram type badge (e.g. `Mermaid • flowchart`, `Mermaid • sequenceDiagram`, `Mermaid • block`) on unrendered placeholders. |
| `lazyRerenderOnThemeChange` | `boolean` | `true`, `false` | `true` | Automatically re-renders currently visible diagrams whenever switching between light and dark themes. |
| `zoomSensitivity` | `number` | `0.2` to `3.0` | `1.0` | Multiplier on mouse wheel scrolling and touch pinch gestures. `0.5` = gentler/slower zoom, `1.0` = normal, `2.0` = fast/amplified zoom. |
| `defaultScale` | `number` | `0.5` to `2.5` | `1.0` | **Initial zoom level for all diagrams.** `0.8` = compact/minimized (80%), `1.0` = standard 100%, `1.2` = enlarged (120%), `1.5` = 150%. |
| `autoFitWidth` | `boolean` | `true`, `false` | `false` | **Auto-fit to column width.** When `true`, automatically scales wide diagrams to fit your note's editor/reading column width upon loading. |
| `showInlineZoomButtons` | `boolean` | `true`, `false` | `true` | Displays inline control buttons (+ / − / fit / reset / lock) on diagrams. When `false`, only the fullscreen trigger icon remains visible. |
| `showContainerBorder` | `boolean` | `true`, `false` | `false` | Displays a subtle dashed border around each diagram container to visualize the zoom boundaries. |
| `alignment` | `string` | `"left"`, `"center"`, `"right"` | `"center"` | Horizontal alignment of diagrams within their container. |
| `preserveColors` | `boolean` | `true`, `false` | `true` | Preserves exact native and Mermaid Genie colors in fullscreen mode without dark-mode color inversion. |
| `exportDestination` | `string` | `"vault"`, `"download"` | `"vault"` | Where exported PNG files are saved: `"vault"` saves directly to your vault's attachment folder; `"download"` opens the system download dialog. |

---

## Quick Example Configurations

### 1. Disable Lazy Rendering Completely (Instant Normal Render)

If you want all diagrams to render immediately when opening a note:

```json
{
  "enableLazyLoading": false,
  "zoomSensitivity": 1.0,
  "defaultScale": 1.0,
  "autoFitWidth": false,
  "showInlineZoomButtons": true,
  "showContainerBorder": false,
  "alignment": "center",
  "preserveColors": true,
  "exportDestination": "vault"
}
```

---

### 2. Auto-Fit Wide Diagrams to Column Width on Load

Automatically scales large diagrams to fit within the note reading column:

```json
{
  "enableLazyLoading": true,
  "lazyTrigger": "auto",
  "lazyRootMargin": "200px",
  "autoFitWidth": true,
  "zoomSensitivity": 1.0,
  "showInlineZoomButtons": true,
  "alignment": "center",
  "preserveColors": true,
  "exportDestination": "vault"
}
```

---

### 3. Minimized / Compact Initial Diagram Size

Renders all diagrams at 80% scale initially with gentle wheel zoom:

```json
{
  "enableLazyLoading": true,
  "lazyTrigger": "auto",
  "lazyRootMargin": "200px",
  "defaultScale": 0.8,
  "zoomSensitivity": 0.6,
  "showInlineZoomButtons": true,
  "alignment": "center",
  "preserveColors": true,
  "exportDestination": "vault"
}
```

---

### 4. Click-to-Render Mode (Manual Diagram Unfolding)

Shows lightweight placeholders and renders diagrams only when clicked:

```json
{
  "enableLazyLoading": true,
  "lazyTrigger": "click",
  "lazyShowType": true,
  "zoomSensitivity": 1.0,
  "defaultScale": 1.0,
  "autoFitWidth": false,
  "showInlineZoomButtons": true,
  "alignment": "center",
  "preserveColors": true,
  "exportDestination": "vault"
}
```

---

## How to Apply Changes

1. Open `<your-vault>/.obsidian/plugins/mermaid-zoom-genie/data.json` in your editor.
2. Edit the desired fields and save the file.
3. In Obsidian, press <kbd>Ctrl</kbd> + <kbd>R</kbd> (or <kbd>Cmd</kbd> + <kbd>R</kbd> on Mac).
4. The plugin will immediately load and apply your updated settings.
