/**
 * Mặt đất cho cảnh màn 11 (hàm thuần trên mảng điểm ảnh RGBA, không import three): ảnh nền `scenes/man-11-goc-da` có nửa dưới là nền TRẮNG (để chừa chỗ cho bàn). `cutoutWhite` làm trong suốt phần trắng nối với mép dưới
 * của ảnh (loang từ mép dưới, nên mây hay chỗ trắng khác trong ảnh không bị đụng), bóc thêm 2 điểm ảnh quanh vùng đó để hết viền trắng nhạt của mép cỏ, và làm mờ mép 1 điểm ảnh; sau đó cảnh vẽ bằng code một mặt đất nằm SAU ảnh nên
 * lộ ra qua phần trong suốt. `grass` là màu cỏ lấy ngay phía trên mép (để mặt đất cùng tông với cỏ của ảnh).
 */

export interface GroundCut {
  /** Màu cỏ trung bình ngay phía trên mép trắng (r, g, b 0 đến 255) */
  grass: [number, number, number];
  /** Hàng đầu tiên (từ trên) có điểm ảnh bị làm trong suốt, tính theo tỉ lệ chiều cao ảnh (0 đến 1) */
  top: number;
  /** Số điểm ảnh đã làm trong suốt */
  cleared: number;
}

const WHITE_MIN = 238;

function dilate(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(src);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (src[p]) continue;
      if ((x > 0 && src[p - 1]) || (x < w - 1 && src[p + 1]) || (y > 0 && src[p - w]) || (y < h - 1 && src[p + w])) out[p] = 1;
    }
  }
  return out;
}

/** Làm trong suốt (sửa trực tiếp kênh alpha của `data`) phần trắng nối với mép dưới; trả màu cỏ và vị trí mép. */
export function cutoutWhite(data: Uint8ClampedArray, w: number, h: number): GroundCut {
  const white = (p: number) => data[p * 4] >= WHITE_MIN && data[p * 4 + 1] >= WHITE_MIN && data[p * 4 + 2] >= WHITE_MIN;
  const mark = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) {
    const p = (h - 1) * w + x;
    if (white(p)) {
      mark[p] = 1;
      stack.push(p);
    }
  }
  while (stack.length > 0) {
    const p = stack.pop() as number;
    const x = p % w;
    const y = (p - x) / w;
    const next = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of next) {
      if (q >= 0 && !mark[q] && white(q)) {
        mark[q] = 1;
        stack.push(q);
      }
    }
  }
  // cỏ ngay phía trên mép: mỗi cột (cách 8 cột) lấy điểm ảnh cách mép 6 điểm ảnh về phía trên
  let rs = 0;
  let gs = 0;
  let bs = 0;
  let n = 0;
  let topRow = h;
  for (let x = 0; x < w; x += 8) {
    let y = 0;
    while (y < h && !mark[y * w + x]) y++;
    if (y >= h) continue;
    topRow = Math.min(topRow, y);
    const yy = Math.max(0, y - 6);
    const p = (yy * w + x) * 4;
    if (data[p + 1] >= data[p] && data[p + 1] >= data[p + 2] - 20) {
      rs += data[p];
      gs += data[p + 1];
      bs += data[p + 2];
      n++;
    }
  }
  const gone = dilate(dilate(mark, w, h), w, h);
  const feather = dilate(gone, w, h);
  let cleared = 0;
  for (let p = 0; p < w * h; p++) {
    if (gone[p]) {
      data[p * 4 + 3] = 0;
      cleared++;
    } else if (feather[p]) data[p * 4 + 3] = Math.min(data[p * 4 + 3], 140);
  }
  const grass: [number, number, number] = n > 0 ? [Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)] : [140, 190, 90];
  return { grass, top: topRow >= h ? 1 : topRow / h, cleared };
}

/** Pha màu `rgb` với hệ số `k` (k < 1 tối đi, k > 1 sáng lên), ra chuỗi `rgb(...)`. */
export function shade(rgb: readonly [number, number, number], k: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(rgb[0])}, ${c(rgb[1])}, ${c(rgb[2])})`;
}
