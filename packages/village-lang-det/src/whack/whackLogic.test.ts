import { describe, expect, it } from 'vitest';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MOUSE_KINDS, WHACK_SPEC, type MouseKind } from './whackConfig';
import {
  answerBoss,
  bossClock,
  bossPoints,
  bossSeconds,
  collectCoin,
  createWhackGame,
  hitLane,
  inZone,
  lowestInZone,
  mixAt,
  mouseSpeed,
  pickKind,
  runSeconds,
  spawnInterval,
  spawnMouse,
  stepWhack,
  type WhackEvent,
  type WhackState,
} from './whackLogic';

/** Ván trống: không tự sinh chuột, không tự hiện đồng (để dựng từng tình huống). */
function quiet(seed = 1): WhackState {
  const s = createWhackGame(seed);
  s.spawnIn = Infinity;
  s.coinIn = Infinity;
  return s;
}

/** Cho trùm ra ngay: đặt đồng hồ lịch ngay trước giây 12 rồi chạy một bước. */
function callBoss(s: WhackState): WhackEvent[] {
  s.ticks = Math.round(bossClock(s.bossesDone) / WHACK_SPEC.tick) - 1;
  return stepWhack(s, WHACK_SPEC.tick);
}

/** Chạy tới khi bảng câu hỏi mở. */
function toQuiz(s: WhackState): void {
  callBoss(s);
  stepWhack(s, WHACK_SPEC.boss.runSeconds + 0.1);
}

/** Người chơi hoàn hảo: mỗi khung đập mọi làn có chuột trong vùng, nhặt đồng, trả lời đúng còn 10 giây. */
function autoplay(seed: number, dt: number): { s: WhackState; events: WhackEvent[] } {
  const s = createWhackGame(seed);
  const events: WhackEvent[] = [];
  for (let i = 0; i < 40000 && s.phase !== 'ended'; i++) {
    events.push(...stepWhack(s, dt));
    if (s.phase === 'quiz') events.push(...answerBoss(s, 'correct', 10));
    for (let lane = 0; lane < WHACK_SPEC.lanes; lane++) if (lowestInZone(s, lane)) events.push(...hitLane(s, lane));
    events.push(...collectCoin(s));
  }
  return { s, events };
}

