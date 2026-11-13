import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BiAvatar, Button, Hearts, climbUi, fmt, hasSeenGameTip, sound, TutorialSpotlight, type TutorialStep, tutorialTexts, useGameHint, useProgress, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { demoProbe } from '@so-chung/core/demo/probe';
import { Scene25D, isQualityChoice, type ClipName, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { drawRoundLabels, useClimbTextures, type ClimbLabels } from './climbArt';
import { CLIMB_SPEC } from './climbConfig';
import { pxPerUnit, type ClimbFrame } from './climbLayout';
import { advanceRound, choiceX, climbScore, createClimbGame, createPracticeGame, isLeftChild, jump, nodeValue, setMove, setSlow, siblingValue, tickClimb, tierY, type ClimbEvent, type ClimbState } from './climbLogic';
import { hintFor } from './climbHint';
import { ClimbStage, newAnim, type ClimbAnim } from './ClimbStage';

/** Số màn của game này (để lưu cờ "đã nghe Bi giới thiệu"). */
const LEVEL_ID = 12;
/** Bắt được {phanDien}: chờ chừng này (ms) cho lá giả rơi rồi mới hiện bảng hết vòng. Tự chọn. */
const CAUGHT_DELAY_MS = 1100;
/** Cạnh nhỏ nhất (px) của nút cảm ứng ở đáy: lời giao ≥ 48. */
const TOUCH_BTN = 60;
/** Bảng xong vòng / hết tim: khung dọc nằm giữa trên; khung ngang nằm bên phải để cây, biển "Gốc trong sổ" và lá giả vẫn thấy. */
const bannerClass = {
  portrait: 'absolute inset-x-4 top-[26%] z-20 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center',
  landscape: 'absolute right-4 top-1/2 z-20 flex w-[34%] max-w-sm -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border-[3px] border-nau-go bg-giay p-3 text-center',
} as const;

/** Hạt giống của ván: khác nhau mỗi lần (ngẫu nhiên chỉ ở đây; luật trong `climbLogic` tất định theo hạt giống). */
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Đo bề rộng (điểm ảnh) của phần tử (callback ref: lớp phủ của Scene25D gắn vào sau khi cảnh đo khung). */
function useWidth(): [(el: HTMLDivElement | null) => void, number] {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

/** Có hiện nút cảm ứng ở đáy không: màn hình chạm (con trỏ thô) hoặc cửa sổ hẹp như điện thoại. */
function useTouchUi(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const qs = [window.matchMedia('(pointer: coarse)'), window.matchMedia('(max-width: 900px)')];
    const update = () => setTouch(qs.some((q) => q.matches));
    update();
    qs.forEach((q) => q.addEventListener('change', update));
    return () => qs.forEach((q) => q.removeEventListener('change', update));
  }, []);
  return touch;
}

