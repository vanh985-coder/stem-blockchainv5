/**
 * Bố cục cảnh màn 9 (hàm thuần, không import three; như `whackLayout.ts` của màn 5). Đơn vị thế giới của Scene25D: khung ngang 16 × 9, gốc ở tâm, y hướng lên. Khung luôn là 16:9 dù cửa sổ tỉ lệ nào
 * (dải đen hai bên hoặc trên dưới), nên chỉ phần giao diện HTML (cỡ cố định theo điểm ảnh CSS: HUD, bảng thuốc, thẻ số trên gà) đổi theo cỡ khung.
 *
 * Luật bố cục: ná cao su, học sinh, bảng thuốc và HUD KHÔNG che nửa dưới của ba làn (đoạn gà cần bắn, kể cả thân gà và thẻ số trên đầu). Ná ở giữa đáy khung, học sinh đứng bên phải ná, bảng thuốc ở góc dưới
 * bên trái, HUD ở góc trên bên trái; nút "?" của khung chơi chiếm góc trên bên phải.
 */
import { CHICKEN_SPEC } from './chickenConfig';
import { COOP_POINT, imageToWorld, lanePose, type LanePose, type WorldXY } from './man09Lanes';

/** Hộp bao theo trục (thế giới, y hướng lên: `y0` < `y1`) */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Hai hộp có giao nhau không (`gap` > 0 đòi thêm khoảng hở giữa hai hộp) */
export const boxesOverlap = (a: Box, b: Box, gap = 0): boolean => a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap;

