import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { HUB_MAP_URL } from '../config/urls';
import { fmt } from '../content/characters';
import { levelById } from '../content/levels';
import { ui } from '../content/ui';
import { useProgress } from '../progress/ProgressProvider';
import { Button } from './Button';
import { Panel } from './Panel';

/** Chờ kéo tiến độ từ máy chủ tối đa chừng này rồi mới quyết định (mất mạng thì dùng bản trên máy). */
const WAIT_SYNC_MS = 3000;

/**
 * Chặn vào màn đang khóa khi em gõ thẳng đường dẫn: hiện thông báo kèm nút "Về bản đồ", không vào màn.
 * Chờ biết ai đang dùng, và (nếu đã đăng nhập) chờ kéo xong tiến độ, để khỏi báo khóa nhầm.
 */
export function LevelGuard({ levelId, children }: { levelId: number; children: ReactNode }) {
  const { loading, profileLoading } = useAuth();
  const { mode, synced, unlock } = useProgress();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), WAIT_SYNC_MS);
    return () => clearTimeout(t);
  }, []);

  const unknownUser = loading || profileLoading || mode === 'loading';
  const stillPulling = mode === 'user' && !synced && !waited;
  if (unknownUser || stillPulling) {
    return <p className="grid min-h-screen place-items-center p-6 text-center">{ui.chung.dangTai}</p>;
  }

  const state = unlock.levels.find((l) => l.id === levelId);
  if (state?.state !== 'locked') return <>{children}</>;

  const blocker = state.lockedBy ? levelById(state.lockedBy) : undefined;
  return (
    <main className="grid min-h-screen place-items-center p-4 text-center">
      <Panel role="alert" className="w-full max-w-md space-y-4">
        <h1 className="text-2xl">
          <span aria-hidden="true">🔒 </span>
          {ui.manKhoa.tieuDe}
        </h1>
        {blocker && <p className="text-lg">{fmt(ui.moKhoa.hoanThanh, { so: blocker.id, man: fmt(blocker.ten) })}</p>}
        <Button onClick={() => window.location.assign(HUB_MAP_URL)}>{ui.manKhoa.veBanDo}</Button>
      </Panel>
    </main>
  );
}
