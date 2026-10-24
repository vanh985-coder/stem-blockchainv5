import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, Panel, ProgressBar, QuizCard, fmt, kiteUi, pickQuestions, sound, useGameHint, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { KITE_SPEC as C } from './kiteConfig';
import { useKiteTextures } from './kiteArt';
import { hintFor } from './kiteHint';
import { SHAKE_SECONDS } from './kiteLayout';
import { answerGate, createKiteGame, flap, tickKite, type GateResult, type KiteEvent } from './kiteLogic';
import { KiteStage, createView, type KiteView } from './KiteStage';

const LEVEL_ID = 6;
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

interface QuizUi {
  /** Cổng nào (đếm từ 0): cũng là chỉ số câu hỏi */
  index: number;
  total: number;
  /** Giây còn lại (làm tròn lên, để hiện) */
  left: number;
  answered: null | boolean | 'timeout';
}

type Ending = null | 'hearts' | 'complete';

/** Trái tim của HUD (hình vẽ bằng code, không chữ): đỏ là còn, xám là đã mất */
function HeartIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="-26 -28 52 52" className="size-[18px] shrink-0" aria-hidden="true" data-on={on ? '1' : '0'}>
      <path d="M0 18 C-30 -2 -22 -26 -8 -24 C-3 -24 0 -20 0 -16 C0 -20 3 -24 8 -24 C22 -26 30 -2 0 18 Z" fill={on ? '#d9473b' : '#cfc7b8'} stroke="#5b3a22" strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
}

