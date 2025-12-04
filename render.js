// render.js
import {
    squareModeDisplacement,
    circleModeDisplacement
} from "./physics.js";

const F_MIN = 20;
const F_MAX = 20000;
const LOG_F_MIN = Math.log(F_MIN);
const LOG_F_MAX = Math.log(F_MAX);

/**
 * Helper: build an ordered list of square modes.
 * We sort by modeIndex = sqrt(m^2 + n^2), then assign baseFreq
 * log-uniformly across [F_MIN, F_MAX].
 */
function buildSquareModes(maxM = 7, maxN = 7) {
    const tmp = [];

    for (let m = 1; m <= maxM; m++) {
        for (let n = 1; n <= maxN; n++) {
            if (m === n) continue; // this mode is degenerate (zero)
            const modeIndex = Math.sqrt(m * m + n * n);
            tmp.push({ m, n, modeIndex });
        }
    }

    tmp.sort((a, b) => a.modeIndex - b.modeIndex);

    const N = tmp.length;
    for (let i = 0; i < N; i++) {
        const t = N > 1 ? i / (N - 1) : 0;
        const logF = LOG_F_MIN + t * (LOG_F_MAX - LOG_F_MIN);
        const baseFreq = Math.exp(logF);
        tmp[i].baseFreq = baseFreq;
        tmp[i].eigenFreq = baseFreq; // will be rescaled by size
    }

    return tmp;
}

/**
 * Helper: build an ordered list of circular modes.
 */
function buildCircleModes(maxM = 7, maxRadial = 7) {
    const tmp = [];

    for (let m = 0; m <= maxM; m++) {
        for (let nRadial = 1; nRadial <= maxRadial; nRadial++) {
            const modeIndex = Math.sqrt(m * m + nRadial * nRadial);
            tmp.push({ m, nRadial, modeIndex });
        }
    }

    tmp.sort((a, b) => a.modeIndex - b.modeIndex);

    const N = tmp.length;
    for (let i = 0; i < N; i++) {
        const t = N > 1 ? i / (N - 1) : 0;
        const logF = LOG_F_MIN + t * (LOG_F_MAX - LOG_F_MIN);
        const baseFreq = Math.exp(logF);
        tmp[i].baseFreq = baseFreq;
        tmp[i].eigenFreq = baseFreq;
    }

    return tmp;
}

