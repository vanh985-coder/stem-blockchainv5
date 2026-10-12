import { describe, expect, it } from 'vitest';
import {
  FPS_MIN,
  QUALITY_TABLE,
  autoQuality,
  createFpsTracker,
  effectiveDpr,
  isQualityChoice,
  lodDistance,
  lowerQuality,
  minQuality,
  resolveQuality,
  shouldDowngrade,
} from './quality';

const desktop = { coarsePointer: false, cores: 8, memoryGb: 8 };
const phone = { coarsePointer: true, cores: 8, memoryGb: 6 };

describe('bảng mức chất lượng (spec 03 mục 2)', () => {
  it('DPR 1 / 1.5 / 2 và bóng blob / 1024 / 2048', () => {
    expect(QUALITY_TABLE.low).toMatchObject({ dpr: 1, shadow: 'blob' });
    expect(QUALITY_TABLE.medium).toMatchObject({ dpr: 1.5, shadow: 1024 });
    expect(QUALITY_TABLE.high).toMatchObject({ dpr: 2, shadow: 2048 });
  });
  it('khoảng đổi bản xa: Thấp 12, Vừa 20, Cao 30', () => {
    expect(lodDistance('low')).toBe(12);
    expect(lodDistance('medium')).toBe(20);
    expect(lodDistance('high')).toBe(30);
  });
});

describe('hạ mức', () => {
  it('Cao -> Vừa -> Thấp -> Thấp', () => {
    expect(lowerQuality('high')).toBe('medium');
    expect(lowerQuality('medium')).toBe('low');
    expect(lowerQuality('low')).toBe('low');
  });
  it('ngưỡng FPS: dưới 40 thì hạ, đúng 40 thì giữ', () => {
    expect(FPS_MIN).toBe(40);
    expect(shouldDowngrade(39.9)).toBe(true);
    expect(shouldDowngrade(40)).toBe(false);
    expect(shouldDowngrade(60)).toBe(false);
  });
  it('minQuality lấy mức thấp hơn', () => {
    expect(minQuality('high', 'low')).toBe('low');
    expect(minQuality('medium', 'high')).toBe('medium');
  });
});

describe('chọn mức', () => {
  it('auto: điện thoại hoặc máy yếu thì Thấp, máy tính thường thì Vừa', () => {
    expect(autoQuality(phone)).toBe('low');
    expect(autoQuality({ coarsePointer: false, cores: 4 })).toBe('low');
    expect(autoQuality({ coarsePointer: false, cores: 8, memoryGb: 4 })).toBe('low');
    expect(autoQuality(desktop)).toBe('medium');
    expect(autoQuality({ coarsePointer: false })).toBe('medium');
  });
  it('chọn rõ thì dùng đúng mức đó, kể cả Cao', () => {
    expect(resolveQuality('high', phone)).toBe('high');
    expect(resolveQuality('low', desktop)).toBe('low');
    expect(resolveQuality('auto', phone)).toBe('low');
  });
  it('mức trần của phiên (sau khi FPS thấp) chặn mức muốn dùng', () => {
    expect(resolveQuality('high', desktop, 'medium')).toBe('medium');
    expect(resolveQuality('auto', desktop, 'low')).toBe('low');
    expect(resolveQuality('low', desktop, 'medium')).toBe('low');
    expect(resolveQuality('medium', desktop, undefined)).toBe('medium');
  });
  it('nhận dạng lựa chọn hợp lệ', () => {
    for (const v of ['auto', 'low', 'medium', 'high']) expect(isQualityChoice(v)).toBe(true);
    for (const v of ['thap', '', null, 3, undefined]) expect(isQualityChoice(v)).toBe(false);
  });
});

describe('DPR hiệu dụng', () => {
  it('không vượt bảng và không vượt devicePixelRatio của máy', () => {
    expect(effectiveDpr('low', 3)).toBe(1);
    expect(effectiveDpr('medium', 3)).toBe(1.5);
    expect(effectiveDpr('high', 3)).toBe(2);
    expect(effectiveDpr('high', 1)).toBe(1);
    expect(effectiveDpr('medium', 1.25)).toBe(1.25);
  });
  it('devicePixelRatio hỏng thì coi là 1', () => {
    expect(effectiveDpr('high', 0)).toBe(1);
    expect(effectiveDpr('high', Number.NaN)).toBe(1);
  });
});

describe('bộ đo FPS (3 giây đầu)', () => {
  /** Chạy bộ đo với khung hình đều đặn `fps`, trả về kết quả đầu tiên khác null và thời điểm có kết quả. */
  function run(fps: number, warmup = 500, windowMs = 3000) {
    const t = createFpsTracker(warmup, windowMs);
    const step = 1000 / fps;
    for (let now = 1000; now < 20000; now += step) {
      const r = t.tick(now);
      if (r !== null) return { r, at: now };
    }
    return null;
  }

  it('khung hình đều 60 FPS: ra ~60 và không phải hạ mức', () => {
    const res = run(60)!;
    expect(res.r).toBeCloseTo(60, 0);
    expect(shouldDowngrade(res.r)).toBe(false);
  });
  it('30 FPS: ra ~30 và phải hạ mức', () => {
    const res = run(30)!;
    expect(res.r).toBeCloseTo(30, 0);
    expect(shouldDowngrade(res.r)).toBe(true);
  });
  it('chỉ trả kết quả đúng một lần, sau warm-up 0,5 giây và đủ 3 giây', () => {
    const t = createFpsTracker();
    const results: number[] = [];
    for (let now = 0; now < 10000; now += 16) {
      const r = t.tick(now);
      if (r !== null) results.push(r);
    }
    expect(results).toHaveLength(1);
    expect(t.done).toBe(true);
    const res = run(60)!;
    // bắt đầu đo tại ~1500ms (khung đầu 1000ms + warm-up 500ms), kết thúc sau 3000ms
    expect(res.at - 1000).toBeGreaterThanOrEqual(3500 - 20);
    expect(res.at - 1000).toBeLessThanOrEqual(3500 + 40);
  });
  it('khung hình giật ở đầu (biên dịch shader) nằm trong warm-up thì không làm hạ mức oan', () => {
    const t = createFpsTracker();
    let now = 0;
    t.tick((now += 16));
    t.tick((now += 400)); // giật
    let result: number | null = null;
    while (result === null && now < 20000) result = t.tick((now += 16));
    expect(result).not.toBeNull();
    expect(shouldDowngrade(result!)).toBe(false);
  });
});
