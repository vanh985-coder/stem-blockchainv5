import { GAME_CONFIG } from '../../config/gameConfig';

// ==========================================
// MỨC DỄ — "Sức mạnh, không phải số lượng"
// ==========================================

export function hackerPercent(powers: readonly number[], hackerIds: readonly number[]): number {
  const total = powers.reduce((sum, p) => sum + p, 0);
  if (total === 0) return 0;
  const hackerSum = hackerIds.reduce((sum, id) => sum + (powers[id] ?? 0), 0);
  return Math.round((hackerSum / total) * 100);
}

export function minNodesToWin(powers: readonly number[], winPercent = 51): number {
  const sorted = [...powers].sort((a, b) => b - a);
  let sum = 0;
  let count = 0;
  for (const p of sorted) {
    sum += p;
    count++;
    if (sum >= winPercent) return count;
  }
  return count;
}

export function maxPercentWithK(powers: readonly number[], k: number): number {
  const sorted = [...powers].sort((a, b) => b - a);
  return sorted.slice(0, k).reduce((s, p) => s + p, 0);
}

export function minPercentWithK(powers: readonly number[], k: number): number {
  const sorted = [...powers].sort((a, b) => a - b);
  return sorted.slice(0, k).reduce((s, p) => s + p, 0);
}

export function checkEasyTask(
  task: 1 | 2 | 3,
  powers: readonly number[],
  hackerIds: readonly number[]
): { ok: boolean; reason: string } {
  const percent = hackerPercent(powers, hackerIds);
  const count = hackerIds.length;

  if (task === 1) {
    if (percent >= 51) {
      return { ok: true, reason: '' };
    }
    return {
      ok: false,
      reason: `Hacker mới có ${percent}%, chưa vượt quá một nửa.`,
    };
  }

  if (task === 2) {
    if (percent >= 51 && count === 3) {
      return { ok: true, reason: '' };
    }
    if (percent >= 51 && count > 3) {
      return { ok: false, reason: 'Thắng rồi, nhưng thử ít node hơn xem!' };
    }
    if (count === 2) {
      return {
        ok: false,
        reason: 'Hai node mạnh nhất cũng chỉ được 43%, chưa đủ.',
      };
    }
    if (count === 3 && percent < 51) {
      return {
        ok: false,
        reason: 'Chưa đủ 51%, thử đổi sang node mạnh hơn.',
      };
    }
    return {
      ok: false,
      reason: `Hacker mới có ${percent}%, chưa vượt quá một nửa.`,
    };
  }

  // task === 3
  if (count !== 7) {
    return { ok: false, reason: 'Hacker cần giữ đúng 7 node.' };
  }
  if (percent >= 51) {
    return {
      ok: false,
      reason: '7 node này mạnh quá, đổi node mạnh về phía Người bảo vệ.',
    };
  }
  return { ok: true, reason: '' };
}

// ==========================================
// MỨC TRUNG BÌNH — "Tấn công, hậu quả, phòng thủ"
// ==========================================

export const MEDIUM_ATTACKS = [
  {
    id: 'A',
    title: 'Chi tiêu hai lần',
    desc: 'Tí trả 10 xu cho cửa hàng, rồi viết lại lịch sử để 10 xu đó vẫn là của Tí.',
  },
  {
    id: 'B',
    title: 'Chặn giao dịch',
    desc: 'Tí cố tình không đưa giao dịch của An vào trang mới.',
  },
  {
    id: 'C',
    title: 'Viết lại lịch sử gần đây',
    desc: 'Tí tạo một nhánh sổ khác dài hơn để thay thế vài trang gần nhất.',
  },
] as const;

export const MEDIUM_CONSEQUENCES = [
  {
    id: '1',
    text: 'Cửa hàng đã giao hàng, nhưng cuối cùng không thực sự nhận được tiền.',
  },
  {
    id: '2',
    text: 'Giao dịch của An bị treo, chậm, hoặc không được xác nhận.',
  },
  {
    id: '3',
    text: 'Một số giao dịch gần đây bị đảo ngược, như chưa từng xảy ra.',
  },
] as const;

export const MEDIUM_DEFENSES = [
  {
    id: 'D',
    title: 'Chờ thêm xác nhận',
    desc: 'Đợi thêm nhiều trang được ghi phía sau rồi mới coi giao dịch là chắc chắn.',
  },
  {
    id: 'E',
    title: 'Phân tán quyền kiểm soát',
    desc: 'Không để một người hay một nhóm nhỏ nắm phần lớn sức mạnh của mạng.',
  },
  {
    id: 'F',
    title: 'Xác nhận & Finality',
    desc: 'Khi giao dịch đã đạt trạng thái cuối (finality), rất khó hoặc không thể đảo ngược.',
  },
] as const;

export const MEDIUM_PAIRS_A: Record<string, string> = {
  A: '1',
  B: '2',
  C: '3',
};

export const MEDIUM_PAIRS_B: Record<string, string> = {
  A: 'D',
  B: 'E',
  C: 'F',
};

// ==========================================
// MỨC KHÓ — Cuộc chiến 10 node trên vòng tròn
// ==========================================

export type Owner = 'H' | 'D';
export type AttackMove = [number, number]; // a ≤ b, có thể a === b (dồn)
export type DefenseMove =
  | { kind: 'protect'; shields: [number, number] } // a ≤ b, có thể trùng (dồn)
  | { kind: 'recover'; node: number };

/**
 * Các node 'D' kề ít nhất 1 node 'H', xếp tăng dần
 */
export function frontier(owner: Owner[] | readonly Owner[]): number[] {
  const n = owner.length, reach = GAME_CONFIG.lesson5.attackReach;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (owner[i] !== 'D') continue;
    for (let d = 1; d <= reach; d++) {
      if (owner[(i + d) % n] === 'H' || owner[(i - d + n) % n] === 'H') { out.push(i); break; }
    }
  }
  return out;
}