/** Trang bản sao của HUD (hình vẽ bằng code) */
function PageIcon() {
  return (
    <svg viewBox="0 0 24 28" className="h-[18px] w-4 shrink-0" aria-hidden="true">
      <path d="M3 2 H15 L21 8 V26 H3 Z" fill="#f8ecc9" stroke="#8a5a36" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M7 14 H17 M7 19 H15" stroke="#a77d4b" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Màn 6 "Diều đưa sổ" (spec 06): Scene25D nhìn ngang, diều của học sinh bay qua các khe giữa hai cột tre, tới cổng làng thì trả lời câu hỏi để giao sổ. Luật nằm hết ở `kiteLogic`; ở đây chỉ nối thao tác (chạm, bấm chuột,
 * Space: nhận ngay ở pointerdown và keydown), hoạt cảnh (rung màn, giao sổ), âm thanh vào luật. Vòng lặp requestAnimationFrame gọi `tickKite` (giây); tạm dừng (nút "?", tab ẩn, nhắc xoay ngang) thì mọi đồng hồ đứng yên.
 */
export function KiteGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo(() => createKiteGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  // 4 câu hỏi ôn Bài 1 và 2 cho 4 cổng (không lặp, đã trộn thứ tự đáp án; cách chọn như màn 5)
  const questions = useMemo(() => pickQuestions({ bai: [1, 2], soCau: state.gateAfter.length, seed: state.seed }), [state]);
  const view = useRef<KiteView>(createView(state, reduced));
  const viewKey = useRef(state);
  if (viewKey.current !== state) {
    viewKey.current = state;
    view.current = createView(state, reduced);
  }
  view.current.reduced = reduced;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const textures = useKiteTextures();

  const [mode, setMode] = useState<FrameMode>('landscape');
  const [warm, setWarm] = useState(false);
  const [quiz, setQuiz] = useState<QuizUi | null>(null);
  const [ending, setEnding] = useState<Ending>(null);
  const [delivered, setDelivered] = useState<number | null>(null);
  const finished = useRef(false);
  const pending = useRef<GateResult | null>(null);
  const quizLeft = useRef(0);
  const shownLeft = useRef(0);

  const ready = warm && textures.done;
  const rotated = mode === 'rotate';
  const holdLoop = paused || !ready || rotated;
  const holdRef = useRef(holdLoop);
  holdRef.current = holdLoop;
  useGameHint(setHint, LEVEL_ID, () => hintFor(state));

  // Ván mới: dọn mọi thứ
  useEffect(() => {
    finished.current = false;
    pending.current = null;
    quizLeft.current = 0;
    setQuiz(null);
    setEnding(null);
    setDelivered(null);
  }, [state]);

  // Nạp trước: cho mọi hình trong pool hiện rất nhỏ lúc màn hình tải còn che cảnh, để texture lên GPU trước và lần đầu không khựng
  const warmUp = useCallback(() => {
    const v = view.current;
    v.warm = true;
    setTimeout(() => {
      v.warm = false;
      setWarm(true);
    }, 700);
  }, []);

  const handleEvents = useCallback(
    (events: readonly KiteEvent[]) => {
      const v = view.current;
      for (const e of events) {
        switch (e.type) {
          case 'page':
            sound.playPickup(true);
            break;
          case 'hit':
            v.shake = 1;
            sound.playWrong();
            break;
          case 'gate': {
            const total = C.gates.quizSeconds;
            quizLeft.current = total;
            shownLeft.current = total;
            setQuiz({ index: e.gate, total, left: total, answered: null });
            break;
          }
          case 'gateAnswer':
            if (e.result !== 'correct') {
              v.shake = 1;
              sound.playWrong();
            }
            break;
          case 'end':
            setEnding(e.reason);
            if (e.reason === 'complete') sound.playLevelComplete();
            break;
          default:
            break;
        }
      }
      if (events.length > 0) bump();
    },
    [],
  );

  // ----- vòng lặp thời gian
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (holdRef.current) return;
      const v = view.current;
      v.clock += dt;
      v.shakeClock += dt;
      if (v.shake > 0) v.shake = Math.max(0, v.shake - dt / SHAKE_SECONDS);
      if (v.deliver.active) v.deliver.t += dt;
      const events = tickKite(state, dt, false);
      if (events.length > 0) handleEvents(events);
      // đồng hồ trả lời: chỉ đếm khi bảng câu hỏi mở và em chưa trả lời
      if (quizLeft.current > 0 && !pending.current && state.phase === 'quiz') {
        quizLeft.current = Math.max(0, quizLeft.current - dt);
        const shown = Math.ceil(quizLeft.current);
        if (shown !== shownLeft.current) {
          shownLeft.current = shown;
          setQuiz((q) => (q && q.answered === null ? { ...q, left: shown } : q));
        }
        if (quizLeft.current <= 0) {
          pending.current = 'timeout';
          v.deliver = { active: true, t: 0, ok: false };
          setQuiz((q) => (q ? { ...q, left: 0, answered: 'timeout' } : q));
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, handleEvents]);

  // ----- điều khiển: bật diều (chạm, bấm chuột, Space), nhận ngay ở pointerdown và keydown
  const doFlap = useCallback(() => {
    if (holdRef.current) return;
    const events = flap(state);
    if (events.length === 0) return;
    sound.playWhoosh();
    if (state.stats.flaps === 1) bump();
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.closest('[data-kite-ui]'))) return;
      e.preventDefault(); // Space không cuộn trang
      doFlap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doFlap]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, [data-kite-ui]')) return;
    doFlap();
  };

  // ----- câu hỏi ở cổng: trả lời đúng thì cảnh giao sổ; "Chơi tiếp" mới đưa kết quả cho luật (diều và đồng hồ đứng yên suốt lúc đọc lời giải thích)
  const question = quiz ? questions[quiz.index] : undefined;
  const onAnswer = useCallback(
    (correct: boolean) => {
      if (pending.current || !quiz) return;
      pending.current = correct ? 'correct' : 'wrong';
      view.current.deliver = { active: true, t: 0, ok: correct };
      if (correct) {
        setDelivered(quiz.index);
        sound.playCorrect();
      }
      setQuiz((q) => (q ? { ...q, answered: correct } : q));
    },
    [quiz],
  );
  const continueGate = useCallback(() => {
    const result = pending.current;
    if (!result) return;
    pending.current = null;
    quizLeft.current = 0;
    view.current.deliver = { active: false, t: 0, ok: false };
    setQuiz(null);
    setDelivered(null);
    handleEvents(answerGate(state, result));
  }, [state, handleEvents]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const parts: ScorePart[] = [
      { label: kiteUi.phanKhe, count: state.passed, points: state.passed * C.points.gap },
      { label: kiteUi.phanTrang, count: state.pages, points: state.pages * C.points.page },
      { label: kiteUi.phanCau, count: state.correct, points: state.correct * C.gates.correctPoints },
      { label: kiteUi.phanCong, count: state.gatesDone, points: 0 },
    ];
    onFinish(state.score, parts);
  }, [onFinish, state]);

  const onModeChange = useCallback((m: FrameMode) => setMode(m), []);
  if (PROBE) Object.assign(window, { __kite: state, __kiteView: view.current, __kiteQuestions: questions, __kiteUi: { ready, quiz, ending, mode } });

  const showStart = ready && state.phase === 'ready' && !rotated && !paused;
  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man6">
      <Scene25D
        background={null}
        quality={forced}
        hold={!ready}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div className="absolute inset-0 touch-none select-none" role="application" aria-label={kiteUi.khung} data-testid="man6-khung" data-phase={state.phase} onPointerDown={onPointerDown}>
            <div className={`pointer-events-none absolute top-2 flex flex-col space-y-1 ${quiz ? 'left-2 items-start' : 'right-14 items-end'}`} data-testid="hud">
              <div className="flex items-center gap-0.5 rounded-2xl border-2 border-nau-go bg-giay px-2 py-1" role="img" aria-label={fmt(kiteUi.tim, { so: state.hearts, max: C.hearts })} data-testid="tim">
                {Array.from({ length: C.hearts }, (_, i) => (
                  <HeartIcon key={i} on={i < state.hearts} />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-2xl border-2 border-nau-go bg-giay px-2 py-0.5 text-sm font-display font-extrabold">
                <span className="flex items-center gap-1" role="img" aria-label={fmt(kiteUi.trang, { so: state.pages })} data-testid="trang">
                  <PageIcon />
                  {state.pages}
                </span>
                <span data-testid="cong">{fmt(kiteUi.cong, { so: state.gatesDone, max: state.gateAfter.length })}</span>
                <span data-testid="diem">{fmt(kiteUi.diem, { so: state.score })}</span>
              </div>
            </div>

            {showStart && (
              <p className="pointer-events-none absolute inset-x-0 top-[38%] mx-auto w-fit max-w-[80%] rounded-2xl border-[3px] border-nau-go bg-giay px-4 py-1.5 text-center font-display text-lg font-extrabold" data-testid="cham-bat-dau">
                {kiteUi.chamBatDau}
              </p>
            )}

            {delivered !== null && (
              <p className="pointer-events-none absolute left-2 top-16 z-10 max-w-[44%] rounded-2xl border-[3px] border-muc-tim bg-giay px-3 py-1 font-display text-base font-extrabold text-muc-tim-dam" data-testid="giao-so">
                {fmt(kiteUi.giaoSo, { so: delivered + 1 })}
              </p>
            )}

            {quiz && question && (
              <div data-kite-ui className="absolute inset-y-1 right-1 z-20 flex w-[45%] min-w-[15rem] flex-col gap-1" data-testid="cong-cau-hoi" onPointerDown={(e) => e.stopPropagation()}>
                <div className="shrink-0 rounded-nut bg-giay/95 px-2 py-0.5 pr-12">
                  <p className="text-center font-display text-sm font-bold leading-snug">{fmt(kiteUi.cauHoi, { so: quiz.index + 1, max: state.gateAfter.length })}</p>
                  {quiz.answered === null && (
                    <div className="flex items-center gap-2">
                      <p className="shrink-0 text-sm font-semibold" data-testid="con-gio">
                        {fmt(kiteUi.conGio, { giay: quiz.left })}
                      </p>
                      <ProgressBar current={quiz.left} max={quiz.total} className="min-w-0 flex-1" />
                    </div>
                  )}
                </div>
                {quiz.answered === 'timeout' ? (
                  <Panel className="shrink-0 space-y-1.5 !p-2.5 text-sm" role="alert" data-testid="het-gio">
                    <p className="font-bold text-do-son-dam">{kiteUi.hetGio}</p>
                    <p>{fmt(kiteUi.dapAnDung, { dapAn: question.options[question.correctIndex] })}</p>
                    <p className="text-xs">{fmt(question.explanation)}</p>
                    <Button autoFocus size="sm" className="min-h-11" onClick={continueGate}>
                      {kiteUi.tiepTuc}
                    </Button>
                  </Panel>
                ) : (
                  <>
                    <QuizCard key={quiz.index} question={question} levelId={LEVEL_ID} compact onAnswer={onAnswer} onContinue={continueGate} continueLabel={kiteUi.tiepTuc} className="max-w-none min-h-0" />
                    {quiz.answered !== null && (
                      <p className="shrink-0 rounded-nut bg-giay/95 px-2 py-1 text-center text-xs font-semibold" data-testid="ket-qua-cau">
                        {quiz.answered ? fmt(kiteUi.quizDung, { diem: C.gates.correctPoints }) : fmt(kiteUi.quizSai)}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {ending && (
              <div data-kite-ui role="status" className="absolute inset-x-4 top-[30%] z-30 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="het-van" onPointerDown={(e) => e.stopPropagation()}>
                <p className="font-display text-lg font-extrabold">{ending === 'hearts' ? fmt(kiteUi.hetTim) : fmt(kiteUi.xongCong)}</p>
                <Button size="md" className="min-h-11" autoFocus data-testid="nut-ket-qua" onClick={finish}>
                  {kiteUi.xemKetQua}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <KiteStage view={view} textures={textures} reduced={reduced} />
      </Scene25D>
    </div>
  );
}
