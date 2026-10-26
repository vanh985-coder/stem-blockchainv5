/**
 * Thẻ gỗ ghi số treo trên cây đa của Làng Bạc ("Cây Gộp Sổ", mốc 3, bước L5). 15 thẻ là cả cây ví dụ của Bài 4 (`SAMPLE_HARD_CHALLENGE`: tám lá 3, 7, 5, 2, 6, 1, 4, 8, `combine` là a × 10 + b nên tầng 1 là 37, 52, 61, 48, tầng 2 là 422, 658 và gốc 4878): số lấy từ `buildTree`,
 * không đặt số riêng. Tầng càng gần gốc thì thẻ càng to và treo càng thấp, gần thân (thẻ gốc to nhất, thấp nhất, ngay trước thân cây); lá ở ngoài cùng và cao nhất. Tọa độ trong hệ của cây: gốc ở thân cây, +z là phía người đứng nhìn
 * (đặt đồ rải với `yaw` π để +z quay về cổng làng), mặt thẻ quay về +z hơi xoay theo vị trí. Hàm thuần, không import three; hình học ở `scatterGeometry.createNumberTags`.
 */
import { SAMPLE_HARD_CHALLENGE, buildTree } from '../../lessons/bai-4/logic';

export interface BanyanTag {
  /** Tầng: 0 là lá, 1 và 2 là nhánh, 3 là gốc */
  level: number;
  /** Chỉ số trong tầng (từ trái sang phải) */
  index: number;
  value: number;
  /** Các chữ số hiển thị (chuỗi của `value`) */
  digits: string;
  /** Tâm tấm gỗ */
  x: number;
  y: number;
  z: number;
  /** Rộng, cao của tấm gỗ */
  w: number;
  h: number;
  /** Cỡ chữ số (cao, rộng một chữ, chừa khoảng cách) */
  digitH: number;
  digitW: number;
  /** Độ cao chỗ buộc dây (trên cành) */
  top: number;
  /** Xoay quanh trục dây treo */
  yaw: number;
}

/** Tầng 0 đến 3: bán kính cung treo quanh thân (tính từ trục cây), độ cao tâm thẻ, độ dài dây treo, chữ số cao và rộng; từ lá tới gốc. */
const LEVELS = [
  { radius: 6.4, y: 5.1, rope: 1.25, digitH: 0.3, digitW: 0.17, step: 19 },
  { radius: 5.6, y: 4.35, rope: 1.15, digitH: 0.3, digitW: 0.17, step: 37 },
  { radius: 4.7, y: 3.6, rope: 1.0, digitH: 0.4, digitW: 0.23, step: 60 },
  { radius: 3.7, y: 2.7, rope: 0.9, digitH: 0.56, digitW: 0.31, step: 0 },
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
        value,
        digits,
        x: Math.sin(theta) * L.radius,
        y,
        z: Math.cos(theta) * L.radius,
        w,
        h,
        digitH: L.digitH,
        digitW: L.digitW,
        top: y + h / 2 + L.rope,
        yaw: theta * 0.45,
      });
    });
  });
  return out;
}

/**
 * Chữ số bằng đoạn thẳng (như đồng hồ điện tử): 7 đoạn a (trên), b (phải trên), c (phải dưới), d (dưới), e (trái dưới), f (trái trên), g (giữa). Mỗi chữ là danh sách đoạn bật; ghi chữ bằng các hộp mỏng nên không cần ảnh chữ.
 */
export const SEGMENTS_OF: Readonly<Record<string, string>> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};

/** Một đoạn của chữ số trong hệ chữ số (tâm ở giữa chữ, x sang phải, y lên): tâm và kích thước hộp (rộng, cao). */
export function segmentBox(seg: string, digitW: number, digitH: number, thick: number): { x: number; y: number; w: number; h: number } {
  const hw = (digitW - thick) / 2;
  const hh = (digitH - thick) / 2;
  switch (seg) {
    case 'a':
      return { x: 0, y: hh, w: digitW, h: thick };
    case 'g':
      return { x: 0, y: 0, w: digitW, h: thick };
    case 'd':
      return { x: 0, y: -hh, w: digitW, h: thick };
    case 'b':
      return { x: hw, y: hh / 2, w: thick, h: digitH / 2 };
    case 'c':
      return { x: hw, y: -hh / 2, w: thick, h: digitH / 2 };
    case 'f':
      return { x: -hw, y: hh / 2, w: thick, h: digitH / 2 };
    default:
      return { x: -hw, y: -hh / 2, w: thick, h: digitH / 2 };
  }
}
