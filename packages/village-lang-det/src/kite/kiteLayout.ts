/**
 * Bố cục cảnh màn 6 trên Scene25D (hàm thuần, không import three; như `whackLayout.ts`, `climbLayout.ts`). Đơn vị thế giới của cảnh: khung ngang 16 × 9, gốc ở tâm, y hướng lên. Logic (`kiteLogic.ts`) chạy trong đơn vị
 * "đơn vị bay": vùng bay cao từ 0 tới 10, x là quãng diều đã bay; cảnh đổi sang thế giới bằng `UNIT` (0,9 đơn vị thế giới cho mỗi đơn vị bay, đồng đều hai chiều nên hộp va chạm và hình không méo) và cuộn ngang:
 * diều luôn đứng ở `KITE_SCREEN_X`, mọi thứ khác dịch ngược theo quãng diều đã bay.
 */
import { KITE_SPEC as C } from './kiteConfig';

export const FRAME = { width: 16, height: 9 } as const;
/** Số đơn vị thế giới cho mỗi đơn vị bay (vùng bay cao 10 → 9, đúng chiều cao khung) */
export const UNIT = FRAME.height / (C.ceiling - C.floor);
/** Hoành độ (thế giới) nơi diều đứng: lệch về bên trái để thấy xa phía trước */
export const KITE_SCREEN_X = -4.2;

/** Đơn vị bay → thế giới */
export const worldY = (y: number): number => -FRAME.height / 2 + (y - C.floor) * UNIT;
export const worldX = (x: number, camX: number): number => KITE_SCREEN_X + (x - camX) * UNIT;
/** Khoảng x (đơn vị bay) đang nằm trong khung khi diều ở `camX` (thêm `margin` mỗi phía) */
export function visibleRange(camX: number, margin = 0): [number, number] {
  return [camX + (-FRAME.width / 2 - KITE_SCREEN_X) / UNIT - margin, camX + (FRAME.width / 2 - KITE_SCREEN_X) / UNIT + margin];
}

/** Diều nghiêng theo vận tốc đứng: +20° lúc bật (5,5), −20° lúc rơi nhanh nhất (−8); 0 khi vận tốc 0. Trả radian (dương: ngóc lên). */
export const TILT_MAX_DEG = 20;
export function kiteTilt(vy: number): number {
  const k = vy >= 0 ? Math.min(1, vy / C.flapVelocity) : Math.max(-1, vy / -C.maxFall);
  return (k * TILT_MAX_DEG * Math.PI) / 180;
}

/**
 * Hình diều (ảnh 1024 × 572; phần có hình chiếm u 0,262 đến 0,734 và v 0,072 đến 0,904 nhưng thân hình thoi chỉ rộng chừng 0,28 bề rộng ảnh, phần còn lại là dây đuôi): thân diều rộng `KITE_BODY` đơn vị bay (to hơn hộp va chạm 0,8 × 0,5 cho dễ nhìn).
 * Nút buộc dây (chỗ học sinh nắm) ở (u 0,454; v 0,652) của ảnh.
 */
export const KITE_BODY = 1.1;
export const KITE_ART = { aspect: 1024 / 572, contentW: 0.28, knotU: 0.454, knotV: 0.652 } as const;
/** Cỡ tấm hình diều và độ lệch tâm tấm so với nút buộc (đơn vị bay; y hướng lên) */
export function kiteSprite(): { width: number; height: number; fromKnotX: number; fromKnotY: number } {
  const width = KITE_BODY / KITE_ART.contentW;
  const height = width / KITE_ART.aspect;
  return { width, height, fromKnotX: (0.5 - KITE_ART.knotU) * width, fromKnotY: (KITE_ART.knotV - 0.5) * height };
}
/** Điểm tay cầm (nút buộc) so với tâm diều của logic (đơn vị bay): tâm hộp va chạm là tâm thân diều */
export function knotOffset(): { x: number; y: number } {
  const k = kiteSprite();
  return { x: -k.fromKnotX, y: -k.fromKnotY };
}

