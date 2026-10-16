/**
 * Luật màn 3 "Ghép lại cuốn sổ" (spec 05, mục "Màn 3"): tạo đề, kiểm tra ghép, vòng, tim, điểm, mốc. Hàm thuần (không DOM, không three); trạng thái sửa tại chỗ như
 * `runnerLogic`, số ngẫu nhiên do `createMulberry32(seed)` nên cùng seed và cùng thao tác thì cùng kết quả. Công thức mã trang dùng lại của Bài 1 (`pageCode`, `buildChain`).
 *
 * Một thẻ ghi: mã trang trước · nội dung · mã trang. Đặt thẻ vào ô kế tiếp của chuỗi thì phải thỏa hai điều kiện:
 *  1. mã trang trước của thẻ bằng mã của trang cuối chuỗi (chưa có trang nào thì bằng mã trang bìa G);
 *  2. mã trang đúng công thức: `code === pageCode(prev, content)`.
 * Trang giả có mã trang trước khớp (điều kiện 1) nhưng sai điều kiện 2, nên chỉ phát hiện được bằng công thức ("Soi công thức").
 */
import { buildChain, pageCode, randomContents, randomGenesis, solutionSteps } from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32, randInt } from '@so-chung/core/lib/rng';
import { medalOf, type Medal } from '@so-chung/core';
import { REBUILD_CODE_MAX, REBUILD_SPEC as SPEC } from './rebuildConfig';

/** Kết quả một vòng đã xong, để liệt kê ở màn kết quả; tổng điểm các vòng bằng `rebuildScore`. */
export interface RoundPart {
  /** Chỉ số vòng, 0 đến 2 */
  round: number;
  errors: number;
  fakeBinned: boolean;
  points: number;
}

/** Một thẻ trang. `isFake` là sự thật lúc tạo đề (để dựng hình và để test); luật kiểm tra luôn dùng công thức, không đọc cờ này. */
export interface Card {
  id: string;
  prev: number;
  content: number;
  code: number;
  isFake: boolean;
}

/** Đề của một vòng: mã trang bìa G, các trang thật theo đúng thứ tự chuỗi, và trang giả (nếu vòng có). */
export interface Deal {
  genesis: number;
  real: Card[];
  fake: Card | null;
}

/**
 * villain: {phanDien} sắp nhét trang giả (vòng 2 và 3), chờ `insertFake`; play: đang ghép; roundDone: chuỗi đã đủ, chờ `advance`; over: hết ván.
 */
export type RebuildPhase = 'villain' | 'play' | 'roundDone' | 'over';

export interface RebuildState {
  seed: number;
  rng: () => number;
  /** Chỉ số vòng, 0 đến 2 */
  round: number;
  hearts: number;
  phase: RebuildPhase;
  /** Lý do hết ván: hết tim, hay đã ghép xong cả 3 vòng */
  over: null | 'hearts' | 'done';
  deal: Deal;
  /** Các trang đã ghép đúng, theo thứ tự */
  chain: Card[];
  /** Khay: các trang chưa ghép (đã xáo trộn); trang giả chỉ vào khay sau `insertFake` */
  tray: Card[];
  /** Số lỗi của vòng hiện tại */
  errors: number;
  fakeBinned: boolean;
  /** Kết quả từng vòng đã xong (vòng đang dở, hoặc dở dang vì hết tim, không được tính điểm) */
  parts: RoundPart[];
}

// ---------------------------------------------------------------------------
// Công thức và kiểm tra

/** Thẻ có mã trang đúng công thức không (thẻ giả: không). */
export function formulaHolds(card: Pick<Card, 'prev' | 'content' | 'code'>): boolean {
  return card.code === pageCode(card.prev, card.content);
}

export type PlaceCheck = 'ok' | 'badPrev' | 'fake';

/**
 * Đặt `card` sau trang có mã `tail`: 'badPrev' nếu mã trang trước không khớp (xét trước), 'fake' nếu khớp nhưng mã trang sai công thức, 'ok' nếu hợp lệ.
 */
