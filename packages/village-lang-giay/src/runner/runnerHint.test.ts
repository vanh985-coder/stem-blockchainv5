import { describe, expect, it } from 'vitest';
import { gameHints } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { createRunner, type RunnerState } from './runnerLogic';
import { RunnerSession } from './runnerSession';
import { FIRST_SECONDS, hintFor } from './runnerHint';

const h = gameHints.man2;
const ALLOWED = new Set<string>(Object.values(h));

/** Ván ở trạng thái ngẫu nhiên: chạy với lệnh ngẫu nhiên một lúc, đôi khi gán trạng thái để phủ mọi pha. */
function randomState(seed: number): RunnerState {
  const rng = createMulberry32(seed * 6151 + 7);
  const session = new RunnerSession({ seed });
  const frames = Math.floor(rng() * 900);
  for (let i = 0; i < frames && !session.over; i++) {
    if (rng() < 0.06) session.command((['left', 'right', 'jump', 'slide'] as const)[Math.floor(rng() * 4)]);
    session.update(1 / 60, false);
  }
  const s = session.state;
  if (rng() < 0.2) s.hearts = 1 + Math.floor(rng() * 3);
  if (rng() < 0.2) s.shield = rng() * 10;
  return s;
}

describe('màn 2: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: đầu ván, chạy, một tim, đồ hỗ trợ, chạy chậm, câu hỏi, đã trả lời, chạy tiếp', () => {
    const s = createRunner({ seed: 3 });
    expect(hintFor(s)).toBe(h.dauVan);
    s.roundTime = FIRST_SECONDS + 1;
    expect(hintFor(s)).toBe(h.chay);
    s.magnet = 5;
    expect(hintFor(s)).toBe(h.hoTro);
    s.hearts = 1;
    expect(hintFor(s)).toBe(h.motTim);
    s.phase = 'slow';
    expect(hintFor(s)).toBe(h.chamLai);
    s.phase = 'quiz';
    s.quiz = { round: 0, timeLeft: 10, answered: null, timedOut: false };
    expect(hintFor(s)).toBe(h.hoi);
    s.quiz = { round: 0, timeLeft: 5, answered: true, timedOut: false };
    expect(hintFor(s)).toBe(h.daTraLoi);
    s.phase = 'resume';
    expect(hintFor(s)).toBe(h.chayLai);
    s.phase = 'over';
    expect(hintFor(s)).toBe(h.het);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, không có số, không nói làn nào, vật cản nào sắp tới hay đáp án', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const text = hintFor(randomState(seed));
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      expect(text, `seed ${seed}`).not.toMatch(/\d/);
      expect(text, `seed ${seed}`).not.toMatch(/làn (trái|phải|giữa)|bên trái|bên phải|đáp án (A|B|C|D)|chọn (A|B|C|D)/);
    }
  });
});

describe('màn 2: tạm dừng thật', () => {
  it('RunnerSession.update khi tạm dừng: không bước nào chạy, trạng thái không đổi qua nhiều khung (kể cả lúc đang hỏi)', () => {
    const session = new RunnerSession({ seed: 21 });
    for (let i = 0; i < 120; i++) session.update(1 / 60, false);
    session.command('left');
    const before = JSON.stringify(session.state);
    const steps = session.steps;
    const time = session.time;
    for (let i = 0; i < 600; i++) expect(session.update(1 / 60, true)).toBe(0);
    expect(JSON.stringify(session.state)).toBe(before);
    expect(session.steps).toBe(steps);
    expect(session.time).toBe(time);
    // tiếp tục thì chạy lại
    session.update(0.5, false);
    expect(session.steps).toBeGreaterThan(steps);
  });

});
