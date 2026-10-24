/**
 * Logic màn 9 "Chữa đàn gà" (spec 07, mục "Màn 9"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `createMulberry32` nên cùng seed cùng ván. Đơn vị thời gian là GIÂY.
 * Mẫu công khai luôn tính bằng `publicKey` của bài 3 (`@so-chung/core/lessons/bai-3/logic`), không có công thức nào viết lại ở đây. Game chỉ bắt tính XUÔI (từ khuôn riêng ra mẫu công khai), không bao giờ bắt đoán ngược.
 *
 * Các pha của ván:
 *  - `load`: nạp đạn trước mỗi đợt (không tính giờ; `stepChicken` không làm gì). Kéo nhãn vào thuốc bằng `dropLabel`; mọi nhãn đúng đã nạp thì `startWave` mới cho đợt bắt đầu;
 *  - `wave`: đợt gà thường (gà sinh theo nhịp của đợt, chạy từ 0 tới cổng ở 10);
 *  - `boss`: gà trùm chạy xuống (sau đợt 3, khi mọi gà thường đã chữa xong hay tới cổng);
 *  - `ended`: hết ván (`ended` là 'complete' chữa xong trùm, 'hearts' hết tim, 'boss' gà trùm tới cổng).
 *
 * Ba nguồn ngẫu nhiên tách riêng để thao tác của người chơi không làm đổi chuỗi: (1) `loadRng` rút trước ba lần nạp đạn và dãy thẻ của gà trùm ngay khi tạo ván; (2) `rng` chỉ rút lúc SINH gà (lần lượt: làn rồi thẻ, mỗi con hai số
 * ngẫu nhiên dù làn nào còn trống), nên chuỗi thẻ gà thường không phụ thuộc người chơi bắn thế nào. `stepChicken` chia `dt` thành các bước cố định `spec.tick` (1/120 giây).
 */
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CHICKEN_SPEC, type ChickenSpec } from './chickenConfig';

const EPS = 1e-9;

/** Mẫu công khai của các thuốc trong đợt `round` (đếm từ 0), theo thứ tự thuốc: `publicKey` của từng khuôn. */
export function roundPublics(spec: ChickenSpec, round: number): number[] {
  return spec.rounds[round].keys.map((k) => publicKey(k));
}

// ---------------------------------------------------------------------------
// Nạp đạn

/** Nhãn đúng (mẫu công khai của khuôn thuốc), nhãn bẫy (chính số khuôn của một thuốc trong đợt), nhãn của khuôn ngoài đợt. */
export type LabelKind = 'dung' | 'bay' | 'ngoai';

export interface Label {
  id: number;
  value: number;
  kind: LabelKind;
  /** Đã nạp đúng vào thuốc (nhãn nằm trong thuốc, không còn ở khay) */
  placed: boolean;
}

export interface LoadState {
  /** Khay nhãn, theo thứ tự đã xáo */
  labels: Label[];
  /** Nhãn (id) đã nạp vào từng thuốc; null là thuốc còn trống */
  slots: (number | null)[];
  /** Số lần kéo nhãn sai trong đợt này (nhãn bật ra) */
  wrong: number;
}

function shuffleWith<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Khay nhãn của một đợt: mỗi thuốc một nhãn đúng, cộng `spec.decoys` (2) nhãn nhiễu cho cả đợt: một nhãn BẪY bằng số khuôn của một thuốc trong đợt (chọn trong các khuôn không trùng mẫu công khai nào của đợt) và
 * một nhãn là mẫu công khai của một khuôn ngoài đợt (không trùng mẫu công khai của đợt, không trùng nhãn bẫy). Đã xáo thứ tự.
 */
export function makeLoad(spec: ChickenSpec, round: number, rng: () => number): LoadState {
  const keys = spec.rounds[round].keys;
  const publics = roundPublics(spec, round);
  const trapKeys = keys.filter((k) => !publics.includes(k));
  const trap = (trapKeys.length > 0 ? trapKeys : keys)[Math.floor(rng() * (trapKeys.length > 0 ? trapKeys : keys).length)];
  const outsideKeys: number[] = [];
  for (let k = 1; k <= 22; k++) {
    if (keys.includes(k)) continue;
    const v = publicKey(k);
    if (publics.includes(v) || v === trap) continue;
    outsideKeys.push(k);
  }
  const far = publicKey(outsideKeys[Math.floor(rng() * outsideKeys.length)]);
  const raw: { value: number; kind: LabelKind }[] = [...publics.map((value) => ({ value, kind: 'dung' as const })), { value: trap, kind: 'bay' }, { value: far, kind: 'ngoai' }];
  const labels = shuffleWith(raw, rng).map((l, id) => ({ id, value: l.value, kind: l.kind, placed: false }));
  return { labels, slots: keys.map(() => null), wrong: 0 };
}

