import { describe, expect, it } from 'vitest';
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import type { MedalThresholds } from '@so-chung/core';
import { MEMORY_SPEC, PRACTICE_KEYS } from './memoryConfig';
import {
  advanceRound,
  areCardsMatching,
  createMemoryGame,
  flipCard,
  makeDeck,
  memoryMedal,
  memoryScore,
  pickSwap,
  roundScore,
  stepMemory,
  swapCards,
  totalScore,
  type MemoryCard,
} from './memoryLogic';

const REAL_KEYS = [12, 13, 15, 17, 19, 21] as const;

describe('bảng test của spec 07, Màn 8', () => {
  it('ca 1: Tạo bộ thẻ n cặp: Có 2n thẻ; mỗi khuôn đúng 2 thẻ (một thẻ khuôn, một thẻ mẫu)', () => {
    const rng = createMulberry32(101);
    for (const n of [4, 6, 8]) {
      const deck = makeDeck(rng, n);
      expect(deck).toHaveLength(2 * n);

      const khuonCards = deck.filter((c) => c.type === 'khuon');
      const mauCards = deck.filter((c) => c.type === 'mau');
      expect(khuonCards).toHaveLength(n);
      expect(mauCards).toHaveLength(n);

      // Mỗi khuôn đúng 2 thẻ: 1 thẻ khuôn, 1 thẻ mẫu
      const pairKeys = new Set(deck.map((c) => c.pairKey));
      expect(pairKeys.size).toBe(n);

      for (const key of pairKeys) {
        const pair = deck.filter((c) => c.pairKey === key);
        expect(pair).toHaveLength(2);
        const kCard = pair.find((c) => c.type === 'khuon')!;
        const mCard = pair.find((c) => c.type === 'mau')!;
        expect(kCard).toBeDefined();
        expect(mCard).toBeDefined();
        expect(kCard.value).toBe(key);
        expect(mCard.value).toBe(publicKey(key));
      }
    }
  });

  it('ca 2: Cùng seed: Cùng thứ tự thẻ', () => {
    const deckA = makeDeck(createMulberry32(2026), 6);
    const deckB = makeDeck(createMulberry32(2026), 6);
    expect(deckA).toEqual(deckB);

    const deckDiff = makeDeck(createMulberry32(9999), 6);
    expect(deckA).not.toEqual(deckDiff);
  });

  it('ca 3: Mọi thẻ mẫu công khai: Bằng publicKey(khuôn); không chứa tên hay chân dung', () => {
    const rng = createMulberry32(303);
    for (let i = 0; i < 20; i++) {
      const deck = makeDeck(rng, 8);
      for (const card of deck) {
        if (card.type === 'mau') {
          expect(card.value).toBe(publicKey(card.pairKey));
        }
        // Thẻ tuyệt đối không chứa tên hay chân dung
        expect(card).not.toHaveProperty('name');
        expect(card).not.toHaveProperty('ten');
        expect(card).not.toHaveProperty('portrait');
        expect(card).not.toHaveProperty('chanDung');
        expect(card).not.toHaveProperty('avatar');
      }
    }
  });

  it('ca 4: Mọi thẻ khuôn: Số nằm trong bộ khuôn tập; không có số nào của bảng khóa thật (12, 13, 15, 17, 19, 21)', () => {
    const rng = createMulberry32(404);
    for (let i = 0; i < 20; i++) {
      const deck = makeDeck(rng, 8);
      const khuonCards = deck.filter((c) => c.type === 'khuon');
      for (const card of khuonCards) {
        expect(PRACTICE_KEYS).toContain(card.value);
        expect(REAL_KEYS).not.toContain(card.value);
      }
    }
  });

  it('ca 5: Trong một vòng: Các số mẫu công khai đều khác nhau', () => {
    const rng = createMulberry32(505);
    for (const n of [4, 6, 8]) {
      for (let i = 0; i < 20; i++) {
        const deck = makeDeck(rng, n);
        const mauValues = deck.filter((c) => c.type === 'mau').map((c) => c.value);
        expect(new Set(mauValues).size).toBe(mauValues.length);
      }
    }
  });

  it('ca 6: Điểm vòng: lật sai 3 lần / 35 lần: 270 / 0', () => {
    expect(roundScore(3)).toBe(270);
    expect(roundScore(35)).toBe(0);
    // Các mốc biên khác
    expect(roundScore(0)).toBe(300);
    expect(roundScore(30)).toBe(0);
    expect(roundScore(10)).toBe(200);
  });

  it('ca 7: {phanDien} tráo bài: Chỉ đụng thẻ đang úp và chưa khớp', () => {
    const rng = createMulberry32(707);
    const deck = makeDeck(rng, 8); // 16 thẻ
    // Giả lập trạng thái: 4 thẻ đã khớp, 2 thẻ đang lật mở
    deck[0].isMatched = true;
    deck[1].isMatched = true;
    deck[2].isMatched = true;
    deck[3].isMatched = true;
    deck[4].isFlipped = true;
    deck[5].isFlipped = true;

    const state = { cards: deck };
    for (let i = 0; i < 50; i++) {
      const pair = pickSwap(state, rng);
      expect(pair).not.toBeNull();
      const [idxA, idxB] = pair!;
      expect(idxA).not.toBe(idxB);

      // Thẻ được chọn phải đang úp và chưa khớp
      expect(deck[idxA].isMatched).toBe(false);
      expect(deck[idxA].isFlipped).toBe(false);
      expect(deck[idxB].isMatched).toBe(false);
      expect(deck[idxB].isFlipped).toBe(false);

      // Không bao giờ rơi vào các thẻ từ 0 đến 5
      expect(idxA).toBeGreaterThanOrEqual(6);
      expect(idxB).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('yêu cầu bổ sung của bước B1', () => {
  it('12 mẫu công khai của bộ khuôn tập đúng bằng [10, 20, 8, 17, 16, 11, 9, 22, 13, 3, 6, 12]', () => {
    const expected = [10, 20, 8, 17, 16, 11, 9, 22, 13, 3, 6, 12];
    const actual = PRACTICE_KEYS.map((k) => publicKey(k));
    expect(actual).toEqual(expected);

    // Tất cả đều khác nhau
    expect(new Set(actual).size).toBe(12);

    // Không số nào trùng với chính khuôn của nó
    for (let i = 0; i < PRACTICE_KEYS.length; i++) {
      expect(PRACTICE_KEYS[i]).not.toBe(actual[i]);
    }
  });

  it('lật sai 3 lần → 270, 35 lần → 0', () => {
    expect(roundScore(3)).toBe(270);
    expect(roundScore(35)).toBe(0);
  });

  it('pickSwap trả null khi còn 1 thẻ úp chưa khớp; không bao giờ chọn thẻ đã khớp (chạy 500 seed)', () => {
    // 1. Khi còn 1 thẻ úp chưa khớp -> trả về null
    const rng = createMulberry32(888);
    const smallDeck: MemoryCard[] = [
      {
        id: 'k-3',
        type: 'khuon',
        kind: 'khuon',
        value: 3,
        so: 3,
        pairKey: 3,
        isFlipped: false,
        isMatched: true,
      },
      {
        id: 'm-3',
        type: 'mau',
        kind: 'mau',
        value: 10,
        so: 10,
        pairKey: 3,
        isFlipped: false,
        isMatched: true,
      },
      {
        id: 'k-5',
        type: 'khuon',
        kind: 'khuon',
        value: 5,
        so: 5,
        pairKey: 5,
        isFlipped: true,
        isMatched: false,
      },
      {
        id: 'm-5',
        type: 'mau',
        kind: 'mau',
        value: 20,
        so: 20,
        pairKey: 5,
        isFlipped: false,
        isMatched: false,
      }, // Chỉ còn đúng thẻ này úp & chưa khớp
    ];

    expect(pickSwap({ cards: smallDeck }, rng)).toBeNull();

    // Khi còn 0 thẻ úp chưa khớp
    smallDeck[3].isMatched = true;
    expect(pickSwap({ cards: smallDeck }, rng)).toBeNull();

    // 2. Chạy 500 seed: không bao giờ chọn thẻ đã khớp
    for (let seed = 1; seed <= 500; seed++) {
      const testRng = createMulberry32(seed);
      const deck = makeDeck(testRng, 8); // 16 thẻ

      // Đánh dấu ngẫu nhiên một số thẻ đã khớp và một số thẻ đang lật mở
      const matchedCount = Math.floor(testRng() * 12); // 0 đến 11 thẻ đã khớp
      for (let i = 0; i < matchedCount; i++) {
        deck[i].isMatched = true;
      }
      const flippedCount = Math.floor(testRng() * 2); // 0 đến 1 thẻ lật
      for (let i = matchedCount; i < matchedCount + flippedCount && i < deck.length; i++) {
        deck[i].isFlipped = true;
      }

      const eligibleCount = deck.filter((c) => !c.isMatched && !c.isFlipped).length;
      const pair = pickSwap({ cards: deck }, testRng);

      if (eligibleCount < 2) {
        expect(pair).toBeNull();
      } else {
        expect(pair).not.toBeNull();
        const [a, b] = pair!;
        expect(a).not.toBe(b);

        // KHÔNG bao giờ chọn thẻ đã khớp
        expect(deck[a].isMatched).toBe(false);
        expect(deck[b].isMatched).toBe(false);

        // Thẻ được chọn phải đang úp
        expect(deck[a].isFlipped).toBe(false);
        expect(deck[b].isFlipped).toBe(false);
      }
    }
  });
});

describe('kiểm tra khớp thẻ và quy tắc tính điểm, mốc', () => {
  it('areCardsMatching: chỉ khớp khi 1 thẻ khuôn x đi với 1 thẻ mẫu publicKey(x)', () => {
    const k3 = { type: 'khuon' as const, value: 3 };
    const m10 = { type: 'mau' as const, value: 10 }; // 5^3 mod 23 = 10
    const m20 = { type: 'mau' as const, value: 20 }; // 5^5 mod 23 = 20
    const k5 = { type: 'khuon' as const, value: 5 };

    expect(areCardsMatching(k3, m10)).toBe(true);
    expect(areCardsMatching(m10, k3)).toBe(true);
    expect(areCardsMatching(k3, m20)).toBe(false);
    expect(areCardsMatching(k5, m10)).toBe(false);

    // Cùng loại không bao giờ khớp
    expect(areCardsMatching(k3, k3)).toBe(false);
    expect(areCardsMatching(k3, k5)).toBe(false);
    expect(areCardsMatching(m10, m10)).toBe(false);
    expect(areCardsMatching(m10, m20)).toBe(false);
  });

  it('mốc điểm: 300 Đồng, 550 Bạc, 750 Vàng', () => {
    expect(memoryMedal(290)).toBe(0);
    expect(memoryMedal(300)).toBe(1); // Đồng
    expect(memoryMedal(540)).toBe(1);
    expect(memoryMedal(550)).toBe(2); // Bạc
    expect(memoryMedal(740)).toBe(2);
    expect(memoryMedal(750)).toBe(3); // Vàng
    expect(memoryMedal(900)).toBe(3);

    expect(totalScore([300, 250, 200])).toBe(750);
  });

  it('swapCards: đổi vị trí 2 thẻ đúng và an toàn', () => {
    const deck = makeDeck(createMulberry32(111), 4);
    const c0 = deck[0];
    const c1 = deck[1];
    const state = { cards: deck };

    expect(swapCards(state, 0, 1)).toBe(true);
    expect(state.cards[0]).toBe(c1);
    expect(state.cards[1]).toBe(c0);

    expect(swapCards(state, -1, 0)).toBe(false);
    expect(swapCards(state, 0, 99)).toBe(false);
  });
});

describe('vòng đời ván chơi (createMemoryGame, flipCard, stepMemory, advanceRound)', () => {
  it('chơi hoàn hảo vòng 1 (4 cặp không sai): điểm 300, chuyển sang vòng 2', () => {
    const state = createMemoryGame(12345);
    expect(state.round).toBe(0);
    expect(state.cards).toHaveLength(8);
    expect(state.phase).toBe('playing');

    // Tìm và lật từng cặp khớp
    const pairKeys = Array.from(new Set(state.cards.map((c) => c.pairKey)));
    for (const key of pairKeys) {
      const idxK = state.cards.findIndex((c) => c.pairKey === key && c.type === 'khuon');
      const idxM = state.cards.findIndex((c) => c.pairKey === key && c.type === 'mau');

      const res1 = flipCard(state, idxK);
      expect(res1.kind).toBe('first');

      const res2 = flipCard(state, idxM);
      expect(res2.kind).toBe('match');
    }

    expect(state.phase).toBe('roundDone');
    expect(state.errors).toBe(0);
    expect(state.roundScores).toEqual([300]);

    // Chuyển sang vòng 2
    expect(advanceRound(state)).toBe(true);
    expect(state.round).toBe(1);
    expect(state.cards).toHaveLength(12); // 6 cặp
    expect(state.phase).toBe('playing');
  });

  it('lật sai thì vào trạng thái chờ úp; sau 800ms tự động úp lại', () => {
    const state = createMemoryGame(54321);

    // Tìm 2 thẻ không khớp nhau
    const idx1 = 0;
    const card1 = state.cards[idx1];
    const idx2 = state.cards.findIndex((c, i) => i !== idx1 && !areCardsMatching(card1, c));

    const res1 = flipCard(state, idx1);
    expect(res1.kind).toBe('first');

    const res2 = flipCard(state, idx2);
    expect(res2.kind).toBe('mismatch');
    expect(state.waitingFlipBack).toBe(true);
    expect(state.errors).toBe(1);
    expect(state.sai).toBe(1);

    // Chưa đủ 800ms
    const events1 = stepMemory(state, 500);
    expect(events1).toHaveLength(0);
    expect(state.waitingFlipBack).toBe(true);

    // Đủ 800ms (thêm 300ms)
    const events2 = stepMemory(state, 300);
    expect(events2).toHaveLength(1);
    expect(events2[0].kind).toBe('flipBack');
    expect(state.waitingFlipBack).toBe(false);
    expect(state.cards[idx1].isFlipped).toBe(false);
    expect(state.cards[idx2].isFlipped).toBe(false);
  });

  it('vòng 3: cứ 20000ms có sự kiện tráo bài', () => {
    const state = createMemoryGame(999);
    state.round = 2; // Ép lên vòng 3
    state.cards = makeDeck(state.rng, 8); // 16 thẻ

    // Bước 15 giây: chưa tráo
    const ev1 = stepMemory(state, 15000);
    expect(ev1).toHaveLength(0);

    // Thêm 5 giây (tổng 20 giây): kích hoạt tráo
    const ev2 = stepMemory(state, 5000);
    expect(ev2).toHaveLength(1);
    expect(ev2[0].kind).toBe('swap');
  });

  it('hoàn thành cả 3 vòng chơi: tính tổng điểm và mốc', () => {
    const state = createMemoryGame(777);

    // Chơi cả 3 vòng
    for (let r = 0; r < 3; r++) {
      const pairKeys = Array.from(new Set(state.cards.map((c) => c.pairKey)));
      for (const key of pairKeys) {
        const idxK = state.cards.findIndex((c) => c.pairKey === key && c.type === 'khuon');
        const idxM = state.cards.findIndex((c) => c.pairKey === key && c.type === 'mau');
        flipCard(state, idxK);
        flipCard(state, idxM);
      }
      if (r < 2) {
        advanceRound(state);
      }
    }

    expect(state.phase).toBe('gameOver');
    expect(state.isOver).toBe(true);
    expect(state.roundScores).toEqual([300, 300, 300]);
    expect(memoryScore(state)).toBe(900);
    expect(memoryMedal(memoryScore(state))).toBe(3); // Vàng
  });
});

/** Hai vị trí của hai thẻ KHÔNG khớp nhau (khác pairKey, chưa khớp). */
function mismatchPair(cards: MemoryCard[]): [number, number] {
  const a = cards.findIndex((c) => !c.isMatched);
  const b = cards.findIndex((c, i) => i !== a && !c.isMatched && c.pairKey !== cards[a].pairKey);
  return [a, b];
}

function round3State(seed: number) {
  const state = createMemoryGame(seed);
  state.round = 2;
  state.cards = makeDeck(state.rng, 8);
  return state;
}

function snapshot(state: ReturnType<typeof createMemoryGame>) {
  return JSON.stringify({
    c: state.cards,
    f: state.flippedIndices,
    w: state.waitingFlipBack,
    e: state.errors,
    t: state.flipBackTimerMs,
  });
}

describe('rà bước B1: lật thẻ', () => {
  it('hai thẻ cùng loại qua flipCard luôn là lật sai', () => {
    const state = createMemoryGame(31);
    const ks = state.cards.map((c, i) => (c.type === 'khuon' ? i : -1)).filter((i) => i >= 0);
    flipCard(state, ks[0]);
    expect(flipCard(state, ks[1]).kind).toBe('mismatch');
    expect(state.errors).toBe(1);
  });

  it('bấm lại thẻ lật đầu của lượt: bỏ qua, không đổi trạng thái', () => {
    const state = createMemoryGame(32);
    flipCard(state, 0);
    const before = snapshot(state);
    expect(flipCard(state, 0).kind).toBe('ignored');
    expect(snapshot(state)).toBe(before);
  });

  it('bấm thẻ đã khớp hay thẻ của cặp sai đang chờ úp: bỏ qua, không đổi trạng thái', () => {
    const state = createMemoryGame(33);
    const key = state.cards[0].pairKey;
    const mate = state.cards.findIndex((c, i) => i !== 0 && c.pairKey === key);
    flipCard(state, 0);
    flipCard(state, mate);
    expect(flipCard(state, 0).kind).toBe('ignored');

    const [a, b] = mismatchPair(state.cards);
    flipCard(state, a);
    flipCard(state, b);
    const before = snapshot(state);
    for (const i of [a, b, 0, mate, -1, 99]) expect(flipCard(state, i).kind).toBe('ignored');
    expect(state.waitingFlipBack).toBe(true);
    expect(snapshot(state)).toBe(before);
  });

  it('bấm thẻ thứ ba trong lúc chờ úp 800 ms: úp cặp sai ngay, mở thẻ mới, số lần sai không tăng thêm', () => {
    const state = createMemoryGame(34);
    const [a, b] = mismatchPair(state.cards);
    flipCard(state, a);
    flipCard(state, b);
    expect(state.errors).toBe(1);
    stepMemory(state, 300);

    const c = state.cards.findIndex((_, i) => i !== a && i !== b);
    expect(flipCard(state, c).kind).toBe('first');
    expect(state.errors).toBe(1);
    expect(state.waitingFlipBack).toBe(false);
    expect(state.cards[a].isFlipped).toBe(false);
    expect(state.cards[b].isFlipped).toBe(false);
    expect(state.flippedIndices).toEqual([c]);

    // Đồng hồ úp cũ không úp nhầm thẻ mới, không tính thêm lần sai
    expect(stepMemory(state, 1000)).toHaveLength(0);
    expect(state.cards[c].isFlipped).toBe(true);
    expect(state.errors).toBe(1);
  });

  it('mỗi cặp không khớp +1 lần sai đúng một lần (kể cả khi đồng hồ úp chạy xong)', () => {
    const state = createMemoryGame(35);
    for (let k = 1; k <= 3; k++) {
      const [a, b] = mismatchPair(state.cards);
      flipCard(state, a);
      flipCard(state, b);
      stepMemory(state, 800);
      stepMemory(state, 800);
      expect(state.errors).toBe(k);
    }
  });

  it('stepMemory tính dt bằng ms: 1 ms không bị hiểu là 1 giây', () => {
    const state = createMemoryGame(36);
    const [a, b] = mismatchPair(state.cards);
    flipCard(state, a);
    flipCard(state, b);
    expect(stepMemory(state, 1)).toHaveLength(0);
    expect(state.waitingFlipBack).toBe(true);
  });
});

describe('rà bước B1: cùng seed, khác seed', () => {
  it('50 seed cho (gần như) toàn bộ bộ thẻ khác nhau', () => {
    const decks = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) decks.add(JSON.stringify(makeDeck(createMulberry32(seed), 8)));
    expect(decks.size).toBeGreaterThanOrEqual(49);
  });
});

describe('rà bước B1: {phanDien} tráo bài', () => {
  it('500 seed: không chọn thẻ lật đầu của lượt, cặp sai đang chờ úp hay thẻ đã khớp', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const state = round3State(seed);
      const keys = Array.from(new Set(state.cards.map((c) => c.pairKey))).slice(0, seed % 7);
      for (const key of keys) {
        flipCard(state, state.cards.findIndex((c) => c.pairKey === key && c.type === 'khuon'));
        flipCard(state, state.cards.findIndex((c) => c.pairKey === key && c.type === 'mau'));
      }
      const [a, b] = mismatchPair(state.cards);
      flipCard(state, a);
      // Seed lẻ: chỉ có thẻ lật đầu; seed chẵn: có cặp sai đang chờ úp
      if (seed % 2 === 0) flipCard(state, b);
      const open = seed % 2 === 0 ? [a, b] : [a];

      const eligible = state.cards.filter((c) => !c.isMatched && !c.isFlipped).length;
      const pair = pickSwap(state, state.rng);
      if (eligible < 2) {
        expect(pair).toBeNull();
        continue;
      }
      expect(pair).not.toBeNull();
      const [x, y] = pair!;
      expect(x).not.toBe(y);
      for (const i of [x, y]) {
        expect(open).not.toContain(i);
        expect(state.cards[i].isMatched).toBe(false);
        expect(state.cards[i].isFlipped).toBe(false);
      }
    }
  });

  it('500 seed: lượt tráo của stepMemory cũng không đụng thẻ đang mở hay đã khớp', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const state = round3State(seed);
      const key = state.cards[0].pairKey;
      flipCard(state, 0);
      flipCard(state, state.cards.findIndex((c, i) => i !== 0 && c.pairKey === key));
      const first = state.cards.findIndex((c) => !c.isMatched);
      flipCard(state, first);
      const firstCard = state.cards[first];

      const ev = stepMemory(state, 20000);
      expect(ev).toHaveLength(1);
      const swap = ev[0];
      if (swap.kind !== 'swap') throw new Error('expected swap');
      for (const c of swap.cards) {
        expect(c.isMatched).toBe(false);
        expect(c.isFlipped).toBe(false);
      }
      expect(state.cards[first]).toBe(firstCard);
    }
  });

  it('dưới 2 thẻ úp chưa khớp: stepMemory bỏ qua lượt tráo', () => {
    const state = round3State(41);
    for (const c of state.cards) c.isMatched = true;
    state.cards[0].isMatched = false;
    expect(stepMemory(state, 20000)).toHaveLength(0);
  });

  it('vòng 1, 2 không bao giờ tráo; vòng 3 đúng 1 lần mỗi 20000 ms', () => {
    const countSwaps = (state: ReturnType<typeof createMemoryGame>, totalMs: number) => {
      let swaps = 0;
      for (let t = 0; t < totalMs; t += 100) swaps += stepMemory(state, 100).filter((e) => e.kind === 'swap').length;
      return swaps;
    };
    for (const round of [0, 1]) {
      const state = createMemoryGame(42);
      state.round = round;
      expect(countSwaps(state, 100000)).toBe(0);
    }
    expect(countSwaps(round3State(43), 60000)).toBe(3);
  });
});

