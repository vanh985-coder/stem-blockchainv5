/**
 * Dựng vật cản từ chân tường thật của model (mốc 2, bước 7b). Hàm thuần, không import three: nhận các điểm (x, z) của phần model nằm
 * trong khoảng 0–1,5 đơn vị tính từ mặt đất (đã áp cỡ thật), dựng "vùng chân tường" (KHÔNG phải khung bao cả model: mái chìa ra rộng
 * hơn tường), rồi chọn hình bao sát nhất: một hình tròn, một hộp, hoặc vài hộp xếp theo dải (cho hình cong hay có chỗ lõm như cổng).
 * Mọi hình nằm trong hệ tọa độ của model (chưa xoay, chưa phóng thêm).
 *
 * Tiêu chí (kiểm tra bằng test trên file model thật): hình phủ ít nhất 90% diện tích chân tường và không thừa quá 0,3 đơn vị ra ngoài.
 * Làm việc trên lưới ô 0,1: vùng là tập ô; "bao lồi" cho vật đặc (nhà, lều, giếng, cây), "vùng đã lấp lỗ" cho vật có chỗ lõm (cổng).
 */

export interface Pt {
  x: number;
  z: number;
}

export type FootShape =
  | { kind: 'box'; cx: number; cz: number; hx: number; hz: number }
  | { kind: 'circle'; cx: number; cz: number; r: number };

/** Ô lưới (đơn vị cảnh). */
export const CELL = 0.1;
/** Khi dựng: thừa tối đa cho phép; dải hộp mỏng nhất. Test chấp nhận rộng hơn (`MAX_OVERHANG`). */
export const TOLERANCE = 0.25;
export const MIN_BAND = 0.2;
/** Hàng kề nhau lệch quá bấy nhiêu (đơn vị) thì tách dải ngay (bậc thang, không phải mép cong). */
const STEP_BREAK = 0.45;
/** Tiêu chí chấp nhận (test): phủ tối thiểu và thừa tối đa; khi dựng nhắm phủ cao hơn một chút. */
export const MIN_COVERAGE = 0.9;
export const MAX_OVERHANG = 0.3;
export const TARGET_COVERAGE = 0.94;

// ---------------------------------------------------------------------------
// Lưới vùng

export interface Grid {
  minX: number;
  minZ: number;
  nx: number;
  nz: number;
  cell: number;
  /** 1: ô thuộc vùng */
  data: Uint8Array;
}

const idx = (g: Grid, i: number, j: number) => j * g.nx + i;

/** Tâm ô (i, j). */
export const cellX = (g: Grid, i: number) => g.minX + (i + 0.5) * g.cell;
export const cellZ = (g: Grid, j: number) => g.minZ + (j + 0.5) * g.cell;

function emptyGrid(minX: number, maxX: number, minZ: number, maxZ: number, cell: number, pad: number): Grid {
  const x0 = Math.floor((minX - pad) / cell) * cell;
  const z0 = Math.floor((minZ - pad) / cell) * cell;
  const nx = Math.ceil((maxX + pad - x0) / cell);
  const nz = Math.ceil((maxZ + pad - z0) / cell);
  return { minX: x0, minZ: z0, nx, nz, cell, data: new Uint8Array(nx * nz) };
}

function boundsOf(points: readonly Pt[]): [number, number, number, number] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return [minX, maxX, minZ, maxZ];
}

/** Vùng gồm mọi ô có ít nhất một điểm. `pad` là lề trống quanh vùng (để đo khoảng cách ra ngoài). */
export function gridFromPoints(points: readonly Pt[], cell = CELL, pad = 1): Grid {
  const [a, b, c, d] = boundsOf(points);
  const g = emptyGrid(a, b, c, d, cell, pad);
  for (const p of points) {
    const i = Math.floor((p.x - g.minX) / cell);
    const j = Math.floor((p.z - g.minZ) / cell);
    g.data[idx(g, i, j)] = 1;
  }
  return g;
}

