import { describe, expect, it } from 'vitest';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { AVERAGE_BOT, GOOD_BOT, findIdealRun, replayRun, simulateKite } from './kiteBots';
import { KITE_SPEC as C } from './kiteConfig';
import {
  answerGate,
  blackBox,
  blackRange,
  createKiteGame,
  flap,
  freeSpace,
  gapHeight,
  gapX,
  gateXOf,
  generateGaps,
  kiteBox,
  scoreOf,
  speedAt,
  stepKite,
  tickKite,
  type Gap,
  type KiteState,
} from './kiteLogic';

const H = C.tick;
const EPS = 1e-9;

/** Ván đã bắt đầu (qua `ready`) ở giữa khe 1, chưa bật. */
function started(seed: number, opts?: Parameters<typeof createKiteGame>[1]): KiteState {
  const s = createKiteGame(seed, opts);
  s.phase = 'play';
  return s;
}

/** Nhiều khe để thử thống kê: ghép nhiều seed. */
function manyGaps(seeds: number, perSeed: number): Gap[] {
  const out: Gap[] = [];
  for (let seed = 1; seed <= seeds; seed++) out.push(...generateGaps(createMulberry32(seed), perSeed));
  return out;
}

describe('bảng test của spec 06 mục "Màn 6" (kiteLogic.ts)', () => {
  it('vừa bật lên, sau 0,1 giây vận tốc đứng 4,1 (5,5 − 14 × 0,1)', () => {
    const s = createKiteGame(1);
    expect(s.phase).toBe('ready');
    flap(s);
    expect(s.vy).toBe(C.flapVelocity);
    stepKite(s, 0.1);
    expect(s.vy).toBeCloseTo(4.1, 9);
    expect(s.hearts).toBe(3);
  });

  it('chiều cao khe: đạt 2,4 ở khe thứ 20 và không nhỏ hơn; trước đó mỗi khe hẹp đi 0,04', () => {
    expect(gapHeight(20)).toBeCloseTo(2.4, 9);
    for (let k = 20; k <= 1000; k++) expect(gapHeight(k)).toBeGreaterThanOrEqual(2.4 - EPS);
    for (let k = 20; k <= 1000; k++) expect(gapHeight(k)).toBeCloseTo(2.4, 9);
    for (let k = 1; k < 20; k++) {
      expect(gapHeight(k) - gapHeight(k + 1)).toBeCloseTo(0.04, 9);
      expect(gapHeight(k)).toBeGreaterThan(2.4);
    }
    expect(gapHeight(1)).toBeLessThanOrEqual(3.2);
    const gaps = generateGaps(createMulberry32(3), 40);
    for (const g of gaps) expect(g.height).toBeCloseTo(gapHeight(g.k), 9);
  });

  it('sinh 1000 khe: khe luôn nằm trong [0,5; 9,5] (nhiều seed)', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const gaps = generateGaps(createMulberry32(seed), 1000);
      expect(gaps).toHaveLength(1000);
      for (const g of gaps) {
        expect(g.bottom).toBeGreaterThanOrEqual(0.5 - EPS);
        expect(g.top).toBeLessThanOrEqual(9.5 + EPS);
        expect(g.top - g.bottom).toBeCloseTo(g.height, 9);
        expect(g.center).toBeCloseTo((g.top + g.bottom) / 2, 9);
      }
    }
  });

  it('diều đen: không xuất hiện trước khe 8; luôn chừa khoảng trống ≥ 1,4 ở mọi thời điểm (lấy mẫu dày 0,01 giây trong 12 giây, hơn 7 chu kỳ)', () => {
    let blackCount = 0;
    let worst = Infinity;
    let inside = true;
    for (let seed = 1; seed <= 3; seed++) {
      const gaps = generateGaps(createMulberry32(seed), 1000);
      for (const g of gaps) {
        if (g.k < 8) expect(g.black, `khe ${g.k}`).toBeNull();
        if (!g.black) continue;
        blackCount++;
        for (let t = 0; t <= 12; t += 0.01) {
          worst = Math.min(worst, freeSpace(g, t));
          const bb = blackBox(g, t)!;
          // diều đen nằm trọn trong khe và cao đúng 0,6
          if (bb.y0 < g.bottom - EPS || bb.y1 > g.top + EPS || Math.abs(bb.y1 - bb.y0 - C.black.height) > 1e-9) inside = false;
        }
      }
    }
    expect(blackCount).toBeGreaterThan(500);
    expect(inside).toBe(true);
    expect(worst).toBeGreaterThanOrEqual(1.4);
    // khe hẹp nhất (2,4): dải dao động chỉ 0,4
    expect(blackRange(2.4)).toBeCloseTo(0.4, 6);
    expect(blackRange(2.4)).toBeLessThanOrEqual(0.4);
  });

  it('cổng làng ở sau khe 6, 12, 18, 24; qua cổng thứ 4 là thắng', () => {
    const s = started(7);
    expect(s.gateAfter).toEqual([6, 12, 18, 24]);
    for (let g = 0; g < 4; g++) {
      // đặt diều ngay trước cổng, sau khe `gateAfter[g]` và (bất tử) để không vướng cột
      const after = s.gateAfter[g];
      const gate = gateXOf(s, g);
      expect(gate).toBeCloseTo(gapX(after) + C.gates.offset, 9);
      expect(gate).toBeGreaterThan(gapX(after));
      expect(gate).toBeLessThan(gapX(after + 1));
      s.passed = after;
      s.x = gate - 0.01;
      s.y = s.gaps[Math.min(after, s.gaps.length - 1)].center;
      s.vy = 0;
      s.inv = 10;
      const events = stepKite(s, 0.1);
      expect(events.some((e) => e.type === 'gate' && e.gate === g), `cổng ${g + 1}`).toBe(true);
      expect(s.phase).toBe('quiz');
      const out = answerGate(s, 'correct');
      expect(out.some((e) => e.type === 'gateAnswer')).toBe(true);
      if (g < 3) expect(s.phase).toBe('play');
    }
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('complete');
    expect(s.gatesDone).toBe(4);
    expect(s.correct).toBe(4);
  });
});

