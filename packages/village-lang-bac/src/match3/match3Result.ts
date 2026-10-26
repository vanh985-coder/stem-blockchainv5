/**
 * Kết quả của một ván màn 11 để đưa vào `MiniGameLevel` (hàm thuần): điểm và từng phần của điểm, tính LẠI từ thống kê và kết quả các vòng của logic (không đọc cảnh), nên đúng cả khi ván kết thúc vì hết lượt ở vòng 3.
 * Điểm tổng phải bằng điểm logic đã cộng dồn (`state.score`): `match3Result.test.ts` kiểm với nhiều ván.
 */
import { match3Score, scoreFromStats, type Match3State } from './match3Logic';

export interface Match3Summary {
  /** Điểm cả ván */
  score: number;
  /** Số lá nổ, số ô cây đã lấp, số cây xong, tổng lượt dư của các cây xong, số lá giả đã gỡ */
  leaves: number;
  slots: number;
  trees: number;
  spare: number;
  fakesGone: number;
  /** Số vòng của ván */
  rounds: number;
}

export function match3Summary(s: Match3State): Match3Summary {
  const trees = s.results.filter((r) => r.done).length;
  const spare = s.results.reduce((sum, r) => sum + (r.done ? r.turnsLeft : 0), 0);
  return { score: match3Score(s), leaves: s.stats.leavesCleared, slots: s.stats.slotsFilled, trees, spare, fakesGone: s.stats.fakesGone, rounds: s.spec.rounds.length };
}

/** Điểm tính lại từ các phần (để đối chiếu với `score`). */
export const partsTotal = (s: Match3State, m: Match3Summary): number => scoreFromStats(s.spec, { leavesCleared: m.leaves, slotsFilled: m.slots }, s.results);
