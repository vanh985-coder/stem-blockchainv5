import { AssetImage, Button, LEVELS, fmt, levelById, levelUrl, URLS, ui, type LevelDef, type LevelState, type LevelUnlock, type Progress } from '@so-chung/core';

/** Chữ và hình cho từng trạng thái: phân biệt bằng hình và chữ, không chỉ bằng màu. */
export const STATE_TEXT: Record<LevelState, string> = {
  locked: ui.moKhoa.khoa,
  open: ui.moKhoa.mo,
  done: ui.moKhoa.xong,
  'coming-soon': ui.moKhoa.sapRaMat,
};
export const STATE_ICON: Record<LevelState, string> = { locked: '🔒', open: '▶', done: '✓', 'coming-soon': '⏳' };

const DOT_CLS: Record<LevelState, string> = {
  locked: 'border-chu bg-white',
  open: 'border-chu bg-vang',
  done: 'border-xanh-la-dam bg-xanh-la text-white',
  'coming-soon': 'border-dashed border-nau-go bg-giay',
};

/** Chấm nhỏ của một màn: hình khác nhau cho mỗi trạng thái (khóa, mở, xong, sắp ra mắt). */
export function LevelDot({ state }: { state: LevelState }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-6 place-items-center rounded-full border-2 text-xs font-bold leading-none ${DOT_CLS[state]} ${state === 'open' ? 'rounded-md' : ''}`}
    >
      {STATE_ICON[state]}
    </span>
  );
}

/** Số sao đã đạt và tổng: bài học có 3 trạm (tối đa 9 sao), game có mốc điểm (tối đa 3). */
export function starsOf(def: LevelDef, progress: Progress): { earned: number; max: number } {
  const s = progress.levels[def.id]?.stars ?? {};
  return def.kind === 'lesson'
    ? { earned: (s.de ?? 0) + (s.tb ?? 0) + (s.kho ?? 0), max: 9 }
    : { earned: s.game ?? 0, max: 3 };
}

/** Danh sách 3 màn của một làng, mỗi màn hiện đúng một trạng thái. */
export function VillageDetails({
  villageId,
  unlockLevels,
  progress,
  goldenEarned,
  onClose,
  onReplayIntro,
}: {
  villageId: LevelDef['lang'];
  unlockLevels: LevelUnlock[];
  progress: Progress;
  goldenEarned: boolean;
  onClose?: () => void;
  /** Mở lại lời giới thiệu làng */
  onReplayIntro?: () => void;
}) {
  const levels = LEVELS.filter((l) => l.lang === villageId);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl">{ui.lang[villageId]}</h2>
        {onClose && (
          <Button variant="secondary" size="sm" onClick={onClose}>
            {ui.banDo.dong}
          </Button>
        )}
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold text-nau-go-dam">
        <AssetImage
          path="ui/icons/trang-vang"
          alt=""
          className={`size-7 object-contain ${goldenEarned ? '' : 'grayscale opacity-40'}`}
        />
        {goldenEarned ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
      </p>
      {onReplayIntro && (
        <Button variant="secondary" size="sm" onClick={onReplayIntro}>
          {ui.banDo.xemLaiGioiThieu}
        </Button>
      )}
      <ul className="space-y-2">
        {levels.map((def) => {
          const u = unlockLevels.find((x) => x.id === def.id) ?? { id: def.id, state: 'locked' as const };
          const blocker = u.lockedBy ? levelById(u.lockedBy) : undefined;
          const stars = starsOf(def, progress);
          const canEnter = u.state === 'open' || u.state === 'done';
          return (
            <li key={def.id} className="space-y-1 rounded-2xl border-2 border-nau-go/60 bg-white/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-nau-go-dam">
                {def.kind === 'lesson' ? ui.banDo.manBaiHoc : ui.banDo.manGame}
              </p>
              <p className="font-display text-lg font-extrabold leading-snug">{fmt(def.ten)}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-nau-go px-2 py-0.5 text-sm font-bold">
                  <span aria-hidden="true">{STATE_ICON[u.state]}</span>
                  {STATE_TEXT[u.state]}
                </span>
                {u.state === 'done' && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <AssetImage path="ui/icons/ngoi-sao" alt="" className="size-6 object-contain" />
                    {fmt(ui.banDo.soSao, stars)}
                  </span>
                )}
                {canEnter && (
                  <Button size="sm" variant={u.state === 'done' ? 'secondary' : 'primary'} onClick={() => window.location.assign(levelUrl(URLS, def.lang, def.id))}>
                    {ui.banDo.vao}
                  </Button>
                )}
              </div>
              {u.state === 'locked' && blocker && (
                <p className="text-sm font-semibold">
                  {fmt(ui.moKhoa.hoanThanh, { so: blocker.id, man: fmt(blocker.ten) })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
