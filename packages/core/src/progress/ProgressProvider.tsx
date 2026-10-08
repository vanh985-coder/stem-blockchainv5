import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { canSeeTeacherPage } from '../auth/roles';
import { ui } from '../content/ui';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { type Snapshot, type SaveStatus } from './manager';
import { progressManager } from './singleton';
import type { LevelResult } from './types';
import type { UnlockResult } from './unlock';

export interface ProgressState {
  /** 'loading' khi chưa biết đang đăng nhập hay chơi thử */
  mode: Snapshot['mode'];
  progress: Snapshot['progress'];
  coins: number;
  goldenPages: number;
  /** Trạng thái mở khóa 12 màn (giáo viên/admin mở hết) */
  unlock: UnlockResult;
  saving: boolean;
  /** Đã kéo xong tiến độ từ máy chủ (chỉ có nghĩa khi đã đăng nhập) */
  synced: boolean;
  /** Ghi kết quả một màn; trả số xu vừa nhận */
  record: (levelId: number, result: LevelResult) => { coinsEarned: number };
  /** Xong một màn: đẩy ngay, chờ xong mới cho rời trang */
  saveNow: () => Promise<SaveStatus>;
  /** Bắt đầu chế độ chơi thử */
  startGuest: () => void;
}

/** Chỉ để test: dựng ProgressContext giả. */
export const ProgressContext = createContext<ProgressState | null>(null);

/**
 * Nối tiến độ với tài khoản: chờ biết ai đang dùng (đã đăng nhập hay chơi thử) rồi mới đọc dữ liệu.
 * Phải nằm trong AuthProvider.
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { session, loading, profile } = useAuth();
  const snap = useSyncExternalStore(progressManager.subscribe, progressManager.getSnapshot, progressManager.getSnapshot);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (loading) return;
    void progressManager.setUser(userId);
  }, [loading, userId]);

  const isTeacher = canSeeTeacherPage(profile?.role);
  const unlock = useMemo(() => progressManager.unlock(isTeacher), [snap.progress, isTeacher]);

  const record = useCallback((levelId: number, result: LevelResult) => progressManager.record(levelId, result), []);
  const saveNow = useCallback(() => progressManager.saveNow(), []);
  const startGuest = useCallback(() => progressManager.startGuest(), []);

  const value = useMemo<ProgressState>(
    () => ({
      mode: snap.mode,
      progress: snap.progress,
      coins: snap.progress.game.coins,
      goldenPages: unlock.goldenPages,
      unlock,
      saving: snap.saving,
      synced: snap.synced,
      record,
      saveNow,
      startGuest,
    }),
    [snap, unlock, record, saveNow, startGuest],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
      {snap.mode === 'user' && snap.guestPrompt && <GuestMergePrompt />}
    </ProgressContext.Provider>
  );
}

const FALLBACK: ProgressState = {
  mode: 'loading',
  progress: progressManager.getSnapshot().progress,
  coins: 0,
  goldenPages: 0,
  unlock: progressManager.unlock(),
  saving: false,
  synced: false,
  record: () => ({ coinsEarned: 0 }),
  saveNow: async () => 'saved',
  startGuest: () => {},
};

export function useProgress(): ProgressState {
  return useContext(ProgressContext) ?? FALLBACK;
}

/** Sau khi đăng nhập, nếu cookie sc_guest có tiến độ: hỏi Gộp hay Không gộp. Chọn nút nào cũng xóa sc_guest. */
function GuestMergePrompt() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-chu/40 p-4">
      <Panel role="alertdialog" aria-modal="true" aria-labelledby="guest-merge-q" className="w-full max-w-md space-y-4">
        <p id="guest-merge-q" className="text-lg font-semibold leading-relaxed">
          {ui.tienDo.hoiGop}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => progressManager.discardGuest()}>
            {ui.tienDo.khongGop}
          </Button>
          <Button autoFocus onClick={() => progressManager.mergeGuest()}>
            {ui.tienDo.gop}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
