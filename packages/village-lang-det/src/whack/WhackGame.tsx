import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, Panel, ProgressBar, QuizCard, fmt, pickQuestions, sound, useGameHint, useSettings, whackUi, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { WHACK_SPEC, type MouseKind } from './whackConfig';
import { hintFor } from './whackHint';
import { answerBoss, bossPoints, collectCoin, createWhackGame, hitLane, inZone, tickWhack, type BossResult, type Mouse, type WhackEvent } from './whackLogic';

const LEVEL_ID = 5;
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

/** Phím đập: D F J K hoặc 1 2 3 4 (hàng số và bàn phím số) cho làn 1 đến 4 */
const KEY_LANE: Readonly<Record<string, number>> = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3,
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
};

const LANE_KEYS = ['D', 'F', 'J', 'K'] as const;

interface QuizUi {
  index: number;
  total: number;
  left: number;
  answered: null | boolean | 'timeout';
}

interface HitEffect {
  id: number;
  lane: number;
  pos: number;
  text: string;
  kind: 'score' | 'miss' | 'coin' | 'spark';
}

/** Tên loại chuột thường để mô tả nhãn hỗ trợ accessibility */
const KIND_NAMES: Record<MouseKind, string> = {
  thuong: whackUi.chuotThuong,
  doiLan: whackUi.chuotDoiLan,
  nhanh: whackUi.chuotNhanh,
  to: whackUi.chuotTo,
};

const KIND_SHORT: Record<MouseKind, string> = {
  thuong: whackUi.nhanThuong,
  doiLan: whackUi.nhanDoiLan,
  nhanh: whackUi.nhanNhanh,
  to: whackUi.nhanTo,
};

