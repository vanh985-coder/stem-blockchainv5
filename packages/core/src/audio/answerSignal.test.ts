import { afterEach, describe, expect, it, vi } from 'vitest';
import { choiceReactions } from '../three/choiceReactions';
import { emitAnswer, emitSubmission, onAnswer } from './answerSignal';
import { sound } from './sound';

afterEach(() => {
  sound.setEnabled(true);
  vi.useRealTimers();
  choiceReactions.reset();
});

describe('tín hiệu onAnswer', () => {
  it('báo đúng cho người nghe và thôi báo khi hủy đăng ký', () => {
    const fn = vi.fn();
    const off = onAnswer(fn);
    emitAnswer(true);
    emitAnswer(false);
    expect(fn.mock.calls).toEqual([[true], [false]]);
    off();
    emitAnswer(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('sound.playCorrect và sound.playWrong phát tín hiệu, kể cả khi tắt âm thanh', () => {
    sound.setEnabled(false);
    const fn = vi.fn();
    const off = onAnswer(fn);
    sound.playCorrect();
    sound.playWrong();
    off();
    expect(fn.mock.calls).toEqual([[true], [false]]);
  });

  it('tắt âm thanh: không tạo AudioContext nhưng tín hiệu vẫn phát (phát trước mọi return sớm)', () => {
    const ctor = vi.fn();
    vi.stubGlobal('window', { AudioContext: ctor });
    try {
      sound.setEnabled(false);
      const fn = vi.fn();
      const off = onAnswer(fn);
      sound.playCorrect();
      sound.playWrong();
      off();
      expect(ctor).not.toHaveBeenCalled();
      expect(fn.mock.calls).toEqual([[true], [false]]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('tắt âm thanh: hai khung 3D vẫn phản ứng (kho choiceReactions nhận kết quả đúng và sai)', () => {
    vi.useFakeTimers();
    sound.setEnabled(false);
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    choiceReactions.reset();
    sound.playWrong();
    expect(choiceReactions.getState().student.pose).toBe('sad');
    expect(choiceReactions.getState().rival.clip).toBe('cheer');
    vi.setSystemTime(new Date('2030-01-01T00:00:05Z'));
    sound.playCorrect();
    expect(choiceReactions.getState().student.clip).toBe('cheer');
    expect(choiceReactions.getState().rival.clip).toBe('idle');
  });

  it('emitSubmission chỉ báo cho người nghe lần nộp, không đụng người nghe thường (nhân vật)', () => {
    const everyAnswer = vi.fn();
    const submissions = vi.fn();
    const offA = onAnswer(everyAnswer);
    const offB = onAnswer(submissions, true);
    emitSubmission(true);
    expect(submissions.mock.calls).toEqual([[true]]);
    expect(everyAnswer).not.toHaveBeenCalled();
    offA();
    offB();
  });

  it('playCorrect({ answer: null }) báo người nghe thường nhưng không báo lần nộp; answer khác với kết quả vẫn được tôn trọng', () => {
    const everyAnswer = vi.fn();
    const submissions = vi.fn();
    const offA = onAnswer(everyAnswer);
    const offB = onAnswer(submissions, true);
    sound.setEnabled(false);
    sound.playCorrect({ answer: null });
    sound.playWrong({ answer: true }); // trang bị loại nhưng phiếu của em đúng
    sound.playCorrect({ answer: false }); // trang được nhận nhưng phiếu của em sai
    offA();
    offB();
    expect(everyAnswer.mock.calls).toEqual([[true], [false], [true]]);
    expect(submissions.mock.calls).toEqual([[true], [false]]);
  });
});
