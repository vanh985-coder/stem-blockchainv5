/**
 * Logic màn 5 "Đập {phanDien}" (spec 06, mục "Màn 5"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `rng` (createMulberry32) nên cùng seed cùng ván.
 * (P9: chuột đi TỪ DƯỚI LÊN, cuốn sổ ở đỉnh sân: `pos` vẫn là quãng đã chạy, 0 là chỗ chuột xuất hiện, 10 là sổ; đảo chiều chỉ là việc của giao diện, luật không đổi.)
 * Đơn vị thời gian là GIÂY: `dt` của `stepWhack`, đồng hồ lịch `clock`, mọi bộ đếm đều tính bằng giây.
 *
 * Trạng thái ván:
 *  - `play`: chạy bình thường (đồng hồ lịch chạy, sinh chuột, đồng);
 *  - `bossRun`: chuột câu hỏi (vàng ❓, {phanDien}) chạy tới giữa vùng đập rồi đứng chờ em đập (đồng hồ lịch DỪNG, ngừng sinh chuột, chuột đang chạy còn 20% tốc độ);
 *  - `answer` (P9): lượt đáp án. Chuột thường đứng yên, 2 đến 4 chuột vàng mang nhãn A, B, C, D chạy từ đầu làn tới sổ; đập chuột nào là chọn đáp án đó, để chạy tới sổ là hết giờ;
 *  - `quiz`: đã có kết quả lượt đáp án (`verdict`), mọi thứ đứng yên, không nhận cú đập; logic chỉ chờ `answerBoss` (em bấm "Chơi tiếp" sau khi đọc lời giải thích);
 *  - `ended`: hết ván (`ended` là 'complete' hay 'ink').
 *
 * `stepWhack` chia `dt` thành các bước cố định `WHACK_SPEC.tick` (1/120 giây) nên kết quả sinh chuột không phụ thuộc tốc độ khung hình; mọi số ngẫu nhiên chỉ rút trong bước cố định, không rút lúc nhận cú đập.
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MOUSE_KINDS, WHACK_SPEC, type MouseKind } from './whackConfig';

const EPS = 1e-9;

export interface Mouse {
  id: number;
  kind: MouseKind;
  lane: number;
  /** Vị trí dọc làn: 0 là đầu làn, 10 là cuốn sổ */
  pos: number;
  /** Tốc độ (đơn vị/giây) chốt lúc sinh theo đồng hồ lịch (đã nhân hệ số của loại nhanh) */
  speed: number;
  /** Số cú đập còn lại để hạ (chuột to: 2) */
  hits: number;
  /** Còn khựng (đứng yên) bấy nhiêu giây sau cú đập đầu của chuột to */
  freeze: number;
  /** Chớp sáng (chuột to, trong lúc khựng) */
  flash: boolean;
  /** Chuột đổi làn đã đổi rồi */
  changed: boolean;
}

export interface Coin {
  lane: number;
  pos: number;
  /** Còn hiện bấy nhiêu giây */
  life: number;
}

export interface Boss {
  index: number;
  lane: number;
  /** Vị trí chuột câu hỏi dọc làn: chạy từ 0 tới giữa vùng đập rồi đứng chờ */
  pos: number;
  /** Giây đã chạy */
  t: number;
  /** Chuột câu hỏi đã tới chỗ chờ (giữa vùng đập) */
  arrived: boolean;
  /** Số giây chuột đáp án chạy từ đầu làn tới sổ: 18 cho lần 1–5, 14 cho lần 6–10 */
  answerSeconds: number;
  /** Làn của đáp án A, B, C, D (chốt lúc chuột câu hỏi ra, theo seed); dài 4, chỉ dùng `options` phần tử đầu */
  laneOf: number[];
}

/** Câu hỏi của một lượt, logic chỉ cần biết: có bao nhiêu đáp án và đáp án đúng là cái nào (0 là A) */
export interface RoundKey {
  correct: number;
  options: number;
}

/** Chuột vàng mang nhãn đáp án (lượt đáp án) */
export interface AnswerMouse {
  /** 0 là A, 1 là B, … */
  option: number;
  lane: number;
  pos: number;
}

