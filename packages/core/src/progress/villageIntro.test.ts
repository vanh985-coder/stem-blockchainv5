import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEVELS } from '../content/levels';
import { VILLAGE_INTRO, villageIntroTexts } from '../content/villageIntro';
import { decodeProgress, encodeProgress } from './compact';
import { GUEST_COOKIE } from './cookies';
import { ProgressManager, type CookieJar, type KeyValueStore, type RemoteApi } from './manager';
import { mergeGame } from './merge';
import { computeUnlock } from './unlock';
import { emptyProgress, type GameState, type LevelProgress, type Progress } from './types';
import {
  INTRO_SEEN_KEY,
  goldenPageNumber,
  hasSeenIntro,
  introDataFromMask,
  introMask,
  introSeenOf,
  introTasks,
  mergeIntroSeen,
  shouldShowIntro,
  withIntroSeen,
} from './villageIntro';

describe('có hiện giới thiệu làng không', () => {
  it('lần đầu (chưa có cờ) thì hiện; đã xem thì không', () => {
    expect(shouldShowIntro({}, 'lang-giay')).toBe(true);
    expect(shouldShowIntro(undefined, 'lang-giay')).toBe(true);
    const data = withIntroSeen({}, 'lang-giay');
    expect(shouldShowIntro(data, 'lang-giay')).toBe(false);
    expect(hasSeenIntro(data, 'lang-giay')).toBe(true);
  });

  it('mỗi làng một cờ riêng', () => {
    const data = withIntroSeen({}, 'lang-det');
    expect(shouldShowIntro(data, 'lang-det')).toBe(false);
    expect(shouldShowIntro(data, 'lang-giay')).toBe(true);
    expect(shouldShowIntro(data, 'lang-bac')).toBe(true);
  });

  it('withIntroSeen không sửa data cũ và giữ các khóa khác', () => {
    const old = { coQua: 1, [INTRO_SEEN_KEY]: { 'lang-giay': true } };
    const copy = JSON.stringify(old);
    const next = withIntroSeen(old, 'lang-bac');
    expect(JSON.stringify(old)).toBe(copy);
    expect(next.coQua).toBe(1);
    expect(introSeenOf(next)).toEqual({ 'lang-giay': true, 'lang-bac': true });
  });

  it('bỏ qua cờ hỏng hoặc làng lạ', () => {
    expect(introSeenOf({ [INTRO_SEEN_KEY]: 'x' })).toEqual({});
    expect(introSeenOf({ [INTRO_SEEN_KEY]: ['lang-giay'] })).toEqual({});
    expect(introSeenOf({ [INTRO_SEEN_KEY]: { 'lang-la': true, 'lang-giay': 'co' } })).toEqual({});
  });
});

describe('cờ trong cookie chơi thử (số bit) và khi gộp', () => {
  it('số bit đi và về đúng', () => {
    const data = withIntroSeen(withIntroSeen({}, 'lang-giay'), 'lang-bac');
    expect(introMask(data)).toBe(0b1001);
    expect(introSeenOf(introDataFromMask(0b1001))).toEqual({ 'lang-giay': true, 'lang-bac': true });
    expect(introDataFromMask(0)).toEqual({});
    expect(introDataFromMask('bậy')).toEqual({});
  });

  it('dạng gọn của cookie giữ cờ; cookie cũ không có cờ vẫn đọc được', () => {
    const p = emptyProgress();
    p.game.data = withIntroSeen({}, 'lang-det');
    const back = decodeProgress(encodeProgress(p));
    expect(hasSeenIntro(back.game.data, 'lang-det')).toBe(true);
    expect(hasSeenIntro(back.game.data, 'lang-giay')).toBe(false);
    expect(encodeProgress(emptyProgress())).not.toContain('"vi"');
    expect(decodeProgress('{"v":1,"lv":{},"gp":0,"c":0,"u":0}').game.data).toEqual({});
  });

  it('gộp hai bên: làng nào bên nào đã xem thì coi là đã xem, bất kể bên nào mới hơn', () => {
    const local: GameState = { goldenPages: 0, coins: 0, data: withIntroSeen({}, 'lang-giay'), updatedAt: 100 };
    const remote: GameState = { goldenPages: 1, coins: 0, data: { khac: 1, ...withIntroSeen({}, 'lang-bac') }, updatedAt: 500 };
    const merged = mergeGame(local, remote);
    expect(introSeenOf(merged.data)).toEqual({ 'lang-giay': true, 'lang-bac': true });
    expect(merged.data.khac).toBe(1); // phần còn lại theo bản mới hơn như cũ
  });

  it('không có cờ nào thì data giữ nguyên như cũ', () => {
    const a: GameState = { goldenPages: 0, coins: 0, data: { x: 1 }, updatedAt: 1 };
    const b: GameState = { goldenPages: 0, coins: 0, data: { y: 2 }, updatedAt: 2 };
    expect(mergeGame(a, b).data).toEqual({ y: 2 });
    expect(mergeIntroSeen({ x: 1 }, {})).toEqual({ x: 1 });
  });
});