export function checkPlacement(tail: number, card: Pick<Card, 'prev' | 'content' | 'code'>): PlaceCheck {
  if (card.prev !== tail) return 'badPrev';
  return formulaHolds(card) ? 'ok' : 'fake';
}

/** Nội dung nút "Soi công thức" cho thẻ đang chọn: các số trong phép tính (prev × 2 + content) mod 100, và hai điều kiện khớp. */
export interface Inspection {
  prev: number;
  content: number;
  /** prev × 2 */
  doubled: number;
  /** prev × 2 + content */
  sum: number;
  /** (prev × 2 + content) mod 100 */
  expected: number;
  /** Mã trang ghi trên thẻ */
  code: number;
  /** Mã ghi trên thẻ bằng kết quả phép tính */
  matches: boolean;
  /** Mã trang trước của thẻ bằng mã trang cuối chuỗi */
  prevMatches: boolean;
}

export function inspectCard(tail: number, card: Pick<Card, 'prev' | 'content' | 'code'>): Inspection {
  const s = solutionSteps(card.prev, card.content);
  return { prev: card.prev, content: card.content, doubled: s.doubled, sum: s.sum, expected: s.code, code: card.code, matches: card.code === s.code, prevMatches: card.prev === tail };
}

// ---------------------------------------------------------------------------
// Tạo đề

/** Số lần tạo lại tối đa khi mã trang trùng nhau (xác suất trùng nhỏ, thường tạo đúng ngay lần đầu). */
const MAX_TRIES = 10000;

function distinct(values: readonly number[]): boolean {
  return new Set(values).size === values.length;
}

/**
 * Tạo đề một vòng. Chuỗi thật: `buildChain(G, nội dung)`; các mã trang trong chuỗi không trùng nhau và không trùng mã trang bìa (thì tạo lại), nên mỗi mã trang trước
 * chỉ khớp đúng một trang thật. Trang giả: mã trang trước bằng mã của một trang thật không phải trang cuối; nội dung ngẫu nhiên; mã trang khác `pageCode(trước, nội dung)`
 * và khác mọi mã của trang thật (và mã trang bìa).
 */
export function generateDeal(rng: () => number, pages: number, withFake: boolean, idPrefix = 'r'): Deal {
  let genesis = 0;
  let contents: number[] = [];
  let codes: number[] = [];
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    genesis = randomGenesis(rng);
    contents = randomContents(pages, rng);
    codes = buildChain(genesis, contents);
    if (distinct([genesis, ...codes])) break;
  }
  const real: Card[] = [];
  let prev = genesis;
  for (let i = 0; i < pages; i++) {
    real.push({ id: `${idPrefix}-${i}`, prev, content: contents[i], code: codes[i], isFake: false });
    prev = codes[i];
  }
  let fake: Card | null = null;
  if (withFake && pages >= 2) {
    const at = randInt(0, pages - 2, rng);
    const fakePrev = codes[at];
    const content = randInt(0, REBUILD_CODE_MAX, rng);
    const taken = new Set<number>([genesis, ...codes, pageCode(fakePrev, content)]);
    let code = randInt(0, REBUILD_CODE_MAX, rng);
    while (taken.has(code)) code = (code + 1) % (REBUILD_CODE_MAX + 1);
    fake = { id: `${idPrefix}-fake`, prev: fakePrev, content, code, isFake: true };
  }
  return { genesis, real, fake };
}

/** Xáo trộn tại chỗ (Fisher-Yates) bằng `rng`. */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Khay xáo trộn của các trang thật; có từ 2 trang trở lên thì chắc chắn khác thứ tự chuỗi. */
function shuffledTray(real: readonly Card[], rng: () => number): Card[] {
  const tray = real.slice();
  if (tray.length < 2) return tray;
  for (let tries = 0; tries < 50; tries++) {
    shuffle(tray, rng);
    if (tray.some((c, i) => c !== real[i])) return tray;
  }
  return tray.reverse();
}

