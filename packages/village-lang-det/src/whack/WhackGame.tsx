import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ASSETS_URL,
  Button,
  Panel,
  ProgressBar,
  QuizCard,
  fmt,
  lookupAsset,
  pickQuestions,
  sound,
  useGameHint,
  useManifest,
  useSettings,
  whackUi,
  type MiniGameRenderProps,
  type ScorePart,
} from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { WHACK_SPEC, type MouseKind } from './whackConfig';
import { hintFor } from './whackHint';
import { answerBoss, bossPoints, collectCoin, createWhackGame, hitLane, inZone, tickWhack, type BossResult, type WhackEvent } from './whackLogic';

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

/** Danh sách asset ảnh của 4 làn theo đúng thứ tự ảnh mẫu: Xanh lam, Vàng, Đỏ, Xanh lá */
const LANE_ASSETS = ['lane-blue', 'lane-yellow', 'lane-red', 'lane-green'] as const;

/** Màu phong cách của 4 nút đập chân làn ăn khớp với màu làn */
const LANE_BTN_STYLES = [
  'bg-gradient-to-b from-[#2b7fe3] to-[#1452a8] border-[#7cb4f8] shadow-[#0c3b7a]/60 active:bg-[#1452a8]',
  'bg-gradient-to-b from-[#e5a50a] to-[#a37100] border-[#fed367] shadow-[#634500]/60 active:bg-[#a37100]',
  'bg-gradient-to-b from-[#e01b24] to-[#990a12] border-[#f66151] shadow-[#660007]/60 active:bg-[#990a12]',
  'bg-gradient-to-b from-[#2ec27e] to-[#1a7a4c] border-[#8ff0a4] shadow-[#0e4d2e]/60 active:bg-[#1a7a4c]',
] as const;

/** Khoảng thời gian tối thiểu (ms) giữa 2 cú đập trên cùng 1 làn để chống double fire / touch jitter */
const HIT_COOLDOWN_MS = 140;

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

/** Ánh xạ loại chuột sang tên file asset trong man5-2d */
const MOUSE_ASSET_KEYS: Record<MouseKind, string> = {
  thuong: 'mouse-normal',
  doiLan: 'mouse-switch',
  nhanh: 'mouse-fast',
  to: 'mouse-big',
};

/**
 * Component hiển thị ảnh theo asset manifest của dự án, có fallback an toàn
 */