// ---------------------------------------------------------------------------
// Trạng thái ván

export interface Chicken {
  id: number;
  lane: number;
  /** Vị trí dọc làn: 0 là cuối đường, 10 là cổng làng */
  pos: number;
  /** Tốc độ (đơn vị/giây) */
  speed: number;
  /** Thẻ số trên gà: một mẫu công khai trong bộ của đợt */
  card: number;
  boss: boolean;
  /** Số lần chữa còn cần (gà thường: 1; gà trùm: 3, 2, 1) */
  curesLeft: number;
}

export interface Projectile {
  id: number;
  chickenId: number;
  /** Thuốc (chỉ số trong đợt, từ 0) lúc bắn */
  medicine: number;
  /** Còn bay bấy nhiêu giây */
  left: number;
}

export type ChickenPhase = 'load' | 'wave' | 'boss' | 'ended';
export type EndReason = 'complete' | 'hearts' | 'boss';

export interface ChickenStats {
  shots: number;
  cured: number;
  wrongShots: number;
  /** Phát bắn không tính (gà đã tới cổng, hay đã được chữa bởi phát khác, trước khi viên thuốc tới) */
  voidShots: number;
  leaked: number;
  /** Số đợt nạp đạn không sai lần nào (ăn thưởng) và tổng số lần kéo nhãn sai */
  cleanLoads: number;
  wrongLoads: number;
  bossCures: number;
  reachedBoss: boolean;
  bossCleared: boolean;
}

export interface ChickenState {
  spec: ChickenSpec;
  seed: number;
  /** Số ngẫu nhiên khi sinh gà (làn, thẻ) */
  rng: () => number;
  /** Số bước cố định đã chạy trong lúc đợt gà chạy */
  ticks: number;
  acc: number;
  phase: ChickenPhase;
  ended: EndReason | null;
  /** Đợt hiện tại (0 đến 2); pha `boss` ở đợt cuối */
  round: number;
  hearts: number;
  score: number;
  chickens: Chicken[];
  projectiles: Projectile[];
  /** Thuốc đang chọn (chỉ số trong đợt; mặc định thuốc 1 là 0) */
  selected: number;
  /** Còn bấy nhiêu giây nữa mới bắn được phát kế */
  cooldown: number;
  /** Số gà thường đã sinh trong đợt, và còn bấy nhiêu giây tới con kế */
  spawned: number;
  spawnIn: number;
  /** Ba lần nạp đạn (rút sẵn lúc tạo ván) và đợt nạp đang mở/đã nạp: `loads[round]` */
  loads: LoadState[];
  /** Dãy thẻ của gà trùm (rút sẵn): thẻ thứ i dùng sau i lần chữa đúng; hai thẻ liền nhau khác nhau, đều thuộc bộ mẫu công khai của đợt 3 */
  bossCards: number[];
  nextId: number;
  stats: ChickenStats;
}

export type ChickenEvent =
  | { type: 'spawn'; chicken: Chicken }
  | { type: 'shot'; projectile: Projectile }
  | { type: 'cure'; chicken: Chicken; points: number; bossCard?: number }
  | { type: 'wrong'; chicken: Chicken; points: number }
  | { type: 'void'; projectile: Projectile; why: 'gone' }
  | { type: 'leak'; chicken: Chicken; hearts: number }
  | { type: 'waveEnd'; round: number }
  | { type: 'bossStart'; chicken: Chicken }
  | { type: 'bossCleared'; points: number }
  | { type: 'end'; reason: EndReason };

/** Thời gian chạy từ 0 tới cổng và tốc độ tương ứng. */
export function speedOf(spec: ChickenSpec, runSeconds: number): number {
  return spec.laneLength / runSeconds;
}

/** Pha hiện tại (đọc qua hàm để TypeScript không thu hẹp kiểu sau vòng lặp, vì pha đổi bên trong `stepOnce`). */
export const phaseOf = (s: ChickenState): ChickenPhase => s.phase;

