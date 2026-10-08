import { describe, expect, it } from 'vitest';
import { QUESTIONS, questionById } from '../content/questions';
import { pickQuestions } from './pickQuestions';

describe('pickQuestions', () => {
  it('cùng seed thì cùng kết quả; khác seed thì (thường) khác', () => {
    const a = pickQuestions({ bai: [1, 2], soCau: 10, seed: 7 });
    const b = pickQuestions({ bai: [1, 2], soCau: 10, seed: 7 });
    expect(a).toEqual(b);
    const c = pickQuestions({ bai: [1, 2], soCau: 10, seed: 8 });
    expect(c.map((q) => q.id)).not.toEqual(a.map((q) => q.id));
  });

  it('không trùng câu trong một ván, kể cả với nhiều seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ids = pickQuestions({ bai: [1, 2, 3, 4], soCau: 28, seed }).map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('chỉ lấy đúng bài được hỏi', () => {
    const one = pickQuestions({ bai: 1, soCau: 4, seed: 1 });
    expect(one).toHaveLength(4);
    expect(one.every((q) => q.bai === 1)).toBe(true);
    const two = pickQuestions({ bai: [1, 2], soCau: 16, seed: 1 });
    expect(new Set(two.map((q) => q.bai))).toEqual(new Set([1, 2]));
  });

  it('correctIndex sau khi trộn vẫn trỏ đúng đáp án gốc', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const q of pickQuestions({ bai: [1, 2, 3, 4], soCau: 28, seed })) {
        const orig = questionById(q.id)!;
        expect(q.options[q.correctIndex], `${q.id} seed ${seed}`).toBe(orig.options[orig.correctIndex]);
        expect([...q.options].sort()).toEqual([...orig.options].sort());
      }
    }
  });

  it('có trộn thứ tự đáp án (không phải lúc nào cũng giữ nguyên)', () => {
    const moved = Array.from({ length: 30 }, (_, seed) => pickQuestions({ bai: 1, soCau: 8, seed })).some((set) =>
      set.some((q) => q.correctIndex !== questionById(q.id)!.correctIndex),
    );
    expect(moved).toBe(true);
  });

  it('soCau lớn hơn số câu có sẵn: trả hết số câu có, không lỗi', () => {
    expect(pickQuestions({ bai: 3, soCau: 100, seed: 3 })).toHaveLength(6);
    expect(pickQuestions({ bai: [1, 2, 3, 4], soCau: 1000, seed: 3 })).toHaveLength(QUESTIONS.length);
    expect(pickQuestions({ bai: 1, soCau: 0, seed: 3 })).toEqual([]);
    expect(pickQuestions({ bai: 1, soCau: -2, seed: 3 })).toEqual([]);
  });

  it('không làm hỏng ngân hàng gốc', () => {
    const before = JSON.stringify(QUESTIONS);
    pickQuestions({ bai: [1, 2, 3, 4], soCau: 28, seed: 99 });
    expect(JSON.stringify(QUESTIONS)).toBe(before);
  });
});