describe('luật chơi (kiteLogic.ts)', () => {
  it('trước lần bật đầu tiên ván chưa chạy (pha ready); lần bật đầu tiên bắt đầu ván', () => {
    const s = createKiteGame(2);
    expect(stepKite(s, 1)).toEqual([]);
    expect(s.ticks).toBe(0);
    expect(s.y).toBe(s.gaps[0].center);
    flap(s);
    expect(s.phase).toBe('play');
  });

  it('vật lý: rơi nhanh nhất −8; bật lên đặt vận tốc đứng 5,5; trọng lực 14', () => {
    const s = started(2);
    s.inv = 100; // không mất tim khi rơi xuống đất
    s.y = 9.4; // tránh trần
    s.vy = 0;
    stepKite(s, 0.05);
    expect(s.vy).toBeCloseTo(-14 * 0.05, 9);
    s.vy = -7.9;
    stepKite(s, 0.2);
    expect(s.vy).toBe(-8);
    flap(s);
    expect(s.vy).toBe(5.5);
  });

  it('tốc độ ngang: 4, mỗi khe +0,1, tối đa 6,5', () => {
    expect(speedAt(0)).toBe(4);
    expect(speedAt(1)).toBeCloseTo(4.1, 9);
    expect(speedAt(10)).toBeCloseTo(5, 9);
    expect(speedAt(25)).toBe(6.5);
    expect(speedAt(80)).toBe(6.5);
    for (let k = 0; k < 40; k++) expect(speedAt(k + 1)).toBeGreaterThanOrEqual(speedAt(k));
  });

  it('các cặp cột cách nhau 5; khe đầu cách chỗ xuất phát firstGapX', () => {
    const gaps = generateGaps(createMulberry32(1), 30);
    expect(gaps[0].x).toBe(C.firstGapX);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i].x - gaps[i - 1].x).toBeCloseTo(5, 9);
  });

  it('tâm hai khe liền nhau chênh tối đa 3,0 (1000 khe, nhiều seed)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const gaps = generateGaps(createMulberry32(seed), 1000);
      let maxShift = 0;
      for (let i = 1; i < gaps.length; i++) maxShift = Math.max(maxShift, Math.abs(gaps[i].center - gaps[i - 1].center));
      expect(maxShift).toBeLessThanOrEqual(3 + EPS);
    }
  });

  it('thống kê: diều đen xuất hiện chừng 35% các khe từ khe 8; trang bản sao chừng 60% khe, nằm trong phần trống chắc chắn của khe', () => {
    const gaps = manyGaps(20, 500);
    const late = gaps.filter((g) => g.k >= 8);
    const black = late.filter((g) => g.black).length / late.length;
    expect(black).toBeGreaterThan(0.32);
    expect(black).toBeLessThan(0.38);
    const page = gaps.filter((g) => g.pageY !== null).length / gaps.length;
    expect(page).toBeGreaterThan(0.57);
    expect(page).toBeLessThan(0.63);
    for (const g of gaps) {
      if (g.pageY === null) continue;
      const half = C.page.size / 2;
      expect(g.pageY - half).toBeGreaterThanOrEqual(g.bottom - EPS);
      expect(g.pageY + half).toBeLessThanOrEqual(g.top + EPS);
      if (g.black) {
        // trang không bao giờ nằm trong vùng diều đen có thể tới
        for (let t = 0; t <= 4; t += 0.05) {
          const bb = blackBox(g, t)!;
          expect(g.pageY + half <= bb.y0 + EPS || g.pageY - half >= bb.y1 - EPS).toBe(true);
        }
      }
    }
  });

  it('bay qua tâm khe: +1 khe, +10 điểm, tốc độ tăng 0,1; nhặt trang bản sao một lần: +5 điểm', () => {
    const s = started(4);
    const g0 = s.gaps[0];
    // đặt diều gần tâm khe 1, ở độ cao trang (nếu có) hoặc giữa khe, bất tử để khỏi vướng gì
    s.inv = 10;
    s.x = g0.x - 0.05;
    s.y = g0.pageY ?? g0.center;
    s.vy = 0;
    const before = s.score;
    const ev = stepKite(s, 0.05);
    expect(s.passed).toBe(1);
    expect(ev.filter((e) => e.type === 'pass')).toHaveLength(1);
    const pages = ev.filter((e) => e.type === 'page').length;
    expect(s.score).toBe(before + 10 + 5 * pages);
    expect(speedAt(s.passed)).toBeCloseTo(4.1, 9);
    if (g0.pageY !== null) {
      expect(pages).toBe(1);
      // không nhặt lại
      s.x = g0.x - 0.05;
      s.y = g0.pageY;
      const again = stepKite(s, 0.02);
      expect(again.some((e) => e.type === 'page')).toBe(false);
    }
  });

  it('mỗi nguyên nhân (đất, trần, cột, diều đen) đều mất 1 tim', () => {
    // đất
    let s = started(5);
    s.y = 0.2;
    s.vy = 0;
    expect(stepKite(s, H).some((e) => e.type === 'hit' && e.why === 'floor')).toBe(true);
    expect(s.hearts).toBe(2);
    // trần
    s = started(5);
    s.y = 9.8;
    s.vy = 0;
    expect(stepKite(s, H).some((e) => e.type === 'hit' && e.why === 'ceiling')).toBe(true);
    expect(s.hearts).toBe(2);
    // cột (cột trên)
    s = started(5);
    const g = s.gaps[0];
    s.x = g.x - 0.3;
    s.y = g.top + 0.5;
    s.vy = 0;
    expect(stepKite(s, H).some((e) => e.type === 'hit' && e.why === 'pillar')).toBe(true);
    expect(s.hearts).toBe(2);
    // cột (cột dưới)
    s = started(5);
    s.x = g.x - 0.3;
    s.y = g.bottom - 0.5;
    s.vy = 0;
    expect(stepKite(s, H).some((e) => e.type === 'hit' && e.why === 'pillar')).toBe(true);
    // diều đen
    s = started(5, { gapCount: 40 });
    const bg = s.gaps.find((x) => x.black)!;
    s.passed = bg.k - 1;
    s.x = bg.x - 0.3;
    s.vy = 0;
    const bb = blackBox(bg, H)!;
    s.y = (bb.y0 + bb.y1) / 2;
    expect(stepKite(s, H).some((e) => e.type === 'hit' && e.why === 'black')).toBe(true);
    expect(s.hearts).toBe(2);
    expect(s.stats.hitsBy.black).toBe(1);
  });

  it('diều khớp hộp 0,8 × 0,5: lọt khe cao 2,4 khi ở giữa; hộp rộng 0,8, cột rộng 0,9', () => {
    const b = kiteBox(1, 5);
    expect(b.x1 - b.x0).toBeCloseTo(0.8, 9);
    expect(b.y1 - b.y0).toBeCloseTo(0.5, 9);
    expect(C.pillarWidth).toBe(0.9);
    // diều ở giữa khe, đúng mặt phẳng cột: không chạm; lệch quá nửa (khe cao − diều) / 2 thì chạm
    const s = started(6);
    const g = s.gaps[0];
    s.x = g.x - 0.2;
    s.y = g.top - 0.25 - 0.01;
    s.vy = 0;
    stepKite(s, H);
    expect(s.hearts).toBe(3);
    const s2 = started(6);
    s2.x = g.x - 0.2;
    s2.y = g.top - 0.25 + 0.05;
    s2.vy = 0;
    stepKite(s2, H);
    expect(s2.hearts).toBe(2);
  });

  it('mất tim: bất tử đúng 1 giây (120 bước), diều đặt lại giữa khe kế tiếp với vận tốc 0', () => {
    const s = started(8);
    s.passed = 3; // đã bay qua 3 khe; khe kế tiếp là khe 4
    s.x = s.gaps[2].x + 1.5;
    s.y = 0.1; // chạm đất
    s.vy = -3;
    const ev = stepKite(s, H);
    expect(ev.some((e) => e.type === 'hit' && e.why === 'floor')).toBe(true);
    expect(s.hearts).toBe(2);
    expect(s.y).toBe(s.gaps[3].center);
    expect(s.vy).toBe(0);
    expect(s.inv).toBe(C.invSeconds);
    // bất tử 120 bước: diều rơi qua đất mà không mất tim
    for (let i = 0; i < 119; i++) stepKite(s, H);
    expect(s.hearts).toBe(2);
    stepKite(s, H);
    expect(s.hearts).toBe(2);
    expect(s.inv).toBe(0);
    // bước thứ 121: hết bất tử, diều (đã rơi xuống dưới đất) mất tim tiếp
    const ev2 = stepKite(s, H);
    expect(ev2.some((e) => e.type === 'hit')).toBe(true);
    expect(s.hearts).toBe(1);
    expect(s.inv).toBe(C.invSeconds);
  });

  it('hết tim thì kết thúc ván (hearts), không còn chạy', () => {
    const s = started(9);
    s.hearts = 1;
    s.y = 0.1;
    const ev = stepKite(s, H);
    expect(ev.some((e) => e.type === 'end' && e.reason === 'hearts')).toBe(true);
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('hearts');
    expect(s.hearts).toBe(0);
    const frozen = { x: s.x, y: s.y, ticks: s.ticks };
    expect(stepKite(s, 1)).toEqual([]);
    expect(flap(s)).toEqual([]);
    expect({ x: s.x, y: s.y, ticks: s.ticks }).toEqual(frozen);
  });

  it('câu hỏi ở cổng dừng mọi chuyển động (kể cả bật, thời gian); đúng +50; sai và hết giờ mất 1 tim, cổng vẫn mở', () => {
    for (const result of ['correct', 'wrong', 'timeout'] as const) {
      const s = started(10);
      s.passed = 6;
      s.x = gateXOf(s, 0) - 0.01;
      s.y = s.gaps[6].center;
      s.vy = 0;
      s.inv = 10;
      stepKite(s, 0.1);
      expect(s.phase).toBe('quiz');
      const snap = { x: s.x, y: s.y, vy: s.vy, time: s.time, ticks: s.ticks, hearts: s.hearts, score: s.score, inv: s.inv };
      expect(stepKite(s, 3)).toEqual([]);
      expect(tickKite(s, 3, false)).toEqual([]);
      expect(flap(s)).toEqual([]);
      expect({ x: s.x, y: s.y, vy: s.vy, time: s.time, ticks: s.ticks, hearts: s.hearts, score: s.score, inv: s.inv }).toEqual(snap);
      const before = s.score;
      answerGate(s, result);
      if (result === 'correct') {
        expect(s.score).toBe(before + 50);
        expect(s.hearts).toBe(3);
        expect(s.correct).toBe(1);
      } else {
        expect(s.score).toBe(before);
        expect(s.hearts).toBe(2);
        expect(s.correct).toBe(0);
      }
      // cổng vẫn mở: ván chạy tiếp, diều giữa khe kế tiếp (khe 7), vận tốc 0, bất tử 1 giây
      expect(s.phase).toBe('play');
      expect(s.gatesDone).toBe(1);
      expect(s.y).toBe(s.gaps[6].center);
      expect(s.vy).toBe(0);
      expect(s.inv).toBe(C.invSeconds);
      // trả lời lần nữa (không còn câu hỏi) không có tác dụng
      expect(answerGate(s, 'correct')).toEqual([]);
    }
  });

  it('sai ở cổng khi chỉ còn 1 tim thì hết tim (kết thúc); sai ở cổng 4 khi còn tim vẫn thắng', () => {
    const s = started(11);
    s.hearts = 1;
    s.passed = 6;
    s.x = gateXOf(s, 0) - 0.01;
    s.y = s.gaps[6].center;
    s.inv = 10;
    stepKite(s, 0.1);
    answerGate(s, 'wrong');
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('hearts');
    const t = started(11);
    t.gatesDone = 3;
    t.passed = 24;
    t.x = gateXOf(t, 3) - 0.01;
    t.inv = 10;
    t.y = t.gaps[23].center;
    stepKite(t, 0.1);
    expect(t.phase).toBe('quiz');
    answerGate(t, 'wrong');
    expect(t.hearts).toBe(2);
    expect(t.phase).toBe('ended');
    expect(t.ended).toBe('complete');
  });

  it('tạm dừng (nút "?"): tickKite với paused không đổi gì', () => {
    const s = started(12);
    flap(s);
    const snap = JSON.stringify({ x: s.x, y: s.y, vy: s.vy, ticks: s.ticks, time: s.time });
    expect(tickKite(s, 2, true)).toEqual([]);
    expect(JSON.stringify({ x: s.x, y: s.y, vy: s.vy, ticks: s.ticks, time: s.time })).toBe(snap);
    stepKite(s, 0.5);
    expect(s.ticks).toBe(60);
  });
});

