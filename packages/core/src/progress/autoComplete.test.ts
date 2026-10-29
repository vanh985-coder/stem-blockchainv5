import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canSeeTeacherPage, canUseAutoComplete } from '../auth/roles';
import { LEVELS, VILLAGE_ORDER, levelsOfVillage } from '../content/levels';
import { decodeProgress, encodeProgress } from './compact';
import { GUEST_COOKIE } from './cookies';
import { classifyAutoError } from './autoError';
import { ProgressManager, PUSH_DEBOUNCE_MS, type CookieJar, type KeyValueStore, type RemoteApi } from './manager';
import { mergeProgress, sameLevel } from './merge';
import { levelFromRow, levelToRow, type LevelRow } from './remote';
import { autoCompleteLevel, autoLevels, doneLevels, recordLevelResult, unlockOf, withGoldenPages } from './record';
import { emptyProgress, isRealDone, type GameState, type LevelProgress, type Progress } from './types';
import { cellText, levelCell, buildProgressTable, progressRowText, type ClassProgressRow } from '../teacher/progress';

const T0 = 1_700_000_000_000;
const real = (p: Progress, id: number, t = 0): Progress => {
  const lesson = LEVELS.find((l) => l.id === id)!.kind === 'lesson';
  return recordLevelResult(p, id, lesson ? { stars: { de: 3, tb: 3, kho: 3 } } : { score: 100, stars: { game: 2 } }, T0 + t).progress;
};
const unlockHonor = (p: Progress, isTeacher = false) => unlockOf(p, { isTeacher, honorAuto: true });
const state = (p: Progress, id: number, honor = true) => (honor ? unlockHonor(p) : unlockOf(p)).levels.find((l) => l.id === id)!;

describe('autoCompleteLevel (P3b): chỉ ghi cờ', () => {
  it('đủ 12 màn: đặt cờ, KHÔNG tạo điểm, sao, huy chương, xu hay Trang Sổ Vàng; played/completed giữ false', () => {
    for (const def of LEVELS) {
      const p = autoCompleteLevel(emptyProgress(), def.id, T0);
      const lv = p.levels[def.id];
      expect(lv, `màn ${def.id}`).toEqual({ played: false, completed: false, stars: {}, bestScore: 0, updatedAt: T0, auto: true });
      expect(p.game).toEqual(emptyProgress().game);
      expect(Object.keys(p.levels)).toEqual([String(def.id)]);
      expect(isRealDone(def.kind, lv)).toBe(false);
      expect(doneLevels(p)).toEqual([]); // không phải hoàn thành thật
      expect(autoLevels(p)).toEqual([def.id]);
    }
  });

  it('bấm lặp: không đổi gì, không tạo bản ghi hay thời điểm mới', () => {
    const once = autoCompleteLevel(emptyProgress(), 5, T0);
    const twice = autoCompleteLevel(once, 5, T0 + 9999);
    expect(twice).toBe(once);
    expect(Object.keys(twice.levels)).toHaveLength(1);
  });

  it('màn đã xong thật: không đặt cờ, thành tích thật giữ nguyên (không bị ghi đè)', () => {
    const done = real(emptyProgress(), 5);
    const p = autoCompleteLevel(done, 5, T0 + 50);
    expect(p).toBe(done);
    expect(p.levels[5].stars).toEqual({ game: 2 });
    expect(p.levels[5].bestScore).toBe(100);
    expect(p.levels[5].auto).toBeUndefined();
  });

  it('màn đã chơi dở (bài học mới có 1 trạm): đặt cờ nhưng giữ nguyên sao và điểm thật', () => {
    const partial = recordLevelResult(emptyProgress(), 1, { stars: { de: 2 } }, T0).progress;
    const p = autoCompleteLevel(partial, 1, T0 + 5);
    expect(p.levels[1]).toMatchObject({ stars: { de: 2 }, completed: false, auto: true });
    expect(p.game.coins).toBe(partial.game.coins);
  });

  it('màn không hợp lệ: trả nguyên', () => {
    const e = emptyProgress();
    expect(autoCompleteLevel(e, 0, T0)).toBe(e);
    expect(autoCompleteLevel(e, 13, T0)).toBe(e);
  });
});

