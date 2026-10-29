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
import { REBUILD_CODE_MAX, REBUILD_KEEP as KEEP, REBUILD_SPEC as SPEC } from './rebuildConfig';

/** Kết quả một vòng đã xong, để liệt kê ở màn kết quả; tổng điểm các vòng bằng `rebuildScore`. */
export interface RoundPart {
  /** Chỉ số vòng, 0 đến 1 */
  round: number;
  errors: number;
  fakeBinned: boolean;
  points: number;
  /** Chỉ đoạn giữ sổ (cuối vòng 2): số ô sửa xong, số ô sửa nhanh (trong 5 giây), số ô còn chưa sửa khi hết giờ */
  keep?: { fixed: number; fast: number; left: number };
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
 * villain: {phanDien} sắp nhét trang giả (vòng 2), chờ `insertFake`; play: đang ghép (vòng 1, 2); keep: đoạn giữ sổ 45 giây ở cuối vòng 2 (chạy bằng `stepKeep`, sau khi chuỗi 7 trang đã ghép xong);
 * roundDone: vòng (hay đoạn giữ sổ) đã xong, chờ `advance`; over: hết ván.
 */
export type RebuildPhase = 'villain' | 'play' | 'keep' | 'roundDone' | 'over';

/** Trạng thái riêng của đoạn giữ sổ. Mọi chỉ số ô (0 đến 6) tính từ trái sang phải; thời gian tính bằng giây. */
export interface KeepState {
  /** Chưa `beginKeep` thì đồng hồ đứng yên */
  running: boolean;
  elapsed: number;
  nextSwapAt: number;
  /** Số lần đã tráo (đặt mã cho trang giả) */
  swapCount: number;
  /** Ô của chuỗi: trang đang nằm ở đó, hoặc `null` khi ô trống (trang giả đã bỏ vào rổ, chưa đặt lại trang thật) */
  slots: (Card | null)[];
  /** Giờ bị tráo của ô chưa sửa xong; −1 nếu ô không cần sửa */
  swappedAt: number[];
  /** Ô đã được Bi gợi ý rồi (chỉ gợi ý một lần mỗi ô) */
  hinted: boolean[];
  /** Mã trang mồi đi cùng lần tráo của ô; trang mồi bị dọn khỏi bàn khi ô được sửa */
  decoyOf: (string | null)[];
  fixed: number;
  fast: number;
}

export interface RebuildState {
  seed: number;
  rng: () => number;
  /** Chỉ số vòng, 0 đến 1 */
  round: number;
  hearts: number;
  phase: RebuildPhase;
  /** Lý do hết ván: hết tim, hay đã xong cả 2 vòng (kể cả đoạn giữ sổ) */
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
  /** Có ở đoạn giữ sổ (cuối vòng 2); lúc đó `tray` là mặt bàn (trang thật bị ném ra và trang mồi) */
  keep: KeepState | null;
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
  s.keep = null;
  s.phase = r.fake ? 'villain' : 'play';
}

/**
 * Vào đoạn giữ sổ (P4b): chuỗi vừa ghép xong ở vòng 2 (7 trang đúng) trở thành chuỗi cần giữ, mặt bàn trống, được hồi đủ tim (bước X3); đồng hồ chưa chạy tới `beginKeep`.
 * Điểm ghép của vòng 2 đã được ghi trước đó và không đổi.
 */
function enterKeep(s: RebuildState): void {
  s.hearts = SPEC.hearts;
  s.errors = 0;
  s.tray = [];
  s.keep = newKeep(s.deal);
  s.phase = 'keep';
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
    keep: null,
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

/** Điểm tối đa của một ván (ghép hoàn hảo cả hai vòng, bỏ đúng trang giả, sửa nhanh mọi lần tráo): 100 + 130 + 5 × 25 = 355. Điểm cao nhất lưu trước P4b có thể vượt số này (thang cũ tối đa 505). */
export const REBUILD_MAX_SCORE: number = 2 * SPEC.roundBase + SPEC.fakeBonus + swapSchedule().length * (KEEP.fixPoints + KEEP.fastBonus);

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
    const k = s.phase === 'keep' ? s.keep : null;
    s.phase = 'over';
    s.over = 'hearts';
    if (k) {
      // hết tim giữa vòng giữ sổ: vẫn tính điểm các ô đã sửa (+20/+5), không trừ −10 cho ô chưa sửa (bước X2b)
      k.running = false;
      s.parts.push({ round: s.round, errors: s.errors, fakeBinned: false, points: k.fixed * KEEP.fixPoints + k.fast * KEEP.fastBonus, keep: { fixed: k.fixed, fast: k.fast, left: 0 } });
    }
  }
}

