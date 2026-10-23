import { describe, expect, it } from 'vitest';
import { gameHints } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { advance, beginKeep, binCard, binFromSlot, createRebuild, insertFake, placeCard, placeInSlot, stepKeep, type RebuildState } from './rebuildLogic';
import { hintFor } from './rebuildHint';

const h = gameHints.man3;
const ALLOWED = new Set<string>(Object.values(h));

/** Ván ở trạng thái ngẫu nhiên: chơi ngẫu nhiên qua các vòng bằng thao tác của học sinh. */
function randomState(seed: number): RebuildState {
  const rng = createMulberry32(seed * 3571 + 11);
  const s = createRebuild(seed);
  const steps = Math.floor(rng() * 90);
  for (let i = 0; i < steps && s.phase !== 'over'; i++) {
    if (s.phase === 'villain') insertFake(s);
    else if (s.phase === 'roundDone') advance(s);
    else if (s.phase === 'play') {
      const c = s.tray[Math.floor(rng() * s.tray.length)];
      if (!c) continue;
      if (rng() < 0.15) binCard(s, c.id);
      else placeCard(s, c.id);
    } else if (s.phase === 'keep' && s.keep) {
      if (!s.keep.running) beginKeep(s);
      stepKeep(s, rng() * 3);
      const k = s.keep;
      if (k && rng() < 0.5) {
        const slot = Math.floor(rng() * k.slots.length);
        if (k.slots[slot]) binFromSlot(s, slot);
        else {
          const c = s.tray[Math.floor(rng() * s.tray.length)];
          if (c) placeInSlot(s, c.id, slot);
        }
      }
    }
  }
  return s;
}

describe('màn 3: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: nhét trang, bắt đầu, ghép, có trang giả, giữ sổ chưa chạy, ô trống, giữ sổ, xong vòng, hết ván', () => {
    const s = createRebuild(4);
    expect(s.phase).toBe('play');
    expect(hintFor(s)).toBe(h.batDau);
    s.chain = [s.deal.real[0]];
    expect(hintFor(s)).toBe(h.ghep);
    s.deal = { ...s.deal, fake: s.deal.real[1] };
    expect(hintFor(s)).toBe(h.coTrangGia);
    s.fakeBinned = true;
    expect(hintFor(s)).toBe(h.ghep);
    s.phase = 'villain';
    expect(hintFor(s)).toBe(h.nhetTrang);
    s.phase = 'roundDone';
    expect(hintFor(s)).toBe(h.xongVong);
    s.phase = 'over';
    expect(hintFor(s)).toBe(h.het);
  });

  it('vòng giữ sổ: chưa bắt đầu, có ô trống, chuỗi đầy', () => {
    const s = createRebuild(6);
    s.round = 2;
    s.phase = 'keep';
    s.keep = { running: false, elapsed: 0, nextSwapAt: 6, swapCount: 0, slots: [...s.deal.real], swappedAt: s.deal.real.map(() => -1), hinted: s.deal.real.map(() => false), decoyOf: s.deal.real.map(() => null), fixed: 0, fast: 0 };
    expect(hintFor(s)).toBe(h.giuSoChuaChay);
    s.keep.running = true;
    expect(hintFor(s)).toBe(h.giuSo);
    s.keep.slots[2] = null;
    expect(hintFor(s)).toBe(h.oTrong);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, không có số, không nói thẻ nào hay ô nào', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomState(seed);
      const text = hintFor(s);
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      expect(text, `seed ${seed}`).not.toMatch(/\d/);
      expect(text, `seed ${seed}`).not.toMatch(/ô (thứ|số) |thẻ (thứ|số) |bên trái|bên phải/);
    }
  });
});
