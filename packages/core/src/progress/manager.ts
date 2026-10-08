import { decodePendingMap, decodeProgress, encodePendingMap, encodeProgress } from './compact';
import { GUEST_COOKIE, PENDING_COOKIE } from './cookies';
import { mergeProgress, sameGame, sameLevel } from './merge';
import { recordLevelResult, unlockOf, withGoldenPages, type ProgressOptions } from './record';
import { emptyProgress, hasProgress, type GameState, type LevelProgress, type LevelResult, type Progress } from './types';
import type { UnlockResult } from './unlock';

/** Nơi lưu trên máy cho tài khoản (localStorage). Thay bằng bản giả trong test. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Cookie (sc_guest, sc_pending). Thay bằng bản giả trong test. */
export interface CookieJar {
  get(name: string): string | null;
  set(name: string, value: string): void;
  remove(name: string): void;
}

/** Nói chuyện với Supabase. Thay bằng bản giả trong test. Mọi hàm ném lỗi khi mất mạng hoặc bị từ chối. */
export interface RemoteApi {
  fetchProgress(userId: string): Promise<Progress>;
  upsertLevels(userId: string, rows: Array<{ levelId: number; progress: LevelProgress }>): Promise<void>;
  upsertGame(userId: string, game: GameState): Promise<void>;
  insertQuizAnswer(userId: string, levelId: number, questionId: string, correct: boolean): Promise<void>;
}

export interface ManagerDeps {
  store: KeyValueStore;
  cookies: CookieJar;
  remote: RemoteApi;
  now?: () => number;
  options?: ProgressOptions;
}

export const PUSH_DEBOUNCE_MS = 2000;
export const SAVE_TIMEOUT_MS = 5000;
export const SIGN_OUT_FLUSH_MS = 3000;

export const userKey = (userId: string) => `sochung.v3.u.${userId}`;

export type Mode = 'loading' | 'guest' | 'user';

export interface Snapshot {
  mode: Mode;
  userId: string | null;
  progress: Progress;
  /** Đang đẩy lên server sau khi xong một màn ("Đang lưu…") */
  saving: boolean;
  /** Đã kéo xong tiến độ từ server (chỉ có nghĩa khi mode = user) */
  synced: boolean;
  /** Có tiến độ chơi thử ở cookie sc_guest, đang chờ em chọn Gộp hay Không gộp */
  guestPrompt: boolean;
}

export type SaveStatus = 'saved' | 'pending';

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve('timeout'), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve('timeout');
      },
    );
  });

/**
 * Quản lý tiến độ: lưu trên máy tách theo chủ và đồng bộ với Supabase (spec 02 mục 4).
 * - Chơi thử: cookie sc_guest. Tài khoản: localStorage "sochung.v3.u.<userId>" có trường owner.
 * - Không bao giờ đọc hay đẩy dữ liệu của chủ khác; chưa kéo xong từ server thì không đẩy gì.
 */
