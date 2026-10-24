import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { medalOf } from '@so-chung/core';
import { describe, expect, it } from 'vitest';
import { CHICKEN_SPEC, chickenVariant } from './chickenConfig';
import { AVERAGE_BOT, GOOD_BOT, ORACLE_BOT, SLOW_BOT, simulateChicken, simulateMany } from './chickenBots';
import { chickenScore, createChickenGame, dropLabel, phaseOf, scoreFromStats, selectMedicine, shoot, startWave, stepChicken, type ChickenState } from './chickenLogic';

/**
 * Cân bằng màn 9 (spec 07): 300 ván mỗi bot, seed 1 đến 300. Bot bắn con gà gần cổng nhất trước, chỉ dùng thao tác của học sinh (xem `chickenBots.ts`).
 * Bot giỏi: 0,4 giây mỗi phát, đúng thuốc 98%, nạp không sai ở 90% số đợt. Bot trung bình: 0,8 giây, đúng 85%, nạp sai một lần ở 50% số đợt. Bot chậm (sửa sau B10): 1,2 giây, đúng 80%, nạp sai một lần ở 60% số đợt.
 *
 * Mốc trở về 300 / 500 / 700 (sửa sau B10; quy tắc phân vị của bước B10 cho ba mốc dồn sát 650 / 690 / 710 vì điểm dồn trong khoảng 600 đến 750, và em chữa hết gà mà sai 12 phát thành "chưa đạt" là sai tinh thần):
 * Vàng = chữa hết gà và gà trùm, sai rất ít; Bạc = chơi hết 3 đợt; Đồng = qua 1 đến 2 đợt (xem điểm các kịch bản a đến d bên dưới).
 *
 * Hai mục tiêu (assert): bot giỏi Vàng ≥ 85% (mốc 700); bot chậm tới được gà trùm ≥ 60%. Bot trung bình chỉ in bảng, không assert ngưỡng Vàng.
 * Luật gốc đạt cả hai (bot chậm tới trùm 70,3%) nên KHÔNG dùng phương án A, B, C (A: gà chậm hơn 20%; B: A + 4 tim; C: B + nhịp sinh giãn 20%): số liệu các phương án ghi ở spec 07.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 07), mốc 300 / 500 / 700:
 *  - người chơi lý tưởng: 750 điểm ở mọi ván, Vàng 100%;
 *  - bot giỏi: điểm trung bình 737,4 (675 đến 750); chưa đạt 0, Đồng 0, Bạc 9, Vàng 291 (97,0%); tới trùm 100%, chữa xong trùm 100%; không mất tim;
 *  - bot trung bình: điểm trung bình 671,3 (590 đến 750); chưa đạt 0, Đồng 0, Bạc 233, Vàng 67 (22,3%); tới trùm 100%, chữa xong trùm 100%; không mất tim;
 *  - bot chậm: điểm trung bình 604,3 (200 đến 720); chưa đạt 3, Đồng 48, Bạc 232, Vàng 17 (5,7%); tới trùm 211 ván (70,3%), chữa xong trùm 211; hết tim 89 ván; mất 1,06 tim mỗi ván; 28,3 gà chữa, 8,0 phát sai mỗi ván.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */

const TICK = CHICKEN_SPEC.tick;
const medals = CHICKEN_SPEC.medals;
const medalName = (score: number) => (['chưa đạt', 'Đồng', 'Bạc', 'Vàng'] as const)[medalOf(score, medals)];

/** Nạp đúng hết đợt đang mở (nạp sai trước một lần nếu `dirty`: kéo nhãn bẫy vào một thuốc). */
function loadRound(s: ChickenState, dirty: boolean): void {
  const load = s.loads[s.round];
  const keys = s.spec.rounds[s.round].keys;
  if (dirty) dropLabel(s, load.labels.find((l) => l.kind === 'bay')!.id, 0);
  keys.forEach((k, i) => dropLabel(s, load.labels.find((l) => l.kind === 'dung' && l.value === publicKey(k))!.id, i));
}

interface Script {
  /** Đợt nào nạp sai một lần */
  dirty: readonly [boolean, boolean, boolean];
  /** Số phát bắn sai cố ý (bắn nhầm thuốc vào con gà nhắm tới, rồi bắn lại đúng) */
  wrong: number;
  /** Từ đợt này (đếm từ 0), người chơi chữa `cureBefore` con gà rồi buông tay để gà tới cổng cho tới hết tim */
  failRound?: number;
  cureBefore?: number;
}

