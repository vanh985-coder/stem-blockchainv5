// Test hàm tách nền hình rời (scripts/lib/cutout.mjs) bằng ảnh mẫu tự tạo: hình tròn đỏ trên nền ô vuông, vùng trắng bên trong hình, nền lọt trong lỗ, ảnh đã trong suốt thật.
import { describe, expect, it } from 'vitest';
import { analyzeBackground, assessCutout, autoCutout, despeckle } from './cutout.mjs';

const A = [219, 219, 219];
const B = [154, 154, 154];

/** Ảnh w × h nền ô vuông (ô `cell` điểm ảnh, hai màu A và B xen kẽ, thêm nhiễu ±2 cố định), rồi vẽ các hình bằng `paint(x, y) -> [r,g,b] | null`. */
function makeImage(w, h, paint, { cell = 12, alpha = 255, bg = 'checker' } = {}) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const noise = ((x * 7 + y * 13) % 5) - 2;
      const base = bg === 'solid' ? [250, 250, 250] : (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? A : B;
      const c = paint(x, y) ?? base.map((v) => v + noise);
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = alpha;
    }
  }
  return { data, width: w, height: h };
}

const alphaAt = (img, x, y) => img.data[(y * img.width + x) * 4 + 3];
const colorAt = (img, x, y) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3));
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const RED = [210, 40, 40];

describe('nhận dạng nền', () => {
  it('nền ô vuông hai màu: kind checker, lấy đúng hai màu', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    const bg = analyzeBackground(img, 240, 240);
    expect(bg.kind).toBe('checker');
    const lum = bg.colors.map((c) => c[0]).sort((a, b) => a - b);
    expect(Math.abs(lum[0] - 154)).toBeLessThanOrEqual(3);
    expect(Math.abs(lum[1] - 219)).toBeLessThanOrEqual(3);
  });
  it('nền một màu: kind solid', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null), { bg: 'solid' });
    expect(analyzeBackground(img, 240, 240).kind).toBe('solid');
  });
  it('ảnh đã trong suốt thật (4 góc trong suốt): kind transparent', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) if (!inCircle(x, y, 120, 120, 60)) img.data[(y * 240 + x) * 4 + 3] = 0;
    expect(analyzeBackground(img, 240, 240).kind).toBe('transparent');
  });
  it('nền là cảnh (nhiều màu lộn xộn): kind none, không tách', () => {
    const img = makeImage(240, 240, (x, y) => [(x * 37 + y * 11) % 256, (x * 5 + y * 91) % 256, (x * 13 + y * 3) % 256]);
    expect(analyzeBackground(img, 240, 240).kind).toBe('none');
  });
});

