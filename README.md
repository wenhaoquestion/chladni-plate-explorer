
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
  - Frequency range: 20–20 000 Hz
  - Plate size (relative scale)
  - Plate shape: square / circle
- **Smooth pattern morphing**
  - Patterns are generated from standing-wave mode shapes.
  - For any frequency, the app blends between two neighboring modes on a logarithmic frequency axis, so the nodal lines change continuously instead of jumping.
- **Educational overlay**
  - Short explanation of Chladni experiments.
  - Text formulas for the mode shapes.
  - Live display of current driving frequency and the dominant mode(s).

---

## Getting Started

### Files

The app is a small, framework-free HTML/CSS/JS project:

- `index.html` – layout, controls, and explanation
- `style.css` – styling for dark theme and layout
- `physics.js` – mathematical models for plate mode shapes
- `render.js` – sampling, nodal-line detection, and canvas rendering
- `ui.js` – wiring between DOM controls and the renderer

All files live in the same directory.

### Run locally

You can serve the folder with any static file server.

**Option A – Python**

```bash
cd path/to/project
python -m http.server 8000
````

Then open:

```text
http://localhost:8000/index.html
```

**Option B – Node (serve)**

```bash
cd path/to/project
npx serve
```

Then open the URL shown in the terminal.

Opening `index.html` directly from the file system usually works as well, but a local HTTP server is more reliable for ES module imports.

---

## Usage

1. **Plate shape**

   * `Square plate` – center-clamped square plate.
   * `Circular plate` – disc-like plate.

2. **Plate size (relative)**

   * Scales the plate geometry.
   * Physically, smaller plates have higher natural frequencies.
   * In the app, the slider rescales the mode frequencies approximately like `1 / L^2`.

3. **Driving frequency (Hz)**

   * Range: 20–20 000 Hz.
   * As you drag the slider, the nodal pattern on the plate updates in real time.
   * Below the canvas you can see:

     * Current driving frequency.
     * Dominant mode indices.
     * The closest “eigenfrequency” and its detuning.

---

## How It Works

### 1. Mode shapes

#### Square plate

For a center-clamped square plate of side length `L`, the app uses a common approximate mode shape:

```text
u_mn(x, y) =
    cos(n * π * x / L) * cos(m * π * y / L)
  - cos(m * π * x / L) * cos(n * π * y / L),  with m != n
```

* `x, y` run over the plate area.
* `m, n` are positive integers with `m != n`.
* Each pair `(m, n)` produces a different Chladni figure.

Internally the code uses **normalized coordinates** `x_norm, y_norm` in `[-1, 1]`, mapped to `[0, 1]` before evaluating the formula.

#### Circular plate

Exact circular plate modes involve Bessel functions.
For speed and clarity, the app uses a simplified, Bessel-like model:

```text
u_m,nr(r, θ) ≈ cos(m * θ) * cos(n_r * π * r / R) * exp(-α * r^2)
```

where:

* `r` is the normalized radius (0 at center, 1 at the edge),
* `θ` is the polar angle,
* `R` is the plate radius (taken as 1 in normalized coordinates),
* `m` is the angular order (number of lobes),
* `n_r` is the radial index (number of nodal circles),
* `α` is a small positive damping factor used to keep high-order modes visually stable.

### 2. Mode ordering and reference frequencies

For both shapes, the app builds a finite set of modes with integer indices:

* Square: `(m, n)` for `1 <= m, n <= 7`, `m != n`
* Circle: `(m, n_r)` for `0 <= m <= 7`, `1 <= n_r <= 7`

Each mode is assigned a **complexity index**

```text
k_i = sqrt(m_i^2 + n_i^2)         (square)
k_i = sqrt(m_i^2 + n_ri^2)       (circle)
```

and the modes are sorted in increasing `k_i`.

Instead of exact physical eigenfrequencies, the app distributes mode frequencies **log-uniformly** across `[20, 20000]` Hz:

```text
log(f_i) = log(f_min) + (i / (N - 1)) * (log(f_max) - log(f_min))
```

where:

* `f_min = 20 Hz`
* `f_max = 20000 Hz`
* `N` is the number of modes for the chosen plate type.

The plate size slider rescales these reference frequencies approximately like `1 / L^2`.
If `L` is the relative plate size, the effective eigenfrequency is

```text
f_i_eff ≈ f_i / L^2
```

### 3. Mapping the frequency slider to modes

Let `f_drive` be the user-selected driving frequency.
To locate it on the same log-frequency scale as the mode list, the app first “undoes” the size scaling:

```text
f_base = f_drive * L^2
```

Then it computes

```text
t = (log(f_base) - log(f_min)) / (log(f_max) - log(f_min))
t is clamped to [0, 1]
```

This `t` is converted into a continuous index between two neighboring modes:

```text
p  = t * (N - 1)
i0 = floor(p)
i1 = min(i0 + 1, N - 1)
α  = p - i0          (blend factor in [0, 1])
```

* Mode `i0` and mode `i1` are the two closest modes in log-frequency.
* `α` says how far we are between them.

### 4. Continuous blending of patterns

Instead of only showing a single mode, the app blends the two adjacent modes:

```text
u(x, y; f_drive) =
    (1 - α) * u_i0(x, y) + α * u_i1(x, y)
```

* At the discrete reference frequencies `f_i`, `α` is exactly 0 or 1, so you see a pure Chladni pattern `u_i`.
* Between these frequencies, the nodal lines morph continuously from the pattern of `u_i0` to the pattern of `u_i1`.

This gives you a **continuous deformation** of Chladni figures as you sweep 20–20 kHz, while still being grounded in plate-vibration mode shapes.

### 5. Nodal line rendering

For each frame:

1. The plate region is sampled on a uniform grid (e.g. `320 x 320` points) in normalized coordinates (`x_norm`, `y_norm` in `[-1, 1]`).
2. For each point inside the plate, the blended displacement

   ```text
   u(x, y; f_drive)
   ```

   is evaluated.
3. Let `ε` be a small threshold (configurable in `render.js`). Points satisfying

   ```text
   |u(x, y; f_drive)| < ε
   ```

   are considered part of a nodal line and drawn as small dots on the canvas.

The canvas is redrawn each animation frame, so changes to sliders are reflected immediately.

---

## Code Structure

* **`physics.js`**

  * Implements `squareModeDisplacement` and `circleModeDisplacement`, which evaluate the mode shapes `u_mn` and `u_m,nr` in normalized coordinates.

* **`render.js`**

  * Precomputes mode lists for square and circular plates.
  * Assigns base frequencies logarithmically over 20–20 000 Hz.
  * Given the current slider settings, computes the blend between two neighboring modes.
  * Samples the blended field and draws nodal points onto an HTML5 `<canvas>`.

* **`ui.js`**

  * Reads user input from the plate shape, plate size, and frequency sliders.
  * Updates labels and passes current parameters into the renderer.
  * Displays current mode indices, dominant mode, and nearest eigenfrequency.


