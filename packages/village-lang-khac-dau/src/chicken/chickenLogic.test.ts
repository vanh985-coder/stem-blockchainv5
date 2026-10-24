import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { describe, expect, it } from 'vitest';
import { CHICKEN_SPEC, type ChickenSpec } from './chickenConfig';
import {
  chickenScore,
  createChickenGame,
  dropLabel,
  loadComplete,
  makeLoad,
  roundPublics,
  scoreFromStats,
  selectMedicine,
  shoot,
  speedOf,
  startWave,
  stepChicken,
  tickChicken,
  type Chicken,
  type ChickenEvent,
  type ChickenState,
} from './chickenLogic';

const TICK = CHICKEN_SPEC.tick;
const KEYS = CHICKEN_SPEC.rounds.map((r) => r.keys);
const BIG_HEARTS: ChickenSpec = { ...CHICKEN_SPEC, hearts: 999 };

/** Nạp đúng hết đợt đang mở. */
function loadAll(s: ChickenState): void {
  const load = s.loads[s.round];
  s.spec.rounds[s.round].keys.forEach((k, i) => dropLabel(s, load.labels.find((l) => l.kind === 'dung' && l.value === publicKey(k))!.id, i));
}

/** Ván đã nạp đúng đợt 1 và đang ở đợt gà (chưa gà nào). */
function begin(seed = 1, spec: ChickenSpec = CHICKEN_SPEC): ChickenState {
  const s = createChickenGame(seed, spec);
  loadAll(s);
  expect(startWave(s)).toBe(true);
  return s;
}

/** Đặt một con gà vào làn (không qua bộ sinh) và coi như đợt đã sinh đủ gà, để bộ sinh không chen vào. */
function put(s: ChickenState, card: number, pos = 0, lane = 0, boss = false): Chicken {
  s.spawned = s.spec.rounds[s.round].chickens;
  const c: Chicken = { id: s.nextId++, lane, pos, speed: speedOf(s.spec, boss ? s.spec.boss.runSeconds : s.spec.rounds[s.round].runSeconds), card, boss, curesLeft: boss ? s.spec.boss.cures : 1 };
  s.chickens.push(c);
  return c;
}

/** Chạy `seconds` giây theo từng bước cố định, gom sự kiện kèm giây xảy ra. */
function run(s: ChickenState, seconds: number, until?: (s: ChickenState) => boolean): { t: number; e: ChickenEvent }[] {
  const out: { t: number; e: ChickenEvent }[] = [];
  const n = Math.round(seconds / TICK);
  for (let i = 1; i <= n; i++) {
    for (const e of stepChicken(s, TICK)) out.push({ t: i * TICK, e });
    if (until?.(s)) break;
  }
  return out;
}

/** Thuốc (chỉ số) đúng cho thẻ `card` ở đợt hiện tại. */
const medicineFor = (s: ChickenState, card: number): number => s.spec.rounds[s.round].keys.findIndex((k) => publicKey(k) === card);

describe('mẫu công khai và bảng ba đợt (spec 07 màn 9)', () => {
  it('publicKey của 3, 5, 6, 7, 9 là 10, 20, 8, 17, 11 (công thức của bài 3, không viết lại)', () => {
    expect([3, 5, 6, 7, 9].map((k) => publicKey(k))).toEqual([10, 20, 8, 17, 11]);
  });

  it('ba đợt: thuốc 3, 5, 6 / 5, 7, 9 / 3, 6, 7, 9; mẫu công khai 10, 20, 8 / 20, 17, 11 / 10, 8, 17, 11; số gà 8, 10, 12; 3 làn, 3 tim', () => {
    expect(KEYS).toEqual([[3, 5, 6], [5, 7, 9], [3, 6, 7, 9]]);
    expect([0, 1, 2].map((r) => roundPublics(CHICKEN_SPEC, r))).toEqual([[10, 20, 8], [20, 17, 11], [10, 8, 17, 11]]);
    expect(CHICKEN_SPEC.rounds.map((r) => r.chickens)).toEqual([8, 10, 12]);
    expect(CHICKEN_SPEC.lanes).toBe(3);
    expect(CHICKEN_SPEC.hearts).toBe(3);
    expect(CHICKEN_SPEC.medals[0]).toBeLessThan(CHICKEN_SPEC.medals[1]);
    expect(CHICKEN_SPEC.medals[1]).toBeLessThan(CHICKEN_SPEC.medals[2]);
  });
});

