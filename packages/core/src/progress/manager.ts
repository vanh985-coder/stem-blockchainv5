import { classifyAutoError } from './autoError';
import { decodePendingMap, decodeProgress, encodePendingMap, encodeProgress } from './compact';
import { GUEST_COOKIE, PENDING_COOKIE } from './cookies';
import { mergeProgress, sameGame, sameLevel } from './merge';
import { autoCompleteLevel, recordLevelResult, unlockOf, withGoldenPages, type ProgressOptions } from './record';
import { emptyProgress, hasProgress, type GameState, type LevelProgress, type LevelResult, type Progress } from './types';
import type { UnlockResult } from './unlock';
import { hasSeenGuide, withGuideSeen } from './guideFlags';
import { fullKnowMask, hasKnowCard, knowCardMaskOf, withAllKnowCards, withKnowCard } from './knowCards';
import { hasReadStory, withStoryRead } from './storyFlags';
import { hasSeenClimax, hasSeenGameTip, withClimaxSeen, withGameTipSeen } from './gameTips';
import { hasSeenGateOpen, hasSeenGolden, hasSeenIntro, hasSeenKnow, hasSeenScene, withGateOpenSeen, withGoldenSeen, withIntroSeen, withKnowSeen, withSceneSeen } from './villageIntro';
import type { VillageId } from '../village';

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
  /** Máy chủ đã hỗ trợ cờ tự hoàn thành (migration 0003) chưa. Không có hàm này (bản giả trong test) thì coi là có. Ném lỗi khi không xác định được. */
  supportsAutoComplete?(): Promise<boolean>;
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
  /** Cờ tự hoàn thành dùng được với máy chủ không (P3b): 'unknown' chưa kiểm xong, 'yes', 'no' (máy chủ chưa chạy migration 0003), 'rejected' (máy chủ từ chối tài khoản này). Chơi thử luôn 'yes'. */
  autoStatus: AutoStatus;
}