/** Các bố cục cần kiểm: cỡ cửa sổ (điểm ảnh) */
export const CHECK_VIEWPORTS: readonly { width: number; height: number }[] = [
  { width: 640, height: 360 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
];

/** Bề rộng (điểm ảnh) của khung 16:9 nằm gọn trong cửa sổ `width` × `height` */
export const framePxWidth = (width: number, height: number): number => Math.min(width, (height * 16) / 9);

// ---------------------------------------------------------------------------
// Hình rời: kích thước và chỗ đứng

/** Một hình rời trong khung ảnh: tỉ lệ khung ảnh và phần có hình thật (u, v tính từ góc trên trái của ảnh, đo ở alpha > 100 trên bản đã tách nền trong `assets-build`) */
export interface SpriteArt {
  aspect: number;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/** Gà bệnh, gà khỏe và gà trùm: khung 1024 × 572, mặt quay sang PHẢI (trong cảnh lật lại cho quay sang trái, hướng chạy chếch xuống bên trái). */
export const CHICKEN_ART: SpriteArt = { aspect: 1024 / 572, u0: 0.324, u1: 0.649, v0: 0.114, v1: 0.888 };
export const BOSS_ART: SpriteArt = { aspect: 1024 / 572, u0: 0.314, u1: 0.661, v0: 0.063, v1: 0.934 };
/** Ná cao su: khung 1024 × 559, thẳng đứng, đầu chạc ở trên, cán ở dưới */
export const SLING_ART: SpriteArt = { aspect: 1024 / 559, u0: 0.366, u1: 0.633, v0: 0.107, v1: 0.9 };

export interface SpriteDims {
  /** Kích thước cả khung ảnh (đơn vị thế giới) */
  quadW: number;
  quadH: number;
  /** Kích thước phần có hình */
  contentW: number;
  contentH: number;
  /** Tâm khung ảnh cao hơn chân (đáy phần có hình) chừng này */
  centerUp: number;
  /** Tâm phần có hình lệch khỏi tâm khung ảnh theo x (hình chưa lật) */
  centerDx: number;
}

/** Kích thước khung ảnh của hình `art` khi phần có hình cao `contentHeight` đơn vị thế giới. */
export function spriteDims(art: SpriteArt, contentHeight: number): SpriteDims {
  const quadH = contentHeight / (art.v1 - art.v0);
  const quadW = quadH * art.aspect;
  return {
    quadW,
    quadH,
    contentW: quadW * (art.u1 - art.u0),
    contentH: contentHeight,
    centerUp: (art.v1 - 0.5) * quadH,
    centerDx: ((art.u0 + art.u1) / 2 - 0.5) * quadW,
  };
}

/** Gà cao chừng này (phần có hình) ở cỡ đầy đủ (cuối làn, hệ số cỡ 1); gà trùm to hơn. */
export const CHICKEN_HEIGHT = 2.3;
export const BOSS_HEIGHT = 3.3;
export const CHICKEN_DIMS = spriteDims(CHICKEN_ART, CHICKEN_HEIGHT);
export const BOSS_DIMS = spriteDims(BOSS_ART, BOSS_HEIGHT);

export interface ChickenPose {
  /** Hoành độ giữa thân và độ cao của chân */
  x: number;
  y: number;
  /** Hệ số cỡ theo phối cảnh */
  scale: number;
  /** Chiều cao và bề rộng phần có hình trên màn */
  height: number;
  width: number;
}

const LANE_TMP: LanePose = { x: 0, y: 0, scale: 1 };

/** Chỗ đứng của gà thường ở làn `lane`, vị trí `pos` của logic. Ghi vào `out`. */
export function chickenPose(lane: number, pos: number, out: ChickenPose): ChickenPose {
  lanePose(lane, pos, LANE_TMP);
  out.x = LANE_TMP.x;
  out.y = LANE_TMP.y;
  out.scale = LANE_TMP.scale;
  out.height = CHICKEN_DIMS.contentH * LANE_TMP.scale;
  out.width = CHICKEN_DIMS.contentW * LANE_TMP.scale;
  return out;
}

/** Chỗ đứng của gà trùm (to hơn gà thường). Ghi vào `out`. */
export function bossPose(lane: number, pos: number, out: ChickenPose): ChickenPose {
  lanePose(lane, pos, LANE_TMP);
  out.x = LANE_TMP.x;
  out.y = LANE_TMP.y;
  out.scale = LANE_TMP.scale;
  out.height = BOSS_DIMS.contentH * LANE_TMP.scale;
  out.width = BOSS_DIMS.contentW * LANE_TMP.scale;
  return out;
}

/** Hình gà lật cho mặt quay sang trái (hướng chạy) */
export const FLIP = true;
/** Dấu của hướng nhìn: −1 là mặt quay sang trái */
export const FACING = FLIP ? -1 : 1;

/** Đầu gà lệch khỏi giữa thân về phía mặt, tính theo bề rộng phần có hình; thẻ số đặt ngay trên đầu. */
export const HEAD_DX = 0.3;
export const CARD_RISE = 1.03;

/** Chỗ treo thẻ số (giữa đáy thẻ) trên đầu gà `pose` */
export function cardAnchor(pose: ChickenPose, out: WorldXY): WorldXY {
  out.x = pose.x + FACING * HEAD_DX * pose.width;
  out.y = pose.y + pose.height * CARD_RISE;
  return out;
}

/** Cỡ chữ của thẻ số (điểm ảnh CSS) theo chiều cao gà trên màn hình: không dưới 14 (mọi chỗ gà đứng, kể cả khi gà ở xa), không quá 30; "Chữ to" nhân 1,15. */
export const CARD_MIN_FONT_PX = 14;
export function cardFontPx(chickenHeightPx: number, largeText = false): number {
  const base = Math.min(30, Math.max(CARD_MIN_FONT_PX, Math.round(chickenHeightPx * 0.2)));
  return largeText ? Math.round(base * 1.15) : base;
}

/** Hộp bao của thân gà (kể cả thẻ số trên đầu) ở chỗ `pose` */
export function chickenBox(pose: ChickenPose, cardWorldHeight = 0.45): Box {
  return { x0: pose.x - pose.width / 2, y0: pose.y, x1: pose.x + pose.width / 2, y1: pose.y + pose.height * CARD_RISE + cardWorldHeight };
}

/** Điểm (x, y) của thế giới có trúng gà ở `pose` không (chữ nhật quanh thân, nới 12%, cộng phần thẻ số trên đầu). Trả về khoảng cách tới giữa thân (nhỏ hơn thì gần hơn), hay −1 nếu không trúng. */
export function chickenHit(x: number, y: number, pose: ChickenPose, cardWorldHeight = 0.45): number {
  const hw = (pose.width / 2) * 1.12;
  const b = chickenBox(pose, cardWorldHeight);
  if (x < pose.x - hw || x > pose.x + hw || y < b.y0 - pose.height * 0.1 || y > b.y1) return -1;
  return Math.hypot(x - pose.x, y - (pose.y + pose.height / 2));
}

// ---------------------------------------------------------------------------
// Ná cao su, học sinh

/**
 * Ná: chân cán (trục xoay) ở `x`, `baseY`; cao `height`; xoay về con gà được chọn, tối đa `maxAngle` mỗi bên. Hộp `SLING_BOX` bao cả vùng ná quét qua khi xoay.
 */
export const SLING = { x: 0, baseY: -4.42, height: 1.55, maxAngle: 0.6 } as const;
export const SLING_BOX: Box = { x0: SLING.x - 1.2, y0: SLING.baseY - 0.05, x1: SLING.x + 1.2, y1: SLING.baseY + SLING.height + 0.1 };
export const SLING_DIMS = spriteDims(SLING_ART, SLING.height);

/** Góc xoay của ná (radian, dương là nghiêng sang phải) để hướng về điểm (x, y), kẹp trong ±`maxAngle`. */
export function slingAngle(x: number, y: number): number {
  const a = Math.atan2(x - SLING.x, Math.max(y - SLING.baseY, 0.01));
  return Math.min(SLING.maxAngle, Math.max(-SLING.maxAngle, a));
}

/** Đầu chạc ná (chỗ viên thuốc bay ra) khi ná xoay góc `angle`. Ghi vào `out`. */
export function slingTip(angle: number, out: WorldXY): WorldXY {
  out.x = SLING.x + Math.sin(angle) * SLING.height * 0.95;
  out.y = SLING.baseY + Math.cos(angle) * SLING.height * 0.95;
  return out;
}

/** Học sinh: cao `height`, chân ở `feetY` (sát đáy khung), đứng bên phải ná. Hộp bao kể cả tay giơ chỉ về phía gà (`reach` lần chiều cao ở phía trên, nửa rộng 0,52 chiều cao). */
export const STUDENT = { x: 2.3, feetY: -4.45, height: 1.85, reach: 1.15, halfWidth: 0.52 } as const;
export const STUDENT_BOX: Box = {
  x0: STUDENT.x - STUDENT.halfWidth * STUDENT.height,
  y0: STUDENT.feetY,
  x1: STUDENT.x + STUDENT.halfWidth * STUDENT.height,
  y1: STUDENT.feetY + STUDENT.height * STUDENT.reach,
};

/** Lên đạn vào ná: viên thuốc bay vòng cung cao thêm chừng này ở giữa đường bay (không có khi "Giảm chuyển động") */
export const PILL = { arc: 1.1, size: 0.34 } as const;

/** Chiều cao học sinh đứng trên gà trùm so với chiều cao gà trùm; yên ngựa ở chỗ này của khung ảnh gà trùm (u, v từ góc trên trái) */
export const RIDER = { u: 0.445, v: 0.39, heightRatio: 0.42 } as const;

/** Chỗ đặt chân của {phanDien} ngồi trên gà trùm đứng ở `pose` (đã lật như gà). Ghi vào `out`. */
export function riderFoot(pose: ChickenPose, out: WorldXY): WorldXY {
  const k = pose.scale;
  const quadCx = pose.x - FACING * BOSS_DIMS.centerDx * k;
  const quadCy = pose.y + BOSS_DIMS.centerUp * k;
  out.x = quadCx + FACING * (RIDER.u - 0.5) * BOSS_DIMS.quadW * k;
  out.y = quadCy + (0.5 - RIDER.v) * BOSS_DIMS.quadH * k;
  return out;
}

// ---------------------------------------------------------------------------
// Giao diện HTML (cỡ cố định theo điểm ảnh CSS, đổi sang đơn vị thế giới theo bề rộng khung)

/** HUD ở góc trên bên trái: tim, đợt, điểm, số gà đã chữa */
export const HUD = { left: 8, top: 8, width: 250, height: 64 } as const;
export function hudBox(framePx: number): Box {
  const ppu = framePx / 16;
  const x0 = -8 + HUD.left / ppu;
  const y1 = 4.5 - HUD.top / ppu;
  return { x0, y0: y1 - HUD.height / ppu, x1: x0 + HUD.width / ppu, y1 };
}

/** Bảng thuốc ở góc dưới bên trái: tối đa 4 nút, mỗi nút rộng `w` cao `h` (điểm ảnh CSS, từ 44 trở lên) */
export const MEDICINE_BAR = { w: 60, h: 58, gap: 6, left: 8, bottom: 6, max: 4 } as const;
export function medicineBarBox(framePx: number, count: number): Box {
  const ppu = framePx / 16;
  const n = Math.max(1, Math.min(count, MEDICINE_BAR.max));
  const x0 = -8 + MEDICINE_BAR.left / ppu;
  const y0 = -4.5 + MEDICINE_BAR.bottom / ppu;
  return { x0, y0, x1: x0 + (n * MEDICINE_BAR.w + (n - 1) * MEDICINE_BAR.gap) / ppu, y1: y0 + MEDICINE_BAR.h / ppu };
}

/** Mọi hộp phải để trống: nửa dưới của ba làn (từ giữa làn tới cổng), lấy mẫu từng đơn vị `pos`, kèm thân gà và thẻ số trên đầu */
export const SHOOT_FROM = CHICKEN_SPEC.laneLength / 2;
export function keepClearBoxes(): Box[] {
  const out: Box[] = [];
  const pose: ChickenPose = { x: 0, y: 0, scale: 1, height: 0, width: 0 };
  for (let lane = 0; lane < CHICKEN_SPEC.lanes; lane++) {
    for (let pos = SHOOT_FROM; pos <= CHICKEN_SPEC.laneLength + 1e-9; pos += 1) out.push(chickenBox(chickenPose(lane, pos, pose)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gà khỏi bệnh chạy về chuồng, lấp lánh

/** Tốc độ chạy về chuồng (đơn vị thế giới mỗi giây), thời gian lấp lánh trước khi chạy, cỡ gà khỏe so với gà thường (thu nhỏ để không che gà bệnh) */
export const RUN_HOME = { speed: 8, sparkle: 0.55, scale: 0.8, endScale: 0.5 } as const;

export function coopPoint(out: WorldXY): WorldXY {
  return imageToWorld(COOP_POINT.u, COOP_POINT.v, out);
}

/** Thời gian chạy (giây) từ (x, y) về chuồng, không kể lúc lấp lánh */
export function runHomeSeconds(x: number, y: number): number {
  const c = coopPoint({ x: 0, y: 0 });
  return Math.hypot(c.x - x, c.y - y) / RUN_HOME.speed;
}

/** Số tia lấp lánh quanh gà vừa khỏi bệnh */
export const SPARKLES = 5;

/**
 * Tia lấp lánh thứ `i` ở tuổi `age` (giây tính từ lúc chữa xong, 0 đến `RUN_HOME.sparkle`): lệch khỏi tâm gà (đơn vị chiều cao gà) và hệ số cỡ (0 ở hai đầu, to nhất ở giữa). Ghi vào `out`; ngoài khoảng thì cỡ 0.
 */
export function sparkleAt(i: number, age: number, out: { dx: number; dy: number; scale: number }): { dx: number; dy: number; scale: number } {
  const k = age / RUN_HOME.sparkle;
  if (k < 0 || k > 1) {
    out.dx = 0;
    out.dy = 0;
    out.scale = 0;
    return out;
  }
  const angle = (i / SPARKLES) * Math.PI * 2 + 0.4;
  const r = 0.25 + 0.55 * k;
  out.dx = Math.cos(angle) * r * 0.9;
  out.dy = 0.5 + Math.sin(angle) * r * 0.75;
  out.scale = Math.sin(Math.PI * k);
  return out;
}

/** Màu bốn loại thuốc (nút thuốc, lọ thuốc, viên thuốc); luôn kèm chữ "Thuốc x" nên màu chỉ để dễ nhìn */
export const MEDICINE_COLORS: readonly string[] = ['#e0544b', '#3d7fd9', '#3aa35a', '#e8a317'];
