import { useEffect } from 'react';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';
import { formatTime, formatXP } from '../lib/format';
import { useSettings } from '../settings/SettingsProvider';
import { Button } from './Button';
import { Panel } from './Panel';
import { PortraitFrame } from './PortraitFrame';
import { Stars } from './Stars';

export interface LevelCompleteProps {
  stars: number; // 1..3
  xpGained: number;
  timeSpentSec?: number;
  keyTakeaway: string; // "Điều em vừa học"
  reflectionQuestion?: {
    question: string;
    options?: string[];
  };
  onPlayAgain: () => void;
  onNextLevel: () => void;
  hasNextLevel?: boolean;
  nextLabel?: string;
  /** Khi không còn màn tiếp theo: sau onNextLevel, mở địa chỉ này (mốc 1: bản đồ ở web chính). */
  nextLessonUrl?: string;
}

/** Màn hoàn thành thử thách: sao, kinh nghiệm, điều vừa học, câu hỏi suy ngẫm. */
export function LevelComplete({
  stars,
  xpGained,
  timeSpentSec,
  keyTakeaway,
  reflectionQuestion,
  onPlayAgain,
  onNextLevel,
  hasNextLevel = true,
  nextLabel,
  nextLessonUrl,
}: LevelCompleteProps) {
  const { settings } = useSettings();

  // Âm thanh chúc mừng; pháo giấy chỉ khi không bật "Giảm chuyển động"
  useEffect(() => {
    sound.playLevelComplete();
    if (settings.reducedMotion) return;

    let mounted = true;
    import('canvas-confetti')
      .then((mod) => {
        if (!mounted) return;
        void mod.default({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5B3FD6', '#3FA34D', '#F2B33D', '#8A5A3B', '#D94A38'],
        });
      })
      .catch(() => {
        // Không nạp được pháo giấy thì bỏ qua, không ảnh hưởng màn chơi.
      });
    return () => {
      mounted = false;
    };
  }, [settings.reducedMotion]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <Panel className="p-6 text-center sm:p-8">
        <div className="mb-4 flex justify-center">
          <PortraitFrame portrait="bi" size={112} />
        </div>

        <h2 className="mb-2 text-3xl text-muc-tim-dam">{ui.hoanThanh.tieuDe}</h2>
        <p className="mb-6 text-sm sm:text-base">{ui.hoanThanh.loiKhen}</p>

        <div className="mb-4 flex justify-center">
          <Stars earned={stars} max={3} size="lg" />
        </div>

        <div className="my-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border-2 border-nau-go bg-white/70 p-4">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-nau-go-dam">
              {ui.hoanThanh.kinhNghiem}
            </span>
            <span className="font-display text-2xl font-extrabold text-xanh-la-dam">{formatXP(xpGained)}</span>
          </div>
          <div className="rounded-2xl border-2 border-nau-go bg-white/70 p-4">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-nau-go-dam">
              {ui.hoanThanh.thoiGian}
            </span>
            <span className="font-display text-2xl font-extrabold">
              {timeSpentSec !== undefined ? formatTime(timeSpentSec) : '--:--'}
            </span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border-2 border-muc-tim/50 bg-white/70 p-4 text-left">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muc-tim-dam">
            <span aria-hidden="true">✨</span> {ui.hoanThanh.dieuVuaHoc}
          </div>
          <p className="text-base font-semibold leading-relaxed">{keyTakeaway}</p>
        </div>

        {reflectionQuestion && (
          <div className="mb-6 rounded-2xl border-2 border-nau-go/50 bg-white/50 p-4 text-left">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-nau-go-dam">
              <span aria-hidden="true">💭</span> {ui.hoanThanh.cauHoiSuyNgam}
            </div>
            <p className="mb-3 text-sm sm:text-base">{reflectionQuestion.question}</p>
            {reflectionQuestion.options && (
              <div className="space-y-2">
                {reflectionQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sound.playClick()}
                    className="min-h-11 w-full rounded-xl border-2 border-nau-go bg-giay p-2.5 text-left text-sm font-medium hover:brightness-105 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button variant="secondary" onClick={onPlayAgain} fullWidth className="sm:w-auto">
            {ui.hoanThanh.choiLai}
          </Button>
          {hasNextLevel ? (
            <Button onClick={onNextLevel} fullWidth className="sm:w-auto">
              {nextLabel || ui.hoanThanh.manTiepTheo}
            </Button>
          ) : (
            <Button
              onClick={() => {
                onNextLevel();
                if (nextLessonUrl) window.location.assign(nextLessonUrl);
              }}
              fullWidth
              className="sm:w-auto"
            >
              {nextLabel || ui.chung.veBanDo}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