export interface AnswerRound {
  index: number;
  mice: AnswerMouse[];
  /** Đơn vị/giây */
  speed: number;
  correct: number;
  /** Em bấm "Đọc xong": chuột chạy nhanh `readBoost` lần tới đầu vùng đập (điểm vẫn tính theo tốc độ thường) */
  boost: boolean;
}

/** Kết quả lượt đáp án, chờ `answerBoss` áp dụng */
export interface Verdict {
  result: BossResult;
  /** Số giây chuột còn cần để tới sổ lúc em đập (chỉ có nghĩa khi đúng) */
  secondsLeft: number;
  /** Đáp án em chọn (đập trúng chuột nhãn đó); hết giờ thì null */
  option: number | null;
  correct: number;
}

export type WhackPhase = 'play' | 'bossRun' | 'answer' | 'quiz' | 'ended';
export type EndReason = 'complete' | 'ink';
export type BossResult = 'correct' | 'wrong' | 'timeout';

export interface WhackStats {
  spawned: number;
  hits: number;
  misses: number;
  leaked: number;
  coinsTaken: number;
  bossCorrect: number;
  /** Điểm từ chuột (đập trúng), từ tiền đồng và từ trùm: chia điểm ở màn kết quả */
  micePoints: number;
  coinPoints: number;
  bossPoints: number;
}

export interface WhackState {
  seed: number;
  rng: () => number;
  /** Số bước cố định đã chạy trong lúc đồng hồ lịch chạy; đồng hồ lịch `clock` = ticks × tick */
  ticks: number;
  /** Phần `dt` chưa đủ một bước cố định */
  acc: number;
  clock: number;
  phase: WhackPhase;
  ended: EndReason | null;
  mice: Mouse[];
  coin: Coin | null;
  /** Còn bấy nhiêu giây (đồng hồ lịch) tới con chuột kế / đồng kế */
  spawnIn: number;
  coinIn: number;
  /** Làn còn nghỉ bấy nhiêu giây sau cú đập hụt */
  rest: number[];
  ink: number;
  score: number;
  /** Số xu nhặt được */
  coins: number;
  /** Số lượt trùm đã trả lời xong (0–10); trùm đang chạy có `boss.index` = số này */
  bossesDone: number;
  boss: Boss | null;
  /** Câu hỏi 10 lượt (đáp án đúng, số đáp án); thiếu thì đáp án đúng là A và có 4 đáp án */
  keys: readonly RoundKey[];
  /** Lượt đáp án đang chạy (phase `answer`) */
  answer: AnswerRound | null;
  /** Kết quả lượt đáp án (phase `quiz`) */
  verdict: Verdict | null;
  nextId: number;
  stats: WhackStats;
}

export type WhackEvent =
  | { type: 'spawn'; mouse: Mouse }
  | { type: 'laneChange'; mouse: Mouse; from: number }
  | { type: 'leak'; mouse: Mouse; ink: number }
  | { type: 'coinAppear'; coin: Coin }
  | { type: 'coinGone' }
  | { type: 'bossStart'; boss: Boss }
  | { type: 'bossArrive'; boss: Boss }
  | { type: 'answerStart'; round: AnswerRound }
  | { type: 'answerBoost' }
  | { type: 'bossQuiz'; boss: Boss; verdict: Verdict }
  | { type: 'hit'; lane: number; mouse: Mouse; killed: boolean; points: number }
  | { type: 'miss'; lane: number }
  | { type: 'blocked'; lane: number; why: 'phase' | 'rest' }
  | { type: 'coinTaken'; points: number; xu: number }
  | { type: 'bossAnswer'; result: BossResult; points: number; ink: number }
  | { type: 'end'; reason: EndReason };

// ---------------------------------------------------------------------------
// Số liệu theo đồng hồ lịch (hàm thuần)

/** Nội suy tuyến tính từ `a` (giây 0) về `b` (giây `rampSeconds`), giữ nguyên sau đó. */
function ramp(clock: number, a: number, b: number): number {
  const k = Math.min(Math.max(clock / WHACK_SPEC.rampSeconds, 0), 1);
  return a + (b - a) * k;
}

/** Số giây chuột cần để chạy từ đầu làn tới đầu vùng đập: 3 giây lúc 0, 1,8 giây từ giây 120. */
export function runSeconds(clock: number): number {
  return ramp(clock, WHACK_SPEC.runSecondsStart, WHACK_SPEC.runSecondsEnd);
}

