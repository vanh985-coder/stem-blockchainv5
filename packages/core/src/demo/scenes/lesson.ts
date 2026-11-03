/** Điều khiển trang bài học 2D (`LessonPage2D`): lời người dẫn, giới thiệu trạm, chơi trạm, kết quả trạm, màn hoàn thành. */
import { tutorialTexts } from '../../content/tutorial';
import { ui } from '../../content/ui';
import { clickEl, q, type Ctx } from '../actions';
import { pace, PACING } from '../pacing';
import { buttonByText, dwell, playVnDialogs } from '../ui';

export const lessonStage = (): string | undefined => q('.lesson-screen')?.dataset.demoStage;

/** Hướng dẫn làm thử (P8) của trạm: cho xem một lúc rồi bấm "Bỏ qua". */
export async function skipTutorial(ctx: Ctx, watchMs = PACING ? PACING.tutorialWatchMs : 3200): Promise<void> {
  const skip = await ctx.ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'tutorial skip button', 10000);
  await ctx.ctl.sleep(watchMs);
  await clickEl(ctx, skip, { settle: 700 });
  await ctx.ctl.waitFor(() => !buttonByText(tutorialTexts.chung.boQua), 'tutorial closed', 5000);
}

export interface LessonDrive {
  /** Chơi trạm `idx` (0 Dễ, 1 Trung bình, 2 Khó) tới khi trang chuyển sang kết quả trạm */
  playStation: (ctx: Ctx, idx: number) => Promise<void>;
}

/** Chạy cả bài từ trạm hiện tại tới màn hoàn thành ('complete'). */
export async function driveLesson(ctx: Ctx, drive: LessonDrive): Promise<void> {
  const { ctl } = ctx;
  let station = 0;
  let lastStage = '';
  const t0 = performance.now();
  for (;;) {
    const stage = await ctl.waitFor(() => lessonStage(), 'lesson stage', 30000);
    if (stage !== lastStage) {
      lastStage = stage;
      console.info(`[demo] stage ${stage} t=${Math.round(performance.now() - t0)}ms`);
    }
    if (stage === 'complete') return;
    if (stage === 'failed') throw new Error('lesson station failed');
    if (stage === 'dialogue' || stage === 'outro') {
      await playVnDialogs(ctx);
    } else if (stage === 'intro') {
      await ctl.sleep(pace(2200));
      const start = q<HTMLButtonElement>('[data-demo="intro-start"]');
      if (start) await clickEl(ctx, start, { settle: 500 });
    } else if (stage === 'play') {
      const idx = [...document.querySelectorAll('.lesson-screen ol li')].findIndex((li) => li.querySelector('[aria-current="step"]'));
      station = idx >= 0 ? idx : station;
      await drive.playStation(ctx, station);
    } else if (stage === 'stationDone') {
      if (!PACING) await dwell(ctx, q('.lesson-screen h2')?.textContent ?? '');
      await ctl.sleep(pace(1500));
      const next = q<HTMLButtonElement>('[data-demo="station-next"]');
      if (next) await clickEl(ctx, next, { settle: 500 });
    } else {
      await ctl.sleep(300);
    }
  }
}

/** Trả lời câu suy ngẫm cuối trạm (chọn phương án đầu, "Chốt", đọc giải thích). */
export async function answerReflection(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const radios = await ctl.waitFor(() => {
    const r = [...document.querySelectorAll<HTMLElement>('[role="radio"]')];
    return r.length > 0 ? r : null;
  }, 'reflection options', 8000);
  await ctl.sleep(pace(1200));
  await clickEl(ctx, radios[0], { settle: 500 });
  const chot = await ctl.waitFor(() => buttonByText(ui.suyNgam.chot), 'reflection submit', 4000);
  await clickEl(ctx, chot, { settle: 500 });
  const note = await ctl.waitFor(() => q('[role="status"]'), 'reflection explanation', 4000);
  await dwell(ctx, note.textContent ?? '');
}