describe('bắn thuốc', () => {
  it('thuốc 5 bắn gà có thẻ 20 thì chữa được (+20, gà khỏe rời đường); bắn gà có thẻ 8 thì không chữa được (−5, gà chạy tiếp)', () => {
    const s = begin();
    const good = put(s, 20, 3, 0);
    const bad = put(s, 8, 3, 1);
    expect(selectMedicine(s, 1)).toBe(true); // thuốc 2 của đợt 1 là khuôn 5
    expect(KEYS[0][1]).toBe(5);
    expect(shoot(s, good.id).ok).toBe(true);
    const e1 = run(s, 0.41).map((x) => x.e);
    expect(e1.some((e) => e.type === 'cure' && e.chicken.id === good.id && e.points === 20)).toBe(true);
    expect(s.chickens.some((c) => c.id === good.id)).toBe(false);
    expect(s.score).toBe(30 + 20); // thưởng nạp đạn 30 (đợt này nạp không sai) và 20 điểm chữa gà
    run(s, 0.3); // chờ hết thời gian giữa hai phát
    const posBefore = s.chickens.find((c) => c.id === bad.id)!.pos;
    expect(shoot(s, bad.id).ok).toBe(true);
    const e2 = run(s, 0.41).map((x) => x.e);
    expect(e2.some((e) => e.type === 'wrong' && e.chicken.id === bad.id && e.points === -5)).toBe(true);
    const after = s.chickens.find((c) => c.id === bad.id)!;
    expect(after.pos).toBeGreaterThan(posBefore); // vẫn chạy tiếp
    expect(s.stats.wrongShots).toBe(1);
  });

  it('điểm: nạp đạn không sai +30 mỗi đợt, chữa +20, phát sai −5; `score` cộng dồn khớp công thức của spec', () => {
    const s = begin();
    expect(s.score).toBe(30); // đợt 1 nạp không sai
    const a = put(s, 10, 2, 0);
    const b = put(s, 20, 2, 1);
    selectMedicine(s, medicineFor(s, 10));
    shoot(s, a.id);
    run(s, 0.4);
    selectMedicine(s, 0); // thuốc 3 (mẫu 10) bắn gà thẻ 20: sai
    run(s, 0.1);
    shoot(s, b.id);
    run(s, 0.41);
    expect(s.score).toBe(30 + 20 - 5);
    expect(scoreFromStats(s.spec, s.stats)).toBe(s.score);
    expect(chickenScore(s)).toBe(45);
  });

  it('thẻ trên gà thường chỉ lấy trong bộ mẫu công khai của đợt, ở cả ba đợt; mỗi đợt sinh đủ 8, 10, 12 gà', () => {
    for (let r = 0; r < 3; r++) {
      const s = createChickenGame(r + 5, BIG_HEARTS);
      s.round = r;
      loadAll(s);
      startWave(s);
      const events = run(s, 80, (x) => x.phase !== 'wave').map((x) => x.e);
      const spawns = events.filter((e): e is Extract<ChickenEvent, { type: 'spawn' }> => e.type === 'spawn');
      expect(spawns).toHaveLength(CHICKEN_SPEC.rounds[r].chickens);
      const set = roundPublics(CHICKEN_SPEC, r);
      for (const e of spawns) expect(set, `đợt ${r + 1}: thẻ ${e.chicken.card}`).toContain(e.chicken.card);
      expect(new Set(spawns.map((e) => e.chicken.card)).size).toBeGreaterThan(1);
    }
  });

  it('gà chạy tới cổng thì mất 1 tim và gà biến mất; hết tim thì hết ván', () => {
    const s = begin();
    const keep = put(s, 10, 0.5, 2); // một con đứng yên ở làn 2 để đợt chưa kết thúc
    keep.speed = 0;
    const c = put(s, 10, 9.99, 0);
    run(s, 0.05);
    expect(s.hearts).toBe(2);
    expect(s.chickens.some((x) => x.id === c.id)).toBe(false);
    expect(s.stats.leaked).toBe(1);
    put(s, 10, 9.99, 0);
    put(s, 10, 9.99, 1);
    const events = run(s, 0.05).map((x) => x.e);
    expect(s.hearts).toBe(0);
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('hearts');
    expect(events.filter((e) => e.type === 'leak')).toHaveLength(2);
    expect(events.some((e) => e.type === 'end')).toBe(true);
  });

  it('viên thuốc bay 0,4 giây rồi mới xét kết quả; gà tới cổng trước thì phát đó không tính (không trừ điểm, không cộng)', () => {
    const s = begin();
    const c = put(s, 20, 3, 0);
    selectMedicine(s, 1);
    expect(shoot(s, c.id).ok).toBe(true);
    expect(run(s, 0.39).filter((x) => x.e.type === 'cure' || x.e.type === 'wrong')).toHaveLength(0);
    expect(s.chickens).toHaveLength(1);
    const late = run(s, 0.02);
    expect(late.some((x) => x.e.type === 'cure')).toBe(true);
    // gà tới cổng trước khi viên thuốc tới
    const t = begin();
    const keepT = put(t, 10, 0.5, 2); // giữ đợt chưa kết thúc
    keepT.speed = 0;
    const d = put(t, 20, 9.8, 0); // còn 0,2 đơn vị ≈ 0,18 giây tới cổng
    selectMedicine(t, 1);
    const before = t.score;
    shoot(t, d.id);
    const ev = run(t, 0.5).map((x) => x.e);
    expect(ev.some((e) => e.type === 'leak')).toBe(true);
    expect(ev.some((e) => e.type === 'void')).toBe(true);
    expect(ev.some((e) => e.type === 'wrong' || e.type === 'cure')).toBe(false);
    expect(t.score).toBe(before);
    expect(t.stats.voidShots).toBe(1);
    expect(t.stats.wrongShots).toBe(0);
  });

  it('giữa hai phát bắn tối thiểu 0,35 giây; không bắn khi gà không còn, khi chưa tới đợt gà hay đã hết ván', () => {
    const s = begin();
    const a = put(s, 10, 1, 0);
    const b = put(s, 20, 1, 1);
    expect(shoot(s, a.id).ok).toBe(true);
    const second = shoot(s, b.id);
    expect(second).toEqual({ ok: false, why: 'cooldown' });
    run(s, 0.34);
    expect(shoot(s, b.id)).toEqual({ ok: false, why: 'cooldown' });
    run(s, 0.02);
    expect(shoot(s, b.id).ok).toBe(true);
    expect(shoot(s, 9999)).toEqual({ ok: false, why: 'cooldown' });
    run(s, 0.4);
    expect(shoot(s, 9999)).toEqual({ ok: false, why: 'target' });
    const fresh = createChickenGame(1);
    expect(shoot(fresh, 1)).toEqual({ ok: false, why: 'phase' });
    expect(selectMedicine(fresh, 0)).toBe(false);
    const done = begin();
    done.phase = 'ended';
    expect(shoot(done, 1)).toEqual({ ok: false, why: 'phase' });
  });

  it('chọn thuốc: mặc định thuốc 1, chỉ số ngoài đợt không nhận; phát bắn dùng thuốc đang chọn lúc bắn (đổi thuốc sau đó không ảnh hưởng viên đang bay)', () => {
    const s = begin();
    expect(s.selected).toBe(0);
    expect(selectMedicine(s, 3)).toBe(false); // đợt 1 chỉ có 3 thuốc
    expect(selectMedicine(s, -1)).toBe(false);
    const c = put(s, 20, 3, 0);
    selectMedicine(s, 1);
    const shot = shoot(s, c.id);
    selectMedicine(s, 0);
    expect(shot.ok && shot.projectile.medicine).toBe(1);
    const ev = run(s, 0.41).map((x) => x.e);
    expect(ev.some((e) => e.type === 'cure')).toBe(true);
  });
});

