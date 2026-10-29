/**
 * Luật màn 2 "Đuổi theo {phanDien}" (spec 05, mục "Màn 2"): 3 làn, tốc độ, nhảy, trượt, 4 loại chướng ngại (kể cả xe chở hàng chạy trên nóc), rơm {phanDien} ném,
 * 5 vật nhặt, 4 vòng 25 giây có câu hỏi, tim, điểm, mốc. KHÔNG có đồ họa, điều khiển hay giao diện (bước 11, 12 chỉ việc vẽ và nối phím).
 *
 * Cách dùng: `const s = createRunner({ seed })`, rồi mỗi khung hình `stepRunner(s, input, dt)`.
 *  - `stepRunner` sửa `s` TẠI CHỖ và trả về chính nó (để không cấp phát trong useFrame; trạng thái chỉ gồm số, chuỗi và mảng nên `cloneRunner` sao chép được).
 *    Mọi thứ khác là hàm thuần: cùng seed và cùng chuỗi input thì cùng kết quả (bộ ngẫu nhiên mulberry32 nằm trong state, không có Math.random hay Date).
 *  - `input` là lệnh một lần (đổi làn, nhảy, trượt), `answer` và `resume` ở lúc hỏi. Bước 11 đọc `s.events` (xóa mỗi lần step) để phát âm thanh và hiệu ứng.
 *  - Số chưa có trong spec nằm ở `runnerConfig.ts`.
 *
 * Hệ trục: z là hướng chạy (nhân vật bắt đầu ở z = 0); làn `lane` 0, 1, 2 ứng với x = −2, 0, 2 (`RUNNER_SPEC.laneX`). `move: −1` là giảm chỉ số làn (về phía x = −2);
 * bước 11 tự chọn phím ← hay → ứng với chiều nào theo hướng camera.
 */
import { medalOf, type Medal } from '@so-chung/core';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';

// ---------------------------------------------------------------------------
// Kiểu dữ liệu

export type Lane = 0 | 1 | 2;
export type ObstacleKind = 'low' | 'high' | 'block' | 'truck';
export type PickupKind = 'trang' | 'dong' | 'nonla' | 'guoc' | 'tui';
export type Phase = 'run' | 'slow' | 'quiz' | 'resume' | 'over';
export type OverReason = 'hearts' | 'done';

/**
 * Một chướng ngại trong một làn. `variant` chọn model: low 0 = sạp thấp, 1 = đống rơm; high 0 = sào phơi giấy; block 0 = xe bò, 1 = phên phơi giấy; truck 0 = xe chở hàng.
 * Rơm {phanDien} ném là low variant 1 với `thrown`: chưa va được cho tới thời điểm `landAt` (giờ chạy `RunnerState.time`).
 */
export interface Cell {
  kind: ObstacleKind;
  variant: number;
  /** Mép gần (nhỏ) và mép xa (lớn) dọc đường */
  z0: number;
  z1: number;
  /** Khoảng cao bị chiếm: từ `bottom` đến `top` (xe chở hàng: nóc ở `top`; chắn làn cao 2,5) */
  bottom: number;
  top: number;
  thrown: boolean;
  landAt: number;
  /** Rơm ném: thời điểm (giờ chạy) và vị trí lúc {phanDien} ném (để vẽ vòng cung); 0 nếu không phải rơm ném */
  t0: number;
  fromX: number;
  fromZ: number;
  /** Nửa rộng (va chạm, đáp lên nóc): một làn, hoặc hẹp hơn với xe chở hàng */
  halfWidth: number;
  /** Chắn làn: đoạn đầu dài `frontLen` chỉ cao `frontTop` (con bò); 0 nếu cả khối cao như nhau */
  frontLen: number;
  frontTop: number;
  /** Đã va (hay đã lướt qua lúc đang nhấp nháy): không va lại */
  spent: boolean;
}

/** Một hàng chướng ngại: tối đa 2 trong 3 làn có chướng ngại (không bao giờ chắn kín). */
export interface Row {
  id: number;
  /** Vị trí hàng (tâm các chướng ngại thường; xe chở hàng bắt đầu ngay trước đó) */
  z: number;
  cells: [Cell | null, Cell | null, Cell | null];
  /** Làn mà hàng này đảm bảo đi qua được (trống, thấp hoặc cao); lệch tối đa 1 làn so với hàng trước */
  pathLane: Lane;
  /** Tốc độ dùng để tính khoảng cách tới hàng trước (tốc độ lúc nhân vật tới hàng này) và có guốc mộc lúc sinh hay không */
  speedBasis: number;
  boots: boolean;
  /** Khoảng cách tới hàng trước (z − z hàng trước); không có hàng trước thì tới vạch xuất phát */
  gap: number;
}

export interface Item {
  id: number;
  /** Trang {phanDien} làm rơi: chưa nhặt được cho tới `landAt` (giờ chạy); `t0`, `fromX`, `fromZ` là lúc và chỗ bắt đầu rơi (để vẽ). Vật thường: 0. */
  landAt: number;
  t0: number;
  fromX: number;
  fromZ: number;
  /** Cùng một chuỗi hay một nhóm vật nhặt thì cùng số này (bước 11 dùng để vẽ chuỗi trang; bot dùng để chọn có nhặt cả chuỗi hay không) */
  group: number;
  kind: PickupKind;
  lane: Lane;
  x: number;
  z: number;
  /** Độ cao tâm */
  y: number;
}

