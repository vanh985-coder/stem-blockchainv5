import { describe, expect, it } from 'vitest';
import { fmt } from './characters';
import { gameHints } from './gameHints';

describe('gameHints (chữ giao diện của nút "?")', () => {
  it('dòng đầu hộp đổi {nd}; hai nút của hộp là "Xem hướng dẫn đầy đủ" và "Chơi tiếp"', () => {
    expect(fmt(gameHints.viecCuaEm, { nd: 'Lật 2 thẻ.' })).toBe('Việc của em lúc này: Lật 2 thẻ.');
    expect(gameHints.xemDayDu).toBe('Xem hướng dẫn đầy đủ');
    expect(gameHints.tiepTuc).toBe('Chơi tiếp');
    expect(gameHints.kyHieu).toBe('?');
  });
  it('các câu nhắc theo trạng thái KHÔNG nằm ở đây mà ở huongDanGame.ts', () => {
    expect(Object.keys(gameHints).sort()).toEqual(['kyHieu', 'macDinh', 'nut', 'tieuDe', 'tiepTuc', 'viecCuaEm', 'xemDayDu'].sort());
  });
});
