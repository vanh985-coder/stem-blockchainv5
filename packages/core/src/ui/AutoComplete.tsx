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
export function AutoCompleteButton({ levelId, onDone, variant = 'text', className = '' }: { levelId: number; onDone: () => void; variant?: 'text' | 'icon'; className?: string }) {
  const { canAutoComplete, autoComplete, saveNow, unlock } = useProgress();
  const state = unlock.levels.find((l) => l.id === levelId)?.state;
  if (!canAutoComplete || state === 'done' || state === 'coming-soon') return null;
  const press = () => {
    autoComplete(levelId);
    void saveNow();
    onDone();
  };
  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label={autoCompleteUi.nut}
        title={autoCompleteUi.ghiChu}
        data-testid="nut-tu-hoan-thanh"
        onClick={press}
        className={`size-11 min-h-11 min-w-11 cursor-pointer place-items-center rounded-nut border-2 border-muc-tim bg-giay text-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${className}`}
      >
        <span aria-hidden="true">⏭</span>
      </button>
    );
  }
  return (
    <Button variant="secondary" size="sm" title={autoCompleteUi.ghiChu} data-testid="nut-tu-hoan-thanh" className={className} onClick={press}>
      {autoCompleteUi.nut}
    </Button>
  );
}

/** Khung sau khi tự hoàn thành: nói rõ không có điểm hay thưởng; đi tiếp (game kế tiếp theo điều kiện mở), về làng, hoặc chơi thật. */
export function AutoCompletedPanel({ levelId, onPlayReal, onNext, onLeave }: { levelId: number; onPlayReal: () => void; onNext?: () => void; onLeave: () => void }) {
  const next = nextReadyLevel(levelId);
  const name = fmt(levelById(levelId)?.ten ?? '');
  return (
    <Panel className="mx-auto w-full max-w-xl space-y-4 p-6 text-center" role="status" data-testid="da-tu-hoan-thanh">
      <h2 className="text-2xl text-muc-tim-dam">{autoCompleteUi.tieuDe}</h2>
      <p className="font-display text-lg font-extrabold">{name}</p>
      <p className="text-base font-semibold">{autoCompleteUi.loi}</p>
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