/** Học sinh treo dưới diều: cao `STUDENT_HEIGHT` đơn vị thế giới, tư thế `hang` (hai bàn tay ở độ cao `HANG.handsRatio` × chiều cao so với chân) */
export const STUDENT_HEIGHT = 1.5;

/**
 * Cột tre: ảnh gốc 1024 × 559, thân cột nằm gần giữa; cắt một đoạn thẳng của thân (không gồm đất đá ở gốc) thành tấm hẹp lặp theo chiều dọc (lặp lật gương nên chỗ nối không gãy).
 * Thân cột rộng `poleW` điểm ảnh ứng với bề rộng cột của luật (`pillarWidth`).
 */
export const POLE_CROP = { x0: 481, w: 64, y0: 56, h: 291, poleW: 20 } as const;
/** Số đơn vị bay cho mỗi điểm ảnh của ảnh cột (thân cột 20 điểm ảnh ↔ bề rộng cột của luật) */
export const POLE_UNIT_PER_PX = C.pillarWidth / POLE_CROP.poleW;
export const POLE_TILE = { width: POLE_CROP.w * POLE_UNIT_PER_PX, height: POLE_CROP.h * POLE_UNIT_PER_PX };
/** Số lần lặp của tấm cột (theo chiều dọc) để phủ một cột cao `height` đơn vị bay */
export const poleRepeat = (height: number): number => height / POLE_TILE.height;

/** Hai cột của khe: [cột dưới, cột trên] theo đơn vị bay: dưới từ đất 0 tới đáy khe; trên từ đỉnh khe tới trần */
export function pillarSpans(bottom: number, top: number): [[number, number], [number, number]] {
  return [
    [C.floor, bottom],
    [top, C.ceiling],
  ];
}

/**
 * Cổng làng (ảnh 1024 × 559, phần có hình u 0,139 đến 0,856, v 0,098 đến 0,886): thân cổng rộng `GATE_BODY` đơn vị bay, đặt sát đất. Cánh cửa nằm ở u 0,44 đến 0,565, v 0,53 đến 0,87 của ảnh.
 */
export const GATE_BODY = 3.4;
export const GATE_ART = { aspect: 1024 / 559, u0: 0.139, u1: 0.856, v0: 0.098, v1: 0.886, door: { u0: 0.44, u1: 0.565, v0: 0.53, v1: 0.87 } } as const;
export function gateSprite(): { width: number; height: number; centerY: number; door: { cx: number; cy: number; w: number; h: number } } {
  const width = GATE_BODY / (GATE_ART.u1 - GATE_ART.u0);
  const height = width / GATE_ART.aspect;
  // đáy phần có hình đặt ở độ cao 0 (đất): tâm tấm cao hơn đáy (v1 − 0,5) × cao
  const centerY = (GATE_ART.v1 - 0.5) * height;
  const d = GATE_ART.door;
  return { width, height, centerY, door: { cx: ((d.u0 + d.u1) / 2 - 0.5) * width, cy: centerY - (((d.v0 + d.v1) / 2 - 0.5) * height), w: (d.u1 - d.u0) * width, h: (d.v1 - d.v0) * height } };
}

/** Diều đen (ảnh 1024 × 572, thân hình thoi rộng chừng 0,28 bề rộng ảnh): thân rộng `BLACK_BODY` đơn vị bay (to hơn hộp 0,8 × 0,6). */
export const BLACK_BODY = 1.1;
export const BLACK_ART = { aspect: 1024 / 572, contentW: 0.28 } as const;
export const blackSprite = (): { width: number; height: number } => {
  const width = BLACK_BODY / BLACK_ART.contentW;
  return { width, height: width / BLACK_ART.aspect };
};

/** Trang bản sao (hình vẽ bằng code): cạnh `C.page.size`, hơi to hơn cho dễ nhìn */
export const PAGE_BODY = C.page.size * 1.25;

/**
 * Các lớp nền cuộn ngang (spec 06): tốc độ so với tốc độ cuộn của cột (trời, đồi xa, tre gần), chiều cao tấm so với bề rộng khung 16 và độ cao đáy (thế giới). Lặp kiểu soi gương theo chiều ngang.
 */
