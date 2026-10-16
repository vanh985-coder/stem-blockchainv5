// Tách nền cho hình rời (sprites): nhận dạng nền ô vuông (2 màu) hoặc nền một màu in thẳng vào ảnh, xóa vùng nền nối liền với mép ảnh, làm mềm mép.
// Mọi hàm là hàm thuần trên bộ đệm RGBA thô { data, width, height } (Uint8Array/Buffer, 4 byte mỗi điểm ảnh), không đọc file; `assets-build.mjs` và test dùng chung.
//
// Quy trình (spec: sửa trước bước 14):
//  1. `analyzeBackground`: ảnh đã trong suốt thật thì để nguyên ('transparent'). Không thì lấy mẫu dải mép ảnh, tìm 1 hoặc 2 màu nền trội (có sai số nhiễu), phân biệt
//     'checker' (hai màu xen kẽ), 'solid' (một màu) và 'none' (nền là cảnh, không tách).
//  2. `cutBackground`: điểm ảnh khớp màu nền (hoặc nằm giữa hai màu ô vuông, ở chỗ giáp ranh hai ô) thì là "ứng viên nền"; co ứng viên r điểm ảnh để cắt đứt cầu nối mỏng,
//     loang từ mép ảnh, rồi nở lại r điểm ảnh nhưng chỉ trong phạm vi ứng viên. Vùng trắng/xám bên trong hình không nối với mép (hoặc chỉ nối qua cầu mỏng) không bị xóa.
//  3. Thu hẹp phần đặc 1 điểm ảnh (bỏ viền còn dính màu nền) và làm mềm mép alpha.
//  4. `assessCutout`: báo tách chưa sạch (còn mảng ô vuông, xóa quá ít/quá nhiều, nhiều đốm lẻ) để vẽ lại.

/** Sai số tối đa của từng kênh màu so với màu nền (ảnh do AI tạo có nhiễu vài mức xám). */
export const BG_TOLERANCE = 24;
/** Bán kính (điểm ảnh) co/nở để chặn rò qua cầu mỏng giữa nền và phần trắng/xám của hình. */
export const LEAK_RADIUS = 2;
/** Nền xám trung tính thì điểm ảnh ứng viên cũng phải gần trung tính: chênh lệch giữa kênh lớn nhất và nhỏ nhất không quá độ chênh của màu nền cộng số này (hình màu kem, nâu, vàng không bị nhầm với ô xám trắng). */
export const CHROMA_SLACK = 8;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const near = (data, o, c, tol) => Math.abs(data[o] - c[0]) <= tol && Math.abs(data[o + 1] - c[1]) <= tol && Math.abs(data[o + 2] - c[2]) <= tol;