export function createChickenGame(seed: number, spec: ChickenSpec = CHICKEN_SPEC): ChickenState {
  const loadRng = createMulberry32((seed ^ 0x9e3779b1) >>> 0);
  const loads = spec.rounds.map((_, r) => makeLoad(spec, r, loadRng));
  const last = spec.rounds.length - 1;
  const lastPublics = roundPublics(spec, last);
  const bossCards: number[] = [];
  for (let i = 0; i < spec.boss.cures; i++) {
    const pool = lastPublics.filter((v) => i === 0 || v !== bossCards[i - 1]);
    bossCards.push(pool[Math.floor(loadRng() * pool.length)]);
  }
  return {
    spec,
    seed,
    rng: createMulberry32(seed),
    ticks: 0,
    acc: 0,
    phase: 'load',
    ended: null,
    round: 0,
    hearts: spec.hearts,
    score: 0,
    chickens: [],
    projectiles: [],
    selected: 0,
    cooldown: 0,
    spawned: 0,
    spawnIn: 0,
    loads,
    bossCards,
    nextId: 1,
    stats: { shots: 0, cured: 0, wrongShots: 0, voidShots: 0, leaked: 0, cleanLoads: 0, wrongLoads: 0, bossCures: 0, reachedBoss: false, bossCleared: false },
  };
}

// ---------------------------------------------------------------------------
// Nạp đạn: thao tác của học sinh

export type DropResult = { ok: true; label: Label } | { ok: false; why: 'phase' | 'unknown' | 'placed' | 'bounce'; label?: Label };

/**
 * Kéo nhãn `labelId` vào thuốc `medicine` (chỉ số từ 0). Đúng (nhãn bằng `publicKey` của khuôn thuốc đó): nhãn nằm lại trong thuốc. Sai (kể cả nhãn nhiễu): nhãn bật ra, đợt đó mất thưởng nạp.
 * Chỉ nhận ở pha nạp đạn.
 */
export function dropLabel(s: ChickenState, labelId: number, medicine: number): DropResult {
  if (s.phase !== 'load') return { ok: false, why: 'phase' };
  const load = s.loads[s.round];
  const label = load.labels.find((l) => l.id === labelId);
  const keys = s.spec.rounds[s.round].keys;
  if (!label || !(medicine >= 0 && medicine < keys.length)) return { ok: false, why: 'unknown' };
  if (label.placed) return { ok: false, why: 'placed', label };
  if (load.slots[medicine] === null && label.kind === 'dung' && publicKey(keys[medicine]) === label.value) {
    label.placed = true;
    load.slots[medicine] = label.id;
    return { ok: true, label };
  }
  load.wrong++;
  s.stats.wrongLoads++;
  return { ok: false, why: 'bounce', label };
}

/** Mọi thuốc của đợt đang nạp đã có nhãn đúng chưa. */
export function loadComplete(s: ChickenState): boolean {
  return s.loads[s.round].slots.every((x) => x !== null);
}

/**
 * Bắt đầu đợt gà (pha nạp đạn xong): chỉ khi mọi nhãn đúng đã nạp. Đợt nạp không sai lần nào thì +30 điểm. Chọn lại thuốc 1, gà đầu tiên sinh sau một nhịp sinh. Trả về true nếu bắt đầu được.
 */
export function startWave(s: ChickenState): boolean {
  if (s.phase !== 'load' || !loadComplete(s)) return false;
  const round = s.spec.rounds[s.round];
  if (s.loads[s.round].wrong === 0) {
    s.score += s.spec.points.cleanLoad;
    s.stats.cleanLoads++;
  }
  s.phase = 'wave';
  s.selected = 0;
  s.cooldown = 0;
  s.spawned = 0;
  s.spawnIn = round.spawnEvery * s.spec.firstSpawnBeats;
  s.acc = 0;
  return true;
}

// ---------------------------------------------------------------------------
// Một bước cố định

function endGame(s: ChickenState, reason: EndReason, out: ChickenEvent[]): void {
  s.phase = 'ended';
  s.ended = reason;
  s.projectiles = [];
  out.push({ type: 'end', reason });
}

/** Làn có thể sinh gà: làn nào có con gần cuối đường nhất còn dưới `spawnGuard` thì bị loại. */
function spawnLaneChoices(s: ChickenState): number[] {
  const ok: number[] = [];
  for (let lane = 0; lane < s.spec.lanes; lane++) {
    let nearest = Infinity;
    for (const c of s.chickens) if (c.lane === lane && c.pos < nearest) nearest = c.pos;
    if (nearest >= s.spec.spawnGuard) ok.push(lane);
  }
  return ok;
}