describe('bảng test của spec 06 (màn 5)', () => {
  it('chuột thường trong vùng đập của làn 2, đập làn 2: trúng, +10', () => {
    const s = quiet();
    spawnMouse(s, 'thuong', 2, 7.5);
    const e = hitLane(s, 2);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ type: 'hit', lane: 2, killed: true, points: 10 });
    expect(s.score).toBe(10);
    expect(s.mice).toHaveLength(0);
  });

  it('chuột ở trên vùng đập (vị trí < 6,5), đập làn đó: không trúng, không bị phạt (chỉ nghỉ làn)', () => {
    const s = quiet();
    spawnMouse(s, 'thuong', 2, 6.4);
    const e = hitLane(s, 2);
    expect(e).toEqual([{ type: 'miss', lane: 2 }]);
    expect(s.score).toBe(0);
    expect(s.ink).toBe(0);
    expect(s.mice).toHaveLength(1);
    // chuột đã qua vùng đập (> 9) cũng không đập được
    const t = quiet();
    spawnMouse(t, 'thuong', 1, 9.1);
    expect(hitLane(t, 1)[0].type).toBe('miss');
  });

  it('vùng đập là [6,5; 9] (10% đến 35% chiều dài làn tính từ dưới lên)', () => {
    expect(WHACK_SPEC.zoneStart).toBe(WHACK_SPEC.laneLength * (1 - 0.35));
    expect(WHACK_SPEC.zoneEnd).toBe(WHACK_SPEC.laneLength * (1 - 0.1));
    const s = quiet();
    const m = spawnMouse(s, 'thuong', 0);
    for (const [pos, inside] of [[6.49, false], [6.5, true], [7.75, true], [9, true], [9.01, false]] as const) {
      m.pos = pos;
      expect(inZone(m), String(pos)).toBe(inside);
    }
  });

  it('hai chuột cùng làn đều trong vùng: trúng con thấp hơn (vị trí lớn hơn)', () => {
    const s = quiet();
    const high = spawnMouse(s, 'thuong', 1, 7.3);
    const low = spawnMouse(s, 'nhanh', 1, 8.2);
    expect(lowestInZone(s, 1)).toBe(low);
    const e = hitLane(s, 1);
    expect(e[0]).toMatchObject({ type: 'hit', killed: true, points: 15 });
    expect(s.mice).toEqual([high]);
  });

  it('chuột đổi làn: làn 0 sang làn 1, làn 3 sang làn 2, chỉ một lần; làn giữa sang trái hoặc phải theo rng', () => {
    for (const [from, to] of [[0, 1], [3, 2]] as const) {
      const s = quiet();
      const m = spawnMouse(s, 'doiLan', from, 4.9);
      const ev = stepWhack(s, 0.2);
      expect(ev.filter((x) => x.type === 'laneChange')).toHaveLength(1);
      expect(m.lane).toBe(to);
      expect(m.pos).toBeGreaterThanOrEqual(WHACK_SPEC.laneChangeAt);
      stepWhack(s, 0.5);
      expect(m.lane).toBe(to); // không đổi lần hai
    }
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = quiet(seed);
      const m = spawnMouse(s, 'doiLan', 1, 4.9);
      stepWhack(s, 0.2);
      expect([0, 2]).toContain(m.lane);
      seen.add(m.lane);
    }
    expect([...seen].sort()).toEqual([0, 2]);
    // làn 2 sang 1 hoặc 3
    const s = quiet(5);
    const m = spawnMouse(s, 'doiLan', 2, 4.9);
    stepWhack(s, 0.2);
    expect([1, 3]).toContain(m.lane);
  });

  it('chuột đổi làn nhảy khi tới vị trí 5,0 (cách vùng đập 1,5), chưa tới thì chưa nhảy', () => {
    expect(WHACK_SPEC.zoneStart - WHACK_SPEC.laneChangeAt).toBe(1.5);
    const s = quiet();
    const m = spawnMouse(s, 'doiLan', 0, 4.5);
    stepWhack(s, 0.1);
    expect(m.pos).toBeLessThan(5);
    expect(m.lane).toBe(0);
  });

  it('chuột đổi làn chỉ nhảy sang làn kề đang trống trong ±1,5 quanh vị trí của nó; làn kề bị chiếm thì không đổi (vẫn đổi làn, vẫn 15 điểm)', () => {
    // làn 0: làn 1 có chuột ở vị trí 5,8 (cách 0,9 < 1,5) thì ở nguyên làn 0
    const s = quiet();
    const m = spawnMouse(s, 'doiLan', 0, 4.9);
    spawnMouse(s, 'thuong', 1, 5.8);
    const ev = stepWhack(s, 0.1);
    expect(ev.filter((e) => e.type === 'laneChange')).toHaveLength(0);
    expect(m.lane).toBe(0);
    expect(m.changed).toBe(true);
    expect(m.kind).toBe('doiLan');
    stepWhack(s, 0.4);
    expect(m.lane).toBe(0); // không thử lại
    m.pos = 7.5;
    expect(hitLane(s, 0)[0]).toMatchObject({ type: 'hit', killed: true, points: 15 });
    // chuột ở làn kề cách xa (> 1,5) thì không chặn
    const t = quiet();
    const n = spawnMouse(t, 'doiLan', 0, 4.9);
    spawnMouse(t, 'thuong', 1, 7.0);
    stepWhack(t, 0.1);
    expect(n.lane).toBe(1);
    // làn 3 sang làn 2 cũng xét làn 2
    const u = quiet();
    const p = spawnMouse(u, 'doiLan', 3, 4.9);
    spawnMouse(u, 'nhanh', 2, 4.0);
    stepWhack(u, 0.1);
    expect(p.lane).toBe(3);
  });

  it('chuột đổi làn ở làn giữa: bên rng chọn bị chiếm thì thử bên kia; cả hai bị chiếm thì không đổi', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = quiet(seed);
      const m = spawnMouse(a, 'doiLan', 1, 4.9);
      spawnMouse(a, 'thuong', 0, 5.2); // làn 0 bị chiếm → phải sang làn 2
      stepWhack(a, 0.1);
      expect(m.lane, `seed ${seed}`).toBe(2);
      const b = quiet(seed);
      const n = spawnMouse(b, 'doiLan', 2, 4.9);
      spawnMouse(b, 'thuong', 3, 4.5); // làn 3 bị chiếm → phải sang làn 1
      stepWhack(b, 0.1);
      expect(n.lane, `seed ${seed}`).toBe(1);
      const c = quiet(seed);
      const k = spawnMouse(c, 'doiLan', 1, 4.9);
      spawnMouse(c, 'thuong', 0, 5.5);
      spawnMouse(c, 'thuong', 2, 4.0);
      stepWhack(c, 0.1);
      expect(k.lane, `seed ${seed}`).toBe(1);
    }
  });

  it('chuột to: đập lần 1 vẫn còn (khựng, chớp sáng); đập lần 2 thì mất, +30', () => {
    const s = quiet();
    const m = spawnMouse(s, 'to', 3, 7.4);
    const e1 = hitLane(s, 3);
    expect(e1[0]).toMatchObject({ type: 'hit', killed: false, points: 0 });
    expect(s.score).toBe(0);
    expect(s.mice).toEqual([m]);
    expect(m.flash).toBe(true);
    expect(m.freeze).toBe(0.3);
    const e2 = hitLane(s, 3);
    expect(e2[0]).toMatchObject({ type: 'hit', killed: true, points: 30 });
    expect(s.score).toBe(30);
    expect(s.mice).toHaveLength(0);
  });

  it('chuột lọt tới sổ: +1 vết mực; vết thứ 5 thì kết thúc', () => {
    const s = quiet();
    for (let i = 1; i <= 5; i++) {
      spawnMouse(s, 'thuong', i % 4, 9.95);
      const ev = stepWhack(s, 0.05);
      expect(ev.find((e) => e.type === 'leak'), `vết ${i}`).toBeDefined();
      expect(s.ink).toBe(i);
      if (i < 5) {
        expect(s.phase).toBe('play');
        expect(s.ended).toBeNull();
      }
    }
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('ink');
  });

  it('lịch trùm: đúng 10 lần, ở giây 12, 24, …, 120 của đồng hồ lịch', () => {
    const { s, events } = autoplay(3, 1 / 60);
    const starts = events.filter((e): e is Extract<WhackEvent, { type: 'bossStart' }> => e.type === 'bossStart');
    expect(starts).toHaveLength(10);
    expect(starts.map((e) => e.boss.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(bossClock)).toEqual([12, 24, 36, 48, 60, 72, 84, 96, 108, 120]);
    expect(s.ended).toBe('complete');
    expect(s.clock).toBeCloseTo(120, 6);
    // mỗi lượt ra đúng lúc đồng hồ lịch bằng giây của lượt đó
    const clocks: number[] = [];
    const g = createWhackGame(3);
    for (let i = 0; i < 40000 && g.phase !== 'ended'; i++) {
      for (const e of stepWhack(g, 1 / 60)) if (e.type === 'bossStart') clocks.push(Math.round(g.clock * 1000) / 1000);
      if (g.phase === 'quiz') answerBoss(g, 'correct', 5);
      for (let lane = 0; lane < 4; lane++) if (lowestInZone(g, lane)) hitLane(g, lane);
    }
    expect(clocks).toEqual([12, 24, 36, 48, 60, 72, 84, 96, 108, 120]);
  });

  it('trùm: trả lời đúng khi còn 7 giây: +135 (làm tròn xuống: 7,0 tới 7,99 giây đều 7)', () => {
    const s = quiet();
    toQuiz(s);
    expect(s.phase).toBe('quiz');
    const e = answerBoss(s, 'correct', 7.99);
    expect(e[0]).toMatchObject({ type: 'bossAnswer', result: 'correct', points: 135 });
    expect(s.score).toBe(135);
    expect(bossPoints(7)).toBe(135);
    expect(bossPoints(7.0)).toBe(135);
    expect(bossPoints(0.9)).toBe(100);
    expect(s.ink).toBe(0);
    expect(s.phase).toBe('play');
  });

  it('trùm: trả lời sai, hoặc hết giờ: +1 vết mực, không điểm', () => {
    for (const result of ['wrong', 'timeout'] as const) {
      const s = quiet();
      toQuiz(s);
      const e = answerBoss(s, result, 0);
      expect(e[0]).toMatchObject({ type: 'bossAnswer', result, points: 0, ink: 1 });
      expect(s.ink).toBe(1);
      expect(s.score).toBe(0);
      expect(s.phase).toBe('play');
    }
  });

  it('thời gian trả lời: 15 giây cho lần 1–5, 10 giây cho lần 6–10', () => {
    expect([0, 1, 2, 3, 4].map(bossSeconds)).toEqual([15, 15, 15, 15, 15]);
    expect([5, 6, 7, 8, 9].map(bossSeconds)).toEqual([10, 10, 10, 10, 10]);
    const s = quiet();
    const ev = callBoss(s);
    const start = ev.find((e) => e.type === 'bossStart');
    expect(start && start.type === 'bossStart' && start.boss.answerSeconds).toBe(15);
  });

  it('sinh chuột: không sinh vào làn có con còn trong 15% đầu làn (vị trí < 1,5)', () => {
    const s = createWhackGame(9);
    s.coinIn = Infinity;
    s.spawnIn = 0.001;
    // 3 làn bị chặn (con gần nhất ở vị trí 1,0), chỉ còn làn 2
    for (const lane of [0, 1, 3]) spawnMouse(s, 'thuong', lane, 0.5);
    const ev = stepWhack(s, 0.05);
    const spawned = ev.filter((e): e is Extract<WhackEvent, { type: 'spawn' }> => e.type === 'spawn');
    expect(spawned).toHaveLength(1);
    expect(spawned[0].mouse.lane).toBe(2);
    // cả 4 làn bị chặn: không sinh được
    const t = createWhackGame(9);
    t.coinIn = Infinity;
    t.spawnIn = 0.001;
    for (let lane = 0; lane < 4; lane++) spawnMouse(t, 'thuong', lane, 0.1);
    const none = stepWhack(t, 0.05);
    expect(none.filter((e) => e.type === 'spawn')).toHaveLength(0);
    // con gần nhất đúng 1,5 thì không còn chặn
    const u = createWhackGame(9);
    u.coinIn = Infinity;
    u.spawnIn = 0.001;
    for (const lane of [0, 1, 2]) spawnMouse(u, 'thuong', lane, 1.0);
    spawnMouse(u, 'thuong', 3, 1.45);
    const ev2 = stepWhack(u, 0.05);
    const got = ev2.find((e) => e.type === 'spawn');
    expect(got && got.type === 'spawn' && got.mouse.lane).toBe(3);
  });
});

