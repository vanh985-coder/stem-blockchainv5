/**
 * Chân tường thật của đồ vật ở chợ phiên (mốc 2, bước 7b): các hình tròn và hộp trong hệ tọa độ của model, ở cỡ thật trong cảnh
 * (đã áp `MODEL_SIZES`, chưa xoay, chưa nhân thêm tỉ lệ đặt). Dựng từ file model thật: lấy phần model nằm trong khoảng 0–1,5 đơn vị
 * tính từ mặt đất, dựng vùng chân tường (bao lồi cho vật đặc, vùng đã lấp lỗ cho cổng) rồi chọn hình bao sát (footprintDerive.ts), KHÔNG
 * dùng khung bao cả model (mái chìa ra rộng hơn tường). Test (footprints.test.ts) kiểm tra từng đồ vật trên file thật: phủ ≥ 90% diện
 * tích chân tường, không thừa quá 0,3 đơn vị.
 *
 * Sinh lại bảng khi đổi model hay cỡ: `GEN_FOOTPRINTS=<file.json> pnpm vitest run footprintGen` rồi chép (xem footprintGen.test.ts).
 */
import type { CameraBlocker } from '../cameraCollision';
import { circle, obox, type Obstacle } from '../collision';
import type { FootShape } from './footprintDerive';

/**
 * Bảng sinh từ file model thật (công cụ footprintGen.test.ts), TRỪ cây đa (xem `TREE_TRUNK`). Cổng làng ở đây là chân tường thô (hai chân
 * cổng, tường, trụ), chưa nới lối đi: `FOOTPRINTS` nới lối giữa ra (`openGate`).
 */