function stepOnce(s: ChickenState, out: ChickenEvent[]): void {
  const h = s.spec.tick;
  s.ticks++;
  if (s.cooldown > 0) s.cooldown = s.cooldown <= h + EPS ? 0 : s.cooldown - h;

  // gà chạy; tới cổng thì mất tim (xử lý theo thứ tự id: cùng seed cùng thứ tự sự kiện)
  for (const c of s.chickens) c.pos += c.speed * h;
  const arrived = s.chickens.filter((c) => c.pos >= s.spec.laneLength - EPS).sort((a, b) => a.id - b.id);
  for (const c of arrived) {
    s.chickens.splice(s.chickens.indexOf(c), 1);
    s.hearts--;
    out.push({ type: 'leak', chicken: c, hearts: s.hearts });
    if (c.boss) return endGame(s, 'boss', out);
    s.stats.leaked++;
    if (s.hearts <= 0) return endGame(s, 'hearts', out);
  }

  // viên thuốc bay: tới nơi thì xét kết quả (gà đã đi khỏi làn trước đó thì phát bắn không tính)
  const landing: Projectile[] = [];
  for (const p of s.projectiles) {
    p.left -= h;
    if (p.left <= EPS) landing.push(p);
  }
  if (landing.length > 0) {
    s.projectiles = s.projectiles.filter((p) => !landing.includes(p));
    for (const p of landing.sort((a, b) => a.id - b.id)) {
      const c = s.chickens.find((x) => x.id === p.chickenId);
      if (!c) {
        s.stats.voidShots++;
        out.push({ type: 'void', projectile: p, why: 'gone' });
        continue;
      }
      const cured = publicKey(s.spec.rounds[s.round].keys[p.medicine]) === c.card;
      if (!cured) {
        s.score += s.spec.points.wrong;
        s.stats.wrongShots++;
        out.push({ type: 'wrong', chicken: c, points: s.spec.points.wrong });
        continue;
      }
      c.curesLeft--;
      if (!c.boss) {
        s.score += s.spec.points.cure;
        s.stats.cured++;
        s.chickens.splice(s.chickens.indexOf(c), 1);
        out.push({ type: 'cure', chicken: c, points: s.spec.points.cure });
        continue;
      }
      // gà trùm: mỗi lần chữa đúng không có điểm riêng (điểm tối đa 750 chỉ tính 30 gà thường), chữa đủ spec.boss.cures lần thì +60
      s.stats.bossCures++;
      if (c.curesLeft > 0) {
        c.card = s.bossCards[s.spec.boss.cures - c.curesLeft];
        out.push({ type: 'cure', chicken: c, points: 0, bossCard: c.card });
        continue;
      }
      s.chickens.splice(s.chickens.indexOf(c), 1);
      out.push({ type: 'cure', chicken: c, points: 0 });
      s.score += s.spec.points.boss;
      s.stats.bossCleared = true;
      out.push({ type: 'bossCleared', points: s.spec.points.boss });
      return endGame(s, 'complete', out);
    }
  }

  if (s.phase === 'wave') {
    const round = s.spec.rounds[s.round];
    // sinh gà theo nhịp của đợt (làn không còn chỗ thì thử lại bước sau, không rút số ngẫu nhiên)
    if (s.spawned < round.chickens) {
      s.spawnIn -= h;
      if (s.spawnIn <= EPS) {
        const lanes = spawnLaneChoices(s);
        if (lanes.length > 0) {
          const publics = roundPublics(s.spec, s.round);
          const lane = lanes[Math.floor(s.rng() * lanes.length)];
          const card = publics[Math.floor(s.rng() * publics.length)];
          const c: Chicken = { id: s.nextId++, lane, pos: 0, speed: speedOf(s.spec, round.runSeconds), card, boss: false, curesLeft: 1 };
          s.chickens.push(c);
          s.spawned++;
          out.push({ type: 'spawn', chicken: c });
          s.spawnIn = round.spawnEvery + Math.max(s.spawnIn, -h);
        }
      }
    }
    // hết đợt: đã sinh đủ và không còn gà thường nào trên đường
    if (s.spawned >= round.chickens && s.chickens.length === 0) {
      out.push({ type: 'waveEnd', round: s.round });
      for (const p of s.projectiles) {
        // viên thuốc còn bay khi đợt kết thúc (con gà nó nhắm đã tới cổng): không tính
        s.stats.voidShots++;
        out.push({ type: 'void', projectile: p, why: 'gone' });
      }
      s.projectiles = [];
      if (s.round + 1 < s.spec.rounds.length) {
        s.round++;
        s.phase = 'load';
        s.projectiles = [];
      } else {
        const b: Chicken = { id: s.nextId++, lane: s.spec.boss.lane, pos: 0, speed: speedOf(s.spec, s.spec.boss.runSeconds), card: s.bossCards[0], boss: true, curesLeft: s.spec.boss.cures };
        s.chickens.push(b);
        s.phase = 'boss';
        s.stats.reachedBoss = true;
        out.push({ type: 'bossStart', chicken: b });
      }
    }
  }
}

