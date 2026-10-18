// Xóa dấu ngôi sao (dấu mờ của công cụ vẽ ảnh AI) ở góc dưới phải ảnh. Hàm thuần trên bộ đệm RGBA thô { data, width, height }, dùng chung cho `assets-build.mjs` và test.
//
// Dấu là một ngôi sao bốn cánh (cạnh lõm) màu trắng phủ mờ (alpha khoảng 0,2 đến 0,4 trên nền sẫm, tới 0,7 trên nền gần trắng). Kích thước và vị trí tỉ lệ theo cỡ ảnh (xem `sparkleGeometry`): ở ảnh cao 768
// (điểm ảnh "chuẩn", s = 1) nửa cạnh khoảng 26 điểm ảnh, tâm cách mép phải và mép dưới 120 điểm ảnh. Chỉ tìm và sửa trong MỘT Ô GÓC CỐ ĐỊNH quanh tâm đó (cửa sổ 1,5 lần nửa cạnh): không điểm
// ảnh nào ngoài ô bị đổi.
//
//  1. `detectSparkle`: hai kiểm định, dùng cửa sổ lấy mẫu ở độ phân giải chuẩn nên ảnh to hay nhỏ đều so được:
//     - hồi quy độ sáng theo (hằng số, dốc x, dốc y, mặt nạ ngôi sao): dấu thật làm hệ số `k` dương và nhọn hơn rõ so với cùng phép hồi quy đặt lệch 10 điểm ảnh (`peak`);
//     - bộ lọc khớp Laplacian: tương quan giữa Laplacian của ảnh và của mặt nạ ngôi sao (nét biên rõ của ngôi sao), so với phân bố khi đặt lệch (`z`). Nền nhiều hoa văn che mất
//       phép hồi quy nhưng vẫn lộ ra ở phép này.
//     Ảnh không có dấu (hoa văn, ảnh đã cắt) cho `peak` quanh 0 và `z` nhỏ.
//  2. `removeSparkle`: tìm alpha `a` rồi gỡ lớp phủ trắng theo công thức pixel' = (pixel − 255·a·c) / (1 − a·c) (c là độ phủ của ngôi sao tại điểm ảnh); gỡ đúng công thức nên giữ
//     nguyên hoa văn của nền. Sau đó nội suy dải biên mảnh (xóa nét viền còn sót). Nếu gỡ xong vẫn còn dấu (không phải lớp phủ trắng) thì tô lại vùng dấu từ điểm ảnh xung quanh.

/** Hình học của dấu (đơn vị: điểm ảnh ở ảnh cao 768; nhân với bề cao / 768 cho ảnh khác). */
export const SPARKLE = { offset: 120, radius: 26, exponent: 0.65, shift: -0.5 };
/** Ngưỡng nhận dạng (xem `detectSparkle`). */
export const DETECT = { peak: 3, k: 5, smoothRms: 2.5, smoothPeak: 1, smoothK: 2, lapAlpha: 0.02, lapZ: 4 };
/**
 * Alpha ước lượng từ nét biên (Laplacian) nhỏ hơn alpha thật ở phần phẳng của dấu (đo trên ảnh nền trơn: gấp khoảng 1,4 đến 1,9 lần khi alpha cỡ 0,2; gần bằng nhau khi alpha cỡ 0,65).
 * Hệ số đổi `plateauFactor(a)` giảm tuyến tính từ 1,5 (alpha 0) xuống 1 (alpha 0,65 trở lên).
 */
export const plateauFactor = (a) => 1 + 0.5 * Math.max(0, 1 - a / 0.65);

const HALF_REF = Math.ceil(SPARKLE.radius * 1.5);
const SIDE_REF = 2 * HALF_REF + 1;