/**
 * Bỏ các chi tiết mảnh (rễ nhỏ, que): lấy các ô có điểm, "mở" vùng bằng hình tròn bán kính `radius` (co rồi nở), chỉ giữ điểm nằm trong vùng còn lại. Dùng cho cây đa: nền rễ
 * to nhô cao quanh gốc là vật cản, còn rễ phụ mảnh thò ra ngoài thì không (bước 8d).
 */
export function removeThinFeatures(points: readonly Pt[], radius = 0.7, cell = CELL): Pt[] {
  const g = gridFromPoints(points, cell, Math.ceil(radius / cell) + 2);
  const r = Math.round(radius / cell);
  const offs: [number, number][] = [];
  for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) offs.push([a, b]);
  const eroded = new Uint8Array(g.data.length);
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      if (!g.data[idx(g, i, j)]) continue;
      let all = true;
      for (const [a, b] of offs) {
        const x = i + a;
        const z = j + b;
        if (x < 0 || z < 0 || x >= g.nx || z >= g.nz || !g.data[idx(g, x, z)]) {
          all = false;
          break;
        }
      }
      if (all) eroded[idx(g, i, j)] = 1;
    }
  }
  const opened = new Uint8Array(g.data.length);
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      if (!eroded[idx(g, i, j)]) continue;
      for (const [a, b] of offs) {
        const x = i + a;
        const z = j + b;
        if (x >= 0 && z >= 0 && x < g.nx && z < g.nz) opened[idx(g, x, z)] = 1;
      }
    }
  }
  return points.filter((p) => opened[idx(g, Math.floor((p.x - g.minX) / cell), Math.floor((p.z - g.minZ) / cell))] === 1);
}

/** Bao lồi (Andrew monotone chain), ngược chiều kim đồng hồ. */
export function convexHull(points: readonly Pt[]): Pt[] {
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const pts = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  const uniq: Pt[] = [];
  for (const p of pts) if (!uniq.length || uniq[uniq.length - 1].x !== p.x || uniq[uniq.length - 1].z !== p.z) uniq.push(p);
  if (uniq.length < 3) return uniq;
  const lower: Pt[] = [];
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Điểm có nằm trong đa giác lồi (ngược chiều kim đồng hồ), kể cả trên cạnh. */
export function inConvex(hull: readonly Pt[], x: number, z: number): boolean {
  const n = hull.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % n];
    if ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x) < -1e-9) return false;
  }
  return true;
}

/** Vùng là phần bên trong bao lồi của các điểm (vật đặc: nhà, lều, giếng, cây). */
export function gridFromHull(points: readonly Pt[], cell = CELL, pad = 1): Grid {
  const hull = convexHull(points);
  const [a, b, c, d] = boundsOf(hull);
  const g = emptyGrid(a, b, c, d, cell, pad);
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) if (inConvex(hull, cellX(g, i), cellZ(g, j))) g.data[idx(g, i, j)] = 1;
  return g;
}

/**
 * Vùng là các điểm đã "đóng khe" (lấp các khe hẹp, bán kính `closeCells` ô) rồi lấp mọi lỗ kín (phần giữa hai mặt tường): cho vật có chỗ
 * lõm như cổng (lối đi giữa vẫn trống).
 */
