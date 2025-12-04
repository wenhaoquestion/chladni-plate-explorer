// physics.js

// ======= Square plate (center-clamped, Bourke model) =======
// xNorm, yNorm ∈ [-1, 1]
export function squareModeDisplacement(xNorm, yNorm, m, n) {
    // 把 [-1,1] 映射到 [0,1]，这里把 L 当成 1 处理
    const X = (xNorm + 1) * 0.5;  // 0..1
    const Y = (yNorm + 1) * 0.5;

    if (m === n) return 0; // n = m 时解是平凡的，直接跳过

    const term1 = Math.cos(n * Math.PI * X) * Math.cos(m * Math.PI * Y);
    const term2 = Math.cos(m * Math.PI * X) * Math.cos(n * Math.PI * Y);
    return term1 - term2;
}

// Chladni 板频率大致也跟 sqrt(m^2+n^2)/L 成正比，这里只要保证单调就行
const F0_SQUARE = 80; // 只是一个缩放因子，你可以根据手感调整

export function squareEigenFreq(m, n, plateSize) {
    const k = Math.sqrt(m * m + n * n);
    const L = plateSize;        // 盘越小，频率越高
    return (F0_SQUARE * k) / L;
}


// ======= Circular plate (简化的 Bessel 风格近似) =======
const F0_CIRCLE = 90;

// 简单的径向模式：cos(n_r * pi * r) * exp(-α r^2)，不是严格的 Bessel，
// 但能给出类似“多圈节点”的结构
function radialMode(r, nRadial) {
    return Math.cos(nRadial * Math.PI * r) * Math.exp(-1.2 * r * r);
}

// xNorm, yNorm ∈ [-1, 1]
export function circleModeDisplacement(xNorm, yNorm, m, nRadial) {
    const r = Math.hypot(xNorm, yNorm);
    if (r > 1) return 0;

    const theta = Math.atan2(yNorm, xNorm); // -π..π
    const angular = Math.cos(m * theta);
    return radialMode(r, nRadial) * angular;
}

export function circleEigenFreq(m, nRadial, plateSize) {
    // 真正的圆板要用 Bessel 零点 Z_{mn}/R，这里用 sqrt(m^2+n_r^2)/R 近似
    const k = Math.sqrt(m * m + nRadial * nRadial);
    const R = plateSize;
    return (F0_CIRCLE * k) / R;
}
