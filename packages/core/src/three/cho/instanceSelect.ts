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
  /** Số bản dùng bản vừa (chỉ khi truyền `outMid`) */
  mid: number;
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
  /**
   * Chỉ khi có bản vừa (truyền `outMid`): bản vừa dùng cho vật từ `nearDistance` tới `midDistance` (tính như `nearDistance`); xa hơn nữa dùng bản xa.
   * Không đặt thì không có bậc vừa.
   */
  midDistance?: number;
  /** Mặt nạ: bản i có skip[i] khác 0 thì không vẽ (vùng làng chưa tải, bản xa của làng đã tải); bỏ trống thì không bỏ bản nào */
  skip?: ArrayLike<number>;
}

/**
 * Điền chỉ số các bản được vẽ vào `outNear` (bản chính) và `outFar` (bản xa), theo thứ tự tăng dần; ghi số lượng vào `result`.
 * Bản ngoài khung nhìn hoặc quá xa bị bỏ.
 */
export function selectInstances(p: SelectParams, outNear: Int32Array | number[], outFar: Int32Array | number[], result: Selection, outMid?: Int32Array | number[]): Selection {
  let near = 0;
  let far = 0;
  let mid = 0;
  const midDistance = outMid ? (p.midDistance ?? p.nearDistance) : p.nearDistance;
  for (let i = 0; i < p.count; i++) {
    if (p.skip && p.skip[i]) continue;
    const x = p.centers[i * 3];
    const y = p.centers[i * 3 + 1];
    const z = p.centers[i * 3 + 2];
    const r = p.radii[i];
    const dist = Math.hypot(x - p.camX, y - p.camY, z - p.camZ);
    if (dist - r > p.maxDistance) continue;
    if (!sphereInFrustum(p.planes, x, y, z, r)) continue;
    const d = dist - r * 0.5;
    if (d < p.nearDistance) outNear[near++] = i;
    else if (outMid && d < midDistance) outMid[mid++] = i;
    else outFar[far++] = i;
  }
  result.near = near;
  result.far = far;
  result.mid = mid;
  return result;
}

