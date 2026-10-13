/**
 * Chân tường thật của đồ vật ở chợ phiên (mốc 2, bước 7b): các hình tròn và hộp trong hệ tọa độ của model, ở cỡ thật trong cảnh
 * (đã áp `MODEL_SIZES`, chưa xoay, chưa nhân thêm tỉ lệ đặt). Dựng từ file model thật: lấy phần model nằm trong khoảng 0–1,5 đơn vị
 * tính từ mặt đất, dựng vùng chân tường (bao lồi cho vật đặc, vùng đã lấp lỗ cho cổng) rồi chọn hình bao sát (footprintDerive.ts), KHÔNG
 * dùng khung bao cả model (mái chìa ra rộng hơn tường). Test (footprints.test.ts) kiểm tra từng đồ vật trên file thật: phủ ≥ 90% diện
 * tích chân tường, không thừa quá 0,3 đơn vị.
 *
 * Sinh lại bảng khi đổi model hay cỡ: `GEN_FOOTPRINTS=<file.json> pnpm vitest run footprintGen` rồi chép (xem footprintGen.test.ts).
 */
import { circle, obox, type Obstacle } from '../collision';
import type { FootShape } from './footprintDerive';

export const FOOTPRINTS: Readonly<Record<string, readonly FootShape[]>> = {
  'env/cay-da': [
    { kind: 'box', cx: -5.55, cz: -0.25, hx: 0.05, hz: 0.96 },
    { kind: 'box', cx: -5.4, cz: -0.25, hx: 0.11, hz: 1.65 },
    { kind: 'box', cx: -5.2, cz: -0.35, hx: 0.11, hz: 2.15 },
    { kind: 'box', cx: -5, cz: -0.45, hx: 0.1, hz: 2.46 },
    { kind: 'box', cx: -4.8, cz: -0.6, hx: 0.11, hz: 2.8 },
    { kind: 'box', cx: -4.6, cz: -0.8, hx: 0.11, hz: 3.1 },
    { kind: 'box', cx: -4.4, cz: -0.95, hx: 0.11, hz: 3.46 },
    { kind: 'box', cx: -4.2, cz: -1.05, hx: 0.11, hz: 3.75 },
    { kind: 'box', cx: -4, cz: -1.15, hx: 0.1, hz: 4.06 },
    { kind: 'box', cx: -3.8, cz: -1.2, hx: 0.1, hz: 4.31 },
    { kind: 'box', cx: -3.55, cz: -1.2, hx: 0.16, hz: 4.61 },
    { kind: 'box', cx: -3.25, cz: -1.15, hx: 0.15, hz: 4.85 },
    { kind: 'box', cx: -2.9, cz: -1.05, hx: 0.2, hz: 5.06 },
    { kind: 'box', cx: -2.45, cz: -0.95, hx: 0.25, hz: 5.25 },
    { kind: 'box', cx: -1.85, cz: -0.8, hx: 0.36, hz: 5.4 },
    { kind: 'box', cx: -1, cz: -0.6, hx: 0.5, hz: 5.5 },
    { kind: 'box', cx: 0.05, cz: -0.4, hx: 0.56, hz: 5.6 },
    { kind: 'box', cx: 1.4, cz: -0.25, hx: 0.8, hz: 5.65 },
    { kind: 'box', cx: 2.55, cz: -0.15, hx: 0.36, hz: 5.45 },
    { kind: 'box', cx: 3.15, cz: -0.15, hx: 0.25, hz: 5.15 },
    { kind: 'box', cx: 3.7, cz: -0.05, hx: 0.3, hz: 4.96 },
    { kind: 'box', cx: 4.25, cz: 0, hx: 0.25, hz: 4.7 },
    { kind: 'box', cx: 4.7, cz: 0.05, hx: 0.21, hz: 4.46 },
    { kind: 'box', cx: 5, cz: 0, hx: 0.1, hz: 4.2 },
    { kind: 'box', cx: 5.2, cz: -0.1, hx: 0.1, hz: 4 },
    { kind: 'box', cx: 5.4, cz: -0.25, hx: 0.11, hz: 3.76 },
    { kind: 'box', cx: 5.6, cz: -0.3, hx: 0.1, hz: 3.5 },
    { kind: 'box', cx: 5.8, cz: -0.4, hx: 0.11, hz: 3.2 },
    { kind: 'box', cx: 6, cz: -0.45, hx: 0.1, hz: 2.95 },
    { kind: 'box', cx: 6.2, cz: -0.55, hx: 0.1, hz: 2.66 },
    { kind: 'box', cx: 6.4, cz: -0.65, hx: 0.11, hz: 2.26 },
    { kind: 'box', cx: 6.55, cz: -1.05, hx: 0.05, hz: 1.46 },
    { kind: 'box', cx: 6.65, cz: -1.2, hx: 0.05, hz: 0.7 },
  ],
  'env/cong-lang-giay': [
    { kind: 'box', cx: -4.2, cz: 0.3, hx: 0.11, hz: 0.4 },
    { kind: 'box', cx: -3.6, cz: 0.55, hx: 0.5, hz: 0.65 },
    { kind: 'box', cx: -2.4, cz: 0.35, hx: 0.7, hz: 0.56 },
    { kind: 'box', cx: -1.25, cz: 0, hx: 0.45, hz: 1.11 },
    { kind: 'box', cx: -0.75, cz: 0, hx: 0.06, hz: 0.8 },
    { kind: 'box', cx: 0.85, cz: 0, hx: 0.15, hz: 1 },
    { kind: 'box', cx: 1.35, cz: 0, hx: 0.36, hz: 1.11 },
    { kind: 'box', cx: 2.4, cz: 0.35, hx: 0.7, hz: 0.56 },
    { kind: 'box', cx: 3.6, cz: 0.55, hx: 0.51, hz: 0.65 },
    { kind: 'box', cx: 4.2, cz: 0.35, hx: 0.1, hz: 0.45 },
  ],
  'env/cong-lang-det': [
    { kind: 'box', cx: -2.6, cz: 0.65, hx: 0.9, hz: 0.45 },
    { kind: 'box', cx: -1.55, cz: 0.75, hx: 0.16, hz: 0.55 },
    { kind: 'box', cx: -1.2, cz: 0.15, hx: 0.2, hz: 1.15 },
    { kind: 'box', cx: -0.8, cz: -0.75, hx: 0.21, hz: 0.25 },
    { kind: 'box', cx: -0.9, cz: -0.25, hx: 0.11, hz: 0.25 },
    { kind: 'box', cx: -0.85, cz: 0.2, hx: 0.15, hz: 0.2 },
    { kind: 'box', cx: -0.8, cz: 0.65, hx: 0.21, hz: 0.25 },
    { kind: 'box', cx: 0.55, cz: -0.75, hx: 0.06, hz: 0.05 },
    { kind: 'box', cx: 0.8, cz: -0.75, hx: 0.2, hz: 0.25 },
    { kind: 'box', cx: 0.9, cz: -0.25, hx: 0.11, hz: 0.25 },
    { kind: 'box', cx: 0.85, cz: 0.2, hx: 0.15, hz: 0.2 },
    { kind: 'box', cx: 0.8, cz: 0.65, hx: 0.2, hz: 0.25 },
    { kind: 'box', cx: 1.2, cz: 0.15, hx: 0.21, hz: 1.15 },
    { kind: 'box', cx: 1.6, cz: 0.75, hx: 0.2, hz: 0.55 },
    { kind: 'box', cx: 2.35, cz: 0.6, hx: 0.56, hz: 0.5 },
    { kind: 'box', cx: 3.2, cz: 0.6, hx: 0.31, hz: 0.31 },
  ],
  'env/cong-lang-khac-dau': [
    { kind: 'box', cx: -4.15, cz: 0.55, hx: 0.36, hz: 0.45 },
    { kind: 'box', cx: -3.2, cz: 0.6, hx: 0.6, hz: 0.71 },
    { kind: 'box', cx: -2.45, cz: 0.55, hx: 0.16, hz: 0.45 },
    { kind: 'box', cx: -2.25, cz: -1.4, hx: 0.05, hz: 0.2 },
    { kind: 'box', cx: -2.25, cz: 0.65, hx: 0.05, hz: 0.46 },
    { kind: 'box', cx: -1.7, cz: 0, hx: 0.5, hz: 1.6 },
    { kind: 'box', cx: -1, cz: 0, hx: 0.21, hz: 1.31 },
    { kind: 'box', cx: 1, cz: 0, hx: 0.21, hz: 1.31 },
    { kind: 'box', cx: 1.7, cz: 0, hx: 0.5, hz: 1.6 },
    { kind: 'box', cx: 2.25, cz: -1, hx: 0.05, hz: 0.1 },
    { kind: 'box', cx: 2.25, cz: 0.65, hx: 0.05, hz: 0.46 },
    { kind: 'box', cx: 2.5, cz: 0.55, hx: 0.21, hz: 0.56 },
    { kind: 'box', cx: 3.2, cz: 0.6, hx: 0.5, hz: 0.71 },
    { kind: 'box', cx: 4.05, cz: 0.5, hx: 0.36, hz: 0.5 },
    { kind: 'box', cx: 4.45, cz: 0.25, hx: 0.05, hz: 0.06 },
  ],
  'env/cong-lang-bac': [
    { kind: 'box', cx: -3.2, cz: 0.3, hx: 1.11, hz: 0.31 },
    { kind: 'box', cx: -1.9, cz: 0.7, hx: 0.2, hz: 0.91 },
    { kind: 'box', cx: -1.45, cz: 0, hx: 0.25, hz: 1.6 },
    { kind: 'box', cx: -1.05, cz: -1.25, hx: 0.16, hz: 0.35 },
    { kind: 'box', cx: -1.05, cz: 0.6, hx: 0.16, hz: 0.41 },
    { kind: 'box', cx: 1.05, cz: -1.3, hx: 0.15, hz: 0.3 },
    { kind: 'box', cx: 1.05, cz: 0.55, hx: 0.15, hz: 0.36 },
    { kind: 'box', cx: 1.45, cz: 0.05, hx: 0.25, hz: 1.65 },
    { kind: 'box', cx: 1.9, cz: 0.7, hx: 0.21, hz: 0.91 },
    { kind: 'box', cx: 3.2, cz: 0.3, hx: 1.11, hz: 0.31 },
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
