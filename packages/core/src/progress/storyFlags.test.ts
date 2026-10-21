import { describe, expect, it } from 'vitest';
import { decodeProgress, encodeProgress } from './compact';
import { withGuideSeen } from './guideFlags';
import { mergeGame } from './merge';
import { hasReadStory, isReturningPlayer, mergeStorySeen, storyDataFromMask, storyGate, storyMask, withStoryRead, type StoryGateInput } from './storyFlags';
import { emptyProgress, type Progress } from './types';

const fresh = (): Progress => emptyProgress();
const gate = (over: Partial<StoryGateInput> = {}) => storyGate({ mode: 'user', synced: true, authLoading: false, isTeacher: false, progress: fresh(), ...over });

describe('cờ "đã đọc cốt truyện"', () => {
  it('chưa đọc thì không; withStoryRead đánh dấu và giữ khóa khác; không sửa dữ liệu đầu vào', () => {
    expect(hasReadStory({})).toBe(false);
    expect(hasReadStory(undefined)).toBe(false);
    expect(hasReadStory({ storySeen: 1 })).toBe(false); // chỉ true mới tính
    const data = { villageIntroSeen: { 'lang-giay': true } };
    const copy = JSON.stringify(data);
    const read = withStoryRead(data);
    expect(hasReadStory(read)).toBe(true);
    expect(read.villageIntroSeen).toEqual({ 'lang-giay': true });
    expect(JSON.stringify(data)).toBe(copy);
  });
  it('số bit (cookie): khứ hồi 0 và 1', () => {
    expect(storyMask({})).toBe(0);
    expect(storyMask(withStoryRead({}))).toBe(1);
    expect(storyDataFromMask(0)).toEqual({});
    expect(storyDataFromMask(1)).toEqual({ storySeen: true });
    expect(storyDataFromMask('x')).toEqual({});
  });
  it('cookie sc_guest: cờ đi theo trường "st", không có thì không ghi', () => {
    const p = fresh();
    expect(encodeProgress(p)).not.toContain('"st"');
    p.game.data = withStoryRead({});
    const raw = encodeProgress(p);
    expect(JSON.parse(raw).st).toBe(1);
    expect(hasReadStory(decodeProgress(raw).game.data)).toBe(true);
    expect(hasReadStory(decodeProgress(encodeProgress(fresh())).game.data)).toBe(false);
  });
  it('gộp hai bên: bên nào đã đọc thì tính là đã đọc, ở máy nào cũng vậy', () => {
    const base = { x: 1 };
    expect(mergeStorySeen(base, {})).toBe(base);
    expect(hasReadStory(mergeStorySeen({}, withStoryRead({})))).toBe(true);
    expect(hasReadStory(mergeStorySeen(withStoryRead({}), {}))).toBe(true);
    const local = { goldenPages: 0, coins: 0, data: {}, updatedAt: 5 };
    const remote = { goldenPages: 0, coins: 0, data: withStoryRead({}), updatedAt: 1 };
    expect(hasReadStory(mergeGame(local, remote).data)).toBe(true); // bản máy mới hơn nhưng chưa đọc: vẫn giữ cờ đã đọc của server
    expect(hasReadStory(mergeGame(remote, local).data)).toBe(true);
  });
});

describe('người chơi đã có từ trước coi như đã đọc', () => {
  it('có tiến độ (màn đã chơi, xu, Trang Sổ Vàng) hoặc có một cờ nào đó thì là người cũ; trống thì là người mới', () => {
    expect(isReturningPlayer(fresh())).toBe(false);
    const withLevel = fresh();
    withLevel.levels[1] = { played: true, completed: false, stars: {}, bestScore: 0, updatedAt: 1 };
    expect(isReturningPlayer(withLevel)).toBe(true);
    const withCoins = fresh();
    withCoins.game.coins = 3;
    expect(isReturningPlayer(withCoins)).toBe(true);
    const withPage = fresh();
    withPage.game.goldenPages = 1;
    expect(isReturningPlayer(withPage)).toBe(true);
    const withFlag = fresh();
    withFlag.game.data = withGuideSeen({}, 'di-lai');
    expect(isReturningPlayer(withFlag)).toBe(true);
  });
});

describe('quyết định có phải đọc truyện trước khi vào /cho (storyGate)', () => {
  it('khách mới ("Chơi thử") và tài khoản mới: phải đọc', () => {
    expect(gate({ mode: 'guest', synced: false })).toBe('read');
    expect(gate()).toBe('read');
  });
  it('chưa biết thì chờ: đang tải phiên hay hồ sơ, chưa biết đăng nhập hay chơi thử, tài khoản chưa kéo xong tiến độ', () => {
    expect(gate({ authLoading: true })).toBe('wait');
    expect(gate({ mode: 'loading' })).toBe('wait');
    expect(gate({ mode: 'user', synced: false })).toBe('wait');
  });
  it('đã đọc thì vào; giáo viên không bị bắt đọc (kể cả chưa đọc, chưa có tiến độ)', () => {
    const read = fresh();
    read.game.data = withStoryRead({});
    expect(gate({ progress: read })).toBe('ok');
    expect(gate({ mode: 'guest', progress: read })).toBe('ok');
    expect(gate({ isTeacher: true })).toBe('ok');
  });
  it('tài khoản đã có tiến độ từ trước (chưa có cờ) vào thẳng chợ', () => {
    const old = fresh();
    old.levels[1] = { played: true, completed: true, stars: { de: 3, tb: 3, kho: 3 }, bestScore: 0, updatedAt: 1 };
    expect(gate({ progress: old })).toBe('ok');
  });
  it('hồ sơ chưa tải xong thì chờ, không chuyển trang nhầm cho giáo viên', () => {
    expect(gate({ authLoading: true, isTeacher: false })).toBe('wait');
  });
});
