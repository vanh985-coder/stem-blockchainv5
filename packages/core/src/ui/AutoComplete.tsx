import { useState } from 'react';
import { autoCompleteUi } from '../content/autoComplete';
import { fmt } from '../content/characters';
import { gameUi } from '../content/games';
import { levelById, nextReadyLevel } from '../content/levels';
import { ui } from '../content/ui';
import { useProgress } from '../progress/ProgressProvider';
import { Button } from './Button';
import { Panel } from './Panel';

/**
 * Nút "Tự hoàn thành" (P3b). Chỉ hiện cho giáo viên/admin và bản dev (`canAutoComplete`), khi màn chưa xong (thật hay tự hoàn thành).
 * Bấm: ghi cờ qua luồng lưu tiến độ hiện có (một lần; bấm lặp không tạo gì thêm), chờ lưu xong rồi gọi `onDone` để trang rời ván (đồng hồ và vật lý dừng vì ván không còn chạy,
 * không chấm điểm, không trao thưởng). `variant="icon"`: nút tròn 44 px cho màn hẹp.
 */
export function AutoCompleteButton({ levelId, onDone, variant = 'text', className = '' }: { levelId: number; onDone: (note?: string) => void; variant?: 'text' | 'icon'; className?: string }) {
  const { canAutoComplete, autoComplete, autoStatus, unlock } = useProgress();
  const [msg, setMsg] = useState<string | null>(null);
  const state = unlock.levels.find((l) => l.id === levelId)?.state;
  if (!canAutoComplete || state === 'done' || state === 'coming-soon') return null;
  // Máy chủ chưa hỗ trợ (migration 0003 chưa chạy) hay từ chối: vô hiệu nút và nói rõ; không ghi gì, không ảnh hưởng việc lưu tiến độ chơi thật
  const blocked = autoStatus === 'no' ? autoCompleteUi.chuaHoTro : autoStatus === 'rejected' ? autoCompleteUi.biTuChoi : null;
  const note = blocked ?? msg;
  const press = async () => {
    const r = await autoComplete(levelId);
    if (r === 'done' || r === 'noop') onDone();
    else if (r === 'pending') onDone(autoCompleteUi.chuaLuu); // đã ghi ở máy: vào khung nhưng nói rõ CHƯA lưu lên máy chủ
    else setMsg(r === 'unsupported' ? autoCompleteUi.chuaHoTro : r === 'rejected' ? autoCompleteUi.biTuChoi : autoCompleteUi.khongDung);
  };
  const common = { 'data-testid': 'nut-tu-hoan-thanh', 'aria-describedby': note ? `tu-hoan-thanh-ghi-chu-${levelId}` : undefined } as const;
  const button =
    variant === 'icon' ? (
      <button
        type="button"
        aria-label={autoCompleteUi.nut}
        title={autoCompleteUi.ghiChu}
        disabled={blocked !== null}
        onClick={() => void press()}
        {...common}
        className={`size-11 min-h-11 min-w-11 cursor-pointer place-items-center rounded-nut border-2 border-muc-tim bg-giay text-xl disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${className}`}
      >
        <span aria-hidden="true">⏭</span>
      </button>
    ) : (
      <Button variant="secondary" size="sm" title={autoCompleteUi.ghiChu} disabled={blocked !== null} className={className} onClick={() => void press()} {...common}>
        {autoCompleteUi.nut}
      </Button>
    );
  return (
    <>
      {button}
      {note && (
        <p role="status" id={`tu-hoan-thanh-ghi-chu-${levelId}`} data-testid="tu-hoan-thanh-ghi-chu" className="basis-full text-sm font-semibold text-muc-tim-dam">
          {note}
        </p>
      )}
    </>
  );
}

/** Khung sau khi tự hoàn thành: nói rõ không có điểm hay thưởng; đi tiếp (game kế tiếp theo điều kiện mở), về làng, hoặc chơi thật. */
export function AutoCompletedPanel({ levelId, onPlayReal, onNext, onLeave, notice }: { levelId: number; onPlayReal: () => void; onNext?: () => void; onLeave: () => void; /** Lời nói rõ chưa lưu được lên máy chủ (mất mạng) */ notice?: string }) {
  const next = nextReadyLevel(levelId);
  const name = fmt(levelById(levelId)?.ten ?? '');
  return (
    <Panel className="mx-auto w-full max-w-xl space-y-4 p-6 text-center" role="status" data-testid="da-tu-hoan-thanh">
      <h2 className="text-2xl text-muc-tim-dam">{autoCompleteUi.tieuDe}</h2>
      <p className="font-display text-lg font-extrabold">{name}</p>
      <p className="text-base font-semibold">{autoCompleteUi.loi}</p>
      {notice && (
        <p role="alert" data-testid="tu-hoan-thanh-chua-luu" className="rounded-2xl border-2 border-do-son bg-white/70 p-3 text-sm font-semibold">
          {notice}
        </p>
      )}
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {next && onNext && (
          <Button size="lg" data-testid="tu-hoan-thanh-choi-tiep" aria-label={fmt(gameUi.choiTiepNhan, { man: fmt(next.ten) })} onClick={onNext}>
            {gameUi.choiTiep}
          </Button>
        )}
        <Button size="lg" variant="secondary" onClick={onPlayReal}>
          {autoCompleteUi.choiThat}
        </Button>
        <Button size="lg" variant="secondary" onClick={onLeave}>
          {ui.langScene.veLang}
        </Button>
      </div>
    </Panel>
  );
}
