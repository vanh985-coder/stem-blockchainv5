import type { NenTheme } from '../content/nenTrangTri';

/**
 * Dữ liệu bố trí cho NenTrangTri (hàm thuần, có test). Nằm trong chunk icon, không vào trang đầu.
 * Mỗi bộ icon (theme) có 8 đến 12 icon cùng phong cách; bố trí theo 3 kiểu:
 * - 'full': rải ở rìa cả màn hình (trang chủ, tài khoản, bản đồ, truyện);
 * - 'sides': chỉ ở 2 khoảng trống hai bên bảng bài học, tối đa 4 icon mỗi bên;
 * - 'still': như 'full' nhưng đứng yên và rất mờ (trang giáo viên).
 */
export type Variant = 'full' | 'sides' | 'still';

export type IconKind =
  | 'giay'
  | 'la'
  | 'xu'
  | 'vo'
  | 'sao'
  | 'may'
  | 'trang'
  | 'but'
  | 'trangvang'
  | 'den'
  | 'co'
  | 'tia'
  | 'khungphoi'
  | 'thoi'
  | 'cuonchi'
  | 'manhvai'
  | 'condau'
  | 'khuongo'
  | 'muc'
  | 'dongbac'
  | 'canh'
  | 'lacay'
  | 'trong'
  | 'hoa'
  | 'nonla';

/** Mỗi bộ 8 đến 12 icon (có thể lặp một loại ở các vị trí khác nhau). */
export const THEME_KINDS: Record<NenTheme, readonly IconKind[]> = {
  mo: ['vo', 'sao', 'may', 'trang', 'but', 'sao', 'giay', 'may', 'trangvang', 'tia'],
  lang: ['giay', 'la', 'xu', 'nonla', 'hoa', 'xu', 'giay', 'la', 'nonla', 'hoa'],
  hoi: ['den', 'co', 'trangvang', 'tia', 'trong', 'den', 'hoa', 'xu', 'co', 'sao'],
  giay: ['giay', 'khungphoi', 'la', 'giay', 'khungphoi', 'la', 'but', 'giay', 'la', 'khungphoi'],
  det: ['thoi', 'cuonchi', 'manhvai', 'cuonchi', 'thoi', 'manhvai', 'cuonchi', 'manhvai', 'thoi', 'cuonchi'],
  khacdau: ['condau', 'khuongo', 'muc', 'condau', 'khuongo', 'muc', 'giay', 'condau', 'khuongo', 'muc'],
  bac: ['dongbac', 'lacay', 'canh', 'dongbac', 'lacay', 'canh', 'dongbac', 'lacay', 'canh', 'xu'],
};

export const MIN_ICONS = 8;
export const MAX_ICONS = 12;
/** Màn hình dưới 640px: tối đa bấy nhiêu icon. */
export const NARROW_MAX = 5;
/** Màn dưới 640px có tia sáng: chỉ 2 tia, và icon bớt còn 3, để cả nền tối đa 5 hình. */
export const NARROW_SPARKLES = 2;
/** Ở 'sides': tối đa bấy nhiêu icon mỗi bên. */
export const SIDE_MAX = 4;
/** Bề rộng bảng bài học (px thấy được) ở màn hình từ 1280px; khoảng trống mỗi bên = (rộng màn hình − 1200) / 2. */
export const BOARD_WIDTH = 1200;
/** Chỉ hiện icon hai bên khi mỗi bên còn ít nhất bấy nhiêu px: (1200 + 2 × 48) = 1296px. */
export const MIN_GUTTER = 48;
export const SIDES_MIN_SCREEN = BOARD_WIDTH + 2 * MIN_GUTTER;

export interface Floater {
  kind: IconKind;
  /** Vị trí theo % (của màn hình ở 'full'/'still', của khoảng trống ở 'sides') */
  x: number;
  y: number;
  /** Cạnh icon, px (ở 'sides' còn bị giới hạn theo bề rộng khoảng trống) */
  size: number;
  /** Quãng trôi (px), thời gian một vòng (giây), trễ (giây), góc nghiêng (độ) */
  dx: number;
  dy: number;
  dur: number;
  delay: number;
  r0: number;
  r1: number;
  /** Chỉ có ở 'sides': khoảng trống trái hay phải */
  side?: 'l' | 'r';
}

