import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { Button } from './Button';
import { Panel } from './Panel';
import { PortraitFrame } from './PortraitFrame';

export type MascotMood = 'vui' | 'suy_nghi' | 'buon' | 'an_mung' | 'ngac_nhien';

export interface LevelIntroProps {
  title: string;
  objective: string;
  /** Giữ để tương thích với bài cũ; Bi hiện chưa đổi nét mặt. */
  mascotMood?: MascotMood;
  tip?: string;
  onStart: () => void;
  startLabel?: string;
  lessonName?: string;
  difficultyLabel?: string;
}

/** Màn giới thiệu mỗi thử thách: tên, mục tiêu (Bi nói), mẹo. */
export function LevelIntro({
  title,
  objective,
  tip,
  onStart,
  startLabel = ui.gioiThieu.batDau,
  lessonName,
  difficultyLabel,
}: LevelIntroProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <Panel className="p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {lessonName && (
            <span className="rounded-full border-2 border-muc-tim bg-muc-tim/10 px-3 py-1 text-sm font-semibold text-muc-tim-dam">
              {lessonName}
            </span>
          )}
          {difficultyLabel && (
            <span className="rounded-full border-2 border-nau-go bg-giay px-3 py-1 text-sm font-semibold text-nau-go-dam">
              {fmt(ui.gioiThieu.muc, { muc: difficultyLabel })}
            </span>
          )}
        </div>

        <h2 className="mb-4 text-2xl sm:text-3xl">{title}</h2>

        <div className="my-6 flex flex-col items-center gap-5 rounded-2xl border-2 border-nau-go/50 bg-white/60 p-5 sm:flex-row sm:items-start">
          <PortraitFrame portrait="bi" size={96} />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h4 className="text-lg text-muc-tim-dam">{ui.gioiThieu.mucTieu}</h4>
            <p className="text-base font-medium leading-relaxed sm:text-lg">{objective}</p>
          </div>
        </div>

        {tip && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border-2 border-vang bg-vang/15 p-3.5 text-sm sm:text-base">
            <span aria-hidden="true" className="text-lg leading-none">
              💡
            </span>
            <p className="leading-snug">
              <span className="font-bold">{ui.gioiThieu.meoTuBi}</span>
              {tip}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center sm:justify-end">
          <Button size="lg" onClick={onStart} fullWidth className="sm:w-auto">
            {startLabel}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