export interface QuizState {
  /** Vòng vừa xong (0 đến rounds−1) */
  round: number;
  /** Còn bao nhiêu giây để trả lời */
  timeLeft: number;
  /** null: chưa trả lời; true/false: đã trả lời đúng/sai (hết giờ là false) */
  answered: boolean | null;
  timedOut: boolean;
}

export type RunnerEvent =
  | { type: 'pickup'; kind: PickupKind; id: number; x: number; z: number }
  | { type: 'hit'; obstacle: ObstacleKind; /** true: nón lá đã chặn, không mất tim */ shielded: boolean }
  | { type: 'jump' }
  | { type: 'land'; roof: boolean }
  | { type: 'slide' }
  | { type: 'throw'; lane: Lane; z: number; landAt: number }
  /** {phanDien} làm rơi `n` trang xuống làn `lane`, nằm từ z đến z + (n − 1) × spacing, nhặt được từ `landAt` */
  | { type: 'drop'; lane: Lane; z: number; n: number; landAt: number }
  | { type: 'roundEnd'; round: number }
  | { type: 'quiz'; round: number }
  | { type: 'answer'; correct: boolean; timedOut: boolean }
  | { type: 'over'; reason: OverReason };

export interface RunnerState {
  phase: Phase;
  over: OverReason | null;
  /** Trạng thái bộ sinh số ngẫu nhiên mulberry32 */
  rng: number;
  /** Giờ chạy (giây, không tính lúc hỏi và lúc chạy chậm) */
  time: number;
  round: number;
  roundTime: number;
  /** Hệ số tốc độ: 1 khi chạy; giảm về 0 lúc hết vòng, tăng lại sau câu hỏi */
  speedScale: number;
  distance: number;
  /** Vị trí nhân vật dọc đường */
  z: number;
  /** Làn đang hướng tới và vị trí x thật (đang đổi làn thì x nằm giữa hai làn) */
  lane: Lane;
  x: number;
  y: number;
  vy: number;
  /** Đang đứng trên mặt đất hoặc nóc xe */
  grounded: boolean;
  onRoof: boolean;
  /** Giây trượt còn lại (>0: đang trượt) */
  slide: number;
  /** Giây nhấp nháy còn lại sau khi mất tim */
  invuln: number;
  hearts: number;
  pages: number;
  coins: number;
  correct: number;
  /** Giây còn lại của nón lá (khiên), guốc mộc, túi tiền; 0 là không có */
  shield: number;
  boots: number;
  magnet: number;
  quiz: QuizState | null;
  rows: Row[];
  items: Item[];
  villain: { ahead: number; throwTimer: number; dropTimer: number; swing: number };
  /** Số trang đã rơi từ {phanDien} mà chưa trừ vào các chuỗi trang sinh sau (ngân sách trang sổ không đổi) */
  pageDebt: number;
  events: RunnerEvent[];
  // bộ sinh đường chạy
  genZ: number;
  genEnd: number;
  genPath: Lane;
  nextRowId: number;
  nextItemId: number;
  nextGroup: number;
  // tùy chọn
  rounds: number;
  /** Test: không va, không mất tim */
  ghost: boolean;
  /** Test: tắt sinh đường chạy tự động (tự dựng `rows`) */
  autoSpawn: boolean;
  /** Test: ghi lại mọi hàng đã sinh */
  rowLog: Row[] | null;
}

export interface RunnerInput {
  /** Đổi làn: −1 (giảm chỉ số làn) hoặc +1 */
  move?: -1 | 1;
  jump?: boolean;
  slide?: boolean;
  /** Lúc hỏi: trả lời đúng (true) hay sai (false); chỉ nhận lần đầu */
  answer?: boolean;
  /** Lúc hỏi đã trả lời: đóng giải thích và chạy tiếp (hoặc kết thúc) */
  resume?: boolean;
}

export interface RunnerOptions {
  seed: number;
  rounds?: number;
  ghost?: boolean;
  autoSpawn?: boolean;
  recordRows?: boolean;
}

const IDLE: RunnerInput = {};
const EPS = 1e-6;
const { laneX: LANE_X } = SPEC;

// ---------------------------------------------------------------------------
// Bộ ngẫu nhiên nằm trong state (mulberry32, cùng thuật toán lib/rng của core)

function rand(s: { rng: number }): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickWeighted<K extends string>(s: { rng: number }, weights: Readonly<Record<K, number>>): K {
  const keys = Object.keys(weights) as K[];
  let total = 0;
  for (const k of keys) total += weights[k];
  let r = rand(s) * total;
  for (const k of keys) {
    r -= weights[k];
    if (r < 0) return k;
  }
  return keys[keys.length - 1];
}

// ---------------------------------------------------------------------------
// Số liệu theo luật

/** Tốc độ theo giờ chạy: 12, tăng 0,36 mỗi 5 giây THEO BẬC (12 trong 5 giây đầu, 12,36 trong 5 giây kế…), tối đa 21,6 (spec 05, P4a: gấp 1,2 lần bước X1). */
export function speedAt(time: number): number {
  const { start, add, everySec, max } = SPEC.speed;
  return Math.min(max, start + add * Math.floor(Math.max(0, time) / everySec + 1e-9));
}