/** Gom các điểm ảnh gần `seed` (sai số `tol`), trả về màu trung bình sau vài lần tinh chỉnh và số điểm ảnh gần nó. */
function refineCluster(px, seed, tol) {
  let c = seed;
  let count = 0;
  for (let it = 0; it < 3; it++) {
    let r = 0;
    let g = 0;
    let b = 0;
    count = 0;
    for (let i = 0; i < px.length; i += 3) {
      if (Math.abs(px[i] - c[0]) <= tol && Math.abs(px[i + 1] - c[1]) <= tol && Math.abs(px[i + 2] - c[2]) <= tol) {
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
        count++;
      }
    }
    if (count === 0) break;
    c = [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
  }
  return { color: c, count };
}

/** Màu trội nhất của danh sách điểm ảnh (bỏ qua những điểm gần `exclude`), dùng bảng đếm 16 mức mỗi kênh rồi tinh chỉnh. */
function dominantColor(px, exclude, tol) {
  const hist = new Uint32Array(4096);
  let total = 0;
  for (let i = 0; i < px.length; i += 3) {
    if (exclude && Math.abs(px[i] - exclude[0]) <= tol && Math.abs(px[i + 1] - exclude[1]) <= tol && Math.abs(px[i + 2] - exclude[2]) <= tol) continue;
    hist[((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4)]++;
    total++;
  }
  if (total === 0) return null;
  let best = 0;
  for (let k = 1; k < 4096; k++) if (hist[k] > hist[best]) best = k;
  const seed = [((best >> 8) << 4) + 8, (((best >> 4) & 15) << 4) + 8, ((best & 15) << 4) + 8];
  return refineCluster(px, seed, tol + 6);
}

/**
 * Nhận dạng nền của ảnh. Trả về:
 *  - { kind: 'transparent' }: đã có điểm ảnh trong suốt thật (4 góc trong suốt, hoặc từ 2% điểm ảnh có alpha dưới 250): không đụng tới;
 *  - { kind: 'checker', colors: [A, B] }: nền ô vuông hai màu xen kẽ ở mép ảnh;
 *  - { kind: 'solid', colors: [A] }: nền một màu;
 *  - { kind: 'none' }: mép ảnh không có màu nền rõ (nền là cảnh).
 * Kèm `coverage` (tỉ lệ dải mép khớp màu nền) để xem xét.
 */
export function analyzeBackground(rgba, width, height, tol = BG_TOLERANCE) {
  const { data } = rgba;
  const n = width * height;
  let semi = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 250) semi++;
  const corners = [0, width - 1, (height - 1) * width, n - 1];
  const cornersClear = corners.filter((i) => data[i * 4 + 3] < 16).length;
  if (cornersClear >= 3 || semi / n >= 0.02) return { kind: 'transparent', coverage: 0 };

  const band = clamp(Math.round(Math.min(width, height) * 0.02), 4, 24);
  const px = [];
  const push = (x, y) => {
    const o = (y * width + x) * 4;
    px.push(data[o], data[o + 1], data[o + 2]);
  };
  for (let y = 0; y < height; y++) {
    if (y < band || y >= height - band) {
      for (let x = 0; x < width; x += 2) push(x, y);
    } else {
      for (let x = 0; x < band; x++) push(x, y);
      for (let x = width - band; x < width; x++) push(x, y);
    }
  }
  const sample = Uint8Array.from(px);
  const total = sample.length / 3;
  const a = dominantColor(sample, null, tol - 6);
  if (!a || a.count / total < 0.3) return { kind: 'none', coverage: a ? a.count / total : 0 };
  const rest = dominantColor(sample, a.color, tol);
  const bClu = rest ? refineCluster(sample, rest.color, tol) : null;
  const covA = a.count / total;
  const covB = bClu ? bClu.count / total : 0;
  const distinct = bClu ? Math.max(Math.abs(a.color[0] - bClu.color[0]), Math.abs(a.color[1] - bClu.color[1]), Math.abs(a.color[2] - bClu.color[2])) > tol : false;
  if (bClu && distinct && covB >= 0.12 && covA + covB >= 0.7) {
    // hai màu xen kẽ: đếm số lần đổi màu dọc dải trên cùng
    let switches = 0;
    let last = -1;
    const y0 = Math.min(height - 1, Math.floor(band / 2));
    for (let x = 0; x < width; x++) {
      const o = (y0 * width + x) * 4;
      const k = near(data, o, a.color, tol) ? 0 : near(data, o, bClu.color, tol) ? 1 : -1;
      if (k >= 0) {
        if (last >= 0 && k !== last) switches++;
        last = k;
      }
    }
    if (switches >= 4) return { kind: 'checker', colors: [a.color, bClu.color], coverage: covA + covB, switches };
  }
  if (covA >= 0.6) return { kind: 'solid', colors: [a.color], coverage: covA };
  return { kind: 'none', coverage: covA };
}

/** Bản đồ "ứng viên nền" (1 = điểm ảnh có thể là nền): khớp một màu nền, hoặc (nền ô vuông) nằm giữa hai màu ở chỗ giáp ranh hai ô. */
function candidateMask(data, w, h, colors, tol) {
  const m = new Uint8Array(w * h);
  const two = colors.length === 2;
  const lo = two ? [0, 1, 2].map((k) => Math.min(colors[0][k], colors[1][k]) - tol) : null;
  const hi = two ? [0, 1, 2].map((k) => Math.max(colors[0][k], colors[1][k]) + tol) : null;
  const chromaMax = Math.max(...colors.map((c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]))) + CHROMA_SLACK;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (data[o + 3] === 0) {
      m[i] = 1;
      continue;
    }
    if (Math.max(data[o], data[o + 1], data[o + 2]) - Math.min(data[o], data[o + 1], data[o + 2]) > chromaMax) continue;
    if (two) {
      // trong hộp màu giữa hai màu nền, và gần đoạn thẳng nối hai màu (không lệch màu như nâu, vàng của hình)
      if (data[o] >= lo[0] && data[o] <= hi[0] && data[o + 1] >= lo[1] && data[o + 1] <= hi[1] && data[o + 2] >= lo[2] && data[o + 2] <= hi[2]) {
        const dr = colors[1][0] - colors[0][0];
        const dg = colors[1][1] - colors[0][1];
        const db = colors[1][2] - colors[0][2];
        const len2 = dr * dr + dg * dg + db * db || 1;
        const t = clamp(((data[o] - colors[0][0]) * dr + (data[o + 1] - colors[0][1]) * dg + (data[o + 2] - colors[0][2]) * db) / len2, 0, 1);
        if (Math.abs(data[o] - (colors[0][0] + dr * t)) <= tol && Math.abs(data[o + 1] - (colors[0][1] + dg * t)) <= tol && Math.abs(data[o + 2] - (colors[0][2] + db * t)) <= tol) m[i] = 1;
      }
    } else if (near(data, o, colors[0], tol)) m[i] = 1;
  }
  return m;
}

