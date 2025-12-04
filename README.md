# Real-Time Chladni Plate Explorer

An interactive web app that visualizes **Chladni patterns** (nodal line patterns of vibrating plates) on a **single plate** in real time.  
You can sweep the driving frequency from **20–20 000 Hz**, change the plate size, and switch between a **square** and a **circular** plate.  
The nodal lines morph smoothly as you move the sliders.

---

## Features

- **Single high-resolution plate**
  - Square plate (center-clamped model)
  - Circular plate (simplified Bessel-like model)
- **Real-time interaction**
  - Frequency range: **20–20 000 Hz**
  - Plate size (relative scale)
  - Plate shape: square / circle
- **Smooth pattern morphing**
  - Patterns are generated from standing-wave mode shapes.
  - For any frequency, the app blends between two neighboring modes on a logarithmic frequency axis, so the nodal lines change continuously instead of jumping.
- **Educational overlay**
  - Short explanation of Chladni experiments.
  - Displayed formulas for the mode shapes.
  - Live display of current driving frequency and the dominant mode(s).

---

## Getting Started

### 1. Files

The app is a small, framework-free HTML/CSS/JS project:

- `index.html` – layout, controls, and explanation (with MathJax for formulas)
- `style.css` – styling for dark theme and layout
- `physics.js` – mathematical models for plate mode shapes
- `render.js` – sampling, nodal-line detection, and canvas rendering
- `ui.js` – wiring between DOM controls and the renderer

All files live in the same directory.

### 2. Run locally

You can simply serve the folder with any static file server.

**Option A – Python**

```bash
cd path/to/project
python -m http.server 8000
