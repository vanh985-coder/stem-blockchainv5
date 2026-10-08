import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodePending, decodeProgress, encodePending, encodeProgress } from './compact';
import { GUEST_COOKIE, PENDING_COOKIE } from './cookies';
import {
  ProgressManager,
  PUSH_DEBOUNCE_MS,
  SAVE_TIMEOUT_MS,
  userKey,
  type CookieJar,
  type KeyValueStore,
  type RemoteApi,
} from './manager';
import { recordLevelResult } from './record';
import { emptyProgress, type GameState, type LevelProgress, type Progress } from './types';

// ---------- bản giả ----------
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
/** Server giả: mỗi tài khoản một bản; có công tắc mất mạng và nhật ký các lần đẩy. */
class FakeRemote implements RemoteApi {
  online = true;
  hang = false; // treo mãi (để thử quá 5 giây)
  accounts = new Map<string, Progress>();
  levelPushes: Array<{ userId: string; levelId: number; progress: LevelProgress }> = [];
  gamePushes: Array<{ userId: string; game: GameState }> = [];
  quiz: Array<{ userId: string; levelId: number; questionId: string; correct: boolean }> = [];
  fetches: string[] = [];

  private guard = async () => {
    if (this.hang) await new Promise(() => {});
    if (!this.online) throw new TypeError('Failed to fetch');
  };
  account(id: string): Progress {
    if (!this.accounts.has(id)) this.accounts.set(id, emptyProgress());
    return this.accounts.get(id)!;
  }
  fetchProgress = async (userId: string) => {
    await this.guard();
    this.fetches.push(userId);
    return structuredClone(this.account(userId));
  };
  upsertLevels = async (userId: string, rows: Array<{ levelId: number; progress: LevelProgress }>) => {
    await this.guard();
    for (const r of rows) {
      this.levelPushes.push({ userId, ...r });
      this.account(userId).levels[r.levelId] = structuredClone(r.progress);
    }
  };
  upsertGame = async (userId: string, game: GameState) => {
    await this.guard();
    this.gamePushes.push({ userId, game });
    this.account(userId).game = structuredClone(game);
  };
  insertQuizAnswer = async (userId: string, levelId: number, questionId: string, correct: boolean) => {
    await this.guard();
    this.quiz.push({ userId, levelId, questionId, correct });
  };
}

const T0 = 1_700_000_000_000;
let clock = T0;
const tick = () => (clock += 1000);

function setup() {
  const store = new FakeStore();
  const cookies = new FakeCookies();
  const remote = new FakeRemote();
  const make = () => new ProgressManager({ store, cookies, remote, now: tick });
  return { store, cookies, remote, make };
}

const lesson = (m: ProgressManager, id = 1) => m.record(id, { stars: { de: 3, tb: 3, kho: 3 } });
const A = 'aaaaaaaa-0000-4000-8000-000000000001';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';

beforeEach(() => {
  vi.useFakeTimers();
  clock = T0;
});
afterEach(() => vi.useRealTimers());