/**
 * Các node 'H' kề ít nhất 1 node 'D', xếp tăng dần
 */
export function recoverable(owner: readonly Owner[]): number[] {
  const result: number[] = [];
  const n = owner.length;
  for (let i = 0; i < n; i++) {
    if (owner[i] === 'H') {
      const left = (i + n - 1) % n;
      const right = (i + 1) % n;
      if (owner[left] === 'D' || owner[right] === 'D') {
        result.push(i);
      }
    }
  }
  return result;
}

/**
 * Mọi cặp không thứ tự từ frontier, kể cả cặp trùng (a <= b)
 */
export function legalAttacks(owner: readonly Owner[]): AttackMove[] {
  const front = frontier(owner);
  const moves: AttackMove[] = [];
  for (let i = 0; i < front.length; i++) {
    for (let j = i; j < front.length; j++) {
      moves.push([front[i], front[j]]);
    }
  }
  return moves;
}

/**
 * Mọi cặp khiên từ frontier (a <= b) + mỗi node recoverable 1 nước recover
 */
export function legalDefenses(owner: readonly Owner[]): DefenseMove[] {
  const front = frontier(owner);
  const rec = recoverable(owner);
  const moves: DefenseMove[] = [];

  for (let i = 0; i < front.length; i++) {
    for (let j = i; j < front.length; j++) {
      moves.push({ kind: 'protect', shields: [front[i], front[j]] });
    }
  }

  for (const node of rec) {
    moves.push({ kind: 'recover', node });
  }

  return moves;
}

/**
 * Đếm số node của Hacker
 */
export function countH(owner: readonly Owner[]): number {
  let count = 0;
  for (const o of owner) {
    if (o === 'H') count++;
  }
  return count;
}

/**
 * Phân giải nước đi ở mỗi round:
 * - Đếm ⚔️ và 🛡️ theo từng node
 * - Node nào ⚔️ > 🛡️ thì thành 'H'
 * - Nếu recover thì node đó thành 'D'
 * - Hàm thuần, KHÔNG sửa mảng vào
 */
export function resolve(
  owner: readonly Owner[],
  attack: AttackMove,
  defense: DefenseMove
): Owner[] {
  const n = owner.length;
  const attacks = Array(n).fill(0);
  const shields = Array(n).fill(0);

  attacks[attack[0]]++;
  attacks[attack[1]]++;

  if (defense.kind === 'protect') {
    shields[defense.shields[0]]++;
    shields[defense.shields[1]]++;
  }

  const nextOwner: Owner[] = [...owner];

  for (let i = 0; i < n; i++) {
    if (attacks[i] > shields[i]) {
      nextOwner[i] = 'H';
    }
  }

  if (defense.kind === 'recover') {
    nextOwner[defense.node] = 'D';
  }

  return nextOwner;
}

export function attackKind(move: AttackMove): 'split' | 'stack' {
  return move[0] === move[1] ? 'stack' : 'split';
}

export function defenseKind(move: DefenseMove): 'spread' | 'stack' | 'recover' {
  if (move.kind === 'recover') return 'recover';
  return move.shields[0] === move.shields[1] ? 'stack' : 'spread';
}

// tính bằng quy hoạch động + LP cho luật tầm 2 bước, có Phục hồi, 10 node, thắng ở 6 node
export const W: Record<number, Record<number, number>> = {
  1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.669, 6: 0.915, 7: 0.981 },
  2: { 1: 0, 2: 0, 3: 0, 4: 0.692, 5: 0.932, 6: 0.987, 7: 0.998 },
  3: { 1: 0, 2: 0, 3: 0.724, 4: 0.945, 5: 0.991, 6: 0.999, 7: 1 },
  4: { 1: 0, 2: 0.776, 3: 0.962, 4: 0.994, 5: 0.999, 6: 1, 7: 1 },
  5: { 1: 0.857, 2: 0.981, 3: 0.998, 4: 1, 5: 1, 6: 1, 7: 1 },
};

/**
 * Hàm đánh giá thế cờ
 * a = countH(owner)
 * - a ≥ 6 → 1.1
 * - a = 0 → −0.1
 * - r = 0 → 0.01·a
 * - còn lại → W[a][min(r,7)] + 0.01·a
 */
export function evaluate(owner: readonly Owner[], r: number): number {
  const a = countH(owner);
  if (a >= 6) return 1.1;
  if (a === 0) return -0.1;
  if (r <= 0) return 0.01 * a;
  const col = Math.min(Math.max(1, r), 7);
  const wVal = W[a]?.[col] ?? 0;
  return wVal + 0.01 * a;
}

export function hardStars(input: {
  studentRole: 'H' | 'D';
  winner: 'H' | 'D';
  roundsPlayed: number;
  maxHackerNodes: number;
}): 1 | 2 | 3 {
  if (input.studentRole === input.winner) {
    return 3;
  }
  if (
    input.studentRole === 'D' &&
    input.winner === 'H' &&
    input.roundsPlayed === GAME_CONFIG.lesson5.hardMaxRounds
  ) {
    return 2;
  }
  if (input.studentRole === 'H' && input.winner === 'D' && input.maxHackerNodes >= 5) {
    return 2;
  }
  return 1;
}

export function addPiece(selected: number[], node: number, legal: number[]): number[] {
  if (!legal.includes(node)) return selected;
  if (selected.length >= 2) return selected;
  return [...selected, node].sort((a, b) => a - b);
}

export function removePieceAt(selected: number[], idx: number): number[] {
  return selected.filter((_, i) => i !== idx);
}

