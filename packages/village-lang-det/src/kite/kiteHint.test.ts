import { describe, expect, it } from 'vitest';
import { HUONG_DAN_GAME, fmt, hintText } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { KITE_SPEC } from './kiteConfig';
import { FIRST_SECONDS, hintFor } from './kiteHint';
import { answerGate, createKiteGame, flap, gateXOf, stepKite, tickKite, type KiteState } from './kiteLogic';

const h = HUONG_DAN_GAME[6].nhac;
const ALLOWED = new Set<string>(Object.values(h));
const say = (s: Parameters<typeof hintFor>[0]) => fmt(hintText(6, hintFor(s)));

/** Ván ở trạng thái ngẫu nhiên: bay tự động một lúc (bật theo nhịp ngẫu nhiên), đôi khi dừng ở cổng. */
function randomState(seed: number): KiteState {
  const rng = createMulberry32(seed * 7919 + 3);
  const s = createKiteGame(seed);
  if (rng() < 0.15) return s; // còn ở pha sẵn sàng
  flap(s);
  const frames = Math.floor(rng() * 3000);
  for (let i = 0; i < frames && s.phase !== 'ended'; i++) {
    if (s.phase === 'quiz') {
      if (rng() < 0.3) break; // dừng ngay ở cổng
      answerGate(s, rng() < 0.7 ? 'correct' : 'wrong');
      continue;
    }
    const g = s.gaps[Math.min(s.passed, s.gaps.length - 1)];
    if (s.y + s.vy * 0.1 < g.center - 0.5 || rng() < 0.05) flap(s);
    stepKite(s, 1 / 60);
  }
  return s;
}

describe('màn 6: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: đầu ván, chạy, diều đen ở khe kế, cổng phía trước, còn một tim, đang hỏi, hết ván', () => {
    const s = createKiteGame(3);
    expect(hintFor(s)).toEqual(['dauVan']);
    expect(say(s)).toBe('Chạm để diều bật lên, thả ra để diều hạ xuống. Bay qua khe giữa hai cột tre.');
    flap(s);
    s.time = FIRST_SECONDS + 1;
    s.x = 12; // sau khe 1, trước khe 2 (x = 13): chưa có diều đen (từ khe 8), cổng 1 còn xa
    s.passed = 1;
    expect(hintFor(s)).toEqual(['chay']);
    expect(say(s)).toBe('Giữ nhịp bật đều để diều bay giữa khe, đừng chạm cột, đất hay trần.');
    // cổng 1 cách dưới 9
    s.x = gateXOf(s, 0) - 5;
    s.passed = 5;
    expect(hintFor(s)).toEqual(['cong']);
    expect(say(s)).toBe('Cổng làng phía trước: trả lời đúng để giao sổ.');
    // diều đen ở khe kế (khe 8 có diều đen với seed này hay không: dựng tay)
    const g8 = s.gaps[7];
    s.gaps[7] = { ...g8, black: { side: 'top', phase: 0, range: 0.4 } };
    s.passed = 7;
    s.x = g8.x - 3;
    expect(hintFor(s)).toEqual(['dieuDen']);
    expect(say(s)).toBe('Diều đen của Tí phía trước: bay qua phần trống lớn hơn.');
    s.hearts = 1;
    expect(hintFor(s)).toEqual(['motTim']);
    expect(say(s)).toBe('Em chỉ còn một tim: bật nhẹ, nhịp đều.');
    s.phase = 'quiz';
    expect(hintFor(s)).toEqual(['cauHoi']);
    expect(say(s)).toBe('Đọc câu hỏi rồi chọn đáp án — đúng thì cổng mở đón sổ.');
    s.phase = 'ended';
    expect(hintFor(s)).toEqual(['hetVan']);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, không nói đáp án câu hỏi nào đúng, không có số nào của đáp án', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomState(seed);
      const keys = hintFor(s);
      const text = hintText(6, keys);
      seen.add(keys.join('|'));
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      for (const k of keys) expect(Object.keys(h), `seed ${seed}`).toContain(k);
      for (const n of fmt(text).match(/\d+/g) ?? []) expect(n, `seed ${seed}: ${text}`).toBe('1');
      expect(fmt(text), `seed ${seed}`).not.toMatch(/đáp án (A|B|C|D)|chọn (A|B|C|D)|câu (A|B|C|D)/);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('câu nhắc ở cổng không lộ đáp án: giống nhau với mọi câu hỏi và mọi seed', () => {
    const outs = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = createKiteGame(seed);
      s.phase = 'quiz';
      outs.add(say(s));
    }
    expect(outs.size).toBe(1);
  });
});

describe('màn 6: tạm dừng thật', () => {
  it('tickKite khi tạm dừng: không có gì đổi qua nhiều bước dt (vật lý, đồng hồ ván, tốc độ cuộn), kể cả lúc ở cổng', () => {
    for (const phase of ['play', 'quiz'] as const) {
      const s = createKiteGame(11);
      flap(s);
      s.inv = 5;
      stepKite(s, 0.7);
      if (phase === 'quiz') {
        s.passed = 6;
        s.x = gateXOf(s, 0) - 0.01;
        s.y = s.gaps[6].center;
        stepKite(s, 0.1);
        expect(s.phase).toBe('quiz');
      }
      const before = JSON.stringify(s);
      for (let i = 0; i < 600; i++) expect(tickKite(s, 0.05, true)).toEqual([]);
      expect(JSON.stringify(s), phase).toBe(before);
      if (phase === 'play') {
        const x = s.x;
        tickKite(s, 0.5, false);
        expect(s.x).toBeGreaterThan(x);
      }
    }
    expect(KITE_SPEC.hearts).toBeGreaterThan(1);
  });
});
