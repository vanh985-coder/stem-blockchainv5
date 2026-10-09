import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../content/questions';
import { answerRate, buildQuestionStats, percent } from './quiz';

describe('buildQuestionStats', () => {
  it('xếp câu có tỉ lệ đúng thấp nhất lên trên cùng', () => {
    const stats = buildQuestionStats([
      { question_id: 'B1-02', total: 10, correct: 9 },
      { question_id: 'B1-01', total: 10, correct: 2 },
      { question_id: 'B1-03', total: 4, correct: 2 },
    ]);
    expect(stats.map((s) => s.id)).toEqual(['B1-01', 'B1-03', 'B1-02']);
    expect(stats.map((s) => percent(s.rate))).toEqual([20, 50, 90]);
  });

  it('bằng tỉ lệ thì câu nhiều lượt hơn lên trước, rồi theo mã câu', () => {
    const stats = buildQuestionStats([
      { question_id: 'B1-03', total: 2, correct: 1 },
      { question_id: 'B1-02', total: 4, correct: 2 },
      { question_id: 'B1-01', total: 2, correct: 1 },
    ]);
    expect(stats.map((s) => s.id)).toEqual(['B1-02', 'B1-01', 'B1-03']);
  });

  it('nội dung câu lấy từ questions.ts theo question_id', () => {
    const [s] = buildQuestionStats([{ question_id: 'B1-01', total: 3, correct: 1 }]);
    const q = QUESTIONS.find((x) => x.id === 'B1-01')!;
    expect(s.text).toBe(q.text);
    expect(s.bai).toBe(1);
  });

  it('câu không có trong ngân hàng vẫn hiện, với mã câu', () => {
    const [s] = buildQuestionStats([{ question_id: 'ZZ-99', total: 1, correct: 0 }]);
    expect(s.text).toBe('Câu ZZ-99');
    expect(s.bai).toBe(0);
  });

  it('bigint về dạng chuỗi vẫn đúng; dòng 0 lượt bị bỏ; đúng không vượt tổng', () => {
    const stats = buildQuestionStats([
      { question_id: 'B1-01', total: '5', correct: '5' },
      { question_id: 'B1-02', total: 0, correct: 0 },
      { question_id: 'B1-03', total: 2, correct: 7 },
    ]);
    expect(stats).toHaveLength(2);
    expect(stats.every((s) => s.rate <= 1)).toBe(true);
  });

  it('không có dữ liệu thì rỗng', () => {
    expect(buildQuestionStats([])).toEqual([]);
  });
});

describe('answerRate', () => {
  it('chưa trả lời thì null', () => {
    expect(answerRate([])).toBeNull();
  });
  it('tính số đúng và phần trăm làm tròn', () => {
    expect(answerRate([{ correct: true }, { correct: true }, { correct: false }])).toEqual({ total: 3, correct: 2, percent: 67 });
  });
});
