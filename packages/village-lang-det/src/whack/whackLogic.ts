/**
 * Logic màn 5 "Đập {phanDien}" (spec 06, mục "Màn 5"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `rng` (createMulberry32) nên cùng seed cùng ván.
 * Đơn vị thời gian là GIÂY: `dt` của `stepWhack`, đồng hồ lịch `clock`, mọi bộ đếm đều tính bằng giây.
 *
 * Trạng thái ván:
 *  - `play`: chạy bình thường (đồng hồ lịch chạy, sinh chuột, đồng);
 *  - `bossRun`: trùm đang chạy xuống (đồng hồ lịch DỪNG, ngừng sinh chuột, chuột đang chạy còn 20% tốc độ);
 *  - `quiz`: bảng câu hỏi mở (mọi thứ đứng yên, không nhận cú đập; logic chỉ chờ `answerBoss`, việc đếm giờ trả lời và chọn câu hỏi do QuizCard lo);
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
  /** Vị trí {phanDien} dọc làn: chạy từ 0 tới giữa vùng đập */
  pos: number;
  /** Giây đã chạy xuống */
  t: number;
  /** Thời gian trả lời (giây): 15 cho lần 1–5, 10 cho lần 6–10 */
  answerSeconds: number;
}

export type WhackPhase = 'play' | 'bossRun' | 'quiz' | 'ended';
export type EndReason = 'complete' | 'ink';
export type BossResult = 'correct' | 'wrong' | 'timeout';

export interface WhackStats {
  spawned: number;
  hits: number;
  misses: number;
  leaked: number;
  coinsTaken: number;
  bossCorrect: number;
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
  | { type: 'bossQuiz'; boss: Boss }
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

export function createWhackGame(seed: number): WhackState {
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
    nextId: 1,
    stats: { spawned: 0, hits: 0, misses: 0, leaked: 0, coinsTaken: 0, bossCorrect: 0 },
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
    b.t += h;
    const stop = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;
    b.pos = stop * Math.min(1, b.t / WHACK_SPEC.boss.runSeconds);
    if (b.t >= WHACK_SPEC.boss.runSeconds - EPS) {
      b.pos = stop;
      s.phase = 'quiz';
      out.push({ type: 'bossQuiz', boss: b });
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
    const b: Boss = { index: s.bossesDone, lane: Math.floor(s.rng() * WHACK_SPEC.lanes), pos: 0, t: 0, answerSeconds: bossSeconds(s.bossesDone) };
    s.boss = b;
    s.phase = 'bossRun';
    out.push({ type: 'bossStart', boss: b });
  }
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

// ---------------------------------------------------------------------------
// Thao tác của học sinh

/**
 * Đập làn `lane`: trúng con THẤP NHẤT đang trong vùng đập của làn đó. Không có thì hụt (không phạt), làn đó nghỉ `hitRest` giây. Làn đang nghỉ, bảng câu hỏi đang mở hay hết ván thì không nhận (sự kiện `blocked`).
 */
export function hitLane(s: WhackState, lane: number): WhackEvent[] {
  if (s.phase !== 'play' && s.phase !== 'bossRun') return [{ type: 'blocked', lane, why: 'phase' }];
  if (!(lane >= 0 && lane < WHACK_SPEC.lanes) || s.rest[lane] > 0) return [{ type: 'blocked', lane, why: 'rest' }];
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
  s.stats.hits++;
  s.mice.splice(s.mice.indexOf(m), 1);
  return [{ type: 'hit', lane, mouse: m, killed: true, points }];
}

/** Chạm tiền đồng đang hiện: +5 điểm, +1 xu. Không có đồng (hoặc đang mở câu hỏi) thì không có gì. */
export function collectCoin(s: WhackState): WhackEvent[] {
  if ((s.phase !== 'play' && s.phase !== 'bossRun') || !s.coin) return [];
  s.coin = null;
  s.score += WHACK_SPEC.coin.points;
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
    s.stats.bossCorrect++;
    // trả lời đúng thì xoá 2 vết mực nếu đang có
    s.ink = Math.max(0, s.ink + WHACK_SPEC.boss.inkOnCorrect);
  } else {
    s.ink++;
  }
  s.bossesDone++;
  s.boss = null;
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
