import { useMemo } from 'react';
import {
  CHARACTERS,
  VILLAGE_INTRO,
  VnDialog,
  fmt,
  goldenPageNumber,
  introTasks,
  speakerLabel,
  ui,
  villageIntroTexts,
  type LevelUnlock,
  type VillageId,
  type VnTurn,
} from '@so-chung/core';
import { STATE_ICON, STATE_TEXT } from './parts';

const T = villageIntroTexts;

/** Lượt cuối: danh sách 3 màn của làng (tên, Bài học/Thử thách, trạng thái bằng hình và chữ). */
function TaskList({ village, unlockLevels }: { village: VillageId; unlockLevels: readonly LevelUnlock[] }) {
  const tasks = introTasks(village, unlockLevels);
  return (
    <ol aria-label={T.danhSach} className="space-y-2">
      {tasks.map((t, i) => (
        <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 border-nau-go/60 bg-white/60 px-3 py-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muc-tim-dam font-display text-sm font-extrabold text-white">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold uppercase tracking-wide text-nau-go-dam">{T.loai[t.kind]}</span>
            <span className="block font-display text-base font-extrabold leading-snug sm:text-lg">{fmt(t.ten)}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-nau-go px-2 py-0.5 text-sm font-bold">
            <span aria-hidden="true">{STATE_ICON[t.state]}</span>
            {STATE_TEXT[t.state]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Giới thiệu làng kiểu visual novel (lần đầu bấm vào làng trên /ban-do): chân dung lớn của người dẫn,
 * nền là ảnh scenes/bai-hoc-<làng> làm mờ; lượt cuối có danh sách 3 màn. Xong hoặc bỏ qua đều gọi onDone.
 */
export default function VillageIntro({ village, unlockLevels, onDone }: { village: VillageId; unlockLevels: readonly LevelUnlock[]; onDone: () => void }) {
  const turns = useMemo<VnTurn[]>(() => {
    const { guide, turns: lines } = VILLAGE_INTRO[village];
    const base = { speaker: speakerLabel(guide), portrait: CHARACTERS[guide].portrait };
    return [
      // Lượt đầu là lời chào nên người dẫn tươi cười (nếu có ảnh cười)
      ...lines.map((text, i) => ({ ...base, text: fmt(text), mood: i === 0 ? ('vui' as const) : undefined })),
      { ...base, text: fmt(T.lanCuoi, { so: goldenPageNumber(village) }), extra: <TaskList village={village} unlockLevels={unlockLevels} /> },
    ];
  }, [village, unlockLevels]);

  return (
    <VnDialog
      turns={turns}
      onFinish={onDone}
      onSkip={onDone}
      finishLabel={T.ketThuc}
      background={`scenes/bai-hoc-${village}`}
      label={fmt(T.nhan, { lang: ui.lang[village] })}
    />
  );
}