export const GENERATED: Readonly<Record<string, readonly FootShape[]>> = {
  'env/cong-lang-giay': [
    { kind: 'box', cx: -5.1, cz: 0.25, hx: 0.11, hz: 0.35 },
    { kind: 'box', cx: -4.45, cz: 0.65, hx: 0.55, hz: 0.75 },
    { kind: 'box', cx: -3.3, cz: 0.3, hx: 0.61, hz: 0.5 },
    { kind: 'box', cx: -2.35, cz: 0.3, hx: 0.36, hz: 0.4 },
    { kind: 'box', cx: -1.5, cz: 0, hx: 0.5, hz: 1.3 },
    { kind: 'box', cx: -0.95, cz: 0, hx: 0.05, hz: 1 },
    { kind: 'box', cx: 1.05, cz: 0, hx: 0.15, hz: 1.21 },
    { kind: 'box', cx: 1.6, cz: 0, hx: 0.4, hz: 1.3 },
    { kind: 'box', cx: 2.9, cz: 0.25, hx: 0.91, hz: 0.45 },
    { kind: 'box', cx: 3.85, cz: 0.35, hx: 0.05, hz: 0.45 },
    { kind: 'box', cx: 4.45, cz: 0.65, hx: 0.55, hz: 0.75 },
    { kind: 'box', cx: 5.1, cz: 0.25, hx: 0.11, hz: 0.35 },
  ],
  'env/cong-lang-det': [
    { kind: 'box', cx: -3.75, cz: 0.7, hx: 0.45, hz: 0.4 },
    { kind: 'box', cx: -2.75, cz: 0.75, hx: 0.56, hz: 0.56 },
    { kind: 'box', cx: -1.95, cz: 0.95, hx: 0.25, hz: 0.56 },
    { kind: 'box', cx: -1.5, cz: 0.15, hx: 0.21, hz: 1.35 },
    { kind: 'box', cx: -1.05, cz: -0.9, hx: 0.25, hz: 0.3 },
    { kind: 'box', cx: -1.25, cz: -0.3, hx: 0.05, hz: 0.31 },
    { kind: 'box', cx: -1.15, cz: 0.2, hx: 0.15, hz: 0.31 },
    { kind: 'box', cx: -1.05, cz: 0.8, hx: 0.25, hz: 0.3 },
    { kind: 'box', cx: 1.05, cz: -0.9, hx: 0.25, hz: 0.3 },
    { kind: 'box', cx: 1.25, cz: -0.3, hx: 0.05, hz: 0.31 },
    { kind: 'box', cx: 1.15, cz: 0.2, hx: 0.15, hz: 0.31 },
    { kind: 'box', cx: 1.05, cz: 0.8, hx: 0.25, hz: 0.3 },
    { kind: 'box', cx: 1.5, cz: 0.15, hx: 0.21, hz: 1.35 },
    { kind: 'box', cx: 1.95, cz: 0.95, hx: 0.25, hz: 0.56 },
    { kind: 'box', cx: 2.85, cz: 0.75, hx: 0.65, hz: 0.56 },
    { kind: 'box', cx: 3.85, cz: 0.75, hx: 0.36, hz: 0.35 },
  ],
  'env/cong-lang-khac-dau': [
    { kind: 'box', cx: -4.9, cz: 0.6, hx: 0.4, hz: 0.6 },
    { kind: 'box', cx: -3.9, cz: 0.7, hx: 0.61, hz: 0.81 },
    { kind: 'box', cx: -3, cz: 0.6, hx: 0.31, hz: 0.6 },
    { kind: 'box', cx: -2.15, cz: -1.4, hx: 0.56, hz: 0.5 },
    { kind: 'box', cx: -2.1, cz: -0.45, hx: 0.5, hz: 0.45 },
    { kind: 'box', cx: -2.15, cz: 0.95, hx: 0.56, hz: 0.95 },
    { kind: 'box', cx: -1.35, cz: -0.05, hx: 0.25, hz: 1.65 },
    { kind: 'box', cx: -1.05, cz: 0.05, hx: 0.05, hz: 1.46 },
    { kind: 'box', cx: 1.3, cz: 0, hx: 0.3, hz: 1.6 },
    { kind: 'box', cx: 2.15, cz: -1.4, hx: 0.56, hz: 0.5 },
    { kind: 'box', cx: 2.1, cz: -0.45, hx: 0.5, hz: 0.45 },
    { kind: 'box', cx: 2.15, cz: 0.95, hx: 0.56, hz: 0.95 },
    { kind: 'box', cx: 3, cz: 0.6, hx: 0.3, hz: 0.6 },
    { kind: 'box', cx: 3.9, cz: 0.7, hx: 0.6, hz: 0.81 },
    { kind: 'box', cx: 4.9, cz: 0.6, hx: 0.41, hz: 0.6 },
  ],
  'env/cong-lang-bac': [
    { kind: 'box', cx: -3.8, cz: 0.35, hx: 1.3, hz: 0.36 },
    { kind: 'box', cx: -2.3, cz: 0.9, hx: 0.2, hz: 1 },
    { kind: 'box', cx: -2, cz: 0.05, hx: 0.11, hz: 1.96 },
    { kind: 'box', cx: -1.7, cz: 0.05, hx: 0.21, hz: 1.96 },
    { kind: 'box', cx: -1.4, cz: -0.25, hx: 0.1, hz: 1.65 },
    { kind: 'box', cx: -1.2, cz: -1.6, hx: 0.11, hz: 0.3 },
    { kind: 'box', cx: -1.2, cz: 0.65, hx: 0.11, hz: 0.36 },
    { kind: 'box', cx: 1.25, cz: -1.6, hx: 0.15, hz: 0.3 },
    { kind: 'box', cx: 1.25, cz: 0.7, hx: 0.15, hz: 0.4 },
    { kind: 'box', cx: 1.5, cz: -0.05, hx: 0.11, hz: 1.85 },
    { kind: 'box', cx: 1.8, cz: 0.05, hx: 0.21, hz: 1.96 },
    { kind: 'box', cx: 2.2, cz: 0.9, hx: 0.21, hz: 1.11 },
    { kind: 'box', cx: 2.45, cz: 0.85, hx: 0.05, hz: 0.86 },
    { kind: 'box', cx: 3.8, cz: 0.35, hx: 1.3, hz: 0.36 },
  ],
  'env/nha-mai-ngoi': [
    { kind: 'box', cx: -2.5, cz: 0.1, hx: 0.1, hz: 1 },
    { kind: 'box', cx: -2.3, cz: 0.05, hx: 0.11, hz: 1.56 },
    { kind: 'box', cx: -2.1, cz: 0, hx: 0.11, hz: 2.1 },
    { kind: 'box', cx: 0.1, cz: 0, hx: 2.1, hz: 2.21 },
  ],
  'env/nha-mai-tranh': [
    { kind: 'box', cx: 0, cz: -0.1, hx: 2.41, hz: 2.41 },
  ],
  'env/leu-cho': [
    { kind: 'box', cx: 0, cz: 0.05, hx: 1.4, hz: 1.16 },
    { kind: 'box', cx: 1.5, cz: 0.1, hx: 0.11, hz: 0.9 },
    { kind: 'box', cx: 1.65, cz: 0.15, hx: 0.05, hz: 0.66 },
    { kind: 'box', cx: 1.75, cz: 0, hx: 0.05, hz: 0.31 },
  ],
  'env/gieng-lang': [
    { kind: 'circle', cx: 0, cz: 0, r: 1.23 },
  ],
  'env/bui-tre': [
    { kind: 'box', cx: -2.6, cz: -0.85, hx: 0.11, hz: 0.56 },
    { kind: 'box', cx: -2.4, cz: -0.7, hx: 0.11, hz: 0.91 },
    { kind: 'box', cx: -2.2, cz: -0.6, hx: 0.1, hz: 1.2 },
    { kind: 'box', cx: -2, cz: -0.5, hx: 0.1, hz: 1.5 },
    { kind: 'box', cx: -1.75, cz: -0.5, hx: 0.16, hz: 1.8 },
    { kind: 'box', cx: -1.4, cz: -0.45, hx: 0.2, hz: 2.06 },
    { kind: 'box', cx: -1.05, cz: -0.35, hx: 0.16, hz: 2.25 },
    { kind: 'box', cx: -0.6, cz: -0.25, hx: 0.31, hz: 2.46 },
    { kind: 'box', cx: 0.5, cz: -0.1, hx: 0.8, hz: 2.5 },
    { kind: 'box', cx: 1.45, cz: -0.05, hx: 0.16, hz: 2.25 },
    { kind: 'box', cx: 1.75, cz: 0.05, hx: 0.15, hz: 2.06 },
    { kind: 'box', cx: 2, cz: 0.1, hx: 0.11, hz: 1.81 },
    { kind: 'box', cx: 2.2, cz: 0.2, hx: 0.1, hz: 1.6 },
    { kind: 'box', cx: 2.4, cz: 0.2, hx: 0.11, hz: 1.3 },
    { kind: 'box', cx: 2.6, cz: 0.25, hx: 0.11, hz: 1.05 },
    { kind: 'box', cx: 2.75, cz: 0.5, hx: 0.05, hz: 0.41 },
  ],
};