export function gridFromFilledPoints(points: readonly Pt[], cell = CELL, closeCells = 2, pad = 1): Grid {
  const g = gridFromPoints(points, cell, pad + closeCells * cell);
  const r2 = closeCells * closeCells;
  const dilated = new Uint8Array(g.data.length);
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      if (!g.data[idx(g, i, j)]) continue;
      for (let dj = -closeCells; dj <= closeCells; dj++) {
        for (let di = -closeCells; di <= closeCells; di++) {
          const a = i + di;
          const b = j + dj;
          if (a >= 0 && b >= 0 && a < g.nx && b < g.nz && di * di + dj * dj <= r2) dilated[idx(g, a, b)] = 1;
        }
      }
    }
  }
  const closed = new Uint8Array(g.data.length);
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      let all = dilated[idx(g, i, j)] === 1;
      for (let dj = -closeCells; all && dj <= closeCells; dj++) {
        for (let di = -closeCells; all && di <= closeCells; di++) {
          if (di * di + dj * dj > r2) continue;
          const a = i + di;
          const b = j + dj;
          if (a < 0 || b < 0 || a >= g.nx || b >= g.nz || !dilated[idx(g, a, b)]) all = false;
        }
      }
      if (all) closed[idx(g, i, j)] = 1;
    }
  }
  for (let k = 0; k < closed.length; k++) if (g.data[k]) closed[k] = 1; // ô gốc luôn thuộc vùng
  // lấp lỗ: các ô trống không nối được ra ngoài thì thuộc vùng
  const outside = new Uint8Array(closed.length);
  const stack: number[] = [];
  const push = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return;
    const k = idx(g, i, j);
    if (closed[k] || outside[k]) return;
    outside[k] = 1;
    stack.push(k);
  };
  for (let i = 0; i < g.nx; i++) {
    push(i, 0);
    push(i, g.nz - 1);
  }
  for (let j = 0; j < g.nz; j++) {
    push(0, j);
    push(g.nx - 1, j);
  }
  while (stack.length) {
    const k = stack.pop() as number;
    const i = k % g.nx;
    const j = (k - i) / g.nx;
    push(i + 1, j);
    push(i - 1, j);
    push(i, j + 1);
    push(i, j - 1);
  }
  for (let k = 0; k < closed.length; k++) g.data[k] = outside[k] ? 0 : 1;
  return g;
}

/** Khoảng cách (đơn vị) từ tâm mỗi ô tới ô thuộc vùng gần nhất (0 nếu thuộc vùng), xấp xỉ hai lượt quét (sai số vài %). */
export function distanceField(g: Grid): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(g.data.length);
  for (let k = 0; k < d.length; k++) d[k] = g.data[k] ? 0 : INF;
  const r2 = Math.SQRT2;
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      const k = idx(g, i, j);
      let v = d[k];
      if (i > 0) v = Math.min(v, d[k - 1] + 1);
      if (j > 0) {
        v = Math.min(v, d[k - g.nx] + 1);
        if (i > 0) v = Math.min(v, d[k - g.nx - 1] + r2);
        if (i < g.nx - 1) v = Math.min(v, d[k - g.nx + 1] + r2);
      }
      d[k] = v;
    }
  }
  for (let j = g.nz - 1; j >= 0; j--) {
    for (let i = g.nx - 1; i >= 0; i--) {
      const k = idx(g, i, j);
      let v = d[k];
      if (i < g.nx - 1) v = Math.min(v, d[k + 1] + 1);
      if (j < g.nz - 1) {
        v = Math.min(v, d[k + g.nx] + 1);
        if (i < g.nx - 1) v = Math.min(v, d[k + g.nx + 1] + r2);
        if (i > 0) v = Math.min(v, d[k + g.nx - 1] + r2);
      }
      d[k] = v;
    }
  }
  for (let k = 0; k < d.length; k++) d[k] *= g.cell;
  return d;
}

// ---------------------------------------------------------------------------
// Hình

export function inShape(s: FootShape, x: number, z: number): boolean {
  return s.kind === 'circle' ? Math.hypot(x - s.cx, z - s.cz) <= s.r : Math.abs(x - s.cx) <= s.hx && Math.abs(z - s.cz) <= s.hz;
}

export function inAnyShape(shapes: readonly FootShape[], x: number, z: number): boolean {
  for (const s of shapes) if (inShape(s, x, z)) return true;
  return false;
}

export interface Fit {
  /** Phần diện tích chân tường được hình phủ (0 đến 1) */
  coverage: number;
  /** Chỗ xa nhất của hình nằm ngoài chân tường (đơn vị) */
  overhang: number;
}

/**
 * Đo mức khớp của các hình với vùng chân tường `g`: tỉ lệ diện tích vùng được phủ, và khoảng cách xa nhất từ một ô nằm trong hình tới
 * vùng. Lưới cần có lề trống quanh vùng đủ rộng để chứa phần hình thừa ra ngoài (mặc định lề 1 đơn vị).
 */
export function measureFit(shapes: readonly FootShape[], g: Grid, dist: Float32Array = distanceField(g)): Fit {
  let region = 0;
  let covered = 0;
  let overhang = 0;
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      const k = idx(g, i, j);
      const inS = inAnyShape(shapes, cellX(g, i), cellZ(g, j));
      if (g.data[k]) {
        region++;
        if (inS) covered++;
      } else if (inS && dist[k] > overhang) overhang = dist[k];
    }
  }
  return { coverage: region === 0 ? 1 : covered / region, overhang };
}

