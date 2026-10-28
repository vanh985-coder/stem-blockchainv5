import { describe, expect, it } from 'vitest';
import { enterContinues, shouldAnnounce, submissionKey, type SubmissionParts } from './feedbackAnnounce';

const wrong: SubmissionParts = { isCorrect: false, whatHappened: 'Sai rồi', whyHappened: 'Vì…' };
const right: SubmissionParts = { isCorrect: true, whatHappened: 'Đúng rồi' };

/** Mô phỏng vòng đời của FeedbackSheet: mỗi lần effect chạy gọi `effect(parts | null)` (null: hộp đóng). */
function sheet() {
  let announced: string | null = null;
  const played: string[] = [];
  return {
    played,
    effect(parts: SubmissionParts | null) {
      if (parts === null) { announced = null; return; }
      const key = submissionKey(parts);
      if (!shouldAnnounce(announced, key)) return;
      announced = key;
      played.push(parts.isCorrect ? 'đúng' : 'sai');
    },
  };
}

describe('hộp phản hồi báo mỗi lần nộp đúng một lần', () => {
  it('render lại và callback đổi nhiều lần với cùng một lần nộp thì không phát lại', () => {
    const s = sheet();
    s.effect(right);
    for (let i = 0; i < 6; i++) s.effect({ ...right }); // cha render lại, callback mới, effect nối lại
    expect(s.played).toEqual(['đúng']);
  });
  it('hai lần nộp liên tiếp cùng sai (hộp đóng rồi mở lại) phát hai lần', () => {
    const s = sheet();
    s.effect(wrong); s.effect(wrong);
    s.effect(null);
    s.effect(wrong); s.effect(wrong);
    expect(s.played).toEqual(['sai', 'sai']);
  });
  it('hai lần nộp liên tiếp cùng đúng phát hai lần', () => {
    const s = sheet();
    s.effect(right); s.effect(null); s.effect(right); s.effect(right);
    expect(s.played).toEqual(['đúng', 'đúng']);
  });
  it('đúng/sai đổi hoặc nội dung mới lúc hộp còn mở là lần nộp mới', () => {
    const s = sheet();
    s.effect(wrong); s.effect(right); s.effect({ ...right, whatHappened: 'Đúng tiếp' });
    expect(s.played).toEqual(['sai', 'đúng', 'đúng']);
  });
  it('khóa nhận ra khác biệt ở mọi trường', () => {
    const base = submissionKey(wrong);
    for (const v of [{ title: 'x' }, { whatHappened: 'y' }, { whyHappened: 'z' }, { howToFix: 'w' }, { isCorrect: true }]) {
      expect(submissionKey({ ...wrong, ...v })).not.toBe(base);
    }
  });
});

describe('phím Enter tiếp tục sau khi nộp', () => {
  const openedAt = 1000;
  it('phím Enter nộp đáp án (nhấn trước hoặc đúng lúc hộp mở) không đóng hộp', () => {
    expect(enterContinues({ repeat: false, timeStamp: 990 }, openedAt)).toBe(false);
    expect(enterContinues({ repeat: false, timeStamp: 1000 }, openedAt)).toBe(false);
  });
  it('giữ phím: mọi lần lặp đều bị bỏ qua, kể cả sau khi hộp mở', () => {
    for (const t of [1010, 1500, 5000]) expect(enterContinues({ repeat: true, timeStamp: t }, openedAt)).toBe(false);
  });
  it('thả phím rồi nhấn Enter lần tiếp theo thì tiếp tục', () => {
    expect(enterContinues({ repeat: false, timeStamp: 1200 }, openedAt)).toBe(true);
  });
  it('lần nộp mới làm mới mốc: Enter nhấn trước mốc mới không tính', () => {
    expect(enterContinues({ repeat: false, timeStamp: 2000 }, 2000)).toBe(false);
    expect(enterContinues({ repeat: false, timeStamp: 2001 }, 2000)).toBe(true);
  });
});