/** Chơi một ván theo kịch bản bằng đúng thao tác của học sinh; trả về trạng thái cuối. */
function play(seed: number, sc: Script): ChickenState {
  const s = createChickenGame(seed);
  let wrongLeft = sc.wrong;
  let curedAtStart = 0;
  let guard = 0;
  while (phaseOf(s) !== 'ended' && guard++ < 400000) {
    if (phaseOf(s) === 'load') {
      loadRound(s, sc.dirty[s.round]);
      startWave(s);
      curedAtStart = s.stats.cured;
      continue;
    }
    stepChicken(s, TICK);
    if (phaseOf(s) === 'ended') break;
    if (sc.failRound === s.round && s.stats.cured - curedAtStart >= (sc.cureBefore ?? 0)) continue;
    const target = s.chickens.filter((c) => !s.projectiles.some((p) => p.chickenId === c.id)).sort((a, b) => b.pos - a.pos)[0];
    if (!target) continue;
    const keys = s.spec.rounds[s.round].keys;
    const right = keys.findIndex((k) => publicKey(k) === target.card);
    const med = wrongLeft > 0 ? [0, 1, 2].find((i) => i !== right)! : right;
    selectMedicine(s, med);
    if (shoot(s, target.id).ok && wrongLeft > 0) wrongLeft--; // chỉ tính phát sai khi phát bắn thật sự đi (không bị chờ giữa hai phát chặn)
  }
  return s;
}

