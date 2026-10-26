/**
 * Chỗ 8 ô lá trên cây của màn 11 (spec 08, mục "Màn 11"): hàm thuần, không import three. Tọa độ theo ẢNH `sprites/man-11-ghep-la/cay-ghep-la` (u, v từ 0 đến 1, góc trên trái là (0, 0)),
 * nên không phụ thuộc cỡ khung; `man11Layout.ts` đổi sang tọa độ thế giới theo chỗ cây nằm. Chỉnh bằng trang dev `/dev/man-11-slots` (chạy `pnpm dev:lang-bac`, cổng 5177), rồi chép khối mã xuất ra vào đây.
 *
 * Cây là cây nhị phân ghép từ lá lên: 8 ô lá (đầu 8 nhánh) → 4 cành → 2 cành → gốc. Chỉ số ô theo thứ tự của logic: hai ô anh em là 2k và 2k + 1 (gộp thành cành), nên (0, 1) và (2, 3) cùng nửa trái,
 * (4, 5) và (6, 7) cùng nửa phải. Vòng 1 chỉ có 4 ô: dùng hai cặp nằm thấp nhất (đầu hai chạc dưới của hai bên).
 */

export interface Uv {
  u: number;
  v: number;
}

/** Ảnh cây: khung ảnh 1408 × 768 có viền trống; phần có hình thật (cắt khi vẽ) để cây phủ đúng khung đặt cho nó. */
export const TREE_ART = { aspect: 1408 / 768, u0: 0.225, u1: 0.765, v0: 0.125, v1: 0.9 } as const;

/** Tỉ lệ rộng / cao của phần cây đã cắt. */
export const TREE_CROP_ASPECT = ((TREE_ART.u1 - TREE_ART.u0) * TREE_ART.aspect) / (TREE_ART.v1 - TREE_ART.v0);

/**
 * Đầu 8 nhánh, theo chỉ số ô: (0, 1) hai đầu của chạc dưới bên trái, (2, 3) đầu nhánh trên bên trái và đầu cành nhỏ gần thân, (4, 5) đối xứng bên phải, (6, 7) chạc dưới bên phải.
 * Giá trị đầu đo từ ảnh gốc (đầu mỗi nhánh), đã chọn 4 trong 5 đầu mút mỗi bên sao cho hai ô cạnh nhau cách nhau ≥ 1 đơn vị ở cỡ cây thường dùng.
 */
export const TREE_SLOTS: readonly Uv[] = [
  { u: 0.25, v: 0.579 },
  { u: 0.241, v: 0.41 },
  { u: 0.3125, v: 0.234 },
  { u: 0.4545, v: 0.172 },
  { u: 0.5355, v: 0.172 },
  { u: 0.678, v: 0.234 },
  { u: 0.749, v: 0.41 },
  { u: 0.74, v: 0.579 },
];

/** Chỗ cành chia ra từ thân (gốc của cây gộp): nơi tia sáng "gốc" hiện lên. */
export const TREE_ROOT: Uv = { u: 0.495, v: 0.585 };

/** Vòng 1 (4 ô) dùng hai cặp thấp nhất: các chỉ số của `TREE_SLOTS`. */
const FOUR: readonly number[] = [0, 1, 6, 7];

/** Chỗ các ô của một cây `count` ô (4 hoặc 8), theo chỉ số ô của logic. */
export function slotUvs(count: number, slots: readonly Uv[] = TREE_SLOTS): readonly Uv[] {
  return count === 4 ? FOUR.map((i) => slots[i]) : slots;
}

/**
 * Chỗ nút gộp (mức `level` từ 1, chỉ số `index`): trung điểm hai nút con, kéo nhẹ về phía gốc cho giống cành thật; mức cao nhất (gốc) nằm đúng `TREE_ROOT`.
 */
export function nodeUv(count: number, level: number, index: number, slots: readonly Uv[] = TREE_SLOTS): Uv {
  const levels = Math.round(Math.log2(count));
  if (level >= levels) return TREE_ROOT;
  const children: Uv[] = [];
  for (const k of [2 * index, 2 * index + 1]) children.push(level === 1 ? slotUvs(count, slots)[k] : nodeUv(count, level - 1, k, slots));
  const mid = { u: (children[0].u + children[1].u) / 2, v: (children[0].v + children[1].v) / 2 };
  const pull = 0.2 * level;
  return { u: mid.u + (TREE_ROOT.u - mid.u) * pull, v: mid.v + (TREE_ROOT.v - mid.v) * pull };
}

/** Khối mã để chép từ trang dev vào `TREE_SLOTS`. */
export function slotsSource(slots: readonly Uv[]): string {
  const r = (x: number) => Number(x.toFixed(4));
  return `export const TREE_SLOTS: readonly Uv[] = [\n${slots.map((s) => `  { u: ${r(s.u)}, v: ${r(s.v)} },`).join('\n')}\n];`;
}