describe('đồng hồ lịch, lượt trùm và chuột đứng yên', () => {
  it('đồng hồ lịch đứng yên trong lượt trùm (chạy xuống và mở câu hỏi), chạy lại sau khi trả lời', () => {
    const s = quiet();
    stepWhack(s, 3);
    callBoss(s);
    const clock = s.clock;
    expect(clock).toBeCloseTo(12, 6);
    stepWhack(s, 0.5);
    expect(s.phase).toBe('bossRun');
    expect(s.clock).toBe(clock);
    stepWhack(s, 1);
    expect(s.phase).toBe('quiz');
    stepWhack(s, 30);
    expect(s.clock).toBe(clock);
    answerBoss(s, 'correct', 5);
    stepWhack(s, 1);
    expect(s.clock).toBeCloseTo(clock + 1, 6);
  });

  it('lượt trùm ngừng sinh chuột và hiện đồng; chuột đang chạy còn 20% tốc độ', () => {
    const s = createWhackGame(4);
    s.spawnIn = 0.01;
    s.coinIn = 0.01;
    s.ticks = 1439;
    s.clock = 1439 * WHACK_SPEC.tick;
    const m = spawnMouse(s, 'thuong', 0, 1);
    stepWhack(s, WHACK_SPEC.tick); // tick 1440: trùm ra (sinh con/đồng ở chính bước này là hợp lệ)
    expect(s.phase).toBe('bossRun');
    const count = s.mice.length;
    const hasCoin = s.coin !== null;
    const before = m.pos;
    stepWhack(s, 0.5);
    expect(m.pos - before).toBeCloseTo(m.speed * 0.2 * 0.5, 6);
    expect(s.mice.length).toBe(count);
    expect(s.coin !== null).toBe(hasCoin);
  });

  it('chuột đứng yên khi bảng câu hỏi mở: không lọt chuột lúc đang trả lời', () => {
    const s = quiet();
    spawnMouse(s, 'thuong', 0, 9.0);
    spawnMouse(s, 'nhanh', 2, 8.0);
    const far = spawnMouse(s, 'thuong', 3, 3.0);
    toQuiz(s);
    const positions = s.mice.map((m) => m.pos);
    stepWhack(s, 60);
    expect(s.mice.map((m) => m.pos)).toEqual(positions);
    expect(s.ink).toBe(0);
    expect(s.phase).toBe('quiz');
    // không nhận cú đập khi bảng câu hỏi mở
    expect(hitLane(s, 0)).toEqual([{ type: 'blocked', lane: 0, why: 'phase' }]);
    // trả lời xong thì chuột chạy lại
    answerBoss(s, 'correct', 3);
    stepWhack(s, 1);
    expect(far.pos).toBeGreaterThan(positions[2]);
  });

  it('đồng hồ lịch, đồng và chuột dừng cả trong lượt trùm: đồng đang hiện không biến mất khi trả lời', () => {
    const s = quiet();
    s.coin = { lane: 1, pos: 3, life: WHACK_SPEC.coin.life };
    toQuiz(s);
    const life = s.coin!.life;
    stepWhack(s, 20);
    expect(s.coin!.life).toBe(life);
  });

  it('làn nghỉ 0,2 giây sau cú đập hụt (đập tiếp không được, hết 0,2 giây thì được)', () => {
    const s = quiet();
    spawnMouse(s, 'thuong', 1, 6.0);
    expect(hitLane(s, 1)[0].type).toBe('miss');
    stepWhack(s, 0.1);
    expect(hitLane(s, 1)).toEqual([{ type: 'blocked', lane: 1, why: 'rest' }]);
    // làn khác không nghỉ
    expect(hitLane(s, 0)[0].type).toBe('miss');
    stepWhack(s, 0.11);
    expect(hitLane(s, 1)[0].type).not.toBe('blocked');
  });

  it('đập trúng không làm làn nghỉ', () => {
    const s = quiet();
    spawnMouse(s, 'thuong', 1, 7.2);
    spawnMouse(s, 'thuong', 1, 7.9);
    expect(hitLane(s, 1)[0]).toMatchObject({ type: 'hit', killed: true });
    expect(hitLane(s, 1)[0]).toMatchObject({ type: 'hit', killed: true });
  });

  it('chuột to: trong 0,3 giây khựng thì không di chuyển, hết khựng thì đi tiếp (tắt chớp sáng)', () => {
    const s = quiet();
    const m = spawnMouse(s, 'to', 0, 7.2);
    hitLane(s, 0);
    const pos = m.pos;
    stepWhack(s, 0.25);
    expect(m.pos).toBe(pos);
    expect(m.flash).toBe(true);
    stepWhack(s, 0.1);
    expect(m.flash).toBe(false);
    expect(m.pos).toBeGreaterThan(pos);
  });
});