describe('Tách dữ liệu theo chủ (bảng spec 02, phần Test)', () => {
  it('1. A đăng nhập, chơi, đăng xuất; B đăng nhập trên cùng máy: không có dữ liệu nào của A bị đẩy lên B', async () => {
    const { remote, store, make } = setup();
    const m = make();
    await m.setUser(A);
    lesson(m, 1);
    expect(await m.saveNow()).toBe('saved');
    expect(remote.account(A).levels[1].completed).toBe(true);
    await m.prepareSignOut();
    await m.setUser(null);

    remote.levelPushes.length = 0;
    remote.gamePushes.length = 0;
    await m.setUser(B);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(m.getSnapshot().progress).toEqual(emptyProgress());
    expect(remote.levelPushes.filter((p) => p.userId === B)).toEqual([]);
    expect(remote.gamePushes.filter((p) => p.userId === B)).toEqual([]);
    expect(Object.keys(remote.account(B).levels)).toEqual([]);

    // Dù A "quên" đăng xuất (còn bản ghi của A trên máy), B cũng không đọc hay đẩy được bản của A.
    store.set(userKey(A), JSON.stringify({ v: 1, owner: A, progress: m.getSnapshot().progress }));
    const leftover = recordLevelResult(emptyProgress(), 4, { stars: { de: 3, tb: 3, kho: 3 } }, T0).progress;
    store.set(userKey(A), JSON.stringify({ v: 1, owner: A, progress: leftover }));
    const m2 = make();
    await m2.setUser(B);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(m2.getSnapshot().progress.levels[4]).toBeUndefined();
    expect(remote.levelPushes.filter((p) => p.userId === B)).toEqual([]);
  });

  it('1b. bản ghi nằm ở khóa của B nhưng có owner khác thì bị bỏ qua', async () => {
    const { remote, store, make } = setup();
    const foreign = recordLevelResult(emptyProgress(), 1, { stars: { de: 3, tb: 3, kho: 3 } }, T0).progress;
    store.set(userKey(B), JSON.stringify({ v: 1, owner: A, progress: foreign }));
    const m = make();
    await m.setUser(B);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(m.getSnapshot().progress.levels[1]).toBeUndefined();
    expect(remote.levelPushes).toEqual([]);
  });

  it('2. có bản chơi thử, B đăng nhập, chọn "Không gộp": tiến độ của B không đổi; bản chơi thử bị xóa', async () => {
    const { remote, cookies, make } = setup();
    remote.accounts.set(B, recordLevelResult(emptyProgress(), 4, { stars: { de: 2, tb: 2, kho: 2 } }, T0).progress);
    const before = structuredClone(remote.account(B));
    const m = make();
    await m.setUser(null);
    lesson(m, 1); // chơi thử
    expect(cookies.get(GUEST_COOKIE)).not.toBeNull();

    await m.setUser(B);
    expect(m.getSnapshot().guestPrompt).toBe(true);
    m.discardGuest();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(cookies.get(GUEST_COOKIE)).toBeNull();
    expect(m.getSnapshot().guestPrompt).toBe(false);
    expect(m.getSnapshot().progress.levels[1]).toBeUndefined();
    expect(remote.account(B)).toEqual(before);
    expect(remote.levelPushes).toEqual([]);
  });

  it('3. có bản chơi thử, chọn "Gộp": tiến độ được gộp vào (cả trên server); bản chơi thử bị xóa', async () => {
    const { remote, cookies, make } = setup();
    remote.accounts.set(B, recordLevelResult(emptyProgress(), 4, { stars: { de: 2, tb: 2, kho: 2 } }, T0).progress);
    const m = make();
    await m.setUser(null);
    lesson(m, 1);
    await m.setUser(B);
    m.mergeGuest();
    await vi.advanceTimersByTimeAsync(PUSH_DEBOUNCE_MS + 100);
    expect(cookies.get(GUEST_COOKIE)).toBeNull();
    const p = m.getSnapshot().progress;
    expect(p.levels[1].completed).toBe(true);
    expect(p.levels[4].stars).toEqual({ de: 2, tb: 2, kho: 2 });
    expect(remote.account(B).levels[1].completed).toBe(true);
    expect(remote.account(B).levels[4].stars).toEqual({ de: 2, tb: 2, kho: 2 });
  });

  it('4. đăng xuất: sochung.v3.u.<id> không còn (và sc_pending của người đó)', async () => {
    const { remote, store, cookies, make } = setup();
    const m = make();
    await m.setUser(A);
    lesson(m);
    expect(store.get(userKey(A))).not.toBeNull();
    expect(JSON.parse(store.get(userKey(A))!).owner).toBe(A);
    remote.online = false;
    expect(await m.saveNow()).toBe('pending');
    expect(cookies.get(PENDING_COOKIE)).not.toBeNull();
    await m.prepareSignOut();
    expect(store.get(userKey(A))).toBeNull();
    expect(cookies.get(PENDING_COOKIE)).toBeNull();
    expect(m.getSnapshot().userId).toBeNull();
  });

  it('4b. đăng xuất không xóa sc_pending của người khác', async () => {
    const { store, cookies, make } = setup();
    cookies.set(PENDING_COOKIE, encodePending(recordLevelResult(emptyProgress(), 1, { stars: { de: 3 } }, T0).progress, B));
    const m = make();
    await m.setUser(A);
    await m.prepareSignOut();
    expect(cookies.get(PENDING_COOKIE)).not.toBeNull();
    expect(store.get(userKey(A))).toBeNull();
  });

  it('5. mở app, server có coins mới hơn bản trên máy: lấy theo server; không đẩy bản cũ đè lên', async () => {
    const { remote, store, make } = setup();
    const local = recordLevelResult(emptyProgress(), 1, { stars: { de: 1 } }, T0).progress; // coins 10, updatedAt T0
    store.set(userKey(A), JSON.stringify({ v: 1, owner: A, progress: local }));
    const server = emptyProgress();
    server.game = { goldenPages: 0, coins: 500, data: { x: 1 }, updatedAt: T0 + 60_000 };
    remote.accounts.set(A, server);

    const m = make();
    await m.setUser(A);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(m.getSnapshot().progress.game.coins).toBe(500);
    expect(m.getSnapshot().progress.game.data).toEqual({ x: 1 });
    expect(remote.account(A).game.coins).toBe(500);
    expect(remote.gamePushes.filter((g) => g.game.coins === 10)).toEqual([]); // bản cũ không đè lên
    // phần sao thì máy có mà server chưa có nên được đẩy lên
    expect(remote.account(A).levels[1].stars.de).toBe(1);
  });
});