describe('cân bằng màn 9', () => {
  const oracle = simulateMany(ORACLE_BOT, 300, medals);
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);
  const slow = simulateMany(SLOW_BOT, 300, medals);

  it('in bảng tỉ lệ từng mốc, điểm trung bình, % ván tới gà trùm, % chữa xong trùm và số tim mất của các bot', () => {
    const pct = (b: typeof good, n: number) => `${((100 * n) / b.games).toFixed(1)}%`;
    const row = (name: string, b: typeof good) =>
      `${name}: chưa đạt ${pct(b, b.medals.chua)} · Đồng ${pct(b, b.medals.dong)} · Bạc ${pct(b, b.medals.bac)} · Vàng ${pct(b, b.medals.vang)} · điểm trung bình ${b.mean.toFixed(1)} (${b.min} đến ${b.max}) · tới gà trùm ${pct(b, b.reachedBoss)} · chữa xong trùm ${pct(b, b.bossCleared)} · hết tim ${pct(b, b.lostHearts)} · trùm tới cổng ${pct(b, b.bossEscaped)} · tim mất ${b.meanHeartsLost.toFixed(2)} · ${b.meanCured.toFixed(1)} gà chữa, ${b.meanWrong.toFixed(1)} phát sai, ${b.meanCleanLoads.toFixed(2)} đợt nạp không sai · ${b.meanSeconds.toFixed(0)} giây`;
    console.info(['màn 9, 300 ván mỗi bot, mốc ' + medals.join(' / '), row('lý tưởng', oracle), row('bot giỏi', good), row('bot trung bình', avg), row('bot chậm', slow)].join('\n'));
    for (const b of [oracle, good, avg, slow]) {
      expect(b.games).toBe(300);
      expect(b.medals.chua + b.medals.dong + b.medals.bac + b.medals.vang).toBe(300);
    }
  });

  it('mục tiêu 1: bot giỏi Vàng ≥ 85% (mốc 700)', () => {
    expect(medals[2]).toBe(700);
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.85);
  });

  it('mục tiêu 2: bot chậm tới được gà trùm ≥ 60% số ván', () => {
    expect(slow.reachedBoss / slow.games).toBeGreaterThanOrEqual(0.6);
  });

  it('mốc trở về 300 / 500 / 700 theo nghĩa: Vàng = chữa hết gà và trùm, sai rất ít; Bạc = chơi hết 3 đợt; Đồng = qua 1 đến 2 đợt', () => {
    expect(medals).toEqual([300, 500, 700]);
    // chữa hết 30 gà thường đã được 600 điểm (+ thưởng nạp, − phát sai): chơi hết 3 đợt thì từ Bạc trở lên khi sai không quá nhiều
    expect(30 * CHICKEN_SPEC.points.cure).toBeGreaterThanOrEqual(medals[1]);
    // qua một đợt: 8 gà × 20 + 30 = 190 < 300 ≤ hai đợt: (8 + 10) × 20 = 360
    expect(8 * 20 + 30).toBeLessThan(medals[0]);
    expect((8 + 10) * 20).toBeGreaterThanOrEqual(medals[0]);
    expect((8 + 10) * 20 + 60).toBeLessThan(medals[1]);
  });

  it('luật gốc đạt cả hai mục tiêu nên không dùng phương án A, B, C: 3 tim, gà không chậm, nhịp sinh không giãn', () => {
    expect(CHICKEN_SPEC.hearts).toBe(3);
    expect(CHICKEN_SPEC.rounds.map((r) => r.runSeconds)).toEqual([9, 7, 6]);
    expect(CHICKEN_SPEC.rounds.map((r) => r.spawnEvery)).toEqual([1.6, 1.3, 1.1]);
    expect(CHICKEN_SPEC.boss.runSeconds).toBe(14);
  });

  it('các phương án A, B, C (chưa dùng) đúng như lời giao: A gà chậm hơn 20% mọi đợt, B thêm 4 tim, C thêm nhịp sinh giãn 20%', () => {
    const a = chickenVariant('A');
    const b = chickenVariant('B');
    const c = chickenVariant('C');
    expect(chickenVariant('base')).toBe(CHICKEN_SPEC);
    CHICKEN_SPEC.rounds.forEach((r, i) => {
      expect(a.rounds[i].runSeconds).toBeCloseTo(r.runSeconds * 1.25, 9); // tốc độ còn 80%
      expect(a.rounds[i].spawnEvery).toBe(r.spawnEvery);
      expect(c.rounds[i].spawnEvery).toBeCloseTo(r.spawnEvery * 1.2, 9);
      expect(b.rounds[i].spawnEvery).toBe(r.spawnEvery);
    });
    expect(a.boss.runSeconds).toBeCloseTo(17.5, 9);
    expect([a.hearts, b.hearts, c.hearts]).toEqual([3, 4, 4]);
    // phương án A (ván nhẹ hơn) vẫn đạt mục tiêu với bot chậm: kiểm nhanh với 60 ván
    const slowA = simulateMany(SLOW_BOT, 60, a.medals, a);
    expect(slowA.reachedBoss / slowA.games).toBeGreaterThanOrEqual(0.6);
  });

  it('bot chậm chủ yếu Bạc, hay mất tim ở đợt 3, nhưng không hết tim sớm: ít ván "chưa đạt"', () => {
    expect(slow.medals.bac).toBeGreaterThan(slow.medals.dong);
    expect(slow.medals.chua / slow.games).toBeLessThan(0.05);
    expect(slow.lostHearts).toBeGreaterThan(0);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateChicken(42, SLOW_BOT)).toEqual(simulateChicken(42, SLOW_BOT));
    expect(simulateMany(GOOD_BOT, 20, medals)).toEqual(simulateMany(GOOD_BOT, 20, medals));
  });

  it('người chơi lý tưởng: 750 điểm (tối đa 30 gà × 20 + 3 × 30 + 60), không sai, không mất tim, chữa xong trùm ở mọi ván', () => {
    expect(oracle.min).toBe(750);
    expect(oracle.max).toBe(750);
    expect(oracle.reachedBoss).toBe(300);
    expect(oracle.bossCleared).toBe(300);
    expect(oracle.meanWrong).toBe(0);
    expect(oracle.meanHeartsLost).toBe(0);
    expect(oracle.meanCleanLoads).toBe(3);
    expect(oracle.medals.vang).toBe(300);
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(737.4, 1);
    expect(good.min).toBe(675);
    expect(good.max).toBe(750);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 9, vang: 291 });
    expect(good.reachedBoss).toBe(300);
    expect(good.bossCleared).toBe(300);
    expect(avg.mean).toBeCloseTo(671.3, 1);
    expect(avg.min).toBe(590);
    expect(avg.max).toBe(750);
    expect(avg.medals).toEqual({ chua: 0, dong: 0, bac: 233, vang: 67 });
    expect(avg.reachedBoss).toBe(300);
    expect(avg.lostHearts + avg.bossEscaped).toBe(0);
    expect(slow.mean).toBeCloseTo(604.3, 1);
    expect(slow.min).toBe(200);
    expect(slow.max).toBe(720);
    expect(slow.medals).toEqual({ chua: 3, dong: 48, bac: 232, vang: 17 });
    expect(slow.reachedBoss).toBe(211);
    expect(slow.bossCleared).toBe(211);
    expect(slow.lostHearts).toBe(89);
    expect(slow.meanHeartsLost).toBeCloseTo(1.06, 2);
    expect(slow.meanCured).toBeCloseTo(28.3, 1);
    expect(slow.meanWrong).toBeCloseTo(8.0, 1);
  });
});