describe('nạp đạn', () => {
  it('mỗi đợt đủ nhãn đúng (publicKey của từng khuôn), đúng 1 nhãn bẫy bằng số khuôn của một thuốc, 1 nhãn của khuôn ngoài đợt; nhãn nhiễu không trùng mẫu công khai nào của đợt (500 seed)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const s = createChickenGame(seed);
      for (let r = 0; r < 3; r++) {
        const keys = KEYS[r];
        const publics = roundPublics(CHICKEN_SPEC, r);
        const labels = s.loads[r].labels;
        expect(labels, `seed ${seed} đợt ${r + 1}`).toHaveLength(keys.length + 2);
        const right = labels.filter((l) => l.kind === 'dung');
        expect(right.map((l) => l.value).sort((a, b) => a - b)).toEqual([...publics].sort((a, b) => a - b));
        const trap = labels.filter((l) => l.kind === 'bay');
        expect(trap).toHaveLength(1);
        expect(keys).toContain(trap[0].value); // bằng chính số khuôn của một thuốc trong đợt
        const far = labels.filter((l) => l.kind === 'ngoai');
        expect(far).toHaveLength(1);
        const farKey = Array.from({ length: 22 }, (_, i) => i + 1).filter((k) => publicKey(k) === far[0].value);
        expect(farKey).toHaveLength(1);
        expect(keys).not.toContain(farKey[0]); // mẫu công khai của một khuôn ngoài đợt
        for (const l of [...trap, ...far]) expect(publics, `seed ${seed} đợt ${r + 1} nhãn nhiễu ${l.value}`).not.toContain(l.value);
        expect(new Set(labels.map((l) => l.value)).size).toBe(labels.length); // các nhãn khác nhau
        expect(labels.map((l) => l.id).sort((a, b) => a - b)).toEqual(labels.map((_, i) => i));
      }
    }
  });

  it('khay nhãn tất định theo seed và có nhiều cách xếp khác nhau giữa các seed', () => {
    expect(createChickenGame(7).loads).toEqual(createChickenGame(7).loads);
    const orders = new Set(Array.from({ length: 40 }, (_, i) => createChickenGame(i + 1).loads[0].labels.map((l) => l.value).join(',')));
    expect(orders.size).toBeGreaterThan(5);
    expect(makeLoad(CHICKEN_SPEC, 2, () => 0.5).labels).toHaveLength(6);
  });

  it('đợt chỉ bắt đầu khi mọi nhãn đúng đã nạp (nhãn nhiễu để lại khay)', () => {
    const s = createChickenGame(3);
    expect(s.phase).toBe('load');
    expect(startWave(s)).toBe(false);
    const load = s.loads[0];
    const right = KEYS[0].map((k) => load.labels.find((l) => l.kind === 'dung' && l.value === publicKey(k))!);
    expect(dropLabel(s, right[0].id, 0).ok).toBe(true);
    expect(dropLabel(s, right[1].id, 1).ok).toBe(true);
    expect(loadComplete(s)).toBe(false);
    expect(startWave(s)).toBe(false);
    expect(s.phase).toBe('load');
    expect(dropLabel(s, right[2].id, 2).ok).toBe(true);
    expect(loadComplete(s)).toBe(true);
    expect(load.labels.filter((l) => !l.placed).every((l) => l.kind !== 'dung')).toBe(true);
    expect(startWave(s)).toBe(true);
    expect(s.phase).toBe('wave');
    expect(startWave(s)).toBe(false); // không bắt đầu hai lần
    expect(dropLabel(s, right[0].id, 0)).toEqual({ ok: false, why: 'phase' });
  });

  it('kéo nhãn vào thuốc sai (kể cả nhãn nhiễu và nhãn đúng vào thuốc khác) thì nhãn bật ra; nạp sai dù một lần thì đợt đó mất thưởng 30, nạp đúng hết thì có thưởng', () => {
    const s = createChickenGame(11);
    const load = s.loads[0];
    const right = KEYS[0].map((k) => load.labels.find((l) => l.kind === 'dung' && l.value === publicKey(k))!);
    const trap = load.labels.find((l) => l.kind === 'bay')!;
    const far = load.labels.find((l) => l.kind === 'ngoai')!;
    const bounce1 = dropLabel(s, trap.id, KEYS[0].indexOf(trap.value));
    expect(bounce1).toMatchObject({ ok: false, why: 'bounce' });
    expect(trap.placed).toBe(false);
    expect(dropLabel(s, far.id, 0)).toMatchObject({ ok: false, why: 'bounce' });
    expect(dropLabel(s, right[0].id, 1)).toMatchObject({ ok: false, why: 'bounce' }); // nhãn đúng của thuốc 1 vào thuốc 2
    expect(right[0].placed).toBe(false);
    expect(load.wrong).toBe(3);
    expect(s.stats.wrongLoads).toBe(3);
    right.forEach((l, i) => expect(dropLabel(s, l.id, i).ok).toBe(true));
    expect(startWave(s)).toBe(true);
    expect(s.score).toBe(0); // mất thưởng 30
    expect(s.stats.cleanLoads).toBe(0);
    const clean = begin(11);
    expect(clean.score).toBe(30);
    expect(clean.stats.cleanLoads).toBe(1);
    expect(dropLabel(clean, 999, 0)).toEqual({ ok: false, why: 'phase' });
    const t = createChickenGame(11);
    expect(dropLabel(t, 999, 0)).toEqual({ ok: false, why: 'unknown' });
    expect(dropLabel(t, 0, 9)).toEqual({ ok: false, why: 'unknown' });
  });

  it('nạp đạn không tính giờ: bước thời gian ở pha nạp không làm gì', () => {
    const s = createChickenGame(2);
    expect(stepChicken(s, 30)).toEqual([]);
    expect(s.ticks).toBe(0);
    expect(s.hearts).toBe(3);
  });
});