// ---------------------------------------------------------------------------
// Ván chơi

function startRound(s: RebuildState): void {
  const r = SPEC.rounds[s.round];
  s.deal = generateDeal(s.rng, r.pages, r.fake, `r${s.round + 1}`);
  s.chain = [];
  s.tray = shuffledTray(s.deal.real, s.rng);
  s.errors = 0;
  s.fakeBinned = false;
  s.phase = r.fake ? 'villain' : 'play';
}

export function createRebuild(seed: number): RebuildState {
  const s: RebuildState = {
    seed,
    rng: createMulberry32(seed),
    round: 0,
    hearts: SPEC.hearts,
    phase: 'play',
    over: null,
    deal: { genesis: 0, real: [], fake: null },
    chain: [],
    tray: [],
    errors: 0,
    fakeBinned: false,
    parts: [],
  };
  startRound(s);
  return s;
}

/** Mã trang cuối chuỗi (mã trang bìa G nếu chuỗi còn trống): thẻ kế tiếp phải có mã trang trước bằng số này. */
export function tailCode(s: RebuildState): number {
  return s.chain.length > 0 ? s.chain[s.chain.length - 1].code : s.deal.genesis;
}

/** Điểm một vòng: 100 − 10 × số lỗi (không âm), cộng 30 nếu bỏ đúng trang giả vào rổ. */
export function roundScore(errors: number, fakeBinned: boolean): number {
  return Math.max(0, SPEC.roundBase - SPEC.perError * errors) + (fakeBinned ? SPEC.fakeBonus : 0);
}

/** Tổng điểm ván: cộng điểm các vòng đã xong. */
export function rebuildScore(s: Pick<RebuildState, 'parts'>): number {
  return s.parts.reduce((a, p) => a + p.points, 0);
}

export function rebuildMedal(score: number): Medal {
  return medalOf(score, SPEC.medals);
}

/** {phanDien} nhét trang giả vào khay (vòng 2 và 3), ở một chỗ ngẫu nhiên. Chỉ có tác dụng khi `phase` là 'villain'. */
export function insertFake(s: RebuildState): boolean {
  if (s.phase !== 'villain' || !s.deal.fake) return false;
  s.tray.splice(randInt(0, s.tray.length, s.rng), 0, s.deal.fake);
  s.phase = 'play';
  return true;
}

function addError(s: RebuildState): void {
  s.errors++;
  s.hearts = Math.max(0, s.hearts - 1);
  if (s.hearts === 0) {
    s.phase = 'over';
    s.over = 'hearts';
  }
}

export type PlaceResult =
  /** Thẻ khớp, vào chuỗi; `roundDone` khi chuỗi đã đủ */
  | { kind: 'ok'; roundDone: boolean }
  /** Mã trang trước không khớp: thẻ bật về chỗ cũ, mất 1 tim */
  | { kind: 'badPrev'; heartsLeft: number }
  /** Trang giả: Bi báo "Trang giả của {phanDien}!", thẻ bật ra, mất 1 tim */
  | { kind: 'fake'; heartsLeft: number }
  /** Thao tác không hợp lệ (sai lúc chơi, hoặc thẻ không ở trong khay) */
  | { kind: 'ignored' };

/** Học sinh đặt thẻ `cardId` (đang ở khay) vào ô kế tiếp của chuỗi. */
export function placeCard(s: RebuildState, cardId: string): PlaceResult {
  if (s.phase !== 'play') return { kind: 'ignored' };
  const i = s.tray.findIndex((c) => c.id === cardId);
  if (i < 0) return { kind: 'ignored' };
  const card = s.tray[i];
  const check = checkPlacement(tailCode(s), card);
  if (check === 'ok') {
    s.tray.splice(i, 1);
    s.chain.push(card);
    const roundDone = s.chain.length === s.deal.real.length;
    if (roundDone) {
      s.phase = 'roundDone';
      s.parts.push({ round: s.round, errors: s.errors, fakeBinned: s.fakeBinned, points: roundScore(s.errors, s.fakeBinned) });
    }
    return { kind: 'ok', roundDone };
  }
  addError(s);
  return check === 'badPrev' ? { kind: 'badPrev', heartsLeft: s.hearts } : { kind: 'fake', heartsLeft: s.hearts };
}

