import { describe, expect, it } from 'vitest';
import { allowKeyboardClick, createEnterTracker, trackEnterDown, trackEnterUp } from './enterGuard';

describe('enterGuard', () => {
  it('lần nhấn mới được nhận một lần, các lần lặp khi giữ bị bỏ', () => {
    const t = createEnterTracker();
    trackEnterDown(t, { repeat: false, timeStamp: 1000 });
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 1001 })).toBe(true);
    for (let i = 1; i <= 20; i++) {
      trackEnterDown(t, { repeat: true, timeStamp: 1000 + i * 30 });
      expect(allowKeyboardClick(t, { detail: 0, timeStamp: 1001 + i * 30 })).toBe(false);
    }
  });

  it('giữ từ trước khi nghe: chỉ thấy keydown lặp nên không nhận', () => {
    const t = createEnterTracker();
    trackEnterDown(t, { repeat: true, timeStamp: 500 });
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 501 })).toBe(false);
  });

  it('bàn phím báo repeat=false khi chưa có keyup vẫn bị coi là lặp', () => {
    const t = createEnterTracker();
    trackEnterDown(t, { repeat: false, timeStamp: 100 });
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 101 })).toBe(true);
    trackEnterDown(t, { repeat: false, timeStamp: 200 });
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 201 })).toBe(false);
  });

  it('nhả rồi nhấn lại thì nhận lại', () => {
    const t = createEnterTracker();
    trackEnterDown(t, { repeat: false, timeStamp: 100 });
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 101 })).toBe(true);
    trackEnterUp(t);
    trackEnterDown(t, { repeat: false, timeStamp: 400 });
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 401 })).toBe(true);
  });

  it('chuột, chạm và click độc lập luôn được nhận', () => {
    const t = createEnterTracker();
    trackEnterDown(t, { repeat: true, timeStamp: 100 });
    expect(allowKeyboardClick(t, { detail: 1, timeStamp: 101 })).toBe(true);
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 900 })).toBe(true);
    trackEnterUp(t);
    expect(allowKeyboardClick(t, { detail: 0, timeStamp: 901 })).toBe(true);
  });
});