describe('tốc độ, nhịp sinh và đợt kế tiếp', () => {
  it('nhịp sinh 1,6 / 1,3 / 1,1 giây: con đầu sau một nhịp, các con cách nhau đúng một nhịp', () => {
    const beat = [1.6, 1.3, 1.1];
    for (let r = 0; r < 3; r++) {
      const s = createChickenGame(40 + r, BIG_HEARTS);
      s.round = r;
      loadAll(s);
      startWave(s);
      const spawns = run(s, 80, (x) => x.phase !== 'wave').filter((x) => x.e.type === 'spawn');
      expect(spawns).toHaveLength(CHICKEN_SPEC.rounds[r].chickens);
      expect(spawns[0].t).toBeCloseTo(beat[r], 1);
      for (let i = 1; i < spawns.length; i++) expect(spawns[i].t - spawns[i - 1].t, `đợt ${r + 1} con ${i}`).toBeCloseTo(beat[r], 1);
    }
  });

  it('tốc độ: gà chạy từ 0 tới cổng trong 9 / 7 / 6 giây theo đợt, gà trùm 14 giây (làn dài 10)', () => {
    expect(CHICKEN_SPEC.laneLength).toBe(10);
    const secs = [9, 7, 6];
    for (let r = 0; r < 3; r++) {
      const s = createChickenGame(50 + r, BIG_HEARTS);
      s.round = r;
      loadAll(s);
      startWave(s);
      const ev = run(s, 30, (x) => x.hearts < 999);
      const spawn = ev.find((x) => x.e.type === 'spawn')!;
      const leak = ev.find((x) => x.e.type === 'leak')!;
      expect(leak.t - spawn.t, `đợt ${r + 1}`).toBeCloseTo(secs[r], 1);
      expect((spawn.e as { chicken: Chicken }).chicken.speed).toBeCloseTo(10 / secs[r], 9);
    }
    expect(CHICKEN_SPEC.boss.runSeconds).toBe(14);
  });

  it('không sinh vào làn có con gần nhất còn dưới 1,5; hết đợt thì sang nạp đạn đợt sau (đợt 3 thì gà trùm)', () => {
    const s = createChickenGame(8, BIG_HEARTS);
    loadAll(s);
    startWave(s);
    // làn 0 và 1 đều có gà ở vị trí 1 (dưới 1,5): chỉ còn làn 2
    s.spawned = 0;
    s.spawnIn = TICK;
    s.chickens.push({ id: 900, lane: 0, pos: 1, speed: 0, card: 10, boss: false, curesLeft: 1 }, { id: 901, lane: 1, pos: 1, speed: 0, card: 10, boss: false, curesLeft: 1 });
    const ev = run(s, 0.05).map((x) => x.e).filter((e) => e.type === 'spawn');
    expect(ev).toHaveLength(1);
    expect((ev[0] as { chicken: Chicken }).chicken.lane).toBe(2);
    // đủ ba làn đều vướng: không sinh, không rút số ngẫu nhiên
    const t = createChickenGame(8, BIG_HEARTS);
    loadAll(t);
    startWave(t);
    for (let lane = 0; lane < 3; lane++) t.chickens.push({ id: 900 + lane, lane, pos: 1, speed: 0, card: 10, boss: false, curesLeft: 1 });
    t.spawnIn = TICK;
    expect(run(t, 0.1).filter((x) => x.e.type === 'spawn')).toHaveLength(0);
    expect(t.spawned).toBe(0);
    // hết đợt 1
    const u = createChickenGame(9, BIG_HEARTS);
    loadAll(u);
    startWave(u);
    const waveEnd = run(u, 60, (x) => x.phase === 'load').find((x) => x.e.type === 'waveEnd');
    expect(waveEnd).toBeDefined();
    expect(u.phase).toBe('load');
    expect(u.round).toBe(1);
    expect(u.projectiles).toEqual([]);
    expect(startWave(u)).toBe(false); // phải nạp đạn đợt 2 trước
  });

  it('cùng seed cùng ván; dt 1/30, 1/60, 1/144 cho cùng kết quả', () => {
    const snap = (dt: number) => {
      const s = createChickenGame(77, BIG_HEARTS);
      s.round = 1;
      loadAll(s);
      startWave(s);
      const events: string[] = [];
      let t = 0;
      while (t < 25 - 1e-9) {
        for (const e of stepChicken(s, dt)) events.push(e.type + ('chicken' in e ? `:${e.chicken.id}:${e.chicken.lane}:${e.chicken.card}` : ''));
        t += dt;
      }
      return { ticks: s.ticks, events, chickens: s.chickens.map((c) => [c.id, c.lane, c.card, +c.pos.toFixed(6)]), hearts: s.hearts, phase: s.phase, round: s.round };
    };
    const a = snap(1 / 30);
    expect(snap(1 / 30)).toEqual(a);
    expect(snap(1 / 60)).toEqual(a);
    expect(snap(1 / 144)).toEqual(a);
    expect(a.events.filter((e) => e.startsWith('spawn')).length).toBeGreaterThan(5);
  });

  it('tạm dừng: tickChicken với paused không đổi gì (gà, viên thuốc, đồng hồ sinh, thời gian chờ giữa hai phát)', () => {
    const s = begin();
    const c = put(s, 20, 3, 0);
    selectMedicine(s, 1);
    shoot(s, c.id);
    run(s, 0.1);
    const snap = JSON.stringify([s.chickens, s.projectiles, s.cooldown, s.spawnIn, s.ticks, s.acc]);
    expect(tickChicken(s, 5, true)).toEqual([]);
    expect(JSON.stringify([s.chickens, s.projectiles, s.cooldown, s.spawnIn, s.ticks, s.acc])).toBe(snap);
    expect(tickChicken(s, 0.5, false).length).toBeGreaterThan(0);
  });
});

