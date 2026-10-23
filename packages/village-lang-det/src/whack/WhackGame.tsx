import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, Panel, ProgressBar, QuizCard, fmt, pickQuestions, sound, useGameHint, useSettings, whackUi, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, aimFromRects, isQualityChoice, rectOf, useReaction, type Aim, type PoseRequest, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { WORLD_FRAME, laneAt, lanePose } from './man05Lanes';
import { makeFan, useWhackTextures } from './whackArt';
import { WHACK_SPEC } from './whackConfig';
import { hintFor } from './whackHint';
import { answerBoss, bossPoints, collectCoin, createWhackGame, hitLane, tickWhack, type BossResult, type WhackEvent } from './whackLogic';
import { BOSS_HIT_POS, BOSS_WAIT_POS, STUDENT, bossPose, bossViewPos, studentHome, studentStand } from './whackLayout';
import { WhackStage, createView, type WhackView } from './WhackStage';

const LEVEL_ID = 5;
const BACKGROUND = 'scenes/man-05-san-det';
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Phím đập: D F J K hoặc 1 2 3 4 (hàng số và bàn phím số) cho làn 1 đến 4 */
const KEY_LANE: Readonly<Record<string, number>> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };

/**
 * Mốc thời gian (giây, đồng hồ hoạt cảnh) của hoạt cảnh sau khi trả lời. Đúng: trùm chạy từ chỗ chờ xuống cuối làn (`comeSeconds`), học sinh đét (`swing`), trùm `hurt`, rồi chạy ngược lên.
 * Sai: trùm cúi, trêu, chạy xuống sổ. Chỗ chờ, chỗ bị đét ở `whackLayout.ts`.
 */
const T = { comeSeconds: 0.55, swing: 0.3, hurt: 0.45, exitUp: 1.3, exitUpSeconds: 1.2, cheer: 0.6, runDown: 1.3, runDownSeconds: 0.9 } as const;

type BossStage = 'none' | 'come' | 'hit' | 'exit' | 'dodge' | 'drop';
interface BossAnim {
  stage: BossStage;
  t: number;
  swung: boolean;
  hurt: boolean;
  cheered: boolean;
}

interface QuizUi {
  /** Bảng câu hỏi nằm bên nào của khung: trùm ở làn 1 hay 2 (bên trái) thì bảng sang phải để không che trùm, ngược lại nằm trái */
  side: 'left' | 'right';
  index: number;
  total: number;
  /** Giây còn lại (làm tròn lên, để hiện) */
  left: number;
  answered: null | boolean | 'timeout';
}

type Ending = null | 'ink' | 'complete';
type Bubble = { left: number; top: number } | null;
type Villain = { clip: 'idle' | 'run' | 'cheer'; n: number; pose?: PoseRequest };

/** Vị trí (phần trăm khung) ngay trên đầu {phanDien} đang đứng ở chỗ bị đét của làn `lane`, để đặt bong bóng chữ */
function bubbleAt(lane: number): { left: number; top: number } {
  const b = bossPose(lane, BOSS_HIT_POS);
  return { left: (b.x / WORLD_FRAME.width + 0.5) * 100, top: (0.5 - (b.y + b.height) / WORLD_FRAME.height) * 100 - 7 };
}

/**
 * Màn 5 "Đập {phanDien}" (spec 06): Scene25D (sân dệt, 4 làn), chuột giấy chạy dọc làn, học sinh cầm quạt nan đập, {phanDien} làm trùm kèm câu hỏi. Luật nằm hết ở \`whackLogic\`; ở đây chỉ nối
 * thao tác (phím D F J K / 1 2 3 4, bấm chuột và chạm vào làn, nhận ngay ở keydown và pointerdown), hoạt cảnh, âm thanh vào luật. Vòng lặp requestAnimationFrame gọi \`tickWhack\` (giây); tạm dừng
 * (nút "?", tab ẩn, nhắc xoay ngang) thì mọi đồng hồ đứng yên (chuột, đồng, đồng hồ lịch, đồng hồ câu hỏi, hoạt cảnh).
 */