/**
 * Chạy `dt` GIÂY của ván (chia thành các bước cố định `spec.tick`); trả về các sự kiện theo thứ tự. Ở pha nạp đạn (không tính giờ) hay khi đã hết ván thì không có gì chạy.
 */
export function stepChicken(s: ChickenState, dt: number): ChickenEvent[] {
  const out: ChickenEvent[] = [];
  if (!(dt > 0)) return out;
  if (s.phase === 'load' || s.phase === 'ended') return out;
  s.acc += dt;
  while (s.acc >= s.spec.tick - EPS && (s.phase === 'wave' || s.phase === 'boss')) {
    s.acc = Math.max(0, s.acc - s.spec.tick);
    stepOnce(s, out);
  }
  if (phaseOf(s) === 'load' || phaseOf(s) === 'ended') s.acc = 0;
  return out;
}

/** Bước thời gian khi có thể đang tạm dừng (nút "?", tab ẩn): `paused` thì không có gì đổi (gà, viên thuốc, đồng hồ sinh, thời gian chờ giữa hai phát đứng yên). */
export function tickChicken(s: ChickenState, dt: number, paused: boolean): ChickenEvent[] {
  return paused ? [] : stepChicken(s, dt);
}

// ---------------------------------------------------------------------------
// Bắn: thao tác của học sinh

/** Chọn thuốc (chỉ số trong đợt, từ 0; phím 1 đến 4 là 0 đến 3). Chỉ nhận khi đợt gà đang chạy. */
export function selectMedicine(s: ChickenState, medicine: number): boolean {
  if ((s.phase !== 'wave' && s.phase !== 'boss') || !(medicine >= 0 && medicine < s.spec.rounds[s.round].keys.length)) return false;
  s.selected = medicine;
  return true;
}

export type ShotResult = { ok: true; projectile: Projectile } | { ok: false; why: 'phase' | 'cooldown' | 'target' };

/**
 * Bắn thuốc đang chọn vào con gà `chickenId`: viên thuốc LUÔN trúng con đã chọn, bay `spec.flight` (0,4) giây rồi xét kết quả (xem `stepChicken`). Giữa hai phát cách nhau ít nhất `spec.cooldown` (0,35) giây.
 * Không bắn được khi chưa tới đợt gà, hết ván, đang chờ giữa hai phát, hay gà không còn trên đường.
 */
export function shoot(s: ChickenState, chickenId: number): ShotResult {
  if (s.phase !== 'wave' && s.phase !== 'boss') return { ok: false, why: 'phase' };
  if (s.cooldown > EPS) return { ok: false, why: 'cooldown' };
  if (!s.chickens.some((c) => c.id === chickenId)) return { ok: false, why: 'target' };
  const p: Projectile = { id: s.nextId++, chickenId, medicine: s.selected, left: s.spec.flight };
  s.projectiles.push(p);
  s.cooldown = s.spec.cooldown;
  s.stats.shots++;
  return { ok: true, projectile: p };
}

/** Điểm cả ván (không âm): gà chữa được × 20 − 5 × phát sai + 30 × số đợt nạp không sai + 60 nếu chữa xong trùm. */
export function chickenScore(s: ChickenState): number {
  return Math.max(0, s.score);
}

/** Điểm tính lại từ thống kê, đúng công thức của spec (để kiểm `score` cộng dồn). */
export function scoreFromStats(spec: ChickenSpec, st: ChickenStats): number {
  return st.cured * spec.points.cure + st.wrongShots * spec.points.wrong + st.cleanLoads * spec.points.cleanLoad + (st.bossCleared ? spec.points.boss : 0);
}