/** Tốc độ chuột thường (đơn vị/giây) lúc `clock`: quãng từ đầu làn tới đầu vùng đập chia số giây cần. */
export function mouseSpeed(clock: number): number {
  return WHACK_SPEC.zoneStart / runSeconds(clock);
}

/** Nhịp sinh (giây một con): 1,2 lúc 0, 0,55 từ giây 120. */
export function spawnInterval(clock: number): number {
  return ramp(clock, WHACK_SPEC.spawnStart, WHACK_SPEC.spawnEnd);
}

/** Tỉ lệ [thường, đổi làn, nhanh, to] lúc `clock`. */
export function mixAt(clock: number): readonly number[] {
  let weights: readonly number[] = WHACK_SPEC.mix[0].weights;
  for (const m of WHACK_SPEC.mix) if (clock >= m.from - EPS) weights = m.weights;
  return weights;
}

/** Chọn loại chuột theo tỉ lệ lúc `clock` với số ngẫu nhiên `rnd` () thuộc [0, 1). */
export function pickKind(clock: number, rnd: () => number): MouseKind {
  const weights = mixAt(clock);
  let r = rnd();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return MOUSE_KINDS[i];
    r -= weights[i];
  }
  // sai số làm tròn: loại cuối có tỉ lệ > 0
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return MOUSE_KINDS[i];
  return 'thuong';
}

/** Giây của đồng hồ lịch mà trùm thứ `index` (đếm từ 0) ra: 12, 24, …, 120. */
export function bossClock(index: number): number {
  return WHACK_SPEC.boss.every * (index + 1);
}

/** Thời gian trả lời của trùm thứ `index` (đếm từ 0): 15 giây cho lần 1–5, 10 giây cho lần 6–10. */
export function bossSeconds(index: number): number {
  return WHACK_SPEC.boss.answerSeconds[index < WHACK_SPEC.boss.firstHalf ? 0 : 1];
}

/** Điểm trả lời đúng: 100 + 5 × số giây còn lại, làm tròn xuống số giây (còn 7,0–7,99 giây thì 7 → 135). */
export function bossPoints(secondsLeft: number): number {
  const left = Number.isFinite(secondsLeft) ? Math.max(0, Math.floor(secondsLeft + EPS)) : 0;
  return WHACK_SPEC.boss.base + WHACK_SPEC.boss.perSecond * left;
}

export function inZone(m: Mouse): boolean {
  return m.pos >= WHACK_SPEC.zoneStart - EPS && m.pos <= WHACK_SPEC.zoneEnd + EPS;
}

/** Con THẤP NHẤT (vị trí lớn nhất) đang trong vùng đập của làn `lane`; không có thì null. */
export function lowestInZone(s: WhackState, lane: number): Mouse | null {
  let best: Mouse | null = null;
  for (const m of s.mice) if (m.lane === lane && inZone(m) && (best === null || m.pos > best.pos)) best = m;
  return best;
}

// ---------------------------------------------------------------------------
// Tạo ván

/** Khóa của lượt thứ `index` (đếm từ 0): thiếu thì đáp án đúng là A, 4 đáp án */
export function roundKey(s: Pick<WhackState, 'keys'>, index: number): RoundKey {
  return s.keys[index] ?? { correct: 0, options: 4 };
}

export function createWhackGame(seed: number, keys: readonly RoundKey[] = []): WhackState {
  const rng = createMulberry32(seed);
  const s: WhackState = {
    seed,
    rng,
    ticks: 0,
    acc: 0,
    clock: 0,
    phase: 'play',
    ended: null,
    mice: [],
    coin: null,
    spawnIn: WHACK_SPEC.firstSpawn,
    coinIn: 0,
    rest: new Array<number>(WHACK_SPEC.lanes).fill(0),
    ink: 0,
    score: 0,
    coins: 0,
    bossesDone: 0,
    boss: null,
    keys,
    answer: null,
    verdict: null,
    nextId: 1,
    stats: { spawned: 0, hits: 0, misses: 0, leaked: 0, coinsTaken: 0, bossCorrect: 0, micePoints: 0, coinPoints: 0, bossPoints: 0 },
  };
  s.coinIn = nextCoinIn(rng);
  return s;
}

