import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ASSETS_URL,
  Button,
  FeedbackSheet,
  fmt,
  lookupAsset,
  pickQuestions,
  sound,
  useGameHint,
  useManifest,
  useSettings,
  whackUi,
  TutorialSpotlight,
  tutorialTexts,
  type MiniGameRenderProps,
  type ScorePart,
  type TutorialStep,
} from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { WHACK_SPEC, type MouseKind } from './whackConfig';
import { hintFor } from './whackHint';
import { answerBoss, bossInZone, bossPoints, collectCoin, createWhackGame, hitLane, inZone, readDone, tickWhack, type WhackEvent } from './whackLogic';

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
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

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
/** Sau khi hộp kết quả mở, bỏ qua bấm "Chơi tiếp" trong chừng này ms (chống click ma từ cú đập vừa rồi) */
const SHEET_GUARD_MS = 450;
/** Bề rộng khung chơi theo cỡ màn hình, dùng chung cho sổ, nhân vật, sân và nút */
const FIELD_W = 'w-full max-w-[340px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[640px] xl:max-w-[700px]';
/** Vị trí mẫu của chuột trong bước làm thử (giữa vùng đập) */
const DEMO_POS = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;

/** Chuột đi từ dưới lên, sổ ở đỉnh: vị trí `pos` của luật (0 là chỗ xuất hiện, 10 là sổ) đổi ra % từ mép trên của làn */
const topPct = (pos: number): string => `${(1 - pos / WHACK_SPEC.laneLength) * 100}%`;

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

  return <img src={src} alt={alt} data-testid={dataTestId} className={className} style={style} draggable={false} onError={() => setFailed(true)} />;
}

/** Màn hình đang dọc (điện thoại): cột câu hỏi chuyển thành dải phía trên */
function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return portrait;
}

interface PanelData {
  title: string;
  text: string;
  options: readonly string[];
  /** Đáp án đúng, và đáp án em đã chọn: chỉ có sau khi đập (hộp kết quả) */
  correct?: number;
  chosen?: number | null;
  /** Nút "Đọc xong" (chỉ khi lượt đáp án còn chờ chuột tới vùng đập) */
  onReadDone?: () => void;
}