export function WhackGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo(() => createWhackGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  // 10 câu hỏi ôn Bài 1 và 2 cho 10 lượt trùm (không lặp, đã trộn thứ tự đáp án; cách chọn như màn 2)
  const questions = useMemo(() => pickQuestions({ bai: [1, 2], soCau: WHACK_SPEC.boss.count, seed: state.seed }), [state]);
  const view = useRef<WhackView>(createView(state, reduced));
  const viewKey = useRef(state);
  if (viewKey.current !== state) {
    viewKey.current = state;
    view.current = createView(state, reduced);
  }
  view.current.reduced = reduced;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const textures = useWhackTextures();
  const fan = useMemo(() => makeFan(), []);
  useEffect(() => () => fan.dispose(), [fan]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<FrameMode>('landscape');
  const [warm, setWarm] = useState(false);
  const [swingN, setSwingN] = useState(0);
  const [villain, setVillain] = useState<Villain>({ clip: 'idle', n: 0 });
  const [chiHappy, setChiHappy] = useState(0);
  const [bubble, setBubble] = useState<Bubble>(null);
  const [quiz, setQuiz] = useState<QuizUi | null>(null);
  const [ending, setEnding] = useState<Ending>(null);
  const finished = useRef(false);
  const boss = useRef<BossAnim>({ stage: 'none', t: 0, swung: false, hurt: false, cheered: false });
  const pending = useRef<{ result: BossResult; left: number } | null>(null);
  const quizLeft = useRef(0);
  const shownLeft = useRef(0);
  const beginRef = useRef<((stage: 'hit' | 'dodge') => void) | null>(null);

  const ready = warm && textures.done;
  const rotated = mode === 'rotate';
  const holdLoop = paused || !ready || rotated;
  const holdRef = useRef(holdLoop);
  holdRef.current = holdLoop;
  useGameHint(setHint, 5, () => hintFor(state));

  // Ván mới: dọn mọi thứ
  useEffect(() => {
    finished.current = false;
    boss.current = { stage: 'none', t: 0, swung: false, hurt: false, cheered: false };
    pending.current = null;
    quizLeft.current = 0;
    setQuiz(null);
    setEnding(null);
    setBubble(null);
    setVillain({ clip: 'idle', n: 0 });
  }, [state]);

  // Nạp trước các chuyển động đầu (swing, hurt, run, cheer) lúc màn hình tải còn che cảnh để lần đầu không khựng
  const warmUp = useCallback(() => {
    const v = view.current;
    v.warm = true;
    setSwingN((n) => n + 1);
    setVillain({ clip: 'run', n: 1, pose: { name: 'hurt', n: 1 } });
    setTimeout(() => setVillain({ clip: 'cheer', n: 2, pose: { name: 'sad', n: 1 } }), 450);
    setTimeout(() => {
      v.warm = false;
      setVillain({ clip: 'idle', n: 3 });
      setSwingN(0);
      setWarm(true);
    }, 1200);
  }, []);

  const handleEvents = useCallback(
    (events: readonly WhackEvent[]) => {
      const v = view.current;
      for (const e of events) {
        switch (e.type) {
          case 'leak':
            v.inkPop[Math.min(e.ink, WHACK_SPEC.inkMax) - 1] = 1;
            sound.playWrong();
            break;
          case 'coinTaken':
            sound.playPickup(true);
            break;
          case 'bossStart':
            v.boss.show = true;
            v.boss.lane = e.boss.lane;
            v.boss.pos = 0;
            v.boss.yaw = 0;
            setVillain((c) => ({ clip: 'run', n: c.n + 1 }));
            break;
          case 'bossQuiz': {
            v.boss.pos = BOSS_WAIT_POS;
            setVillain((c) => ({ clip: 'cheer', n: c.n + 1 }));
            quizLeft.current = e.boss.answerSeconds;
            shownLeft.current = e.boss.answerSeconds;
            setQuiz({ side: e.boss.lane <= 1 ? 'right' : 'left', index: e.boss.index, total: e.boss.answerSeconds, left: e.boss.answerSeconds, answered: null });
            break;
          }
          case 'bossAnswer':
            if (e.result !== 'correct') {
              v.inkPop[Math.min(state.ink, WHACK_SPEC.inkMax) - 1] = 1;
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
    [state],
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
      const events = tickWhack(state, dt, false);
      if (events.length > 0) handleEvents(events);
      // trùm: vị trí chạy xuống theo logic
      if (state.phase === 'bossRun' && state.boss) v.boss.pos = bossViewPos(state.boss.pos);
      // đồng hồ trả lời: chỉ đếm khi bảng câu hỏi mở và em chưa trả lời
      if (quizLeft.current > 0 && !pending.current && state.phase === 'quiz') {
        quizLeft.current = Math.max(0, quizLeft.current - dt);
        const shown = Math.ceil(quizLeft.current);
        if (shown !== shownLeft.current) {
          shownLeft.current = shown;
          setQuiz((q) => (q && q.answered === null ? { ...q, left: shown } : q));
        }
        if (quizLeft.current <= 0) {
          pending.current = { result: 'timeout', left: 0 };
          beginBossAnim('dodge');
          setQuiz((q) => (q ? { ...q, left: 0, answered: 'timeout' } : q));
        }
      }
      stepBossAnim(dt);
    };
    // Hoạt cảnh của trùm sau khi trả lời (theo đồng hồ hoạt cảnh nên đứng yên khi tạm dừng)
    const stepBossAnim = (dt: number) => {
      const b = boss.current;
      if (b.stage === 'none') return;
      const v = view.current;
      b.t += dt;
      const lane = v.boss.lane;
      if (b.stage === 'come') {
        v.boss.pos = BOSS_WAIT_POS + ((BOSS_HIT_POS - BOSS_WAIT_POS) * Math.min(1, b.t / T.comeSeconds));
        if (b.t >= T.comeSeconds) {
          b.stage = 'hit';
          b.t = 0;
          setVillain((c) => ({ clip: 'idle', n: c.n + 1, pose: c.pose }));
        }
      } else if (b.stage === 'hit') {
        if (!b.swung && b.t >= T.swing) {
          b.swung = true;
          setSwingN((n) => n + 1);
          sound.playWhoosh();
        }
        if (!b.hurt && b.t >= T.hurt) {
          b.hurt = true;
          if (!reduced) setVillain((c) => ({ ...c, pose: { name: 'hurt', n: (c.pose?.n ?? 0) + 1 } }));
          const bp = bubbleAt(lane);
          setBubble({ left: bp.left, top: Math.max(4, bp.top) });
          sound.playCorrect();
        }
        if (b.t >= T.exitUp) {
          b.stage = 'exit';
          b.t = 0;
          setBubble(null);
          v.boss.yaw = Math.PI;
          setVillain((c) => ({ clip: 'run', n: c.n + 1, pose: c.pose }));
          v.student.tx = studentHome();
          v.student.ty = STUDENT.feetY;
        }
      } else if (b.stage === 'exit') {
        v.boss.pos = Math.max(0, BOSS_HIT_POS * (1 - b.t / T.exitUpSeconds));
        if (b.t >= T.exitUpSeconds) {
          v.boss.show = false;
          b.stage = 'none';
        }
      } else if (b.stage === 'dodge') {
        if (!b.cheered && b.t >= T.cheer) {
          b.cheered = true;
          setVillain((c) => ({ clip: 'cheer', n: c.n + 1, pose: c.pose }));
        }
        if (b.t >= T.runDown) {
          b.stage = 'drop';
          b.t = 0;
          setVillain((c) => ({ clip: 'run', n: c.n + 1, pose: c.pose }));
        }
      } else if (b.stage === 'drop') {
        v.boss.pos = BOSS_WAIT_POS + ((WHACK_SPEC.laneLength - BOSS_WAIT_POS) * b.t) / T.runDownSeconds;
        if (b.t >= T.runDownSeconds) {
          v.boss.show = false;
          b.stage = 'none';
        }
      }
    };
    const beginBossAnim = (stage: 'hit' | 'dodge') => {
      const v = view.current;
      boss.current = { stage: stage === 'hit' ? 'come' : stage, t: 0, swung: false, hurt: false, cheered: false };
      if (stage === 'hit') {
        // học sinh lướt tới chân làn của trùm; trùm chạy xuống cuối làn, ngay trên học sinh
        v.student.tx = studentStand(v.boss.lane);
        v.student.ty = STUDENT.feetY;
        setVillain((c) => ({ clip: 'run', n: c.n + 1, pose: c.pose }));
      } else {
        setVillain((c) => ({ clip: 'idle', n: c.n + 1, pose: { name: 'sad', n: (c.pose?.n ?? 0) + 1 } }));
      }
    };
    beginRef.current = beginBossAnim;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, handleEvents, reduced]);

  // ----- điều khiển: đập một làn, nhặt đồng
  const hit = useCallback(
    (lane: number) => {
      if (holdRef.current) return;
      const v = view.current;
      const events = hitLane(state, lane);
      const e = events[0];
      if (!e || e.type === 'blocked') return;
      v.student.tx = studentStand(lane);
      v.student.ty = STUDENT.feetY;
      setSwingN((n) => n + 1);
      if (e.type === 'hit') {
        v.laneFlash[lane] = 1;
        if (e.killed) sound.playCorrect();
        else sound.playClick();
      } else {
        v.laneFlash[lane] = 0.4;
        sound.playWhoosh();
      }
      bump();
    },
    [state],
  );
  const takeCoin = useCallback(() => {
    if (holdRef.current) return;
    const events = collectCoin(state);
    if (events.length > 0) handleEvents(events);
  }, [state, handleEvents]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      hit(lane);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, [data-whack-ui]')) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!(r.width > 0)) return;
    const x = ((e.clientX - r.left) / r.width - 0.5) * WORLD_FRAME.width;
    const y = (0.5 - (e.clientY - r.top) / r.height) * WORLD_FRAME.height;
    const c = state.coin;
    if (c) {
      const p = lanePose(c.lane, c.pos, { x: 0, y: 0, scale: 1 });
      if (Math.hypot(x - p.x, y - (p.y + 0.18)) < 0.95) return takeCoin();
    }
    const lane = laneAt(x, y);
    if (lane >= 0) hit(lane);
  };

  // ----- trùm: trả lời, rồi "Chơi tiếp" mới đưa kết quả cho luật (chuột và đồng hồ đứng yên suốt lúc đọc lời giải thích)
  const question = quiz ? questions[quiz.index] : undefined;
  const onAnswer = useCallback(
    (correct: boolean) => {
      if (pending.current) return;
      const left = quizLeft.current;
      pending.current = { result: correct ? 'correct' : 'wrong', left };
      beginRef.current?.(correct ? 'hit' : 'dodge');
      setQuiz((q) => (q ? { ...q, answered: correct } : q));
    },
    [],
  );
  const continueBoss = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    quizLeft.current = 0;
    setQuiz(null);
    // bảng câu hỏi che cô Chi (ở bên trái) nên cô chỉ nhún vui khi em bấm "Chơi tiếp", lúc thấy lại sân
    if (p.result === 'correct') setChiHappy((n) => n + 1);
    handleEvents(answerBoss(state, p.result, p.left));
  }, [state, handleEvents]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const st = state.stats;
    const parts: ScorePart[] = [
      { label: whackUi.phanChuot, count: st.hits, points: st.micePoints },
      { label: whackUi.phanDong, count: st.coinsTaken, points: st.coinPoints },
      { label: whackUi.phanTrum, count: st.bossCorrect, points: st.bossPoints },
      { label: whackUi.phanMuc, count: state.ink, points: 0 },
    ];
    onFinish(state.score, parts);
  }, [onFinish, state]);

  // ----- học sinh nhìn đáp án đang rê chuột (ChoiceReaction)
  const reaction = useReaction();
  const aim = useMemo<Aim | null>(() => {
    const el = overlayRef.current;
    return quiz && quiz.answered === null && el && reaction.target ? aimFromRects(rectOf(el), reaction.target) : null;
  }, [quiz, reaction.target]);

  const onModeChange = useCallback((m: FrameMode) => setMode(m), []);
  if (PROBE) Object.assign(window, { __whack: state, __whackView: view.current, __whackQuestions: questions, __whackUi: { ready, quiz, ending, mode } });

  const fill = Math.min(1, state.ink / WHACK_SPEC.inkMax);
  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man5">
      <Scene25D
        background={BACKGROUND}
        quality={forced}
        hold={!ready}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div
            ref={overlayRef}
            className="absolute inset-0 touch-none select-none"
            role="application"
            aria-label={whackUi.khung}
            data-testid="man5-khung"
            data-phase={state.phase}
            onPointerDown={onPointerDown}
          >
            <div className={`pointer-events-none absolute top-2 flex flex-col space-y-1 ${quiz?.side === 'right' ? 'left-2 items-start' : 'right-14 items-end'}`} data-testid="hud">
              <div className="flex items-center gap-1 rounded-2xl border-2 border-nau-go bg-giay px-2 py-1" role="img" aria-label={fmt(whackUi.muc, { so: state.ink, max: WHACK_SPEC.inkMax })} data-testid="cham-muc">
                {Array.from({ length: WHACK_SPEC.inkMax }, (_, i) => {
                  const on = i < state.ink;
                  // chấm có mực đỏ dần theo số vết: từ cam sang đỏ thẫm
                  const red = on ? `hsl(${Math.round(35 - 35 * fill)} 78% ${Math.round(52 - 12 * fill)}%)` : '#fffaf0';
                  return <span key={i} className="block size-3.5 rounded-full border-2 border-nau-go sm:size-4" style={{ background: red }} data-on={on ? '1' : '0'} />;
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-2xl border-2 border-nau-go bg-giay px-2 py-0.5 text-sm font-display font-extrabold">
                <span data-testid="diem">{fmt(whackUi.diem, { so: state.score })}</span>
                <span data-testid="xu">{fmt(whackUi.xu, { so: state.coins })}</span>
                <span data-testid="trum">{fmt(whackUi.trum, { so: state.bossesDone, max: WHACK_SPEC.boss.count })}</span>
              </div>
            </div>

            {bubble && (
              <p className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-2xl border-[3px] border-muc-tim bg-giay px-3 py-0.5 font-display text-lg font-extrabold text-muc-tim-dam" style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }} data-testid="ui-da">
                {whackUi.uiDa}
              </p>
            )}

            {quiz && question && (
              <div data-whack-ui className={`absolute inset-y-1 z-20 w-[45%] min-w-[15rem] space-y-1 overflow-y-auto ${quiz.side === 'right' ? 'right-1' : 'left-1'}`} data-testid="trum-cau-hoi" onPointerDown={(e) => e.stopPropagation()}>
                <div className={`rounded-nut bg-giay/95 px-2 py-0.5 ${quiz.side === 'right' ? 'pr-12' : ''}`}>
                  <p className="text-center font-display text-sm font-bold leading-snug">{fmt(whackUi.cauHoi, { so: quiz.index + 1, max: WHACK_SPEC.boss.count })}</p>
                  {quiz.answered === null && (
                    <div className="flex items-center gap-2">
                      <p className="shrink-0 text-sm font-semibold" data-testid="con-gio">
                        {fmt(whackUi.conGio, { giay: quiz.left })}
                      </p>
                      <ProgressBar current={quiz.left} max={quiz.total} className="min-w-0 flex-1" />
                    </div>
                  )}
                </div>
                {quiz.answered === 'timeout' ? (
                  <Panel className="space-y-1.5 !p-2.5 text-sm" role="alert" data-testid="het-gio">
                    <p className="font-bold text-do-son-dam">{whackUi.hetGio}</p>
                    <p>{fmt(whackUi.dapAnDung, { dapAn: question.options[question.correctIndex] })}</p>
                    <p className="text-xs">{fmt(question.explanation)}</p>
                    <Button autoFocus size="sm" className="min-h-11" onClick={continueBoss}>
                      {whackUi.tiepTuc}
                    </Button>
                  </Panel>
                ) : (
                  <>
                    <QuizCard key={quiz.index} question={question} levelId={LEVEL_ID} compact onAnswer={onAnswer} onContinue={continueBoss} continueLabel={whackUi.tiepTuc} className="max-w-none" />
                    {quiz.answered !== null && (
                      <p className="rounded-nut bg-giay/95 px-2 py-1 text-center text-xs font-semibold" data-testid="ket-qua-cau">
                        {quiz.answered ? fmt(whackUi.quizDung, { diem: bossPoints(pending.current?.left ?? 0) }) : fmt(whackUi.quizSai)}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {ending && (
              <div data-whack-ui role="status" className="absolute inset-x-4 top-[30%] z-30 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="het-van" onPointerDown={(e) => e.stopPropagation()}>
                <p className="font-display text-lg font-extrabold">{ending === 'ink' ? fmt(whackUi.hetMuc) : fmt(whackUi.xongTrum)}</p>
                <Button size="md" className="min-h-11" autoFocus data-testid="nut-ket-qua" onClick={finish}>
                  {whackUi.xemKetQua}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <WhackStage view={view} textures={textures} studentPose={swingN > 0 ? { name: 'swing', n: swingN } : undefined} studentAim={aim} fan={fan.object} villain={villain} chiHappy={chiHappy} />
      </Scene25D>
    </div>
  );
}