/** Điểm = trang × 10 + tiền đồng + quãng đường ÷ 10 (làm tròn xuống) + câu đúng × 30. */
export function runnerScore(s: Pick<RunnerState, 'pages' | 'coins' | 'distance' | 'correct'>): number {
  const k = SPEC.score;
  return s.pages * k.perPage + s.coins * k.perCoin + Math.floor(s.distance / k.perMeters) + s.correct * k.perCorrect;
}

export type ScoreKey = 'trang' | 'tien' | 'quangDuong' | 'cauDung';

/**
 * Điểm chia theo từng phần (cho màn kết quả): trang (× 10), tiền đồng (× 1), quãng đường (mét, ÷ 10 làm tròn xuống), câu đúng (× 30). Tổng `points` luôn bằng `runnerScore`.
 */
export function scoreParts(s: Pick<RunnerState, 'pages' | 'coins' | 'distance' | 'correct'>): { key: ScoreKey; count: number; points: number }[] {
  const k = SPEC.score;
  const meters = Math.floor(s.distance);
  return [
    { key: 'trang', count: s.pages, points: s.pages * k.perPage },
    { key: 'tien', count: s.coins, points: s.coins * k.perCoin },
    { key: 'quangDuong', count: meters, points: Math.floor(s.distance / k.perMeters) },
    { key: 'cauDung', count: s.correct, points: s.correct * k.perCorrect },
  ];
}

/** Mốc điểm: 0 chưa tới Đồng, 1 Đồng (216), 2 Bạc (499), 3 Vàng (638) (P4a, theo phân vị bot). */
export function runnerMedal(score: number): Medal {
  return medalOf(score, SPEC.medals);
}

/** Khoảng cách tối thiểu giữa hai hàng (tính từ tốc độ): × 1,0, có guốc mộc thì × 1,2. */
export function minGap(speed: number, boots: boolean): number {
  return speed * (boots ? SPEC.gapFactorBoots : SPEC.gapFactor);
}

const baseCell = (kind: ObstacleKind, variant: number, z0: number, z1: number, bottom: number, top: number): Cell => ({
  kind,
  variant,
  z0,
  z1,
  bottom,
  top,
  thrown: false,
  landAt: 0,
  t0: 0,
  fromX: 0,
  fromZ: 0,
  halfWidth: T.laneHalfWidth,
  frontLen: 0,
  frontTop: 0,
  spent: false,
});

const cellOf = (kind: ObstacleKind, variant: number, z: number): Cell => {
  switch (kind) {
    case 'low':
      return baseCell(kind, variant, z - T.low.halfDepth, z + T.low.halfDepth, 0, T.low.height);
    case 'high':
      return baseCell(kind, variant, z - T.high.halfDepth, z + T.high.halfDepth, T.high.bottom, T.high.top);
    case 'block': {
      // xe bò (variant 0) dài và có con bò thấp ở đầu; phên giấy (variant 1) ngắn và cao đều
      if (variant === 0) {
        const c = baseCell(kind, variant, z - T.block.halfDepth, z + T.block.halfDepth, 0, T.block.height);
        c.frontLen = T.block.frontLen;
        c.frontTop = T.block.frontTop;
        return c;
      }
      return baseCell(kind, variant, z - T.phenHalfDepth, z + T.phenHalfDepth, 0, T.block.height);
    }
    case 'truck': {
      const c = baseCell(kind, variant, z - T.truck.nearOffset, z - T.truck.nearOffset + T.truck.length, 0, SPEC.roofHeight);
      c.halfWidth = T.truck.halfWidth;
      return c;
    }
  }
};

/** Vị trí ngang của {phanDien} theo giờ chạy (lách nhẹ qua lại giữa đường): nơi vẽ và nơi tính chỗ ném dùng chung. */
export const villainX = (time: number): number => Math.sin(time * 0.8) * 1.2;

/** Tạo một chướng ngại đặt tại z (dùng cho test và bước 11). */
export function makeCell(kind: ObstacleKind, z: number, variant = 0): Cell {
  return cellOf(kind, variant, z);
}

export const occupiedCount = (row: Row): number => (row.cells[0] ? 1 : 0) + (row.cells[1] ? 1 : 0) + (row.cells[2] ? 1 : 0);

/** Làn này đi qua được ở mặt đất: trống, thấp (nhảy) hoặc cao (trượt). Chắn làn và xe chở hàng thì không (chỉ đổi làn). */
export const passable = (c: Cell | null): boolean => c === null || c.kind === 'low' || c.kind === 'high';

// ---------------------------------------------------------------------------
// Khởi tạo

export function createRunner(opts: RunnerOptions): RunnerState {
  const s: RunnerState = {
    phase: 'run',
    over: null,
    rng: opts.seed >>> 0,
    time: 0,
    round: 0,
    roundTime: 0,
    speedScale: 1,
    distance: 0,
    z: 0,
    lane: 1,
    x: LANE_X[1],
    y: 0,
    vy: 0,
    grounded: true,
    onRoof: false,
    slide: 0,
    invuln: 0,
    hearts: SPEC.hearts,
    pages: 0,
    coins: 0,
    correct: 0,
    shield: 0,
    boots: 0,
    magnet: 0,
    quiz: null,
    rows: [],
    items: [],
    villain: { ahead: SPEC.villainAhead[0], throwTimer: SPEC.throwEverySec, dropTimer: T.drop.everySec, swing: 0 },
    pageDebt: 0,
    events: [],
    genZ: 0,
    genEnd: 0,
    genPath: 1,
    nextRowId: 1,
    nextItemId: 1,
    nextGroup: 1,
    rounds: opts.rounds ?? SPEC.rounds,
    ghost: opts.ghost ?? false,
    autoSpawn: opts.autoSpawn ?? true,
    rowLog: opts.recordRows ? [] : null,
  };
  s.villain.throwTimer = throwInterval(s);
  s.villain.dropTimer = dropInterval(s);
  if (s.autoSpawn) spawnRows(s);
  return s;
}

