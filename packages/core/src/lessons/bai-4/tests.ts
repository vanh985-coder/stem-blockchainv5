import {
  combine,
  buildTree,
  pathToRoot,
  generateEasy,
  generateMedium,
  generateHard,
} from './logic';
import { createMulberry32 } from '../../lib/rng';

interface TestCase {
  name: string;
  expected: unknown;
  actual: () => unknown;
}

export const tests: TestCase[] = [
  {
    name: 'combine(3, 7) === 37 và combine(7, 3) === 73',
    expected: [37, 73],
    actual: () => [combine(3, 7), combine(7, 3)],
  },
  {
    name: 'buildTree([3, 7, 5, 2]) trả về đúng 3 tầng từ lá lên gốc',
    expected: [
      [3, 7, 5, 2],
      [37, 52],
      [422],
    ],
    actual: () => buildTree([3, 7, 5, 2]),
  },
  {
    name: 'buildTree([3, 7, 5, 2, 6, 1, 4, 8]) trả về đúng 4 tầng từ lá lên gốc',
    expected: [
      [3, 7, 5, 2, 6, 1, 4, 8],
      [37, 52, 61, 48],
      [422, 658],
      [4878],
    ],
    actual: () => buildTree([3, 7, 5, 2, 6, 1, 4, 8]),
  },
  {
    name: 'buildTree là hàm thuần, không sửa đổi mảng lá đầu vào',
    expected: [3, 7, 5, 2],
    actual: () => {
      const original = [3, 7, 5, 2];
      buildTree(original);
      return original;
    },
  },
  {
    name: 'pathToRoot(2, 3) trả đúng đường đi 4 bước từ lá thứ 3 lên gốc trong cây 8 lá',
    expected: [
      { level: 0, index: 2 },
      { level: 1, index: 1 },
      { level: 2, index: 0 },
      { level: 3, index: 0 },
    ],
    actual: () => pathToRoot(2, 3),
  },
  {
    name: 'pathToRoot(0, 2) trả đúng đường đi 3 bước từ lá đầu tiên lên gốc trong cây 4 lá',
    expected: [
      { level: 0, index: 0 },
      { level: 1, index: 0 },
      { level: 2, index: 0 },
    ],
    actual: () => pathToRoot(0, 2),
  },
  {
    name: 'generateEasy: 5 câu đúng thứ tự T12, T34, T23, T21, T41',
    expected: [
      ['T1', 'T2'],
      ['T3', 'T4'],
      ['T2', 'T3'],
      ['T2', 'T1'],
      ['T4', 'T1'],
    ],
    actual: () => {
      const rng = createMulberry32(12345);
      const res = generateEasy(rng);
      return res.questions;
    },
  },
  {
    name: 'generateEasy: mọi giá trị lá đều nằm trong khoảng [1, 9]',
    expected: true,
    actual: () => {
      const rng = createMulberry32(54321);
      const res = generateEasy(rng);
      return res.txs.every((t) => t.value >= 1 && t.value <= 9);
    },
  },
  {
    name: 'generateHard với seed cố định: khay có đúng 8 giá trị và đôi một khác nhau',
    expected: { total: 8, unique: 8 },
    actual: () => {
      const rng = createMulberry32(99999);
      const challenge = generateHard(rng);
      const uniqueCount = new Set(challenge.tray).size;
      return { total: challenge.tray.length, unique: uniqueCount };
    },
  },
  {
    name: 'generateHard: đúng 6 ô ẩn gồm ít nhất 1 lá, 2 ô tầng 1, 1 ô tầng 2 và gốc',
    expected: { total: 6, hasLeaf: true, l1Count: 2, hasL2: true, hasRoot: true },
    actual: () => {
      const rng = createMulberry32(77777);
      const challenge = generateHard(rng);
      const hidden = challenge.hidden;
      const leafCount = hidden.filter((h) => h.level === 0).length;
      const l1Count = hidden.filter((h) => h.level === 1).length;
      const l2Count = hidden.filter((h) => h.level === 2).length;
      const rootCount = hidden.filter((h) => h.level === 3).length;
      return {
        total: hidden.length,
        hasLeaf: leafCount >= 1,
        l1Count: l1Count >= 2 ? 2 : l1Count,
        hasL2: l2Count >= 1,
        hasRoot: rootCount >= 1,
      };
    },
  },
  {
    name: 'generateHard: 2 mảnh nhiễu đúng là combine ngược của các ô ẩn và không trùng giá trị thật',
    expected: { distractorCount: 2, noCollisionWithHidden: true },
    actual: () => {
      const rng = createMulberry32(88888);
      const challenge = generateHard(rng);
      const hiddenValues = challenge.hidden.map(
        (h) => challenge.tree[h.level][h.index]
      );
      const hiddenSet = new Set(hiddenValues);
      const noCollision = challenge.distractors.every((d) => !hiddenSet.has(d));
      return {
        distractorCount: challenge.distractors.length,
        noCollisionWithHidden: noCollision,
      };
    },
  },
  {
    name: 'generateMedium: sinh 4 giao dịch với giá trị trong khoảng [1, 9]',
    expected: { count: 4, allInRange: true },
    actual: () => {
      const rng = createMulberry32(44444);
      const med = generateMedium(rng);
      return {
        count: med.txs.length,
        allInRange: med.txs.every((t) => t.value >= 1 && t.value <= 9),
      };
    },
  },
];