export type AutoStatus = 'unknown' | 'yes' | 'no' | 'rejected';
/** Kết quả bấm "Tự hoàn thành": 'done' đã ghi và đã lưu; 'pending' đã ghi ở máy, chưa lên được máy chủ (sẽ thử lại); 'unsupported' / 'rejected' KHÔNG ghi gì; 'unavailable' không được phép; 'noop' đã xong hay đã có cờ. */
export type AutoResult = 'done' | 'pending' | 'unsupported' | 'rejected' | 'unavailable' | 'noop';

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
  /** Được dùng cờ "tự hoàn thành" (giáo viên/admin, bản dev): quyết định ở ProgressProvider. Chưa được thì cờ bị bỏ qua khi tính mở khóa và KHÔNG đẩy lên máy chủ. */
  private autoAllowed = false;
  private autoSupport: 'unknown' | 'yes' | 'no' = 'unknown';
  private autoRejected = false;
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
    return unlockOf(this.progress, { ...this.opts, isTeacher, honorAuto: this.autoAllowed });
  }

  /** Đặt quyền dùng cờ tự hoàn thành. Quyền thật do máy chủ quyết (trigger ở migration 0003); đây chỉ để giao diện và việc đẩy dữ liệu. */
  setAutoAllowed(allowed: boolean): void {
    if (this.autoAllowed === allowed) return;
    this.autoAllowed = allowed;
    this.emit();
    if (allowed) {
      void this.ensureAutoSupport();
      this.scheduleFlush();
    }
  }
  isAutoAllowed(): boolean {
    return this.autoAllowed;
  }

  /** Hỏi máy chủ đã hỗ trợ cờ chưa (một lần mỗi phiên; chỉ khi đã đăng nhập, đã kéo xong và được phép). Mất mạng thì để 'unknown', lần đẩy đầu tiên sẽ tự phân loại lỗi. */
  private async ensureAutoSupport(): Promise<void> {
    if (this.mode !== 'user' || !this.pulled || !this.autoAllowed || this.autoSupport !== 'unknown') return;
    const probe = this.deps.remote.supportsAutoComplete;
    const userId = this.userId;
    if (!probe) {
      this.autoSupport = 'yes';
      this.emit();
      return;
    }
    try {
      const ok = await probe.call(this.deps.remote);
      if (this.userId !== userId) return;
      this.autoSupport = ok ? 'yes' : 'no';
      this.emit();
    } catch {
      /* chưa biết */
    }
  }

  /**
   * Tự hoàn thành một màn (giáo viên/admin, bản dev): ghi cờ vào tiến độ rồi đẩy ngay qua luồng lưu hiện có. Không điểm, sao, huy chương, xu hay Trang Sổ Vàng.
   * Máy chủ chưa hỗ trợ ('unsupported') hay từ chối ('rejected') thì KHÔNG ghi gì và nói rõ; mất mạng thì 'pending' (cờ ở máy, sẽ thử lại, KHÔNG báo là đã lưu).
   * Không được phép, màn đã xong thật hay đã có cờ thì không làm gì (bấm lặp không tạo thêm).
   */
  async requestAutoComplete(levelId: number): Promise<AutoResult> {
    if (this.mode === 'loading' || !this.autoAllowed) return 'unavailable';
    if (this.mode === 'user') {
      await this.ensureAutoSupport();
      if (this.autoRejected) return 'rejected';
      if (this.autoSupport === 'no') return 'unsupported';
    }
    const next = autoCompleteLevel(this.progress, levelId, this.now(), this.opts);
    if (next === this.progress) return 'noop';
    this.progress = next;
    this.persistLocal();
    this.emit();
    if (this.mode !== 'user') return 'done';
    const ok = await this.flush();
    if (this.autoRejected) return 'rejected';
    if (this.autoSupport === 'no') return 'unsupported';
    return ok ? 'done' : 'pending';
  }

  private autoStatusNow(): AutoStatus {
    if (this.mode !== 'user') return 'yes';
    if (this.autoRejected) return 'rejected';
    return this.autoSupport;
  }

  private makeSnapshot(): Snapshot {
    return {
      mode: this.mode,
      userId: this.userId,
      progress: this.progress,
      saving: this.saving,
      synced: this.pulled,
      guestPrompt: this.guestPrompt,
      autoStatus: this.autoStatusNow(),
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
    this.autoSupport = 'unknown';
    this.autoRejected = false;
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
    void this.ensureAutoSupport();
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
    const strip = (lv: LevelProgress): LevelProgress => (lv.auto ? { ...lv, auto: undefined } : lv);
    // Thành tích thật và cờ tự hoàn thành đi HAI đường riêng: cờ lỗi (máy chủ chưa migration, từ chối) không bao giờ chặn việc lưu tiến độ thật.
    const realRows: Array<{ levelId: number; progress: LevelProgress }> = [];
    const autoRows: Array<{ levelId: number; progress: LevelProgress }> = [];
    const canSendAuto = this.autoAllowed && this.autoSupport !== 'no' && !this.autoRejected;
    for (const [idStr, lv] of Object.entries(snapshot.levels)) {
      const id = Number(idStr);
      const b = base.levels[id];
      // màn mới chỉ có cờ (chưa có dữ liệu thật) không tạo hàng "thật" rỗng: hàng của nó đi cùng cờ ở đường riêng
      const hasReal = lv.played || lv.completed || lv.bestScore > 0 || Object.values(lv.stars).some((n) => (n ?? 0) > 0);
      if (!sameLevel(strip(lv), b ? strip(b) : b) && (b || hasReal)) realRows.push({ levelId: id, progress: strip(lv) });
      if (canSendAuto && lv.auto && !b?.auto) autoRows.push({ levelId: id, progress: lv });
    }
    const gameChanged = !sameGame(snapshot.game, base.game);
    try {
      if (realRows.length) await this.deps.remote.upsertLevels(userId, realRows);
      if (gameChanged) await this.deps.remote.upsertGame(userId, snapshot.game);
    } catch {
      return false; // xếp hàng: lần sau (có mạng, hoặc thay đổi mới) sẽ đẩy lại
    }
    // đường cờ (riêng)
    let autoSent = false;
    let autoRetry = false;
    if (autoRows.length) {
      try {
        await this.deps.remote.upsertLevels(userId, autoRows);
        autoSent = true;
        if (this.autoSupport === 'unknown') this.autoSupport = 'yes';
      } catch (err) {
        const kind = classifyAutoError(err);
        if (kind === 'missing-column') this.autoSupport = 'no';
        else if (kind === 'forbidden') this.autoRejected = true;
        else autoRetry = true; // mất mạng…: giữ cờ ở máy, thử lại lần sau, và nói là CHƯA lưu
      }
    }
    if (this.userId !== userId) return true;
    // Máy chủ chưa hỗ trợ hay từ chối: gỡ các cờ chưa lên được khỏi máy để giao diện không giả vờ đã lưu (thành tích thật giữ nguyên)
    const unsynced = Object.entries(this.progress.levels).filter(([idStr, lv]) => lv.auto && !base.levels[Number(idStr)]?.auto);
    const dropped = this.autoAllowed && (this.autoSupport === 'no' || this.autoRejected) && unsynced.length > 0;
    if (dropped) {
      const levels = { ...this.progress.levels };
      for (const [idStr, lv] of unsynced) levels[Number(idStr)] = strip(lv);
      this.progress = { ...this.progress, levels };
      this.persistLocal();
    }
    // bản máy chủ đang có: phần thật đã đẩy, cộng cờ chỉ khi cờ đã lên được
    const sentLevels: Progress['levels'] = {};
    for (const [idStr, lv] of Object.entries(snapshot.levels)) {
      const id = Number(idStr);
      sentLevels[id] = autoSent || base.levels[id]?.auto ? lv : strip(lv);
    }
    this.remoteCopy = mergeProgress(base, { levels: sentLevels, game: snapshot.game });
    if (this.pendingMerged) {
      this.removePending(userId);
      this.pendingMerged = false;
    }
    if (dropped) this.emit();
    else if (autoSent) this.emit();
    return !autoRetry;
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

  /** Học sinh đã xem giới thiệu một làng: ghi cờ vào game.data (đăng nhập thì đẩy lên server; chơi thử thì vào cookie). */
  markVillageIntroSeen(village: VillageId): void {
    if (this.mode === 'loading' || hasSeenIntro(this.progress.game.data, village)) return;
    this.progress = {
      ...this.progress,
      game: { ...this.progress.game, data: withIntroSeen(this.progress.game.data, village), updatedAt: this.now() },
    };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Học sinh đã xem cảnh mở đầu của làng 3D (bước 9): ghi cờ như `markVillageIntroSeen`. */
  markVillageSceneSeen(village: VillageId): void {
    if (this.mode === 'loading' || hasSeenScene(this.progress.game.data, village)) return;
    this.progress = {
      ...this.progress,
      game: { ...this.progress.game, data: withSceneSeen(this.progress.game.data, village), updatedAt: this.now() },
    };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Em đã xem cảnh người dẫn trao Trang Sổ Vàng của làng (bước 15a): ghi cờ như `markVillageIntroSeen`. */
  markGoldenSeen(village: VillageId): void {
    if (this.mode === 'loading' || hasSeenGolden(this.progress.game.data, village)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withGoldenSeen(this.progress.game.data, village), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Em đã xem các thẻ "Em có biết?" tự hiện lúc vào làng (bước 16): ghi cờ như `markVillageIntroSeen`. */
  markKnowSeen(village: VillageId): void {
    if (this.mode === 'loading' || hasSeenKnow(this.progress.game.data, village)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withKnowSeen(this.progress.game.data, village), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Em đã nhặt thẻ "Em có biết?" số `index` (từ 0) của làng (bước X3): ghi cờ (đăng nhập thì lên server, chơi thử thì vào cookie). */
  markKnowCard(village: VillageId, index: number): void {
    if (this.mode === 'loading' || hasKnowCard(knowCardMaskOf(this.progress.game.data, village), index)) return;
    const data = withKnowCard(this.progress.game.data, village, index);
    if (data === this.progress.game.data) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data, updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Em đã đọc đủ `total` thẻ của làng ở khung giới thiệu trên /ban-do (bước X3): ghi cờ như `markKnowCard`. */
  markAllKnowCards(village: VillageId, total: number): void {
    const full = fullKnowMask(total);
    if (this.mode === 'loading' || full === 0 || (knowCardMaskOf(this.progress.game.data, village) & full) === full) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withAllKnowCards(this.progress.game.data, village, total), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Đã đọc hết cốt truyện (bước X1): ghi cờ (đăng nhập thì lên server, chơi thử thì vào cookie). */
  markStoryRead(): void {
    if (this.mode === 'loading' || hasReadStory(this.progress.game.data)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withStoryRead(this.progress.game.data), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Phần Hướng dẫn chơi đã tự mở một lần (bước 16): không tự mở lại. */
  /** Đã nghe lời giới thiệu lần đầu của game phụ màn `levelId` (bước B4); đã có cờ thì không làm gì. */
  markGameTipSeen(levelId: number): void {
    if (this.mode === 'loading' || hasSeenGameTip(this.progress.game.data, levelId)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withGameTipSeen(this.progress.game.data, levelId), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Đã chiếu cảnh cao trào sau màn 12 (hết cảnh hay bấm "Bỏ qua"; bước B5); đã có cờ thì không làm gì. */
  markClimaxSeen(): void {
    if (this.mode === 'loading' || hasSeenClimax(this.progress.game.data)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withClimaxSeen(this.progress.game.data), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  markGuideSeen(section: string): void {
    if (this.mode === 'loading' || hasSeenGuide(this.progress.game.data, section)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withGuideSeen(this.progress.game.data, section), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
  }

  /** Em đã xem hiệu ứng mở cổng làng kế tiếp sau Trang Sổ Vàng của làng (bước 15a). */
  markGateOpenSeen(village: VillageId): void {
    if (this.mode === 'loading' || hasSeenGateOpen(this.progress.game.data, village)) return;
    this.progress = { ...this.progress, game: { ...this.progress.game, data: withGateOpenSeen(this.progress.game.data, village), updatedAt: this.now() } };
    this.persistLocal();
    this.emit();
    this.scheduleFlush();
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