/**
 * Tâm (làm tròn), nửa cạnh và độ lệch dưới điểm ảnh của dấu ở ảnh w × h (điểm ảnh thật), cùng hệ số tỉ lệ `s`. Công cụ vẽ ảnh đóng dấu cỡ cố định theo cỡ ảnh xuất ra: ảnh khoảng 1 triệu điểm ảnh
 * (1376 × 768, 1408 × 768) có s = 1; ảnh khoảng 4 triệu điểm ảnh (2752 × 1536, 2816 × 1536, 2048 × 2048) có s = 2. Nên s = căn bậc hai của (số điểm ảnh / 1,057 triệu), làm tròn, tối thiểu 1.
 */
export function sparkleGeometry(w, h) {
  const s = Math.max(1, Math.round(Math.sqrt((w * h) / (1376 * 768))));
  return { s, cx: Math.round(w - SPARKLE.offset * s), cy: Math.round(h - SPARKLE.offset * s), R: SPARKLE.radius * s, sx: SPARKLE.shift * s, sy: SPARKLE.shift * s };
}

/** Độ phủ [0, 1] của ngôi sao (|x/R|^q + |y/R|^q ≤ 1, tâm lệch (sx, sy)) tại điểm ảnh lệch (dx, dy) so với tâm làm tròn: lấy mẫu 4 × 4 trong điểm ảnh. */
export function coverage(dx, dy, R, sx = 0, sy = 0) {
  let n = 0;
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const x = (Math.abs(dx - sx + (i - 1.5) / 4) / R) ** SPARKLE.exponent;
      const y = (Math.abs(dy - sy + (j - 1.5) / 4) / R) ** SPARKLE.exponent;
      if (x + y <= 1) n++;
    }
  }
  return n / 16;
}

/** Mặt nạ ngôi sao ở độ phân giải chuẩn (cửa sổ HALF_REF), tính một lần. */
const REF = (() => {
  const T = new Float32Array(SIDE_REF * SIDE_REF);
  for (let dy = -HALF_REF; dy <= HALF_REF; dy++) for (let dx = -HALF_REF; dx <= HALF_REF; dx++) T[(dy + HALF_REF) * SIDE_REF + dx + HALF_REF] = coverage(dx, dy, SPARKLE.radius, SPARKLE.shift, SPARKLE.shift);
  const lap = new Float32Array(SIDE_REF * SIDE_REF);
  let tt = 0;
  for (let y = 1; y < SIDE_REF - 1; y++) {
    for (let x = 1; x < SIDE_REF - 1; x++) {
      const i = y * SIDE_REF + x;
      const v = 4 * T[i] - T[i - 1] - T[i + 1] - T[i - SIDE_REF] - T[i + SIDE_REF];
      lap[i] = v;
      tt += v * v;
    }
  }
  return { T, lap, tt };
})();

const lumaAt = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];

/** Độ sáng nội suy song tuyến tại (x, y) thực, kẹp vào trong ảnh. */
function sampleLuma(data, w, h, x, y) {
  const xc = Math.min(w - 1, Math.max(0, x));
  const yc = Math.min(h - 1, Math.max(0, y));
  const x0 = Math.floor(xc);
  const y0 = Math.floor(yc);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = xc - x0;
  const fy = yc - y0;
  const a = lumaAt(data, (y0 * w + x0) * 4);
  const b = lumaAt(data, (y0 * w + x1) * 4);
  const c = lumaAt(data, (y1 * w + x0) * 4);
  const d = lumaAt(data, (y1 * w + x1) * 4);
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/** Độ sáng cửa sổ chuẩn quanh (cx, cy) (điểm ảnh thật), lấy mẫu cách `s` điểm ảnh, đã gỡ lớp phủ alpha `a` theo mặt nạ chuẩn (a = 0: nguyên bản). */
function windowLuma(data, w, h, cx, cy, s, a) {
  const L = new Float32Array(SIDE_REF * SIDE_REF);
  for (let dy = -HALF_REF; dy <= HALF_REF; dy++) {
    for (let dx = -HALF_REF; dx <= HALF_REF; dx++) {
      const i = (dy + HALF_REF) * SIDE_REF + dx + HALF_REF;
      const c = REF.T[i] * a;
      L[i] = (sampleLuma(data, w, h, cx + dx * s, cy + dy * s) - 255 * c) / (1 - c);
    }
  }
  return L;
}

function solve4(A, b) {
  const n = 4;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-9) return null;
    for (let j = i + 1; j < n; j++) {
      const f = M[j][i] / M[i][i];
      for (let k = i; k <= n; k++) M[j][k] -= f * M[i][k];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
    x[i] = sum / M[i][i];
  }
  return x;
}