function occupiedBounds(g: Grid): [number, number, number, number] {
  let minI = Infinity;
  let maxI = -Infinity;
  let minJ = Infinity;
  let maxJ = -Infinity;
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      if (!g.data[idx(g, i, j)]) continue;
      if (i < minI) minI = i;
      if (i > maxI) maxI = i;
      if (j < minJ) minJ = j;
      if (j > maxJ) maxJ = j;
    }
  }
  return [g.minX + minI * g.cell, g.minX + (maxI + 1) * g.cell, g.minZ + minJ * g.cell, g.minZ + (maxJ + 1) * g.cell];
}

export function boundingBox(g: Grid): FootShape {
  const [x0, x1, z0, z1] = occupiedBounds(g);
  return { kind: 'box', cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 };
}

export function boundingCircle(g: Grid): FootShape {
  const [x0, x1, z0, z1] = occupiedBounds(g);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  let r = 0;
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) if (g.data[idx(g, i, j)]) r = Math.max(r, Math.hypot(cellX(g, i) - cx, cellZ(g, j) - cz) + g.cell / 2);
  return { kind: 'circle', cx, cz, r };
}

function shrink(s: FootShape, d: number): FootShape {
  return s.kind === 'circle' ? { ...s, r: Math.max(0.05, s.r - d) } : { ...s, hx: Math.max(0.05, s.hx - d), hz: Math.max(0.05, s.hz - d) };
}

/**
 * Hình đơn (tròn hoặc hộp) bao sát nhất: bắt đầu từ hình bao hết vùng rồi thu dần vào (mỗi bước 2 cm, tối đa 0,3) cho tới khi độ thừa
 * ≤ tol, miễn là còn phủ ≥ TARGET_COVERAGE. Không đạt thì trả về null.
 */
function bestSingle(start: FootShape, g: Grid, dist: Float32Array, tol: number): FootShape | null {
  for (let d = 0; d <= 0.3 + 1e-9; d += 0.02) {
    const s = d === 0 ? start : shrink(start, d);
    const fit = measureFit([s], g, dist);
    if (fit.coverage < TARGET_COVERAGE) return null;
    if (fit.overhang <= tol) return s;
  }
  return null;
}

/**
 * Phủ vùng bằng các hộp xếp theo dải: quét theo `axis` ('z': dải ngang, 'x': dải dọc); mỗi dải kéo dài chừng nào hai đầu của vùng
 * trong dải chưa lệch quá `tol`, và dày ít nhất `minBand`. Hộp phủ hết các ô của dải.
 */