/** 12 chỗ ở rìa màn hình; 5 chỗ đầu rải đều nhau (dùng khi màn hình hẹp). */
const SLOTS: readonly { x: number; y: number }[] = [
  { x: 6, y: 12 },
  { x: 88, y: 10 },
  { x: 12, y: 70 },
  { x: 90, y: 66 },
  { x: 50, y: 90 },
  { x: 22, y: 38 },
  { x: 80, y: 38 },
  { x: 50, y: 6 },
  { x: 4, y: 46 },
  { x: 94, y: 40 },
  { x: 30, y: 92 },
  { x: 70, y: 94 },
];
const DX = [16, -18, 14, -14, 18, 20, -16, 12, -10, 15, -12, 10];
const DY = [-24, 20, -18, -26, -14, 16, 22, 18, -20, 14, -16, 20];
const SIZES = [56, 48, 44, 52, 44, 38, 40, 42, 36, 40, 38, 42];

/** 4 chỗ mỗi bên (x theo % bề rộng khoảng trống, y theo % chiều cao màn hình). */
const SIDE_SLOTS: readonly { x: number; y: number }[] = [
  { x: 20, y: 14 },
  { x: 56, y: 38 },
  { x: 24, y: 62 },
  { x: 52, y: 86 },
];

/** Hàm thuần: các icon của một bộ theo kiểu bố trí. Cùng đầu vào thì cùng kết quả. */
export function floatersFor(theme: NenTheme, variant: Variant): Floater[] {
  const kinds = THEME_KINDS[theme];
  if (variant === 'sides') {
    const out: Floater[] = [];
    SIDE_SLOTS.slice(0, SIDE_MAX).forEach((slot, i) => {
      for (const side of ['l', 'r'] as const) {
        const k = i * 2 + (side === 'l' ? 0 : 1);
        out.push({
          kind: kinds[k % kinds.length],
          x: side === 'l' ? slot.x : 100 - slot.x,
          y: slot.y,
          size: 72,
          // Trôi rất chậm: quãng ngắn, vòng dài
          dx: side === 'l' ? 6 : -6,
          dy: i % 2 === 0 ? -10 : 10,
          dur: 48 + k * 4,
          delay: -k * 7,
          r0: side === 'l' ? -6 : 6,
          r1: side === 'l' ? 6 : -6,
          side,
        });
      }
    });
    return out;
  }
  return kinds.slice(0, MAX_ICONS).map((kind, i) => ({
    kind,
    x: SLOTS[i].x,
    y: SLOTS[i].y,
    size: SIZES[i],
    dx: DX[i],
    dy: DY[i],
    dur: 20 + ((i * 3) % 9),
    delay: -((i * 37) % 29),
    r0: (i % 2 === 0 ? -1 : 1) * (6 + (i % 4) * 3),
    r1: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 3),
  }));
}

/** Hàm thuần: số icon được hiện ở màn hình hẹp (dưới 640px) hoặc rộng. */
export function visibleCount(total: number, narrow: boolean): number {
  return narrow ? Math.min(total, NARROW_MAX) : total;
}

/** Tia sáng lấp lánh (cảnh trao Trang Sổ Vàng, giới thiệu làng): vị trí theo %, kích thước px, nhịp và độ trễ theo giây. */
export interface Sparkle {
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
}

export const SPARKLES: readonly Sparkle[] = [
  { x: 14, y: 22, size: 22, dur: 2.6, delay: 0 },
  { x: 84, y: 18, size: 28, dur: 3.2, delay: -0.8 },
  { x: 24, y: 76, size: 26, dur: 3, delay: -1.6 },
  { x: 76, y: 72, size: 20, dur: 2.4, delay: -0.4 },
  { x: 50, y: 12, size: 24, dur: 3.4, delay: -2 },
  { x: 8, y: 52, size: 18, dur: 2.8, delay: -1.2 },
  { x: 92, y: 50, size: 20, dur: 3.1, delay: -2.4 },
];