/** Hồi quy L ≈ a + b·dx + c·dy + k·T trên cửa sổ chuẩn; trả về { k, rms }. */
function regress(L) {
  const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const B = [0, 0, 0, 0];
  for (let dy = -HALF_REF; dy <= HALF_REF; dy++) {
    for (let dx = -HALF_REF; dx <= HALF_REF; dx++) {
      const i = (dy + HALF_REF) * SIDE_REF + dx + HALF_REF;
      const f = [1, dx, dy, REF.T[i]];
      for (let r = 0; r < 4; r++) {
        B[r] += f[r] * L[i];
        for (let c = 0; c < 4; c++) A[r][c] += f[r] * f[c];
      }
    }
  }
  const c = solve4(A, B);
  if (!c) return { k: 0, rms: Infinity };
  let sse = 0;
  for (let dy = -HALF_REF; dy <= HALF_REF; dy++) {
    for (let dx = -HALF_REF; dx <= HALF_REF; dx++) {
      const i = (dy + HALF_REF) * SIDE_REF + dx + HALF_REF;
      sse += (L[i] - (c[0] + c[1] * dx + c[2] * dy + c[3] * REF.T[i])) ** 2;
    }
  }
  return { k: c[3], rms: Math.sqrt(sse / (SIDE_REF * SIDE_REF - 4)) };
}

/** Bộ lọc khớp Laplacian: alpha ước lượng từ tương quan giữa Laplacian của cửa sổ và của mặt nạ ngôi sao (chia cho độ sáng nền còn lại 255 − trung bình). */
function lapEstimate(L) {
  let sab = 0;
  let mean = 0;
  let n = 0;
  for (let y = 1; y < SIDE_REF - 1; y++) {
    for (let x = 1; x < SIDE_REF - 1; x++) {
      const i = y * SIDE_REF + x;
      sab += (4 * L[i] - L[i - 1] - L[i + 1] - L[i - SIDE_REF] - L[i + SIDE_REF]) * REF.lap[i];
      mean += L[i];
      n++;
    }
  }
  return sab / (Math.max(255 - mean / n, 20) * REF.tt);
}

/** Kiểm định Laplacian tại tâm: alpha và z so với phân bố ước lượng khi đặt lệch (nền hoa văn tự sinh ước lượng ngẫu nhiên quanh 0). */
function lapTest(data, w, h, g) {
  const alpha = lapEstimate(windowLuma(data, w, h, g.cx, g.cy, g.s, 0));
  const nulls = [];
  for (let oy = -3; oy <= 3; oy++) {
    for (let ox = -3; ox <= 3; ox++) {
      if (Math.max(Math.abs(ox), Math.abs(oy)) < 2) continue;
      nulls.push(lapEstimate(windowLuma(data, w, h, g.cx + Math.round(ox * 4 * g.s), g.cy + Math.round(oy * 4 * g.s), g.s, 0)));
    }
  }
  const mu = nulls.reduce((a, b) => a + b, 0) / nulls.length;
  const sd = Math.sqrt(nulls.reduce((a, b) => a + (b - mu) ** 2, 0) / nulls.length);
  return { alpha, z: (alpha - mu) / (sd + 0.004) };
}