export function sweepBoxes(g: Grid, axis: 'x' | 'z', tol = TOLERANCE, minBand = MIN_BAND): FootShape[] {
  const nMain = axis === 'z' ? g.nz : g.nx;
  const nCross = axis === 'z' ? g.nx : g.nz;
  const at = (m: number, c: number) => (axis === 'z' ? g.data[idx(g, c, m)] : g.data[idx(g, m, c)]);
  /** Khoảng [đầu, cuối) theo chỉ số ô mà vùng chiếm ở hàng m; null nếu trống. */
  const extent = (m: number): [number, number] | null => {
    let lo = -1;
    let hi = -1;
    for (let c = 0; c < nCross; c++) {
      if (at(m, c)) {
        if (lo < 0) lo = c;
        hi = c + 1;
      }
    }
    return lo < 0 ? null : [lo, hi];
  };
  const tolCells = tol / g.cell;
  const minCells = Math.round(minBand / g.cell);
  const crossOrigin = axis === 'z' ? g.minX : g.minZ;
  const mainOrigin = axis === 'z' ? g.minZ : g.minX;
  const out: FootShape[] = [];
  let m = 0;
  while (m < nMain) {
    const first = extent(m);
    if (!first) {
      m++;
      continue;
    }
    let loMin = first[0];
    let loMax = first[0];
    let hiMin = first[1];
    let hiMax = first[1];
    let end = m + 1;
    let prev = first;
    while (end < nMain) {
      const e = extent(end);
      if (!e) break;
      // bậc thang lớn (tháp nối tường): luôn tách dải, kể cả khi dải chưa đủ dày
      if (Math.max(Math.abs(e[0] - prev[0]), Math.abs(e[1] - prev[1])) * g.cell > STEP_BREAK) break;
      prev = e;
      const nlMin = Math.min(loMin, e[0]);
      const nlMax = Math.max(loMax, e[0]);
      const nhMin = Math.min(hiMin, e[1]);
      const nhMax = Math.max(hiMax, e[1]);
      if (end - m >= minCells && (nlMax - nlMin > tolCells || nhMax - nhMin > tolCells)) break;
      loMin = nlMin;
      loMax = nlMax;
      hiMin = nhMin;
      hiMax = nhMax;
      end++;
    }
    const crossLo = crossOrigin + loMin * g.cell;
    const crossHi = crossOrigin + hiMax * g.cell;
    const mainLo = mainOrigin + m * g.cell;
    const mainHi = mainOrigin + end * g.cell;
    out.push(
      axis === 'z'
        ? { kind: 'box', cx: (crossLo + crossHi) / 2, cz: (mainLo + mainHi) / 2, hx: (crossHi - crossLo) / 2, hz: (mainHi - mainLo) / 2 }
        : { kind: 'box', cx: (mainLo + mainHi) / 2, cz: (crossLo + crossHi) / 2, hx: (mainHi - mainLo) / 2, hz: (crossHi - crossLo) / 2 },
    );
    m = end;
  }
  return out;
}

/**
 * Siết hộp `box` vào đúng phần vùng nằm trong nó (hộp bao của các ô vùng bên trong); nếu vẫn thừa quá `tol` thì chia đôi theo cạnh dài
 * rồi siết từng nửa, lặp lại cho tới khi hết thừa hoặc nửa quá nhỏ (≤ 0,2). Hộp không chứa ô vùng nào thì bỏ.
 */
export function refineBox(g: Grid, dist: Float32Array, box: Extract<FootShape, { kind: 'box' }>, tol: number): FootShape[] {
  const x0 = box.cx - box.hx;
  const x1 = box.cx + box.hx;
  const z0 = box.cz - box.hz;
  const z1 = box.cz + box.hz;
  let minI = Infinity;
  let maxI = -Infinity;
  let minJ = Infinity;
  let maxJ = -Infinity;
  for (let j = 0; j < g.nz; j++) {
    const z = cellZ(g, j);
    if (z < z0 || z > z1) continue;
    for (let i = 0; i < g.nx; i++) {
      const x = cellX(g, i);
      if (x < x0 || x > x1 || !g.data[j * g.nx + i]) continue;
      if (i < minI) minI = i;
      if (i > maxI) maxI = i;
      if (j < minJ) minJ = j;
      if (j > maxJ) maxJ = j;
    }
  }
  if (minI === Infinity) return [];
  const tx0 = g.minX + minI * g.cell;
  const tx1 = g.minX + (maxI + 1) * g.cell;
  const tz0 = g.minZ + minJ * g.cell;
  const tz1 = g.minZ + (maxJ + 1) * g.cell;
  const tight: Extract<FootShape, { kind: 'box' }> = { kind: 'box', cx: (tx0 + tx1) / 2, cz: (tz0 + tz1) / 2, hx: (tx1 - tx0) / 2, hz: (tz1 - tz0) / 2 };
  let over = 0;
  for (let j = minJ; j <= maxJ; j++) for (let i = minI; i <= maxI; i++) if (!g.data[j * g.nx + i] && dist[j * g.nx + i] > over) over = dist[j * g.nx + i];
  const longer = Math.max(tight.hx, tight.hz) * 2;
  if (over <= tol || longer <= 0.4) return [tight];
  if (tight.hx >= tight.hz) {
    const mid = tight.cx;
    return [
      ...refineBox(g, dist, { kind: 'box', cx: (tx0 + mid) / 2, cz: tight.cz, hx: (mid - tx0) / 2, hz: tight.hz }, tol),
      ...refineBox(g, dist, { kind: 'box', cx: (mid + tx1) / 2, cz: tight.cz, hx: (tx1 - mid) / 2, hz: tight.hz }, tol),
    ];
  }
  const mid = tight.cz;
  return [
    ...refineBox(g, dist, { kind: 'box', cx: tight.cx, cz: (tz0 + mid) / 2, hx: tight.hx, hz: (mid - tz0) / 2 }, tol),
    ...refineBox(g, dist, { kind: 'box', cx: tight.cx, cz: (mid + tz1) / 2, hx: tight.hx, hz: (tz1 - mid) / 2 }, tol),
  ];
}

