
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

> Opening `index.html` directly from the file system also works in most browsers, but a tiny HTTP server is more reliable for module imports.

---

## Usage

1. **Plate shape**

   * `Square plate` – center-clamped square plate.
   * `Circular plate` – disc-like plate.

2. **Plate size (relative)**

   * Scales the plate size.
   * Physically, smaller plates have higher natural frequencies.
   * In the app, the slider rescales the mode frequencies approximately like (1/L^2).

3. **Driving frequency (Hz)**

   * Range: **20–20 000 Hz**.
   * As you drag the slider, the nodal pattern on the plate updates in real time.
   * Below the canvas you can see:

     * Current driving frequency.
     * Dominant mode indices.
     * The closest “eigenfrequency” and its detuning.

---

## How It Works (Math & Algorithm)

### 1. Mode shapes

#### Square plate

For a center-clamped square plate of side length (L), the app uses the common approximate mode shape


u_{mn}(x,y) =
\cos!\left(\frac{n\pi x}{L}\right)\cos!\left(\frac{m\pi y}{L}\right)
-\cos!\left(\frac{m\pi x}{L}\right)\cos!\left(\frac{n\pi y}{L}\right),
\quad m\neq n.


* (x,y) run over the plate area.
* (m,n) are positive integers (with (m \neq n)).
* Each pair ((m,n)) produces a different Chladni figure.

Internally the code uses **normalized coordinates** (x_\text{norm},y_\text{norm}\in[-1,1]), mapped to ([0,1]) before evaluating the formula.

#### Circular plate

Exact circular plate modes involve Bessel functions. For speed and clarity, the app uses a simplified, Bessel-like model:

[
u_{m n_r}(r,\theta) \approx
\cos(m\theta),
\cos!\left(\frac{n_r \pi r}{R}\right),\exp(-\alpha r^2),
]

where:

* (r) is the radius (normalized so that (r \le 1) inside the plate),
* (\theta) is the polar angle,
* (R) is the plate radius,
* (m) is the angular order (number of lobes),
* (n_r) is the radial index (number of nodal circles),
* (\alpha > 0) is a small damping factor used to keep higher-order modes visually stable.

### 2. Mode ordering and reference frequencies

For both shapes, the app builds a finite set of modes with integer indices:

* Square: ((m,n)) for (1 \le m,n \le 7), (m \neq n)
* Circle: ((m,n_r)) for (0 \le m \le 7, 1 \le n_r \le 7)

Each mode is assigned a **complexity index**

[
k_i = \sqrt{m_i^2 + n_i^2}
\quad \text{or} \quad
k_i = \sqrt{m_i^2 + n_{r,i}^2},
]

and the modes are sorted in increasing (k_i).

Instead of using exact physical eigenfrequencies, the app distributes the mode frequencies **log-uniformly** across ([20, 20000]) Hz:

[
\log f_i =
\log f_{\min}

* \frac{i}{N-1}\bigl(\log f_{\max}-\log f_{\min}\bigr),
  ]

where:

* (f_{\min} = 20\text{ Hz}),
* (f_{\max} = 20000\text{ Hz}),
* (N) is the number of modes for the chosen plate type.

The plate size slider rescales these reference frequencies approximately like (1/L^2).
If (L) is the relative plate size, the effective eigenfrequency is

f_i^{(\text{eff})} \approx \frac{f_i}{L^2}.

### 3. Mapping the frequency slider to modes

Let (f_\text{drive}) be the user-selected driving frequency. To locate it on the same log-frequency scale as the mode list, the app first “undoes” the size scaling:

[
f_\text{base} = f_\text{drive},L^2,
]

then computes

[
t = \frac{\log f_\text{base} - \log f_{\min}}
{\log f_{\max} - \log f_{\min}},
\qquad 0 \le t \le 1.
]

This (t) is converted into a continuous index between two neighboring modes:

[
p = t,(N-1),\qquad
i_0 = \lfloor p \rfloor,\qquad
i_1 = \min(i_0+1, N-1),\qquad
\alpha = p - i_0.
]

* Mode (i_0) and mode (i_1) are the two closest modes in log frequency.
* (\alpha \in [0,1]) tells how far we are between them.

### 4. Continuous blending of patterns

Instead of only showing a single mode, the app **blends** the two adjacent modes:

[
u(x,y; f_\text{drive}) =
(1-\alpha),u_{i_0}(x,y) + \alpha,u_{i_1}(x,y).
]

* At the discrete reference frequencies (f_i), (\alpha) is exactly 0 or 1, so you see a pure Chladni pattern (u_i).
* Between these frequencies, the nodal lines morph continuously from the pattern of (u_{i_0}) to the pattern of (u_{i_1}).

This gives you a **continuous deformation** of the Chladni figures as you sweep 20–20 kHz, while still being grounded in mode shapes from plate vibration theory.

### 5. Nodal line rendering

For each frame:

1. The plate region is sampled on a uniform grid (e.g. (320\times320) points) in normalized coordinates ((x_\text{norm}, y_\text{norm})\in[-1,1]).
2. For each point inside the plate, the blended displacement
   [
   u(x,y; f_\text{drive})
   ]
   is evaluated.
3. Let (\varepsilon) be a small threshold (configurable in `render.js`). Points satisfying
   [
   |u(x,y; f_\text{drive})| < \varepsilon
   ]
   are considered part of a nodal line and drawn as small dots on the canvas.

The canvas is redrawn for every animation frame, so changes to sliders are reflected immediately.

---

## Code Structure

* **`physics.js`**

  * Implements `squareModeDisplacement` and `circleModeDisplacement`, which evaluate the mode shapes (u_{mn}) and (u_{m n_r}) in normalized coordinates.

* **`render.js`**

  * Precomputes the mode lists for square and circular plates.
  * Assigns base frequencies logarithmically over 20–20 000 Hz.
  * Given the current slider settings, computes the blend between two neighboring modes.
  * Samples the blended field and draws nodal points onto an HTML5 `<canvas>`.

* **`ui.js`**

  * Reads user input from the plate shape, plate size, and frequency sliders.
  * Updates labels and passes current parameters into the renderer.
  * Displays current mode indices, dominant mode, and nearest eigenfrequency.

