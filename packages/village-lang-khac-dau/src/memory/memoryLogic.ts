/**
 * Logic màn 8 "Lật thẻ tìm cặp khóa" (spec 07, mục "Màn 8").
 * Hàm thuần túy (không React, không Three).
 * Mẫu công khai được tính bằng publicKey() có sẵn trong Bài 3 (p = 23, g = 5).
 */
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { createMulberry32, shuffle } from '@so-chung/core/lib/rng';
import { medalOf, type Medal } from '@so-chung/core';
import { MEMORY_SPEC, PRACTICE_KEYS } from './memoryConfig';

export type CardType = 'khuon' | 'mau';

export interface MemoryCard {
  id: string;
  type: CardType;
  kind: CardType;
  value: number;
  so: number;
  pairKey: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export type SwapPair = [number, number] & {
  indexA: number;
  indexB: number;
  cardA: MemoryCard;
  cardB: MemoryCard;
  indices: [number, number];
  cards: [MemoryCard, MemoryCard];
};

export type FlipResult =
  | { kind: 'first'; index: number; card: MemoryCard }
  | {
      kind: 'match';
      indices: [number, number];
      cards: [MemoryCard, MemoryCard];
      roundDone: boolean;
      gameOver: boolean;
      score: number;
    }
  | {
      kind: 'mismatch';
      indices: [number, number];
      cards: [MemoryCard, MemoryCard];
      errors: number;
    }
  | { kind: 'ignored'; reason: string };

export type MemoryEvent =
  | { kind: 'flipBack'; indices: [number, number] }
  | { kind: 'swap'; indices: [number, number]; cards: [MemoryCard, MemoryCard] };

export interface MemoryState {
  seed: number;
  rng: () => number;
  round: number; // 0, 1, 2
  cards: MemoryCard[];
  flippedIndices: number[];
  waitingFlipBack: boolean;
  flipBackTimerMs: number;
  errors: number;
  sai: number;
  swapTimerMs: number;
  roundScores: number[];
  phase: 'playing' | 'waiting' | 'roundDone' | 'gameOver';
  isOver: boolean;
}

/**
 * Tạo bộ thẻ cho n cặp:
 * Chọn n số trong bộ khuôn tập, với mỗi khuôn x sinh một thẻ khuôn (giá trị x)
 * và một thẻ mẫu công khai (giá trị publicKey(x) = 5^x mod 23).
 * Không có tên, không có chân dung.
 */
export function makeDeck(rng: () => number, pairCount: number): MemoryCard[] {
  if (pairCount <= 0) return [];
  const count = Math.min(pairCount, PRACTICE_KEYS.length);
  const chosenKeys = shuffle(PRACTICE_KEYS, rng).slice(0, count);

  const deck: MemoryCard[] = [];
  for (const x of chosenKeys) {
    const y = publicKey(x);

    deck.push({
      id: `khuon-${x}`,
      type: 'khuon',
      kind: 'khuon',
      value: x,
      so: x,
      pairKey: x,
      isFlipped: false,
      isMatched: false,
    });

    deck.push({
      id: `mau-${x}`,
      type: 'mau',
      kind: 'mau',
      value: y,
      so: y,
      pairKey: x,
      isFlipped: false,
      isMatched: false,
    });
  }

  return shuffle(deck, rng);
}

/**
 * Kiểm tra xem 2 thẻ có khớp thành một cặp (khuôn x và mẫu 5^x mod 23) hay không.
 */
export function areCardsMatching(
  a: Pick<MemoryCard, 'type' | 'value'>,
  b: Pick<MemoryCard, 'type' | 'value'>,
): boolean {
  if (a.type === 'khuon' && b.type === 'mau') {
    return publicKey(a.value) === b.value;
  }
  if (a.type === 'mau' && b.type === 'khuon') {
    return publicKey(b.value) === a.value;
  }
  return false;
}

/**
 * Điểm mỗi vòng = max(0, 300 − 10 × số lần sai).
 */
export function roundScore(errors: number): number {
  return Math.max(0, MEMORY_SPEC.roundBaseScore - MEMORY_SPEC.perErrorPenalty * errors);
}

/**
 * Tổng điểm các vòng.
 */
export function totalScore(roundScores: readonly number[]): number {
  return roundScores.reduce((acc, score) => acc + score, 0);
}

/**
 * Tổng điểm của một ván chơi.
 */
export function memoryScore(state: Pick<MemoryState, 'roundScores'>): number {
  return totalScore(state.roundScores);
}

/**
 * Xếp mốc huy chương cả ván (Đồng: 300, Bạc: 550, Vàng: 750).
 */
export function memoryMedal(score: number): Medal {
  return medalOf(score, MEMORY_SPEC.medals);
}

/**
 * Chọn 2 thẻ đang úp VÀ chưa khớp để {phanDien} tráo.
 * Dưới 2 thẻ như vậy trả về null.
 * Không bao giờ chọn thẻ đã khớp hoặc thẻ đang lật mở.
 */
export function pickSwap(
  state: {
    cards?: MemoryCard[];
    deck?: MemoryCard[];
    flippedIndices?: number[];
    matchedIndices?: any;
  },
  rng: () => number,
): SwapPair | null {
  const cards = state.cards ?? state.deck;
  if (!cards || cards.length < 2) return null;

  const eligible: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i] as any;
    const isFlipped =
      c.isFlipped === true ||
      c.flipped === true ||
      c.isFaceUp === true ||
      (Array.isArray(state.flippedIndices) && state.flippedIndices.includes(i));
    const isMatched =
      c.isMatched === true ||
      c.matched === true ||
      (state.matchedIndices?.has
        ? state.matchedIndices.has(i)
        : Array.isArray(state.matchedIndices)
        ? state.matchedIndices.includes(i)
        : false);