export function WhackGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;

  const state = useMemo(() => createWhackGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = useMemo(() => pickQuestions({ bai: [1, 2], soCau: WHACK_SPEC.boss.count, seed: state.seed }), [state]);

  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [quiz, setQuiz] = useState<QuizUi | null>(null);
  const [ending, setEnding] = useState<null | 'ink' | 'complete'>(null);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [laneFlashes, setLaneFlashes] = useState<number[]>([0, 0, 0, 0]);

  const finished = useRef(false);
  const pending = useRef<{ result: BossResult; left: number } | null>(null);
  const quizLeft = useRef(0);
  const shownLeft = useRef(0);
  const nextEffectId = useRef(1);

  // Bảo vệ click ma khi mở câu hỏi: cử chỉ chạm phải xuất phát từ bên trong container câu hỏi
  const quizPointerDownInside = useRef(false);

  // Dừng vòng lặp khi pause hoặc khi quiz đang mở hoặc kết thúc
  const holdRef = useRef(paused);
  holdRef.current = paused;

  useGameHint(setHint, 5, () => hintFor(state));

  // Reset khi sang attempt mới
  useEffect(() => {
    finished.current = false;
    pending.current = null;
    quizLeft.current = 0;
    setQuiz(null);
    setEnding(null);
    setEffects([]);
    setLaneFlashes([0, 0, 0, 0]);
  }, [state]);

  // Thêm hiệu ứng điểm nổi
  const addEffect = useCallback((lane: number, pos: number, text: string, kind: HitEffect['kind']) => {
    const id = nextEffectId.current++;
    setEffects((prev) => [...prev.slice(-6), { id, lane, pos, text, kind }]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((e) => e.id !== id));
    }, 700);
  }, []);

  const triggerLaneFlash = useCallback((lane: number) => {
    setLaneFlashes((prev) => {
      const next = [...prev];
      next[lane] = Date.now();
      return next;
    });
  }, []);

  const handleEvents = useCallback(
    (events: readonly WhackEvent[]) => {
      for (const e of events) {
        switch (e.type) {
          case 'leak':
            sound.playWrong();
            addEffect(e.mouse.lane, 9.5, '-1', 'miss');
            break;
          case 'coinTaken':
            sound.playPickup(true);
            break;
          case 'bossQuiz': {
            quizLeft.current = e.boss.answerSeconds;
            shownLeft.current = e.boss.answerSeconds;
            setQuiz({ index: e.boss.index, total: e.boss.answerSeconds, left: e.boss.answerSeconds, answered: null });
            break;
          }
          case 'bossAnswer':
            if (e.result !== 'correct') {
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
    [addEffect],
  );

  // Vòng lặp thời gian requestAnimationFrame
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // Đứng yên hoàn toàn khi paused từ ngoài (MiniGameLevel) hoặc khi hết ván
      if (holdRef.current || state.phase === 'ended') return;

      // Đồng hồ đếm ngược câu hỏi khi phase quiz
      if (state.phase === 'quiz') {
        if (quizLeft.current > 0 && !pending.current) {
          quizLeft.current = Math.max(0, quizLeft.current - dt);
          const shown = Math.ceil(quizLeft.current);
          if (shown !== shownLeft.current) {
            shownLeft.current = shown;
            setQuiz((q) => (q && q.answered === null ? { ...q, left: shown } : q));
          }
          if (quizLeft.current <= 0) {
            pending.current = { result: 'timeout', left: 0 };
            setQuiz((q) => (q ? { ...q, left: 0, answered: 'timeout' } : q));
          }
        }
        return;
      }

      // Mô phỏng logic bình thường
      const events = tickWhack(state, dt, false);
      if (events.length > 0) handleEvents(events);
      bump();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, handleEvents]);

  // Thao tác đập một làn
  const hit = useCallback(
    (lane: number) => {
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended') return;
      triggerLaneFlash(lane);

      // Nếu có chuột câu hỏi (boss) đang chạy trên làn này và vào vùng đập: kích hoạt quiz
      if (state.phase === 'bossRun' && state.boss && state.boss.lane === lane && state.boss.pos >= WHACK_SPEC.zoneStart) {
        state.phase = 'quiz';
        state.boss.pos = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;
        quizLeft.current = state.boss.answerSeconds;
        shownLeft.current = state.boss.answerSeconds;
        setQuiz({ index: state.boss.index, total: state.boss.answerSeconds, left: state.boss.answerSeconds, answered: null });
        sound.playClick();
        bump();
        return;
      }

      const events = hitLane(state, lane);
      const e = events[0];
      if (!e || e.type === 'blocked') return;

      if (e.type === 'hit') {
        if (e.killed) {
          sound.playCorrect();
          addEffect(lane, e.mouse.pos, `+${e.points}`, 'score');
        } else {
          sound.playClick();
          addEffect(lane, e.mouse.pos, '!', 'spark');
        }
      } else {
        sound.playWhoosh();
      }
      bump();
    },
    [state, triggerLaneFlash, addEffect],
  );

  // Nhặt tiền đồng
  const takeCoin = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended') return;
      if (state.coin) {
        addEffect(state.coin.lane, state.coin.pos, `+${WHACK_SPEC.coin.points} (+1 xu)`, 'coin');
      }
      const events = collectCoin(state);
      if (events.length > 0) handleEvents(events);
    },
    [state, handleEvents, addEffect],
  );

  // Bấm trực tiếp vào chuột câu hỏi
  const hitBossMouse = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended' || !state.boss) return;
      state.phase = 'quiz';
      state.boss.pos = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;
      quizLeft.current = state.boss.answerSeconds;
      shownLeft.current = state.boss.answerSeconds;
      setQuiz({ index: state.boss.index, total: state.boss.answerSeconds, left: state.boss.answerSeconds, answered: null });
      sound.playClick();
      bump();
    },
    [state],
  );

  // Điều khiển bằng bàn phím
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

  // Trả lời câu hỏi
  const question = quiz ? questions[quiz.index] : undefined;

  const onAnswer = useCallback((correct: boolean) => {
    if (pending.current) return;
    const left = quizLeft.current;
    pending.current = { result: correct ? 'correct' : 'wrong', left };
    setQuiz((q) => (q ? { ...q, answered: correct } : q));
  }, []);

  const continueBoss = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    quizLeft.current = 0;
    setQuiz(null);
    handleEvents(answerBoss(state, p.result, p.left));
  }, [state, handleEvents]);

  // Kết thúc ván
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

  // Probe phục vụ tự động kiểm thử Puppeteer
  if (PROBE) {
    Object.assign(window, {
      __whack: state,
      __whackQuestions: questions,
      __whackUi: { ready: true, quiz, ending },
      __whackHit: hit,
    });
  }

  const fill = Math.min(1, state.ink / WHACK_SPEC.inkMax);

  return (
    <div className="relative flex h-full w-full select-none flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#2d1b0d] via-[#1a0f08] to-[#120a05] p-2 text-giay font-display" data-testid="man5">
      {/* 1. THANH TRÊN: HUD Thông tin (Điểm, Xu, Trùm, Vết mực) */}
      <header className="z-10 flex w-full max-w-2xl shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-nau-go bg-[#2b1810]/95 px-3 py-1.5 shadow-md" data-testid="hud">
        {/* Vết mực trên sổ */}
        <div className="flex items-center gap-1.5" role="img" aria-label={fmt(whackUi.muc, { so: state.ink, max: WHACK_SPEC.inkMax })} data-testid="cham-muc">
          <span className="text-xs font-bold text-giay/80">{fmt(whackUi.phanMuc)}:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: WHACK_SPEC.inkMax }, (_, i) => {
              const on = i < state.ink;
              const red = on ? `hsl(${Math.round(35 - 35 * fill)} 85% ${Math.round(52 - 12 * fill)}%)` : '#3a2215';
              return <span key={i} className={`block size-3 rounded-full border border-nau-go/70 sm:size-3.5 transition-colors ${on ? 'ring-1 ring-red-400' : ''}`} style={{ background: red }} data-on={on ? '1' : '0'} />;
            })}
          </div>
          <span className="text-xs font-mono font-extrabold text-amber-300">
            {state.ink}/{WHACK_SPEC.inkMax}
          </span>
        </div>

        {/* Điểm - Xu - Trùm */}
        <div className="flex items-center gap-3 text-sm font-extrabold sm:gap-4">
          <span className="text-amber-400" data-testid="diem">
            {fmt(whackUi.diem, { so: state.score })}
          </span>
          <span className="text-yellow-300" data-testid="xu">
            {fmt(whackUi.xu, { so: state.coins })}
          </span>
          <span className="text-emerald-400" data-testid="trum">
            {fmt(whackUi.trum, { so: state.bossesDone, max: WHACK_SPEC.boss.count })}
          </span>
        </div>
      </header>

      {/* 2. KHU VỰC CHƠI CHÍNH: 4 LÀN DỌC KIỂU DẢI LỤA LÀNG DỆT */}
      <main
        className="relative my-auto flex h-[58vh] max-h-[560px] min-h-[300px] w-full max-w-xl flex-1 touch-none items-stretch justify-center gap-1.5 sm:gap-2.5"
        role="application"
        aria-label={whackUi.khung}
        data-testid="man5-khung"
        data-phase={state.phase}
      >
        {/* 4 LÀN DỌC */}
        {[0, 1, 2, 3].map((lane) => {
          const isFlashed = Date.now() - laneFlashes[lane] < 150;
          const miceInLane = state.mice.filter((m) => m.lane === lane);
          const hasInZone = miceInLane.some(inZone);
          const isBossInLane = state.boss && state.boss.lane === lane;

          return (
            <div
              key={lane}
              className={`relative flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-[#5a3825] shadow-inner transition-colors duration-100 ${
                lane === 0 ? 'bg-[#fcf7ea]/10' : lane === 1 ? 'bg-[#e0f2fe]/10' : lane === 2 ? 'bg-[#ecfdf5]/10' : 'bg-[#fff1f2]/10'
              } ${isFlashed ? 'ring-4 ring-amber-300/80 bg-amber-200/25' : ''}`}
              data-testid={`lan-${lane}`}
              onPointerDown={() => hit(lane)}
            >
              {/* Hoa văn dệt lụa chạy dọc làn */}
              <div className="pointer-events-none absolute inset-0 opacity-15 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:12px_12px]" />

              {/* VÙNG ĐẬP (HIT ZONE) TỪ 65% ĐẾN 90% */}
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-[10%] top-[65%] border-y-2 transition-all duration-150 ${
                  hasInZone
                    ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'border-amber-500/30 bg-amber-500/5'
                }`}
                data-testid={`vung-dap-${lane}`}
              >
                <div className="absolute inset-x-0 bottom-1 flex justify-center text-[10px] font-bold uppercase tracking-wider text-amber-200/50">
                  {whackUi.nhacVungDap}
                </div>
              </div>

              {/* HIỂN THỊ CHUỘT THƯỜNG TRÊN LÀN */}
              {miceInLane.map((m: Mouse) => {
                const inHitZone = inZone(m);
                const topPct = (m.pos / WHACK_SPEC.laneLength) * 100;

                return (
                  <div
                    key={m.id}
                    className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform ${
                      reduced ? '' : 'animate-bounce'
                    } ${m.flash ? 'brightness-150 scale-110' : ''}`}
                    style={{
                      top: `${topPct}%`,
                      width: m.kind === 'to' ? '80%' : '70%',
                      maxWidth: m.kind === 'to' ? '76px' : '62px',
                    }}
                    data-testid={`chuot-${m.kind}`}
                    data-in-zone={inHitZone ? '1' : '0'}
                    aria-label={KIND_NAMES[m.kind]}
                  >
                    {/* HÌNH DẠNG 2D CHUỘT GIẤY DÂN GIAN */}
                    <div
                      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-1.5 shadow-md ${
                        m.kind === 'to'
                          ? 'border-amber-800 bg-[#7c4d30] text-giay'
                          : m.kind === 'nhanh'
                            ? 'border-sky-500 bg-[#3b82f6] text-white'
                            : m.kind === 'doiLan'
                              ? 'border-purple-600 bg-[#8b5cf6] text-white'
                              : 'border-nau-go bg-[#d97706] text-giay'
                      }`}
                    >
                      {/* Vạch máu chuột to */}
                      {m.kind === 'to' && (
                        <div className="absolute -top-2 flex gap-1">
                          <span className={`size-2.5 rounded-full border border-black ${m.hits >= 1 ? 'bg-red-500' : 'bg-gray-400'}`} />
                          <span className={`size-2.5 rounded-full border border-black ${m.hits >= 2 ? 'bg-red-500' : 'bg-gray-400'}`} />
                        </div>
                      )}

                      {/* Icon & hình dạng đặc trưng */}
                      <span className="text-xl leading-none">
                        {m.kind === 'to' ? '🐀' : m.kind === 'nhanh' ? '⚡' : m.kind === 'doiLan' ? '⇄' : '🐁'}
                      </span>
                      <span className="text-[10px] font-bold leading-tight tracking-tight">
                        {KIND_SHORT[m.kind]}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* CHUỘT CÂU HỎI (TRÙM CÓ BIỂU TƯỢNG ❓ NỔI BẬT) */}
              {isBossInLane && state.boss && (
                <div
                  className="absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{
                    top: `${(state.boss.pos / WHACK_SPEC.laneLength) * 100}%`,
                    width: '85%',
                    maxWidth: '82px',
                  }}
                  data-testid="chuot-cau-hoi"
                  role="button"
                  aria-label={whackUi.chuotCauHoi}
                  onPointerDown={hitBossMouse}
                >
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-4 border-yellow-300 bg-gradient-to-b from-amber-500 via-orange-600 to-red-700 p-2 text-white shadow-[0_0_20px_rgba(250,204,21,0.8)]">
                    {/* Dấu hỏi vàng to lớn nhận diện tức thì */}
                    <span className="text-2xl font-black text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse">
                      ❓
                    </span>
                    <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-yellow-300">
                      {whackUi.chuotCauHoi}
                    </span>
                  </div>
                </div>
              )}

              {/* ĐỒNG TIỀN XU */}
              {state.coin && state.coin.lane === lane && (
                <div
                  className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer animate-spin"
                  style={{
                    top: `${(state.coin.pos / WHACK_SPEC.laneLength) * 100}%`,
                    width: '42px',
                    height: '42px',
                    animationDuration: '3s',
                  }}
                  data-testid="dong-tien"
                  role="button"
                  aria-label={whackUi.phanDong}
                  onPointerDown={takeCoin}
                >
                  <div className="flex size-full items-center justify-center rounded-full border-2 border-yellow-200 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 font-extrabold text-[#5c3a00] shadow-lg">
                    <span className="text-xs">🪙</span>
                  </div>
                </div>
              )}

              {/* HIỆU ỨNG NỔ ĐIỂM / TIA SÁNG TẠM THỜI TRÊN LÀN */}
              {effects
                .filter((eff) => eff.lane === lane)
                .map((eff) => (
                  <div
                    key={eff.id}
                    className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 font-extrabold text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-out fade-out slide-out-to-top duration-700"
                    style={{
                      top: `${(eff.pos / WHACK_SPEC.laneLength) * 100}%`,
                      color: eff.kind === 'score' ? '#fbbf24' : eff.kind === 'coin' ? '#fde047' : '#f87171',
                    }}
                  >
                    {eff.text}
                  </div>
                ))}
            </div>
          );
        })}
      </main>

      {/* 3. ĐÁY LÀN: CÁC NÚT ĐẬP D F J K VÀ CUỐN SỔ CHUNG */}
      <footer className="z-10 mt-2 flex w-full max-w-xl flex-col items-center gap-2">
        {/* HÀNG 4 NÚT ĐẬP TƯƠNG ỨNG 4 LÀN */}
        <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2.5">
          {[0, 1, 2, 3].map((lane) => (
            <button
              key={lane}
              type="button"
              className="flex min-h-[48px] sm:min-h-[56px] flex-col items-center justify-center rounded-xl border-2 border-[#8b5a36] bg-gradient-to-b from-[#6e4125] to-[#452412] px-1 py-1 text-giay shadow-lg active:scale-95 active:brightness-125 focus:outline-none focus:ring-2 focus:ring-amber-400"
              data-testid={`nut-dap-${lane}`}
              aria-label={fmt(whackUi.nutDap, { so: lane + 1 })}
              onPointerDown={(e) => {
                e.preventDefault();
                hit(lane);
              }}
            >
              <span className="text-base font-black text-amber-300 sm:text-lg">{LANE_KEYS[lane]}</span>
              <span className="text-[10px] font-semibold text-giay/80">{fmt(whackUi.lanNhan, { so: lane + 1 })}</span>
            </button>
          ))}
        </div>

        {/* BÀN ĐẶT CUỐN SỔ CHUNG */}
        <div className="flex w-full items-center justify-between rounded-xl border border-nau-go/60 bg-[#1e1008] px-3 py-1.5 text-xs text-giay/90 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-sm">📖</span>
            <span className="font-bold text-amber-200">{whackUi.tenSo}</span>
          </div>
          <div className="text-[11px] text-giay/70 sm:text-xs">
            {fmt(whackUi.muc, { so: state.ink, max: WHACK_SPEC.inkMax })}
          </div>
        </div>
      </footer>

      {/* 4. MODAL BẢNG CÂU HỎI TRÙM */}
      {quiz && question && (
        <div
          data-whack-ui
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
          data-testid="trum-cau-hoi"
          onPointerDown={(e) => {
            e.stopPropagation();
            quizPointerDownInside.current = true;
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-2 overflow-y-auto rounded-2xl border-4 border-amber-500 bg-[#2b1810] p-4 text-giay shadow-2xl">
            {/* Header Câu hỏi & Thời gian */}
            <div className="flex flex-col gap-1 rounded-xl bg-black/40 p-2.5">
              <p className="text-center font-display text-sm font-bold text-amber-300">
                {fmt(whackUi.cauHoi, { so: quiz.index + 1, max: WHACK_SPEC.boss.count })}
              </p>
              {quiz.answered === null && (
                <div className="flex items-center gap-2">
                  <p className="shrink-0 text-xs font-semibold text-giay" data-testid="con-gio">
                    {fmt(whackUi.conGio, { giay: quiz.left })}
                  </p>
                  <ProgressBar current={quiz.left} max={quiz.total} className="min-w-0 flex-1" />
                </div>
              )}
            </div>

            {/* Nội dung câu hỏi hoặc thông báo hết giờ */}
            {quiz.answered === 'timeout' ? (
              <Panel className="space-y-2 !p-3 text-sm text-giay" role="alert" data-testid="het-gio">
                <p className="font-bold text-red-400">{whackUi.hetGio}</p>
                <p>{fmt(whackUi.dapAnDung, { dapAn: question.options[question.correctIndex] })}</p>
                <p className="text-xs text-giay/80">{fmt(question.explanation)}</p>
                <Button autoFocus size="sm" className="min-h-11 w-full" onClick={continueBoss}>
                  {whackUi.tiepTuc}
                </Button>
              </Panel>
            ) : (
              <>
                <QuizCard
                  key={quiz.index}
                  question={question}
                  levelId={LEVEL_ID}
                  compact
                  onAnswer={onAnswer}
                  onContinue={continueBoss}
                  continueLabel={whackUi.tiepTuc}
                  className="max-w-none text-giay"
                />
                {quiz.answered !== null && (
                  <p className="rounded-xl bg-black/40 px-3 py-1.5 text-center text-xs font-semibold" data-testid="ket-qua-cau">
                    {quiz.answered ? fmt(whackUi.quizDung, { diem: bossPoints(pending.current?.left ?? 0) }) : fmt(whackUi.quizSai)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL HẾT VÁN (THẮNG HOẶC ĐẦY MỰC) */}
      {ending && (
        <div
          data-whack-ui
          role="status"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          data-testid="het-van"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border-4 border-nau-go bg-[#2a170e] p-5 text-center shadow-2xl">
            <span className="text-4xl">{ending === 'ink' ? '📜' : '🏆'}</span>
            <p className="font-display text-lg font-extrabold text-amber-200">
              {ending === 'ink' ? fmt(whackUi.hetMuc) : fmt(whackUi.xongTrum)}
            </p>
            <Button size="md" className="min-h-11 w-full" autoFocus data-testid="nut-ket-qua" onClick={finish}>
              {whackUi.xemKetQua}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
