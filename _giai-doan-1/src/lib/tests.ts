import {
  starsFromMistakes,
  xpForStars,
  xpDelta,
  isLessonUnlocked,
  isLevelUnlocked,
  AppProgressData,
} from './progressLogic';
import { formatNumber, formatDecimal, formatSci } from './format';
import { createMulberry32, randInt, shuffle } from './rng';

function createEmptyProgress(): AppProgressData {
  return {
    version: 1,
    userName: '',
    settings: {
      soundEnabled: true,
      reducedMotion: false,
      presentationFont: false,
      teacherMode: false,
    },
    totalXp: 0,
    levels: {},
    didYouKnowViewed: {},
    lessonData: {},
    firstVisitDone: false,
  };
}

export const tests: { name: string; expected: unknown; actual: () => unknown }[] = [
  {
    name: 'starsFromMistakes(0) -> 3',
    expected: 3,
    actual: () => starsFromMistakes(0),
  },
  {
    name: 'starsFromMistakes(2) -> 2',
    expected: 2,
    actual: () => starsFromMistakes(2),
  },
  {
    name: 'starsFromMistakes(3) -> 1',
    expected: 1,
    actual: () => starsFromMistakes(3),
  },
  {
    name: 'xpForStars("easy", 1) -> 10',
    expected: 10,
    actual: () => xpForStars('easy', 1),
  },
  {
    name: 'xpForStars("hard", 3) -> 30',
    expected: 30,
    actual: () => xpForStars('hard', 3),
  },
  {
    name: 'xpDelta("easy", 0, 3) -> 20',
    expected: 20,
    actual: () => xpDelta('easy', 0, 3),
  },
  {
    name: 'xpDelta("medium", 0, 1) -> 15',
    expected: 15,
    actual: () => xpDelta('medium', 0, 1),
  },
  {
    name: 'xpDelta("hard", 2, 3) -> 5',
    expected: 5,
    actual: () => xpDelta('hard', 2, 3),
  },
  {
    name: 'xpDelta("medium", 3, 2) -> 0',
    expected: 0,
    actual: () => xpDelta('medium', 3, 2),
  },
  {
    name: 'Tiến độ trống: isLessonUnlocked(…, 2, false) -> false',
    expected: false,
    actual: () => isLessonUnlocked(createEmptyProgress(), 2, false),
  },
  {
    name: 'Tiến độ trống, giáo viên: isLessonUnlocked(…, 5, true) -> true',
    expected: true,
    actual: () => isLessonUnlocked(createEmptyProgress(), 5, true),
  },
  {
    name: 'Bài 1 xong Dễ: isLevelUnlocked(…, 1, "medium", false) -> true',
    expected: true,
    actual: () => {
      const state = createEmptyProgress();
      state.levels['1_easy'] = { completed: true, stars: 3 };
      return isLevelUnlocked(state, 1, 'medium', false);
    },
  },
  {
    name: 'Bài 1 xong Dễ: isLevelUnlocked(…, 1, "hard", false) -> false',
    expected: false,
    actual: () => {
      const state = createEmptyProgress();
      state.levels['1_easy'] = { completed: true, stars: 3 };
      return isLevelUnlocked(state, 1, 'hard', false);
    },
  },
  {
    name: 'Bài 1 xong Khó: isLessonUnlocked(…, 2, false) -> true',
    expected: true,
    actual: () => {
      const state = createEmptyProgress();
      state.levels['1_hard'] = { completed: true, stars: 3 };
      return isLessonUnlocked(state, 2, false);
    },
  },
  {
    name: 'formatNumber(1000003) -> "1.000.003"',
    expected: '1.000.003',
    actual: () => formatNumber(1000003),
  },
  {
    name: 'formatDecimal(3.7) -> "3,7"',
    expected: '3,7',
    actual: () => formatDecimal(3.7),
  },
  {
    name: 'formatSci(3.7e51) -> "3,7 × 10^51"',
    expected: '3,7 × 10^51',
    actual: () => formatSci(3.7e51),
  },
  {
    name: 'Hai rng cùng seed, lấy 5 số randInt(1, 6) -> hai dãy giống hệt nhau',
    expected: true,
    actual: () => {
      const rng1 = createMulberry32(42);
      const rng2 = createMulberry32(42);
      const seq1 = Array.from({ length: 5 }, () => randInt(1, 6, rng1));
      const seq2 = Array.from({ length: 5 }, () => randInt(1, 6, rng2));
      return JSON.stringify(seq1) === JSON.stringify(seq2);
    },
  },
  {
    name: '1.000 lần randInt(1, 6) -> mọi giá trị trong 1–6, có đủ cả 1 và 6',
    expected: true,
    actual: () => {
      const rng = createMulberry32(1001);
      const set = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        const n = randInt(1, 6, rng);
        if (n < 1 || n > 6) return false;
        set.add(n);
      }
      return set.has(1) && set.has(6) && set.size === 6;
    },
  },
  {
    name: 'shuffle([1,2,3,4,5]) -> cùng các phần tử, mảng gốc không đổi',
    expected: true,
    actual: () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      const shuffled = shuffle(original, createMulberry32(888));
      const originalUnchanged = original.every((val, idx) => val === copy[idx]);
      const sameElements =
        shuffled.length === original.length &&
        shuffled.slice().sort().join(',') === original.slice().sort().join(',');
      return originalUnchanged && sameElements;
    },
  },
];
