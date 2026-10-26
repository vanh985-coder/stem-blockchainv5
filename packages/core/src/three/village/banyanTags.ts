/**
 * Thẻ gỗ ghi số treo trên cây đa của Làng Bạc ("Cây Gộp Sổ", mốc 3, bước L5; chữ bằng phông của game từ bước L6). 15 thẻ là cả cây ví dụ của Bài 4 (`SAMPLE_HARD_CHALLENGE`: tám lá 3, 7, 5, 2, 6, 1, 4, 8; `combine` là
 * a × 10 + b nên tầng 1 là 37, 52, 61, 48, tầng 2 là 422, 658 và gốc 4878): số lấy từ `buildTree`, không đặt số riêng. Tầng càng gần gốc thì thẻ càng to và treo càng thấp (thẻ gốc to nhất, thấp nhất, ngay trước thân cây);
 * lá ở ngoài cùng và cao nhất. Tọa độ trong hệ của cây: gốc ở thân cây, +z là phía người đứng nhìn (đặt `cay-the` với `yaw` π để +z quay về cổng làng), mặt thẻ quay về +z hơi xoay theo vị trí. Hàm thuần, không import three;
 * phần vẽ (tấm gỗ, dây, chữ trên ảnh, lay) ở `VillageFeatures.tsx`.
 */
import { SAMPLE_HARD_CHALLENGE, buildTree } from '../../lessons/bai-4/logic';

export interface BanyanTag {
  /** Tầng: 0 là lá, 1 và 2 là nhánh, 3 là gốc */
  level: number;
  /** Chỉ số trong tầng (từ trái sang phải) */
  index: number;
  /** Số thứ tự chung 0 đến 14 (tầng lá trước, gốc cuối): ô trong ảnh chữ */
  id: number;
  value: number;
  /** Chuỗi số hiển thị (chuỗi của `value`) */
  digits: string;
  /** Tâm tấm gỗ */
  x: number;
  y: number;
  z: number;
  /** Rộng, cao của tấm gỗ */
  w: number;
  h: number;
  /** Chiều cao chữ số mong muốn (đơn vị thế giới) */
  digitH: number;
  /** Độ cao chỗ buộc dây (trên cành) */
  top: number;
  /** Xoay quanh trục dây treo */
  yaw: number;
}

/** Tầng 0 đến 3: bán kính cung treo quanh thân (tính từ trục cây), độ cao tâm thẻ, độ dài dây treo, chiều cao chữ, bề rộng chừa cho mỗi chữ số, góc giữa hai thẻ cạnh nhau (độ); từ lá tới gốc. */
const LEVELS = [
  { radius: 6.4, y: 5.1, rope: 1.25, digitH: 0.34, digitW: 0.22, step: 19 },
  { radius: 5.6, y: 4.35, rope: 1.15, digitH: 0.36, digitW: 0.22, step: 37 },
  { radius: 4.7, y: 3.6, rope: 1.0, digitH: 0.42, digitW: 0.27, step: 60 },
  { radius: 3.7, y: 2.7, rope: 0.9, digitH: 0.58, digitW: 0.36, step: 0 },
] as const;

const PAD_X = 0.3;
const PAD_Y = 0.2;

/** Sổ cái mẫu của cây: tầng lá, tầng 1, tầng 2 và gốc (như `buildTree`). */
export function banyanTree(): number[][] {
  return buildTree(SAMPLE_HARD_CHALLENGE.txs.map((t) => t.value));
}

/** 15 thẻ của cây đa, từ tầng lá lên gốc, trong từng tầng từ trái sang phải. */
export function banyanTags(): BanyanTag[] {
  const tree = banyanTree();
  const out: BanyanTag[] = [];
  tree.forEach((row, level) => {
    const L = LEVELS[level];
    row.forEach((value, index) => {
      const theta = ((index - (row.length - 1) / 2) * L.step * Math.PI) / 180;
      const digits = String(value);
      const w = digits.length * L.digitW + PAD_X;
      const h = L.digitH + PAD_Y;
      const y = L.y + (level < 3 && index % 2 ? 0.18 : 0);
      out.push({
        level,
        index,
        id: out.length,
        value,
        digits,
        x: Math.sin(theta) * L.radius,
        y,
        z: Math.cos(theta) * L.radius,
        w,
        h,
        digitH: L.digitH,
        top: y + h / 2 + L.rope,
        yaw: theta * 0.45,
      });
    });
  });
  return out;
}

/** Ảnh chữ chung của cả 15 thẻ: lưới `cols` × `cols` ô vuông `cell` điểm ảnh. */
export const TAG_ATLAS = { cols: 4, cell: 256 } as const;

/** Ô của thẻ `id` trong ảnh chữ: góc trên trái (điểm ảnh) và hình chữ nhật uv (u0, v0, u1, v1; v tính từ dưới lên như three). */
export function tagCell(id: number): { px: number; py: number; u0: number; v0: number; u1: number; v1: number } {
  const col = id % TAG_ATLAS.cols;
  const row = Math.floor(id / TAG_ATLAS.cols);
  const n = TAG_ATLAS.cols;
  return { px: col * TAG_ATLAS.cell, py: row * TAG_ATLAS.cell, u0: col / n, u1: (col + 1) / n, v0: 1 - (row + 1) / n, v1: 1 - row / n };
}

/** Mặt phẳng chữ phủ lên tấm gỗ (chừa viền gỗ quanh). */
export function tagPlane(t: Pick<BanyanTag, 'w' | 'h'>): { w: number; h: number } {
  return { w: t.w * 0.94, h: t.h * 0.86 };
}

/**
 * Hệ số đổi từ điểm ảnh chữ (phông cỡ `fontPx`) sang đơn vị thế giới sao cho chữ cao `t.digitH` (chiều cao chữ số ≈ 0,72 cỡ phông) mà vẫn lọt chiều rộng mặt phẳng chữ (`textPx` là bề rộng chuỗi đo được ở cỡ `fontPx`).
 */
export function tagTextScale(t: Pick<BanyanTag, 'w' | 'h' | 'digitH'>, fontPx: number, textPx: number): number {
  const plane = tagPlane(t);
  const byHeight = t.digitH / (fontPx * 0.72);
  const byWidth = (plane.w * 0.92) / Math.max(1, textPx);
  return Math.min(byHeight, byWidth);
}

/** Cách lay của thẻ `id`: pha, tần số (rad/giây) và biên độ (rad); thẻ to lay ít hơn (nặng hơn). */
export function tagSwing(t: Pick<BanyanTag, 'id' | 'w'>): { phase: number; speed: number; amp: number } {
  return { phase: t.id * 1.7, speed: 1.3 + (t.id % 4) * 0.17, amp: 0.05 / Math.max(1, t.w * 0.9) };
}