/**
 * Nhận dạng dấu ở ô góc cố định. Trả về { found, reliable, cx, cy, s, R, sx, sy, k, peak, rms, lapAlpha, lapZ }.
 */
export function detectSparkle(rgba, w, h) {
  const g = sparkleGeometry(w, h);
  const out = { found: false, reliable: false, ...g, k: 0, peak: 0, rms: 0, lapAlpha: 0, lapZ: 0 };
  if (g.cx - HALF_REF * g.s - 1 < 0 || g.cy - HALF_REF * g.s - 1 < 0) return out;
  const c = regress(windowLuma(rgba.data, w, h, g.cx, g.cy, g.s, 0));
  let shMax = -Infinity;
  const o = 10 * g.s;
  for (const [ox, oy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.7, o * 0.7], [-o * 0.7, -o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, o * 0.7]]) {
    shMax = Math.max(shMax, regress(windowLuma(rgba.data, w, h, g.cx + Math.round(ox), g.cy + Math.round(oy), g.s, 0)).k);
  }
  const peak = c.k - Math.max(shMax, 0);
  const reliable = peak >= DETECT.peak && c.k >= DETECT.k;
  const byRegression = reliable || (c.rms <= DETECT.smoothRms && c.k >= DETECT.smoothK && peak >= DETECT.smoothPeak);
  const lt = lapTest(rgba.data, w, h, g);
  const byLaplacian = lt.alpha >= DETECT.lapAlpha && lt.z >= DETECT.lapZ;
  return { ...out, found: byRegression || byLaplacian, reliable, k: c.k, peak, rms: c.rms, lapAlpha: lt.alpha, lapZ: lt.z };
}

/**
 * Hồi quy dùng được để định alpha (phần phẳng của dấu đo được): dấu nhọn và rõ (peak ≥ 8), hoặc nền trơn (rms ≤ 4) mà dấu vẫn nhô lên (k ≥ 2, peak ≥ 1). Nền nhiều hoa văn thì k bị hoa văn
 * làm nhiễu: dùng bộ lọc khớp Laplacian.
 */
function regressionUsable(det) {
  return (det.peak >= 8 && det.k >= DETECT.k) || (det.rms <= 4 && det.k >= 2 && det.peak >= 1);
}