export type PlaceResult =
  /** Thẻ khớp, vào chuỗi; `roundDone` khi chuỗi đã đủ; `keep` khi chuỗi đủ rồi thì vào đoạn giữ sổ (cuối vòng 2) thay vì dừng ở bảng "vòng xong" */
  | { kind: 'ok'; roundDone: boolean; keep?: true }
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
      s.parts.push({ round: s.round, errors: s.errors, fakeBinned: s.fakeBinned, points: roundScore(s.errors, s.fakeBinned) });
      if (SPEC.rounds[s.round].keep) {
        enterKeep(s);
        return { kind: 'ok', roundDone, keep: true };
      }
      s.phase = 'roundDone';
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

/** Sang vòng kế tiếp (hoặc kết thúc ván sau vòng 2 và đoạn giữ sổ). Chỉ có tác dụng khi `phase` là 'roundDone'. */
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

/** Dòng "Soi công thức" của một thẻ: phép tính (mã trước × 2 + nội dung) mod 100 đã có kết quả, và thẻ khớp hay lệch công thức (trang giả thì lệch). */
export interface InspectionLine {
  kind: 'khop' | 'lech';
  /** (mã trước × 2 + nội dung) mod 100 */
  expected: number;
}

export function inspectionLine(card: Pick<Card, 'prev' | 'content' | 'code'>): InspectionLine {
  const expected = solutionSteps(card.prev, card.content).code;
  return { kind: card.code === expected ? 'khop' : 'lech', expected };
}

/**
 * Các phần điểm cho màn kết quả (tổng bằng `rebuildScore`): mỗi vòng đã xong một dòng "số lần sai → 100 − 10 × lỗi", và thêm một dòng +30 nếu bỏ đúng trang giả vào rổ.
 * Vòng dở dang (hết tim) không có dòng nào.
 */
export interface ScorePartRow {
  /** vong, trangGia: ghép sổ (vòng 1 và 2); sua, nhanh, conLech: đoạn giữ sổ (cuối vòng 2) */
  key: 'vong' | 'trangGia' | 'sua' | 'nhanh' | 'conLech';
  /** Chỉ số vòng, 0 đến 1 */
  round: number;
  /** vong: số lần sai; trangGia: 1; sua: số ô sửa xong; nhanh: số ô sửa nhanh; conLech: số ô còn lệch khi hết giờ */
  count: number;
  points: number;
}

