import { describe, expect, it } from 'vitest';
import { announceOnce } from './feedbackAnnounce';

describe('announceOnce', () => {
  it('báo kết quả ở lần đầu, không báo lại khi effect chạy lại với cùng kết quả', () => {
    const first = announceOnce(null, true);
    expect(first).toEqual({ answer: true, announced: true });
    expect(announceOnce(first.announced, true).answer).toBeNull();
    expect(announceOnce(first.announced, true).answer).toBeNull();
  });
  it('báo lại khi đúng/sai đổi lúc hộp còn mở', () => {
    const wrong = announceOnce(null, false);
    expect(wrong.answer).toBe(false);
    const right = announceOnce(wrong.announced, true);
    expect(right).toEqual({ answer: true, announced: true });
  });
  it('mở lại sau khi đóng (announced về null) thì báo như lần đầu', () => {
    expect(announceOnce(null, true).answer).toBe(true);
  });
});