describe('rà bước B1: điểm, mốc, hết vòng', () => {
  it('mốc khai báo như màn 2, 3 (MEMORY_SPEC.medals truyền thẳng vào MiniGameLevel)', () => {
    const medals: MedalThresholds = MEMORY_SPEC.medals;
    expect(medals).toEqual([300, 550, 750]);
    expect(MEMORY_SPEC.rounds.length * MEMORY_SPEC.roundBaseScore).toBe(900);
  });

  it('chỉ sang vòng sau khi mọi cặp đã khớp; hết vòng 3 thì kết thúc', () => {
    const state = createMemoryGame(51);
    for (let r = 0; r < 3; r++) {
      const keys = Array.from(new Set(state.cards.map((c) => c.pairKey)));
      for (const [n, key] of keys.entries()) {
        expect(state.phase).toBe('playing');
        expect(advanceRound(state)).toBe(false);
        // Mỗi vòng lật sai 2 lần trước cặp đầu
        if (n === 0) {
          for (let k = 0; k < 2; k++) {
            const [a, b] = mismatchPair(state.cards);
            flipCard(state, a);
            flipCard(state, b);
            stepMemory(state, 800);
          }
        }
        flipCard(state, state.cards.findIndex((c) => c.pairKey === key && c.type === 'khuon'));
        flipCard(state, state.cards.findIndex((c) => c.pairKey === key && c.type === 'mau'));
      }
      if (r < 2) {
        expect(state.phase).toBe('roundDone');
        expect(flipCard(state, 0).kind).toBe('ignored');
        expect(advanceRound(state)).toBe(true);
        expect(state.errors).toBe(0);
      }
    }
    expect(state.phase).toBe('gameOver');
    expect(advanceRound(state)).toBe(false);
    expect(state.roundScores).toEqual([280, 280, 280]);
    expect(memoryScore(state)).toBe(840);
    expect(memoryMedal(memoryScore(state))).toBe(3);
  });
});

describe('bước B2: tạm dừng đồng hồ tráo (Máy tính mod đang mở)', () => {
  it('swapClock: false giữ nguyên đồng hồ tráo nhưng đồng hồ úp lại vẫn chạy', () => {
    const state = round3State(61);
    const [a, b] = mismatchPair(state.cards);
    flipCard(state, a);
    flipCard(state, b);
    const ev = stepMemory(state, 25000, { swapClock: false });
    expect(ev.map((e) => e.kind)).toEqual(['flipBack']);
    expect(state.swapTimerMs).toBe(0);
    // Đóng máy tính: đồng hồ tráo chạy tiếp từ chỗ cũ
    expect(stepMemory(state, 19999)).toHaveLength(0);
    expect(stepMemory(state, 1).map((e) => e.kind)).toEqual(['swap']);
  });
});
