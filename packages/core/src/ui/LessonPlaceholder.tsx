import { useState, type ReactNode } from 'react';
import { AccountBar } from '../auth/AccountBar';
import { HUB_MAP_URL } from '../config/urls';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { useProgress } from '../progress/ProgressProvider';
import type { SaveStatus } from '../progress/manager';
import { Button } from './Button';
import { GuestBar } from './GuestBar';
import { Panel } from './Panel';

/**
 * Trang tạm cho màn bài học, thay bằng bài học thật khi chuyển từng bài.
 * Có nút "Giả lập xong màn" để thử lưu tiến độ: ghi kết quả, đẩy ngay, chờ xong mới cho bấm "Về bản đồ".
 */
export function LessonPlaceholder({ lesson, levelId, children }: { lesson: number; levelId: number; children?: ReactNode }) {
  const { record, saveNow, saving } = useProgress();
  const [result, setResult] = useState<{ coins: number; status: SaveStatus } | null>(null);

  const simulate = async () => {
    const { coinsEarned } = record(levelId, { stars: { de: 3, tb: 3, kho: 3 } });
    const status = await saveNow();
    setResult({ coins: coinsEarned, status });
  };

  return (
    <>
      <GuestBar />
      <main className="grid min-h-screen place-items-center p-4 text-center">
        <Panel className="w-full max-w-md space-y-4">
          <h1 className="text-2xl">{fmt(ui.trangTam.tieuDe, { so: lesson })}</h1>
          {children}
          <div>
            <Button variant="secondary" disabled={saving} onClick={simulate}>
              {ui.tienDo.gaLapXongMan}
            </Button>
          </div>
          <div aria-live="polite" className="min-h-6 font-semibold">
            {saving && ui.tienDo.dangLuu}
            {!saving && result && (
              <>
                <p>{fmt(ui.tienDo.nhanXu, { so: result.coins })}</p>
                <p>{result.status === 'saved' ? ui.tienDo.daLuu : ui.tienDo.chuaGuiDuoc}</p>
              </>
            )}
          </div>
          <Button disabled={saving} onClick={() => window.location.assign(HUB_MAP_URL)}>
            {ui.chung.veBanDo}
          </Button>
          <AccountBar />
        </Panel>
      </main>
    </>
  );
}
