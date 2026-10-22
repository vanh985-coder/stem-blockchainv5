import { describe, expect, it } from 'vitest';
import { decodeProgress, encodeProgress } from './compact';
import { gameTipDataFromMask, gameTipMask, hasSeenClimax, hasSeenGameTip, mergeGameTipSeen, withClimaxSeen, withGameTipSeen } from './gameTips';
import { withGuideSeen } from './guideFlags';
import { mergeGame } from './merge';
import { emptyProgress } from './types';

describe('cờ "đã nghe lời giới thiệu lần đầu của game phụ" (bước B4)', () => {
  it('chưa nghe thì không; withGameTipSeen đánh dấu đúng màn, giữ khóa khác, không sửa dữ liệu đầu vào; số màn lạ bỏ qua', () => {
    expect(hasSeenGameTip({}, 12)).toBe(false);
    expect(hasSeenGameTip(undefined, 12)).toBe(false);
    expect(hasSeenGameTip({ gameTipSeen: { '12': 1 } }, 12)).toBe(false); // chỉ true mới tính
    const data = withGuideSeen({}, 'di-lai');
    const copy = JSON.stringify(data);
    const seen = withGameTipSeen(data, 12);
    expect(hasSeenGameTip(seen, 12)).toBe(true);
    expect(hasSeenGameTip(seen, 8)).toBe(false);
    expect(seen.guideSeen).toEqual({ 'di-lai': true });
    expect(JSON.stringify(data)).toBe(copy);
    expect(hasSeenGameTip(withGameTipSeen({}, 13), 13)).toBe(false);
  });

  it('số bit (cookie): bit số màn − 1, khứ hồi', () => {
    expect(gameTipMask({})).toBe(0);
    expect(gameTipMask(withGameTipSeen({}, 12))).toBe(1 << 11);
    expect(gameTipMask(withGameTipSeen(withGameTipSeen({}, 1), 12))).toBe(1 | (1 << 11));
    expect(gameTipDataFromMask(1 << 11)).toEqual({ gameTipSeen: { '12': true } });
    expect(gameTipDataFromMask(0)).toEqual({});
    expect(gameTipDataFromMask('x')).toEqual({});
  });

  it('cookie sc_guest: cờ đi theo trường "gt", không có thì không ghi', () => {
    const p = emptyProgress();
    expect(encodeProgress(p)).not.toContain('"gt"');
    p.game.data = withGameTipSeen({}, 12);
    const raw = encodeProgress(p);
    expect(JSON.parse(raw).gt).toBe(1 << 11);
    expect(hasSeenGameTip(decodeProgress(raw).game.data, 12)).toBe(true);
  });

  it('gộp hai bên: màn nào một bên đã nghe thì tính là đã nghe', () => {
    const base = { x: 1 };
    expect(mergeGameTipSeen(base, {})).toBe(base);
    expect(hasSeenGameTip(mergeGameTipSeen({}, withGameTipSeen({}, 12)), 12)).toBe(true);
    const local = { goldenPages: 0, coins: 0, data: {}, updatedAt: 5 };
    const remote = { goldenPages: 0, coins: 0, data: withGameTipSeen({}, 12), updatedAt: 1 };
    expect(hasSeenGameTip(mergeGame(local, remote).data, 12)).toBe(true);
    expect(hasSeenGameTip(mergeGame(remote, local).data, 12)).toBe(true);
  });

  it('cờ cao trào (bước B5): chưa chiếu thì không; withClimaxSeen giữ khóa khác; bit 12 của "gt" khứ hồi (kể cả khách); gộp hai bên', () => {
    expect(hasSeenClimax({})).toBe(false);
    expect(hasSeenClimax(undefined)).toBe(false);
    expect(hasSeenClimax({ climaxSeen: 1 })).toBe(false);
    const data = withGameTipSeen({}, 12);
    const copy = JSON.stringify(data);
    const seen = withClimaxSeen(data);
    expect(hasSeenClimax(seen)).toBe(true);
    expect(hasSeenGameTip(seen, 12)).toBe(true);
    expect(JSON.stringify(data)).toBe(copy);
    // cookie
    expect(gameTipMask(seen)).toBe((1 << 11) | (1 << 12));
    expect(gameTipMask(withClimaxSeen({}))).toBe(1 << 12);
    expect(gameTipDataFromMask(1 << 12)).toEqual({ climaxSeen: true });
    expect(gameTipDataFromMask((1 << 12) | (1 << 11))).toEqual({ gameTipSeen: { '12': true }, climaxSeen: true });
    const p = emptyProgress();
    p.game.data = withClimaxSeen({});
    const raw = encodeProgress(p);
    expect(JSON.parse(raw).gt).toBe(1 << 12);
    const back = decodeProgress(raw).game.data;
    expect(hasSeenClimax(back)).toBe(true);
    expect(hasSeenGameTip(back, 12)).toBe(false);
    // gộp: một bên đã chiếu thì tính là đã chiếu, ở máy nào cũng vậy
    expect(hasSeenClimax(mergeGameTipSeen({}, withClimaxSeen({})))).toBe(true);
    expect(hasSeenClimax(mergeGameTipSeen(withClimaxSeen({}), {}))).toBe(true);
    const base = { x: 1 };
    expect(mergeGameTipSeen(base, {})).toBe(base);
    const local = { goldenPages: 0, coins: 0, data: {}, updatedAt: 5 };
    const remote = { goldenPages: 0, coins: 0, data: withClimaxSeen({}), updatedAt: 1 };
    expect(hasSeenClimax(mergeGame(local, remote).data)).toBe(true);
    expect(hasSeenClimax(mergeGame(remote, local).data)).toBe(true);
  });
});