/** Co (erode) mask 1 điểm ảnh theo ô 3 × 3, `r` lần. */
function erode(mask, w, h, r) {
  let src = mask;
  for (let it = 0; it < r; it++) {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!src[i]) continue;
        let ok = x > 0 && x < w - 1 && y > 0 && y < h - 1;
        // điểm ảnh sát mép ảnh giữ nguyên (mép ảnh không phải biên của hình)
        if (ok) {
          ok = src[i - 1] && src[i + 1] && src[i - w] && src[i + w] && src[i - w - 1] && src[i - w + 1] && src[i + w - 1] && src[i + w + 1];
        } else ok = true;
        if (ok) dst[i] = 1;
      }
    }
    src = dst;
  }
  return src;
}

/**
 * Nền ô vuông lọt trong lỗ của hình (không nối với mép ảnh): thành phần liên thông của ứng viên nền (dung sai rộng hơn vì bóng đổ làm ô sậm hoặc nhạt hơn), chưa bị xóa, rộng từ
 * `HOLE_MIN_AREA` điểm ảnh, có cả hai màu ô vuông (mỗi màu từ 15%, điểm ảnh tính theo màu nền gần hơn) và đổi màu qua lại nhiều (dấu hiệu của ô vuông) thì cũng là nền: thêm vào `mask`.
 * Vùng trắng/xám bên trong hình chỉ có một màu, hoặc không đổi màu qua lại, nên không bị xóa.
 */
export const HOLE_MIN_AREA = 40;
function removeEnclosedCheckerHoles(data, w, h, loose, mask, colors) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const members = [];
  const cls = (i) => {
    const o = i * 4;
    const da = Math.abs(data[o] - colors[0][0]) + Math.abs(data[o + 1] - colors[0][1]) + Math.abs(data[o + 2] - colors[0][2]);
    const db = Math.abs(data[o] - colors[1][0]) + Math.abs(data[o + 1] - colors[1][1]) + Math.abs(data[o + 2] - colors[1][2]);
    return da <= db ? 0 : 1;
  };
  for (let s0 = 0; s0 < n; s0++) {
    if (!loose[s0] || mask[s0] || seen[s0]) continue;
    let sp = 0;
    stack[sp++] = s0;
    seen[s0] = 1;
    members.length = 0;
    while (sp > 0) {
      const i = stack[--sp];
      members.push(i);
      const x = i % w;
      const push = (j) => {
        if (loose[j] && !mask[j] && !seen[j]) {
          seen[j] = 1;
          stack[sp++] = j;
        }
      };
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < n - w) push(i + w);
    }
    if (members.length < HOLE_MIN_AREA) continue;
    let na = 0;
    let flips = 0;
    for (const i of members) {
      const k = cls(i);
      if (k === 0) na++;
      if (i % w < w - 1 && loose[i + 1] && !mask[i + 1] && cls(i + 1) !== k) flips++;
    }
    const nb = members.length - na;
    if (na >= members.length * 0.15 && nb >= members.length * 0.15 && flips >= Math.max(2, members.length / 40)) {
      for (const i of members) mask[i] = 1;
    }
  }
}

/**
 * Xóa đốm lẻ của phần đặc (đã xóa nền, alpha 0 hoặc 255): bụi nhỏ dưới 60 điểm ảnh, và dấu mờ (logo ngôi sao) của công cụ tạo ảnh ở góc dưới phải: thành phần có tâm ở 20% góc dưới
 * phải, rộng dưới 0,05% ảnh. Hình thật (kể cả mảnh rời như dải băng diều) lớn hơn nhiều nên được giữ. Trả về số đốm đã xóa.
 */