    if (!isFlipped && !isMatched) {
      eligible.push(i);
    }
  }

  if (eligible.length < 2) {
    return null;
  }

  const shuffled = shuffle(eligible, rng);
  const first = shuffled[0];
  const second = shuffled[1];

  const pair = [first, second] as SwapPair;
  pair.indexA = first;
  pair.indexB = second;
  pair.cardA = cards[first];
  pair.cardB = cards[second];
  pair.indices = [first, second];
  pair.cards = [cards[first], cards[second]];
  return pair;
}

/**
 * Tráo vị trí 2 thẻ trong danh sách.
 */
export function swapCards(
  state: { cards?: MemoryCard[]; deck?: MemoryCard[] },
  indexA: number,
  indexB: number,
): boolean {
  const cards = state.cards ?? state.deck;
  if (!cards || indexA < 0 || indexA >= cards.length || indexB < 0 || indexB >= cards.length) {
    return false;
  }
  const temp = cards[indexA];
  cards[indexA] = cards[indexB];
  cards[indexB] = temp;
  return true;
}

/**
 * Khởi tạo ván chơi mới từ seed ngẫu nhiên.
 */
export function createMemoryGame(seed: number): MemoryState {
  const rng = createMulberry32(seed);
  const round = 0;
  const cards = makeDeck(rng, MEMORY_SPEC.rounds[round].pairs);

  return {
    seed,
    rng,
    round,
    cards,
    flippedIndices: [],
    waitingFlipBack: false,
    flipBackTimerMs: 0,
    errors: 0,
    sai: 0,
    swapTimerMs: 0,
    roundScores: [],
    phase: 'playing',
    isOver: false,
  };
}

/**
 * Úp lại 2 thẻ lật sai đang chờ úp.
 */
export function resolveMismatch(state: MemoryState): boolean {
  if (!state.waitingFlipBack && state.flippedIndices.length === 0) {
    return false;
  }
  for (const idx of state.flippedIndices) {
    if (state.cards[idx] && !state.cards[idx].isMatched) {
      state.cards[idx].isFlipped = false;
    }
  }
  state.flippedIndices = [];
  state.waitingFlipBack = false;
  state.flipBackTimerMs = 0;
  return true;
}

/**
 * Học sinh bấm lật thẻ tại vị trí index.
 */