/** Cột (hay dải) câu hỏi: chỉ để ĐỌC, các đáp án không bấm được. */
function QuestionPanel({ data }: { data: PanelData }) {
  return (
    <section
      className="flex max-h-full w-full flex-col gap-1.5 overflow-y-auto rounded-xl border-2 border-amber-500/80 bg-[#2b1810]/95 p-2.5 text-giay sm:p-3 portrait:gap-1 portrait:p-2"
      aria-label={fmt(whackUi.cotCauHoi)}
      data-testid="cot-cau-hoi"
    >
      <p className="text-xs font-extrabold text-amber-300 sm:text-sm">{data.title}</p>
      <p className="text-sm font-bold leading-snug sm:text-base portrait:text-[13px] [@media(max-height:520px)]:!text-xs" data-testid="cau-hoi-noi-dung">
        {data.text}
      </p>
      <ul className="flex flex-col gap-1" data-testid="dap-an-doc">
        {data.options.map((opt, i) => {
          const isCorrect = data.correct === i;
          const isChosen = data.chosen === i;
          return (
            <li
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-2 py-1 text-xs leading-snug sm:text-sm portrait:py-0.5 portrait:text-[12px] [@media(max-height:520px)]:!py-0.5 [@media(max-height:520px)]:!text-[11px] ${
                data.correct === undefined ? 'border-amber-700/60 bg-black/30' : isCorrect ? 'border-green-400 bg-green-900/50' : isChosen ? 'border-red-400 bg-red-900/50' : 'border-amber-700/40 bg-black/20 opacity-70'
              }`}
              data-option={i}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-[#2b1810]">{OPTION_LETTERS[i]}</span>
              <span className="min-w-0 flex-1">{opt}</span>
              {data.correct !== undefined && isCorrect && <span aria-hidden>✓</span>}
              {data.correct !== undefined && isChosen && !isCorrect && <span aria-hidden>✗</span>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1.5 portrait:flex-row portrait:items-center portrait:gap-2">
        {data.correct === undefined && <p className="min-w-0 flex-1 text-[11px] font-semibold text-amber-200/90 sm:text-xs">{fmt(whackUi.docCauHoi)}</p>}
        {data.onReadDone && (
          <button
            type="button"
            onClick={data.onReadDone}
            title={fmt(whackUi.docXongGoiY)}
            className="min-h-9 shrink-0 rounded-lg border-2 border-amber-300 bg-amber-500 px-3 py-1 text-sm font-extrabold text-[#2b1810] active:bg-amber-400"
            data-testid="doc-xong"
          >
            {fmt(whackUi.docXong)}
          </button>
        )}
      </div>
    </section>
  );
}

export function WhackGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const portrait = usePortrait();

  const seed = useMemo(() => newSeed(), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = useMemo(() => pickQuestions({ bai: [1, 2], soCau: WHACK_SPEC.boss.count, seed }), [seed]);
  const state = useMemo(() => createWhackGame(seed, questions.map((q) => ({ correct: q.correctIndex, options: q.options.length }))), [seed, questions]);

  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [ending, setEnding] = useState<null | 'ink' | 'complete'>(null);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [laneFlashes, setLaneFlashes] = useState<number[]>([0, 0, 0, 0]);

  // Nhân vật cầm búa: đứng ở hàng gần sổ, chạy ngang tới làn được đập rồi vung búa
  const [heroLane, setHeroLane] = useState(1);
  const [isHitting, setIsHitting] = useState(false);
  const hittingTimer = useRef<number | null>(null);

  const finished = useRef(false);
  const nextEffectId = useRef(1);
  const sheetOpenedAt = useRef(0);

  // Thời điểm đập gần nhất của từng làn để chống kích hoạt trùng đúp
  const lastHitTime = useRef<number[]>([0, 0, 0, 0]);
  // Theo dõi phím đang nhấn giữ để chống key repeat tự động tính 2 đòn
  const keysPressed = useRef<Set<string>>(new Set());

  // Trạng thái hướng dẫn focus và làm thử (P8)
  const [tutorialActive, setTutorialActive] = useState(attempt <= 1);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialMsg, setTutorialMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dừng vòng lặp khi pause hoặc khi tutorial đang mở
  const holdLoop = paused || tutorialActive;
  const holdRef = useRef(holdLoop);
  holdRef.current = holdLoop;
  const lastTickTime = useRef(performance.now());

  useGameHint(setHint, 5, () => hintFor(state));

  // Reset khi sang ván mới
  useEffect(() => {
    finished.current = false;
    setEnding(null);
    setEffects([]);
    setLaneFlashes([0, 0, 0, 0]);
    setIsHitting(false);
    setHeroLane(1);
    lastHitTime.current = [0, 0, 0, 0];
    keysPressed.current.clear();
    lastTickTime.current = performance.now();
  }, [state]);

  // Cập nhật lastTickTime khi pause hoặc tutorial thay đổi để tránh nhảy thời gian khi unpause
  useEffect(() => {
    lastTickTime.current = performance.now();
  }, [paused, tutorialActive]);

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
          case 'answerStart':
            sound.playClick();
            break;
          case 'bossQuiz':
            // FeedbackSheet tự phát âm đúng/sai
            sheetOpenedAt.current = performance.now();
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

      // Đứng yên hoàn toàn khi paused từ ngoài (MiniGameLevel), khi hộp kết quả mở hay khi hết ván
      if (holdRef.current || state.phase === 'ended' || state.phase === 'quiz') return;

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
    if (hittingTimer.current !== null) window.clearTimeout(hittingTimer.current);
    hittingTimer.current = window.setTimeout(() => {
      setIsHitting(false);
      hittingTimer.current = null;
    }, 180);
  }, []);

  // ---- Hướng dẫn làm thử: chuột mẫu và lượt đáp án mẫu (dữ liệu riêng, không đụng ván thật)
  const demo = tutorialTexts.man5.mau;
  const [demoMouseGone, setDemoMouseGone] = useState(false);

  const doPracticeHit = useCallback(() => {
    setHeroLane(0);
    triggerHeroHit();
    triggerLaneFlash(0);
    sound.playWhoosh();
    setDemoMouseGone(true);
    setTutorialMsg(null);
    setTutorialStep(5);
  }, [triggerHeroHit, triggerLaneFlash]);

  const doPracticeAnswer = useCallback(
    (lane: number) => {
      setHeroLane(lane);
      triggerHeroHit();
      triggerLaneFlash(lane);
      if (lane === demo.dung) {
        sound.playCorrect();
        setTutorialMsg({ text: fmt(tutorialTexts.man5.dungMau, { nhan: OPTION_LETTERS[lane] }), type: 'success' });
        setTutorialStep(6);
      } else {
        sound.playWrong();
        setTutorialMsg({ text: tutorialTexts.man5.sai, type: 'error' });
      }
    },
    [demo.dung, triggerHeroHit, triggerLaneFlash],
  );

  // Phím tắt trong bước làm thử: D/1 (bước 4), D F J K / 1 2 3 4 (bước 5)
  useEffect(() => {
    if (!tutorialActive || (tutorialStep !== 4 && tutorialStep !== 5)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      e.preventDefault();
      if (tutorialStep === 4) {
        if (lane === 0) doPracticeHit();
      } else doPracticeAnswer(lane);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tutorialActive, tutorialStep, doPracticeHit, doPracticeAnswer]);

  // Danh sách các bước hướng dẫn focus Màn 5 (gọn: đập thử 1 chuột thường + 1 lượt đáp án mẫu)
  const tutorialSteps: TutorialStep[] = useMemo(
    () => [
      { id: 'intro', title: fmt(tutorialTexts.man5.tieuDe), content: fmt(tutorialTexts.man5.intro) },
      { id: 'lanes', targetSelector: '#tutorial-man5-lanes', title: fmt(tutorialTexts.man5.tieuDe), content: tutorialTexts.man5.lanes, nextLabel: tutorialTexts.chung.daHieu },
      { id: 'soChung', targetSelector: '#tutorial-man5-book', title: fmt(tutorialTexts.man5.tieuDe), content: tutorialTexts.man5.soChung, nextLabel: tutorialTexts.chung.daHieu },
      { id: 'buttons', targetSelector: '#tutorial-man5-buttons', title: fmt(tutorialTexts.man5.tieuDe), content: tutorialTexts.man5.buttons, nextLabel: tutorialTexts.chung.thuTinhNgay },
      { id: 'practice', targetSelector: '#tutorial-man5-buttons', title: fmt(tutorialTexts.man5.tieuDe), content: tutorialTexts.man5.practice, interactive: true, hideNextButton: true },
      { id: 'practiceAnswer', targetSelector: '#tutorial-man5-lanes', title: fmt(tutorialTexts.man5.tieuDe), content: fmt(tutorialTexts.man5.practiceAnswer), interactive: true, hideNextButton: true },
      { id: 'ready', title: fmt(tutorialTexts.man5.tieuDe), content: fmt(tutorialTexts.man5.correct) },
    ],
    [],
  );

  // Thao tác đập một làn: dùng chung cho cả phím, nút đập và chạm làn/chuột. Cú đập tính ngay (logic); nhân vật chạy tới làn chỉ là hoạt cảnh.
  const hit = useCallback(
    (lane: number) => {
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended') return;

      const now = performance.now();
      // Chống kích hoạt đúp trên cùng một làn
      if (now - lastHitTime.current[lane] < HIT_COOLDOWN_MS) return;
      lastHitTime.current[lane] = now;

      setHeroLane(lane);
      triggerHeroHit();
      triggerLaneFlash(lane);

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
      } else if (e.type === 'miss') {
        sound.playWhoosh();
      }
      handleEvents(events);
      bump();
    },
    [state, triggerHeroHit, triggerLaneFlash, addEffect, handleEvents],
  );

  // Nhặt tiền đồng
  const takeCoin = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (holdRef.current || state.phase === 'quiz' || state.phase === 'ended' || state.phase === 'answer') return;
      if (state.coin) {
        addEffect(state.coin.lane, state.coin.pos, `+${WHACK_SPEC.coin.points} (+1 xu)`, 'coin');
      }
      const events = collectCoin(state);
      if (events.length > 0) handleEvents(events);
    },
    [state, handleEvents, addEffect],
  );

  // "Đọc xong": chuột đáp án chạy nhanh tới đầu vùng đập
  const readNow = useCallback(() => {
    if (holdRef.current) return;
    const events = readDone(state);
    if (events.length > 0) {
      sound.playClick();
      handleEvents(events);
    }
  }, [state, handleEvents]);

  // Điều khiển bằng bàn phím: chống key repeat và chặn nhấn giữ
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space' && state.phase === 'answer') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        readNow();
        return;
      }
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
  }, [hit, readNow, state]);

  // Câu hỏi của lượt đang mở (lượt đáp án hoặc hộp kết quả)
  const round = state.answer ?? null;
  const verdict = state.phase === 'quiz' ? state.verdict : null;
  const roundIndex = state.phase === 'answer' && round ? round.index : state.phase === 'quiz' && state.boss ? state.boss.index : -1;
  const question = roundIndex >= 0 ? questions[roundIndex] : undefined;
  const demoOpen = tutorialActive && tutorialStep === 5;

  const panel: PanelData | null = demoOpen
    ? { title: fmt(whackUi.cauHoi, { so: 1, max: WHACK_SPEC.boss.count }), text: demo.cauHoi, options: demo.dapAn }
    : question
      ? {
          title: fmt(whackUi.cauHoi, { so: roundIndex + 1, max: WHACK_SPEC.boss.count }),
          text: fmt(question.text),
          options: question.options.map((o) => fmt(o)),
          ...(verdict ? { correct: verdict.correct, chosen: verdict.option } : {}),
          ...(state.phase === 'answer' && round && !round.boost && round.mice.every((m) => m.pos < WHACK_SPEC.zoneStart) ? { onReadDone: readNow } : {}),
        }
      : null;

  const continueBoss = useCallback(() => {
    const v = state.verdict;
    if (state.phase !== 'quiz' || !v) return;
    if (performance.now() - sheetOpenedAt.current < SHEET_GUARD_MS) return;
    lastTickTime.current = performance.now();
    handleEvents(answerBoss(state, v.result, v.secondsLeft));
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
  if (PROBE && typeof window !== 'undefined') {
    Object.assign(window, {
      __whack: state,
      __whackQuestions: questions,
      __whackUi: { ready: true, phase: state.phase, heroLane, ending },
      __whackHit: hit,
      __whackTriggerEnd: (reason: 'ink' | 'complete') => {
        state.phase = 'ended';
        setEnding(reason);
      },
      /** Đặt chuột câu hỏi vào làn `lane` ở vị trí `pos` (đã tới chỗ chờ nếu trong vùng đập) */
      __whackSetBoss: (lane: number, pos: number, index = 0) => {
        state.phase = 'bossRun';
        state.boss = { index, lane, pos, t: 1.0, arrived: pos >= WHACK_SPEC.zoneStart, answerSeconds: WHACK_SPEC.boss.answerSeconds[index < WHACK_SPEC.boss.firstHalf ? 0 : 1], laneOf: [(lane + 1) % 4, (lane + 2) % 4, (lane + 3) % 4, lane] };
        bump();
      },
      __whackBump: () => bump(),
      __whackTutorial: {
        active: tutorialActive,
        step: tutorialStep,
        setStep: setTutorialStep,
        setActive: setTutorialActive,
      },
    });
  }

  const fill = Math.min(1, state.ink / WHACK_SPEC.inkMax);
  const roundOn = state.phase === 'answer' || state.phase === 'quiz' || demoOpen;
  const heroStyle: React.CSSProperties = { left: `${(heroLane + 0.5) * 25}%`, transition: reduced ? 'none' : 'left 120ms linear' };

  // Khối cuốn Sổ Chung (đỉnh sân) kèm 8 vết mực
  const bookBlock = (
    <div id="tutorial-man5-book" className={`relative z-20 flex ${FIELD_W} flex-col items-center`} data-testid="so-chung-day">
      <div className="relative flex w-full items-center justify-center">
        <Man5Sprite
          name="book"
          alt={whackUi.soChung}
          className="max-h-14 w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:max-h-16 md:max-h-20 lg:max-h-24 portrait:max-h-24 [@media(max-height:520px)]:!max-h-12"
          fallback={<div className="h-12 w-full rounded-xl border border-nau-go/60 bg-[#1e1008] px-3 py-1.5" />}
        />
        <div className="absolute inset-0 flex items-center justify-center gap-1 sm:gap-1.5">
          {Array.from({ length: WHACK_SPEC.inkMax }, (_, i) => {
            const on = i < state.ink;
            return (
              <span
                key={i}
                className={`block size-2.5 rounded-full border border-black/60 transition-transform sm:size-3 md:size-3.5 [@media(max-height:520px)]:!size-2 ${
                  on ? 'scale-110 bg-gradient-to-br from-red-600 via-purple-900 to-black ring-2 ring-red-500' : 'border-nau-go/50 bg-[#2b1810]/70'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div
      id="tutorial-man5-game"
      className="fixed inset-0 z-20 flex select-none flex-col items-center justify-between overflow-hidden font-display text-giay"
      data-testid="man5"
    >
      {/* 1. LỚP NỀN */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Man5Sprite
          name="background-pc"
          alt={whackUi.nenPc}
          className="h-full w-full object-cover object-center"
          fallback={<div className="h-full w-full bg-gradient-to-b from-[#2d1b0d] via-[#1a0f08] to-[#120a05]" />}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* 2. THANH TRÊN: HUD (Điểm, Xu, Vết mực, Lượt) */}
      <header
        className="z-30 mt-2 flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 rounded-2xl border-2 border-[#8b5a36]/80 bg-[#2b1810]/90 px-3 py-1.5 shadow-xl sm:px-4"
        data-testid="hud"
      >
        <div className="flex items-center gap-1.5 text-sm font-black text-amber-300 sm:text-base">
          <span className="text-base sm:text-lg">🏆</span>
          <span data-testid="diem">{fmt(whackUi.diem, { so: state.score })}</span>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-yellow-300 sm:text-sm">
          <span>🪙</span>
          <span>{fmt(whackUi.xu, { so: state.coins })}</span>
        </div>

        <div className="flex items-center gap-1.5" role="img" aria-label={fmt(whackUi.muc, { so: state.ink, max: WHACK_SPEC.inkMax })} data-testid="cham-muc">
          <span className="hidden text-xs font-semibold text-giay/80 sm:inline">{fmt(whackUi.phanMuc)}:</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {Array.from({ length: WHACK_SPEC.inkMax }, (_, i) => {
              const on = i < state.ink;
              const red = on ? `hsl(${Math.round(35 - 35 * fill)} 90% ${Math.round(52 - 12 * fill)}%)` : '#3a2215';
              return <span key={i} className={`block size-2.5 rounded-full border border-black/40 transition-colors sm:size-3 ${on ? 'ring-1 ring-red-400' : ''}`} style={{ background: red }} data-on={on ? '1' : '0'} />;
            })}
          </div>
          <span className="font-mono text-xs font-extrabold text-amber-300">
            {state.ink}/{WHACK_SPEC.inkMax}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-200 sm:text-sm">
          <span>{fmt(whackUi.trum, { so: state.bossesDone, max: WHACK_SPEC.boss.count })}</span>
        </div>

        <button
          type="button"
          aria-label={tutorialTexts.chung.huongDan}
          onClick={() => {
            setTutorialActive(true);
            setTutorialStep(0);
            setDemoMouseGone(false);
            setTutorialMsg(null);
          }}
          className="flex items-center gap-1 rounded-lg border border-amber-500/60 bg-amber-900/60 px-2 py-0.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-800/80 active:scale-95"
          data-testid="btn-open-tutorial"
        >
          <span>💡</span>
          <span className="hidden sm:inline">{tutorialTexts.chung.huongDan}</span>
        </button>
      </header>

      {/* 3. KHU VỰC TRUNG TÂM: sổ ở đỉnh, nhân vật ở hàng gần sổ, 4 làn, nút đập; cột câu hỏi bên phải */}
      <div className="relative flex min-h-0 w-full flex-1 justify-center px-1 py-1 landscape:gap-3 sm:py-2">
        <div className="flex min-h-0 w-full flex-col items-center landscape:max-w-[760px] landscape:flex-1">
          {/* Điện thoại dọc: dải trên (câu hỏi thay chỗ cuốn sổ trong lượt đáp án) */}
          {portrait ? (
            <div className={`flex ${FIELD_W} h-[252px] shrink-0 items-center justify-center`} data-testid="dai-tren">
              {roundOn && panel ? <QuestionPanel data={panel} /> : bookBlock}
            </div>
          ) : (
            bookBlock
          )}

          {/* NHÂN VẬT HỌC SINH NAM: chạy ngang trên hàng này tới làn được đập rồi vung búa */}
          <div className={`relative z-20 -mb-3 flex ${FIELD_W} shrink-0 pointer-events-none`} data-testid="hero-figure">
            <div className="w-6 shrink-0 sm:w-8 md:w-10 lg:w-12" />
            <div className="relative h-20 flex-1 sm:h-24 lg:h-28 [@media(max-height:520px)]:!h-14">
              <div className="absolute bottom-0 h-full -translate-x-1/2" style={heroStyle} data-testid="hero-slot" data-hero-lane={heroLane}>
                <Man5Sprite
                  name={isHitting ? 'hero-hit' : 'hero-idle'}
                  alt={whackUi.nhanVat}
                  dataTestId="hero-img"
                  className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
                  fallback={<span className="text-4xl">🧑‍🎓</span>}
                />
              </div>
            </div>
            <div className="w-6 shrink-0 sm:w-8 md:w-10 lg:w-12" />
          </div>

          {/* KHUNG SÂN 4 LÀN CHÍNH (kẹp bởi 2 thanh viền gỗ) */}
          <div className={`relative flex min-h-0 flex-1 items-stretch justify-center ${FIELD_W}`}>
            <div className="relative z-20 w-6 shrink-0 select-none overflow-hidden sm:w-8 md:w-10 lg:w-12">
              <Man5Sprite name="wood-border" alt="" className="h-full w-full object-cover object-center" fallback={<div className="h-full w-full border-r-2 border-[#8b5a36] bg-[#5a3319]" />} />
            </div>

            <main id="tutorial-man5-lanes" role="application" aria-label={whackUi.khung} className="relative flex h-full flex-1 select-none overflow-hidden" data-testid="man5-lanes">
              {[0, 1, 2, 3].map((lane) => {
                const boss = state.boss && state.phase === 'bossRun' && state.boss.lane === lane ? state.boss : null;
                const hasMouseInZone = state.mice.some((m) => m.lane === lane && inZone(m));
                const flashOn = Date.now() - laneFlashes[lane] < 140;
                const frozen = state.phase === 'answer' || state.phase === 'quiz';

                return (
                  <div
                    key={lane}
                    data-lane={lane}
                    className={`relative h-full flex-1 cursor-pointer overflow-hidden transition-colors ${flashOn ? 'brightness-125' : ''}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      hit(lane);
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 select-none">
                      <Man5Sprite
                        name={LANE_ASSETS[lane]}
                        alt={fmt(whackUi.lanNhan, { so: lane + 1 })}
                        className="h-full w-full object-cover object-center"
                        fallback={<div className={`h-full w-full ${lane === 0 ? 'bg-blue-600' : lane === 1 ? 'bg-amber-500' : lane === 2 ? 'bg-red-600' : 'bg-emerald-600'}`} />}
                      />
                    </div>

                    {/* VÙNG ĐẬP: gần sổ (đỉnh làn) */}
                    <div
                      className={`pointer-events-none absolute left-0 right-0 z-10 transition-all ${
                        hasMouseInZone || (boss && bossInZone(boss)) ? `bg-white/25 ring-2 ring-yellow-300/80 ${reduced ? '' : 'animate-pulse'}` : 'bg-white/10'
                      }`}
                      style={{
                        top: topPct(WHACK_SPEC.zoneEnd),
                        height: `${((WHACK_SPEC.zoneEnd - WHACK_SPEC.zoneStart) / WHACK_SPEC.laneLength) * 100}%`,
                        borderTop: '2px solid rgba(255, 255, 255, 0.6)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.4)',
                      }}
                      data-testid={`vung-dap-${lane}`}
                    >
                      <div className="flex h-full w-full items-start justify-center pt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/50 drop-shadow">{whackUi.nhacVungDap}</span>
                      </div>
                    </div>

                    {/* CHUỘT THƯỜNG (đứng yên và mờ đi trong lượt đáp án) */}
                    {state.mice
                      .filter((m) => m.lane === lane)
                      .map((m) => {
                        const inZ = inZone(m);
                        return (
                          <div
                            key={m.id}
                            className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${inZ ? 'scale-105' : 'scale-95'} ${frozen ? 'opacity-50' : ''} ${
                              m.flash ? `brightness-150 ${reduced ? '' : 'animate-bounce'}` : ''
                            }`}
                            style={{ top: topPct(m.pos), width: m.kind === 'to' ? '92%' : '82%', maxWidth: m.kind === 'to' ? '98px' : '84px', aspectRatio: '1 / 1' }}
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
                              <Man5Sprite
                                name={MOUSE_ASSET_KEYS[m.kind]}
                                alt={KIND_NAMES[m.kind]}
                                className="size-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                                fallback={<span className="text-2xl">{m.kind === 'to' ? '🐀' : '🐁'}</span>}
                              />
                              {m.kind === 'nhanh' && <span className={`absolute -right-1 -top-1 text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${reduced ? '' : 'animate-pulse'}`}>⚡</span>}
                              {m.kind === 'doiLan' && <span className="absolute -right-1 -top-1 rounded-full bg-blue-900/80 px-1 text-[11px] font-black text-cyan-300 drop-shadow">⇄</span>}
                              {m.kind === 'to' && (
                                <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 gap-1 rounded bg-black/70 px-1 py-0.5">
                                  <span className={`size-2 rounded-sm ${m.hits >= 1 ? 'bg-red-500' : 'bg-gray-600'}`} />
                                  <span className={`size-2 rounded-sm ${m.hits >= 2 ? 'bg-red-500' : 'bg-gray-600'}`} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* CHUỘT MẪU của bước làm thử */}
                    {tutorialActive && tutorialStep === 4 && lane === 0 && !demoMouseGone && (
                      <div className="absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2" style={{ top: topPct(DEMO_POS), width: '82%', maxWidth: '84px', aspectRatio: '1 / 1' }} data-testid="chuot-mau">
                        <Man5Sprite name="mouse-normal" alt={whackUi.chuotThuong} className="size-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" fallback={<span className="text-2xl">🐁</span>} />
                      </div>
                    )}

                    {/* CHUỘT CÂU HỎI (vàng ❓): chạy lên rồi đứng chờ giữa vùng đập tới khi em đập trúng */}
                    {boss && (
                      <div
                        className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${bossInZone(boss) ? 'scale-110 ring-4 ring-yellow-400' : 'scale-100'} rounded-full`}
                        style={{ top: topPct(boss.pos), width: '95%', maxWidth: '104px', aspectRatio: '1 / 1' }}
                        data-testid="chuot-cau-hoi"
                        data-in-zone={bossInZone(boss) ? '1' : '0'}
                        role="button"
                        aria-label={whackUi.chuotCauHoi}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          hit(lane);
                        }}
                      >
                        <div className="relative flex size-full items-center justify-center">
                          <Man5Sprite name="mouse-question" alt={whackUi.chuotCauHoi} className="size-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" fallback={<span className="text-3xl">👑</span>} />
                          <span className={`absolute -right-1 -top-2 text-2xl font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${reduced ? '' : 'animate-bounce'}`}>❓</span>
                        </div>
                      </div>
                    )}

                    {/* CHUỘT ĐÁP ÁN A–D (lượt đáp án; chữ do code vẽ) */}
                    {state.answer &&
                      state.phase !== 'ended' &&
                      state.answer.mice
                        .filter((m) => m.lane === lane)
                        .map((m) => (
                          <AnswerMouseView key={`a${m.option}`} option={m.option} top={topPct(m.pos)} inZ={m.pos >= WHACK_SPEC.zoneStart && m.pos <= WHACK_SPEC.zoneEnd} reduced={reduced} />
                        ))}

                    {/* CHUỘT ĐÁP ÁN MẪU của bước làm thử (A–D ở 4 làn) */}
                    {demoOpen && <AnswerMouseView option={lane} top={topPct(DEMO_POS)} inZ reduced={reduced} demo />}

                    {/* ĐỒNG TIỀN XU */}
                    {state.coin && state.coin.lane === lane && (
                      <div
                        className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${reduced ? '' : 'animate-bounce'}`}
                        style={{ top: topPct(state.coin.pos), width: '44px', height: '44px' }}
                        data-testid="dong-tien"
                        role="button"
                        aria-label={whackUi.phanDong}
                        onPointerDown={takeCoin}
                      >
                        <Man5Sprite name="coin" alt={whackUi.tienDong} className="size-full object-contain drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" fallback={<span className="text-2xl">🪙</span>} />
                      </div>
                    )}

                    {/* HIỆU ỨNG ĐIỂM NỔI */}
                    {effects
                      .filter((eff) => eff.lane === lane)
                      .map((eff) => (
                        <div
                          key={eff.id}
                          className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-sm font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                            reduced ? 'animate-out fade-out duration-500' : 'animate-out fade-out slide-out-to-bottom duration-700'
                          }`}
                          style={{ top: topPct(eff.pos), color: eff.kind === 'score' ? '#fde047' : eff.kind === 'coin' ? '#4ade80' : '#f87171' }}
                        >
                          {eff.text}
                        </div>
                      ))}
                  </div>
                );
              })}
            </main>

            <div className="relative z-20 w-6 shrink-0 select-none overflow-hidden sm:w-8 md:w-10 lg:w-12">
              <Man5Sprite name="wood-border" alt="" className="h-full w-full scale-x-[-1] object-cover object-center" fallback={<div className="h-full w-full border-l-2 border-[#8b5a36] bg-[#5a3319]" />} />
            </div>
          </div>

          {/* 5. CÁC NÚT ĐẬP D F J K CHÂN LÀN */}
          <footer id="tutorial-man5-buttons" className={`z-20 mt-1 shrink-0 px-1 sm:mt-2 ${FIELD_W}`}>
            <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
              {[0, 1, 2, 3].map((lane) => (
                <button
                  key={lane}
                  id={lane === 0 ? 'tutorial-man5-btn-0' : undefined}
                  type="button"
                  className={`flex h-11 min-h-[46px] flex-col items-center justify-center rounded-xl border-2 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 active:scale-95 sm:h-12 md:h-14 [@media(max-height:520px)]:!h-9 [@media(max-height:520px)]:!min-h-[38px] ${LANE_BTN_STYLES[lane]}`}
                  data-testid={`nut-dap-${lane}`}
                  aria-label={fmt(whackUi.nutDap, { so: lane + 1 })}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    hit(lane);
                  }}
                >
                  <span className="text-lg font-black drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] sm:text-xl md:text-2xl">{LANE_KEYS[lane]}</span>
                  <span className="hidden text-[9px] font-extrabold uppercase tracking-tighter text-white/80 sm:block sm:text-[10px] [@media(max-height:520px)]:hidden">{fmt(whackUi.lanNhan, { so: lane + 1 })}</span>
                </button>
              ))}
            </div>
          </footer>
        </div>

        {/* Màn ngang: cột câu hỏi bên phải sân (chừa chỗ sẵn nên sân không nhảy khi cột hiện) */}
        {!portrait && (
          <aside className="flex min-h-0 w-[clamp(210px,34vw,380px)] shrink-0 items-start py-1" data-testid="cot-phai">
            {roundOn && panel && <QuestionPanel data={panel} />}
          </aside>
        )}
      </div>

      {/* 6. KẾT QUẢ LƯỢT ĐÁP ÁN: đáp án đúng và lời giải thích; bấm "Chơi tiếp" mới chạy lại ván */}
      {verdict && question && (
        <FeedbackSheet
          isOpen
          isCorrect={verdict.result === 'correct'}
          whatHappened={
            verdict.result === 'correct'
              ? fmt(whackUi.ketQuaDung, { nhan: OPTION_LETTERS[verdict.correct], diem: bossPoints(verdict.secondsLeft) })
              : verdict.result === 'wrong'
                ? fmt(whackUi.ketQuaSai, { nhan: OPTION_LETTERS[verdict.option ?? 0] })
                : fmt(whackUi.ketQuaHet)
          }
          whyHappened={fmt(question.explanation)}
          howToFix={verdict.result === 'correct' ? undefined : fmt(whackUi.dapAnDung, { dapAn: `${OPTION_LETTERS[verdict.correct]}. ${fmt(question.options[verdict.correct])}` })}
          onContinue={continueBoss}
          continueLabel={whackUi.tiepTuc}
        />
      )}

      {/* 7. HẾT VÁN (THẮNG HOẶC ĐẦY MỰC) */}
      {ending && (
        <div data-whack-ui role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" data-testid="het-van" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border-4 border-nau-go bg-[#2a170e] p-5 text-center shadow-2xl">
            <span className="text-4xl">{ending === 'ink' ? '📜' : '🏆'}</span>
            <p className="font-display text-lg font-extrabold text-amber-200">{ending === 'ink' ? fmt(whackUi.hetMuc) : fmt(whackUi.xongTrum)}</p>
            <Button size="md" className="min-h-11 w-full" autoFocus data-testid="nut-ket-qua" onClick={finish}>
              {whackUi.xemKetQua}
            </Button>
          </div>
        </div>
      )}

      {/* 8. HƯỚNG DẪN FOCUS VÀ LÀM THỬ (P8) */}
      <TutorialSpotlight
        isOpen={tutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => {
          setTutorialMsg(null);
          if (tutorialStep < tutorialSteps.length - 1) setTutorialStep((prev) => prev + 1);
          else setTutorialActive(false);
        }}
        onPrev={() => {
          setTutorialMsg(null);
          if (tutorialStep > 0) setTutorialStep((prev) => prev - 1);
        }}
        onSkip={() => setTutorialActive(false)}
        feedbackMessage={tutorialMsg?.text}
        feedbackType={tutorialMsg?.type}
        actionButton={tutorialStep === tutorialSteps.length - 1 ? { label: tutorialTexts.chung.batDauChoi, onClick: () => setTutorialActive(false), variant: 'primary' } : undefined}
      >
        {tutorialActive && tutorialStep === 4 && (
          <div className="pointer-events-auto fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center">
            <Button variant="primary" size="lg" onClick={doPracticeHit} className="animate-bounce shadow-xl">
              <span>🔨</span>
              <span>{tutorialTexts.man5.dapThu}</span>
            </Button>
          </div>
        )}
        {tutorialActive && tutorialStep === 5 && (
          <div className="pointer-events-auto fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-2">
            {OPTION_LETTERS.map((letter, lane) => (
              <Button key={letter} variant="primary" size="md" onClick={() => doPracticeAnswer(lane)} data-testid={`dap-mau-${lane}`}>
                <span>🔨</span>
                <span>{fmt(tutorialTexts.man5.nutDapAn, { nhan: letter, phim: LANE_KEYS[lane] })}</span>
              </Button>
            ))}
          </div>
        )}
      </TutorialSpotlight>
    </div>
  );
}

/** Một chuột vàng mang nhãn đáp án (ảnh mouse-question, chữ A–D do code vẽ). Đập chuột này là chọn đáp án đó. */
function AnswerMouseView({ option, top, inZ, reduced, demo = false }: { option: number; top: string; inZ: boolean; reduced: boolean; demo?: boolean }) {
  const letter = OPTION_LETTERS[option];
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform ${inZ ? 'scale-110 ring-4 ring-yellow-300' : 'scale-100'}`}
      style={{ top, width: '92%', maxWidth: '100px', aspectRatio: '1 / 1' }}
      data-testid={demo ? 'chuot-dap-an-mau' : 'chuot-dap-an'}
      data-option={option}
      data-in-zone={inZ ? '1' : '0'}
      role="img"
      aria-label={fmt(whackUi.nhanDapAn, { nhan: letter })}
    >
      <div className="relative flex size-full items-center justify-center">
        <Man5Sprite name="mouse-question" alt="" className="size-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" fallback={<span className="text-3xl">👑</span>} />
        <span
          className={`absolute left-1/2 top-[58%] flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#2b1810] bg-amber-300 text-base font-black text-[#2b1810] sm:size-8 sm:text-lg ${reduced ? '' : 'animate-pulse'}`}
        >
          {letter}
        </span>
      </div>
    </div>
  );
}