/**
 * Cây đa: chỉ gốc chính là vật cản (hình tròn bán kính 2,5 quanh gốc), rễ phụ và rễ nổi đi xuyên được (bước 8). Tâm và bán kính đo từ file
 * model (tâm phần thân cao 2–3,5 đơn vị là (0,27, −0,18); 50% điểm bề mặt thân nằm trong 1,94, 90% trong 2,55).
 */
export const TREE_TRUNK: FootShape = { kind: 'circle', cx: 0.27, cz: -0.18, r: 2.5 };

/** Lối đi giữa cổng làng rộng tối thiểu bấy nhiêu (khoảng hở giữa hai vật cản, trong cảnh, ở cổng cao 6) — bước 8. */
export const GATE_OPENING = 2.4;

const isGate = (id: string) => id.startsWith('env/cong-lang-');

/**
 * Nới lối đi giữa của một cổng: mọi hộp lấn vào dải giữa |x| < GATE_OPENING / 2 bị cắt mép trong ra tới đúng mép dải (hộp nằm trọn trong
 * dải thì bỏ). Chấp nhận nhân vật chạm nhẹ vào mép cột (vật cản hẹp hơn chân cột thật một chút).
 */
export function openGate(shapes: readonly FootShape[], opening: number = GATE_OPENING): FootShape[] {
  const h = opening / 2;
  const out: FootShape[] = [];
  for (const s of shapes) {
    if (s.kind !== 'box') {
      out.push(s);
      continue;
    }
    const lo = s.cx - s.hx;
    const hi = s.cx + s.hx;
    if (hi <= -h || lo >= h) {
      out.push(s); // ngoài dải giữa
      continue;
    }
    // phần bên trái dải (x ≤ −h) và bên phải (x ≥ h) còn lại
    if (lo < -h) out.push({ ...s, cx: (lo + -h) / 2, hx: (-h - lo) / 2 });
    if (hi > h) out.push({ ...s, cx: (h + hi) / 2, hx: (hi - h) / 2 });
  }
  return out;
}

export const FOOTPRINTS: Readonly<Record<string, readonly FootShape[]>> = {
  ...Object.fromEntries(Object.entries(GENERATED).map(([id, shapes]) => [id, isGate(id) ? openGate(shapes) : shapes])),
  'env/cay-da': [TREE_TRUNK],
};

/**
 * Xà ngang (phần mái và dầm phía trên lối đi) của từng cổng, đo từ file model ở cổng cao 6: `bottom` là chỗ thấp nhất mặt dưới xà (vòm), `cz` và `hz`
 * là tâm và nửa bề dày của xà theo trục z của model, `top` là đỉnh cổng. Camera đi dưới xà thì được, không được xuyên qua xà.
 */
export const GATE_LINTELS: Readonly<Record<string, { bottom: number; cz: number; hz: number; top: number }>> = {
  'env/cong-lang-giay': { bottom: 2.3, cz: 0, hz: 1.1, top: 6 },
  'env/cong-lang-det': { bottom: 1.9, cz: -0.18, hz: 1.3, top: 6 },
  'env/cong-lang-khac-dau': { bottom: 2.05, cz: 0, hz: 1.6, top: 6 },
  'env/cong-lang-bac': { bottom: 2.2, cz: -0.48, hz: 1.45, top: 6 },
};