export const BACK_LAYERS = [
  { id: 'troi', speed: 0.05, aspect: 1376 / 768, bottom: -FRAME.height / 2, full: true },
  { id: 'doiXa', speed: 0.25, aspect: 1881 / 358, bottom: -FRAME.height / 2 + 0.6, full: false },
  { id: 'treGan', speed: 0.6, aspect: 1881 / 369, bottom: -FRAME.height / 2, full: false },
] as const;
/** Cỡ tấm của một lớp nền (thế giới): lớp `full` phủ kín khung (cover), các lớp còn lại rộng đúng khung. */
export function layerSize(layer: (typeof BACK_LAYERS)[number]): { width: number; height: number } {
  if (layer.full) {
    const w = Math.max(FRAME.width, FRAME.height * layer.aspect);
    return { width: w, height: w / layer.aspect };
  }
  return { width: FRAME.width, height: FRAME.width / layer.aspect };
}
/**
 * Độ lệch hoành độ của hình nền (đơn vị của UV: 1 là cả bề rộng hình) sau khi cột cuộn `scrolled` đơn vị thế giới: lớp cuộn `speed` lần tốc độ cột; "Giảm chuyển động" thì lớp nền cuộn chậm một nửa.
 */
export function layerOffset(layer: (typeof BACK_LAYERS)[number], scrolled: number, reduced: boolean): number {
  const size = layerSize(layer);
  return (scrolled * layer.speed * (reduced ? 0.5 : 1)) / size.width;
}

/** Diều chớp nhẹ trong lúc bất tử (còn `inv` giây, đồng hồ `t`): độ mờ của hình diều. Giảm chuyển động thì mờ đều, không chớp. */
export function invOpacity(inv: number, t: number, reduced: boolean): number {
  if (inv <= 0) return 1;
  if (reduced) return 0.6;
  return Math.floor(t * 10) % 2 === 0 ? 0.45 : 1;
}

/** Rung màn khi mất tim: biên độ (thế giới) còn lại `k` (1 → 0 trong 0,3 giây) lúc `t`; Giảm chuyển động thì không rung. */
export const SHAKE_SECONDS = 0.3;
export const SHAKE_AMPLITUDE = 0.12;
export function shakeOffset(k: number, t: number, reduced: boolean): { x: number; y: number } {
  if (reduced || k <= 0) return { x: 0, y: 0 };
  return { x: Math.sin(t * 70) * SHAKE_AMPLITUDE * k, y: Math.cos(t * 83) * SHAKE_AMPLITUDE * 0.6 * k };
}

/** Cảnh giao sổ khi trả lời đúng: dài `DELIVER_SECONDS`; cổng mở trong `DOOR_OPEN` giây đầu, bản sao sổ bay từ tay diều tới cánh cửa trong khoảng `BOOK_FLY` (tỉ lệ thời gian) */
export const DELIVER_SECONDS = 1.5;
export const DOOR_OPEN = 0.5;
export const BOOK_FLY = { from: 0.15, to: 0.85 } as const;
/** Tiến trình bay của sổ (0 đến 1) lúc `t` giây kể từ đầu cảnh giao sổ */
export function bookProgress(t: number): number {
  const k = (t / DELIVER_SECONDS - BOOK_FLY.from) / (BOOK_FLY.to - BOOK_FLY.from);
  return Math.min(1, Math.max(0, k));
}
/** Độ mở cửa (0 đến 1) lúc `t` giây */
export const doorOpen = (t: number): number => Math.min(1, Math.max(0, t / DOOR_OPEN));

/** Số ô pool của cảnh (cột theo cặp, trang, diều đen): đủ cho mọi khe có thể nằm trong khung cộng một khe mỗi phía */
export const POOL = { gaps: 6 } as const;
/** Khoảng x (đơn vị bay) mà các khe được dựng: trong khung cộng nửa khe mỗi phía (để cột không hiện đột ngột ở mép) */
export const BUILD_MARGIN = 3;
