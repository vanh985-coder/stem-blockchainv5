import { useMemo } from 'react';
import {
  CHARACTERS,
  NenTrangTri,
  VILLAGE_INTRO,
  VILLAGE_THEME,
  VnDialog,
  fmt,
  goldenPageNumber,
  introTasks,
  knowScrollUi,
  speakerLabel,
  ui,
  villageIntroTexts,
  villageKnowCards,
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
export default function VillageIntro({ village, unlockLevels, onDone, onCardsRead }: { village: VillageId; unlockLevels: readonly LevelUnlock[]; onDone: () => void; /** Đọc hết các lượt (bấm nút ở lượt cuối, không phải "Bỏ qua"): đã đọc đủ các thẻ Em có biết của làng */ onCardsRead?: () => void }) {
  const turns = useMemo<VnTurn[]>(() => {
    const { guide, turns: lines } = VILLAGE_INTRO[village];
    const base = { speaker: speakerLabel(guide), portrait: CHARACTERS[guide].portrait };
    const cards = villageKnowCards(village);
    return [
      // Lượt đầu là lời chào nên người dẫn tươi cười (nếu có ảnh cười)
      ...lines.map((text, i) => ({ ...base, text: fmt(text), mood: i === 0 ? ('vui' as const) : undefined })),
      // các thẻ "Em có biết?" của làng (bước X3): đọc đủ mới vào được bài
      ...cards.map((c, i) => ({
        ...base,
        text: `${fmt(knowScrollUi.banDoThe, { n: i + 1, tong: cards.length })}. ${fmt(c.title)}. ${fmt(c.text)}`,
        extra: c.example ? <p className="rounded-xl border-2 border-vang bg-vang/15 p-3 text-base">{fmt(c.example)}</p> : undefined,
      })),
      { ...base, text: fmt(T.lanCuoi, { so: goldenPageNumber(village) }), extra: <TaskList village={village} unlockLevels={unlockLevels} /> },
    ];
  }, [village, unlockLevels]);

  return (
    <VnDialog
      turns={turns}
      onFinish={() => {
        onCardsRead?.();
        onDone();
      }}
      onSkip={onDone}
      finishLabel={T.ketThuc}
      background={`scenes/bai-hoc-${village}`}
      label={fmt(T.nhan, { lang: ui.lang[village] })}
      decor={<NenTrangTri theme={VILLAGE_THEME[village]} image={null} sparkle />}
    />
  );
}