describe('tốc độ, nhịp sinh, tỉ lệ loại', () => {
  it('chuột chạy từ đầu làn tới đầu vùng đập mất 3,0 giây ở giây 0 và 1,8 giây ở giây 120; giữa chừng giảm tuyến tính', () => {
    expect(runSeconds(0)).toBe(3);
    expect(runSeconds(120)).toBeCloseTo(1.8, 12);
    expect(runSeconds(60)).toBeCloseTo(2.4, 12);
    expect(runSeconds(500)).toBeCloseTo(1.8, 12);
    expect(mouseSpeed(0)).toBeCloseTo(6.5 / 3, 12);
    for (const [clock, secs] of [[0, 3.0], [120, 1.8]] as const) {
      const s = quiet();
      s.clock = clock;
      const m = spawnMouse(s, 'thuong', 0);
      let t = 0;
      s.ticks = 0;
      while (m.pos < WHACK_SPEC.zoneStart && t < 10) {
        stepWhack(s, 0.01);
        t += 0.01;
      }
      expect(t).toBeCloseTo(secs, 1);
      expect(Math.abs(t - secs)).toBeLessThanOrEqual(0.011);
    }
  });

  it('chuột nhanh chạy gấp 1,6 lần', () => {
    const s = quiet();
    const a = spawnMouse(s, 'thuong', 0);
    const b = spawnMouse(s, 'nhanh', 1);
    expect(b.speed / a.speed).toBeCloseTo(1.6, 12);
  });

  it('nhịp sinh 1,2 giây ở giây 0 và 0,55 giây từ giây 120; tuyến tính', () => {
    expect(spawnInterval(0)).toBe(1.2);
    expect(spawnInterval(120)).toBeCloseTo(0.55, 12);
    expect(spawnInterval(60)).toBeCloseTo(0.875, 12);
    expect(spawnInterval(999)).toBeCloseTo(0.55, 12);
  });

  it('con đầu tiên sinh ở giây 1,2; các con sau theo nhịp', () => {
    const s = createWhackGame(11);
    s.coinIn = Infinity;
    expect(stepWhack(s, 1.19).filter((e) => e.type === 'spawn')).toHaveLength(0);
    expect(stepWhack(s, 0.02).filter((e) => e.type === 'spawn')).toHaveLength(1);
    expect(s.mice[0].kind).toBe('thuong');
  });

  it('tỉ lệ loại chuột theo 4 khoảng thời gian (5000 con mỗi khoảng, sai lệch ≤ 3%)', () => {
    const table: [number, number[]][] = [
      [10, [1, 0, 0, 0]],
      [30, [0.8, 0.2, 0, 0]],
      [50, [0.6, 0.2, 0.2, 0]],
      [90, [0.45, 0.2, 0.2, 0.15]],
    ];
    for (const [clock, want] of table) {
      const rng = createMulberry32(clock * 31 + 7);
      const count: Record<MouseKind, number> = { thuong: 0, doiLan: 0, nhanh: 0, to: 0 };
      for (let i = 0; i < 5000; i++) count[pickKind(clock, rng)]++;
      MOUSE_KINDS.forEach((k, i) => expect(Math.abs(count[k] / 5000 - want[i]), `${clock}s ${k}`).toBeLessThanOrEqual(0.03));
    }
    // ranh giới các khoảng: 20, 40, 60 thuộc khoảng sau
    expect(mixAt(19.99)).toEqual([1, 0, 0, 0]);
    expect(mixAt(20)).toEqual([0.8, 0.2, 0, 0]);
    expect(mixAt(40)).toEqual([0.6, 0.2, 0.2, 0]);
    expect(mixAt(60)).toEqual([0.45, 0.2, 0.2, 0.15]);
    expect(mixAt(120)).toEqual([0.45, 0.2, 0.2, 0.15]);
  });

  it('trong ván thật: 20 giây đầu chỉ có chuột thường', () => {
    const s = createWhackGame(21);
    s.coinIn = Infinity;
    const kinds = new Set<MouseKind>();
    for (let t = 0; t < 19.5; t += 0.05) {
      for (const e of stepWhack(s, 0.05)) if (e.type === 'spawn') kinds.add(e.mouse.kind);
      s.ink = 0;
      s.mice = s.mice.filter((m) => m.pos < 9);
      for (let lane = 0; lane < 4; lane++) if (lowestInZone(s, lane)) hitLane(s, lane);
    }
    expect([...kinds]).toEqual(['thuong']);
  });
});

