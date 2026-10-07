import { randInt, shuffle, chooseOne } from '../../lib/rng';
import { GAME_CONFIG } from '../../config/gameConfig';

export interface EasyTx {
  id: 'T1' | 'T2' | 'T3' | 'T4';
  name: string;
  character: 'an' | 'binh' | 'chi' | 'dung';
  item: string;
  value: number;
}

export interface HardTx {
  id: string; // 'T1'..'T8'
  name: string;
  item: string;
  value: number;
}

export interface CellCoord {
  level: number;
  index: number;
}

/**
 * Công thức ghép hai giá trị giao dịch: Tab = Ta * 10 + Tb
 */
export function combine(a: number, b: number): number {
  return a * 10 + b;
}

/**
 * Xây dựng cây Merkle từ mảng lá (số lá là lũy thừa của 2).
 * Trả về mảng các tầng từ lá lên gốc: [[lá...], [tầng 1...], ... [gốc]].
 * Hàm thuần, không làm thay đổi mảng leaves đầu vào.
 */
export function buildTree(leaves: readonly number[] | number[]): number[][] {
  if (leaves.length === 0) return [];
  const tree: number[][] = [[...leaves]];

  let currentLevel = [...leaves];
  while (currentLevel.length > 1) {
    const nextLevel: number[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      nextLevel.push(combine(currentLevel[i], currentLevel[i + 1]));
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return tree;
}

/**
 * Đường đi từ một nút lá lên nút gốc của cây Merkle.
 * @param leafIndex Chỉ số của nút lá (0-indexed)
 * @param levels Số tầng trên lá (ví dụ: cây 8 lá có levels = 3, đi qua các tầng 0, 1, 2, 3)
 */
export function pathToRoot(leafIndex: number, levels: number): CellCoord[] {
  const path: CellCoord[] = [];
  let curIndex = leafIndex;
  for (let lvl = 0; lvl <= levels; lvl++) {
    path.push({ level: lvl, index: curIndex });
    curIndex = Math.floor(curIndex / 2);
  }
  return path;
}

export const DEFAULT_EASY_TXS: EasyTx[] = [
  { id: 'T1', name: 'An', character: 'an', item: 'quyển sách', value: 3 },
  { id: 'T2', name: 'Bình', character: 'binh', item: 'cây bút', value: 7 },
  { id: 'T3', name: 'Chi', character: 'chi', item: 'vở', value: 5 },
  { id: 'T4', name: 'Dũng', character: 'dung', item: 'thước', value: 2 },
];

/**
 * Sinh đề cho Mức Dễ: 4 giao dịch và 5 câu hỏi nhanh theo đúng thứ tự.
 */
export function generateEasy(
  rng: () => number = Math.random,
  useDefault: boolean = false
): {
  txs: EasyTx[];
  questions: [string, string][];
} {
  const cfg = GAME_CONFIG.lesson4;
  const questions: [string, string][] = [
    ['T1', 'T2'],
    ['T3', 'T4'],
    ['T2', 'T3'],
    ['T2', 'T1'],
    ['T4', 'T1'],
  ];

  if (useDefault) {
    return {
      txs: DEFAULT_EASY_TXS.map((t) => ({ ...t })),
      questions,
    };
  }

  const txs: EasyTx[] = DEFAULT_EASY_TXS.map((t) => ({
    ...t,
    value: randInt(cfg.leafMin, cfg.leafMax, rng),
  }));

  return { txs, questions };
}

/**
 * Sinh dữ liệu cho Mức Trung bình:
 * - 4 giao dịch mới với giá trị ngẫu nhiên 1–9.
 * - Thông tin nút bị Cáo Tí sửa đổi ở Phần C.
 */
export function generateMedium(rng: () => number = Math.random): {
  txs: EasyTx[];
  tamperedLeafIndex: number;
  tamperedNewValue: number;
} {
  const cfg = GAME_CONFIG.lesson4;
  const txs: EasyTx[] = DEFAULT_EASY_TXS.map((t) => ({
    ...t,
    value: randInt(cfg.leafMin, cfg.leafMax, rng),
  }));

  // Mặc định chọn lá thứ 2 (T3) hoặc ngẫu nhiên
  const tamperedLeafIndex = 2; // T3
  const origVal = txs[tamperedLeafIndex].value;
  let tamperedNewValue = origVal === 9 ? 8 : origVal + 1;
  if (tamperedNewValue === origVal) {
    tamperedNewValue = origVal > 1 ? origVal - 1 : origVal + 2;
  }

  return { txs, tamperedLeafIndex, tamperedNewValue };
}

export const HARD_PEOPLE: Array<{ name: string; item: string }> = [
  { name: 'An', item: 'quyển sách' },
  { name: 'Bình', item: 'cây bút' },
  { name: 'Chi', item: 'vở ô ly' },
  { name: 'Dũng', item: 'thước kẻ' },
  { name: 'Giang', item: 'ba lô' },
  { name: 'Hoa', item: 'compa' },
  { name: 'Khang', item: 'hộp bút' },
  { name: 'Linh', item: 'bảng con' },
];

export interface HardChallenge {
  txs: HardTx[];
  tree: number[][];
  hidden: CellCoord[];
  tray: number[];
  distractors: number[];
}

/** Đề mẫu chuẩn để test và fallback */
export const SAMPLE_HARD_CHALLENGE: HardChallenge = (() => {
  const leaves = [3, 7, 5, 2, 6, 1, 4, 8];
  const txs: HardTx[] = HARD_PEOPLE.map((p, i) => ({
    id: `T${i + 1}`,
    name: p.name,
    item: p.item,
    value: leaves[i],
  }));
  const tree = buildTree(leaves);
  // Ô ẩn: T6 (level 0, index 5), T34 (level 1, index 1), T78 (level 1, index 3),
  // T5678 (level 2, index 1), gốc (level 3, index 0), T12 (level 1, index 0)
  const hidden: CellCoord[] = [
    { level: 0, index: 5 },
    { level: 1, index: 1 },
    { level: 1, index: 3 },
    { level: 2, index: 1 },
    { level: 3, index: 0 },
    { level: 1, index: 0 },
  ];
  const distractors = [25, 84]; // T43 = 25 (ngược T34=52), T87 = 84 (ngược T78=48)
  const hiddenValues = hidden.map((h) => tree[h.level][h.index]);
  const tray = [...hiddenValues, ...distractors];

  return {
    txs,
    tree,
    hidden,
    tray,
    distractors,
  };
})();

/**
 * Sinh đề cho Mức Khó:
 * - 8 giao dịch giá trị ngẫu nhiên 1–9.
 * - Ẩn đúng 6 ô: 1 lá + 2 ô tầng 1 + 1 ô tầng 2 + gốc + 1 ô bất kỳ trong số còn lại.
 * - 2 mảnh nhiễu là kết quả ghép ngược của ô ẩn nội tại.
 * - Khay có đúng 8 giá trị và đôi một khác nhau.
 * - Nếu bị trùng thử lại tối đa 50 lần, sau đó trả về đề mẫu.
 */
export function generateHard(rng: () => number = Math.random): HardChallenge {
  const cfg = GAME_CONFIG.lesson4;
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 1. Sinh 8 lá ngẫu nhiên 1-9
    const leaves: number[] = [];
    for (let i = 0; i < 8; i++) {
      leaves.push(randInt(cfg.leafMin, cfg.leafMax, rng));
    }

    const tree = buildTree(leaves);

    // 2. Chọn 6 ô bị ẩn theo đúng quy tắc:
    // - 1 lá (level 0, chọn 1 trong 8)
    // - 2 ô tầng 1 (level 1, chọn 2 trong 4)
    // - 1 ô tầng 2 (level 2, chọn 1 trong 2)
    // - gốc (level 3, index 0)
    // - 1 ô bất kỳ còn lại
    const leafIdx = randInt(0, 7, rng);
    const hidden: CellCoord[] = [{ level: 0, index: leafIdx }];

    // 2 ô tầng 1
    const l1Candidates = shuffle([0, 1, 2, 3], rng);
    hidden.push({ level: 1, index: l1Candidates[0] });
    hidden.push({ level: 1, index: l1Candidates[1] });

    // 1 ô tầng 2
    const l2Idx = randInt(0, 1, rng);
    hidden.push({ level: 2, index: l2Idx });

    // Gốc
    hidden.push({ level: 3, index: 0 });

    // 1 ô còn lại từ các ô chưa được chọn
    const remainingCandidates: CellCoord[] = [];
    for (let i = 0; i < 8; i++) {
      if (i !== leafIdx) remainingCandidates.push({ level: 0, index: i });
    }
    remainingCandidates.push({ level: 1, index: l1Candidates[2] });
    remainingCandidates.push({ level: 1, index: l1Candidates[3] });
    remainingCandidates.push({ level: 2, index: 1 - l2Idx });

    const extra = chooseOne(remainingCandidates, rng);
    hidden.push(extra);

    // Lấy 6 giá trị thật của 6 ô bị ẩn
    const hiddenValues = hidden.map((h) => tree[h.level][h.index]);
    const hiddenSet = new Set(hiddenValues);
    // Nếu 6 giá trị ẩn bị trùng nhau -> thử lại
    if (hiddenSet.size !== 6) continue;

    // 3. Tìm 2 mảnh nhiễu là kết quả ghép ngược thứ tự của các ô ẩn
    // Nút không phải lá: level >= 1
    const nonLeafHidden = hidden.filter((h) => h.level >= 1);
    const candidateDistractors: number[] = [];

    for (const h of nonLeafHidden) {
      const childLevel = h.level - 1;
      const leftChild = tree[childLevel][h.index * 2];
      const rightChild = tree[childLevel][h.index * 2 + 1];
      const normal = combine(leftChild, rightChild);
      const reverse = combine(rightChild, leftChild);

      if (reverse !== normal && !hiddenSet.has(reverse) && !candidateDistractors.includes(reverse)) {
        candidateDistractors.push(reverse);
      }
    }

    if (candidateDistractors.length < 2) continue;

    // Chọn 2 mảnh nhiễu đầu tiên
    const distractors = [candidateDistractors[0], candidateDistractors[1]];

    // Kiểm tra tất cả 8 giá trị trong khay
    const fullTray = [...hiddenValues, ...distractors];
    const fullSet = new Set(fullTray);
    if (fullSet.size !== 8) continue;

    // Thành công
    const txs: HardTx[] = HARD_PEOPLE.map((p, i) => ({
      id: `T${i + 1}`,
      name: p.name,
      item: p.item,
      value: leaves[i],
    }));

    return {
      txs,
      tree,
      hidden,
      tray: shuffle(fullTray, rng),
      distractors,
    };
  }

  // Fallback về đề mẫu chuẩn
  return {
    ...SAMPLE_HARD_CHALLENGE,
    tray: shuffle(SAMPLE_HARD_CHALLENGE.tray, rng),
  };
}
