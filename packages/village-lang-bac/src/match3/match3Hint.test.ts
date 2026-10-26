import { describe, expect, it } from 'vitest';
import { HUONG_DAN_GAME, fmt, hintText } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { LOW_TURNS, hintFor } from './match3Hint';
import { advanceRound, createMatch3FromBoard, createMatch3Game, legalMoves, swapCells, type Match3State } from './match3Logic';

const h = HUONG_DAN_GAME[11].nhac;
const say = (s: Parameters<typeof hintFor>[0]) => fmt(hintText(11, hintFor(s)));
const ALLOWED = new Set<string>(Object.values(h));

/** Ván ở trạng thái ngẫu nhiên: vài nước đi hợp lệ, đôi khi sang vòng khác. */
function randomState(seed: number): Match3State {
  const rng = createMulberry32(seed * 104729 + 3);
  const s = createMatch3Game(seed);
  const steps = Math.floor(rng() * 60);
  for (let i = 0; i < steps && s.phase !== 'ended'; i++) {
    if (s.phase === 'roundEnd') {
      if (rng() < 0.6) advanceRound(s);
      else break;
      continue;
    }
    const moves = legalMoves(s.board);
    const m = moves[Math.floor(rng() * moves.length)];
    swapCells(s, m.a, m.b);
  }
  return s;
}

describe('màn 11: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: đầu ván, lá giả, hoa sen, gió xoáy, sắp hết lượt, hết vòng, hết ván', () => {
    const plain = createMatch3FromBoard('ABCDEFA / CDEFABC / EFABCDE / BCDEFAB / DEFABCD / FABCDEF / ABCDEFA', { slots: 'AAAA', turns: 12 });
    expect(hintFor(plain)).toEqual(['doiO', 'nhinCay']);
    expect(say(plain)).toBe('Đổi 2 ô kề nhau để có 3 lá cùng loại thẳng hàng. Nhìn cây: ô còn trống cần loại lá nào thì ưu tiên ghép loại đó.');
    const fake = createMatch3FromBoard('ABCDEFX / CDEFABC / EFABCDE / BCDEFAB / DEFABCD / FABCDEF / ABCDEFA', { slots: 'AAAA', turns: 12 });
    expect(hintFor(fake)).toEqual(['laGia']);
    expect(say(fake)).toBe('Lá giả của Tí biến mất khi có hàng nổ ngay sát bên.');
    const lotus = createMatch3FromBoard('ABCDEFa / CDEFABC / EFABCDE / BCDEFAB / DEFABCD / FABCDEF / ABCDEFA', { slots: 'AAAA', turns: 12 });
    expect(hintFor(lotus)).toEqual(['hoaSen']);
    const wind = createMatch3FromBoard('ABCDEFW / CDEFABC / EFABCDE / BCDEFAB / DEFABCD / FABCDEF / ABCDEFA', { slots: 'AAAA', turns: 12 });
    expect(hintFor(wind)).toEqual(['gioXoay']);
    expect(hintFor({ ...fake, turnsLeft: LOW_TURNS })).toEqual(['sapHet']);
    expect(say({ ...fake, turnsLeft: 1 })).toBe('Sắp hết lượt: ghép đúng loại lá cây còn thiếu.');
    expect(hintFor({ ...fake, turnsLeft: LOW_TURNS + 1 })).toEqual(['laGia']);
    expect(hintFor({ ...plain, phase: 'roundEnd' })).toEqual(['xongVong']);
    expect(hintFor({ ...plain, phase: 'ended' })).toEqual(['hetVan']);
  });

  it('300 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, không có số của đáp án, không chỉ ô, hàng, cột hay loại lá cụ thể', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = randomState(seed);
      const keys = hintFor(s);
      for (const k of keys) expect(Object.keys(h), `seed ${seed}`).toContain(k);
      const text = hintText(11, keys);
      expect(text.length, `seed ${seed}`).toBeGreaterThan(10);
      for (const part of keys) expect(ALLOWED.has(h[part]), `seed ${seed}: ${part}`).toBe(true);
      // chỉ có con số của luật ("2 ô kề", "3 lá", …), không chỉ vị trí hay loại lá
      for (const n of text.match(/\d+/g) ?? []) expect(['2', '3'], `seed ${seed}: ${text}`).toContain(n);
      expect(text, `seed ${seed}`).not.toMatch(/hàng \d|cột \d|ô \d|lá bàng|lá chuối|lá đa|lá sen|lá trầu|lá tre|bên trái|bên phải|phía trên|phía dưới/);
    }
  });

  it('mọi câu nhắc của màn 11 không chỉ nước đi cụ thể (không có tọa độ, tên loại lá, hay "đổi ô … với ô …")', () => {
    for (const text of ALLOWED) {
      expect(text).not.toMatch(/\d\s*,\s*\d|hàng \d|cột \d|lá bàng|lá chuối|lá đa|lá sen|lá trầu|lá tre/);
    }
  });
});
