/**
 * Chọn bản nhân bản nào được vẽ ở mỗi khung hình (hàm thuần, không import three, không cấp phát): loại bỏ vật ngoài khung nhìn
 * và quá xa, rồi chia phần còn lại thành "bản chính" (gần) và "bản xa" (-xa). InstancedMesh của three chỉ cắt cả khối nên cảnh có hàng
 * chục nhà phải tự cắt từng bản, nếu không số tam giác tính theo cả chợ chứ không theo cái đang nhìn thấy.
 */

/** 6 mặt phẳng của khung nhìn, mỗi mặt 4 số (a, b, c, d) đã chuẩn hóa: a·x + b·y + c·z + d ≥ 0 là phía trong. */
export const PLANE_COUNT = 6;

/**
 * Lấy 6 mặt phẳng khung nhìn từ ma trận chiếu × nghịch đảo ma trận camera (16 số, thứ tự cột như three). Ghi vào `out` (24 số).
 */
export function extractFrustumPlanes(m: ArrayLike<number>, out: Float32Array | number[]): void {
  const rows: [number, number, number, number][] = [
    [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]], // phải
    [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]], // trái
    [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]], // dưới
    [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]], // trên
    [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]], // xa
    [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]], // gần
  ];
  for (let i = 0; i < PLANE_COUNT; i++) {
    const [a, b, c, d] = rows[i];
    const len = Math.hypot(a, b, c) || 1;
    out[i * 4] = a / len;
    out[i * 4 + 1] = b / len;
    out[i * 4 + 2] = c / len;
    out[i * 4 + 3] = d / len;
  }
}

/** Khối cầu (tâm x, y, z, bán kính r) có chạm khung nhìn không. */
export function sphereInFrustum(planes: ArrayLike<number>, x: number, y: number, z: number, r: number): boolean {
  for (let i = 0; i < PLANE_COUNT; i++) {
    const o = i * 4;
    if (planes[o] * x + planes[o + 1] * y + planes[o + 2] * z + planes[o + 3] < -r) return false;
  }
  return true;
}

export interface Selection {
  near: number;
  far: number;
}

export interface SelectParams {
  /** Vị trí camera */
  camX: number;
  camY: number;
  camZ: number;
  planes: ArrayLike<number>;
  /** Tâm các khối cầu bao: x, y, z lần lượt cho từng bản (3n số) và bán kính (n số) */
  centers: ArrayLike<number>;
  radii: ArrayLike<number>;
  count: number;
  /** Gần hơn khoảng này (tới mặt khối cầu, tính từ tâm trừ nửa bán kính) thì dùng bản chính */
  nearDistance: number;
  /** Xa hơn khoảng này thì không vẽ (Infinity: vẽ mọi vật trong khung nhìn) */
  maxDistance: number;
}

/**
 * Điền chỉ số các bản được vẽ vào `outNear` (bản chính) và `outFar` (bản xa), theo thứ tự tăng dần; ghi số lượng vào `result`.
 * Bản ngoài khung nhìn hoặc quá xa bị bỏ.
 */
export function selectInstances(p: SelectParams, outNear: Int32Array | number[], outFar: Int32Array | number[], result: Selection): Selection {
  let near = 0;
  let far = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.centers[i * 3];
    const y = p.centers[i * 3 + 1];
    const z = p.centers[i * 3 + 2];
    const r = p.radii[i];
    const dist = Math.hypot(x - p.camX, y - p.camY, z - p.camZ);
    if (dist - r > p.maxDistance) continue;
    if (!sphereInFrustum(p.planes, x, y, z, r)) continue;
    if (dist - r * 0.5 < p.nearDistance) outNear[near++] = i;
    else outFar[far++] = i;
  }
  result.near = near;
  result.far = far;
  return result;
}

/** Hai danh sách chỉ số (đã điền `n` phần tử đầu) có giống nhau không: để bỏ qua việc tải lại bộ đệm khi khung hình sau chọn y như khung trước. */
export function sameSelection(a: ArrayLike<number>, an: number, b: ArrayLike<number>, bn: number): boolean {
  if (an !== bn) return false;
  for (let i = 0; i < an; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Mức "bản chính gần": Thấp 5, Vừa 20, Cao 30 (spec 03 mục 2 đặt Thấp 12; bản chính của nhà, lều, cổng nặng 50.000 đến 67.000 tam giác nên ở chợ Thấp chỉ dùng khi đứng sát). */
export function marketNearDistance(level: 'low' | 'medium' | 'high'): number {
  return level === 'low' ? 5 : level === 'medium' ? 20 : 30;
}

/** Xa hơn khoảng này (tính tới mặt vật) thì không vẽ: Thấp 52 (sương che), còn lại vẽ hết. */
export function marketMaxDistance(level: 'low' | 'medium' | 'high'): number {
  return level === 'low' ? 52 : Infinity;
}
