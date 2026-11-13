import { describe, expect, it } from 'vitest';
import { validateScenes } from './director';
import { SCENE_IDS, SCENE_META } from './scenes/order';

describe('thứ tự cảnh demo (đợt 1: Làng Giấy)', () => {
  it('đúng thứ tự cốt truyện', () => {
    expect(SCENE_IDS).toEqual(['gioi-thieu', 'cho-den-lang-giay', 'giay-the', 'giay-man-1', 'giay-man-2', 'giay-man-3', 'giay-trao-trang']);
  });
  it('id không trùng và hạn giờ hợp lệ', () => {
    expect(validateScenes(SCENE_META)).toEqual([]);
  });
  it('validateScenes báo id trùng và hạn giờ xấu', () => {
    expect(validateScenes([{ id: 'a', timeoutMs: 1 }, { id: 'a', timeoutMs: 1 }])).toEqual(['duplicate scene id: a']);
    expect(validateScenes([{ id: 'b', timeoutMs: 0 }])).toEqual(['bad timeout: b']);
  });
});
