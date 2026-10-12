import { describe, expect, it, vi } from 'vitest';
import { INITIAL_REACTION_STATE, TOUCH_POINT_MS, createReactionStore, reduceReaction, revealDelayMs } from './choiceReactions';

const rect = (x: number) => ({ x, y: 10, width: 100, height: 40 });

describe('kho phản ứng khi chọn đáp án (spec 03 mục 4)', () => {
  it('chạm: point 0,3 giây rồi mới hiện kết quả; chuột và bàn phím thì hiện ngay', () => {
    expect(TOUCH_POINT_MS).toBe(300);
    expect(revealDelayMs(true)).toBe(300);
    expect(revealDelayMs(false)).toBe(0);
  });

  it('rê chuột hoặc focus: nhân vật nhìn/chỉ về đáp án; rời đi thì thả', () => {
    const s0 = INITIAL_REACTION_STATE;
    const s1 = reduceReaction(s0, { type: 'hover', target: rect(300) });
    expect(s1.target).toEqual(rect(300));
    const s2 = reduceReaction(s1, { type: 'hover', target: rect(500) });
    expect(s2.target).toEqual(rect(500));
    const s3 = reduceReaction(s2, { type: 'hover', target: null });
    expect(s3.target).toBeNull();
  });

  it('đã chọn thì khóa: rê chuột ra ngoài không làm mất hướng chỉ cho tới khi có kết quả', () => {
    let s = reduceReaction(INITIAL_REACTION_STATE, { type: 'select', target: rect(300) });
    expect(s.locked).toBe(true);
    s = reduceReaction(s, { type: 'hover', target: null });
    expect(s.target).toEqual(rect(300));
    s = reduceReaction(s, { type: 'hover', target: rect(900) });
    expect(s.target).toEqual(rect(300));
  });

  it('đúng: học sinh cheer, {phanDien} hurt; thả tay chỉ, mở khóa', () => {
    let s = reduceReaction(INITIAL_REACTION_STATE, { type: 'select', target: rect(300) });
    s = reduceReaction(s, { type: 'result', correct: true });
    expect(s.student).toMatchObject({ clip: 'cheer', pose: null });
    expect(s.rival).toMatchObject({ clip: 'idle', pose: 'hurt' });
    expect(s.target).toBeNull();
    expect(s.locked).toBe(false);
  });

  it('sai: học sinh sad, {phanDien} cheer', () => {
    let s = reduceReaction(INITIAL_REACTION_STATE, { type: 'select', target: rect(300) });
    s = reduceReaction(s, { type: 'result', correct: false });
    expect(s.student).toMatchObject({ clip: 'idle', pose: 'sad' });
    expect(s.rival).toMatchObject({ clip: 'cheer', pose: null });
  });

  it('hai lần liên tiếp cùng kết quả vẫn phát lại (bộ đếm tăng)', () => {
    let s = reduceReaction(INITIAL_REACTION_STATE, { type: 'result', correct: true });
    const n1 = s.student.clipN;
    s = reduceReaction(s, { type: 'result', correct: true });
    expect(s.student.clipN).toBe(n1 + 1);
    let w = reduceReaction(INITIAL_REACTION_STATE, { type: 'result', correct: false });
    const p1 = w.student.poseN;
    w = reduceReaction(w, { type: 'result', correct: false });
    expect(w.student.poseN).toBe(p1 + 1);
  });

  it('reset về đứng yên nhưng không làm bộ đếm lùi (để lần phát sau vẫn khác)', () => {
    let s = reduceReaction(INITIAL_REACTION_STATE, { type: 'result', correct: true });
    s = reduceReaction(s, { type: 'reset' });
    expect(s.student).toMatchObject({ clip: 'idle', pose: null, clipN: 1 });
    expect(s.target).toBeNull();
    expect(s.locked).toBe(false);
  });

  it('hàm thuần: không sửa trạng thái cũ', () => {
    const before = JSON.stringify(INITIAL_REACTION_STATE);
    reduceReaction(INITIAL_REACTION_STATE, { type: 'result', correct: true });
    reduceReaction(INITIAL_REACTION_STATE, { type: 'select', target: rect(1) });
    expect(JSON.stringify(INITIAL_REACTION_STATE)).toBe(before);
  });
});

describe('createReactionStore', () => {
  it('báo cho người nghe khi trạng thái đổi, và thôi báo khi hủy đăng ký', () => {
    const store = createReactionStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.hover(rect(10));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(store.getState().target).toEqual(rect(10));
    off();
    store.hover(rect(20));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('chuột: select hoàn thành ngay; chạm: chờ 0,3 giây', async () => {
    const timers: { ms: number; fn: () => void }[] = [];
    const store = createReactionStore((ms, fn) => timers.push({ ms, fn }));
    let done = false;
    await store.select(rect(1), false);
    expect(timers).toHaveLength(0);
    const p = store.select(rect(2), true).then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);
    expect(timers).toEqual([{ ms: 300, fn: expect.any(Function) }]);
    // trong lúc chờ nhân vật đang chỉ về đáp án vừa chạm
    expect(store.getState().target).toEqual(rect(2));
    expect(store.getState().locked).toBe(true);
    timers[0].fn();
    await p;
    expect(done).toBe(true);
  });

  it('luồng đầy đủ trên điện thoại: chạm → chỉ → 0,3 giây → kết quả → cheer', async () => {
    vi.useFakeTimers();
    try {
      const store = createReactionStore();
      let revealed = false;
      void store.select(rect(7), true).then(() => {
        revealed = true;
        store.result(true);
      });
      expect(store.getState().target).toEqual(rect(7));
      await vi.advanceTimersByTimeAsync(299);
      expect(revealed).toBe(false);
      expect(store.getState().student.clip).toBe('idle');
      await vi.advanceTimersByTimeAsync(2);
      expect(revealed).toBe(true);
      expect(store.getState().student.clip).toBe('cheer');
      expect(store.getState().target).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('không báo khi sự kiện không làm đổi gì (hover khi đang khóa)', () => {
    const store = createReactionStore();
    void store.select(rect(1), false);
    const fn = vi.fn();
    store.subscribe(fn);
    store.hover(rect(2));
    expect(fn).not.toHaveBeenCalled();
  });
});