/** Bản sao độc lập (bot tính trước, test). */
export function cloneRunner(s: RunnerState): RunnerState {
  return structuredClone(s);
}

const throwInterval = (s: RunnerState): number => SPEC.throwEverySec + (rand(s) * 2 - 1) * T.throwJitterSec;
const dropInterval = (s: RunnerState): number => T.drop.everySec + (rand(s) * 2 - 1) * T.drop.jitterSec;

// ---------------------------------------------------------------------------
// Sinh đường chạy: mọi hàng, kể cả rơm {phanDien} ném, đều đi qua đây nên cùng chịu các luật
//  - không bao giờ chắn kín 3 làn (mỗi hàng tối đa 2 làn có chướng ngại);
//  - khoảng cách hai hàng ≥ tốc độ × 1,0 (guốc mộc × 1,2);
//  - luôn có đường đi: `pathLane` lệch tối đa 1 làn giữa hai hàng liên tiếp và ô ở làn đó luôn trống, thấp hoặc cao.

function spawnRows(s: RunnerState): void {
  const far = s.z + T.spawnAhead;
  while (s.genZ <= far) addRow(s);
}

function addRow(s: RunnerState): void {
  const first = s.nextRowId === 1;
  const boots = s.boots > 0;
  const mult = Math.max(T.gapFactor, boots ? SPEC.gapFactorBoots : SPEC.gapFactor);
  // Tốc độ lúc nhân vật tới hàng này: ước thời gian tới nơi từ quãng đường còn lại (chia cho tốc độ khởi đầu nên ước nhiều hơn thật, tức là tốc độ tính ra không thấp hơn tốc độ thật)
  const toRow = first ? T.firstRowZ : Math.max(0, s.genZ - s.z) + minGap(speedAt(s.time), boots);
  const basis = speedAt(s.time + toRow / SPEC.speed.start);
  // sau hàng có xe chở hàng, cách thêm đúng chiều dài xe (xe chạy trên nóc không chạm hàng kế tiếp)
  const gap = first ? T.firstRowZ : basis * mult * (1 + rand(s) * T.gapJitter) + (s.genEnd - s.genZ);
  const z = first ? T.firstRowZ : s.genZ + gap;

  // làn đi qua được
  const move = first ? 0 : pickWeighted(s, { stay: T.pathMove.stay, left: T.pathMove.left, right: T.pathMove.right });
  let path = s.genPath + (move === 'left' ? -1 : move === 'right' ? 1 : 0);
  if (path < 0 || path > 2) path = s.genPath; // sát mép thì giữ làn
  const pathLane = path as Lane;

  const cells: [Cell | null, Cell | null, Cell | null] = [null, null, null];
  const pathKind = pickWeighted(s, T.pathCell);
  if (pathKind === 'low') cells[pathLane] = cellOf('low', randLowVariant(s), z);
  else if (pathKind === 'high') cells[pathLane] = cellOf('high', 0, z);
  let occupied = pathKind === 'empty' ? 0 : 1;
  for (let l = 0; l < 3; l++) {
    if (l === pathLane || occupied >= 2) continue;
    if (rand(s) >= T.otherLaneChance) continue;
    const kind = pickWeighted(s, T.otherKind);
    cells[l] = cellOf(kind, kind === 'low' ? randLowVariant(s) : kind === 'block' ? (rand(s) < 0.5 ? 0 : 1) : 0, z);
    occupied++;
  }

  const row: Row = { id: s.nextRowId++, z, cells, pathLane, speedBasis: basis, boots, gap };
  placeItems(s, row);
  s.rows.push(row);
  if (s.rowLog) s.rowLog.push(row);
  s.genZ = z;
  s.genPath = pathLane;
  s.genEnd = Math.max(z, ...cells.map((c) => (c ? c.z1 : z)));
}

const randLowVariant = (s: RunnerState): number => (rand(s) < 0.5 ? 0 : 1);

/**
 * Vật nhặt của khoảng giữa hàng trước và hàng này (và trên nóc xe chở hàng của hàng này): một chuỗi trang hoặc tiền đồng ở một làn, và đôi khi một vật đặc biệt.
 * Chỉ đặt giữa hai hàng nên không bao giờ nằm trong chướng ngại.
 */
