import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { AssetImage, Button, Hearts, Panel, ProgressBar, QuizCard, fmt, gameUi, pickQuestions, runnerScoreLabels, runnerUi, useGameHint, type MiniGameRenderProps, type Question, type ScorePart } from '@so-chung/core';
import { Scene3D, isQualityChoice, type QualityChoice } from '@so-chung/core/three/index';
import { RUNNER_SPEC as SPEC } from './runnerConfig';
import { SWIPE_MIN_PX, keyToCommand, swipeToCommand } from './runnerCommands';
import { hintFor } from './runnerHint';
import { makeCell, scoreParts } from './runnerLogic';
import { RunnerSession } from './runnerSession';
import { RunnerWorld, type QuizView, type RunnerHud } from './RunnerWorld';
import { CAMERA } from './runnerView';

/** Ép mức chất lượng bằng ?q=low|medium|high (để kiểm tra hiệu năng); không có thì theo Cài đặt. */
function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Hạt giống của ván: khác nhau mỗi lần (ngẫu nhiên chỉ ở đây; mọi luật trong `runnerLogic` đều tất định theo hạt giống). */
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

const INITIAL_HUD: RunnerHud = { hearts: SPEC.hearts, pages: 0, coins: 0, meters: 0, round: 0, shield: 0, boots: 0, magnet: 0 };

/** Trang sổ: biểu tượng nhỏ cho thanh trên (tờ giấy có gáy tím). */
function PageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3" width="15" height="18" rx="2" fill="#F6EBD3" stroke="#8A5A3B" strokeWidth="1.6" />
      <rect x="5" y="3" width="3.4" height="18" rx="1.2" fill="#5B3FD6" />
    </svg>
  );
}

/** Nón lá: biểu tượng nhỏ (hình nón) cho thanh trên. */
function HatIcon() {
  return (
    <svg width="26" height="22" viewBox="0 0 28 24" aria-hidden="true">
      <path d="M14 2 L26 19 Q14 23 2 19 Z" fill="#ECD696" stroke="#8A5A3B" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2 L18 20 M14 2 L9 20" stroke="#B88F4A" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Một vật đặc biệt đang có tác dụng: biểu tượng và số giây còn lại. */
function PowerChip({ icon, name, seconds }: { icon: ReactNode; name: string; seconds: number }) {
  return (
    <div role="img" aria-label={fmt(runnerUi.conLai, { nhan: name, giay: seconds })} className="flex items-center gap-1.5 rounded-nut border-2 border-nau-go bg-giay/90 px-2 py-1 shadow-md">
      {icon}
      <span className="min-w-[1.4ch] font-display text-lg font-extrabold">{seconds}</span>
    </div>
  );
}

/** Thanh trên: tim, trang sổ, tiền đồng, quãng đường, vòng; hàng dưới là các vật đặc biệt còn tác dụng (biểu tượng + giây còn lại). */
function RunnerHudBar({ hud }: { hud: RunnerHud }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-4.5rem)] flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-nut border-2 border-nau-go bg-giay/90 px-3 py-1.5 shadow-md">
        <Hearts current={hud.hearts} max={SPEC.hearts} />
        <span role="img" aria-label={fmt(runnerUi.trang, { so: hud.pages })} className="flex items-center gap-1 font-display text-xl font-extrabold" data-testid="so-trang">
          <PageIcon />
          {hud.pages}
        </span>
        <span role="img" aria-label={fmt(runnerUi.tien, { so: hud.coins })} className="flex items-center gap-1 font-display text-xl font-extrabold" data-testid="so-tien">
          <AssetImage path="ui/icons/tien-dong" alt="" className="size-6 object-contain" />
          {hud.coins}
        </span>
        <span className="font-display text-xl font-extrabold" data-testid="quang-duong">
          {fmt(gameUi.quangDuong, { so: hud.meters })}
        </span>
        <span className="font-display text-lg font-bold text-nau-go-dam" data-testid="vong">
          {fmt(runnerUi.vong, { so: Math.min(SPEC.rounds, hud.round + 1), max: SPEC.rounds })}
        </span>
      </div>
      {(hud.shield > 0 || hud.boots > 0 || hud.magnet > 0) && (
        <div className="flex gap-2" data-testid="vat-dac-biet">
          {hud.shield > 0 && <PowerChip icon={<HatIcon />} name={runnerUi.nonla} seconds={hud.shield} />}
          {hud.boots > 0 && <PowerChip icon={<AssetImage path="ui/icons/guoc-moc" alt="" className="size-6 object-contain" />} name={runnerUi.guoc} seconds={hud.boots} />}
          {hud.magnet > 0 && <PowerChip icon={<AssetImage path="ui/icons/tui-tien" alt="" className="size-6 object-contain" />} name={runnerUi.tui} seconds={hud.magnet} />}
        </div>
      )}
    </div>
  );
}

