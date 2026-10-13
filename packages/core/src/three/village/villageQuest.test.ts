import { describe, expect, it } from 'vitest';
import type { LevelState } from '../../progress/unlock';
import { boardBadge, guideTopic, lockedBy, nextLevel } from './villageQuest';

const IDS = [1, 2, 3] as const;
const states = (m: Record<number, LevelState>) => (id: number) => m[id];

describe('việc tiếp theo ở cảnh làng', () => {
  it('là màn đầu tiên đang mở; chưa làm gì thì là màn 1', () => {
    expect(nextLevel(IDS, states({ 1: 'open', 2: 'locked', 3: 'locked' }))).toBe(1);
  });
  it('màn 1 xong, màn 2 và 3 sắp ra mắt thì không còn việc (không chặn, không bắt chờ)', () => {
    expect(nextLevel(IDS, states({ 1: 'done', 2: 'coming-soon', 3: 'coming-soon' }))).toBeNull();
  });
  it('màn sắp ra mắt ở giữa không chặn màn sau đã mở', () => {
    expect(nextLevel(IDS, states({ 1: 'done', 2: 'coming-soon', 3: 'open' }))).toBe(3);
  });
  it('màn chưa biết trạng thái thì bỏ qua', () => {
    expect(nextLevel(IDS, states({}))).toBeNull();
  });
});

describe('chủ đề người dẫn nhắc', () => {
  it('theo vị trí của việc tiếp theo: bài học, game 1, game 2; hết việc là done', () => {
    expect(guideTopic(IDS, 1)).toBe('lesson');
    expect(guideTopic(IDS, 2)).toBe('game1');
    expect(guideTopic(IDS, 3)).toBe('game2');
    expect(guideTopic(IDS, null)).toBe('done');
    expect(guideTopic(IDS, 99)).toBe('done');
  });
});

describe('khóa và dải trạng thái trên biển', () => {
  it('lockedBy trả về màn cần xong trước', () => {
    const lv = [
      { id: 1, state: 'done' as const },
      { id: 2, state: 'locked' as const, lockedBy: 1 },
    ];
    expect(lockedBy(2, lv)).toBe(1);
    expect(lockedBy(1, lv)).toBeUndefined();
    expect(lockedBy(7, lv)).toBeUndefined();
  });
  it('dải: xong, khóa, sắp ra mắt; đang mở thì không có dải', () => {
    expect(boardBadge('done')).toBe('xong');
    expect(boardBadge('locked')).toBe('khoa');
    expect(boardBadge(undefined)).toBe('khoa');
    expect(boardBadge('coming-soon')).toBe('sap');
    expect(boardBadge('open')).toBeNull();
  });
});