const round2 = (v: number) => Math.round(v * 100) / 100;
function tidy(s: FootShape): FootShape {
  return s.kind === 'circle'
    ? { kind: 'circle', cx: round2(s.cx), cz: round2(s.cz), r: Math.ceil(s.r * 100) / 100 }
    : { kind: 'box', cx: round2(s.cx), cz: round2(s.cz), hx: Math.ceil(s.hx * 100) / 100, hz: Math.ceil(s.hz * 100) / 100 };
}

/**
 * Chọn hình bao sát nhất cho vùng chân tường: một hình đơn (tròn hoặc hộp, có thể thu vào vài cm) nếu thừa ≤ tol; không thì các hộp xếp
 * theo dải dọc hoặc ngang (lấy cách ít hộp hơn). Làm tròn tới 1 cm (hình làm tròn lên để không hụt).
 */
export function deriveShapes(g: Grid, tol = TOLERANCE, axes: readonly ("x" | "z")[] = ["x", "z"]): FootShape[] {
  const allowSingle = axes.length === 2; // vật có lối đi (cổng) thì không dùng hình đơn bao cả hai bên
  const dist = distanceField(g);
  const circle = allowSingle ? bestSingle(boundingCircle(g), g, dist, tol) : null;
  const box = allowSingle ? bestSingle(boundingBox(g), g, dist, tol) : null;
  if (circle && box) return [tidy(measureFit([circle], g, dist).overhang <= measureFit([box], g, dist).overhang ? circle : box)];
  if (circle || box) return [tidy((circle ?? box) as FootShape)];
  const bandsZ = axes.includes('z') ? sweepBoxes(g, 'z', tol) : null;
  const bandsX = axes.includes('x') ? sweepBoxes(g, 'x', tol) : null;
  const best = bandsZ && bandsX ? (bandsX.length < bandsZ.length ? bandsX : bandsZ) : (bandsZ ?? bandsX ?? []);
  const refined = best.flatMap((b) => (b.kind === 'box' ? refineBox(g, dist, b, tol) : [b]));
  return refined.map(tidy);
}

/** Ô x có ít điểm hơn mức này coi như trống (bỏ vài điểm lạc). */
const MIN_BIN_POINTS = 3;

/** Khoảng trống rộng nhất của trục x gần giữa (lối đi của cổng): trả về tọa độ x ở giữa khoảng trống, hoặc null nếu không có. */
export function findGapX(points: readonly Pt[], within = 2.5, minWidth = 0.6, bin = 0.1): number | null {
  const bins = new Map<number, number>();
  for (const p of points) if (Math.abs(p.x) <= within) bins.set(Math.floor(p.x / bin), (bins.get(Math.floor(p.x / bin)) ?? 0) + 1);
  const lo = Math.floor(-within / bin);
  const hi = Math.floor(within / bin);
  let best: [number, number] | null = null;
  let start: number | null = null;
  for (let b = lo; b <= hi + 1; b++) {
    const empty = b <= hi && (bins.get(b) ?? 0) < MIN_BIN_POINTS;
    if (empty && start === null) start = b;
    if (!empty && start !== null) {
      // chỉ tính khoảng trống nằm giữa hai phía có điểm
      if (start > lo && (bins.get(start - 1) ?? 0) >= MIN_BIN_POINTS && b <= hi && (best === null || b - start > best[1] - best[0])) best = [start, b];
      start = null;
    }
  }
  if (!best || (best[1] - best[0]) * bin < minWidth) return null;
  return ((best[0] + best[1]) / 2) * bin;
}