describe('tự hoàn thành và điều kiện mở màn, Trang Sổ Vàng, cao trào', () => {
  it('cho đi tiếp theo điều kiện mở màn hiện có: bài học tự hoàn thành mở game 1, game 1 mở game 2; làng khác không đổi', () => {
    let p = autoCompleteLevel(emptyProgress(), 10, T0);
    expect(state(p, 10)).toEqual({ id: 10, state: 'done', auto: true });
    expect(state(p, 11).state).toBe('open');
    expect(state(p, 12)).toEqual({ id: 12, state: 'locked', lockedBy: 11 });
    p = autoCompleteLevel(p, 11, T0 + 1);
    expect(state(p, 12).state).toBe('open');
    expect(state(p, 2).state).toBe('locked'); // làng Giấy không bị ảnh hưởng
    expect(state(p, 1).state).toBe('open');
  });

  it('QUY TẮC: tự hoàn thành KHÔNG trao Trang Sổ Vàng (kể cả xong cả làng) và không mở cao trào; chỉ hoàn thành thật mới tính', () => {
    let p = emptyProgress();
    for (const id of [1, 2, 3]) p = autoCompleteLevel(p, id, T0 + id);
    expect(unlockHonor(p).goldenPages).toBe(0);
    expect(withGoldenPages(p, T0).game.goldenPages).toBe(0);
    for (const id of [4, 5, 6, 7, 8, 9, 10, 11, 12]) p = autoCompleteLevel(p, id, T0 + id);
    expect(unlockHonor(p).levels.every((l) => l.state === 'done' && l.auto)).toBe(true);
    expect(unlockHonor(p).goldenPages).toBe(0);
    expect(p.game.goldenPages).toBe(0);
    expect(p.game.coins).toBe(0);
    // hoàn thành thật làng Giấy thì được trang 1 như cũ, không bị tự hoàn thành làng khác cản hay thêm
    let q = autoCompleteLevel(emptyProgress(), 4, T0);
    for (const id of [1, 2, 3]) q = real(q, id, id);
    expect(withGoldenPages(q, T0).game.goldenPages).toBe(1);
  });

  it('cờ chỉ có hiệu lực khi được phép (giáo viên/bản dev): học sinh và khách ở bản phát hành bỏ qua cờ', () => {
    const p = autoCompleteLevel(emptyProgress(), 1, T0);
    expect(state(p, 1, false)).toEqual({ id: 1, state: 'open' });
    expect(state(p, 2, false).state).toBe('locked');
    expect(state(p, 2, true).state).toBe('open');
  });

  it('giáo viên: màn có cờ hiện done (kèm auto), các màn khác vẫn mở như cũ', () => {
    const p = autoCompleteLevel(emptyProgress(), 1, T0);
    const r = unlockOf(p, { isTeacher: true, honorAuto: true });
    expect(r.levels.find((l) => l.id === 1)).toEqual({ id: 1, state: 'done', auto: true });
    expect(r.levels.filter((l) => l.state === 'locked')).toEqual([]);
  });

  it('chơi thật sau đó lưu bình thường: sao, điểm, xu cộng đúng; cờ không ghi đè và hoàn thành thật thắng', () => {
    let p = autoCompleteLevel(emptyProgress(), 5, T0);
    p = real(p, 5, 10);
    const lv = p.levels[5];
    expect(lv).toMatchObject({ played: true, bestScore: 100, stars: { game: 2 }, auto: true });
    expect(p.game.coins).toBe(20); // 2 sao mới × 10, đúng như chơi thường
    expect(autoLevels(p)).toEqual([]); // đã xong thật: không còn là "chỉ tự hoàn thành"
    expect(state(p, 5)).toEqual({ id: 5, state: 'done' }); // không có auto: hoàn thành thật thắng
    const again = autoCompleteLevel(p, 5, T0 + 99);
    expect(again).toBe(p);
  });

  it('thành tích thật có trước không bị ghi đè khi bấm tự hoàn thành ở màn khác hay ở chính màn đó', () => {
    const before = real(real(emptyProgress(), 1, 1), 2, 2);
    const after = autoCompleteLevel(autoCompleteLevel(before, 1, T0 + 5), 3, T0 + 6);
    expect(after.levels[1]).toEqual(before.levels[1]);
    expect(after.levels[2]).toEqual(before.levels[2]);
    expect(after.game).toEqual(before.game);
    expect(after.levels[3]).toMatchObject({ auto: true, stars: {}, bestScore: 0 });
  });
});

