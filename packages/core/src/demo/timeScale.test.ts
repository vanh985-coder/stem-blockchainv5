import { describe, expect, it } from 'vitest';
import { computeTimeScale, FF_FACTOR, resetTimeScale, scaleDt, setDemoQuestion, setFastForward, timeScale } from './timeScale';

describe('hệ số thời gian của demo', () => {
  it('bản không demo luôn là 1, kể cả khi gọi bật tua', () => {
    expect(computeTimeScale(false, true, false)).toBe(1);
    setFastForward(true);
    setDemoQuestion(false);
    expect(timeScale()).toBe(1);
    resetTimeScale();
  });

  it('demo đang tua là 2,5; chưa tua là 1', () => {
    expect(FF_FACTOR).toBe(2.5);
    expect(computeTimeScale(true, true, false)).toBe(2.5);
    expect(computeTimeScale(true, false, false)).toBe(1);
  });

  it('câu hỏi và lượt đáp án không bị tua', () => {
    expect(computeTimeScale(true, true, true)).toBe(1);
    expect(scaleDt(0.016, computeTimeScale(true, true, true))).toBe(0.016);
    expect(scaleDt(0.016, computeTimeScale(true, true, false))).toBeCloseTo(0.04, 10);
  });
});