describe('gà trùm', () => {
  /** Ván ở cuối đợt 3 với gà trùm vừa xuất hiện. */
  function bossGame(seed = 5): ChickenState {
    const s = createChickenGame(seed, BIG_HEARTS);
    s.round = 2;
    loadAll(s);
    startWave(s);
    s.spawned = CHICKEN_SPEC.rounds[2].chickens;
    s.chickens = [];
    const ev = run(s, 0.05).map((x) => x.e);
    expect(ev.some((e) => e.type === 'waveEnd')).toBe(true);
    expect(ev.some((e) => e.type === 'bossStart')).toBe(true);
    expect(s.phase).toBe('boss');
    return s;
  }

  it('xuất hiện sau đợt 3 ở làn giữa, chạy 14 giây tới cổng; thẻ lấy trong bộ mẫu công khai của đợt 3', () => {
    const s = bossGame();
    const b = s.chickens[0];
    expect(b.boss).toBe(true);
    expect(b.lane).toBe(1);
    expect(b.curesLeft).toBe(3);
    expect(b.speed).toBeCloseTo(10 / 14, 9);
    expect(roundPublics(CHICKEN_SPEC, 2)).toContain(b.card);
    expect(s.stats.reachedBoss).toBe(true);
  });

  it('cần chữa đúng 3 lần; sau mỗi lần đúng thẻ đổi sang số KHÁC trong bộ đợt 3; chữa xong thì +60 và hết ván (complete)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = bossGame(seed);
      const b = s.chickens[0];
      const set = roundPublics(CHICKEN_SPEC, 2);
      const cards = [b.card];
      for (let k = 1; k <= 3; k++) {
        selectMedicine(s, medicineFor(s, b.card));
        const before = s.score;
        expect(shoot(s, b.id).ok).toBe(true);
        const ev = run(s, 0.41).map((x) => x.e);
        expect(ev.some((e) => e.type === 'cure')).toBe(true);
        if (k < 3) {
          expect(s.phase, `seed ${seed} lần ${k}`).toBe('boss');
          expect(b.curesLeft).toBe(3 - k);
          expect(b.card).not.toBe(cards[cards.length - 1]); // đổi sang số khác
          expect(set).toContain(b.card);
          expect(s.score).toBe(before); // mỗi lần chữa không có điểm riêng
          cards.push(b.card);
          run(s, 0.3);
        } else {
          expect(s.phase).toBe('ended');
          expect(s.ended).toBe('complete');
          expect(s.score).toBe(before + 60);
          expect(ev.some((e) => e.type === 'bossCleared' && e.points === 60)).toBe(true);
          expect(s.stats.bossCleared).toBe(true);
        }
      }
      expect(s.stats.bossCures).toBe(3);
      expect(s.chickens).toHaveLength(0);
    }
  });

  it('dãy thẻ của trùm rút sẵn khi tạo ván: hai thẻ liền nhau khác nhau, đều thuộc bộ đợt 3 (500 seed)', () => {
    const set = roundPublics(CHICKEN_SPEC, 2);
    for (let seed = 1; seed <= 500; seed++) {
      const cards = createChickenGame(seed).bossCards;
      expect(cards).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        expect(set).toContain(cards[i]);
        if (i > 0) expect(cards[i]).not.toBe(cards[i - 1]);
      }
    }
  });

  it('bắn sai gà trùm thì −5 và không mất lần chữa; gà trùm tới cổng thì mất 1 tim và hết ván (không +60)', () => {
    const s = bossGame(3);
    const b = s.chickens[0];
    const wrongMed = [0, 1, 2, 3].find((i) => i !== medicineFor(s, b.card))!;
    selectMedicine(s, wrongMed);
    const before = s.score;
    shoot(s, b.id);
    run(s, 0.41);
    expect(s.score).toBe(before - 5);
    expect(b.curesLeft).toBe(3);
    // chạy tới cổng mà chưa chữa xong
    b.pos = 9.99;
    const hearts = s.hearts;
    const ev = run(s, 0.1).map((x) => x.e);
    expect(s.hearts).toBe(hearts - 1);
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('boss');
    expect(ev.some((e) => e.type === 'leak' && e.chicken.boss)).toBe(true);
    expect(ev.some((e) => e.type === 'bossCleared')).toBe(false);
    expect(s.stats.bossCleared).toBe(false);
  });

  it('chữa hai lần rồi để trùm tới cổng: vẫn hết ván, không có +60', () => {
    const s = bossGame(4);
    const b = s.chickens[0];
    for (let k = 0; k < 2; k++) {
      selectMedicine(s, medicineFor(s, b.card));
      shoot(s, b.id);
      run(s, 0.41);
      run(s, 0.3);
    }
    expect(b.curesLeft).toBe(1);
    const score = s.score;
    b.pos = 9.99;
    run(s, 0.1);
    expect(s.ended).toBe('boss');
    expect(s.score).toBe(score);
  });
});