describe('lưu và đồng bộ cờ', () => {
  const lvWith = (auto: boolean): LevelProgress => ({ played: false, completed: false, stars: {}, bestScore: 0, updatedAt: T0, ...(auto ? { auto: true as const } : {}) });

  it('gộp: bên nào có cờ thì có; thành tích thật vẫn lấy lớn hơn', () => {
    const a = { ...lvWith(true), stars: { game: 1 }, bestScore: 40, played: true };
    const b = { ...lvWith(false), stars: { game: 3 }, bestScore: 90, played: true };
    const m = mergeProgress({ levels: { 5: a }, game: emptyProgress().game }, { levels: { 5: b }, game: emptyProgress().game }).levels[5];
    expect(m).toMatchObject({ auto: true, stars: { game: 3 }, bestScore: 90, played: true });
    expect(sameLevel(lvWith(true), lvWith(false))).toBe(false);
    expect(sameLevel(lvWith(true), lvWith(true))).toBe(true);
  });

  it('cookie khách: cờ đi qua mã hóa rồi đọc lại (đủ 12 màn, kể cả màn chỉ có cờ), thành tích thật giữ nguyên', () => {
    let p = emptyProgress();
    for (const def of LEVELS) p = autoCompleteLevel(p, def.id, T0);
    const back = decodeProgress(encodeProgress(p));
    for (const def of LEVELS) expect(back.levels[def.id].auto, `màn ${def.id}`).toBe(true);
    const mixed = autoCompleteLevel(real(emptyProgress(), 2, 1), 3, T0 + 2);
    const mb = decodeProgress(encodeProgress(mixed));
    expect(mb.levels[2].auto).toBeUndefined();
    expect(mb.levels[2].played).toBe(true);
    expect(mb.levels[3].auto).toBe(true);
    // không có cờ thì cookie không thêm trường nào
    expect(encodeProgress(real(emptyProgress(), 1))).not.toContain('"ac"');
  });

  it('bảng Supabase: chỉ gửi auto_completed khi true (bảng cũ chưa có cột và học sinh không bao giờ gửi); đọc lại có cờ', () => {
    expect(levelToRow('u', 1, lvWith(false))).not.toHaveProperty('auto_completed');
    expect(levelToRow('u', 1, lvWith(true))).toMatchObject({ auto_completed: true, played: false, completed: false, best_score: 0, stars: {} });
    const row: LevelRow = { level_id: 1, played: false, completed: false, stars: {}, best_score: 0, updated_at: new Date(T0).toISOString(), auto_completed: true };
    expect(levelFromRow(row).auto).toBe(true);
    expect(levelFromRow({ ...row, auto_completed: false }).auto).toBeUndefined();
    const { auto_completed: _omit, ...oldRow } = row;
    expect(levelFromRow(oldRow).auto).toBeUndefined();
  });
});

// ---------- manager với bản giả ----------
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
  pushes: Array<{ levelId: number; progress: LevelProgress }> = [];
  fetchProgress = async () => structuredClone(this.account);
  upsertLevels = async (_u: string, rows: Array<{ levelId: number; progress: LevelProgress }>) => {
    for (const r of rows) {
      this.pushes.push(structuredClone(r));
      this.account.levels[r.levelId] = structuredClone(r.progress);
    }
  };
  upsertGame = async (_u: string, g: GameState) => void (this.account.game = structuredClone(g));
  insertQuizAnswer = async () => {};
}