/**
 * Câu hỏi giữa ván (sau mỗi vòng): QuizCard về Bài 1; đúng thì +3 trang, sai thì mất 1 tim, kèm giải thích; hết 15 giây không trả lời thì mất 1 tim và hiện đáp án. Bấm "Chạy tiếp" thì
 * trò chơi tăng tốc lại (hoặc ra màn kết quả nếu hết 4 vòng hay hết tim).
 */
function QuizOverlay({ session, question, quiz, hearts }: { session: RunnerSession; question: Question; quiz: QuizView; hearts: number }) {
  const [timeLeft, setTimeLeft] = useState<number>(SPEC.quizSec);
  useEffect(() => {
    if (quiz.answered !== null) return;
    const id = setInterval(() => setTimeLeft(session.state.quiz?.timeLeft ?? 0), 100);
    return () => clearInterval(id);
  }, [session, quiz.answered, quiz.round]);
  const last = quiz.round + 1 >= SPEC.rounds || hearts <= 0;
  const onAnswer = useCallback((ok: boolean) => session.answerQuiz(ok), [session]);
  const resume = useCallback(() => session.resumeQuiz(), [session]);
  const label = last ? runnerUi.xemKetQua : runnerUi.chayTiep;
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 p-3 [@media(max-height:520px)]:p-2 sm:items-center" data-testid="cau-hoi">
      <div className="flex max-h-full w-full max-w-2xl flex-col gap-3 py-2 [@media(max-height:520px)]:gap-1.5 [@media(max-height:520px)]:py-0">
        <p className="shrink-0 rounded-nut bg-giay/95 px-4 py-2 [@media(max-height:520px)]:py-1 text-center font-display text-lg [@media(max-height:520px)]:text-base font-bold shadow-md">{fmt(runnerUi.cauHoi, { so: quiz.round + 1 })}</p>
        {quiz.answered === null && (
          <div className="shrink-0 rounded-nut bg-giay/95 px-4 py-2 [@media(max-height:520px)]:py-1 shadow-md">
            <p className="mb-1 text-sm font-semibold" data-testid="con-gio">
              {fmt(runnerUi.conGio, { giay: Math.ceil(timeLeft) })}
            </p>
            <ProgressBar current={timeLeft} max={SPEC.quizSec} />
          </div>
        )}
        {quiz.timedOut ? (
          <Panel className="shrink-0 space-y-3" role="alert" data-testid="het-gio">
            <p className="text-lg font-bold text-do-son-dam">{runnerUi.hetGio}</p>
            <p>{fmt(runnerUi.dapAnDung, { dapAn: question.options[question.correctIndex] })}</p>
            <p>{fmt(question.explanation)}</p>
            <Button autoFocus onClick={resume}>
              {label}
            </Button>
          </Panel>
        ) : (
          <>
            <QuizCard key={quiz.round} question={question} levelId={2} caption={fmt(runnerUi.cauSo, { so: quiz.round + 1, max: SPEC.rounds })} onAnswer={onAnswer} onContinue={resume} continueLabel={label} className="max-w-none" />
            {quiz.answered !== null && (
              <p className="shrink-0 rounded-nut bg-giay/95 px-4 py-2 [@media(max-height:520px)]:py-1 text-center font-semibold [@media(max-height:520px)]:text-sm shadow-md" data-testid="ket-qua-cau">
                {quiz.answered ? fmt(runnerUi.quizDung, { so: SPEC.quizPages }) : runnerUi.quizSai}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Phần chơi của màn 2: khung 3D, điều khiển (bàn phím, vuốt), thanh trên, câu hỏi giữa ván. Bọc trong `MiniGameLevel` (thẻ bắt đầu, màn kết quả). Ván đủ 4 vòng 25 giây, mỗi vòng
 * một câu hỏi Bài 1; kết thúc khi hết 4 vòng hoặc hết tim.
 */
export function RunnerGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const forced = useMemo(forcedQuality, []);
  // mỗi lần chơi (attempt) là một ván mới với hạt giống mới
  const session = useMemo(() => new RunnerSession({ seed: newSeed() }), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  // 4 câu hỏi Bài 1 cho ván này (không lặp, đã trộn thứ tự đáp án)
  const questions = useMemo(() => pickQuestions({ bai: 1, soCau: SPEC.rounds, seed: session.seed }), [session]);
  if (import.meta.env.DEV) Object.assign(window, { __runner: session, __runnerQuestions: questions, __makeCell: makeCell });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Nút "?": câu nhắc theo trạng thái ván (không lộ đáp án)
  useGameHint(setHint, 2, () => hintFor(session.state));
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState<RunnerHud>(INITIAL_HUD);
  const [quiz, setQuiz] = useState<QuizView | null>(null);
  useEffect(() => {
    setHud(INITIAL_HUD);
    setQuiz(null);
  }, [session]);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const onOver = useCallback(
    (score: number) => {
      const parts: ScorePart[] = scoreParts(session.state).map((p) => ({ label: runnerScoreLabels[p.key], count: p.count, points: p.points }));
      finishRef.current(score, parts);
    },
    [session],
  );

  // Bàn phím: ←/→ hoặc A/D đổi làn; ↑, W, Space nhảy; ↓, S trượt. Mỗi lần bấm là một lệnh (không lặp khi giữ phím). Lúc hỏi thì để phím cho câu hỏi.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (session.state.phase === 'quiz' || pausedRef.current) return;
      const c = keyToCommand(e.code);
      if (!c) return;
      e.preventDefault();
      if (!e.repeat) session.command(c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  // Chỉ khi chạy dev: ?bot=good hoặc ?bot=avg cho bot chơi thay (kiểm tra trọn một ván trên cảnh 3D thật); câu hỏi vẫn do người (hoặc kịch bản) bấm.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const mode = new URLSearchParams(location.search).get('bot');
    if (mode !== 'good' && mode !== 'avg') return;
    let stop = false;
    let raf = 0;
    void import('./testBots').then((m) => {
      const brain = new m.BotBrain(session.seed, mode === 'good' ? m.GOOD_BOT : m.AVERAGE_BOT);
      const tick = () => {
        if (stop) return;
        const s = session.state;
        if (s.phase === 'run' || s.phase === 'slow' || s.phase === 'resume') {
          const i = brain.decide(s);
          if (i.move) session.command(i.move > 0 ? 'left' : 'right');
          if (i.jump) session.command('jump');
          if (i.slide) session.command('slide');
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
    };
  }, [session]);

  // Điện thoại: vuốt trái, phải, lên, xuống. Phát lệnh ngay khi ngón tay đã đi đủ xa (không chờ nhấc tay), mỗi lần chạm một lệnh.
  const touch = useRef({ id: -1, x: 0, y: 0, fired: false });
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = touch.current;
    t.id = e.pointerId;
    t.x = e.clientX;
    t.y = e.clientY;
    t.fired = false;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = touch.current;
    if (t.id !== e.pointerId || t.fired || session.state.phase === 'quiz' || pausedRef.current) return;
    const c = swipeToCommand(e.clientX - t.x, e.clientY - t.y, SWIPE_MIN_PX);
    if (c) {
      t.fired = true;
      session.command(c);
    }
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (touch.current.id === e.pointerId) touch.current.id = -1;
  };

  return (
    <div
      className="fixed inset-0 select-none bg-giay"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <Scene3D
        errorCovers
        quality={forced}
        camera={{ position: [0, CAMERA.height, -CAMERA.back], fov: CAMERA.fov }}
        lookAt={[0, CAMERA.lookHeight, CAMERA.lookAhead]}
        fog={[70, 190]}
        sunPosition={[26, 46, 18]}
        shadowFollowPlayer
        onReady={() => setReady(true)}
      >
        <RunnerWorld session={session} paused={paused || !ready} onHud={setHud} onQuiz={setQuiz} onOver={onOver} />
      </Scene3D>
      {ready && <RunnerHudBar hud={hud} />}
      {quiz && questions[quiz.round] && <QuizOverlay session={session} question={questions[quiz.round]} quiz={quiz} hearts={hud.hearts} />}
    </div>
  );
}