export class ProgressManager {
  private readonly now: () => number;
  private readonly opts: ProgressOptions;
  private mode: Mode = 'loading';
  private userId: string | null = null;
  private progress: Progress = emptyProgress();
  private remoteCopy: Progress | null = null; // những gì server đang có (sau lần kéo hoặc đẩy gần nhất)
  private pulled = false;
  private pendingMerged = false;
  private saving = false;
  private guestPrompt = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private snap: Snapshot;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly deps: ManagerDeps) {
    this.now = deps.now ?? Date.now;
    this.opts = deps.options ?? {};
    this.snap = this.makeSnapshot();
  }

  // ---------- đọc ----------
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = (): Snapshot => this.snap;
  currentUserId(): string | null {
    return this.userId;
  }
  unlock(isTeacher = false): UnlockResult {
    return unlockOf(this.progress, { ...this.opts, isTeacher });
  }

  private makeSnapshot(): Snapshot {
    return {
      mode: this.mode,
      userId: this.userId,
      progress: this.progress,
      saving: this.saving,
      synced: this.pulled,
      guestPrompt: this.guestPrompt,
    };
  }
  private emit(): void {
    this.snap = this.makeSnapshot();
    this.listeners.forEach((l) => l());
  }

  // ---------- chủ đang dùng máy ----------
  /** Gọi khi biết ai đang dùng: userId nếu đã đăng nhập, null nếu là khách (chơi thử). */
  async setUser(userId: string | null): Promise<void> {
    if (this.mode !== 'loading' && this.userId === userId) return;
    this.cancelTimer();
    this.pulled = false;
    this.remoteCopy = null;
    this.pendingMerged = false;
    this.saving = false;
    this.userId = userId;

    if (userId === null) {
      this.mode = 'guest';
      this.guestPrompt = false;
      this.progress = withGoldenPages(decodeProgress(this.deps.cookies.get(GUEST_COOKIE), this.opts.levels), this.now(), this.opts);
      this.emit();
      return;
    }

    this.mode = 'user';
    this.progress = this.loadLocal(userId);
    // sc_pending chỉ dùng nếu đúng chủ
    const pending = this.readPendingMap()[userId];
    if (pending) {
      this.progress = mergeProgress(this.progress, pending.progress);
      this.pendingMerged = true;
    }
    const guest = decodeProgress(this.deps.cookies.get(GUEST_COOKIE), this.opts.levels);
    this.guestPrompt = hasProgress(guest);
    this.emit();
    await this.pull(userId);
  }

  private loadLocal(userId: string): Progress {
    const raw = this.deps.store.get(userKey(userId));
    if (!raw) return emptyProgress();
    try {
      const rec = JSON.parse(raw) as { v?: number; owner?: string; progress?: Progress };
      // Bản ghi của chủ khác (hoặc hỏng) thì bỏ qua, không bao giờ dùng.
      if (rec.v !== 1 || rec.owner !== userId || !rec.progress) return emptyProgress();
      return { levels: rec.progress.levels ?? {}, game: { ...emptyProgress().game, ...rec.progress.game } };
    } catch {
      return emptyProgress();
    }
  }

  private persistLocal(): void {
    if (this.mode === 'user' && this.userId) {
      this.deps.store.set(userKey(this.userId), JSON.stringify({ v: 1, owner: this.userId, progress: this.progress }));
    } else if (this.mode === 'guest') {
      this.deps.cookies.set(GUEST_COOKIE, encodeProgress(this.progress, this.opts.levels));
    }
  }

  // ---------- kéo về, gộp, đẩy lên ----------
  private async pull(userId: string): Promise<void> {
    let remote: Progress;
    try {
      remote = await this.deps.remote.fetchProgress(userId);
    } catch {
      return; // mất mạng: giữ bản trên máy, chưa đẩy gì; thử lại khi có mạng
    }
    if (this.userId !== userId) return; // đã đổi người trong lúc chờ
    this.progress = withGoldenPages(mergeProgress(this.progress, remote), this.now(), this.opts);
    this.remoteCopy = remote;
    this.pulled = true;
    this.persistLocal();
    this.emit();
    await this.flush();
  }

  /** Có mạng lại: thử kéo (nếu chưa kéo được) hoặc đẩy phần đang chờ. */
  async notifyOnline(): Promise<void> {
    if (this.mode !== 'user' || !this.userId) return;
    if (!this.pulled) await this.pull(this.userId);
    else await this.flush();
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scheduleFlush(): void {
    if (this.mode !== 'user') return;
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, PUSH_DEBOUNCE_MS);
  }

  /** Đẩy lên những gì máy có mà server chưa có. Trả true khi server đã đủ. Không đẩy nếu chưa kéo xong. */
  flush(): Promise<boolean> {
    const run = this.chain.then(() => this.doFlush());
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async doFlush(): Promise<boolean> {
    const userId = this.userId;
    const base = this.remoteCopy;
    if (this.mode !== 'user' || !userId || !this.pulled || !base) return false;
    const snapshot = this.progress;
    const rows: Array<{ levelId: number; progress: LevelProgress }> = [];
    for (const [idStr, lv] of Object.entries(snapshot.levels)) {
      const id = Number(idStr);
      if (!sameLevel(lv, base.levels[id])) rows.push({ levelId: id, progress: lv });
    }
    const gameChanged = !sameGame(snapshot.game, base.game);
    try {
      if (rows.length) await this.deps.remote.upsertLevels(userId, rows);
      if (gameChanged) await this.deps.remote.upsertGame(userId, snapshot.game);
    } catch {
      return false; // xếp hàng: lần sau (có mạng, hoặc thay đổi mới) sẽ đẩy lại
    }
    if (this.userId !== userId) return true;
    this.remoteCopy = mergeProgress(base, snapshot);
    if (this.pendingMerged) {
      this.removePending(userId);
      this.pendingMerged = false;
    }
    return true;
  }

  // ---------- sc_pending: map { userId: bản tóm tắt } ----------
  private readPendingMap() {
    return decodePendingMap(this.deps.cookies.get(PENDING_COOKIE), this.opts.levels);
  }

  /** Ghi phần chưa lưu của một người, giữ nguyên phần của người khác. Quá 3 KB thì bỏ bản cũ nhất. */
  private writePending(userId: string): void {
    const map = this.readPendingMap();
    map[userId] = { progress: this.progress, t: this.now() };
    this.deps.cookies.set(PENDING_COOKIE, encodePendingMap(map, this.opts.levels));
  }

  /** Xóa phần của đúng người này; phần của người khác giữ nguyên. Hết phần nào thì xóa hẳn cookie. */
  private removePending(userId: string): void {
    const map = this.readPendingMap();
    if (!(userId in map)) return;
    delete map[userId];
    if (Object.keys(map).length === 0) this.deps.cookies.remove(PENDING_COOKIE);
    else this.deps.cookies.set(PENDING_COOKIE, encodePendingMap(map, this.opts.levels));
  }

  // ---------- khi chơi ----------
  /** Ghi kết quả một màn: ghi máy ngay, đẩy lên sau 2 giây không có thay đổi mới. */
  record(levelId: number, result: LevelResult): { coinsEarned: number } {
    if (this.mode === 'loading') return { coinsEarned: 0 };
    const r = recordLevelResult(this.progress, levelId, result, this.now(), this.opts);
    this.progress = r.progress;
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
    return { coinsEarned: r.coinsEarned };
  }

  /**
   * Xong một màn: đẩy ngay và chờ xong mới cho rời trang.
   * Quá 5 giây hoặc mất mạng: ghi bản tóm tắt vào cookie sc_pending rồi cho rời trang ('pending').
   * Chơi thử: tiến độ đã nằm trong cookie, trả 'saved' ngay.
   */
  async saveNow(): Promise<SaveStatus> {
    if (this.mode !== 'user' || !this.userId) return 'saved';
    const userId = this.userId;
    this.cancelTimer();
    this.saving = true;
    this.emit();
    const result = await withTimeout(this.flush(), SAVE_TIMEOUT_MS);
    this.saving = false;
    if (result === true) {
      // Đã lên server đủ: bản tóm tắt sc_pending của chính người này (nếu còn) không cần nữa.
      this.removePending(userId);
      this.emit();
      return 'saved';
    }
    this.writePending(userId);
    this.emit();
    return 'pending';
  }

  /** Câu trả lời trắc nghiệm: đã đăng nhập thì ghi một dòng quiz_answers; chơi thử thì không ghi. */
  async recordQuizAnswer(levelId: number, questionId: string, correct: boolean): Promise<void> {
    if (this.mode !== 'user' || !this.userId) return;
    try {
      await this.deps.remote.insertQuizAnswer(this.userId, levelId, questionId, correct);
    } catch {
      // Ghi thất bại thì bỏ qua, không làm gián đoạn ván chơi.
    }
  }

  // ---------- chơi thử rồi mới đăng nhập ----------
  /** Bắt đầu chế độ chơi thử (nút "Chơi thử không cần tài khoản"): đảm bảo cookie sc_guest tồn tại. */
  startGuest(): void {
    if (!this.deps.cookies.get(GUEST_COOKIE)) {
      this.deps.cookies.set(GUEST_COOKIE, encodeProgress(emptyProgress(), this.opts.levels));
    }
  }

  /** "Gộp": gộp tiến độ chơi thử vào tài khoản đang đăng nhập, rồi xóa sc_guest. */
  mergeGuest(): void {
    if (this.mode !== 'user' || !this.userId) return;
    const guest = decodeProgress(this.deps.cookies.get(GUEST_COOKIE), this.opts.levels);
    this.progress = withGoldenPages(mergeProgress(this.progress, guest), this.now(), this.opts);
    this.persistLocal();
    this.deps.cookies.remove(GUEST_COOKIE);
    this.guestPrompt = false;
    this.emit();
    this.scheduleFlush();
  }

  /** "Không gộp": xóa sc_guest, tiến độ tài khoản không đổi. */
  discardGuest(): void {
    this.deps.cookies.remove(GUEST_COOKIE);
    this.guestPrompt = false;
    this.emit();
  }

  // ---------- đăng xuất ----------
  /**
   * Chạy TRƯỚC khi thoát phiên: cố đẩy nốt phần đang chờ (tối đa 3 giây),
   * rồi xóa "sochung.v3.u.<userId>" và sc_pending của người đó.
   */
  async prepareSignOut(): Promise<void> {
    const userId = this.userId;
    if (this.mode !== 'user' || !userId) return;
    this.cancelTimer();
    const flushed = await withTimeout(this.flush(), SIGN_OUT_FLUSH_MS);
    if (flushed === true) {
      this.removePending(userId); // đã lên server đủ, không còn gì chờ
    } else if (hasProgress(this.progress)) {
      // Chưa đẩy xong (mất mạng): giữ phần chưa lưu trong sc_pending của người này trước khi xóa localStorage.
      this.writePending(userId);
    }
    this.deps.store.remove(userKey(userId));
    this.userId = null;
    this.mode = 'loading';
    this.progress = emptyProgress();
    this.remoteCopy = null;
    this.pulled = false;
    this.pendingMerged = false;
    this.guestPrompt = false;
    this.emit();
  }
}