describe('ProgressManager: quyền và luồng lưu', () => {
  let remote: FakeRemote;
  let store: FakeStore;
  let cookies: FakeCookies;
  const make = () => new ProgressManager({ store, cookies, remote, now: () => T0 });
  beforeEach(() => {
    vi.useFakeTimers();
    remote = new FakeRemote();
    store = new FakeStore();
    cookies = new FakeCookies();
  });
  afterEach(() => vi.useRealTimers());

  it('không được phép (học sinh/khách ở bản phát hành): autoComplete không làm gì, không ghi, không đẩy', async () => {
    const m = make();
    await m.setUser('student');
    expect(await m.requestAutoComplete(1)).toBe('unavailable');
    expect(m.getSnapshot().progress.levels).toEqual({});
    await vi.advanceTimersByTimeAsync(PUSH_DEBOUNCE_MS + 10);
    expect(remote.pushes).toEqual([]);
  });

  it('được phép (giáo viên): ghi cờ qua luồng lưu hiện có, đẩy đúng một bản ghi; bấm lặp không đẩy thêm', async () => {
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    expect(await m.requestAutoComplete(7)).toBe('done');
    expect(await m.requestAutoComplete(7)).toBe('noop');
    expect(await m.requestAutoComplete(7)).toBe('noop');
    await vi.advanceTimersByTimeAsync(PUSH_DEBOUNCE_MS + 10);
    expect(remote.pushes).toHaveLength(1);
    expect(remote.pushes[0]).toMatchObject({ levelId: 7, progress: { auto: true, played: false, completed: false, stars: {}, bestScore: 0 } });
    expect(remote.account.game.coins).toBe(0);
    expect(m.unlock(false).levels.find((l) => l.id === 8)?.state).toBe('open');
  });

  it('tải lại và đồng bộ: cờ đã lưu ở máy chủ được kéo về, giữ nguyên', async () => {
    remote.account.levels[7] = { played: false, completed: false, stars: {}, bestScore: 0, updatedAt: T0, auto: true };
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    expect(m.getSnapshot().progress.levels[7].auto).toBe(true);
    expect(m.unlock(false).levels.find((l) => l.id === 7)).toEqual({ id: 7, state: 'done', auto: true });
    const m2 = make(); // mở lại trang: bản trên máy
    m2.setAutoAllowed(true);
    await m2.setUser('teacher');
    expect(m2.getSnapshot().progress.levels[7].auto).toBe(true);
  });

  it('học sinh không đẩy được cờ lên máy chủ dù cờ lọt vào tiến độ trên máy (cookie giả, dữ liệu cũ)', async () => {
    store.set('sochung.v3.u.student', JSON.stringify({ v: 1, owner: 'student', progress: { levels: { 3: { played: true, completed: false, stars: { game: 1 }, bestScore: 5, updatedAt: T0, auto: true } }, game: emptyProgress().game } }));
    const m = make();
    await m.setUser('student');
    expect(m.unlock(false).levels.find((l) => l.id === 3)).toEqual({ id: 3, state: 'done' }); // đã chơi thật: không phải auto, và cờ bị bỏ qua
    await m.flush();
    expect(remote.pushes.length).toBeGreaterThan(0);
    for (const push of remote.pushes) expect(push.progress.auto).toBeFalsy(); // thành tích thật vẫn đẩy, cờ thì không
    expect(remote.account.levels[3].stars).toEqual({ game: 1 });
  });

  it('chơi thử (khách) ở bản dev: cờ nằm trong cookie sc_guest, đọc lại đúng', async () => {
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser(null);
    expect(await m.requestAutoComplete(4)).toBe('done');
    const raw = cookies.get(GUEST_COOKIE)!;
    expect(decodeProgress(raw).levels[4].auto).toBe(true);
    const m2 = make();
    await m2.setUser(null);
    expect(m2.getSnapshot().progress.levels[4].auto).toBe(true);
    expect(m2.unlock(false).levels.find((l) => l.id === 5)?.state).toBe('locked'); // khách bản phát hành: bỏ qua cờ
  });
});