function nextCoinIn(rng: () => number): number {
  return WHACK_SPEC.coin.every + (rng() * 2 - 1) * WHACK_SPEC.coin.jitter;
}

/** Đặt một con chuột vào làn (dùng cho bộ sinh và cho test): tốc độ chốt theo đồng hồ lịch hiện tại. */
export function spawnMouse(s: WhackState, kind: MouseKind, lane: number, pos = 0): Mouse {
  const m: Mouse = {
    id: s.nextId++,
    kind,
    lane,
    pos,
    speed: mouseSpeed(s.clock) * (kind === 'nhanh' ? WHACK_SPEC.fastFactor : 1),
    hits: kind === 'to' ? WHACK_SPEC.bigHits : 1,
    freeze: 0,
    flash: false,
    changed: false,
  };
  s.mice.push(m);
  return m;
}

// ---------------------------------------------------------------------------
// Một bước cố định

function endGame(s: WhackState, reason: EndReason, out: WhackEvent[]): void {
  s.phase = 'ended';
  s.ended = reason;
  out.push({ type: 'end', reason });
}

/** Chọn làn sinh: làn nào có con gần nhất còn dưới `spawnGuard` thì bị loại; không còn làn nào thì null (thử lại bước sau, không rút số ngẫu nhiên). */
function spawnLaneChoices(s: WhackState): number[] {
  const ok: number[] = [];
  for (let lane = 0; lane < WHACK_SPEC.lanes; lane++) {
    let nearest = Infinity;
    for (const m of s.mice) if (m.lane === lane && m.pos < nearest) nearest = m.pos;
    if (nearest >= WHACK_SPEC.spawnGuard) ok.push(lane);
  }
  return ok;
}

/** Làn kề `lane` có trống quanh vị trí `pos` (không con nào trong ±`laneChangeClear`) không; `self` là con đang đổi làn (bỏ qua). */
function laneClear(s: WhackState, lane: number, pos: number, self: Mouse): boolean {
  for (const o of s.mice) if (o !== self && o.lane === lane && Math.abs(o.pos - pos) <= WHACK_SPEC.laneChangeClear + EPS) return false;
  return true;
}

/**
 * Làn mà chuột đổi làn `m` nhảy sang: làn ngoài cùng chỉ có một làn kề; làn giữa thì rng chọn bên trước, bị chiếm thì thử bên kia. Không làn nào trống thì null (không đổi). Rng chỉ rút ở làn giữa.
 */
function pickLaneChange(s: WhackState, m: Mouse): number | null {
  const last = WHACK_SPEC.lanes - 1;
  const options = m.lane === 0 ? [1] : m.lane === last ? [last - 1] : s.rng() < 0.5 ? [m.lane - 1, m.lane + 1] : [m.lane + 1, m.lane - 1];
  for (const lane of options) if (laneClear(s, lane, m.pos, m)) return lane;
  return null;
}