export function despeckle(rgba, w, h) {
  const { data } = rgba;
  const n = w * h;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const comps = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (seen[s0] || data[s0 * 4 + 3] < 128) continue;
    let sp = 0;
    stack[sp++] = s0;
    seen[s0] = 1;
    const px = [];
    let sx = 0;
    let sy = 0;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    while (sp > 0) {
      const i = stack[--sp];
      px.push(i);
      const x = i % w;
      const y = (i - x) / w;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const push = (j) => {
        if (!seen[j] && data[j * 4 + 3] >= 128) {
          seen[j] = 1;
          stack[sp++] = j;
        }
      };
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }
    comps.push({ area: px.length, cx: sx / px.length, cy: sy / px.length, x0, y0, x1, y1 });
  }
  let removed = 0;
  for (const c of comps) {
    const dust = c.area < 60;
    const watermark = c.cx > w * 0.8 && c.cy > h * 0.8 && c.area < n * 0.0005;
    if (!dust && !watermark) continue;
    for (let y = Math.max(0, c.y0 - 4); y <= Math.min(h - 1, c.y1 + 4); y++) {
      for (let x = Math.max(0, c.x0 - 4); x <= Math.min(w - 1, c.x1 + 4); x++) data[(y * w + x) * 4 + 3] = 0;
    }
    removed++;
  }
  return removed;
}

/** Loang 4 hướng từ mọi điểm ảnh mép nằm trong `allowed`; trả về mask vùng đã loang. */
function floodFromBorder(allowed, w, h) {
  const out = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const seed = (i) => {
    if (allowed[i] && !out[i]) {
      out[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < w * h - w) seed(i + w);
  }
  return out;
}

/** Nở `flooded` tối đa `r` điểm ảnh (ô 3 × 3) nhưng chỉ vào chỗ `limit` cho phép (khôi phục lại phần đã bị co). */
function reconstruct(flooded, limit, w, h, r) {
  let cur = flooded;
  for (let it = 0; it < r; it++) {
    const nxt = cur.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i] || !limit[i]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx >= 0 && xx < w && cur[yy * w + xx]) {
              hit = true;
              break;
            }
          }
        }
        if (hit) nxt[i] = 1;
      }
    }
    cur = nxt;
  }
  return cur;
}

/** Thu hẹp phần đặc `erodePx` điểm ảnh (bỏ viền còn dính màu nền) rồi làm mềm viền alpha (nhòe hộp 3 × 3, `blurPasses` lần ≈ 1–2 điểm ảnh). */
export function softenAlpha(rgba, w, h, erodePx = 1, blurPasses = 2) {
  const { data } = rgba;
  let a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + 3];
  for (let it = 0; it < erodePx; it++) {
    const e = a.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let m = a[i];
        if (x > 0) m = Math.min(m, a[i - 1]);
        if (x < w - 1) m = Math.min(m, a[i + 1]);
        if (y > 0) m = Math.min(m, a[i - w]);
        if (y < h - 1) m = Math.min(m, a[i + w]);
        e[i] = m;
      }
    }
    a = e;
  }
  for (let it = 0; it < blurPasses; it++) {
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            s += a[yy * w + xx];
            c++;
          }
        }
        b[y * w + x] = Math.round(s / c);
      }
    }
    a = b;
  }
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = a[i];
}

/**
 * Xóa nền đã nhận dạng (`bg` là kết quả của `analyzeBackground`, kind 'checker' hoặc 'solid'): ghi alpha 0 vào vùng nền nối liền với mép ảnh, rồi thu hẹp và làm mềm mép.
 * Sửa `rgba.data` tại chỗ. Trả về { removed, mask } (tỉ lệ điểm ảnh bị xóa, và mask nền 1 = bị xóa).
 */
export function cutBackground(rgba, width, height, bg, opts = {}) {
  const { tol = BG_TOLERANCE, leakRadius = LEAK_RADIUS, erodePx = 1, blurPasses = 2 } = opts;
  if (bg.kind !== 'checker' && bg.kind !== 'solid') return { removed: 0, mask: new Uint8Array(width * height) };
  const { data } = rgba;
  const candidate = candidateMask(data, width, height, bg.colors, tol);
  const core = erode(candidate, width, height, leakRadius);
  const flooded = floodFromBorder(core, width, height);
  const mask = reconstruct(flooded, candidate, width, height, leakRadius + 1);
  if (bg.kind === 'checker') removeEnclosedCheckerHoles(data, width, height, candidateMask(data, width, height, bg.colors, tol * 2), mask, bg.colors);
  let removedCount = 0;
  for (let i = 0; i < width * height; i++) {
    if (mask[i]) {
      data[i * 4 + 3] = 0;
      removedCount++;
    }
  }
  despeckle(rgba, width, height);
  softenAlpha(rgba, width, height, erodePx, blurPasses);
  return { removed: removedCount / (width * height), mask };
}