describe('tiền đồng', () => {
  it('hiện khoảng 8 giây một đồng (7 đến 9 giây), tồn tại 2,5 giây, chạm được +5 điểm và +1 xu', () => {
    const s = createWhackGame(5);
    s.spawnIn = Infinity;
    const appear: number[] = [];
    const gone: number[] = [];
    for (let i = 0; i < 40 * 60; i++) {
      for (const e of stepWhack(s, 1 / 60)) {
        if (e.type === 'coinAppear') appear.push(s.clock);
        if (e.type === 'coinGone') gone.push(s.clock);
      }
      if (s.phase === 'quiz') answerBoss(s, 'correct', 5);
    }
    expect(appear.length).toBeGreaterThanOrEqual(3);
    expect(appear[0]).toBeGreaterThanOrEqual(7 - 0.02);
    expect(appear[0]).toBeLessThanOrEqual(9 + 0.02);
    for (let i = 1; i < appear.length; i++) {
      const gap = appear[i] - appear[i - 1];
      expect(gap).toBeGreaterThanOrEqual(7 - 0.02);
      expect(gap).toBeLessThanOrEqual(9 + 0.02);
    }
    for (let i = 0; i < gone.length; i++) expect(gone[i] - appear[i]).toBeCloseTo(2.5, 1);
    // chạm
    const t = quiet();
    t.coin = { lane: 0, pos: 3, life: 2.5 };
    const e = collectCoin(t);
    expect(e).toEqual([{ type: 'coinTaken', points: 5, xu: 1 }]);
    expect(t.score).toBe(5);
    expect(t.coins).toBe(1);
    expect(t.coin).toBeNull();
    expect(collectCoin(t)).toEqual([]);
  });
});