export type BinResult =
  /** Đúng trang giả (sai công thức): +30 điểm cho vòng, thẻ rời khỏi khay */
  | { kind: 'binned'; bonus: number }
  /** Trang thật mà bỏ vào rổ: thẻ bật về, tính là một lỗi (spec chưa nói; xem ghi chú ở spec 05) */
  | { kind: 'realBack'; heartsLeft: number }
  | { kind: 'ignored' };

/** Học sinh kéo thẻ `cardId` vào "Rổ trang giả". Trang giả được nhận ra bằng công thức, không bằng cờ `isFake`. */
export function binCard(s: RebuildState, cardId: string): BinResult {
  if (s.phase !== 'play') return { kind: 'ignored' };
  const i = s.tray.findIndex((c) => c.id === cardId);
  if (i < 0) return { kind: 'ignored' };
  const card = s.tray[i];
  if (formulaHolds(card)) {
    addError(s);
    return { kind: 'realBack', heartsLeft: s.hearts };
  }
  s.tray.splice(i, 1);
  s.fakeBinned = true;
  return { kind: 'binned', bonus: SPEC.fakeBonus };
}

/** Sang vòng kế tiếp (hoặc kết thúc ván sau vòng 3). Chỉ có tác dụng khi `phase` là 'roundDone'. */
export function advance(s: RebuildState): void {
  if (s.phase !== 'roundDone') return;
  if (s.round >= SPEC.rounds.length - 1) {
    s.phase = 'over';
    s.over = 'done';
    return;
  }
  s.round++;
  startRound(s);
}

/** Kết quả khi em tự tính ở "Soi công thức": 'sai' = em tính chưa đúng (không lộ đáp án); đúng thì cho biết thẻ khớp hay lệch công thức. */
export type SoiResult = { kind: 'sai' } | { kind: 'khop'; expected: number } | { kind: 'lech'; expected: number };

/** Em nhập kết quả của (mã trước × 2 + nội dung) mod 100; chỉ khi em tính đúng mới hiện phép tính đầy đủ và so với mã trang ghi trên thẻ. */
export function checkInspection(card: Pick<Card, 'prev' | 'content' | 'code'>, typed: number): SoiResult {
  const expected = solutionSteps(card.prev, card.content).code;
  if (typed !== expected) return { kind: 'sai' };
  return card.code === expected ? { kind: 'khop', expected } : { kind: 'lech', expected };
}

/**
 * Các phần điểm cho màn kết quả (tổng bằng `rebuildScore`): mỗi vòng đã xong một dòng "số lần sai → 100 − 10 × lỗi", và thêm một dòng +30 nếu bỏ đúng trang giả vào rổ.
 * Vòng dở dang (hết tim) không có dòng nào.
 */
export interface ScorePartRow {
  key: 'vong' | 'trangGia';
  /** Chỉ số vòng, 0 đến 2 */
  round: number;
  /** vong: số lần sai; trangGia: 1 */
  count: number;
  points: number;
}

export function scoreParts(s: Pick<RebuildState, 'parts'>): ScorePartRow[] {
  const rows: ScorePartRow[] = [];
  for (const p of s.parts) {
    rows.push({ key: 'vong', round: p.round, count: p.errors, points: roundScore(p.errors, false) });
    if (p.fakeBinned) rows.push({ key: 'trangGia', round: p.round, count: 1, points: SPEC.fakeBonus });
  }
  return rows;
}
