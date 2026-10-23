import { describe, expect, it } from 'vitest';
import { fmt, gameHints } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MEMORY_SPEC } from './memoryConfig';
import { advanceRound, createMemoryGame, flipCard, makeDeck, stepMemory, tickMemory, type MemoryState } from './memoryLogic';
import { hintFor } from './memoryHint';

const h = gameHints.man8;
const ALLOWED = new Set<string>([
  h.chuaLat,
  h.catKhuon,
  h.catMau,
  h.luatSai,
  h.xongVong,
  h.het,
  ...[h.chuaLat, h.catKhuon, h.catMau, h.luatSai].map((s) => `${s} ${h.vong3}`),
]);
/** Số có trong câu nhắc đều là số của luật (5^x mod 23, 20 giây, lật 2 thẻ), không phải số của đáp án */
const RULE_NUMBERS = new Set(['2', '5', '20', '23']);

/** Ván ở trạng thái ngẫu nhiên: vòng ngẫu nhiên, vài lượt lật ngẫu nhiên, đôi khi để đồng hồ úp lại chạy. */
function randomState(seed: number): MemoryState {
  const rng = createMulberry32(seed * 7919 + 1);
  const s = createMemoryGame(seed);
  const round = Math.floor(rng() * 3);
  while (s.round < round) {
    s.phase = 'roundDone';
    advanceRound(s);
  }
  s.cards = makeDeck(rng, MEMORY_SPEC.rounds[round].pairs);
  const flips = Math.floor(rng() * 12);
  for (let i = 0; i < flips && s.phase === 'playing'; i++) {
    flipCard(s, Math.floor(rng() * s.cards.length));
    if (rng() < 0.3) stepMemory(s, rng() * 1500);
  }
  if (rng() < 0.1) s.phase = 'roundDone';
  if (rng() < 0.05) s.phase = 'gameOver';
  return s;
}

describe('màn 8: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: chưa lật, đang cầm Khuôn tập, đang cầm Mẫu công khai; vòng 3 thêm câu tráo thẻ', () => {
    const s = createMemoryGame(5);
    expect(hintFor(s)).toBe('Lật 2 thẻ. Tìm cặp Khuôn tập x và Mẫu công khai 5^x mod 23.');
    const khuon = s.cards.findIndex((c) => c.type === 'khuon');
    flipCard(s, khuon);
    expect(hintFor(s)).toBe('Em đang cầm Khuôn tập. Tìm thẻ Mẫu công khai bằng 5^x mod 23 — bấm Máy tính mod nếu cần.');
    s.flippedIndices = [];
    s.cards[khuon].isFlipped = false;
    flipCard(s, s.cards.findIndex((c) => c.type === 'mau'));
    expect(hintFor(s)).toBe('Tìm thẻ Khuôn tập x có 5^x mod 23 bằng số này.');
    s.round = 2;
    expect(fmt(hintFor(s), { phanDien: 'Tí' })).toBe('Tìm thẻ Khuôn tập x có 5^x mod 23 bằng số này. Tí tráo 2 thẻ đang úp mỗi 20 giây.');
    expect(hintFor({ ...s, round: 0, phase: 'roundDone' })).toBe(h.xongVong);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, chỉ chứa số của luật, không nói thẻ, số hay vị trí của đáp án', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomState(seed);
      const text = hintFor(s);
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      for (const n of text.match(/\d+/g) ?? []) expect(RULE_NUMBERS.has(n), `seed ${seed}: ${text}`).toBe(true);
      expect(text, `seed ${seed}`).not.toMatch(/hàng|cột|thứ nhất|thứ hai|bên trái|bên phải|ô số/);
      // vòng 3 mới có câu tráo thẻ
      expect(text.includes(h.vong3), `seed ${seed}`).toBe(s.round === 2 && s.phase !== 'roundDone' && s.phase !== 'gameOver');
    }
  });

  it('câu nhắc không đổi theo thẻ nào đang úp ở đâu: cùng trạng thái lật thì cùng câu với mọi ván (không lộ đáp án qua vị trí)', () => {
    const outs = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) outs.add(hintFor(createMemoryGame(seed)));
    expect(outs.size).toBe(1);
  });
});

describe('màn 8: tạm dừng thật', () => {
  it('tickMemory khi tạm dừng: không có gì đổi qua nhiều bước dt (đồng hồ úp lại và đồng hồ tráo thẻ đứng yên)', () => {
    const s = createMemoryGame(9);
    s.round = 2;
    s.cards = makeDeck(createMulberry32(3), 8);
    // lật sai để có đồng hồ úp lại
    const a = s.cards.findIndex((c) => c.type === 'khuon');
    const b = s.cards.findIndex((c, i) => c.type === 'khuon' && i !== a);
    flipCard(s, a);
    flipCard(s, b);
    expect(s.waitingFlipBack).toBe(true);
    s.swapTimerMs = 7777;
    const before = JSON.stringify({ ...s, rng: undefined });
    for (let i = 0; i < 400; i++) expect(tickMemory(s, 100, true)).toEqual([]);
    expect(JSON.stringify({ ...s, rng: undefined })).toBe(before);
    expect(s.swapTimerMs).toBe(7777);
    // không tạm dừng thì đồng hồ chạy
    tickMemory(s, 100, false);
    expect(s.flipBackTimerMs).toBeLessThan(MEMORY_SPEC.flipBackDelayMs);
    tickMemory(s, 3000, false);
    expect(s.waitingFlipBack).toBe(false);
  });
});