export class ChladniRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.pixelRatio = window.devicePixelRatio || 1;

        // Sampling / rendering parameters
        this.resolution = 320;
        this.dotSize = 1.4;
        this.nodeThreshold = 0.08;

        this.params = {
            shape: "square", // "square" | "circle"
            plateSize: 0.9,  // relative size L (0.6–1.2)
            freqHz: 440      // driving frequency
        };

        this.cx = 0;
        this.cy = 0;
        this.halfPlatePix = 0;

        this.nodalPoints = [];
        this.time = 0;
        this.lastTimestamp = null;
        this.animationFrameId = null;

        // Precompute mode lists for both shapes
        this.squareModes = buildSquareModes(7, 7);
        this.circleModes = buildCircleModes(7, 7);

        // Resize & initial field
        this.updateCanvasSize();
        window.addEventListener("resize", () => {
            this.updateCanvasSize();
            this.recomputeField();
        });

        this.blendInfo = null; // will store {shape,freqHz,L,mode0,mode1,alpha}
        this.updateModeFrequencies();
        this.recomputeField();

        this.loop = this.loop.bind(this);
        this.start();
    }

    updateCanvasSize() {
        const cssWidth = this.canvas.clientWidth || 600;
        const cssHeight = this.canvas.clientHeight || 400;

        this.canvas.width = cssWidth * this.pixelRatio;
        this.canvas.height = cssHeight * this.pixelRatio;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }

    updateModeFrequencies() {
        const L = this.params.plateSize || 1;
        const scale = 1 / (L * L); // smaller plate → higher frequencies

        this.squareModes.forEach(m => {
            m.eigenFreq = m.baseFreq * scale;
        });
        this.circleModes.forEach(m => {
            m.eigenFreq = m.baseFreq * scale;
        });
    }

    start() {
        if (this.animationFrameId == null) {
            this.lastTimestamp = null;
            this.animationFrameId = requestAnimationFrame(this.loop);
        }
    }

    stop() {
        if (this.animationFrameId != null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    updateParams(newParams) {
        const oldSize = this.params.plateSize;
        Object.assign(this.params, newParams);

        if (
            newParams.plateSize !== undefined &&
            newParams.plateSize !== oldSize
        ) {
            this.updateModeFrequencies();
        }

        this.recomputeField();
    }

    /**
     * Compute which two modes are blended at the current freq & size.
     * Returns {shape,freqHz,plateSize,mode0,mode1,alpha}
     */
    computeBlendInfo() {
        const shape = this.params.shape;
        const modes =
            shape === "square" ? this.squareModes : this.circleModes;
        const N = modes.length;
        if (!N) {
            return {
                shape,
                freqHz: this.params.freqHz,
                plateSize: this.params.plateSize,
                mode0: null,
                mode1: null,
                alpha: 0
            };
        }

        const plateSize = this.params.plateSize || 1;
        const driveHz = Math.max(F_MIN, Math.min(F_MAX, this.params.freqHz));

        // Map actual drive frequency to the "base" frequency frame
        // where baseFreqs live: f_base ≈ f_drive * L^2
        const fBase = driveHz * plateSize * plateSize;
        const logFBase = Math.log(Math.max(F_MIN, Math.min(F_MAX, fBase)));

        const t =
            (logFBase - LOG_F_MIN) / (LOG_F_MAX - LOG_F_MIN);
        const tClamped = Math.max(0, Math.min(1, t));
        const p = tClamped * (N - 1);

        const i0 = Math.floor(p);
        const i1 = Math.min(i0 + 1, N - 1);
        const alpha = p - i0;

        const mode0 = modes[i0];
        const mode1 = modes[i1];

        return { shape, freqHz: driveHz, plateSize, mode0, mode1, alpha };
    }

    recomputeField() {
        this.blendInfo = this.computeBlendInfo();
        const { shape, plateSize, mode0, mode1, alpha } = this.blendInfo;

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (!width || !height || !mode0 || !mode1) {
            this.nodalPoints = [];
            return;
        }

        const minDim = Math.min(width, height);
        const halfPlatePix = 0.45 * minDim * plateSize;

        this.cx = width / 2;
        this.cy = height / 2;
        this.halfPlatePix = halfPlatePix;

        const res = this.resolution;
        const step = 2 / (res - 1);

        const amplitudes = new Float32Array(res * res);
        let idx = 0;
        let maxAbs = 0;

        for (let j = 0; j < res; j++) {
            const yNorm = -1 + j * step;
            for (let i = 0; i < res; i++) {
                const xNorm = -1 + i * step;

                let inside = false;
                if (shape === "square") {
                    inside = Math.abs(xNorm) <= 1 && Math.abs(yNorm) <= 1;
                } else {
                    inside = Math.hypot(xNorm, yNorm) <= 1;
                }

                if (!inside) {
                    amplitudes[idx++] = 0;
                    continue;
                }

                let val;
                if (shape === "square") {
                    const v0 = squareModeDisplacement(
                        xNorm,
                        yNorm,
                        mode0.m,
                        mode0.n
                    );
                    const v1 = squareModeDisplacement(
                        xNorm,
                        yNorm,
                        mode1.m,
                        mode1.n
                    );
                    val = (1 - alpha) * v0 + alpha * v1;
                } else {
                    const v0 = circleModeDisplacement(
                        xNorm,
                        yNorm,
                        mode0.m,
                        mode0.nRadial
                    );
                    const v1 = circleModeDisplacement(
                        xNorm,
                        yNorm,
                        mode1.m,
                        mode1.nRadial
                    );
                    val = (1 - alpha) * v0 + alpha * v1;
                }

                amplitudes[idx++] = val;
                const absVal = Math.abs(val);
                if (absVal > maxAbs) maxAbs = absVal;
            }
        }

        const threshold =
            this.nodeThreshold * (maxAbs > 0 ? maxAbs : 1);

        const nodalPoints = [];
        idx = 0;
        for (let j = 0; j < res; j++) {
            const yNorm = -1 + j * step;
            for (let i = 0; i < res; i++) {
                const xNorm = -1 + i * step;
                const val = amplitudes[idx++];

                if (Math.abs(val) <= threshold) {
                    const px = this.cx + xNorm * halfPlatePix;
                    const py = this.cy - yNorm * halfPlatePix;
                    nodalPoints.push(px, py);
                }
            }
        }

        this.nodalPoints = nodalPoints;
    }

    drawOutline() {
        const { shape } = this.params;
        const ctx = this.ctx;
        const cx = this.cx;
        const cy = this.cy;
        const half = this.halfPlatePix;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(230, 235, 255, 0.9)";

        if (shape === "square") {
            ctx.strokeRect(
                cx - half,
                cy - half,
                2 * half,
                2 * half
            );
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, half, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawNodalPoints() {
        const ctx = this.ctx;
        const points = this.nodalPoints;
        const dot = this.dotSize;

        ctx.save();
        ctx.fillStyle = "rgba(120, 220, 255, 0.9)";

        for (let i = 0; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];
            ctx.fillRect(x - dot * 0.5, y - dot * 0.5, dot, dot);
        }

        ctx.restore();
    }

    loop(timestamp) {
        if (this.lastTimestamp == null) {
            this.lastTimestamp = timestamp;
        }
        const dt = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        this.time += dt;

        const ctx = this.ctx;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createRadialGradient(
            width / 2,
            height / 2,
            0,
            width / 2,
            height / 2,
            Math.max(width, height) * 0.6
        );
        gradient.addColorStop(0, "#05060c");
        gradient.addColorStop(1, "#020208");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        this.drawOutline();
        if (this.nodalPoints.length) {
            this.drawNodalPoints();
        }

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * For UI: summarize what's going on at the current parameters.
     */
    getActiveModeSummary() {
        if (!this.blendInfo) {
            this.blendInfo = this.computeBlendInfo();
        }

        const { shape, freqHz, plateSize, mode0, mode1, alpha } =
            this.blendInfo;

        const modes =
            shape === "square" ? this.squareModes : this.circleModes;

        // Find the mode whose eigenFreq is closest to the drive freq
        let closest = null;
        let bestDiff = Infinity;
        modes.forEach(m => {
            const diff = Math.abs(m.eigenFreq - freqHz);
            if (diff < bestDiff) {
                bestDiff = diff;
                closest = m;
            }
        });

        // "primary" mode: whichever has larger weight in the blend
        let primary, secondary;
        if (!mode0 || !mode1) {
            primary = null;
            secondary = null;
        } else if (alpha < 0.5) {
            primary = { ...mode0, weight: 1 - alpha };
            secondary = { ...mode1, weight: alpha };
        } else {
            primary = { ...mode1, weight: alpha };
            secondary = { ...mode0, weight: 1 - alpha };
        }

        return {
            shape,
            freqHz,
            plateSize,
            alpha,
            mode0,
            mode1,
            primaryMode: primary,
            secondaryMode: secondary,
            closestMode: closest,
            closestEigenFreq: closest ? closest.eigenFreq : null,
            detuning: closest ? bestDiff : null
        };
    }
}