describe('kết thúc ván', () => {
  it('xong lượt trùm thứ 10 thì kết thúc "complete"; đủ 5 vết mực thì "ink" (xét trước)', () => {
    const s = quiet();
    s.bossesDone = 9;
    toQuiz(s);
    const e = answerBoss(s, 'correct', 10);
    expect(e.at(-1)).toEqual({ type: 'end', reason: 'complete' });
    expect(s.phase).toBe('ended');
    // sau khi hết ván không nhận thêm
    expect(hitLane(s, 0)[0].type).toBe('blocked');
    expect(stepWhack(s, 5)).toEqual([]);

    const t = quiet();
    t.bossesDone = 9;
    t.ink = 4;
    toQuiz(t);
    answerBoss(t, 'wrong', 0);
    expect(t.ended).toBe('ink');
  });

  it('thua giữa chừng khi đủ 5 vết mực trong lượt trùm (chuột lọt lúc {phanDien} chạy xuống)', () => {
    const s = quiet();
    s.ink = 4;
    callBoss(s);
    spawnMouse(s, 'thuong', 0, 9.99);
    stepWhack(s, 0.5);
    expect(s.ended).toBe('ink');
  });
});

describe('tất định', () => {
  it('cùng seed thì cùng ván (cùng chuỗi sự kiện và điểm)', () => {
    const a = autoplay(77, 1 / 60);
    const b = autoplay(77, 1 / 60);
    expect(a.events.map((e) => e.type)).toEqual(b.events.map((e) => e.type));
    expect(a.s.score).toBe(b.s.score);
    const c = autoplay(78, 1 / 60);
    expect(c.s.stats.spawned === a.s.stats.spawned && c.s.score === a.s.score).toBe(false);
  });

  it('dt khác nhau (1/30, 1/60, 1/144) cho cùng chuỗi sinh chuột, đồng và trùm', () => {
    const sig = (r: { s: WhackState; events: WhackEvent[] }) => ({
      spawns: r.events.filter((e) => e.type === 'spawn').map((e) => (e.type === 'spawn' ? `${e.mouse.kind}@${e.mouse.lane}` : '')),
      coins: r.events.filter((e) => e.type === 'coinAppear').map((e) => (e.type === 'coinAppear' ? `${e.coin.lane}:${e.coin.pos.toFixed(6)}` : '')),
      bosses: r.events.filter((e) => e.type === 'bossStart').map((e) => (e.type === 'bossStart' ? e.boss.lane : -1)),
    });
    const ref = sig(autoplay(123, 1 / 60));
    expect(ref.spawns.length).toBeGreaterThan(100);
    for (const dt of [1 / 30, 1 / 144]) {
      const got = sig(autoplay(123, dt));
      expect(got.spawns, `dt ${dt}`).toEqual(ref.spawns);
      expect(got.bosses, `dt ${dt}`).toEqual(ref.bosses);
      expect(got.coins.slice(0, 10), `dt ${dt}`).toEqual(ref.coins.slice(0, 10));
    }
  });
});