/** Tách nền tự động: nhận dạng rồi tách. Ảnh đã trong suốt thật hoặc nền là cảnh thì để nguyên. Trả về { bg, removed, mask|null }. */
export function autoCutout(rgba, width, height, opts = {}) {
  const bg = analyzeBackground(rgba, width, height, opts.tol);
  if (bg.kind !== 'checker' && bg.kind !== 'solid') return { bg, removed: 0, mask: null };
  const r = cutBackground(rgba, width, height, bg, opts);
  return { bg, removed: r.removed, mask: r.mask };
}

/**
 * Đánh giá một lần tách (gọi sau `cutBackground`, trước hay sau làm mềm đều được): trả { clean, reasons }.
 * Chưa sạch khi: xóa dưới 3% hoặc trên 97% ảnh; còn mảng nền ô vuông rộng (nhóm điểm ảnh đặc khớp màu nền, có cả hai màu, từ 400 điểm ảnh, ví dụ nền lọt trong lỗ của hình);
 * hoặc có quá 40 đốm đặc lẻ nhỏ.
 */
export function assessCutout(rgba, width, height, bg, removed, tol = BG_TOLERANCE) {
  const reasons = [];
  if (removed < 0.03) reasons.push('xóa dưới 3% ảnh');
  if (removed > 0.97) reasons.push('xóa trên 97% ảnh');
  const n = width * height;
  const { data } = rgba;
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) solid[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  // đốm lẻ: thành phần liên thông của phần đặc
  const comp = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  const areas = [];
  const cand = bg.kind === 'checker' || bg.kind === 'solid' ? candidateMask(data, width, height, bg.colors, tol) : null;
  let residualPatches = 0;
  let residualArea = 0;
  for (let s = 0; s < n; s++) {
    if (!solid[s] || comp[s] >= 0) continue;
    let sp = 0;
    stack[sp++] = s;
    comp[s] = areas.length;
    let area = 0;
    while (sp > 0) {
      const i = stack[--sp];
      area++;
      const x = i % width;
      const push = (j) => {
        if (solid[j] && comp[j] < 0) {
          comp[j] = areas.length;
          stack[sp++] = j;
        }
      };
      if (x > 0) push(i - 1);
      if (x < width - 1) push(i + 1);
      if (i >= width) push(i - width);
      if (i < n - width) push(i + width);
    }
    areas.push(area);
  }
  const specks = areas.filter((a) => a < Math.max(30, n * 0.00005)).length;
  if (specks > 40) reasons.push(`${specks} đốm lẻ nhỏ`);
  if (cand && bg.kind === 'checker') {
    // mảng nền sót: thành phần liên thông của (đặc ∧ ứng viên) rộng, có cả hai màu ô vuông
    const seen = new Uint8Array(n);
    for (let s = 0; s < n; s++) {
      if (!solid[s] || !cand[s] || seen[s]) continue;
      let sp = 0;
      stack[sp++] = s;
      seen[s] = 1;
      let area = 0;
      let na = 0;
      let nb = 0;
      while (sp > 0) {
        const i = stack[--sp];
        area++;
        const o = i * 4;
        if (near(data, o, bg.colors[0], tol)) na++;
        else if (near(data, o, bg.colors[1], tol)) nb++;
        const x = i % width;
        const push = (j) => {
          if (solid[j] && cand[j] && !seen[j]) {
            seen[j] = 1;
            stack[sp++] = j;
          }
        };
        if (x > 0) push(i - 1);
        if (x < width - 1) push(i + 1);
        if (i >= width) push(i - width);
        if (i < n - width) push(i + width);
      }
      if (area >= 400 && na >= area * 0.1 && nb >= area * 0.1) {
        residualPatches++;
        residualArea += area;
      }
    }
    if (residualPatches > 0) reasons.push(`còn ${residualPatches} mảng nền ô vuông (${((residualArea / n) * 100).toFixed(1)}% ảnh)`);
  }
  return { clean: reasons.length === 0, reasons, specks, residualPatches };
}