describe('cả ván', () => {
  it('người chơi hoàn hảo (nạp đúng, bắn đúng, không sót): 30 gà × 20 + 3 × 30 + 60 = 750, không mất tim', () => {
    const s = createChickenGame(123);
    let guard = 0;
    while (s.phase !== 'ended' && guard++ < 200000) {
      if (s.phase === 'load') {
        loadAll(s);
        startWave(s);
        continue;
      }
      stepChicken(s, TICK);
      const target = s.chickens.filter((c) => !s.projectiles.some((p) => p.chickenId === c.id)).sort((a, b) => b.pos - a.pos)[0];
      if (target) {
        selectMedicine(s, medicineFor(s, target.card));
        shoot(s, target.id);
      }
    }
    expect(s.ended).toBe('complete');
    expect(s.stats.cured).toBe(30);
    expect(s.stats.cleanLoads).toBe(3);
    expect(s.stats.wrongShots).toBe(0);
    expect(s.hearts).toBe(3);
    expect(s.score).toBe(750);
    expect(chickenScore(s)).toBe(750);
    expect(scoreFromStats(s.spec, s.stats)).toBe(750);
  });

  it('điểm cả ván không âm (hiển thị), dù trừ nhiều phát sai', () => {
    const s = begin();
    s.score = -35;
    expect(chickenScore(s)).toBe(0);
  });
});