describe('sửa sau B6: trùm đúng xoá vết mực, thời gian trong vùng đập', () => {
  it('trả lời đúng câu trùm xoá 1 vết mực nếu đang có: 3 vết → 2 vết; 0 vết → vẫn 0', () => {
    const s = quiet();
    s.ink = 3;
    toQuiz(s);
    const e = answerBoss(s, 'correct', 7);
    expect(s.ink).toBe(2);
    expect(e[0]).toMatchObject({ type: 'bossAnswer', result: 'correct', points: 135, ink: 2 });
    expect(s.score).toBe(135);
    const t = quiet();
    expect(t.ink).toBe(0);
    toQuiz(t);
    answerBoss(t, 'correct', 7);
    expect(t.ink).toBe(0);
    expect(t.phase).toBe('play');
  });

  it('sai hoặc hết giờ vẫn +1 vết mực, không xoá vết nào', () => {
    for (const result of ['wrong', 'timeout'] as const) {
      const s = quiet();
      s.ink = 2;
      toQuiz(s);
      answerBoss(s, result, 0);
      expect(s.ink).toBe(3);
    }
  });

  it('trùm đúng ở lượt cuối khi đang có 4 vết mực: xoá 1 vết rồi mới xét kết thúc (hết ván "complete")', () => {
    const s = quiet();
    s.bossesDone = 9;
    s.ink = 4;
    toQuiz(s);
    answerBoss(s, 'correct', 3);
    expect(s.ink).toBe(3);
    expect(s.ended).toBe('complete');
  });

  it('thời gian chuột nằm trong vùng đập (dài 2,5 đơn vị): thường 1,154 giây và nhanh 0,721 giây ở giây 0; 0,692 và 0,433 giây ở giây 120', () => {
    const len = WHACK_SPEC.zoneEnd - WHACK_SPEC.zoneStart;
    expect(len).toBe(2.5);
    expect(len / mouseSpeed(0)).toBeCloseTo(1.1538, 3);
    expect(len / (mouseSpeed(0) * WHACK_SPEC.fastFactor)).toBeCloseTo(0.7212, 3);
    expect(len / mouseSpeed(120)).toBeCloseTo(0.6923, 3);
    expect(len / (mouseSpeed(120) * WHACK_SPEC.fastFactor)).toBeCloseTo(0.4327, 3);
    // đo trong ván: chuột thường ở giây 0 ở trong vùng đập khoảng 1,15 giây
    const s = quiet();
    const m = spawnMouse(s, 'thuong', 0, WHACK_SPEC.zoneStart);
    let t = 0;
    while (inZone(m) && t < 5) {
      stepWhack(s, 0.01);
      t += 0.01;
    }
    expect(t).toBeGreaterThan(1.14);
    expect(t).toBeLessThan(1.17);
  });
});