/** Số trên bậc vẽ bằng canvas: chờ phông chữ nạp xong rồi vẽ lại khi đổi vòng, đổi cỡ khung (mỗi 4 px CSS mỗi đơn vị) hay bật "Chữ to". */
function useLabels(state: ClimbState, version: number, ppu: number, largeText: boolean, plank: CanvasImageSource | null, crackedPlank: CanvasImageSource | null): ClimbLabels | null {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    void fonts
      .load(`800 24px "Baloo 2"`, `0123456789 ${climbUi.gocTrongSo}`)
      .catch(() => undefined)
      .then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const bucket = Math.floor(ppu / 4) * 4;
  const out = useMemo(
    () => (fontsReady && bucket > 0 ? drawRoundLabels(state.tree, state.tiers, bucket, largeText, plank, crackedPlank) : null),
    [fontsReady, bucket, largeText, state, version, plank, crackedPlank], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(
    () => () => {
      out?.steps.forEach((t) => t.dispose());
      out?.cracked.forEach((t) => t.dispose());
      out?.sign.dispose();
    },
    [out],
  );
  return out;
}

type Banner = { kind: 'round'; depth: number; last: boolean; rootNow: number; rootBook: number } | { kind: 'lost' } | null;
type Say = { text: string; n: number; tone: 'xau' | 'tin' } | null;
type Clips = { student: ClipName; sn: number; villain: ClipName; vn: number; fall: number };

/**
 * Màn 12 "Leo bậc gỗ" (spec 08): Scene25D khung dọc (khung ngang thì cây ở giữa, hai bên là trời), camera đi theo tầng em đứng; học sinh và {phanDien} là model 3D.
 * Luật nằm hết ở `climbLogic`; ở đây chỉ nối thao tác (phím, nút cảm ứng), hoạt cảnh, âm thanh vào luật. Hướng dẫn làm thử chạy trên một ván riêng (cây mẫu 4 lá), không đụng ván thật.
 */
export function ClimbGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const { progress, markGameTipSeen } = useProgress();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const real = useMemo<ClimbState>(() => createClimbGame(newSeed(), reduced), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [practiceKey, resetPractice] = useReducer((n: number) => n + 1, 0);
  const practice = useMemo<ClimbState>(() => createPracticeGame(), [attempt, practiceKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tutorialActive, setTutorialActive] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isReviewingTutorial, setIsReviewingTutorial] = useState(false);
  const state = tutorialActive ? practice : real;
  const stateRef = useRef(state);
  stateRef.current = state;
  const tutorialStepRef = useRef(0);
  tutorialStepRef.current = tutorialStep;
  const realAnim = useMemo<ClimbAnim>(() => newAnim(), [real]);
  const practiceAnim = useMemo<ClimbAnim>(() => newAnim(), [practice]);
  const anim = tutorialActive ? practiceAnim : realAnim;
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const autopilot = useRef<((s: ClimbState) => void) | null>(null);
  const [frame, setFrame] = useState<ClimbFrame>('portrait');
  const [overlayRef, framePx] = useWidth();
  const [banner, setBanner] = useState<Banner>(null);
  const [say, setSay] = useState<Say>(null);
  const [tip, setTip] = useState(() => !hasSeenGameTip(progress.game.data, LEVEL_ID));
  const [warm, setWarm] = useState(false);
  const [clips, setClips] = useState<Clips>({ student: 'idle', sn: 0, villain: 'idle', vn: 0, fall: 0 });
  const touchUi = useTouchUi();
  const finished = useRef(false);
  const held = useRef({ left: false, right: false, btnLeft: false, btnRight: false });
  const clipRef = useRef<ClipName>('idle');
  const practiceStart = useRef(0);

  const textures = useClimbTextures();
  const ppu = framePx > 0 ? pxPerUnit(frame, framePx) : 0;
  const plank = (textures.step?.image as CanvasImageSource | undefined) ?? null;
  const crackedPlank = (textures.stepCrack?.image as CanvasImageSource | undefined) ?? null;
  const labels = useLabels(state, version, ppu, settings.largeText, plank, crackedPlank);
  const ready = warm && textures.done && !!labels;

  // "Giảm chuyển động" đổi giữa ván: bậc trượt chậm lại một nửa
  useEffect(() => {
    setSlow(real, reduced);
  }, [real, reduced]);

  // Ván mới
  useEffect(() => {
    finished.current = false;
    setBanner(null);
    setSay(null);
    setClips((c) => ({ ...c, student: 'idle', sn: c.sn + 1, villain: 'idle', vn: c.vn + 1 }));
    clipRef.current = 'idle';
  }, [real]);

  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), 1600);
    return () => clearTimeout(t);
  }, [say]);

  // Nạp trước clip chạy, nhảy (học sinh), cười và giật mình ({phanDien}) lúc màn hình tải còn che cảnh
  const warmUp = useCallback(() => {
    setClips((c) => ({ ...c, student: 'run', sn: c.sn + 1, villain: 'cheer', vn: c.vn + 1 }));
    setTimeout(() => setClips((c) => ({ ...c, student: 'jump', sn: c.sn + 1, villain: 'jump', vn: c.vn + 1 })), 400);
    setTimeout(() => setClips((c) => ({ ...c, student: 'idle', sn: c.sn + 1, villain: 'idle', vn: c.vn + 1 })), 800);
    setTimeout(() => setWarm(true), 1100);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const P = CLIMB_SPEC.points;
    const parts: ScorePart[] = [
      { label: fmt(climbUi.phanVong, { diem: P.perRound }), count: real.roundsDone, points: real.roundsDone * P.perRound },
      { label: fmt(climbUi.phanTim, { diem: P.perHeart }), count: real.hearts, points: real.hearts * P.perHeart },
    ];
    onFinish(climbScore(real), parts);
  }, [onFinish, real]);

  const handleEvents = useCallback(
    (events: readonly ClimbEvent[]) => {
      const s = stateRef.current;
      const a = s === practice ? practiceAnim : realAnim;
      const now = performance.now();
      for (const e of events) {
        if (e.kind === 'up') {
          a.tween = { fromX: e.fromX, fromY: tierY(e.level), start: now, dur: 160 };
          sound.playPickup(true);
        } else if (e.kind === 'wrong') {
          sound.playWrong();
          setSay((v) => ({ text: climbUi.nguCut, tone: 'xau', n: (v?.n ?? 0) + 1 }));
          setClips((c) => ({ ...c, villain: 'cheer', vn: c.vn + 1 }));
        } else if (e.kind === 'vanish') {
          setClips((c) => ({ ...c, fall: c.fall + 1 }));
        } else if (e.kind === 'miss') {
          sound.playClick();
          setSay((v) => ({ text: climbUi.truot, tone: 'tin', n: (v?.n ?? 0) + 1 }));
        } else if (e.kind === 'fell') {
          a.tween = { fromX: e.fromX, fromY: tierY(s.level) - CLIMB_SPEC.fallRescue, start: now, dur: 240 };
          sound.playClick();
          setSay((v) => ({ text: climbUi.truot, tone: 'tin', n: (v?.n ?? 0) + 1 }));
        } else if (e.kind === 'roundDone') {
          a.leafStart = now;
          setClips((c) => ({ ...c, villain: 'jump', vn: c.vn + 1 }));
          if (!s.practice) {
            sound.playLevelComplete();
            const last = s.phase === 'won';
            setTimeout(() => setBanner({ kind: 'round', depth: s.tree.depth, last, rootNow: e.rootNow, rootBook: e.rootBook }), CAUGHT_DELAY_MS);
          }
        } else if (e.kind === 'lost') {
          setTimeout(() => setBanner({ kind: 'lost' }), 700);
        }
      }
      bump();
    },
    [practice, practiceAnim, realAnim],
  );

  const holdLoop = paused || !ready || (tip && !tutorialActive) || banner !== null;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Nút "?": câu nhắc theo trạng thái ván (không lộ đáp án)
  useGameHint(setHint, 12, () => hintFor(real));

  // Vòng lặp thời gian (requestAnimationFrame, không dùng useFrame nên không đụng cảnh 3D): bậc trượt, nhảy, rơi theo đồng hồ của logic
  useEffect(() => {
    if (holdLoop) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      if (s.phase !== 'playing') return;
      const h = held.current;
      const locked = s.practice && tutorialStepRef.current < 3;
      const dir = locked ? 0 : (h.left || h.btnLeft ? -1 : 0) + (h.right || h.btnRight ? 1 : 0);
      setMove(s, dir as -1 | 0 | 1);
      if (!s.practice) autopilot.current?.(s);
      const events = tickClimb(s, dt, pausedRef.current);
      if (events.length > 0) handleEvents(events);
      // clip theo trạng thái: đi bộ chạy, bay thì nhảy, còn lại đứng
      const p = s.player;
      const want: ClipName = s.mode !== 'free' ? 'idle' : !p.grounded ? 'jump' : p.move !== 0 ? 'run' : 'idle';
      if (want !== clipRef.current) {
        clipRef.current = want;
        setClips((c) => ({ ...c, student: want, sn: c.sn + 1 }));
      }
      // bước tập đi của hướng dẫn: đã đi sang một bên
      if (s.practice) {
        if (Math.abs(p.x - practiceStart.current) > 0.7) setTutorialStep((n) => (n === 3 ? 4 : n));
        if (s.level >= 1) setTutorialStep((n) => (n === 4 ? 5 : n));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holdLoop, handleEvents]);

  const tryJump = useCallback(() => {
    if (holdLoop) return;
    const s = stateRef.current;
    if (s.phase !== 'playing' || (s.practice && tutorialStepRef.current < 3)) return;
    if (!jump(s)) return;
    sound.playWhoosh();
    clipRef.current = 'jump';
    setClips((c) => ({ ...c, student: 'jump', sn: c.sn + 1 }));
  }, [holdLoop]);

  // Bàn phím: ← → hoặc A D để đi (giữ để lái trên không), Space, ↑ hoặc W để nhảy
  useEffect(() => {
    const clear = () => {
      held.current.left = false;
      held.current.right = false;
    };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'ArrowLeft' || k === 'a') {
        held.current.left = down;
        e.preventDefault();
      } else if (k === 'ArrowRight' || k === 'd') {
        held.current.right = down;
        e.preventDefault();
      } else if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w') {
        if (t && t.tagName === 'BUTTON' && k === ' ') return;
        e.preventDefault();
        if (down && !e.repeat) tryJump();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
      clear();
    };
  }, [tryJump]);

  const nextRound = useCallback(() => {
    if (!advanceRound(real)) return;
    realAnim.leafStart = 0;
    realAnim.tween.dur = 0;
    setBanner(null);
    setClips((c) => ({ ...c, student: 'idle', sn: c.sn + 1, villain: 'idle', vn: c.vn + 1 }));
    clipRef.current = 'idle';
    bump();
  }, [real, realAnim]);

  const closeTip = useCallback(() => {
    setTip(false);
    markGameTipSeen(LEVEL_ID);
  }, [markGameTipSeen]);

  const openTutorial = useCallback(() => {
    resetPractice();
    practiceStart.current = 0;
    setIsReviewingTutorial(true);
    setTutorialStep(0);
    setTutorialActive(true);
    bump();
  }, []);

  const handleCloseTutorial = useCallback(() => {
    setTutorialActive(false);
    setIsReviewingTutorial(false);
    setBanner(null);
    setSay(null);
    held.current.left = false;
    held.current.right = false;
    held.current.btnLeft = false;
    held.current.btnRight = false;
    bump();
  }, []);

  // Bước tập đi: nhớ chỗ đứng lúc bắt đầu
  useEffect(() => {
    if (tutorialActive && tutorialStep === 3) practiceStart.current = practice.player.x;
  }, [tutorialActive, tutorialStep, practice]);

  const tutorialSteps = useMemo<TutorialStep[]>(
    () => [
      { id: 'intro', title: fmt(tutorialTexts.man12.tieuDe), content: fmt(tutorialTexts.man12.intro), nextLabel: tutorialTexts.chung.tiep },
      { id: 'tree', title: fmt(tutorialTexts.man12.tieuDe), content: fmt(tutorialTexts.man12.tree), targetSelector: '#tutorial-man12-tree', nextLabel: tutorialTexts.chung.tiep },
      { id: 'hud', title: fmt(tutorialTexts.man12.tieuDe), content: fmt(tutorialTexts.man12.hud), targetSelector: '#tutorial-man12-hud', nextLabel: tutorialTexts.chung.tiep },
      { id: 'di', title: fmt(tutorialTexts.man12.tieuDe), content: fmt(tutorialTexts.man12.di), targetSelector: '#tutorial-man12-play', interactive: true, hideNextButton: true },
      { id: 'practice', title: fmt(tutorialTexts.man12.tieuDe), content: fmt(tutorialTexts.man12.practice), targetSelector: '#tutorial-man12-play', interactive: true, hideNextButton: true },
      {
        id: 'done',
        title: fmt(tutorialTexts.man12.tieuDe),
        content: fmt(tutorialTexts.man12.correct),
        targetSelector: '#tutorial-man12-tree',
        nextLabel: isReviewingTutorial ? tutorialTexts.chung.troLaiBaiLam : tutorialTexts.chung.batDauChoi,
      },
    ],
    [isReviewingTutorial],
  );

  const onModeChange = useCallback((m: FrameMode) => setFrame(m === 'landscape' ? 'landscape' : 'portrait'), []);

  // Bot demo (chỉ bản build VITE_DEMO): ván thật, hướng dẫn, bộ lái (tải khi cần)
  demoProbe('man12', {
    state: real,
    tutorialActive,
    ready,
    tip,
    banner: banner !== null,
    setAutopilot: (fn: ((s: ClimbState) => void) | null) => {
      autopilot.current = fn;
    },
    makePilot: async () => (await import('./climbBots')).makeDemoClimbPilot(),
  });
  if (PROBE && typeof window !== 'undefined') Object.assign(window, { __climbChoiceX: (i: number) => { const s = stateRef.current; const c = s.choices[i]; return c ? choiceX(s, c) : null; }, __climb: state, __climbReal: real, __climbUi: { ppu, fontPx: labels?.fontPx ?? 0, frame, banner, tip, ready, tutorialActive } });

  // Nhãn cho trình đọc màn hình: bậc em đang đứng và bậc anh em (đổi khi lên tầng, không đổi theo khung hình)
  const stand =
    state.level < state.tree.depth
      ? fmt(climbUi.docTang, {
          so: nodeValue(state.tree, state.level),
          nhan: isLeftChild(state.tree, state.level) ? climbUi.phai : climbUi.trai,
          so2: siblingValue(state.tree, state.level),
        })
      : fmt(climbUi.gocEmTinh, { so: nodeValue(state.tree, state.level), so2: state.tree.book[state.tree.depth][0] });
  const portrait = frame === 'portrait';
  const textSize = portrait ? 'max(3.6cqw, 0.875rem)' : 'max(1.6cqw, 0.875rem)';
  const showTouch = touchUi && !banner && (!tip || tutorialActive);

  const holdBtn = (key: 'btnLeft' | 'btnRight') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      held.current[key] = true;
    },
    onPointerUp: () => {
      held.current[key] = false;
    },
    onPointerCancel: () => {
      held.current[key] = false;
    },
    onLostPointerCapture: () => {
      held.current[key] = false;
    },
  });

  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man12">
      <Scene25D
        background={null}
        quality={forced}
        allowPortrait
        hold={!ready}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div
            ref={overlayRef}
            className="absolute inset-0 touch-none select-none"
            style={{ containerType: 'size', fontSize: textSize }}
            role="application"
            aria-label={climbUi.khung}
            data-testid="man12-khung"
            data-phase={state.phase}
            data-round={state.round}
            data-level={state.level}
            data-practice={state.practice ? '1' : '0'}
          >
            {/* Nút mở lại hướng dẫn */}
            <Button
              id="tutorial-man12-guide-btn"
              variant="secondary"
              size="sm"
              className="pointer-events-auto absolute top-14 right-2 z-20 min-h-9 px-2 text-xs font-bold bg-giay/90 border border-nau-go/40"
              onClick={openTutorial}
              title={tutorialTexts.chung.huongDan}
            >
              💡 {tutorialTexts.chung.huongDan}
            </Button>
            <div id="tutorial-man12-hud" className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between gap-2 pr-14" data-testid="hud">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-nau-go bg-giay px-3 py-1 font-display font-extrabold">
                <span data-testid="vong">{fmt(climbUi.vong, { so: state.round + 1, max: CLIMB_SPEC.rounds.length })}</span>
                <Hearts current={state.hearts} max={CLIMB_SPEC.hearts} size="sm" />
              </div>
            </div>
            {/* Vùng thân cây: chỗ em đứng và các bậc lựa chọn (đích của hướng dẫn) */}
            <div id="tutorial-man12-tree" className="pointer-events-none absolute inset-x-6 top-[14%] bottom-[24%]" />
            <div id="tutorial-man12-play" className="pointer-events-none absolute inset-x-0 top-[12%] bottom-0" />
            <p className="sr-only" aria-live="polite">
              {stand}
            </p>
            {say && (
              <p
                key={say.n}
                role="status"
                className={`pointer-events-none absolute inset-x-0 top-[10%] mx-auto w-fit rounded-2xl border-[3px] bg-giay px-4 py-1 font-display font-extrabold ${say.tone === 'xau' ? 'border-do-son text-do-son-dam' : 'border-muc-tim text-muc-tim-dam'}`}
                data-testid="loi"
              >
                {say.text}
              </p>
            )}
            {showTouch && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-3" data-testid="man12-nut-cham">
                <div className="pointer-events-auto flex gap-3">
                  <button type="button" aria-label={climbUi.nutTrai} data-testid="man12-nut-trai" className="touch-none select-none rounded-2xl border-[3px] border-nau-go bg-giay font-display text-2xl font-extrabold active:bg-vang" style={{ width: TOUCH_BTN, height: TOUCH_BTN }} {...holdBtn('btnLeft')}>
                    ◀
                  </button>
                  <button type="button" aria-label={climbUi.nutPhai} data-testid="man12-nut-phai" className="touch-none select-none rounded-2xl border-[3px] border-nau-go bg-giay font-display text-2xl font-extrabold active:bg-vang" style={{ width: TOUCH_BTN, height: TOUCH_BTN }} {...holdBtn('btnRight')}>
                    ▶
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="man12-nut-nhay"
                  className="pointer-events-auto touch-none select-none rounded-2xl border-[3px] border-nau-go bg-vang px-5 font-display text-lg font-extrabold active:bg-vang-dam"
                  style={{ minWidth: TOUCH_BTN + 24, height: TOUCH_BTN }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    tryJump();
                  }}
                >
                  {climbUi.nutNhay}
                </button>
              </div>
            )}
            {tip && !tutorialActive && ready && (
              <div role="dialog" aria-label={climbUi.biGocCay} className="absolute inset-x-4 top-[30%] z-20 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="bi-goc-cay">
                <BiAvatar size={64} />
                <p className="font-display font-bold">{climbUi.biGocCay}</p>
                <Button size="md" className="min-h-11" onClick={closeTip} autoFocus>
                  {climbUi.hieuRoi}
                </Button>
              </div>
            )}
            {banner && (
              <div role="status" className={portrait ? bannerClass.portrait : bannerClass.landscape} data-testid="banner">
                {banner.kind === 'round' ? (
                  <>
                    <p className="font-display text-lg font-extrabold">{fmt(climbUi.batDuoc)}</p>
                    <p className="font-display font-bold">{fmt(climbUi.gocEmTinh, { so: banner.rootNow, so2: banner.rootBook })}</p>
                    <p className="font-display font-bold">{fmt(climbUi.vongXong, { so: banner.depth, so2: 2 ** banner.depth })}</p>
                  </>
                ) : (
                  <>
                    <BiAvatar size={64} />
                    <p className="font-display text-lg font-extrabold">{climbUi.biGiup}</p>
                  </>
                )}
                <Button size="md" className="min-h-11" data-testid="nut-tiep" autoFocus onClick={banner.kind === 'round' && !banner.last ? nextRound : finish}>
                  {banner.kind === 'round' && !banner.last ? climbUi.vongTiep : climbUi.xemKetQua}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <ClimbStage
          state={state}
          anim={anim}
          frame={frame}
          textures={textures}
          labels={labels}
          version={version}
          reduced={reduced}
          studentClip={clips.student}
          studentTrigger={clips.sn}
          fallTrigger={clips.fall}
          villainClip={clips.villain}
          villainTrigger={clips.vn}
        />
      </Scene25D>
      <TutorialSpotlight
        isOpen={tutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => {
          if (tutorialStep < tutorialSteps.length - 1) setTutorialStep((n) => n + 1);
          else handleCloseTutorial();
        }}
        onPrev={() => setTutorialStep((n) => Math.max(0, n - 1))}
        onSkip={handleCloseTutorial}
      />
    </div>
  );
}
