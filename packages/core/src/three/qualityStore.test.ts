import { afterEach, describe, expect, it } from 'vitest';
import { getSessionCap, lowerSessionCap, resetSessionCap } from './qualityStore';
import { resolveQuality } from './quality';

const desktop = { coarsePointer: false, cores: 8, memoryGb: 8 };

describe('mức trần của phiên (sau khi FPS thấp)', () => {
  afterEach(resetSessionCap);

  it('ban đầu chưa có trần', () => {
    expect(getSessionCap()).toBeUndefined();
  });
  it('hạ từ Cao thì trần là Vừa, rồi từ Vừa thì trần là Thấp; Thấp giữ nguyên', () => {
    expect(lowerSessionCap('high')).toBe('medium');
    expect(getSessionCap()).toBe('medium');
    expect(lowerSessionCap('medium')).toBe('low');
    expect(lowerSessionCap('low')).toBe('low');
  });
  it('trần chặn mức dùng ở các cảnh sau, không đổi lựa chọn của người dùng', () => {
    lowerSessionCap('high');
    expect(resolveQuality('high', desktop, getSessionCap())).toBe('medium');
    expect(resolveQuality('low', desktop, getSessionCap())).toBe('low');
  });
});
