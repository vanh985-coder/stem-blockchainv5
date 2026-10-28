import { describe, expect, it } from 'vitest';
import { runLegacyTests } from '../legacy-test-runner';
import { settleRound, voteWasRight, type PlayerId, type Truth, type Vote } from './bots';
import { tests } from './tests';

describe('Bài 2', () => {
  it('giữ đủ 27 test của giai đoạn 1', () => {
    expect(tests).toHaveLength(27);
  });
  runLegacyTests(tests);
});

describe('Bài 2, trạm Khó: phiếu của em đúng hay sai không phụ thuộc trang được nhận', () => {
  const truths: Truth[] = ['valid', 'cheat', 'miscalc'];
  const votes: Vote[] = ['agree', 'reject'];
  it('đồng ý trang thật hoặc từ chối trang gian/tính nhầm là đúng', () => {
    expect(voteWasRight('agree', 'valid')).toBe(true);
    expect(voteWasRight('reject', 'valid')).toBe(false);
    for (const t of ['cheat', 'miscalc'] as const) {
      expect(voteWasRight('reject', t)).toBe(true);
      expect(voteWasRight('agree', t)).toBe(false);
    }
  });
  it('chưa có phiếu của em thì chưa có câu trả lời', () => {
    expect(voteWasRight(undefined, 'valid')).toBeNull();
  });
  it('cùng phiếu của em, hai phiếu còn lại đổi kết quả nhận/loại nhưng đúng/sai của em không đổi', () => {
    for (const truth of truths) {
      for (const em of votes) {
        const seen = new Set<boolean>();
        const verdicts = new Set<boolean | null>();
        for (const a of votes) {
          for (const b of votes) {
            const all: Partial<Record<PlayerId, Vote>> = { em, binh: a, chi: b };
            seen.add(settleRound('ti', truth, all).accepted);
            verdicts.add(voteWasRight(all.em, truth));
          }
        }
        expect(verdicts.size).toBe(1);
        // với phiếu của em cố định, có cả ca trang được nhận lẫn bị loại (trừ khi em là phiếu quyết định duy nhất)
        expect(seen.size).toBe(2);
      }
    }
  });
  it('đủ bốn tổ hợp (đúng/sai) × (nhận/loại) đều xảy ra', () => {
    const combos = new Set<string>();
    for (const truth of truths) {
      for (const em of votes) {
        for (const a of votes) {
          for (const b of votes) {
            const accepted = settleRound('ti', truth, { em, binh: a, chi: b }).accepted;
            combos.add(`${voteWasRight(em, truth)}/${accepted}`);
          }
        }
      }
    }
    expect([...combos].sort()).toEqual(['false/false', 'false/true', 'true/false', 'true/true']);
  });
});