function stepOnce(s: WhackState, out: WhackEvent[]): void {
  const h = WHACK_SPEC.tick;
  const boss = s.phase === 'bossRun';
  const mul = boss ? WHACK_SPEC.boss.slowFactor : 1;

  for (let i = 0; i < s.rest.length; i++) if (s.rest[i] > 0) s.rest[i] = s.rest[i] <= h + EPS ? 0 : s.rest[i] - h;

  // lượt đáp án: chỉ chuột vàng chạy; chạy tới sổ mà chưa bị đập là hết giờ
  if (s.phase === 'answer') {
    const a = s.answer!;
    let arrived = false;
    let delta = a.speed * h;
    if (a.boost) {
      // "Đọc xong": chạy nhanh tới đầu vùng đập rồi về tốc độ thường
      let lead = 0;
      for (const m of a.mice) lead = Math.max(lead, m.pos);
      delta *= WHACK_SPEC.boss.readBoost;
      if (lead + delta >= WHACK_SPEC.zoneStart - EPS) {
        delta = Math.max(0, WHACK_SPEC.zoneStart - lead);
        a.boost = false;
      }
    }
    for (const m of a.mice) {
      m.pos += delta;
      if (m.pos >= WHACK_SPEC.laneLength - EPS) arrived = true;
    }
    if (arrived) {
      for (const m of a.mice) m.pos = Math.min(m.pos, WHACK_SPEC.laneLength);
      closeAnswer(s, { result: 'timeout', secondsLeft: 0, option: null, correct: a.correct }, out);
    }
    return;
  }

  // chuột: khựng, chạy, đổi làn, lọt
  for (let i = s.mice.length - 1; i >= 0; i--) {
    const m = s.mice[i];
    if (m.freeze > 0) {
      m.freeze = m.freeze <= h + EPS ? 0 : m.freeze - h;
      if (m.freeze === 0) m.flash = false;
      continue;
    }
    m.pos += m.speed * mul * h;
    if (m.kind === 'doiLan' && !m.changed && m.pos >= WHACK_SPEC.laneChangeAt) {
      const from = m.lane;
      const to = pickLaneChange(s, m);
      m.changed = true;
      if (to !== null) {
        m.lane = to;
        out.push({ type: 'laneChange', mouse: m, from });
      }
    }
  }
  // lọt: xử lý theo thứ tự id để cùng seed cùng thứ tự sự kiện
  const leaked = s.mice.filter((m) => m.pos >= WHACK_SPEC.laneLength - EPS).sort((a, b) => a.id - b.id);
  for (const m of leaked) {
    s.mice.splice(s.mice.indexOf(m), 1);
    s.ink++;
    s.stats.leaked++;
    out.push({ type: 'leak', mouse: m, ink: s.ink });
  }
  if (s.ink >= WHACK_SPEC.inkMax) return endGame(s, 'ink', out);

  if (boss) {
    const b = s.boss!;
    if (!b.arrived) {
      b.t += h;
      const stop = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;
      b.pos = stop * Math.min(1, b.t / WHACK_SPEC.boss.runSeconds);
      if (b.t >= WHACK_SPEC.boss.runSeconds - EPS) {
        b.pos = stop;
        b.arrived = true;
        out.push({ type: 'bossArrive', boss: b });
      }
    }
    return;
  }

  // đồng hồ lịch chạy
  s.ticks++;
  s.clock = s.ticks * h;

  s.spawnIn -= h;
  if (s.spawnIn <= EPS) {
    const lanes = spawnLaneChoices(s);
    if (lanes.length > 0) {
      const lane = lanes[Math.floor(s.rng() * lanes.length)];
      const kind = pickKind(s.clock, s.rng);
      const m = spawnMouse(s, kind, lane);
      s.stats.spawned++;
      out.push({ type: 'spawn', mouse: m });
      s.spawnIn = spawnInterval(s.clock) + Math.max(s.spawnIn, -h);
    }
  }

  if (s.coin) {
    s.coin.life -= h;
    if (s.coin.life <= EPS) {
      s.coin = null;
      out.push({ type: 'coinGone' });
    }
  }
  s.coinIn -= h;
  if (s.coinIn <= EPS && !s.coin) {
    const c = WHACK_SPEC.coin;
    s.coin = { lane: Math.floor(s.rng() * WHACK_SPEC.lanes), pos: c.posMin + s.rng() * (c.posMax - c.posMin), life: c.life };
    s.coinIn = nextCoinIn(s.rng);
    out.push({ type: 'coinAppear', coin: s.coin });
  }

  if (s.bossesDone < WHACK_SPEC.boss.count && s.ticks === Math.round(bossClock(s.bossesDone) / h)) {
    const lane = Math.floor(s.rng() * WHACK_SPEC.lanes);
    // đáp án A, B, C, D vào các làn theo thứ tự trộn (Fisher–Yates, rút số trong bước cố định)
    const laneOf = Array.from({ length: WHACK_SPEC.lanes }, (_, i) => i);
    for (let i = laneOf.length - 1; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1));
      [laneOf[i], laneOf[j]] = [laneOf[j], laneOf[i]];
    }
    const b: Boss = { index: s.bossesDone, lane, pos: 0, t: 0, arrived: false, answerSeconds: bossSeconds(s.bossesDone), laneOf };
    s.boss = b;
    s.phase = 'bossRun';
    out.push({ type: 'bossStart', boss: b });
  }
}

/** Mở kết quả lượt đáp án: mọi thứ đứng yên chờ em bấm "Chơi tiếp" (`answerBoss`). */
function closeAnswer(s: WhackState, verdict: Verdict, out: WhackEvent[]): void {
  s.verdict = verdict;
  s.phase = 'quiz';
  out.push({ type: 'bossQuiz', boss: s.boss!, verdict });
}