export function flipCard(state: MemoryState, index: number): FlipResult {
  if (state.phase === 'gameOver' || state.phase === 'roundDone') {
    return { kind: 'ignored', reason: 'round_not_active' };
  }

  if (index < 0 || index >= state.cards.length) {
    return { kind: 'ignored', reason: 'out_of_bounds' };
  }

  // Bấm lại thẻ đang mở (kể cả cặp sai đang chờ úp) hoặc thẻ đã khớp: bỏ qua, không đổi trạng thái
  const card = state.cards[index];
  if (card.isMatched || card.isFlipped) {
    return { kind: 'ignored', reason: 'already_open_or_matched' };
  }

  // Đang chờ úp lại mà người chơi lật thẻ thứ ba thì úp cặp sai ngay (không tính thêm lần sai)
  if (state.waitingFlipBack) {
    resolveMismatch(state);
  }

  card.isFlipped = true;
  state.flippedIndices.push(index);

  if (state.flippedIndices.length === 1) {
    return { kind: 'first', index, card };
  }

  const [i1, i2] = state.flippedIndices;
  const c1 = state.cards[i1];
  const c2 = state.cards[i2];

  if (areCardsMatching(c1, c2)) {
    c1.isMatched = true;
    c2.isMatched = true;
    state.flippedIndices = [];

    const allMatched = state.cards.every((c) => c.isMatched);
    let roundDone = false;
    let gameOver = false;
    let score = 0;

    if (allMatched) {
      score = roundScore(state.errors);
      state.roundScores.push(score);
      roundDone = true;

      if (state.round >= MEMORY_SPEC.rounds.length - 1) {
        gameOver = true;
        state.phase = 'gameOver';
        state.isOver = true;
      } else {
        state.phase = 'roundDone';
      }
    }

    return {
      kind: 'match',
      indices: [i1, i2],
      cards: [c1, c2],
      roundDone,
      gameOver,
      score,
    };
  }

  // Lật sai
  state.errors++;
  state.sai = state.errors;
  state.waitingFlipBack = true;
  state.flipBackTimerMs = MEMORY_SPEC.flipBackDelayMs;

  return {
    kind: 'mismatch',
    indices: [i1, i2],
    cards: [c1, c2],
    errors: state.errors,
  };
}

/**
 * Chuyển sang vòng kế tiếp sau khi hoàn thành vòng trước.
 */
export function advanceRound(state: MemoryState): boolean {
  if (state.phase !== 'roundDone' || state.round >= MEMORY_SPEC.rounds.length - 1) {
    return false;
  }
  state.round++;
  const spec = MEMORY_SPEC.rounds[state.round];
  state.cards = makeDeck(state.rng, spec.pairs);
  state.flippedIndices = [];
  state.waitingFlipBack = false;
  state.flipBackTimerMs = 0;
  state.errors = 0;
  state.sai = 0;
  state.swapTimerMs = 0;
  state.phase = 'playing';
  return true;
}

/**
 * Bước thời gian cho đồng hồ úp lại (800ms) và đồng hồ tráo thẻ ở vòng 3 (20000ms).
 * dt tính bằng ms (cùng đơn vị với MEMORY_SPEC).
 */
export function stepMemory(state: MemoryState, dt: number): MemoryEvent[] {
  const dtMs = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const events: MemoryEvent[] = [];

  if (state.phase !== 'playing' && state.phase !== 'waiting') {
    return events;
  }

  // 1. Đồng hồ úp lại sau khi lật sai
  if (state.waitingFlipBack) {
    state.flipBackTimerMs -= dtMs;
    if (state.flipBackTimerMs <= 0) {
      const flipped = [...state.flippedIndices] as [number, number];
      resolveMismatch(state);
      if (flipped.length === 2) {
        events.push({ kind: 'flipBack', indices: flipped });
      }
    }
  }

  // 2. Vòng 3: {phanDien} tráo bài mỗi 20 giây (20000ms)
  if (state.round === 2) {
    state.swapTimerMs += dtMs;
    if (state.swapTimerMs >= MEMORY_SPEC.swapIntervalMs) {
      state.swapTimerMs -= MEMORY_SPEC.swapIntervalMs;
      const pair = pickSwap(state, state.rng);
      if (pair) {
        swapCards(state, pair[0], pair[1]);
        events.push({
          kind: 'swap',
          indices: [pair[0], pair[1]],
          cards: [pair.cardA, pair.cardB],
        });
      }
    }
  }

  return events;
}