describe('Đồng bộ: kéo trước, đẩy sau, 2 giây, hàng chờ', () => {
  it('chưa kéo xong thì không đẩy gì; kéo xong mới đẩy', async () => {
    const { remote, store, make } = setup();
    const local = recordLevelResult(emptyProgress(), 1, { stars: { de: 3 } }, T0).progress;
    store.set(userKey(A), JSON.stringify({ v: 1, owner: A, progress: local }));
    remote.online = false;
    const m = make();
    await m.setUser(A);
    m.record(1, { stars: { tb: 2 } });
    await vi.advanceTimersByTimeAsync(PUSH_DEBOUNCE_MS + 100);
    expect(remote.levelPushes).toEqual([]);
    expect(m.getSnapshot().synced).toBe(false);
    remote.online = true;
    await m.notifyOnline();
    expect(m.getSnapshot().synced).toBe(true);
    expect(remote.account(A).levels[1].stars).toEqual({ de: 3, tb: 2 });
  });

  it('chơi: ghi máy ngay, đẩy lên sau 2 giây không có thay đổi mới (gộp nhiều thay đổi thành một lần)', async () => {
    const { remote, store, make } = setup();
    const m = make();
    await m.setUser(A);
    m.record(1, { stars: { de: 1 } });
    expect(JSON.parse(store.get(userKey(A))!).progress.levels[1].stars.de).toBe(1); // máy: ngay
    await vi.advanceTimersByTimeAsync(1500);
    expect(remote.levelPushes).toHaveLength(0);
    m.record(1, { stars: { tb: 1 } }); // thay đổi mới: đếm lại 2 giây
    await vi.advanceTimersByTimeAsync(1500);
    expect(remote.levelPushes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(600);
    expect(remote.levelPushes).toHaveLength(1);
    expect(remote.account(A).levels[1].stars).toEqual({ de: 1, tb: 1 });
  });

  it('mất mạng thì xếp hàng, có mạng lại tự gửi', async () => {
    const { remote, make } = setup();
    const m = make();
    await m.setUser(A);
    remote.online = false;
    m.record(2, { stars: { game: 2 }, score: 50 });
    await vi.advanceTimersByTimeAsync(PUSH_DEBOUNCE_MS + 100);
    expect(remote.levelPushes).toHaveLength(0);
    remote.online = true;
    await m.notifyOnline();
    expect(remote.account(A).levels[2].bestScore).toBe(50);
    // gửi rồi thì không gửi lại lần nữa
    const n = remote.levelPushes.length;
    await m.notifyOnline();
    expect(remote.levelPushes.length).toBe(n);
  });

  it('chơi thử: không đụng tới server, tiến độ nằm ở cookie sc_guest', async () => {
    const { remote, store, cookies, make } = setup();
    const m = make();
    await m.setUser(null);
    lesson(m, 1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(remote.fetches).toEqual([]);
    expect(remote.levelPushes).toEqual([]);
    expect(store.data.size).toBe(0);
    expect(decodeProgress(cookies.get(GUEST_COOKIE)).levels[1].completed).toBe(true);
    expect(await m.saveNow()).toBe('saved');
    // trang khác (hub) đọc lại được từ cookie
    const other = make();
    await other.setUser(null);
    expect(other.getSnapshot().progress.levels[1].completed).toBe(true);
  });
});

describe('saveNow và sc_pending', () => {
  it('đẩy xong thì "saved", không có sc_pending', async () => {
    const { remote, cookies, make } = setup();
    const m = make();
    await m.setUser(A);
    lesson(m);
    const status = m.saveNow();
    expect(m.getSnapshot().saving).toBe(true);
    expect(await status).toBe('saved');
    expect(m.getSnapshot().saving).toBe(false);
    expect(cookies.get(PENDING_COOKIE)).toBeNull();
    expect(remote.account(A).levels[1].completed).toBe(true);
  });

  it('mất mạng: ghi sc_pending rồi cho rời trang; trang sau (đúng chủ) đẩy lên và xóa sc_pending', async () => {
    const { remote, cookies, make } = setup();
    const m = make();
    await m.setUser(A);
    remote.online = false;
    lesson(m, 4);
    expect(await m.saveNow()).toBe('pending');
    const pending = decodePending(cookies.get(PENDING_COOKIE));
    expect(pending?.owner).toBe(A);
    expect(pending?.progress.levels[4].completed).toBe(true);

    // mở trang mới (máy khác nguồn: không có localStorage), đã có mạng
    remote.online = true;
    const fresh = new ProgressManager({ store: new FakeStore(), cookies, remote, now: tick });
    await fresh.setUser(A);
    await vi.advanceTimersByTimeAsync(100);
    expect(remote.account(A).levels[4].completed).toBe(true);
    expect(cookies.get(PENDING_COOKIE)).toBeNull();
  });

  it('sc_pending của chủ khác: không đọc, không đẩy, không xóa', async () => {
    const { remote, cookies, make } = setup();
    cookies.set(PENDING_COOKIE, encodePending(recordLevelResult(emptyProgress(), 4, { stars: { de: 3, tb: 3, kho: 3 } }, T0).progress, A));
    const m = make();
    await m.setUser(B);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(remote.levelPushes).toEqual([]);
    expect(m.getSnapshot().progress.levels[4]).toBeUndefined();
    expect(cookies.get(PENDING_COOKIE)).not.toBeNull();
  });

  it('quá 5 giây chưa xong: ghi sc_pending rồi cho rời trang', async () => {
    const { remote, cookies, make } = setup();
    const m = make();
    await m.setUser(A);
    remote.hang = true;
    lesson(m);
    const status = m.saveNow();
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS + 50);
    expect(await status).toBe('pending');
    expect(cookies.get(PENDING_COOKIE)).not.toBeNull();
  });

  it('chưa kéo được tiến độ (mất mạng từ đầu): vẫn ghi sc_pending, không đẩy gì', async () => {
    const { remote, cookies, make } = setup();
    remote.online = false;
    const m = make();
    await m.setUser(A);
    lesson(m);
    expect(await m.saveNow()).toBe('pending');
    expect(decodePending(cookies.get(PENDING_COOKIE))?.owner).toBe(A);
    expect(remote.levelPushes).toEqual([]);
  });
});

describe('Đăng xuất: đẩy nốt tối đa 3 giây', () => {
  it('còn thay đổi chờ thì đẩy nốt trước khi xóa', async () => {
    const { remote, store, make } = setup();
    const m = make();
    await m.setUser(A);
    lesson(m, 1);
    await m.prepareSignOut();
    expect(remote.account(A).levels[1].completed).toBe(true);
    expect(store.get(userKey(A))).toBeNull();
  });

  it('treo mạng thì chờ tối đa 3 giây rồi vẫn xóa dữ liệu trên máy', async () => {
    const { remote, store, make } = setup();
    const m = make();
    await m.setUser(A);
    lesson(m);
    remote.hang = true;
    const out = m.prepareSignOut();
    await vi.advanceTimersByTimeAsync(3050);
    await out;
    expect(store.get(userKey(A))).toBeNull();
  });
});

describe('Câu trả lời trắc nghiệm', () => {
  it('đã đăng nhập thì ghi một dòng quiz_answers; chơi thử thì không', async () => {
    const { remote, make } = setup();
    const m = make();
    await m.setUser(null);
    await m.recordQuizAnswer(0, 'B1-01', true);
    expect(remote.quiz).toEqual([]);
    await m.setUser(A);
    await m.recordQuizAnswer(2, 'B1-02', false);
    expect(remote.quiz).toEqual([{ userId: A, levelId: 2, questionId: 'B1-02', correct: false }]);
  });

  it('mất mạng thì bỏ qua, không lỗi', async () => {
    const { remote, make } = setup();
    const m = make();
    await m.setUser(A);
    remote.online = false;
    await expect(m.recordQuizAnswer(2, 'B1-02', true)).resolves.toBeUndefined();
  });
});

describe('Chơi thử: cookie dạng gọn dùng chung', () => {
  it('startGuest tạo cookie rỗng, không ghi đè tiến độ có sẵn', () => {
    const { cookies, make } = setup();
    const m = make();
    m.startGuest();
    expect(cookies.get(GUEST_COOKIE)).toBe(encodeProgress(emptyProgress()));
    cookies.set(GUEST_COOKIE, 'giữ nguyên');
    m.startGuest();
    expect(cookies.get(GUEST_COOKIE)).toBe('giữ nguyên');
  });
});