/** Tốc độ chuột đáp án (đơn vị/giây) của lượt có `answerSeconds` giây từ đầu làn tới sổ. */
export function answerSpeed(answerSeconds: number): number {
  return WHACK_SPEC.laneLength / answerSeconds;
}

/** Chuột câu hỏi đang trong vùng đập chưa (đập được từ lúc nó chạy qua đầu vùng) */
export function bossInZone(b: Boss): boolean {
  return b.pos >= WHACK_SPEC.zoneStart - EPS && b.pos <= WHACK_SPEC.zoneEnd + EPS;
}

/** Chạy `dt` GIÂY của ván (chia thành các bước cố định `WHACK_SPEC.tick`); trả về các sự kiện xảy ra theo thứ tự. Khi bảng câu hỏi mở hay đã hết ván thì không có gì chạy. */
export function stepWhack(s: WhackState, dt: number): WhackEvent[] {
  const out: WhackEvent[] = [];
  if (!(dt > 0)) return out;
  s.acc += dt;
  while (s.acc >= WHACK_SPEC.tick - EPS && s.phase !== 'quiz' && s.phase !== 'ended') {
    s.acc = Math.max(0, s.acc - WHACK_SPEC.tick);
    stepOnce(s, out);
  }
  if (s.phase === 'quiz' || s.phase === 'ended') s.acc = 0;
  return out;
}

/**
 * Bước thời gian khi có thể đang tạm dừng (nút "?", tab ẩn, nhắc xoay ngang): `paused` thì KHÔNG có gì đổi (chuột, đồng, đồng hồ lịch, đồng hồ trùm đứng yên) và không có sự kiện.
 */
export function tickWhack(s: WhackState, dt: number, paused: boolean): WhackEvent[] {
  return paused ? [] : stepWhack(s, dt);
}

// ---------------------------------------------------------------------------
// Thao tác của học sinh

/**
 * Đập làn `lane`: trúng con THẤP NHẤT đang trong vùng đập của làn đó. Không có thì hụt (không phạt), làn đó nghỉ `hitRest` giây. Làn đang nghỉ, bảng câu hỏi đang mở hay hết ván thì không nhận (sự kiện `blocked`).
 */
export function hitLane(s: WhackState, lane: number): WhackEvent[] {
  if (s.phase !== 'play' && s.phase !== 'bossRun' && s.phase !== 'answer') return [{ type: 'blocked', lane, why: 'phase' }];
  if (!(lane >= 0 && lane < WHACK_SPEC.lanes) || s.rest[lane] > 0) return [{ type: 'blocked', lane, why: 'rest' }];
  if (s.phase === 'answer') return hitAnswer(s, lane);
  const boss = s.boss;
  if (s.phase === 'bossRun' && boss && boss.lane === lane && bossInZone(boss)) return startAnswer(s, boss);
  const m = lowestInZone(s, lane);
  if (!m) {
    s.rest[lane] = WHACK_SPEC.hitRest;
    s.stats.misses++;
    return [{ type: 'miss', lane }];
  }
  m.hits--;
  if (m.hits > 0) {
    // chuột to: đập lần đầu vẫn còn, khựng và chớp sáng
    m.freeze = WHACK_SPEC.bigFreeze;
    m.flash = true;
    return [{ type: 'hit', lane, mouse: m, killed: false, points: 0 }];
  }
  const points = WHACK_SPEC.points[m.kind];
  s.score += points;
  s.stats.micePoints += points;
  s.stats.hits++;
  s.mice.splice(s.mice.indexOf(m), 1);
  return [{ type: 'hit', lane, mouse: m, killed: true, points }];
}

/** Đập trúng chuột câu hỏi: mở lượt đáp án (chuột thường đứng yên, chuột vàng A–D chạy từ đầu làn). */
function startAnswer(s: WhackState, boss: Boss): WhackEvent[] {
  const key = roundKey(s, boss.index);
  const n = Math.min(Math.max(key.options, 2), WHACK_SPEC.lanes);
  const round: AnswerRound = {
    index: boss.index,
    mice: Array.from({ length: n }, (_, option) => ({ option, lane: boss.laneOf[option], pos: 0 })),
    speed: answerSpeed(boss.answerSeconds),
    correct: Math.min(Math.max(key.correct, 0), n - 1),
    boost: false,
  };
  s.answer = round;
  s.phase = 'answer';
  return [{ type: 'answerStart', round }];
}