describe('điểm, tất định, bước cố định', () => {
  it('điểm = số khe × 10 + số trang × 5 + số câu đúng × 50 (công thức và ván mẫu của bot)', () => {
    expect(scoreOf(0, 0, 0)).toBe(0);
    expect(scoreOf(3, 2, 1)).toBe(90);
    expect(scoreOf(24, 17, 4)).toBe(240 + 85 + 200);
    for (const bot of [GOOD_BOT, AVERAGE_BOT]) {
      for (let seed = 1; seed <= 15; seed++) {
        const r = simulateKite(seed, bot);
        expect(r.score, `${bot.name} seed ${seed}`).toBe(scoreOf(r.gaps, r.pages, r.correct));
      }
    }
  });

  it('một ván mẫu: điểm của trạng thái khớp công thức ở mọi bước (bot giỏi, seed 4)', () => {
    // chơi tay: bật mỗi khi diều thấp hơn giữa khe kế tiếp một khoảng, kiểm điểm sau mỗi bước
    const s = createKiteGame(4);
    flap(s);
    for (let i = 0; i < 6000 && s.phase !== 'ended'; i++) {
      if (s.phase === 'quiz') {
        answerGate(s, i % 3 === 0 ? 'wrong' : 'correct');
        continue;
      }
      const g = s.gaps[Math.min(s.passed, s.gaps.length - 1)];
      if (s.y + s.vy * 0.1 < g.center - 0.5) flap(s);
      stepKite(s, 1 / 60);
      expect(s.score).toBe(scoreOf(s.passed, s.pages, s.correct));
    }
    expect(s.passed).toBeGreaterThan(0);
  });

  it('cùng seed cùng ván: khe, diều đen, trang giống hệt; seed khác thì khác; bot cùng seed cùng kết quả', () => {
    expect(createKiteGame(5).gaps).toEqual(createKiteGame(5).gaps);
    expect(generateGaps(createMulberry32(5), 60)).toEqual(generateGaps(createMulberry32(5), 60));
    expect(createKiteGame(5).gaps).not.toEqual(createKiteGame(6).gaps);
    expect(simulateKite(21, GOOD_BOT)).toEqual(simulateKite(21, GOOD_BOT));
    expect(simulateKite(21, AVERAGE_BOT)).toEqual(simulateKite(21, AVERAGE_BOT));
  });

  /** Chạy cùng kịch bản bật (theo số bước) với bước thời gian `dt` khác nhau; bước cuối của mỗi đoạn được cắt để rơi đúng ranh giới bước cố định. */
  function scripted(seed: number, taps: readonly number[], totalTicks: number, dt: number): KiteState {
    const s = createKiteGame(seed);
    flap(s);
    let fed = 0;
    const advance = (tick: number) => {
      const target = tick * H;
      while (fed < target - 1e-12) {
        const chunk = Math.min(dt, target - fed);
        stepKite(s, chunk);
        fed += chunk;
      }
    };
    for (const t of taps) {
      advance(t);
      flap(s);
    }
    advance(totalTicks);
    return s;
  }

  it('kết quả không phụ thuộc bước thời gian: dt 1/30, 1/60, 1/120, 1/144 cho cùng ván (có cả va chạm và đặt lại)', () => {
    const taps = [40, 90, 130, 175, 230, 280, 331, 400, 470, 520, 600, 700, 800, 890];
    const ref = scripted(13, taps, 1200, 1 / 120);
    expect(ref.stats.hits + ref.passed).toBeGreaterThan(0);
    for (const dt of [1 / 30, 1 / 60, 1 / 144, 0.01, 0.0333]) {
      const s = scripted(13, taps, 1200, dt);
      expect(s.ticks).toBe(ref.ticks);
      expect(s.x).toBeCloseTo(ref.x, 9);
      expect(s.y).toBeCloseTo(ref.y, 9);
      expect(s.vy).toBeCloseTo(ref.vy, 9);
      expect(s.hearts).toBe(ref.hearts);
      expect(s.passed).toBe(ref.passed);
      expect(s.score).toBe(ref.score);
      expect(s.pages).toBe(ref.pages);
      expect(s.phase).toBe(ref.phase);
    }
  });
});

describe('người chơi lý tưởng (biết trước, không trễ): luật chơi qua được mà không chạm', () => {
  it('qua đủ 24 khe (độ dài một ván thật) không chạm gì, ở nhiều seed; chuỗi bật tìm được chạy lại trên ván thật cho 0 lần mất tim', () => {
    for (const seed of [1, 2, 3]) {
      const run = findIdealRun(seed, 24);
      expect(run, `seed ${seed}`).not.toBeNull();
      const r = replayRun(seed, 24, run!.actions);
      expect(r.gaps).toBe(24);
      expect(r.hits).toBe(0);
      expect(r.hearts).toBe(3);
    }
  }, 180000);
});