/** Hai danh sách chỉ số (đã điền `n` phần tử đầu) có giống nhau không: để bỏ qua việc tải lại bộ đệm khi khung hình sau chọn y như khung trước. */
export function sameSelection(a: ArrayLike<number>, an: number, b: ArrayLike<number>, bn: number): boolean {
  if (an !== bn) return false;
  for (let i = 0; i < an; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Bản chính của nhà, lều, bụi tre (không có bản vừa dùng được) dùng tới khoảng này; Thấp 5, Vừa và Cao do ngân sách tam giác (bước 8c). */
export const MARKET_NEAR: Readonly<Record<'low' | 'medium' | 'high', number>> = { low: 5, medium: 15, high: 25 };
/** Model có bản vừa dùng được (3 bậc): bản chính chỉ tới khoảng này ở mức Vừa và Cao (mức Thấp không có bậc vừa nên dùng `MARKET_NEAR.low`). */
export const MARKET_NEAR_3_TIER: Readonly<Record<string, { medium: number; high: number }>> = {
  'env/cong-lang-': { medium: 12, high: 28 },
  'env/gieng-lang': { medium: 6, high: 14 },
  'env/phen-phoi-giay': { medium: 6, high: 14 },
};
/**
 * Model 2 bậc rất nặng: bản chính chỉ dùng khi thật gần (khung cửi 134.000 tam giác), còn lại dùng bản xa. Thấp vẫn `MARKET_NEAR.low`.
 */
export const MARKET_NEAR_HEAVY: Readonly<Record<string, { medium: number; high: number }>> = {
  'env/khung-cui': { medium: 7, high: 10 },
};

/**
 * Mức Thấp: bản chính nặng (từ 40.000 tam giác: lều 67.000, nhà 50.000, cổng 50.000, bụi tre 41.700, khung cửi 134.000) chỉ dùng khi thật sát, vì một bản chính ở sát đã ăn 13% đến 45% ngân sách
 * 300.000 tam giác của mức Thấp (thế giới mở giữ dưới 300.000 ở mọi chỗ đứng). Xa hơn dùng bản xa (8.000 tam giác).
 */
export const MARKET_NEAR_LOW_HEAVY: Readonly<Record<string, number>> = {
  'env/leu-cho': -1, // −1: không bao giờ dùng bản chính (camera ở trong lều cũng vẫn là bản xa)
  'env/nha-mai-ngoi': 1.5,
  'env/nha-mai-tranh': 1.5,
  'env/bui-tre': 1.5,
  'env/cong-lang-': 2.5,
  'env/khung-cui': -1,
  'env/phen-phoi-giay': -1, // phên: bản chính 30.000 tam giác cho một tấm phẳng, ở mức Thấp luôn dùng bản xa
};

/**
 * Mức "bản chính gần" ở chợ (spec 03 mục 2 đặt Thấp 12, Vừa 20, Cao 30 cho model chung; bản chính của nhà, lều, cổng nặng 50.000 đến 67.000 tam giác nên ở chợ đặt theo ngân sách
 * tam giác, kể cả lượt vẽ bóng). Model 3 bậc (cổng làng, giếng) có khoảng riêng (`MARKET_NEAR_3_TIER`); còn lại `MARKET_NEAR`.
 */
export function marketNearDistance(level: 'low' | 'medium' | 'high', modelId?: string): number {
  if (level === 'low' && modelId) {
    for (const [prefix, d] of Object.entries(MARKET_NEAR_LOW_HEAVY)) if (modelId.startsWith(prefix)) return d;
  }
  if (level !== 'low' && modelId) {
    for (const [prefix, d] of Object.entries(MARKET_NEAR_3_TIER)) if (modelId.startsWith(prefix)) return d[level];
    const heavy = MARKET_NEAR_HEAVY[modelId];
    if (heavy) return heavy[level];
  }
  return MARKET_NEAR[level];
}

/**
 * Khoảng đổi sang bản xa khi model có bản vừa (spec 03 mục 2): từ `marketFarDistance` trở đi mới dùng bản xa (Vừa 30, Cao 40; Thấp không có bậc vừa nên bản xa từ
 * `marketNearDistance`). Model không có bản vừa dùng được thì không có bậc này.
 */
export function marketFarDistance(level: 'low' | 'medium' | 'high', modelId?: string): number {
  if (level === 'low') return marketNearDistance(level, modelId);
  const o = modelId ? MARKET_FAR_OVERRIDE[modelId] : undefined;
  if (o) return o[level];
  return level === 'medium' ? 30 : 40;
}

/**
 * Phên phơi giấy (bước W2): làng có 14 phên đứng dày, bản vừa của phên nặng 15.000 tam giác và bản xa 8.000 cho một tấm phẳng nhỏ, nên bản vừa chỉ dùng thật gần (Vừa 14, Cao 22), xa hơn dùng bản xa. Giữ
 * làng dưới 1.000.000 tam giác ở mức Vừa và 1.500.000 ở mức Cao.
 */
export const MARKET_FAR_OVERRIDE: Readonly<Record<string, { medium: number; high: number }>> = {
  'env/phen-phoi-giay': { medium: 14, high: 22 },
};

/** Phên phơi giấy chỉ vẽ tới khoảng này (tấm phẳng nhỏ, ở xa không cần thấy từng phên): Thấp 40, Vừa 70, Cao 90. */
export const RACK_MAX_DISTANCE: Readonly<Record<'low' | 'medium' | 'high', number>> = { low: 40, medium: 70, high: 90 };

/** Bụi tre (7.900 tam giác bản xa, nhiều nhất cảnh) ở thế giới mở chỉ vẽ tới khoảng này ở mức Vừa và Cao (sương đã nhạt, làng và chợ nhìn từ xa không cần thấy từng bụi tre). */
export const BAMBOO_MAX_DISTANCE: Readonly<Record<'medium' | 'high', number>> = { medium: 90, high: 120 };

/**
 * Xa hơn khoảng này (tính tới mặt vật) thì không vẽ: Thấp `LOW_MAX_DISTANCE` (sương che), còn lại vẽ hết; riêng bụi tre (`env/bui-tre`, truyền `modelId`) ở mức Vừa và Cao có tầm
 * `BAMBOO_MAX_DISTANCE`.
 */
/** Mức Thấp không vẽ vật xa hơn khoảng này (tính tới mặt vật): 38 (bước W3, trước đó 52) để giữ dưới 270.000 tam giác; vật ở gần người chơi (có va chạm) không bị ảnh hưởng. */
export const LOW_MAX_DISTANCE = 38;

export function marketMaxDistance(level: 'low' | 'medium' | 'high', modelId?: string): number {
  if (modelId === 'env/phen-phoi-giay') return RACK_MAX_DISTANCE[level];
  if (level === 'low') return LOW_MAX_DISTANCE;
  return modelId === 'env/bui-tre' ? BAMBOO_MAX_DISTANCE[level] : Infinity;
}

export interface ShadowSelectParams {
  /** Điểm người chơi (tâm vùng bóng, mặt phẳng ngang) */
  focusX: number;
  focusZ: number;
  /** Chỉ vật cách tâm không quá khoảng này (tính tới mặt vật) mới đổ bóng */
  range: number;
  /** Mặt phẳng khung nhìn của camera và khoảng nở thêm: vật ngoài khung nhìn vẫn đổ bóng vào khung nhìn nếu ở sát (bóng dài tới `throwDistance`) */
  planes: ArrayLike<number>;
  throwDistance: number;
  centers: ArrayLike<number>;
  radii: ArrayLike<number>;
  count: number;
}

/**
 * Điền chỉ số các bản đổ bóng vào `out` (tăng dần) và trả về số lượng: bản nằm trong `range` quanh người chơi VÀ (đã nở thêm `throwDistance`) còn chạm khung
 * nhìn của camera, vì bóng của vật ngoài khung nhìn mà ở sát vẫn rơi vào khung nhìn. Vật xa người chơi hơn `range` không đổ bóng (chỗ đó nằm ngoài máy ảnh bóng).
 */
export function selectShadowCasters(p: ShadowSelectParams, out: Int32Array | number[]): number {
  let n = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.centers[i * 3];
    const y = p.centers[i * 3 + 1];
    const z = p.centers[i * 3 + 2];
    const r = p.radii[i];
    if (Math.hypot(x - p.focusX, z - p.focusZ) - r > p.range) continue;
    if (!sphereInFrustum(p.planes, x, y, z, r + p.throwDistance)) continue;
    out[n++] = i;
  }
  return n;
}