/** Alpha của lớp phủ: bisection sao cho phép hồi quy trên ảnh đã gỡ cho k = 0 (khi hồi quy dùng được), nếu không thì lặp bộ lọc khớp Laplacian rồi nhân `plateauFactor`. */
function estimateAlpha(data, w, h, g, useRegression) {
  if (useRegression) {
    let lo = 0;
    let hi = 0.9;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2;
      if (regress(windowLuma(data, w, h, g.cx, g.cy, g.s, mid)).k > 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  let a = 0;
  for (let it = 0; it < 12; it++) {
    const r = lapEstimate(windowLuma(data, w, h, g.cx, g.cy, g.s, a));
    if (Math.abs(r) < 0.002) break;
    a = Math.min(0.9, Math.max(0, a + r * (1 - a)));
  }
  return Math.min(0.9, a * plateauFactor(a));
}

/** Mặt nạ độ phủ ở độ phân giải thật: nửa cạnh `half`, cạnh `side`, bảng T. */
function fullWindow(g) {
  const half = Math.ceil(HALF_REF * g.s);
  const side = 2 * half + 1;
  const T = new Float32Array(side * side);
  for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) T[(dy + half) * side + dx + half] = coverage(dx, dy, g.R, g.sx, g.sy);
  return { half, side, T };
}

/**
 * Gỡ dấu đã nhận dạng (`det` từ `detectSparkle`). Trả về { alpha, fixed, residual, fallback }: alpha tìm được, số điểm ảnh đã đổi, tương quan Laplacian còn lại sau khi gỡ, và có phải
 * tô lại từ điểm ảnh xung quanh (khi gỡ theo lớp phủ trắng chưa sạch) không. Chỉ đổi điểm ảnh trong cửa sổ quanh tâm.
 */
export function removeSparkle(rgba, w, h, det, opts = {}) {
  const { data } = rgba;
  const g = { s: det.s, cx: det.cx, cy: det.cy, R: det.R, sx: det.sx, sy: det.sy };
  const viaRegression = regressionUsable(det);
  const alpha = opts.alpha ?? estimateAlpha(data, w, h, g, viaRegression);
  if (alpha < 0.005) return { alpha, fixed: 0, residual: 0, fallback: false };
  const before = new Uint8Array(data.length);
  before.set(data);
  const win = fullWindow(g);
  // ước lượng alpha từ nét biên mà ra quá lớn (nền gần trắng, dấu gần như vô hình): gỡ theo công thức dễ làm tối nên tô lại từ điểm ảnh xung quanh
  if (opts.alpha === undefined && !viaRegression && alpha >= 0.5) return { alpha, fixed: inpaint(data, w, h, g, win), residual: 0, fallback: true };
  let fixed = 0;
  for (let dy = -win.half; dy <= win.half; dy++) {
    const y = g.cy + dy;
    if (y < 0 || y >= h) continue;
    for (let dx = -win.half; dx <= win.half; dx++) {
      const x = g.cx + dx;
      if (x < 0 || x >= w) continue;
      const cov = win.T[(dy + win.half) * win.side + dx + win.half];
      if (cov <= 0) continue;
      const c = cov * alpha;
      const o = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) data[o + k] = Math.max(0, Math.min(255, Math.round((data[o + k] - 255 * c) / (1 - c))));
      fixed++;
    }
  }
  smoothEdge(data, w, h, g, win);
  const residual = lapEstimate(windowLuma(data, w, h, g.cx, g.cy, g.s, 0));
  // còn dấu rõ (không phải lớp phủ trắng, hoặc nền quá nhiều hoa văn): trả lại ảnh và tô từ điểm ảnh xung quanh
  if (Math.abs(residual) > 0.03 || alpha >= 0.89) {
    data.set(before);
    return { alpha, fixed: inpaint(data, w, h, g, win), residual, fallback: true };
  }
  return { alpha, fixed, residual, fallback: false };
}

/** Nội suy đều (khuếch tán Jacobi) các điểm ảnh của `region` (mảng side × side, 1 = cần tô) từ điểm ảnh xung quanh, trên dữ liệu thật quanh (cx, cy). */
function diffuse(data, w, h, g, win, region, iterations) {
  const { half, side } = win;
  const inImage = (x, y) => g.cx + x - half >= 0 && g.cx + x - half < w && g.cy + y - half >= 0 && g.cy + y - half < h;
  const val = [0, 1, 2].map(() => new Float32Array(side * side));
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) if (inImage(x, y)) for (let k = 0; k < 3; k++) val[k][y * side + x] = data[((g.cy + y - half) * w + g.cx + x - half) * 4 + k];
  for (let it = 0; it < iterations; it++) {
    for (let y = 1; y < side - 1; y++) {
      for (let x = 1; x < side - 1; x++) {
        const i = y * side + x;
        if (!region[i] || !inImage(x, y)) continue;
        for (let k = 0; k < 3; k++) val[k][i] = (val[k][i - 1] + val[k][i + 1] + val[k][i - side] + val[k][i + side]) / 4;
      }
    }
  }
  let n = 0;
  for (let y = 1; y < side - 1; y++) {
    for (let x = 1; x < side - 1; x++) {
      const i = y * side + x;
      if (!region[i] || !inImage(x, y)) continue;
      for (let k = 0; k < 3; k++) data[((g.cy + y - half) * w + g.cx + x - half) * 4 + k] = Math.max(0, Math.min(255, Math.round(val[k][i])));
      n++;
    }
  }
  return n;
}