describe('quyền thấy nút', () => {
  it('giáo viên/admin và bản dev thì có; học sinh, khách, chưa tải hồ sơ ở bản phát hành thì không', () => {
    expect(canUseAutoComplete('teacher', false)).toBe(true);
    expect(canUseAutoComplete('admin', false)).toBe(true);
    expect(canUseAutoComplete('student', false)).toBe(false);
    expect(canUseAutoComplete(null, false)).toBe(false);
    expect(canUseAutoComplete(undefined, false)).toBe(false);
    expect(canUseAutoComplete('student', true)).toBe(true);
    expect(canUseAutoComplete('weird', false)).toBe(false);
    expect(canSeeTeacherPage('student')).toBe(false);
  });
});

describe('trang giáo viên phân biệt hoàn thành thật và tự hoàn thành', () => {
  const row = (over: Partial<ClassProgressRow>): ClassProgressRow => ({ student_id: 's1', display_name: 'An', level_id: 5, played: false, completed: false, stars: {}, best_score: 0, updated_at: new Date(T0).toISOString(), golden_pages: 0, auto_completed: false, ...over });
  const game5 = LEVELS.find((l) => l.id === 5)!;
  const lesson4 = LEVELS.find((l) => l.id === 4)!;

  it('ô chỉ có cờ: "Tự hoàn thành"; ô hoàn thành thật không bị che bởi cờ; có cả hai (chơi dở) thì kèm hậu tố', () => {
    const [s] = buildProgressTable([row({ auto_completed: true }), row({ level_id: 4, auto_completed: true, stars: { de: 2 }, played: true }), row({ level_id: 6, played: true, completed: true, stars: { game: 3 }, auto_completed: true })]);
    expect(cellText(levelCell(game5, s.levels[5]))).toBe('⏭ Tự hoàn thành');
    expect(cellText(levelCell(lesson4, s.levels[4]))).toBe('★2 ★0 ★0 · tự hoàn thành');
    const game6 = LEVELS.find((l) => l.id === 6)!;
    expect(cellText(levelCell(game6, s.levels[6]))).toBe('✓ vàng'); // đã xong thật: không hiện cờ
    expect(cellText(levelCell(game5, undefined))).toBe('');
  });

  it('cờ tự hoàn thành không tính là "đã chơi gần nhất" và máy chủ cũ chưa có cột vẫn đọc được', () => {
    const [s] = buildProgressTable([row({ auto_completed: true })]);
    expect(s.lastPlayed).toBeNull();
    const old = row({});
    delete (old as Partial<ClassProgressRow>).auto_completed;
    expect(buildProgressTable([old])[0].levels[5].auto).toBe(false);
  });
});

describe('mọi làng: tự hoàn thành đủ cả làng chỉ mở theo thứ tự trong làng', () => {
  it('từng làng: tự hoàn thành lần lượt thì lần lượt mở', () => {
    for (const village of VILLAGE_ORDER) {
      const ids = levelsOfVillage(village).map((l) => l.id);
      let p = emptyProgress();
      ids.forEach((id, i) => {
        expect(state(p, id).state, `${village} màn ${id}`).toBe('open');
        if (i + 1 < ids.length) expect(state(p, ids[i + 1]).state).toBe('locked');
        p = autoCompleteLevel(p, id, T0 + i);
      });
      expect(ids.every((id) => state(p, id).state === 'done')).toBe(true);
    }
  });
});

