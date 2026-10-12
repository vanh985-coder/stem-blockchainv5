import { afterEach, describe, expect, it, vi } from 'vitest';
import { choiceReactions } from '../three/choiceReactions';
import { emitAnswer, onAnswer } from './answerSignal';
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
});