/** "Đọc xong": chuột đáp án chạy nhanh tới đầu vùng đập. Chỉ nhận trong lượt đáp án, chưa bấm và chuột chưa tới vùng đập. */
export function readDone(s: WhackState): WhackEvent[] {
  const a = s.answer;
  if (s.phase !== 'answer' || !a || a.boost) return [];
  if (a.mice.some((m) => m.pos >= WHACK_SPEC.zoneStart - EPS)) return [];
  a.boost = true;
  return [{ type: 'answerBoost' }];
}

/** Đập làn `lane` trong lượt đáp án: trúng chuột vàng THẤP NHẤT (pos lớn nhất) đang trong vùng đập của làn đó thì chọn đáp án đó; không có thì hụt (không phạt, làn nghỉ). */
function hitAnswer(s: WhackState, lane: number): WhackEvent[] {
  const a = s.answer!;
  let best: AnswerMouse | null = null;
  for (const m of a.mice) if (m.lane === lane && m.pos >= WHACK_SPEC.zoneStart - EPS && m.pos <= WHACK_SPEC.zoneEnd + EPS && (best === null || m.pos > best.pos)) best = m;
  if (!best) {
    s.rest[lane] = WHACK_SPEC.hitRest;
    s.stats.misses++;
    return [{ type: 'miss', lane }];
  }
  const out: WhackEvent[] = [];
  const correct = best.option === a.correct;
  closeAnswer(s, { result: correct ? 'correct' : 'wrong', secondsLeft: correct ? (WHACK_SPEC.laneLength - best.pos) / a.speed : 0, option: best.option, correct: a.correct }, out);
  return out;
}

/** Chạm tiền đồng đang hiện: +5 điểm, +1 xu. Không có đồng (hoặc đang mở câu hỏi) thì không có gì. */
export function collectCoin(s: WhackState): WhackEvent[] {
  if ((s.phase !== 'play' && s.phase !== 'bossRun') || !s.coin) return [];
  s.coin = null;
  s.score += WHACK_SPEC.coin.points;
  s.stats.coinPoints += WHACK_SPEC.coin.points;
  s.coins += WHACK_SPEC.coin.xu;
  s.stats.coinsTaken++;
  return [{ type: 'coinTaken', points: WHACK_SPEC.coin.points, xu: WHACK_SPEC.coin.xu }];
}

/**
 * Kết quả lượt trùm (chỉ nhận khi bảng câu hỏi đang mở). Đúng: +100 + 5 × số giây còn lại (làm tròn xuống) và xoá 2 vết mực nếu đang có (không xuống dưới 0). Sai hoặc hết giờ: +1 vết mực. Rồi {phanDien} rời đi và mọi thứ chạy lại;
 * xong lượt thứ 10 hoặc đủ `inkMax` (8) vết mực thì hết ván (đủ vết mực xét trước).
 */
export function answerBoss(s: WhackState, result: BossResult, secondsLeft = 0): WhackEvent[] {
  if (s.phase !== 'quiz' || !s.boss) return [];
  const out: WhackEvent[] = [];
  let points = 0;
  if (result === 'correct') {
    points = bossPoints(Math.min(secondsLeft, s.boss.answerSeconds));
    s.score += points;
    s.stats.bossPoints += points;
    s.stats.bossCorrect++;
    // trả lời đúng thì xoá 2 vết mực nếu đang có
    s.ink = Math.max(0, s.ink + WHACK_SPEC.boss.inkOnCorrect);
  } else {
    s.ink++;
  }
  s.bossesDone++;
  s.boss = null;
  s.answer = null;
  s.verdict = null;
  out.push({ type: 'bossAnswer', result, points, ink: s.ink });
  if (s.ink >= WHACK_SPEC.inkMax) endGame(s, 'ink', out);
  else if (s.bossesDone >= WHACK_SPEC.boss.count) endGame(s, 'complete', out);
  else {
    s.phase = 'play';
    s.acc = 0;
  }
  return out;
}

/** Điểm cả ván (đã gồm điểm đập, đồng và trùm). */
export function whackScore(s: WhackState): number {
  return s.score;
}
