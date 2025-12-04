// ui.js
import { ChladniRenderer } from "./render.js";

const canvas = document.getElementById("chladniCanvas");
const renderer = new ChladniRenderer(canvas);

// DOM elements
const shapeSelect = document.getElementById("shapeSelect");
const sizeSlider = document.getElementById("sizeSlider");
const freqSlider = document.getElementById("freqSlider");

const sizeValue = document.getElementById("sizeValue");
const freqValue = document.getElementById("freqValue");

const modeLabel = document.getElementById("modeLabel");
const freqLabel = document.getElementById("freqLabel");

function updateValueLabels() {
    sizeValue.textContent = sizeSlider.value;
    freqValue.textContent = `${freqSlider.value} Hz`;
}

function updateModeInfo() {
    const summary = renderer.getActiveModeSummary();
    if (!summary) {
        modeLabel.textContent = "";
        freqLabel.textContent = "";
        return;
    }

    const {
        shape,
        freqHz,
        alpha,
        mode0,
        mode1,
        primaryMode,
        closestEigenFreq,
        detuning
    } = summary;

    if (!mode0 || !mode1) {
        modeLabel.textContent = "";
        freqLabel.textContent = `Drive: ${freqHz.toFixed(1)} Hz`;
        return;
    }

    if (shape === "square") {
        modeLabel.textContent =
            `Square plate · blend between (m=${mode0.m}, n=${mode0.n}) ` +
            `and (m=${mode1.m}, n=${mode1.n}), α ≈ ${alpha.toFixed(2)}`;
    } else {
        modeLabel.textContent =
            `Circular plate · blend between (m=${mode0.m}, nᵣ=${mode0.nRadial}) ` +
            `and (m=${mode1.m}, nᵣ=${mode1.nRadial}), α ≈ ${alpha.toFixed(2)}`;
    }

    let primaryText = "";
    if (primaryMode) {
        if (shape === "square") {
            primaryText =
                `dominant mode ~ (m=${primaryMode.m}, n=${primaryMode.n}), ` +
                `weight ≈ ${(primaryMode.weight * 100).toFixed(0)}%`;
        } else {
            primaryText =
                `dominant mode ~ (m=${primaryMode.m}, nᵣ=${primaryMode.nRadial}), ` +
                `weight ≈ ${(primaryMode.weight * 100).toFixed(0)}%`;
        }
    }

    if (closestEigenFreq != null && detuning != null) {
        freqLabel.textContent =
            `Drive: ${freqHz.toFixed(1)} Hz · closest eigen ≈ ` +
            `${closestEigenFreq.toFixed(1)} Hz (Δf ≈ ${detuning.toFixed(
                1
            )} Hz) · ${primaryText}`;
    } else {
        freqLabel.textContent =
            `Drive: ${freqHz.toFixed(1)} Hz · ${primaryText}`;
    }
}

function syncParamsToRenderer() {
    const shape = shapeSelect.value;
    const plateSize = parseFloat(sizeSlider.value);
    const freqHz = parseFloat(freqSlider.value);

    renderer.updateParams({
        shape,
        plateSize,
        freqHz
    });

    updateModeInfo();
}

// Event listeners
shapeSelect.addEventListener("change", () => {
    syncParamsToRenderer();
});

sizeSlider.addEventListener("input", () => {
    updateValueLabels();
    syncParamsToRenderer();
});

freqSlider.addEventListener("input", () => {
    updateValueLabels();
    syncParamsToRenderer();
});

// Init
updateValueLabels();
syncParamsToRenderer();
renderer.start();