describe('ghép danh sách nhiệm vụ của làng', () => {
  it('đủ 3 màn của làng theo levels.ts, có tên, loại và trạng thái', () => {
    const unlock = computeUnlock({ doneLevels: [] }).levels;
    const tasks = introTasks('lang-giay', unlock);
    expect(tasks.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(tasks.map((t) => t.kind)).toEqual(['lesson', 'game', 'game']);
    expect(tasks[0].ten).toBe(LEVELS[0].ten);
    expect(tasks[0].state).toBe('open');
    expect(tasks[1].state).toBe('coming-soon'); // mốc 1: game chưa ra mắt
  });

  it('trạng thái đổi theo tiến độ: xong bài học thì màn 1 là "xong"', () => {
    const unlock = computeUnlock({ doneLevels: [1] }).levels;
    expect(introTasks('lang-giay', unlock)[0].state).toBe('done');
    const det = introTasks('lang-det', unlock);
    expect(det.map((t) => t.id)).toEqual([4, 5, 6]);
  });

  it('thiếu thông tin trạng thái thì coi là khóa; mỗi làng đúng 3 màn', () => {
    expect(introTasks('lang-bac', []).every((t) => t.state === 'locked')).toBe(true);
    for (const id of ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'] as const) expect(introTasks(id, [])).toHaveLength(3);
  });

  it('Trang Sổ Vàng thứ mấy theo thứ tự làng', () => {
    expect(['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'].map((v) => goldenPageNumber(v as never))).toEqual([1, 2, 3, 4]);
  });
});

describe('lời giới thiệu làng', () => {
  it('người dẫn và lời đúng theo từng làng', () => {
    expect(VILLAGE_INTRO['lang-giay'].guide).toBe('bacAn');
    expect(VILLAGE_INTRO['lang-det'].guide).toBe('cuBinh');
    expect(VILLAGE_INTRO['lang-khac-dau'].guide).toBe('chuDung');
    expect(VILLAGE_INTRO['lang-bac'].guide).toBe('thayLinh');
    for (const v of Object.values(VILLAGE_INTRO)) expect(v.turns).toHaveLength(2);
    expect(VILLAGE_INTRO['lang-giay'].turns[0]).toBe('Chào em! Đây là Làng Giấy. Cả làng làm giấy dó và giữ cuốn sổ giao dịch của chợ phiên.');
    expect(VILLAGE_INTRO['lang-bac'].turns[1]).toBe(
      'Em sẽ học cách gộp nhiều giao dịch thành một cây: chỉ cần một con số ở gốc là biết cả cây có bị sửa hay không.',
    );
    expect(villageIntroTexts.lanCuoi).toBe('Làng có 3 nhiệm vụ cho em. Xong cả ba, làng trao em Trang Sổ Vàng thứ {so}.');
  });
});

// ---------- ProgressManager ----------
class FakeStore implements KeyValueStore {
  data = new Map<string, string>();
  get = (k: string) => this.data.get(k) ?? null;
  set = (k: string, v: string) => void this.data.set(k, v);
  remove = (k: string) => void this.data.delete(k);
}
class FakeCookies implements CookieJar {
  data = new Map<string, string>();
  get = (n: string) => this.data.get(n) ?? null;
  set = (n: string, v: string) => void this.data.set(n, v);
  remove = (n: string) => void this.data.delete(n);
}
class FakeRemote implements RemoteApi {
  account: Progress = emptyProgress();
  gamePushes: GameState[] = [];
  fetchProgress = async () => structuredClone(this.account);
  upsertLevels = async (_u: string, rows: Array<{ levelId: number; progress: LevelProgress }>) => {
    for (const r of rows) this.account.levels[r.levelId] = r.progress;
  };
  upsertGame = async (_u: string, game: GameState) => {
    this.gamePushes.push(structuredClone(game));
    this.account.game = structuredClone(game);
  };
  insertQuizAnswer = async () => {};
}

describe('ProgressManager.markVillageIntroSeen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('chơi thử: cờ nằm trong cookie sc_guest và còn sau khi mở lại trang', async () => {
    const cookies = new FakeCookies();
    const make = () => new ProgressManager({ store: new FakeStore(), cookies, remote: new FakeRemote() });
    const m = make();
    await m.setUser(null);
    m.markVillageIntroSeen('lang-det');
    expect(hasSeenIntro(m.getSnapshot().progress.game.data, 'lang-det')).toBe(true);
    expect(cookies.get(GUEST_COOKIE)).toContain('"vi"');

    const again = make();
    await again.setUser(null);
    expect(shouldShowIntro(again.getSnapshot().progress.game.data, 'lang-det')).toBe(false);
    expect(shouldShowIntro(again.getSnapshot().progress.game.data, 'lang-giay')).toBe(true);
  });

  it('đã đăng nhập: cờ được đẩy lên game_state.data của server', async () => {
    const remote = new FakeRemote();
    const m = new ProgressManager({ store: new FakeStore(), cookies: new FakeCookies(), remote });
    await m.setUser('u-1');
    m.markVillageIntroSeen('lang-giay');
    await vi.advanceTimersByTimeAsync(5000);
    expect(hasSeenIntro(remote.account.game.data, 'lang-giay')).toBe(true);
    expect(remote.gamePushes.length).toBeGreaterThan(0);
  });

  it('đăng nhập ở máy khác: cờ kéo từ server về thì không hiện lại', async () => {
    const remote = new FakeRemote();
    remote.account.game = { goldenPages: 0, coins: 0, data: withIntroSeen({}, 'lang-bac'), updatedAt: 10 };
    const m = new ProgressManager({ store: new FakeStore(), cookies: new FakeCookies(), remote });
    await m.setUser('u-2');
    expect(shouldShowIntro(m.getSnapshot().progress.game.data, 'lang-bac')).toBe(false);
  });

  it('đánh dấu lần hai không làm gì thêm; đang tải thì bỏ qua', async () => {
    const cookies = new FakeCookies();
    const m = new ProgressManager({ store: new FakeStore(), cookies, remote: new FakeRemote() });
    m.markVillageIntroSeen('lang-giay'); // chưa biết ai đang dùng
    expect(cookies.get(GUEST_COOKIE)).toBeNull();
    await m.setUser(null);
    m.markVillageIntroSeen('lang-giay');
    const first = m.getSnapshot();
    m.markVillageIntroSeen('lang-giay');
    expect(m.getSnapshot()).toBe(first);
  });
});
