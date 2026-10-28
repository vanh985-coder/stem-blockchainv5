import { afterEach, expect, it, vi } from 'vitest';
import { emitAnswer, onAnswer } from '../audio/answerSignal';
import { praiseSession } from './praiseSession';
import { sound } from '../audio/sound';

afterEach(() => vi.useRealTimers());
it('ignores demonstrations and keeps feedback working with sound disabled', () => {
  vi.useFakeTimers();
  const show = vi.fn();
  const dispose = praiseSession(show);
  const legacy = vi.fn();
  const off = onAnswer(legacy);
  sound.setEnabled(false);
  sound.playCorrect({ answer: null });
  expect(show).not.toHaveBeenCalled();
  expect(legacy.mock.calls).toEqual([[true]]);
  sound.playCorrect();
  expect(show.mock.calls).toEqual([[true]]);
  sound.playWrong({ answer: true }); // accepted/rejected is not vote correctness
  expect(show).toHaveBeenCalledTimes(1);
  dispose();
  off();
  sound.setEnabled(true);
});
it('handles consecutive answers once each and replaces expiry', () => {
  vi.useFakeTimers();
  const show = vi.fn();
  const dispose = praiseSession(show);
  emitAnswer(true);
  emitAnswer(true); // station + feedback, one submission
  vi.advanceTimersByTime(900);
  emitAnswer(true);
  vi.advanceTimersByTime(900);
  expect(show.mock.calls).toEqual([[true], [true]]);
  vi.advanceTimersByTime(900);
  expect(show.mock.calls).toEqual([[true], [true], [false]]);
  emitAnswer(false);
  expect(show).toHaveBeenLastCalledWith(false);
  dispose();
});
it('cancels timer/listener on leaving and does not replay on entering', () => {
  vi.useFakeTimers();
  const old = vi.fn();
  const dispose = praiseSession(old);
  emitAnswer(true);
  dispose();
  const next = vi.fn();
  const leave = praiseSession(next);
  vi.runAllTimers();
  expect(old).toHaveBeenCalledTimes(1);
  expect(next).not.toHaveBeenCalled();
  emitAnswer(true);
  expect(next).toHaveBeenCalledTimes(1);
  leave();
  expect(vi.getTimerCount()).toBe(0);
});
