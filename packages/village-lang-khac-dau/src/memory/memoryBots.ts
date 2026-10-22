/**
 * Bot mô phỏng cả ván màn 8 (3 vòng) để kiểm tra cân bằng mốc điểm. Chỉ dùng trong test, không vào bản chạy.
 *
 * Bot chỉ dùng thao tác của học sinh (`flipCard`) và chỉ biết những gì học sinh nhìn thấy: mặt thẻ khi thẻ lật lên (kết quả của `flipCard`) và hai thẻ có vệt sáng tím
 * khi {phanDien} tráo (sự kiện `swap` của `stepMemory`). Thời gian trôi theo nhịp bấm của bot (`stepMemory` tính bằng ms), nên vòng 3 có tráo bài như khi chơi thật.
 *
 * - Bot giỏi: nhớ hết thẻ đã thấy, tính đúng 5^x mod 23, để ý cả hai thẻ bị tráo.
 * - Bot trung bình: nhớ sai một phần. Sau mỗi lượt, mỗi thẻ đang nhớ có xác suất `forget` bị quên; khi lật theo trí nhớ có xác suất `slip` nhớ nhầm sang thẻ úp bên cạnh;
 *   không để ý thẻ nào bị tráo (`trackSwap: false`), nên trí nhớ về hai chỗ đó thành sai.
 */
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MEMORY_SPEC } from './memoryConfig';
import { advanceRound, createMemoryGame, flipCard, memoryScore, stepMemory, type CardType } from './memoryLogic';

export interface MemoryBotProfile {
  name: string;
  /** Xác suất quên một thẻ đang nhớ sau mỗi lượt */
  forget: number;
  /** Xác suất lật nhầm sang thẻ úp bên cạnh khi lật theo trí nhớ */
  slip: number;
  /** Có để ý hai thẻ bị {phanDien} tráo hay không */
  trackSwap: boolean;
  /** Thời gian mỗi lần lật một thẻ (ms): [nhỏ nhất, lớn nhất] */
  flipMs: readonly [number, number];
}

export const GOOD_BOT: MemoryBotProfile = { name: 'good', forget: 0, slip: 0, trackSwap: true, flipMs: [900, 1500] };
export const AVERAGE_BOT: MemoryBotProfile = { name: 'average', forget: 0.3, slip: 0.15, trackSwap: false, flipMs: [1500, 2500] };

interface Seen {
  type: CardType;
  value: number;
}

export interface MemorySimResult {
  score: number;
  /** Số lần lật sai từng vòng */
  errors: number[];
  /** Số lần {phanDien} tráo ở vòng 3 */
  swaps: number;
}