describe('tách nền ô vuông', () => {
  it('hình tròn đỏ trên nền ô vuông: nền trong suốt, hình giữ nguyên', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    const r = autoCutout(img, 240, 240);
    expect(r.bg.kind).toBe('checker');
    // nền (cả ô sáng lẫn ô sậm, kể cả sát mép ảnh) trong suốt
    for (const [x, y] of [[0, 0], [239, 0], [0, 239], [239, 239], [6, 18], [18, 6], [120, 5], [30, 120], [210, 120]]) expect(alphaAt(img, x, y)).toBe(0);
    // hình ở giữa còn nguyên màu và đặc
    for (const [x, y] of [[120, 120], [90, 120], [150, 100], [120, 80]]) {
      expect(alphaAt(img, x, y)).toBe(255);
      expect(colorAt(img, x, y)).toEqual(RED);
    }
    // phần bị xóa xấp xỉ diện tích nền = 1 − πr²/(240²) ≈ 0,804
    expect(r.removed).toBeGreaterThan(0.79);
    expect(r.removed).toBeLessThan(0.82);
    // không còn điểm đặc nào mang màu ô vuông
    let leftovers = 0;
    for (let i = 0; i < 240 * 240; i++) {
      if (img.data[i * 4 + 3] > 128 && img.data[i * 4] < 235 && Math.abs(img.data[i * 4] - img.data[i * 4 + 1]) < 8) leftovers++;
    }
    expect(leftovers).toBe(0);
  });

  it('mép được làm mềm: có điểm ảnh alpha trung gian ở rìa hình, không có viền cứng', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    autoCutout(img, 240, 240);
    let partial = 0;
    for (let i = 0; i < 240 * 240; i++) if (img.data[i * 4 + 3] > 0 && img.data[i * 4 + 3] < 255) partial++;
    expect(partial).toBeGreaterThan(200);
    // hình co lại tối đa vài điểm ảnh
    expect(alphaAt(img, 120 + 56, 120)).toBeGreaterThan(200);
  });

  it('hình có vùng trắng bên trong không nối với mép: vùng trắng không bị xóa, kể cả khi trắng đúng màu ô sáng', () => {
    // vòng đỏ (bán kính 70 đến 40) bao một đĩa trắng đúng màu ô sáng
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 70) ? (inCircle(x, y, 120, 120, 40) ? A : RED) : null));
    autoCutout(img, 240, 240);
    expect(alphaAt(img, 120, 120)).toBe(255);
    expect(colorAt(img, 120, 120)).toEqual(A);
    expect(alphaAt(img, 100, 130)).toBe(255);
    expect(alphaAt(img, 5, 5)).toBe(0);
    expect(alphaAt(img, 120, 120 - 55)).toBe(255); // vòng đỏ vẫn còn
  });

  it('hình màu kem gần màu ô sáng và dính vào nền: không bị xóa nhầm (lọc theo độ sắc màu)', () => {
    const CREAM = [226, 220, 202];
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? CREAM : null));
    autoCutout(img, 240, 240);
    expect(alphaAt(img, 120, 120)).toBe(255);
    expect(colorAt(img, 120, 120)).toEqual(CREAM);
    expect(alphaAt(img, 5, 5)).toBe(0);
  });

  it('nền ô vuông lọt trong lỗ của hình (không nối mép) cũng được xóa', () => {
    // vòng đỏ dày (70 đến 35): lòng vòng vẫn là nền ô vuông
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 70) && !inCircle(x, y, 120, 120, 35) ? RED : null));
    autoCutout(img, 240, 240);
    expect(alphaAt(img, 120, 120)).toBe(0);
    expect(alphaAt(img, 110, 125)).toBe(0);
    expect(alphaAt(img, 120, 120 - 55)).toBe(255);
  });

  it('nền một màu: tách, giữ hình, giữ vùng trắng bên trong', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 70) ? (inCircle(x, y, 120, 120, 40) ? [250, 250, 250] : RED) : null), { bg: 'solid' });
    const r = autoCutout(img, 240, 240);
    expect(r.bg.kind).toBe('solid');
    expect(alphaAt(img, 3, 3)).toBe(0);
    expect(alphaAt(img, 120, 120)).toBe(255);
    expect(alphaAt(img, 120, 120 - 55)).toBe(255);
  });

  it('ảnh đã trong suốt thật hoặc nền là cảnh: không đụng tới (byte giữ nguyên)', () => {
    const t = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) if (!inCircle(x, y, 120, 120, 60)) t.data[(y * 240 + x) * 4 + 3] = 0;
    const before = Uint8Array.from(t.data);
    const r = autoCutout(t, 240, 240);
    expect(r.bg.kind).toBe('transparent');
    expect(Array.from(t.data)).toEqual(Array.from(before));

    const scene = makeImage(240, 240, (x, y) => [(x * 37 + y * 11) % 256, (x * 5 + y * 91) % 256, (x * 13 + y * 3) % 256]);
    const sceneBefore = Uint8Array.from(scene.data);
    expect(autoCutout(scene, 240, 240).bg.kind).toBe('none');
    expect(Array.from(scene.data)).toEqual(Array.from(sceneBefore));
  });
});

describe('đánh giá kết quả tách', () => {
  it('tách sạch: clean = true', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    const r = autoCutout(img, 240, 240);
    expect(assessCutout(img, 240, 240, r.bg, r.removed).clean).toBe(true);
  });
  it('xóa gần hết ảnh hoặc gần như không xóa gì: báo chưa sạch', () => {
    const img = makeImage(240, 240, (x, y) => (inCircle(x, y, 120, 120, 60) ? RED : null));
    const r = autoCutout(img, 240, 240);
    expect(assessCutout(img, 240, 240, r.bg, 0.99).clean).toBe(false);
    expect(assessCutout(img, 240, 240, r.bg, 0.01).clean).toBe(false);
  });
});

describe('xóa đốm lẻ và dấu mờ của công cụ tạo ảnh', () => {
  it('bụi nhỏ và ngôi sao ở góc dưới phải bị xóa; hình chính và mảnh rời lớn được giữ', () => {
    const w = 1000;
    const h = 700;
    const img = { data: new Uint8Array(w * h * 4), width: w, height: h };
    const dot = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const solid = dot(x, y, 400, 300, 80) || dot(x, y, 300, 80, 20) || dot(x, y, 20, 20, 3) || dot(x, y, 920, 620, 9);
        img.data[(y * w + x) * 4 + 3] = solid ? 255 : 0;
      }
    }
    const n = despeckle(img, w, h);
    expect(n).toBe(2);
    expect(alphaAt(img, 400, 300)).toBe(255);
    expect(alphaAt(img, 300, 80)).toBe(255); // mảnh rời lớn (ở xa góc dưới phải) còn
    expect(alphaAt(img, 20, 20)).toBe(0); // bụi
    expect(alphaAt(img, 920, 620)).toBe(0); // dấu mờ góc dưới phải
  });
});