function placeItems(s: RunnerState, row: Row): void {
  const near = Math.min(row.z, ...row.cells.map((c) => (c ? c.z0 : row.z)));
  const a = s.genEnd + T.itemMargin;
  const b = near - T.itemMargin;
  let chainLane: Lane | null = null;
  if (b - a > T.chain.spacing && rand(s) < T.chain.chance) {
    chainLane = Math.floor(rand(s) * 3) as Lane;
    const cap = Math.floor((b - a) / T.chain.spacing) + 1;
    let n = Math.min(cap, T.chain.min + Math.floor(rand(s) * (T.chain.max - T.chain.min + 1)));
    const kind: PickupKind = rand(s) < T.chain.pageShare ? 'trang' : 'dong';
    // trang đã rơi từ {phanDien} được trừ vào các chuỗi trang: giữ nguyên tổng số trang
    if (kind === 'trang' && s.pageDebt > 0) {
      const cut = Math.min(s.pageDebt, n);
      n -= cut;
      s.pageDebt -= cut;
    }
    const span = (n - 1) * T.chain.spacing;
    const start = a + rand(s) * Math.max(0, b - a - span);
    const group = s.nextGroup++;
    for (let i = 0; i < n; i++) addItem(s, kind, chainLane, start + i * T.chain.spacing, T.itemY, group);
  }
  if (b - a > 2 && rand(s) < T.power.chance) {
    // vật đặc biệt ở làn khác với chuỗi, giữa khoảng
    let lane = Math.floor(rand(s) * 3) as Lane;
    if (lane === chainLane) lane = ((lane + 1) % 3) as Lane;
    addItem(s, pickWeighted(s, { nonla: T.power.nonla, guoc: T.power.guoc, tui: T.power.tui }), lane, a + rand(s) * (b - a), T.itemY, s.nextGroup++);
  }
  // trên nóc xe chở hàng: hàng vật nhặt để thưởng cho ai nhảy lên
  for (let l = 0; l < 3; l++) {
    const c = row.cells[l];
    if (!c || c.kind !== 'truck' || rand(s) >= T.roof.chance) continue;
    const kind: PickupKind = rand(s) < 0.5 ? 'trang' : 'dong';
    const group = s.nextGroup++;
    const room = c.z1 - c.z0 - 1.2;
    const step = T.roof.count > 1 ? room / (T.roof.count - 1) : 0;
    for (let i = 0; i < T.roof.count; i++) addItem(s, kind, l as Lane, c.z0 + 0.6 + i * step, SPEC.roofHeight + T.itemY, group);
  }
}

function addItem(s: RunnerState, kind: PickupKind, lane: Lane, z: number, y: number, group: number): Item {
  const it: Item = { id: s.nextItemId++, landAt: 0, t0: 0, fromX: 0, fromZ: 0, group, kind, lane, x: LANE_X[lane], z, y };
  s.items.push(it);
  return it;
}

/** Mép gần nhất của hàng (nhỏ nhất của z0 các chướng ngại; hàng trống thì z − 0,5). */
const rowNear = (r: Row): number => {
  let n = r.z - 0.5;
  for (const c of r.cells) if (c && c.z0 < n) n = c.z0;
  return n;
};

/**
 * {phanDien} làm rơi 2 đến 4 trang sổ xuống một làn ở phía trước: chọn một khoảng giữa hai hàng chướng ngại (hoặc sau hàng cuối còn nằm trong vùng đã sinh) cách người chơi ≥ `drop.aheadMin`,
 * đủ dài để đặt hết các trang cách nhau `drop.spacing` mà vẫn cách chướng ngại ≥ `drop.margin` (nên nhặt được, không nằm trong chướng ngại hay chỗ rơm), rồi chọn một làn chưa có vật nhặt ở chỗ đó.
 * Trả về chỗ rơi hoặc null nếu chưa có chỗ phù hợp. Số trang rơi cộng vào `pageDebt`.
 */
export function dropPages(s: RunnerState): { lane: Lane; z: number; n: number } | null {
  const D = T.drop;
  const n = D.min + Math.floor(rand(s) * (D.max - D.min + 1));
  const span = (n - 1) * D.spacing;
  const minZ = s.z + Math.max(D.aheadMin, speedAt(s.time) * (D.flightSec + D.leadSec));
  // các khoảng trống giữa hai hàng liên tiếp, chỉ lấy phần ≥ minZ
  const spans: { a: number; b: number }[] = [];
  for (let i = 0; i + 1 < s.rows.length; i++) {
    const a = Math.max(rowEnd(s.rows[i]) + D.margin, minZ);
    const b = rowNear(s.rows[i + 1]) - D.margin;
    if (b - a >= span + 0.2) spans.push({ a, b });
  }
  if (spans.length === 0) return null;
  const pick = spans[Math.floor(rand(s) * spans.length)];
  const z = pick.a + rand(s) * (pick.b - pick.a - span);
  // làn chưa có vật nhặt (kể cả đang rơi) trong đoạn này
  const free: Lane[] = [];
  for (let l = 0; l < 3; l++) {
    let busy = false;
    for (const it of s.items) if (it.lane === l && it.z > z - D.spacing && it.z < z + span + D.spacing) busy = true;
    if (!busy) free.push(l as Lane);
  }
  if (free.length === 0) return null;
  const lane = free[Math.floor(rand(s) * free.length)];
  const group = s.nextGroup++;
  const landAt = s.time + D.flightSec;
  for (let i = 0; i < n; i++) {
    const it = addItem(s, 'trang', lane, z + i * D.spacing, T.itemY, group);
    it.landAt = landAt;
    it.t0 = s.time;
    it.fromX = villainX(s.time);
    it.fromZ = s.z + s.villain.ahead;
  }
  s.pageDebt += n;
  return { lane, z, n };
}