describe('tương thích khi máy chủ chưa chạy migration 0003 (P3b hoàn thiện)', () => {
  /** Máy chủ giả có thể: chưa có cột (mọi hàng có cờ bị từ chối như Postgres 42703), từ chối người dùng (trigger), hay mất mạng riêng đường cờ. */
  class StrictRemote extends FakeRemote {
    mode: 'ok' | 'no-column' | 'forbidden' | 'offline-auto' = 'ok';
    probe: 'ok' | 'throw' = 'ok';
    upsertLevels = async (_u: string, rows: Array<{ levelId: number; progress: LevelProgress }>) => {
      if (rows.some((r) => r.progress.auto)) {
        if (this.mode === 'no-column') throw { code: '42703', message: 'column "auto_completed" of relation "level_progress" does not exist' };
        if (this.mode === 'forbidden') throw { code: 'P0001', message: 'Chỉ giáo viên mới dùng được tự hoàn thành' };
        if (this.mode === 'offline-auto') throw new TypeError('Failed to fetch');
      }
      this.attempts.push(rows.map((r) => r.levelId));
      for (const r of rows) {
        this.pushes.push(structuredClone(r));
        this.account.levels[r.levelId] = structuredClone(r.progress);
      }
    };
    attempts: number[][] = [];
    supportsAutoComplete = async () => {
      if (this.probe === 'throw') throw new TypeError('Failed to fetch');
      return this.mode !== 'no-column';
    };
  }
  let remote: StrictRemote;
  let store: FakeStore;
  let cookies: FakeCookies;
  const make = () => new ProgressManager({ store, cookies, remote, now: () => T0 });
  beforeEach(() => {
    vi.useFakeTimers();
    remote = new StrictRemote();
    store = new FakeStore();
    cookies = new FakeCookies();
  });
  afterEach(() => vi.useRealTimers());

  it('máy chủ chưa hỗ trợ (thăm dò báo thiếu cột): nút vô hiệu (autoStatus no), bấm không ghi gì, KHÔNG báo đã lưu; tiến độ chơi thật vẫn lưu và đồng bộ', async () => {
    remote.mode = 'no-column';
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    await vi.advanceTimersByTimeAsync(10);
    expect(m.getSnapshot().autoStatus).toBe('no');
    expect(await m.requestAutoComplete(7)).toBe('unsupported');
    expect(m.getSnapshot().progress.levels[7]).toBeUndefined();
    m.record(2, { score: 100, stars: { game: 2 } });
    expect(await m.saveNow()).toBe('saved');
    expect(remote.account.levels[2]).toMatchObject({ played: true, bestScore: 100, stars: { game: 2 } });
    expect(remote.account.game.coins).toBe(20);
  });

  it('thăm dò chưa xác định (mất mạng) rồi đẩy báo thiếu cột: cờ bị gỡ khỏi máy, trạng thái no, và thành tích thật CÙNG LẦN ĐẨY vẫn lên máy chủ (không lỗi dây chuyền)', async () => {
    remote.mode = 'no-column';
    remote.probe = 'throw';
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    await vi.advanceTimersByTimeAsync(10);
    expect(m.getSnapshot().autoStatus).toBe('unknown');
    m.record(2, { score: 100, stars: { game: 2 } });
    const r = await m.requestAutoComplete(7);
    expect(r).toBe('unsupported'); // KHÔNG phải 'done'
    expect(m.getSnapshot().autoStatus).toBe('no');
    expect(m.getSnapshot().progress.levels[7]?.auto).toBeUndefined(); // không giả vờ đã lưu
    expect(remote.account.levels[2]).toMatchObject({ played: true, bestScore: 100 }); // thật vẫn lưu
    expect(remote.account.levels[7]).toBeUndefined();
    // các lần đẩy sau không còn thử cờ nữa và tiến độ thật tiếp tục đồng bộ
    m.record(3, { score: 50, stars: { game: 1 } });
    expect(await m.saveNow()).toBe('saved');
    expect(remote.account.levels[3]).toMatchObject({ played: true, bestScore: 50 });
  });

  it('máy chủ từ chối (trigger): trạng thái rejected, cờ gỡ khỏi máy, KHÔNG báo đã lưu, thành tích thật vẫn lưu', async () => {
    remote.mode = 'forbidden';
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    await vi.advanceTimersByTimeAsync(10);
    m.record(2, { score: 100, stars: { game: 2 } });
    expect(await m.requestAutoComplete(7)).toBe('rejected');
    expect(m.getSnapshot().autoStatus).toBe('rejected');
    expect(m.getSnapshot().progress.levels[7]?.auto).toBeUndefined();
    expect(remote.account.levels[2]?.played).toBe(true);
    expect(await m.requestAutoComplete(8)).toBe('rejected'); // không thử lại
    expect(m.getSnapshot().progress.levels[8]).toBeUndefined();
  });

  it('mất mạng riêng ở đường cờ: kết quả "pending" (đã ghi ở máy, CHƯA lưu), cờ giữ lại; có mạng lại thì đẩy tiếp và hết pending', async () => {
    remote.mode = 'offline-auto';
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    await vi.advanceTimersByTimeAsync(10);
    expect(await m.requestAutoComplete(7)).toBe('pending');
    expect(m.getSnapshot().progress.levels[7].auto).toBe(true);
    expect(remote.account.levels[7]).toBeUndefined();
    remote.mode = 'ok';
    expect(await m.flush()).toBe(true);
    expect(remote.account.levels[7]).toMatchObject({ auto: true });
  });

  it('chơi thật rồi tự hoàn thành ở máy chủ có hỗ trợ: đúng một hàng cho mỗi màn, không bản ghi trùng', async () => {
    const m = make();
    m.setAutoAllowed(true);
    await m.setUser('teacher');
    await vi.advanceTimersByTimeAsync(10);
    m.record(2, { score: 100, stars: { game: 2 } });
    await m.saveNow();
    expect(await m.requestAutoComplete(3)).toBe('done');
    expect(await m.requestAutoComplete(3)).toBe('noop');
    await vi.advanceTimersByTimeAsync(PUSH_DEBOUNCE_MS + 10);
    const sent = remote.attempts.flat();
    expect(sent.filter((id) => id === 3)).toHaveLength(1);
    expect(Object.keys(remote.account.levels).sort()).toEqual(['2', '3']);
  });
});

