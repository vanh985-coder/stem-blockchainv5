/**
 * Chiếu tọa độ thế giới sang bản đồ nhỏ (mốc 2, bước X4). Hàm thuần, không import three hay React.
 *
 * Thế giới: Bắc = +Z, Tây = +X, Đông = −X. Bản đồ nhìn từ trên xuống với hướng bắc ở trên, nên một điểm cách tâm `(dx, dz)` nằm ở `(−dx, −dz)` trên màn hình (y hướng xuống): bắc ở trên, đông ở bên phải, tây ở bên trái.
 * Chế độ "xoay theo hướng nhìn" xoay cả bản đồ theo chiều kim đồng hồ đúng bằng `yaw` của camera để hướng em đang nhìn nằm ở phía trên màn hình.
 */

/** Bán kính thế giới (đơn vị) từ tâm bản đồ tới mép khi em ở ngoài làng: ở chợ thấy cả 4 lối ra (cổng cách tâm chợ 72). */
export const MAP_RADIUS_OUTSIDE = 88;
/** Như trên khi em ở trong làng: thấy khoảng bán kính 60 quanh em. */
export const MAP_RADIUS_VILLAGE = 60;

/** Cỡ bản đồ nhỏ (pixel): máy tính, điện thoại; "Chữ to" nhân thêm `LARGE_TEXT_FACTOR`. */
export const MAP_SIZE_DESKTOP = 180;
export const MAP_SIZE_TOUCH = 120;
export const LARGE_TEXT_FACTOR = 1.15;

export function miniMapSize(touch: boolean, largeText: boolean): number {
  const base = touch ? MAP_SIZE_TOUCH : MAP_SIZE_DESKTOP;
  return Math.round(largeText ? base * LARGE_TEXT_FACTOR : base);
}

export function viewRadiusFor(insideVillage: boolean): number {
  return insideVillage ? MAP_RADIUS_VILLAGE : MAP_RADIUS_OUTSIDE;
}

export interface MapView {
  /** Điểm thế giới ở chính giữa bản đồ (vị trí người chơi) */
  cx: number;
  cz: number;
  /** Số đơn vị thế giới từ tâm tới mép bản đồ */
  radius: number;
  /** Cạnh khung bản đồ (pixel) */
  size: number;
  /** Góc xoay bản đồ theo chiều kim đồng hồ (radian); 0 là hướng bắc ở trên */
  rotation: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Số pixel cho mỗi đơn vị thế giới. */
export function mapScale(v: Pick<MapView, 'size' | 'radius'>): number {
  return v.size / 2 / v.radius;
}

/** Góc xoay của bản đồ: theo `yaw` của camera khi bật xoay, không thì 0 (hướng bắc luôn ở trên). */
export function rotationFor(rotate: boolean, yaw: number): number {
  return rotate ? yaw : 0;
}

/**
 * Điểm thế giới `(x, z)` → vị trí (pixel) trong khung bản đồ, gốc ở góc trên trái khung. Ghi kết quả vào `out` (không cấp phát; dùng trong vòng cập nhật 10 lần mỗi giây).
 */
export function project(v: MapView, x: number, z: number, out: Point): Point {
  const k = mapScale(v);
  const sx = -(x - v.cx) * k;
  const sy = -(z - v.cz) * k;
  const c = Math.cos(v.rotation);
  const s = Math.sin(v.rotation);
  const half = v.size / 2;
  out.x = half + sx * c - sy * s;
  out.y = half + sx * s + sy * c;
  return out;
}

/** Giá trị thuộc tính `transform` của nhóm SVG chứa phần tĩnh (vẽ bằng tọa độ thế giới): đưa điểm thế giới tới đúng chỗ `project` trả về. */
export function staticTransform(v: MapView): string {
  const half = v.size / 2;
  const k = mapScale(v);
  const deg = (v.rotation * 180) / Math.PI;
  return `translate(${round(half)} ${round(half)}) rotate(${round(deg)}) scale(${-round(k, 5)} ${-round(k, 5)}) translate(${round(-v.cx)} ${round(-v.cz)})`;
}

function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Góc (độ, theo chiều kim đồng hồ) của mũi tên chỉ hướng em đang nhìn. Bản đồ cố định hướng bắc: mũi tên xoay theo `yaw` (nhìn bắc thì lên, nhìn tây thì sang trái);
 * bản đồ xoay theo hướng nhìn: mũi tên luôn chỉ lên.
 */
export function arrowAngleDeg(rotate: boolean, yaw: number): number {
  return rotate ? 0 : (-yaw * 180) / Math.PI;
}

/** Vị trí chữ B (hướng bắc) trên vòng quanh bản đồ: cách tâm `ringRadius` pixel theo hướng bắc đã tính xoay. */
export function northPoint(v: Pick<MapView, 'size' | 'rotation'>, ringRadius: number, out: Point): Point {
  const half = v.size / 2;
  out.x = half + Math.sin(v.rotation) * ringRadius;
  out.y = half - Math.cos(v.rotation) * ringRadius;
  return out;
}

export interface Pinned {
  x: number;
  y: number;
  /** Điểm gốc nằm ngoài vòng nên đã bị kéo về mép */
  clamped: boolean;
  /** Hướng từ tâm tới điểm gốc (độ, theo chiều kim đồng hồ, 0 là lên trên) */
  angle: number;
}

/**
 * Điểm ngoài vòng tròn bản đồ thì kéo về mép (cách tâm `size / 2 − margin`) giữ nguyên hướng, để điểm đến của nhiệm vụ luôn thấy được dù ở xa. Ghi vào `out`.
 */
export function pinToCircle(p: Point, size: number, margin: number, out: Pinned): Pinned {
  const half = size / 2;
  const dx = p.x - half;
  const dy = p.y - half;
  const d = Math.hypot(dx, dy);
  const limit = half - margin;
  out.angle = d === 0 ? 0 : (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (d <= limit) {
    out.x = p.x;
    out.y = p.y;
    out.clamped = false;
  } else {
    out.x = half + (dx / d) * limit;
    out.y = half + (dy / d) * limit;
    out.clamped = true;
  }
  return out;
}
