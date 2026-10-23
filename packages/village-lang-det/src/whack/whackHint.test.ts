import { describe, expect, it } from 'vitest';
import { HUONG_DAN_GAME, fmt, hintText } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { WHACK_SPEC } from './whackConfig';
import { answerBoss, createWhackGame, hitLane, spawnMouse, stepWhack, tickWhack, type WhackState } from './whackLogic';
import { FIRST_SECONDS, hintFor } from './whackHint';

const h = HUONG_DAN_GAME[5].nhac;
const ALLOWED = new Set<string>(Object.values(h));
const say = (s: Parameters<typeof hintFor>[0]) => fmt(hintText(5, hintFor(s)));

/** Ván ở trạng thái ngẫu nhiên: chơi ngẫu nhiên một lúc (đập, bỏ sót, trả lời trùm), đôi khi dừng giữa lượt trùm. */
function randomState(seed: number): WhackState {
  const rng = createMulberry32(seed * 8191 + 5);
  const s = createWhackGame(seed);
  const frames = Math.floor(rng() * 1800);
  for (let i = 0; i < frames && s.phase !== 'ended'; i++) {
    stepWhack(s, 1 / 60);
    if (s.phase === 'quiz') {
      if (rng() < 0.1) break; // dừng ngay giữa lượt trùm
      answerBoss(s, rng() < 0.7 ? 'correct' : 'wrong', Math.floor(rng() * 15));
    }
    if (rng() < 0.12) hitLane(s, Math.floor(rng() * WHACK_SPEC.lanes));
  }
  return s;
}

describe('màn 5: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: đầu ván, chạy, chuột to, đồng tiền, sổ sắp đầy, trùm chạy xuống, đang hỏi, hết ván', () => {
    const s = createWhackGame(3);
    expect(hintFor(s)).toEqual(['dauVan']);
    expect(say(s)).toBe('Đập chuột giấy khi nó vào vệt sáng ở cuối làn: phím D F J K hoặc chạm vào làn.');
    s.clock = FIRST_SECONDS + 1;
    expect(hintFor(s)).toEqual(['chay']);
    s.coin = { lane: 1, pos: 3, life: 2 };
    expect(hintFor(s)).toEqual(['dongTien']);
    spawnMouse(s, 'to', 2, 3);
    expect(hintFor(s)).toEqual(['chuotTo']);
    expect(say(s)).toBe('Chuột to phải đập 2 lần.');
    s.ink = WHACK_SPEC.inkMax - 2; // còn 2 chỗ trống trên sổ
    expect(hintFor(s)).toEqual(['soSapDay']);
    expect(say(s)).toBe('Sổ sắp đầy mực! Ưu tiên chuột gần sổ nhất.');
    s.ink = WHACK_SPEC.inkMax - 1; // còn 1 chỗ
    expect(hintFor(s)).toEqual(['soSapDay']);
    s.ink = WHACK_SPEC.inkMax - 3; // còn 3 chỗ: hết nhắc sổ sắp đầy
    expect(hintFor(s)).toEqual(['chuotTo']);
    s.phase = 'bossRun';
    expect(hintFor(s)).toEqual(['trumChay']);
    s.phase = 'quiz';
    expect(hintFor(s)).toEqual(['trumHoi']);
    expect(say(s)).toBe('Đọc câu hỏi rồi chọn đáp án — đúng thì đét được Tí và xoá 2 vết mực.');
    s.phase = 'ended';
    expect(hintFor(s)).toEqual(['hetVan']);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, chỉ có số của luật, không nói câu nào đúng hay làn nào cần đập', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomState(seed);
      const keys = hintFor(s);
      const text = hintText(5, keys);
      seen.add(keys.join('|'));
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      for (const k of keys) expect(Object.keys(h), `seed ${seed}`).toContain(k);
      // chỉ có số của luật (đập 2 lần, xoá 2 vết mực), không có số nào của đáp án
      for (const n of fmt(text).match(/\d+/g) ?? []) expect(n, `seed ${seed}: ${text}`).toBe('2');
      expect(fmt(text), `seed ${seed}`).not.toMatch(/làn (một|hai|ba|bốn|trái|phải|giữa)|đáp án (A|B|C|D)|chọn (A|B|C|D)|câu (A|B|C|D)/);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3); // các trạng thái ngẫu nhiên phủ nhiều câu khác nhau
  });

  it('câu nhắc của lượt trùm không lộ đáp án: giống nhau với mọi câu hỏi và mọi seed', () => {
    const outs = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = createWhackGame(seed);
      s.phase = 'quiz';
      outs.add(say(s));
    }
    expect(outs.size).toBe(1);
  });
});

describe('màn 5: tạm dừng thật', () => {
  it('tickWhack khi tạm dừng: không có gì đổi qua nhiều bước dt (chuột, đồng, đồng hồ lịch, đồng hồ trùm), kể cả giữa lượt trùm', () => {
    for (const phase of ['play', 'bossRun', 'quiz'] as const) {
      const s = createWhackGame(11);
      stepWhack(s, 2.3);
      spawnMouse(s, 'nhanh', 1, 4);
      s.coin = { lane: 0, pos: 3, life: 2 };
      if (phase !== 'play') {
        s.ticks = 1439;
        stepWhack(s, 0.01);
        if (phase === 'quiz') stepWhack(s, 2);
        expect(s.phase).toBe(phase);
      }
      const before = JSON.stringify({ ...s, rng: undefined });
      for (let i = 0; i < 600; i++) expect(tickWhack(s, 0.05, true)).toEqual([]);
      expect(JSON.stringify({ ...s, rng: undefined }), phase).toBe(before);
      if (phase === 'play') {
        // không tạm dừng thì chạy
        const clock = s.clock;
        tickWhack(s, 0.5, false);
        expect(s.clock).toBeGreaterThan(clock);
      }
    }
  });
});