/** Camera cách xà ít nhất bấy nhiêu theo chiều đứng (dưới đáy xà). */
const LINTEL_BASE_PAD = 0.15;
/** Camera đã tự nở thêm `CAMERA_MARGIN` mỗi phía: thu hộp xà vào bấy nhiêu để vùng chắn thật gọn (không kéo camera về lúc người chơi vừa tới cổng). */
const LINTEL_SHRINK = 0.4;

/**
 * Vật chắn camera của xà ngang cổng đặt ở (x, z) xoay `yaw`, nhân tỉ lệ `scale`: hộp xoay nằm vắt qua lối đi (rộng bằng lối đi), cao từ đáy xà tới
 * đỉnh cổng. Chỉ để chắn camera, không chắn người đi (người đi được dưới xà). Cổng không có xà trong bảng thì null.
 */
export function gateLintel(id: string, x: number, z: number, yaw: number, scale = 1): CameraBlocker | null {
  const l = GATE_LINTELS[id.endsWith('-xa') ? id.slice(0, -3) : id];
  if (!l) return null;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const lz = l.cz * scale;
  const hx = Math.max(0.2, (GATE_OPENING / 2 - 0.5) * scale);
  const hz = Math.max(0.2, (l.hz - LINTEL_SHRINK) * scale);
  return { shape: obox(x + lz * sin, z + lz * cos, hx, hz, yaw), height: l.top * scale, base: l.bottom * scale - LINTEL_BASE_PAD };
}

/** Độ cao thanh then trên và dưới của cổng đóng (hai thanh gỗ ngang chắn lối đi), và bề dày vật cản chắn lối. */
export const GATE_BAR_HEIGHTS: readonly [number, number] = [1.0, 1.75];
const GATE_BARRIER_HALF_THICKNESS = 0.2;

/**
 * Vật cản chắn lối đi của một cổng đang đóng (thanh then gỗ và dây đỏ): hộp xoay mỏng nằm vắt qua lối đi, hơi gối lên hai chân cổng, đặt ở giữa bề dày của xà
 * ngang. Cổng đã mở thì không có vật cản này. Cổng không có trong bảng thì null.
 */
export function gateBarrierObstacle(id: string, x: number, z: number, yaw: number, scale = 1): Obstacle | null {
  const l = GATE_LINTELS[id.endsWith('-xa') ? id.slice(0, -3) : id];
  if (!l) return null;
  const lz = l.cz * scale;
  return obox(x + lz * Math.sin(yaw), z + lz * Math.cos(yaw), (GATE_OPENING / 2 + 0.05) * scale, GATE_BARRIER_HALF_THICKNESS * scale, yaw);
}

/** Chân tường của một model (bản xa dùng của bản chính); rỗng nếu chưa có trong bảng. */
export function footprintOf(id: string): readonly FootShape[] {
  return FOOTPRINTS[id.endsWith('-xa') ? id.slice(0, -3) : id] ?? [];
}

/**
 * Vật cản thật của một đồ vật đặt ở (x, z), xoay `yaw` (như rotation.y của three), nhân tỉ lệ `scale`: mỗi hình của chân tường đổi ra hình
 * tròn hoặc hộp xoay trong cảnh. Chân tường tròn thì giữ tròn (tâm dịch theo xoay và tỉ lệ).
 */
export function footprintObstacles(id: string, x: number, z: number, yaw: number, scale = 1): Obstacle[] {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return footprintOf(id).map((s) => {
    // tâm hình trong hệ model (nhân tỉ lệ) → cảnh: x' = x cos + z sin, z' = −x sin + z cos
    const lx = s.cx * scale;
    const lz = s.cz * scale;
    const wx = x + lx * cos + lz * sin;
    const wz = z - lx * sin + lz * cos;
    return s.kind === 'circle' ? circle(wx, wz, s.r * scale) : obox(wx, wz, s.hx * scale, s.hz * scale, yaw);
  });
}

/** Bán kính nhỏ nhất của hình tròn tâm ở gốc đặt của đồ vật mà bao hết chân tường (để giữ khoảng cách khi xếp đồ vật), cỡ thật. */
export function footprintRadiusOf(id: string): number {
  let r = 0;
  for (const s of footprintOf(id)) {
    if (s.kind === 'circle') r = Math.max(r, Math.hypot(s.cx, s.cz) + s.r);
    else for (const sx of [-1, 1]) for (const sz of [-1, 1]) r = Math.max(r, Math.hypot(s.cx + sx * s.hx, s.cz + sz * s.hz));
  }
  return r;
}