describe('kịch bản chơi và mốc 300 / 500 / 700 (điểm tính đúng công thức)', () => {
  it('(a) chữa hết gà và trùm, nạp đúng cả 3 đợt, sai 2 phát → 600 + 90 + 60 − 10 = 740 điểm: Vàng', () => {
    const s = play(11, { dirty: [false, false, false], wrong: 2 });
    expect(s.ended).toBe('complete');
    expect(s.stats.cured).toBe(30);
    expect(s.stats.cleanLoads).toBe(3);
    expect(s.stats.wrongShots).toBe(2);
    expect(chickenScore(s)).toBe(740);
    expect(scoreFromStats(s.spec, s.stats)).toBe(740);
    expect(medalName(740)).toBe('Vàng');
  });

  it('(b) chữa hết gà và trùm, nạp sai 2 đợt, sai 6 phát → 600 + 30 + 60 − 30 = 660 điểm: Bạc', () => {
    const s = play(12, { dirty: [true, false, true], wrong: 6 });
    expect(s.ended).toBe('complete');
    expect(s.stats.cured).toBe(30);
    expect(s.stats.cleanLoads).toBe(1);
    expect(s.stats.wrongShots).toBe(6);
    expect(chickenScore(s)).toBe(660);
    expect(medalName(660)).toBe('Bạc');
  });

  it('(b2) em chữa hết gà và trùm mà sai 12 phát vẫn không bị "chưa đạt": 600 + 90 + 60 − 60 = 690 điểm: Bạc (với mốc phân vị cũ 650 / 690 / 710 thì ván nạp sai cả ba đợt, 600 + 60 − 60 = 600, lại là "chưa đạt")', () => {
    const s = play(13, { dirty: [false, false, false], wrong: 12 });
    expect(s.ended).toBe('complete');
    expect(chickenScore(s)).toBe(690);
    expect(medalName(690)).toBe('Bạc');
    const worst = play(14, { dirty: [true, true, true], wrong: 12 });
    expect(chickenScore(worst)).toBe(600);
    expect(medalName(600)).toBe('Bạc');
    expect(medalOf(600, [650, 690, 710])).toBe(0); // mốc cũ: chưa đạt
  });

  it('(c) hết tim giữa đợt 3: hai đợt đầu chữa hết (360) — nạp đúng cả ba đợt, chữa 3 gà đợt 3 rồi để 3 gà tới cổng: 360 + 90 + 60 = 510 điểm: Bạc; nạp sai cả ba đợt, sai 8 phát, chưa chữa gà nào ở đợt 3: 360 − 40 = 320 điểm: Đồng', () => {
    const a = play(15, { dirty: [false, false, false], wrong: 0, failRound: 2, cureBefore: 3 });
    expect(a.ended).toBe('hearts');
    expect(a.round).toBe(2);
    expect(a.stats.cured).toBe(18 + 3);
    expect(a.stats.leaked).toBe(3);
    expect(chickenScore(a)).toBe(510);
    expect(scoreFromStats(a.spec, a.stats)).toBe(510);
    expect(medalName(510)).toBe('Bạc');
    const b = play(16, { dirty: [true, true, true], wrong: 8, failRound: 2, cureBefore: 0 });
    expect(b.ended).toBe('hearts');
    expect(b.round).toBe(2);
    expect(b.stats.cured).toBe(18);
    expect(chickenScore(b)).toBe(320);
    expect(medalName(320)).toBe('Đồng');
    // thấp nhất khi hết tim giữa đợt 3 mà hai đợt đầu chữa hết: 360 − 5 × (số phát sai) vẫn từ Đồng trở lên khi sai dưới 12 phát
    expect(medalName(360 - 5 * 11)).toBe('Đồng');
  });

  it('(d) hết tim ở đợt 1 → tối đa 5 gà chữa trước khi 3 gà tới cổng: 5 × 20 + 30 = 130 điểm: chưa đạt', () => {
    const none = play(17, { dirty: [false, false, false], wrong: 0, failRound: 0, cureBefore: 0 });
    expect(none.ended).toBe('hearts');
    expect(none.round).toBe(0);
    expect(chickenScore(none)).toBe(30);
    expect(medalName(30)).toBe('chưa đạt');
    const best = play(18, { dirty: [false, false, false], wrong: 0, failRound: 0, cureBefore: 5 });
    expect(best.ended).toBe('hearts');
    expect(best.round).toBe(0);
    expect(best.stats.cured).toBe(5);
    expect(chickenScore(best)).toBe(130);
    expect(medalName(130)).toBe('chưa đạt');
  });
});