/**
 * {phanDien} ném một đống rơm: rơm rơi xuống hàng đầu tiên cách nhân vật ít nhất `throwAheadMin` mét mà còn chừa ít nhất một làn trống (nên hàng vẫn không kín và đường đi vẫn còn:
 * rơm là chướng ngại thấp, chỉ thêm vào làn đang trống, nên ô ở làn đi qua được không thành chắn làn). Trả về hàng và làn, hoặc null nếu chưa có hàng nào hợp lệ.
 */
export function throwStraw(s: RunnerState): { row: Row; lane: Lane } | null {
  const minZ = s.z + Math.max(T.throwAheadMin, speedAt(s.time) * (T.throwFlightSec + T.throwLeadSec));
  for (const row of s.rows) {
    if (row.z < minZ || occupiedCount(row) > 1) continue;
    const free: Lane[] = [];
    for (let l = 0; l < 3; l++) if (!row.cells[l]) free.push(l as Lane);
    const lane = free[Math.floor(rand(s) * free.length)];
    const c = cellOf('low', 1, row.z);
    c.thrown = true;
    c.landAt = s.time + T.throwFlightSec;
    c.t0 = s.time;
    c.fromX = villainX(s.time);
    c.fromZ = s.z + s.villain.ahead;
    row.cells[lane] = c;
    return { row, lane };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Một bước mô phỏng

/**
 * Chạy `dt` giây. Sửa `s` tại chỗ và trả về chính nó. `dt` lớn thì chia thành các bước nhỏ (`maxSubstep`); lệnh trong `input` chỉ áp dụng ở bước đầu.
 */
export function stepRunner(s: RunnerState, input: RunnerInput, dt: number): RunnerState {
  s.events.length = 0;
  let rest = dt;
  let first = true;
  while (rest > EPS && s.phase !== 'over') {
    const h = Math.min(rest, T.maxSubstep);
    sub(s, first ? input : IDLE, h);
    first = false;
    rest -= h;
  }
  return s;
}

function sub(s: RunnerState, input: RunnerInput, dt: number): void {
  if (s.phase === 'quiz') {
    stepQuiz(s, input, dt);
    return;
  }
  applyInput(s, input);
  if (s.phase === 'run') {
    s.time += dt;
    s.roundTime += dt;
    s.shield = Math.max(0, s.shield - dt);
    s.boots = Math.max(0, s.boots - dt);
    s.magnet = Math.max(0, s.magnet - dt);
  }
  s.invuln = Math.max(0, s.invuln - dt);
  s.slide = Math.max(0, s.slide - dt);
  s.villain.swing = Math.max(0, s.villain.swing - dt);
  s.villain.ahead = SPEC.villainAhead[0] + (SPEC.villainAhead[1] - SPEC.villainAhead[0]) * (0.5 + 0.5 * Math.sin(s.time * 0.6));

  // chạy chậm dần / tăng tốc lại quanh câu hỏi
  if (s.phase === 'slow') s.speedScale = Math.max(0, s.speedScale - dt / T.slowSec);
  else if (s.phase === 'resume') s.speedScale = Math.min(1, s.speedScale + dt / T.resumeSec);

  const speed = speedAt(s.time) * s.speedScale;
  const prevZ = s.z;
  const prevY = s.y;
  s.z += speed * dt;
  s.distance += speed * dt;

  // đổi làn: x chạy dần tới làn đích
  const step = ((LANE_X[1] - LANE_X[0]) / T.laneChangeSec) * dt;
  const dx = LANE_X[s.lane] - s.x;
  s.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;

  stepVertical(s, prevZ, prevY, dt);
  if (s.phase === 'run' && !s.ghost) collide(s, prevZ, prevY);
  else markGhost(s);
  if (s.phase === 'over') return;
  collect(s, prevZ, prevY);

  if (s.phase === 'run') {
    s.villain.throwTimer -= dt;
    if (s.villain.throwTimer <= 0) {
      const hit = throwStraw(s);
      if (hit) {
        s.villain.throwTimer = throwInterval(s);
        s.villain.swing = 0.5;
        s.events.push({ type: 'throw', lane: hit.lane, z: hit.row.z, landAt: s.time + T.throwFlightSec });
      } else {
        s.villain.throwTimer = T.throwRetrySec; // chưa có hàng nào còn chỗ trống: thử lại ngay sau đó, không bỏ lượt
      }
    }
    s.villain.dropTimer -= dt;
    if (s.villain.dropTimer <= 0) {
      const d = dropPages(s);
      if (d) {
        s.villain.dropTimer = dropInterval(s);
        s.villain.swing = 0.5;
        s.events.push({ type: 'drop', lane: d.lane, z: d.z, n: d.n, landAt: s.time + T.drop.flightSec });
      } else {
        s.villain.dropTimer = T.drop.retrySec;
      }
    }
  }

  // dọn và sinh thêm
  while (s.rows.length > 0 && rowEnd(s.rows[0]) < s.z - T.keepBehind) s.rows.shift();
  for (let i = s.items.length - 1; i >= 0; i--) if (s.items[i].z < s.z - T.keepBehind) s.items.splice(i, 1);
  if (s.autoSpawn) spawnRows(s);

  // hết vòng
  if (s.phase === 'run' && s.roundTime >= SPEC.roundSec) {
    s.phase = 'slow';
    s.events.push({ type: 'roundEnd', round: s.round });
  } else if (s.phase === 'slow' && s.speedScale <= 0) {
    enterQuiz(s);
  } else if (s.phase === 'resume' && s.speedScale >= 1) {
    s.phase = 'run';
  }
}

const rowEnd = (r: Row): number => {
  let e = r.z;
  for (const c of r.cells) if (c && c.z1 > e) e = c.z1;
  return e;
};

function applyInput(s: RunnerState, input: RunnerInput): void {
  if (input.move) s.lane = Math.min(2, Math.max(0, s.lane + input.move)) as Lane;
  if (input.jump && s.grounded) {
    s.vy = s.boots > 0 ? SPEC.jump.v0Boots : SPEC.jump.v0;
    s.grounded = false;
    s.onRoof = false;
    s.slide = 0;
    s.events.push({ type: 'jump' });
  }
  if (input.slide && s.grounded && s.slide <= 0) {
    s.slide = SPEC.slide.sec;
    s.events.push({ type: 'slide' });
  }
}

/** Chiều cao thân hiện tại (đứng 1,7; trượt 0,6). */
const bodyHeight = (s: RunnerState): number => (s.slide > 0 && s.grounded ? SPEC.slide.height : T.player.height);

/** Nhân vật (theo x thật) chồng lên làn `l` không? */
const overlapsLane = (s: RunnerState, l: number, c?: Cell): boolean => Math.abs(s.x - LANE_X[l]) < (c ? c.halfWidth : T.laneHalfWidth) + T.player.halfWidth;
/** Đoạn z mà nhân vật quét qua bước này chồng lên [z0, z1] không? */
const overlapsZ = (s: RunnerState, prevZ: number, z0: number, z1: number): boolean => s.z + T.player.halfDepth > z0 && prevZ - T.player.halfDepth < z1;

/** Mặt đỡ bên dưới: nóc xe chở hàng nếu nhân vật đang chồng lên xe và ở ngang hoặc cao hơn nóc từ đầu bước; ngược lại là mặt đất (0). */
function supportLevel(s: RunnerState, prevZ: number, prevY: number): number {
  let level = 0;
  for (const row of s.rows) {
    for (let l = 0; l < 3; l++) {
      const c = row.cells[l];
      if (!c || c.kind !== 'truck' || c.spent) continue;
      if (!overlapsLane(s, l, c) || !overlapsZ(s, prevZ, c.z0, c.z1)) continue;
      if (prevY >= c.top - EPS && c.top > level) level = c.top;
    }
  }
  return level;
}

function stepVertical(s: RunnerState, prevZ: number, prevY: number, dt: number): void {
  const support = supportLevel(s, prevZ, prevY);
  if (s.grounded) {
    if (s.y > support + EPS) {
      // đã chạy khỏi nóc xe: rơi
      s.grounded = false;
      s.vy = 0;
      s.onRoof = false;
    } else {
      s.y = support;
      s.onRoof = support > 0;
      return;
    }
  }
  const g = SPEC.jump.gravity;
  s.y += s.vy * dt - 0.5 * g * dt * dt;
  s.vy -= g * dt;
  if (s.vy <= 0 && s.y <= support + EPS) {
    s.y = support;
    s.vy = 0;
    s.grounded = true;
    s.onRoof = support > 0;
    s.events.push({ type: 'land', roof: support > 0 });
  }
}

/** Va chạm với chướng ngại trong khung hình này. */
function collide(s: RunnerState, prevZ: number, prevY: number): void {
  const lo = Math.min(prevY, s.y);
  const hi = Math.max(prevY, s.y);
  const h = bodyHeight(s);
  for (const row of s.rows) {
    if (row.z - 1 > s.z + T.player.halfDepth + 8 || rowEnd(row) < prevZ - T.player.halfDepth) continue;
    for (let l = 0; l < 3; l++) {
      const c = row.cells[l];
      if (!c || c.spent || (c.thrown && c.landAt > s.time)) continue;
      if (!overlapsLane(s, l, c) || !overlapsZ(s, prevZ, c.z0, c.z1)) continue;
      if (!blocks(c, lo, hi, h, prevY, topAt(s, c, prevZ))) continue;
      c.spent = true;
      if (s.invuln > 0) continue;
      if (s.shield > 0) {
        s.shield = 0;
        s.events.push({ type: 'hit', obstacle: c.kind, shielded: true });
      } else {
        s.hearts = Math.max(0, s.hearts - 1);
        s.invuln = T.hitInvulnSec;
        s.events.push({ type: 'hit', obstacle: c.kind, shielded: false });
        if (s.hearts <= 0) {
          finish(s, 'hearts');
          return;
        }
      }
    }
  }
}

/** Độ cao đỉnh của chướng ngại tại chỗ nhân vật đang chồng lên: xe bò chỉ cao `frontTop` ở đoạn con bò, chạm sang thùng xe phía sau thì cao cả. */
function topAt(s: RunnerState, c: Cell, prevZ: number): number {
  if (c.frontLen <= 0) return c.top;
  const inRear = s.z + T.player.halfDepth > c.z0 + c.frontLen && prevZ - T.player.halfDepth < c.z1;
  return inRear ? c.top : c.frontTop;
}

/**
 * Nhân vật (chân từ `lo` đến `hi` trong bước này, thân cao `h`) có va vào chướng ngại `c` không?
 *  - thấp, chắn làn: va nếu chân còn thấp hơn đỉnh chướng ngại (nhảy cao hơn đỉnh thì không va);
 *  - sào ngang: va nếu thân (từ chân tới đầu) chồng lên khoảng cao của sào; trượt (thân 0,6) hay nhảy cao hơn sào thì không va;
 *  - xe chở hàng: ở ngang hoặc cao hơn nóc từ đầu bước thì không va (đáp lên nóc), thấp hơn thì va vào đầu xe.
 */
function blocks(c: Cell, lo: number, hi: number, h: number, prevY: number, top: number = c.top): boolean {
  switch (c.kind) {
    case 'low':
    case 'block':
      return lo < top - EPS;
    case 'high':
      return hi + h > c.bottom + EPS && lo < c.top - EPS;
    case 'truck':
      return prevY < c.top - EPS;
  }
}

/** Lúc không tính va chạm (chạy chậm, hỏi, test): đánh dấu mọi chướng ngại đang chồng lên là đã qua để không va ngay khi bật lại. */
function markGhost(s: RunnerState): void {
  if (s.phase === 'run' && !s.ghost) return;
  for (const row of s.rows) {
    for (let l = 0; l < 3; l++) {
      const c = row.cells[l];
      if (c && !c.spent && overlapsLane(s, l, c) && s.z + T.player.halfDepth > c.z0 && s.z - T.player.halfDepth < c.z1) c.spent = true;
    }
  }
}

/** Nhặt vật: cùng làn (theo x thật), z quét qua, độ cao thân chạm tâm vật. Túi tiền hút mọi đồng xu trong 6 đơn vị phía trước ở cả 3 làn. */
function collect(s: RunnerState, prevZ: number, prevY: number): void {
  const lo = Math.min(prevY, s.y);
  const hi = Math.max(prevY, s.y) + bodyHeight(s);
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    if (it.landAt > s.time) continue; // trang còn đang rơi
    const magnetized = s.magnet > 0 && it.kind === 'dong' && it.z >= s.z - 0.5 && it.z <= s.z + SPEC.magnetRange;
    let hit = magnetized;
    if (!hit) {
      if (Math.abs(s.x - it.x) >= T.itemHalfWidth + T.player.halfWidth) continue;
      if (!(s.z + T.player.halfDepth + T.itemHalfDepth > it.z && prevZ - T.player.halfDepth - T.itemHalfDepth < it.z)) continue;
      hit = it.y >= lo - 0.3 && it.y <= hi;
    }
    if (!hit) continue;
    s.items.splice(i, 1);
    take(s, it);
  }
}

function take(s: RunnerState, it: Item): void {
  switch (it.kind) {
    case 'trang':
      s.pages += 1;
      break;
    case 'dong':
      s.coins += 1;
      break;
    case 'nonla':
      s.shield = SPEC.powerSec;
      break;
    case 'guoc':
      s.boots = SPEC.powerSec;
      break;
    case 'tui':
      s.magnet = SPEC.powerSec;
      break;
  }
  s.events.push({ type: 'pickup', kind: it.kind, id: it.id, x: it.x, z: it.z });
}

// ---------------------------------------------------------------------------
// Câu hỏi sau mỗi vòng

function enterQuiz(s: RunnerState): void {
  s.phase = 'quiz';
  s.quiz = { round: s.round, timeLeft: SPEC.quizSec, answered: null, timedOut: false };
  // xóa chướng ngại ở ngay phía trước để lúc chạy lại không bị va ngay
  const lo = s.z - 3;
  const hi = s.z + T.clearAhead;
  s.rows = s.rows.filter((r) => !(rowEnd(r) > lo && r.z - 1 < hi));
  s.events.push({ type: 'quiz', round: s.round });
}

function stepQuiz(s: RunnerState, input: RunnerInput, dt: number): void {
  const q = s.quiz;
  if (!q) return;
  if (q.answered === null) {
    if (input.answer !== undefined) {
      answer(s, q, input.answer, false);
    } else {
      q.timeLeft -= dt;
      if (q.timeLeft <= 0) {
        q.timeLeft = 0;
        answer(s, q, false, true);
      }
    }
    return;
  }
  if (input.resume) leaveQuiz(s);
}

/** Đúng: +3 trang và +1 câu đúng. Sai hoặc hết giờ: mất 1 tim. */
function answer(s: RunnerState, q: QuizState, correct: boolean, timedOut: boolean): void {
  q.answered = correct;
  q.timedOut = timedOut;
  if (correct) {
    s.pages += SPEC.quizPages;
    s.correct += 1;
  } else if (!s.ghost) {
    s.hearts = Math.max(0, s.hearts - 1);
  }
  s.events.push({ type: 'answer', correct, timedOut });
}

function leaveQuiz(s: RunnerState): void {
  s.quiz = null;
  if (s.hearts <= 0) {
    finish(s, 'hearts');
  } else if (s.round + 1 >= s.rounds) {
    finish(s, 'done');
  } else {
    s.round += 1;
    s.roundTime = 0;
    s.phase = 'resume';
    s.speedScale = 0;
  }
}

function finish(s: RunnerState, reason: OverReason): void {
  s.phase = 'over';
  s.over = reason;
  s.events.push({ type: 'over', reason });
}
