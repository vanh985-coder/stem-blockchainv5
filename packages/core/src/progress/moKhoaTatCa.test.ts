import { describe, expect, it } from 'vitest';
import { unlockConfig } from '../config/unlockConfig';
import { LEVELS } from '../content/levels';
import { knowBypassedByAuto } from './knowCards';
import { canEnterLevel, computeUnlock } from './unlock';

describe('cờ mở khóa tất cả (moKhoaTatCa)', () => {
  it('test chạy với cờ tắt (vitest.setup.ts); giá trị thật nằm ở config/unlockConfig.ts', () => {
    expect(unlockConfig.moKhoaTatCa).toBe(false);
  });

  it('cờ bật: mọi màn sẵn sàng đều mở, màn chưa chơi KHÔNG bị đánh dấu xong', () => {
    const r = computeUnlock({ doneLevels: [], openAll: true });
    for (const l of LEVELS) {
      const s = r.levels.find((u) => u.id === l.id)!;
      if (l.status === 'coming-soon') expect(s.state).toBe('coming-soon');
      else expect(s.state).toBe('open');
    }
    expect(r.goldenPages).toBe(0);
  });

  it('cờ bật: màn đã xong vẫn là xong, tiến độ và Trang Sổ Vàng không đổi', () => {
    const on = computeUnlock({ doneLevels: [3], openAll: true, goldenPages: 1 });
    const off = computeUnlock({ doneLevels: [3], openAll: false, goldenPages: 1 });
    expect(on.levels.find((u) => u.id === 3)?.state).toBe('done');
    expect(on.goldenPages).toBe(off.goldenPages);
  });

  it('cờ tắt: luật khóa cũ còn nguyên (màn 2 khóa bởi màn 1)', () => {
    const r = computeUnlock({ doneLevels: [], openAll: false });
    expect(r.levels.find((u) => u.id === 2)).toMatchObject({ state: 'locked', lockedBy: 1 });
  });

  it('canEnterLevel: cờ bật hay tắt', () => {
    expect(canEnterLevel({ id: 2, state: 'locked', lockedBy: 1 }, true)).toBe(true);
    expect(canEnterLevel({ id: 2, state: 'locked', lockedBy: 1 }, false)).toBe(false);
    expect(canEnterLevel({ id: 1, state: 'open' }, false)).toBe(true);
    expect(canEnterLevel({ id: 1, state: 'done' }, false)).toBe(true);
    expect(canEnterLevel({ id: 12, state: 'coming-soon' }, true)).toBe(false);
    expect(canEnterLevel(undefined, true)).toBe(true);
    expect(canEnterLevel(undefined, false)).toBe(false);
  });

  it('thẻ "Em có biết?" không chặn khi cờ bật', () => {
    expect(knowBypassedByAuto([], 'lang-giay', true)).toBe(true);
    expect(knowBypassedByAuto([], 'lang-giay', false)).toBe(false);
  });
});