export function scoreParts(s: Pick<RebuildState, 'parts'>): ScorePartRow[] {
  const rows: ScorePartRow[] = [];
  for (const p of s.parts) {
    if (p.keep) {
      rows.push({ key: 'sua', round: p.round, count: p.keep.fixed, points: p.keep.fixed * KEEP.fixPoints });
      if (p.keep.fast > 0) rows.push({ key: 'nhanh', round: p.round, count: p.keep.fast, points: p.keep.fast * KEEP.fastBonus });
      if (p.keep.left > 0) rows.push({ key: 'conLech', round: p.round, count: p.keep.left, points: -p.keep.left * KEEP.leftPenalty });
      continue;
    }
    rows.push({ key: 'vong', round: p.round, count: p.errors, points: roundScore(p.errors, false) });
    if (p.fakeBinned) rows.push({ key: 'trangGia', round: p.round, count: 1, points: SPEC.fakeBonus });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Đoạn giữ sổ (bước X2 là vòng 3 dài 90 giây; P4b: cuối vòng 2, 45 giây)
//
// Chuỗi 7 trang đúng vừa ghép xong ở vòng 2. {phanDien} liên tục chạy vào tráo một trang thật thành trang giả (trang thật bị ném ra bàn, kèm 1 trang mồi); khoảng cách giữa hai lần tráo giảm dần
// từ 9 xuống 6 giây. Trang giả GIỮ NGUYÊN mã trang và mã trang trước của trang thật (nên các mối nối vẫn khớp, không lộ ô nào bị tráo) nhưng đổi nội dung, mà mã trang
// là hàm một-một của nội dung khi đã biết mã trước, nên trang giả luôn sai công thức. Học sinh sửa một ô = kéo trang giả vào rổ + kéo đúng trang thật vào ô trống đó.

/** Khoảng cách giữa hai lần tráo tại thời điểm `t` (giây): 9 ở giây 0, giảm tuyến tính tới 6 ở hết đoạn giữ sổ, không ra ngoài [6, 9]. */
export function swapIntervalAt(t: number): number {
  const k = Math.min(1, Math.max(0, t / KEEP.seconds));
  return KEEP.intervalStart + (KEEP.intervalEnd - KEEP.intervalStart) * k;
}

/** Các thời điểm tráo của đoạn giữ sổ, nếu không bị chặn (lần đầu ở `firstSwapAt`, rồi cộng khoảng cách tại thời điểm đó), bỏ những lần rơi vào `noSwapLast` giây cuối. */
export function swapSchedule(): number[] {
  const times: number[] = [];
  for (let t: number = KEEP.firstSwapAt; t <= KEEP.seconds - KEEP.noSwapLast; t += swapIntervalAt(t)) times.push(t);
  return times;
}

function newKeep(deal: Deal): KeepState {
  const n = deal.real.length;
  return {
    running: false,
    elapsed: 0,
    nextSwapAt: KEEP.firstSwapAt,
    swapCount: 0,
    slots: deal.real.slice(),
    swappedAt: new Array<number>(n).fill(-1),
    hinted: new Array<boolean>(n).fill(false),
    decoyOf: new Array<string | null>(n).fill(null),
    fixed: 0,
    fast: 0,
  };
}

/** Bắt đầu chạy đồng hồ đoạn giữ sổ (gọi khi thẻ giới thiệu "Giữ sổ" đã đóng). */
export function beginKeep(s: RebuildState): void {
  if (s.phase === 'keep' && s.keep) s.keep.running = true;
}

/** Số ô chưa sửa xong (còn trang giả, hoặc đã bỏ trang giả vào rổ mà chưa đặt lại trang thật). */
export function keepUnfixed(k: Pick<KeepState, 'swappedAt'>): number {
  let n = 0;
  for (const t of k.swappedAt) if (t >= 0) n++;
  return n;
}

/** Thanh trạng thái của chuỗi: "đúng" khi mọi ô đều là trang thật, ngược lại "lệch". Không chỉ ra ô nào lệch. */
export function keepChainStatus(k: Pick<KeepState, 'swappedAt'>): 'dung' | 'lech' {
  return keepUnfixed(k) === 0 ? 'dung' : 'lech';
}

/** Số giây còn lại của đoạn giữ sổ (không âm). */
export function keepTimeLeft(k: Pick<KeepState, 'elapsed'>): number {
  return Math.max(0, KEEP.seconds - k.elapsed);
}

/** Nửa của chuỗi chứa ô `slot`: nửa đầu (slot < pages / 2: 4 ô đầu khi có 7 trang) là nửa trái, còn lại là nửa phải. */
export function keepHalf(slot: number, pages: number): 'left' | 'right' {
  return slot < pages / 2 ? 'left' : 'right';
}

/** Trang giả thay cho `real`: cùng mã trước, cùng mã trang, khác nội dung (nên `pageCode(prev, nội dung) ≠ mã trang`). */
function makeFakeOf(real: Card, rng: () => number, id: string): Card {
  const content = (real.content + randInt(1, REBUILD_CODE_MAX, rng)) % (REBUILD_CODE_MAX + 1);
  return { id, prev: real.prev, content, code: real.code, isFake: true };
}

/** Trang mồi: trang thật đúng công thức nhưng mã trang trước không phải mã của trang nào trong chuỗi (kể cả trang bìa), nên không ô nào nhận. */
function makeDecoy(deal: Deal, rng: () => number, id: string): Card {
  const taken = new Set<number>([deal.genesis, ...deal.real.map((c) => c.code)]);
  let prev = randInt(0, REBUILD_CODE_MAX, rng);
  while (taken.has(prev)) prev = (prev + 1) % (REBUILD_CODE_MAX + 1);
  const content = randInt(0, REBUILD_CODE_MAX, rng);
  return { id, prev, content, code: pageCode(prev, content), isFake: false };
}

export type KeepEvent =
  /** {phanDien} tráo ô `slot`: `real` bị ném ra bàn cùng trang mồi `decoy` */
  | { kind: 'swap'; slot: number; at: number; fake: Card; real: Card; decoy: Card }
  /** Đến lượt tráo mà đã có đủ 3 ô chưa sửa: không tráo, học sinh mất 1 tim (hết tim thì ván kết thúc, vòng 3 vẫn có điểm các ô đã sửa) */
  | { kind: 'overflow'; at: number; heartsLeft: number }
  /** Một ô để quá 10 giây chưa sửa: Bi gợi ý nửa trái hay phải của chuỗi */
  | { kind: 'hint'; half: 'left' | 'right'; at: number }
  /** Hết giờ của đoạn giữ sổ */
  | { kind: 'timeout'; left: number; points: number };

const NO_EVENTS: readonly KeepEvent[] = [];

/** Điểm tạm tính của vòng giữ sổ (đã sửa trừ đi các ô còn lệch nếu hết giờ ngay lúc này). */
export function keepScoreNow(k: KeepState): number {
  return k.fixed * KEEP.fixPoints + k.fast * KEEP.fastBonus;
}

function finishKeep(s: RebuildState, k: KeepState): KeepEvent {
  const left = keepUnfixed(k);
  const points = k.fixed * KEEP.fixPoints + k.fast * KEEP.fastBonus - left * KEEP.leftPenalty;
  s.parts.push({ round: s.round, errors: s.errors, fakeBinned: false, points, keep: { fixed: k.fixed, fast: k.fast, left } });
  k.running = false;
  s.phase = 'roundDone';
  return { kind: 'timeout', left, points };
}

/**
 * Chạy đồng hồ đoạn giữ sổ thêm `dt` giây: tráo khi đến giờ (xử lý đúng thứ tự thời gian, dù `dt` lớn), gợi ý khi có ô để quá 10 giây, và kết thúc đoạn giữ sổ khi hết giờ (`KEEP.seconds`).
 * Trả về các sự kiện xảy ra trong bước này (mảng rỗng dùng chung nếu không có gì, để màn chơi không tạo object mới mỗi khung hình).
 */
export function stepKeep(s: RebuildState, dt: number): readonly KeepEvent[] {
  const k = s.keep;
  if (s.phase !== 'keep' || !k || !k.running || dt <= 0) return NO_EVENTS;
  let events: KeepEvent[] | null = null;
  const push = (e: KeepEvent): void => {
    (events ??= []).push(e);
  };
  const end = Math.min(KEEP.seconds, k.elapsed + dt);
  const n = k.slots.length;
  while (k.nextSwapAt <= end && k.nextSwapAt <= KEEP.seconds - KEEP.noSwapLast) {
    const at = k.nextSwapAt;
    k.nextSwapAt = at + swapIntervalAt(at);
    if (keepUnfixed(k) >= KEEP.maxUnfixed) {
      addError(s);
      push({ kind: 'overflow', at, heartsLeft: s.hearts });
      if (s.phase !== 'keep') {
        k.running = false;
        return events ?? NO_EVENTS;
      }
      continue;
    }
    // chọn ngẫu nhiên một ô đang là trang thật (không bao giờ tráo vào ô đã giả hay đang trống)
    const candidates: number[] = [];
    for (let i = 0; i < n; i++) if (k.slots[i] && k.swappedAt[i] < 0) candidates.push(i);
    const slot = candidates[randInt(0, candidates.length - 1, s.rng)];
    const real = k.slots[slot] as Card;
    k.swapCount++;
    const fake = makeFakeOf(real, s.rng, `keep-fake-${k.swapCount}`);
    const decoy = makeDecoy(s.deal, s.rng, `keep-decoy-${k.swapCount}`);
    k.slots[slot] = fake;
    k.swappedAt[slot] = at;
    k.hinted[slot] = false;
    k.decoyOf[slot] = decoy.id;
    s.tray.splice(randInt(0, s.tray.length, s.rng), 0, real);
    s.tray.splice(randInt(0, s.tray.length, s.rng), 0, decoy);
    push({ kind: 'swap', slot, at, fake, real, decoy });
  }
  k.elapsed = end;
  for (let i = 0; i < n; i++) {
    if (k.swappedAt[i] >= 0 && !k.hinted[i] && end - k.swappedAt[i] >= KEEP.hintAfter) {
      k.hinted[i] = true;
      push({ kind: 'hint', half: keepHalf(i, n), at: end });
    }
  }
  if (k.elapsed >= KEEP.seconds) push(finishKeep(s, k));
  return events ?? NO_EVENTS;
}

export type KeepPlaceResult =
  /** Đặt đúng trang thật vào ô trống: ô sửa xong, +20 (và +5 nếu nhanh) */
  | { kind: 'fixed'; slot: number; points: number; fast: boolean; chainOk: boolean }
  /** Mã trang trước không khớp ô này (trang mồi, hay trang thật của ô khác): thẻ bật về bàn, mất 1 tim */
  | { kind: 'badPrev'; heartsLeft: number }
  /** Ô đang có trang (chưa bỏ trang giả vào rổ) hoặc thao tác không hợp lệ: không phạt */
  | { kind: 'ignored' };

/** Học sinh đặt thẻ `cardId` (đang trên bàn) vào ô `slot`. Chỉ đặt được vào ô trống. */
export function placeInSlot(s: RebuildState, cardId: string, slot: number): KeepPlaceResult {
  const k = s.keep;
  if (s.phase !== 'keep' || !k || !k.running || slot < 0 || slot >= k.slots.length || k.slots[slot] !== null) return { kind: 'ignored' };
  const i = s.tray.findIndex((c) => c.id === cardId);
  if (i < 0) return { kind: 'ignored' };
  const card = s.tray[i];
  if (checkPlacement(s.deal.real[slot].prev, card) !== 'ok') {
    addError(s);
    return { kind: 'badPrev', heartsLeft: s.hearts };
  }
  s.tray.splice(i, 1);
  k.slots[slot] = card;
  const fast = k.elapsed - k.swappedAt[slot] <= KEEP.fastWithin;
  k.swappedAt[slot] = -1;
  k.fixed++;
  if (fast) k.fast++;
  // dọn trang mồi đi cùng lần tráo này
  const decoy = k.decoyOf[slot];
  k.decoyOf[slot] = null;
  if (decoy) {
    const d = s.tray.findIndex((c) => c.id === decoy);
    if (d >= 0) s.tray.splice(d, 1);
  }
  return { kind: 'fixed', slot, points: KEEP.fixPoints + (fast ? KEEP.fastBonus : 0), fast, chainOk: keepChainStatus(k) === 'dung' };
}

export type KeepBinResult =
  /** Đúng trang giả (sai công thức): rời khỏi chuỗi, ô thành ô trống */
  | { kind: 'binned'; slot: number }
  /** Trang thật mà bỏ vào rổ (từ chuỗi hay từ bàn): thẻ bật về, mất 1 tim */
  | { kind: 'realBack'; heartsLeft: number }
  | { kind: 'ignored' };

/** Học sinh kéo trang ở ô `slot` của chuỗi vào "Rổ trang giả". Trang giả được nhận ra bằng công thức, không bằng cờ `isFake`. */
export function binFromSlot(s: RebuildState, slot: number): KeepBinResult {
  const k = s.keep;
  if (s.phase !== 'keep' || !k || !k.running || slot < 0 || slot >= k.slots.length) return { kind: 'ignored' };
  const card = k.slots[slot];
  if (!card) return { kind: 'ignored' };
  if (formulaHolds(card)) {
    addError(s);
    return { kind: 'realBack', heartsLeft: s.hearts };
  }
  k.slots[slot] = null;
  return { kind: 'binned', slot };
}

/** Học sinh kéo thẻ `cardId` ở trên bàn vào rổ: trên bàn chỉ có trang thật và trang mồi (đều đúng công thức) nên luôn mất 1 tim và thẻ bật về. */
export function binFromTable(s: RebuildState, cardId: string): KeepBinResult {
  const k = s.keep;
  if (s.phase !== 'keep' || !k || !k.running || !s.tray.some((c) => c.id === cardId)) return { kind: 'ignored' };
  addError(s);
  return { kind: 'realBack', heartsLeft: s.hearts };
}