/** Hai thẻ có khớp không, theo đúng phép tính học sinh làm (5^x mod 23 bằng publicKey). */
const pairs = (a: Seen, b: Seen): boolean => (a.type === 'khuon' && b.type === 'mau' ? publicKey(a.value) === b.value : a.type === 'mau' && b.type === 'khuon' ? publicKey(b.value) === a.value : false);

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateMemory(seed: number, p: MemoryBotProfile): MemorySimResult {
  const s = createMemoryGame(seed);
  const rnd = createMulberry32((seed * 2654435761) >>> 0);
  const errors: number[] = [];
  let swaps = 0;

  for (let r = 0; r < MEMORY_SPEC.rounds.length; r++) {
    const mem = new Map<number, Seen>();
    const wait = (ms: number) => {
      for (const e of stepMemory(s, ms)) {
        if (e.kind !== 'swap') continue;
        swaps++;
        const [a, b] = e.indices;
        if (!p.trackSwap) continue;
        const ma = mem.get(a);
        const mb = mem.get(b);
        mem.delete(a);
        mem.delete(b);
        if (ma) mem.set(b, ma);
        if (mb) mem.set(a, mb);
      }
    };
    const flipTime = () => p.flipMs[0] + rnd() * (p.flipMs[1] - p.flipMs[0]);
    const unknown = () => {
      const list: number[] = [];
      s.cards.forEach((c, i) => {
        if (!c.isMatched && !c.isFlipped && !mem.has(i)) list.push(i);
      });
      return list;
    };
    /** Lật theo trí nhớ, có thể nhầm sang thẻ úp bên cạnh. */
    const aim = (i: number) => {
      if (rnd() >= p.slip) return i;
      const n = [i - 1, i + 1].filter((j) => j >= 0 && j < s.cards.length && !s.cards[j].isMatched && !s.cards[j].isFlipped);
      return n.length > 0 ? n[Math.floor(rnd() * n.length)] : i;
    };
    const flip = (i: number) => {
      wait(flipTime());
      const res = flipCard(s, i);
      if (res.kind === 'first') mem.set(i, { type: res.card.type, value: res.card.value });
      else if (res.kind === 'mismatch') for (const [k, idx] of res.indices.entries()) mem.set(idx, { type: res.cards[k].type, value: res.cards[k].value });
      else if (res.kind === 'match') for (const idx of res.indices) mem.delete(idx);
      return res;
    };
    const knownPartner = (of: Seen, except: number): number => {
      for (const [i, m] of mem) if (i !== except && !s.cards[i].isMatched && pairs(of, m)) return i;
      return -1;
    };

    let guard = 0;
    while (s.phase === 'playing' && guard++ < 500) {
      // Còn cặp sai đang chờ úp: đợi úp lại rồi mới lật tiếp
      if (s.waitingFlipBack) wait(MEMORY_SPEC.flipBackDelayMs);
      // 1. Nhớ được cả cặp: lật luôn
      let first = -1;
      let second = -1;
      for (const [i, m] of mem) {
        if (s.cards[i].isMatched) continue;
        const j = knownPartner(m, i);
        if (j >= 0) {
          first = i;
          second = j;
          break;
        }
      }
      if (first >= 0) {
        const r1 = flip(aim(first));
        if (r1.kind !== 'first') continue;
        const seen = { type: r1.card.type, value: r1.card.value };
        const j = knownPartner(seen, r1.index);
        flip(aim(j >= 0 ? j : second));
      } else {
        // 2. Lật một thẻ chưa biết; biết thẻ hợp với nó thì lật thẻ đó, không thì lật thêm một thẻ chưa biết
        const u = unknown();
        const pool = u.length > 0 ? u : s.cards.map((_, i) => i).filter((i) => !s.cards[i].isMatched && !s.cards[i].isFlipped);
        const r1 = flip(pool[Math.floor(rnd() * pool.length)]);
        if (r1.kind !== 'first') continue;
        const seen = { type: r1.card.type, value: r1.card.value };
        const j = knownPartner(seen, r1.index);
        if (j >= 0) flip(aim(j));
        else {
          const u2 = unknown().filter((i) => i !== r1.index);
          const pool2 = u2.length > 0 ? u2 : s.cards.map((_, i) => i).filter((i) => i !== r1.index && !s.cards[i].isMatched && !s.cards[i].isFlipped);
          flip(pool2[Math.floor(rnd() * pool2.length)]);
        }
      }
      // Hết lượt: quên bớt
      if (p.forget > 0) for (const i of [...mem.keys()]) if (rnd() < p.forget) mem.delete(i);
    }
    errors.push(s.errors);
    if (s.phase === 'roundDone') advanceRound(s);
  }
  return { score: memoryScore(s), errors, swaps };
}

export interface MemoryBalance {
  games: number;
  mean: number;
  min: number;
  max: number;
  /** Số ván theo mốc: chua (chưa đạt), dong, bac, vang */
  medals: { chua: number; dong: number; bac: number; vang: number };
  /** Số lần lật sai trung bình từng vòng */
  meanErrors: number[];
}

export function simulateMany(profile: MemoryBotProfile, games: number, medals: MedalThresholds): MemoryBalance {
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  const errSum = MEMORY_SPEC.rounds.map(() => 0);
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateMemory(seed, profile);
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    r.errors.forEach((e, i) => (errSum[i] += e));
    count[(['chua', 'dong', 'bac', 'vang'] as const)[medalOf(r.score, medals)]]++;
  }
  return { games, mean: sum / games, min, max, medals: count, meanErrors: errSum.map((e) => e / games) };
}