describe('classifyAutoError (thông báo lỗi thật của Postgres/PostgREST)', () => {
  it('thiếu cột → missing-column', () => {
    expect(classifyAutoError({ code: '42703', message: 'column "auto_completed" of relation "level_progress" does not exist' })).toBe('missing-column');
    expect(classifyAutoError({ code: 'PGRST204', message: "Could not find the 'auto_completed' column of 'level_progress' in the schema cache" })).toBe('missing-column');
    expect(classifyAutoError({ message: 'column level_progress.auto_completed does not exist' })).toBe('missing-column');
  });
  it('trigger/RLS từ chối → forbidden', () => {
    expect(classifyAutoError({ code: 'P0001', message: 'Chỉ giáo viên mới dùng được tự hoàn thành' })).toBe('forbidden');
    expect(classifyAutoError({ code: '42501', message: 'new row violates row-level security policy for table "level_progress"' })).toBe('forbidden');
  });
  it('lỗi khác (mất mạng, hết phiên) → other, kể cả giá trị lạ', () => {
    expect(classifyAutoError(new TypeError('Failed to fetch'))).toBe('other');
    expect(classifyAutoError({ code: 'PGRST301', message: 'JWT expired' })).toBe('other');
    expect(classifyAutoError(null)).toBe('other');
    expect(classifyAutoError('boom')).toBe('other');
  });
});

describe('hoàn thành thật sau tự hoàn thành: bảng giáo viên và phần thưởng đúng một lần', () => {
  it('bảng/CSV hiện kết quả thật (không bị cờ che); xu tính đúng một lần dù chơi thật nhiều lần', () => {
    let p = autoCompleteLevel(emptyProgress(), 5, T0);
    p = recordLevelResult(p, 5, { score: 100, stars: { game: 3 } }, T0 + 1).progress;
    p = recordLevelResult(p, 5, { score: 100, stars: { game: 3 } }, T0 + 2).progress; // chơi lại cùng mốc
    expect(p.game.coins).toBe(30); // 3 sao mới × 10, một lần
    const row = { student_id: 's', display_name: 'An', level_id: 5, played: p.levels[5].played, completed: p.levels[5].completed, stars: p.levels[5].stars, best_score: p.levels[5].bestScore, updated_at: new Date(T0).toISOString(), golden_pages: 0, auto_completed: true } as ClassProgressRow;
    const [s] = buildProgressTable([row]);
    const def = LEVELS.find((l) => l.id === 5)!;
    expect(cellText(levelCell(def, s.levels[5]))).toBe('✓ vàng'); // kết quả thật, không bị "Tự hoàn thành" che
    expect(progressRowText(s).join('|')).not.toContain('Tự hoàn thành');
    expect(autoLevels(p)).toEqual([]);
  });
});