function Man5Sprite({
  name,
  alt,
  className = '',
  style,
  fallback,
  dataTestId,
}: {
  name: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  dataTestId?: string;
}) {
  const manifest = useManifest();
  const [failed, setFailed] = useState(false);
  const src = failed ? null : lookupAsset(manifest, ASSETS_URL, `man5-2d/${name}`);

  if (!src) {
    return fallback ? <>{fallback}</> : <div role="img" aria-label={alt} data-testid={dataTestId} className={className} style={style} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      data-testid={dataTestId}
      className={className}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

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

  // Trạng thái tư thế nhân vật vung búa khi đập
  const [isHitting, setIsHitting] = useState(false);
  const hittingTimer = useRef<number | null>(null);

  const finished = useRef(false);
  const pending = useRef<{ result: BossResult; left: number } | null>(null);
  const quizLeft = useRef(0);
  const shownLeft = useRef(0);
  const nextEffectId = useRef(1);

  // Thời điểm đập gần nhất của từng làn để chống kích hoạt trùng đúp
  const lastHitTime = useRef<number[]>([0, 0, 0, 0]);
  // Theo dõi phím đang nhấn giữ để chống key repeat tự động tính 2 đòn
  const keysPressed = useRef<Set<string>>(new Set());

  // Bảo vệ click ma khi mở câu hỏi: cử chỉ con trỏ/chạm phải có pointerdown bên trong dialog
  const quizPointerDownInside = useRef(false);
  // Bảo vệ Enter giữ/lặp trong dialog câu hỏi
  const enterReleasedAfterAnswer = useRef(false);

  // Dừng vòng lặp khi pause hoặc khi quiz đang mở hoặc kết thúc
  const holdRef = useRef(paused);
  holdRef.current = paused;
  const lastTickTime = useRef(performance.now());

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
    setIsHitting(false);
    lastHitTime.current = [0, 0, 0, 0];
    keysPressed.current.clear();
    lastTickTime.current = performance.now();
  }, [state]);

  // Cập nhật lastTickTime khi pause thay đổi để tránh nhảy thời gian khi unpause
  useEffect(() => {
    lastTickTime.current = performance.now();
  }, [paused]);

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
            quizPointerDownInside.current = false;
            enterReleasedAfterAnswer.current = false;
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
    lastTickTime.current = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - lastTickTime.current) / 1000);
      lastTickTime.current = now;

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

  // Kích hoạt tư thế đập búa của nhân vật
  const triggerHeroHit = useCallback(() => {
    setIsHitting(true);
    if (hittingTimer.current !== null) {
      window.clearTimeout(hittingTimer.current);
    }
    hittingTimer.current = window.setTimeout(() => {
      setIsHitting(false);
      hittingTimer.current = null;
    }, 180);
  }, []);

  // Thao tác đập một làn: dùng chung thống nhất cho cả phím, nút đập và chạm làn/chuột
  const hit = useCallback(
    (lane: number) => {
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended') return;

      const now = performance.now();
      // Chống kích hoạt đúp trên cùng một làn
      if (now - lastHitTime.current[lane] < HIT_COOLDOWN_MS) return;
      lastHitTime.current[lane] = now;

      triggerHeroHit();
      triggerLaneFlash(lane);

      // Thống nhất quy tắc vùng đập: Chuột câu hỏi cũng phải vào vùng đập mới được kích hoạt
      if (state.phase === 'bossRun' && state.boss && state.boss.lane === lane) {
        if (state.boss.pos >= WHACK_SPEC.zoneStart && state.boss.pos <= WHACK_SPEC.zoneEnd) {
          state.phase = 'quiz';
          state.boss.pos = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;
          quizLeft.current = state.boss.answerSeconds;
          shownLeft.current = state.boss.answerSeconds;
          quizPointerDownInside.current = false;
          enterReleasedAfterAnswer.current = false;
          setQuiz({ index: state.boss.index, total: state.boss.answerSeconds, left: state.boss.answerSeconds, answered: null });
          sound.playClick();
          bump();
          return;
        } else if (state.boss.pos < WHACK_SPEC.zoneStart) {
          // Chuột câu hỏi chưa vào vùng đập: hụt
          sound.playWhoosh();
          addEffect(lane, state.boss.pos, whackUi.nhacVungDap, 'miss');
          bump();
          return;
        }
      }

      // Đập chuột thường theo logic thuần hitLane
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
    [state, triggerHeroHit, triggerLaneFlash, addEffect],
  );

  // Nhặt tiền đồng
  const takeCoin = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended') return;
      if (state.coin) {
        addEffect(state.coin.lane, state.coin.pos, `+${WHACK_SPEC.coin.points} (+1 xu)`, 'coin');
      }
      const events = collectCoin(state);
      if (events.length > 0) handleEvents(events);
    },
    [state, handleEvents, addEffect],
  );

  // Bấm trực tiếp vào chuột câu hỏi: áp dụng đúng quy tắc vùng đập như phím và nút làn
  const hitBossMouse = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!state.boss) return;
      hit(state.boss.lane);
    },
    [state, hit],
  );

  // Điều khiển bằng bàn phím: chống key repeat và chặn nhấn giữ
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      // Không tự tính thành 2 đòn khi đang giữ phím
      if (keysPressed.current.has(e.code)) return;
      keysPressed.current.add(e.code);

      e.preventDefault();
      hit(lane);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [hit]);

  // Trả lời câu hỏi
  const question = quiz ? questions[quiz.index] : undefined;

  const onAnswer = useCallback((correct: boolean) => {
    if (pending.current) return;
    const left = quizLeft.current;
    pending.current = { result: correct ? 'correct' : 'wrong', left };
    enterReleasedAfterAnswer.current = false;
    setQuiz((q) => (q ? { ...q, answered: correct } : q));
  }, []);

  const continueBoss = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    quizLeft.current = 0;
    setQuiz(null);
    lastTickTime.current = performance.now();
    handleEvents(answerBoss(state, p.result, p.left));
  }, [state, handleEvents]);

  // Enter giữ/lặp trong dialog câu hỏi: chỉ cho phép "Chơi tiếp" khi đã thả Enter trước đó
  useEffect(() => {
    if (!quiz || quiz.answered === null) return;

    const onKeyDownDialog = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      if (!enterReleasedAfterAnswer.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    const onKeyUpDialog = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        enterReleasedAfterAnswer.current = true;
      }
    };

    window.addEventListener('keydown', onKeyDownDialog, true);
    window.addEventListener('keyup', onKeyUpDialog, true);
    return () => {
      window.removeEventListener('keydown', onKeyDownDialog, true);
      window.removeEventListener('keyup', onKeyUpDialog, true);
    };
  }, [quiz]);

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
      __whackSetQuizLeft: (secs: number) => {
        quizLeft.current = secs;
      },
      __whackTriggerEnd: (reason: 'ink' | 'complete') => {
        state.phase = 'ended';
        setEnding(reason);
      },
      __whackSetBoss: (lane: number, pos: number, index = 0) => {
        state.phase = 'bossRun';
        state.boss = { index, lane, pos, t: 1.0, answerSeconds: 15 };
        bump();
      },
      __whackBump: () => bump(),
    });
  }

  const fill = Math.min(1, state.ink / WHACK_SPEC.inkMax);

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col items-center justify-between overflow-hidden select-none font-display text-giay"
      data-testid="man5"
    >
      {/* 1. LỚP NỀN: background-pc.png bao trùm toàn bộ không gian PC */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <Man5Sprite
          name="background-pc"
          alt={whackUi.nenPc}
          className="h-full w-full object-cover object-center"
          fallback={<div className="h-full w-full bg-gradient-to-b from-[#2d1b0d] via-[#1a0f08] to-[#120a05]" />}
        />
        {/* Lớp phủ tối nhẹ để tăng độ tương phản cho 4 làn màu */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* 2. THANH TRÊN: HUD Thông tin (Điểm, Xu, Vết mực, Trùm) */}
      <header
        className="z-30 mt-2 flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 rounded-2xl border-2 border-[#8b5a36]/80 bg-[#2b1810]/90 px-3 py-1.5 shadow-xl backdrop-blur-sm sm:px-4"
        data-testid="hud"
      >
        {/* Điểm số */}
        <div className="flex items-center gap-1.5 font-black text-amber-300 text-sm sm:text-base">
          <span className="text-base sm:text-lg">🏆</span>
          <span data-testid="diem">{fmt(whackUi.diem, { so: state.score })}</span>
        </div>

        {/* Tiền xu */}
        <div className="flex items-center gap-1 font-bold text-yellow-300 text-xs sm:text-sm">
          <span>🪙</span>
          <span>{fmt(whackUi.xu, { so: state.coins })}</span>
        </div>

        {/* Vết mực trên sổ */}
        <div
          className="flex items-center gap-1.5"
          role="img"
          aria-label={fmt(whackUi.muc, { so: state.ink, max: WHACK_SPEC.inkMax })}
          data-testid="cham-muc"
        >
          <span className="hidden text-xs font-semibold text-giay/80 sm:inline">{fmt(whackUi.phanMuc)}:</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {Array.from({ length: WHACK_SPEC.inkMax }, (_, i) => {
              const on = i < state.ink;
              const red = on ? `hsl(${Math.round(35 - 35 * fill)} 90% ${Math.round(52 - 12 * fill)}%)` : '#3a2215';
              return (
                <span
                  key={i}
                  className={`block size-2.5 rounded-full border border-black/40 sm:size-3 transition-colors ${
                    on ? 'ring-1 ring-red-400' : ''
                  }`}
                  style={{ background: red }}
                  data-on={on ? '1' : '0'}
                />
              );
            })}
          </div>
          <span className="font-mono text-xs font-extrabold text-amber-300">
            {state.ink}/{WHACK_SPEC.inkMax}
          </span>
        </div>

        {/* Lượt trùm */}
        <div className="flex items-center gap-1 font-bold text-amber-200 text-xs sm:text-sm">
          <span>{fmt(whackUi.trum, { so: state.bossesDone, max: WHACK_SPEC.boss.count })}</span>
        </div>
      </header>

      {/* 3. KHU VỰC TRUNG TÂM: NHÂN VẬT + SÂN 4 LÀN DỌC + CUỐN SỔ + NÚT ĐẬP */}
      <div className="relative flex flex-1 w-full flex-col items-center justify-center min-h-0 py-1 sm:py-2">
        {/* NHÂN VẬT HỌC SINH NAM (Hero Idle / Hit) ĐỨNG TRÊN ĐỈNH SÂN CHƠI */}
        <div
          className="relative z-20 flex justify-center -mb-4 sm:-mb-6 md:-mb-8 pointer-events-none"
          data-testid="hero-figure"
        >
          <div className="relative w-28 h-24 sm:w-36 sm:h-32 md:w-44 md:h-36 lg:w-52 lg:h-40 flex items-end justify-center">
            {/* Tư thế vung búa đập (hero-hit) hoặc tư thế chờ (hero-idle) */}
            <Man5Sprite
              name={isHitting ? 'hero-hit' : 'hero-idle'}
              alt={whackUi.nhanVat}
              dataTestId="hero-img"
              className="max-h-full max-w-full object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-transform duration-75"
              fallback={<span className="text-4xl">🧑‍🎓</span>}
            />
          </div>
        </div>

        {/* KHUNG SÂN 4 LÀN CHÍNH (Được kẹp bởi 2 thanh viền gỗ) */}
        <div className="relative flex flex-1 w-full max-w-[340px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[640px] xl:max-w-[700px] min-h-0 items-stretch justify-center">
          {/* CỘT VIỀN GỖ BÊN TRÁI */}
          <div className="relative w-6 sm:w-8 md:w-10 lg:w-12 shrink-0 overflow-hidden z-20 select-none">
            <Man5Sprite
              name="wood-border"
              alt=""
              className="h-full w-full object-cover object-center"
              fallback={<div className="h-full w-full bg-[#5a3319] border-r-2 border-[#8b5a36]" />}
            />
          </div>

          {/* SÂN 4 LÀN CHÍNH */}
          <main
            role="application"
            aria-label={whackUi.khung}
            className="relative flex flex-1 h-full select-none overflow-hidden"
            data-testid="man5-lanes"
          >
            {[0, 1, 2, 3].map((lane) => {
              const isBossInLane = state.phase === 'bossRun' && state.boss && state.boss.lane === lane;
              const hasMouseInZone = state.mice.some((m) => m.lane === lane && inZone(m));
              const flashOn = Date.now() - laneFlashes[lane] < 140;

              return (
                <div
                  key={lane}
                  data-lane={lane}
                  className={`relative flex-1 h-full cursor-pointer overflow-hidden transition-colors ${
                    flashOn ? 'brightness-125' : ''
                  }`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    hit(lane);
                  }}
                >
                  {/* Ảnh nền texture của làn (Xanh lam, Vàng, Đỏ, Xanh lá) */}
                  <div className="absolute inset-0 pointer-events-none select-none">
                    <Man5Sprite
                      name={LANE_ASSETS[lane]}
                      alt={fmt(whackUi.lanNhan, { so: lane + 1 })}
                      className="h-full w-full object-cover object-center"
                      fallback={<div className={`h-full w-full ${lane === 0 ? 'bg-blue-600' : lane === 1 ? 'bg-amber-500' : lane === 2 ? 'bg-red-600' : 'bg-emerald-600'}`} />}
                    />
                  </div>

                  {/* VÙNG ĐẬP (Hit Zone: 65% tới 90% chiều cao làn) */}
                  <div
                    className={`pointer-events-none absolute left-0 right-0 z-10 transition-all ${
                      hasMouseInZone || (isBossInLane && state.boss && state.boss.pos >= WHACK_SPEC.zoneStart)
                        ? `bg-white/25 ring-2 ring-yellow-300/80 ${reduced ? '' : 'animate-pulse'}`
                        : 'bg-white/10'
                    }`}
                    style={{
                      top: `${(WHACK_SPEC.zoneStart / WHACK_SPEC.laneLength) * 100}%`,
                      height: `${((WHACK_SPEC.zoneEnd - WHACK_SPEC.zoneStart) / WHACK_SPEC.laneLength) * 100}%`,
                      borderTop: '2px solid rgba(255, 255, 255, 0.4)',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.6)',
                    }}
                    data-testid={`vung-dap-${lane}`}
                  >
                    <div className="flex h-full w-full items-end justify-center pb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/50 drop-shadow">
                        {whackUi.nhacVungDap}
                      </span>
                    </div>
                  </div>

                  {/* CÁC CHUỘT TRÊN LÀN NÀY */}
                  {state.mice
                    .filter((m) => m.lane === lane)
                    .map((m) => {
                      const inZ = inZone(m);
                      return (
                        <div
                          key={m.id}
                          className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                            inZ ? 'scale-105' : 'scale-95'
                          } ${m.flash ? `brightness-150 ${reduced ? '' : 'animate-bounce'}` : ''}`}
                          style={{
                            top: `${(m.pos / WHACK_SPEC.laneLength) * 100}%`,
                            width: m.kind === 'to' ? '92%' : '82%',
                            maxWidth: m.kind === 'to' ? '98px' : '84px',
                            aspectRatio: '1 / 1',
                          }}
                          data-testid="chuot"
                          data-mouse-id={m.id}
                          data-kind={m.kind}
                          data-in-zone={inZ ? '1' : '0'}
                          role="button"
                          aria-label={KIND_NAMES[m.kind]}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            hit(lane);
                          }}
                        >
                          <div className="relative flex size-full items-center justify-center">
                            {/* Sprite chuột hoạt hình 2D tương ứng */}
                            <Man5Sprite
                              name={MOUSE_ASSET_KEYS[m.kind]}
                              alt={KIND_NAMES[m.kind]}
                              className="size-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                              fallback={<span className="text-2xl">{m.kind === 'to' ? '🐀' : '🐁'}</span>}
                            />

                            {/* Chỉ báo đặc biệt: Chuột nhanh có tia chớp ⚡ */}
                            {m.kind === 'nhanh' && (
                              <span
                                className={`absolute -top-1 -right-1 text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
                                  reduced ? '' : 'animate-pulse'
                                }`}
                              >
                                ⚡
                              </span>
                            )}

                            {/* Chỉ báo đặc biệt: Chuột đổi làn có mũi tên ⇄ */}
                            {m.kind === 'doiLan' && (
                              <span className="absolute -top-1 -right-1 rounded-full bg-blue-900/80 px-1 text-[11px] font-black text-cyan-300 drop-shadow">
                                ⇄
                              </span>
                            )}

                            {/* Chỉ báo đặc biệt: Chuột to có 2 vạch máu */}
                            {m.kind === 'to' && (
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 rounded bg-black/70 px-1 py-0.5">
                                <span className={`size-2 rounded-sm ${m.hits >= 1 ? 'bg-red-500' : 'bg-gray-600'}`} />
                                <span className={`size-2 rounded-sm ${m.hits >= 2 ? 'bg-red-500' : 'bg-gray-600'}`} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* CHUỘT CÂU HỎI (TRÙM TÍ VỚI BIỂU TƯỢNG ❓ VÀNG LỚN) */}
                  {isBossInLane && state.boss && (
                    <div
                      className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        state.boss.pos >= WHACK_SPEC.zoneStart && state.boss.pos <= WHACK_SPEC.zoneEnd
                          ? 'ring-4 ring-yellow-400 scale-110 drop-shadow-[0_0_16px_rgba(250,204,21,0.9)]'
                          : 'scale-100'
                      }`}
                      style={{
                        top: `${(state.boss.pos / WHACK_SPEC.laneLength) * 100}%`,
                        width: '95%',
                        maxWidth: '104px',
                        aspectRatio: '1 / 1',
                      }}
                      data-testid="chuot-cau-hoi"
                      data-in-zone={state.boss.pos >= WHACK_SPEC.zoneStart && state.boss.pos <= WHACK_SPEC.zoneEnd ? '1' : '0'}
                      role="button"
                      aria-label={whackUi.chuotCauHoi}
                      onPointerDown={hitBossMouse}
                    >
                      <div className="relative flex size-full items-center justify-center">
                        {/* Sprite chuột câu hỏi */}
                        <Man5Sprite
                          name="mouse-question"
                          alt={whackUi.chuotCauHoi}
                          className="size-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                          fallback={<span className="text-3xl">👑</span>}
                        />

                        {/* Dấu hỏi vàng lớn trên đầu (tắt nhấp nháy khi giảm chuyển động) */}
                        <span
                          className={`absolute -top-2 -right-1 text-2xl font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                            reduced ? '' : 'animate-bounce'
                          }`}
                        >
                          ❓
                        </span>

                        {/* Nhãn tiếp cận accessibility */}
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-1.5 py-0.2 text-[9px] font-black uppercase text-yellow-300">
                          {whackUi.chuotCauHoi}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ĐỒNG TIỀN XU (coin.png) */}
                  {state.coin && state.coin.lane === lane && (
                    <div
                      className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                        reduced ? '' : 'animate-bounce'
                      }`}
                      style={{
                        top: `${(state.coin.pos / WHACK_SPEC.laneLength) * 100}%`,
                        width: '44px',
                        height: '44px',
                      }}
                      data-testid="dong-tien"
                      role="button"
                      aria-label={whackUi.phanDong}
                      onPointerDown={takeCoin}
                    >
                      <Man5Sprite
                        name="coin"
                        alt={whackUi.tienDong}
                        className="size-full object-contain drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]"
                        fallback={<span className="text-2xl">🪙</span>}
                      />
                    </div>
                  )}

                  {/* HIỆU ỨNG ĐIỂM NỔ / TIA SÁNG TẠM THỜI TRÊN LÀN */}
                  {effects
                    .filter((eff) => eff.lane === lane)
                    .map((eff) => (
                      <div
                        key={eff.id}
                        className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 font-black text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                          reduced ? 'animate-out fade-out duration-500' : 'animate-out fade-out slide-out-to-top duration-700'
                        }`}
                        style={{
                          top: `${(eff.pos / WHACK_SPEC.laneLength) * 100}%`,
                          color: eff.kind === 'score' ? '#fde047' : eff.kind === 'coin' ? '#4ade80' : '#f87171',
                        }}
                      >
                        {eff.text}
                      </div>
                    ))}
                </div>
              );
            })}
          </main>

          {/* CỘT VIỀN GỖ BÊN PHẢI (Lật gương scale-x-[-1]) */}
          <div className="relative w-6 sm:w-8 md:w-10 lg:w-12 shrink-0 overflow-hidden z-20 select-none">
            <Man5Sprite
              name="wood-border"
              alt=""
              className="h-full w-full object-cover object-center scale-x-[-1]"
              fallback={<div className="h-full w-full bg-[#5a3319] border-l-2 border-[#8b5a36]" />}
            />
          </div>
        </div>

        {/* 4. CUỐN SỔ CHUNG Ở ĐÁY CÁC LÀN (book.png) & CÁC CHẤM MỰC */}
        <div
          className="relative z-20 w-full max-w-[340px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[640px] xl:max-w-[700px] flex flex-col items-center -mt-1 sm:-mt-2"
          data-testid="so-chung-day"
        >
          <div className="relative w-full flex items-center justify-center">
            {/* Ảnh cuốn Sổ Chung */}
            <Man5Sprite
              name="book"
              alt={whackUi.soChung}
              className="w-full max-h-16 sm:max-h-20 md:max-h-24 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
              fallback={
                <div className="h-12 w-full rounded-xl border border-nau-go/60 bg-[#1e1008] px-3 py-1.5 flex items-center justify-between" />
              }
            />

            {/* Các vết mực trên bề mặt cuốn sổ */}
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3 px-10 sm:px-14 md:px-20 lg:px-24">
              {Array.from({ length: WHACK_SPEC.inkMax }, (_, i) => {
                const on = i < state.ink;
                return (
                  <span
                    key={i}
                    className={`block size-3 sm:size-3.5 md:size-4 rounded-full border border-black/60 transition-transform ${
                      on
                        ? 'bg-gradient-to-br from-red-600 via-purple-900 to-black scale-110 ring-2 ring-red-500 shadow-md'
                        : 'bg-[#2b1810]/70 border-nau-go/50'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. CÁC NÚT ĐẬP D F J K CHÂN LÀN */}
        <footer className="z-20 mt-1 sm:mt-2 w-full max-w-[340px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[640px] xl:max-w-[700px] px-1">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
            {[0, 1, 2, 3].map((lane) => (
              <button
                key={lane}
                type="button"
                className={`flex h-11 sm:h-12 md:h-14 min-h-[46px] flex-col items-center justify-center rounded-xl border-2 text-white shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300 ${LANE_BTN_STYLES[lane]}`}
                data-testid={`nut-dap-${lane}`}
                aria-label={fmt(whackUi.nutDap, { so: lane + 1 })}
                onPointerDown={(e) => {
                  e.preventDefault();
                  hit(lane);
                }}
              >
                <span className="text-lg sm:text-xl md:text-2xl font-black drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                  {LANE_KEYS[lane]}
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-white/80 uppercase tracking-tighter">
                  {fmt(whackUi.lanNhan, { so: lane + 1 })}
                </span>
              </button>
            ))}
          </div>
        </footer>
      </div>

      {/* 6. MODAL BẢNG CÂU HỎI TRÙM */}
      {quiz && question && (
        <div
          data-whack-ui
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
          data-testid="trum-cau-hoi"
          onPointerDown={(e) => {
            e.stopPropagation();
            quizPointerDownInside.current = true;
          }}
          onClickCapture={(e) => {
            // Chặn click ma ở Capture phase trước khi tới button của QuizCard
            if (!quizPointerDownInside.current) {
              const native = e.nativeEvent as MouseEvent;
              if (native.detail > 0 || (native.clientX !== 0 && native.clientY !== 0)) {
                e.preventDefault();
                e.stopPropagation();
              }
            }
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

      {/* 7. MODAL HẾT VÁN (THẮNG HOẶC ĐẦY MỰC) */}
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
