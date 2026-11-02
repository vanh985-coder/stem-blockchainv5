import { describe, expect, it } from 'vitest';
import {
  FIT_NATURAL_MAX_WIDTH,
  FIT_NATURAL_MIN_WIDTH,
  FIT_SCALE_FLOOR,
  FIT_SCALE_MAX,
  fitLayoutWidth,
  fitScaleFor,
  minFitScale,
  pixelUnit,
  settleScale,
} from './fitScale';

describe('fitLayoutWidth', () => {
  it('lấy bề rộng khung, tối đa 1100 và tối thiểu 320', () => {
    expect(fitLayoutWidth(900)).toBe(900);
    expect(fitLayoutWidth(2866)).toBe(FIT_NATURAL_MAX_WIDTH);
    expect(fitLayoutWidth(200)).toBe(FIT_NATURAL_MIN_WIDTH);
    expect(fitLayoutWidth(0)).toBe(FIT_NATURAL_MIN_WIDTH);
    expect(fitLayoutWidth(Number.NaN)).toBe(FIT_NATURAL_MIN_WIDTH);
  });
});

describe('minFitScale', () => {
  it('chữ 12 px cần phóng 14/12; nút 40 px cần 44/40; lấy số lớn hơn', () => {
    expect(minFitScale(12, 60)).toBeCloseTo(14 / 12, 6);
    expect(minFitScale(16, 40)).toBeCloseTo(44 / 40, 6);
    expect(minFitScale(12, 30)).toBeCloseTo(44 / 30, 6);
  });
  it('chữ và nút đã đủ lớn thì tỉ lệ tối thiểu nhỏ hơn 1, nhưng không dưới sàn', () => {
    expect(minFitScale(16, 48)).toBeCloseTo(44 / 48, 6);
    expect(minFitScale(100, 1000)).toBe(FIT_SCALE_FLOOR);
  });
  it('số đo không hợp lệ thì bỏ qua điều kiện đó; không vượt tỉ lệ lớn nhất', () => {
    expect(minFitScale(0, Number.NaN)).toBe(FIT_SCALE_FLOOR);
    expect(minFitScale(14, 0)).toBe(1);
    expect(minFitScale(2, 100)).toBe(FIT_SCALE_MAX);
  });
});

describe('fitScaleFor', () => {
  const base = { availW: 1000, availH: 700, naturalW: 1000, naturalH: 700, minScale: 0.9 };
  it('vừa khít thì tỉ lệ 1, không cuộn', () => {
    const r = fitScaleFor(base);
    expect(r.scale).toBeCloseTo(0.9971, 3); // chừa 2 px chiều cao
    expect(r.scrolls).toBe(false);
  });
  it('lấy min(rộng, cao): cao hơn khung thì thu nhỏ theo chiều cao', () => {
    const r = fitScaleFor({ ...base, naturalH: 1000, minScale: 0.5 });
    expect(r.scale).toBeCloseTo(0.698, 6);
    expect(r.scrolls).toBe(false);
  });
  it('lấy min(rộng, cao): rộng hơn khung thì thu nhỏ theo chiều rộng', () => {
    const r = fitScaleFor({ ...base, availW: 800, minScale: 0.5 });
    expect(r.scale).toBeCloseTo(0.8, 6);
  });
  it('khung rộng thoáng thì phóng, nhưng không quá 1,6', () => {
    expect(fitScaleFor({ ...base, availW: 1500, availH: 1000 }).scale).toBeCloseTo(1.4257, 3);
    expect(fitScaleFor({ ...base, availW: 3000, availH: 3000 }).scale).toBe(FIT_SCALE_MAX);
  });
  it('chạm tỉ lệ tối thiểu mà vẫn cao quá thì giữ tối thiểu và cuộn dọc', () => {
    const r = fitScaleFor({ ...base, naturalH: 1400, minScale: 0.9 });
    expect(r.scale).toBe(0.9);
    expect(r.scrolls).toBe(true);
  });
  it('tối thiểu lớn hơn 1 thì không bao giờ thu nhỏ dưới nó', () => {
    const r = fitScaleFor({ ...base, naturalW: 2000, minScale: 1.17 });
    expect(r.scale).toBeCloseTo(1.17, 6);
  });
  it('số đo hỏng thì trả tỉ lệ an toàn, không NaN', () => {
    const r = fitScaleFor({ availW: 0, availH: 0, naturalW: 0, naturalH: 0, minScale: 0.8 });
    expect(Number.isFinite(r.scale)).toBe(true);
    expect(r.scale).toBe(1);
  });
});

describe('settleScale', () => {
  it('lần đầu làm tròn xuống 3 chữ số', () => {
    expect(settleScale(null, 0.87654)).toBe(0.876);
  });
  it('khác dưới 0,004 thì giữ cũ (không giật)', () => {
    expect(settleScale(1, 1.003)).toBe(1);
    expect(settleScale(1, 0.997)).toBe(1);
  });
  it('khác nhiều thì lấy số mới', () => {
    expect(settleScale(1, 1.05)).toBe(1.05);
  });
});

describe('pixelUnit', () => {
  it('máy tính: px vật lý trên mỗi px CSS (từ 1 trở lên)', () => {
    expect(pixelUnit(1.5, false)).toBe(1.5);
    expect(pixelUnit(0.67, false)).toBe(1);
    expect(pixelUnit(Number.NaN, false)).toBe(1);
  });
  it('màn cảm ứng: luôn px CSS', () => {
    expect(pixelUnit(3, true)).toBe(1);
  });
});