/** Nở mặt nạ nhị phân `n` điểm ảnh (4 hướng). */
function grow(mask, side, n) {
  let cur = mask;
  for (let it = 0; it < n; it++) {
    const nxt = cur.slice();
    for (let y = 1; y < side - 1; y++) {
      for (let x = 1; x < side - 1; x++) {
        const i = y * side + x;
        if (!cur[i] && (cur[i - 1] || cur[i + 1] || cur[i - side] || cur[i + side])) nxt[i] = 1;
      }
    }
    cur = nxt;
  }
  return cur;
}

/** Xóa nét viền mảnh còn lại sau khi gỡ lớp phủ: dải quanh đường biên của ngôi sao (độ phủ lẻ, nở theo tỉ lệ ảnh) được nội suy đều từ điểm ảnh hai bên; hoa văn trong và ngoài dải không đổi. */
function smoothEdge(data, w, h, g, win) {
  const band = new Uint8Array(win.side * win.side);
  for (let i = 0; i < band.length; i++) if (win.T[i] > 0 && win.T[i] < 1) band[i] = 1;
  diffuse(data, w, h, g, win, grow(band, win.side, Math.max(1, Math.round(g.s))), 80);
}

/** Tô lại vùng ngôi sao (nở 3 điểm ảnh chuẩn) bằng khuếch tán đều từ điểm ảnh xung quanh. Trả về số điểm ảnh đã tô. */
function inpaint(data, w, h, g, win) {
  const mask = new Uint8Array(win.side * win.side);
  for (let i = 0; i < mask.length; i++) if (win.T[i] > 0) mask[i] = 1;
  return diffuse(data, w, h, g, win, grow(mask, win.side, Math.round(3 * g.s)), 400);
}

/** Nhận dạng rồi gỡ. Trả về { found, k, peak, lapAlpha, lapZ, alpha, fixed, residual, fallback } (found false thì ảnh không đổi). */
export function cleanSparkle(rgba, w, h) {
  const det = detectSparkle(rgba, w, h);
  const info = { k: det.k, peak: det.peak, lapAlpha: det.lapAlpha, lapZ: det.lapZ };
  if (!det.found) return { found: false, ...info, alpha: 0, fixed: 0, residual: 0, fallback: false };
  return { found: true, ...info, ...removeSparkle(rgba, w, h, det) };
}

/** Alpha thường gặp của dấu ở ảnh to (đo trên các ảnh nhận dạng chắc chắn: 0,26 đến 0,40, trung vị khoảng 0,31); dùng cho ảnh trong danh sách "luôn xóa". */
export const TYPICAL_ALPHA = 0.31;

/**
 * Luôn xóa ở ô góc (dùng cho ảnh trong danh sách "luôn xóa" của assets:build, nơi dấu mờ quá nên nhận dạng không chắc chắn): bỏ qua nhận dạng, gỡ lớp phủ trắng với alpha thường gặp
 * (`TYPICAL_ALPHA`, giữ nguyên hoa văn nền); nếu sau khi gỡ vẫn còn tương quan với nét biên ngôi sao thì tô lại vùng ngôi sao từ điểm ảnh xung quanh. Chỉ đổi điểm ảnh trong cửa sổ quanh tâm.
 * Trả về { found, forced: true, alpha, fixed, residual, fallback, ... }.
 */
export function forceCleanSparkle(rgba, w, h, alpha = TYPICAL_ALPHA) {
  const det = detectSparkle(rgba, w, h);
  const info = { k: det.k, peak: det.peak, lapAlpha: det.lapAlpha, lapZ: det.lapZ };
  if (det.cx - HALF_REF * det.s - 1 < 0 || det.cy - HALF_REF * det.s - 1 < 0) return { found: false, forced: true, ...info, alpha: 0, fixed: 0, residual: 0, fallback: false };
  return { found: true, forced: true, ...info, ...removeSparkle(rgba, w, h, det, { alpha }) };
}
