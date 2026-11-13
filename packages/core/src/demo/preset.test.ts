import { describe, expect, it } from 'vitest';
import { parseManList } from './config';
import { buildDemoPreset, prerequisiteLevels } from './preset';
import { listSceneMeta } from './scenes/order';

describe('parseManList', () => {
  it('đọc danh sách, giữ thứ tự, bỏ trùng và mục lạ', () => {
    expect(parseManList('1,2,5,10')).toEqual([1, 2, 5, 10]);
    expect(parseManList('5')).toEqual([5]);
    expect(parseManList('10, 5,10,0,13,x,2.5')).toEqual([10, 5]);
  });
  it('rỗng hay toàn mục lạ thì null', () => {
    expect(parseManList(null)).toBeNull();
    expect(parseManList('')).toBeNull();
    expect(parseManList('a,99')).toBeNull();
  });
});

describe('tiến độ đặt sẵn', () => {
  it('màn trước trong làng phải xong, màn trong danh sách thì không', () => {
    expect(prerequisiteLevels([1, 2, 5, 10])).toEqual([4]);
    expect(prerequisiteLevels([2])).toEqual([1]);
    expect(prerequisiteLevels([1])).toEqual([]);
    expect(prerequisiteLevels([10])).toEqual([]);
    expect(prerequisiteLevels([12])).toEqual([10, 11]);
  });
  it('thẻ Em có biết đủ ở các làng có màn trong danh sách, làng khác không', () => {
    const p = buildDemoPreset([1, 2, 5, 10], 123);
    expect(p.kc).toEqual([15, 15, 0, 15]);
    expect(p.st).toBe(1);
    expect(p.gp).toBe(0);
    expect(p.lv).toEqual({ '4': [1, 1, 3, 3, 3] });
    expect(p.u).toBe(123);
  });
  it('màn game ở trước thì có mốc game, màn bài học có đủ sao', () => {
    const p = buildDemoPreset([3], 1);
    expect(p.lv['1']).toEqual([1, 1, 3, 3, 3]);
    expect(p.lv['2']).toEqual([1, 1, 1, 0]);
  });
});

describe('cảnh của chế độ danh sách', () => {
  it('mỗi màn một màn chuyển rồi một cảnh chơi, đúng thứ tự', () => {
    expect(listSceneMeta([1, 2, 5, 10]).map((s) => s.id)).toEqual(['chuyen-1', 'man-1', 'chuyen-2', 'man-2', 'chuyen-5', 'man-5', 'chuyen-10', 'man-10']);
    expect(listSceneMeta([5]).map((s) => s.id)).toEqual(['chuyen-5', 'man-5']);
  });
});
