/**
 * Vải trên sào phơi của Làng Dệt (mốc 3, bước L2). Hình học một sào có 3 chỗ treo vải (`aSlot` 0, 1, 2); mỗi sào quyết định bằng rng cố định: bỏ trống hay có 1 đến 3 tấm, mỗi tấm MỘT màu nhuộm tự nhiên và một độ dài.
 * Quyết định được mã hóa thành ba số trong màu từng bản (`tint` của đồ rải, đi vào `instanceColor`), bộ đổ bóng đỉnh của vật liệu sào vải (`ScatterProps.tsx`) giải mã lại: ẩn tấm, chọn màu, co độ dài. Nhờ vậy cả làng
 * vẫn là MỘT hình học và một draw call mỗi mảnh. Hàm thuần (không import three), có test.
 */
/** Bộ số ngẫu nhiên trong [0, 1) (ví dụ `createMulberry32(seed)`). */
export type ClothRng = () => number;

/** Sáu màu nhuộm tự nhiên (mã sRGB): đỏ son, hồng phai, chàm, vàng nghệ, nâu củ nâu, trắng mộc. */
export const CLOTH_PALETTE: readonly number[] = [0xb5503c, 0xd58e9a, 0x3b5f96, 0xd2a23e, 0x8a6544, 0xe6ddc8];

/** Độ dài tấm ngắn nhất so với tấm dài nhất (tỉ lệ của chiều dài thiết kế 2,0). */
export const CLOTH_MIN_LENGTH = 0.45;
/** Số chỗ treo vải trên một sào. */
export const CLOTH_SLOTS = 3;

/**
 * Mã của một chỗ treo: 0 là để trống; còn lại là (màu + 1 + độ dài) / 8, màu là chỉ số 0 đến 5 trong `CLOTH_PALETTE`, độ dài từ 0 đến 0,99 (0 là ngắn nhất, `CLOTH_MIN_LENGTH`). Nằm trong (0, 0,875]: vừa một thành phần màu.
 */
export function clothCode(colorIndex: number, length01: number): number {
  return (Math.min(5, Math.max(0, Math.floor(colorIndex))) + 1 + Math.min(0.99, Math.max(0, length01))) / 8;
}

export interface ClothSlot {
  on: boolean;
  /** Chỉ số màu trong `CLOTH_PALETTE` (−1 khi để trống) */
  color: number;
  /** Tỉ lệ độ dài so với thiết kế: từ `CLOTH_MIN_LENGTH` đến 1 (0 khi để trống) */
  length: number;
}

/** Giải mã một chỗ treo: đúng như bộ đổ bóng đỉnh (`floor(v × 8) − 1` là màu, phần lẻ là độ dài). */
export function decodeClothCode(code: number): ClothSlot {
  const v = code * 8;
  if (v < 1) return { on: false, color: -1, length: 0 };
  const color = Math.floor(v) - 1;
  return { on: true, color, length: CLOTH_MIN_LENGTH + (1 - CLOTH_MIN_LENGTH) * (v - Math.floor(v)) };
}

/** Tỉ lệ sào để trống, có 1, 2, 3 tấm. */
const COUNT_WEIGHTS = [0.12, 0.28, 0.34, 0.26] as const;

/** Chọn vải cho một sào bằng rng: số tấm, chỗ nào treo, màu và độ dài từng tấm. Trả ba mã (một mã mỗi chỗ treo). */
export function clothPoleTint(rng: ClothRng): readonly [number, number, number] {
  const u = rng();
  let acc = 0;
  let count = CLOTH_SLOTS;
  for (let k = 0; k < COUNT_WEIGHTS.length; k++) {
    acc += COUNT_WEIGHTS[k];
    if (u < acc) {
      count = k;
      break;
    }
  }
  const slots = [0, 1, 2];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const codes: [number, number, number] = [0, 0, 0];
  for (const s of slots.slice(0, count)) codes[s] = clothCode(Math.floor(rng() * CLOTH_PALETTE.length), rng());
  return codes;
}
