import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS } from './characters';
import { FINAL_CHALLENGE_IDS, QUESTIONS, finalChallengeQuestions, questionById } from './questions';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

describe('ngân hàng câu hỏi', () => {
  it('đủ 28 câu: B1 có 8, B2 có 8, B3 có 6, B4 có 6', () => {
    expect(QUESTIONS).toHaveLength(28);
    for (const [bai, n] of [[1, 8], [2, 8], [3, 6], [4, 6]] as const) {
      expect(QUESTIONS.filter((q) => q.bai === bai)).toHaveLength(n);
    }
  });

  it('id không trùng và đúng dạng B<bai>-<số>', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) expect(q.id).toMatch(new RegExp(String.raw`^B${q.bai}-\d\d$`));
  });

  it('mỗi câu có ít nhất 2 đáp án, đáp án không trùng nhau và đúng 1 đáp án đúng', () => {
    for (const q of QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      expect(Number.isInteger(q.correctIndex), q.id).toBe(true);
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThan(q.options.length);
      expect(q.text.trim(), q.id).not.toBe('');
      expect(q.explanation.trim(), q.id).not.toBe('');
    }
  });

  it('đáp án đúng khớp với bản gốc (kiểm vài câu có phép tính)', () => {
    const right = (id: string) => {
      const q = questionById(id)!;
      return q.options[q.correctIndex];
    };
    expect(right('B1-01')).toBe('5');
    expect(right('B1-02')).toBe('43');
    expect(right('B1-08')).toBe('60');
    expect(right('B2-03')).toBe('Từ chối');
    expect(right('B3-02')).toBe('10');
    expect(right('B4-05')).toBe('422');
    expect(right('B4-06')).toBe('6');
  });

  it('không còn chữ "Tí" viết cứng; chỗ giữ tên hợp lệ', () => {
    for (const q of QUESTIONS) {
      for (const s of [q.text, q.explanation, ...q.options]) {
        // Không dùng \b vì JavaScript không coi "í" là chữ: "Tính" sẽ bị nhận nhầm.
        expect(s, q.id).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
        for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${q.id}: {${m[1]}}`).toBe(true);
      }
    }
    expect(QUESTIONS.some((q) => q.text.includes('{phanDien}'))).toBe(true);
  });

  it('thử thách cuối: 6 câu cố định, đúng thứ tự, đều có trong ngân hàng', () => {
    expect(FINAL_CHALLENGE_IDS).toEqual(['B1-01', 'B2-02', 'B3-01', 'B4-01', 'B4-04', 'B3-03']);
    expect(finalChallengeQuestions().map((q) => q.id)).toEqual([...FINAL_CHALLENGE_IDS]);
  });
});
