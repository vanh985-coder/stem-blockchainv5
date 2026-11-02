import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Button,
  CHARACTERS,
  PortraitFrame,
  TutorialSpotlight,
  bubbleUi,
  fmt,
  plainPower,
  rich,
  sound,
  tutorialTexts,
  useGameHint,
  useSettings,
  type MiniGameRenderProps,
  type ScorePart,
  type TutorialStep,
} from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { SpriteCache, useBubbleImages } from './bubbleArt';
import { slotOf, slotsOfPlan } from './bubbleSlots';
import { createView, drawBubble, refreshAim, resetView, spawnFx, stepView, type BubbleView } from './bubbleCanvas';
import { BUBBLE_SPEC, type BubbleSpec } from './bubbleConfig';
import { hintFor } from './bubbleHint';
import { AIM_STEP, AIM_STEP_FINE, angleFromPoint, fitField, modeFor, type BubbleMode, type Fit } from './bubbleLayout';
import {
  anchoredSet,
  bubbleScore,
  canShoot,
  cellCenter,
  clampAngle,
  createBubbleGame,
  eggCount,
  groupAt,
  land,
  launcherPoint,
  loadComplete,
  neighbors,
  pickTrayEgg,
  planOf,
  presentValues,
  selectType,
  shoot,
  shotsToDescend,
  snapCell,
  startRound,
  tracePath,
  type BubbleEvent,
  type BubbleState,
  type EndReason,
} from './bubbleLogic';
import { BubbleLoad } from './BubbleLoad';
import { EggIcon } from './EggIcon';
import { ModCalculator } from '../ui/ModCalculator';

const LEVEL_ID = 9;
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;
/** Giây (đồng hồ hoạt cảnh) từ lúc hết ván tới lúc hiện bảng kết thúc, và thời gian lời nói ngắn hiện trên bàn */
const END_DELAY = 0.9;
const MSG_MS = 1800;

/** Bàn mẫu nhỏ của bước làm thử (dữ liệu riêng, không cộng điểm hay tiến độ): một khóa, hai hàng trứng cùng số, không hạ bàn */
const PRACTICE_SPEC: BubbleSpec = { ...BUBBLE_SPEC, rounds: [{ keys: 1, rows: 2, descendEvery: 99 }] };
const PRACTICE_SEED = 7;

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 22" className="size-6" aria-hidden="true" data-on={on ? '1' : '0'}>
      <path d="M12 21 C-6 9 3 -2 12 5 C21 -2 30 9 12 21 Z" fill={on ? '#d8452f' : 'none'} stroke="#4a2c12" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function useWindowMode(): BubbleMode {
  const [mode, setMode] = useState<BubbleMode>(() => (typeof window === 'undefined' ? 'wide' : modeFor(window.innerWidth, window.innerHeight)));
  useEffect(() => {
    const on = () => setMode(modeFor(window.innerWidth, window.innerHeight));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return mode;
}

/**
 * Màn 9 "Bắn trứng khắc dấu" (spec 07): bàn trứng lưới lục giác vẽ bằng canvas 2D, máy bắn ở đáy giữa, khay chọn loại trứng cạnh máy bắn. Luật nằm hết ở `bubbleLogic`;
 * ở đây chỉ nối thao tác (rê chuột và bấm, kéo rồi thả tay, phím mũi tên, Space hay Enter, phím 1 đến 5), hoạt cảnh và âm thanh vào luật.
 * Vòng requestAnimationFrame vẽ canvas mỗi khung; tạm dừng (nút "?", tab ẩn) thì trứng bay và hiệu ứng đứng yên. Bước làm thử (P8) dùng bàn mẫu riêng (`PRACTICE_SPEC`).
 */
export function BubbleGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const mode = useWindowMode();
  const images = useBubbleImages();
  const game = useMemo(() => createBubbleGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hướng dẫn focus và làm thử (P8)
  const [tutorialActive, setTutorialActive] = useState(attempt <= 1);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [practiceKey, setPracticeKey] = useState(0);
  const practice = useMemo(() => createBubbleGame(PRACTICE_SEED, PRACTICE_SPEC), [practiceKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const state = tutorialActive ? practice : game;
  const stateRef = useRef(state);
  stateRef.current = state;

  const view = useRef<BubbleView | null>(null);
  if (view.current === null) view.current = createView(reduced);
  view.current.reduced = reduced;
  const sprites = useRef<SpriteCache | null>(null);
  if (sprites.current === null) sprites.current = new SpriteCache();
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const wrapEl = useRef<HTMLDivElement | null>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const geo = useRef<{ el: HTMLCanvasElement | null; cw: number; ch: number; dpr: number; fit: Fit }>({ el: null, cw: 0, ch: 0, dpr: 1, fit: { scale: 1, ox: 0, oy: 0, w: 1, h: 1 } });
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const down = useRef(false);
  const finished = useRef(false);
  const pendingEnd = useRef<{ reason: EndReason; at: number } | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const [ending, setEnding] = useState<EndReason | null>(null);
  const [live, setLive] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);

  const holdLoop = paused;
  const holdRef = useRef(holdLoop);
  holdRef.current = holdLoop;
  useGameHint(setHint, LEVEL_ID, () => hintFor(stateRef.current));

  const say = useCallback((text: string) => {
    setMsg(text);
    setLive(plainPower(text));
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), MSG_MS);
  }, []);
  useEffect(
    () => () => {
      if (msgTimer.current) clearTimeout(msgTimer.current);
    },
    [],
  );

  // Đổi bàn (ván mới, vào hay ra bước làm thử): dọn hiệu ứng, ngắm lại
  useEffect(() => {
    finished.current = false;
    pendingEnd.current = null;
    setEnding(null);
    setMsg(null);
    setNudge(false);
    const v = view.current;
    if (!v) return;
    resetView(v);
    v.aim = 90;
    refreshAim(v, state);
    bump();
  }, [state]);

  // Cầu nối đo kiểm (chỉ khi chạy dev hay build có VITE_PROBE)
  useEffect(() => {
    if (!PROBE) return;
    const w = window as unknown as Record<string, unknown>;
    w.__bubble = state;
    w.__bubbleView = view.current;
    Object.defineProperty(w, '__bubbleUi', { configurable: true, get: () => ({ fit: geo.current.fit, tutorialActive }) });
    w.__bubbleApi = { tracePath, snapCell, groupAt, anchoredSet, neighbors, cellCenter, launcherPoint, planOf, presentValues };
    return () => {
      delete w.__bubble;
      delete w.__bubbleView;
      delete w.__bubbleUi;
      delete w.__bubbleApi;
    };
  }, [state, tutorialActive]);

  // ----- canvas: cỡ theo khung chứa, vẽ mỗi khung hình
  useEffect(() => {
    const wrap = wrapEl.current;
    const canvas = canvasEl.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
      const cw = Math.max(1, Math.round(rect.width));
      const ch = Math.max(1, Math.round(rect.height));
      const g = geo.current;
      // Cùng cỡ vẫn phải đặt lại khi canvas là phần tử MỚI (bàn bị gỡ ở bước nạp rồi dựng lại): canvas mới mặc định 300×150, không được bỏ qua
      if (g.el === canvas && g.cw === cw && g.ch === ch && g.dpr === dpr) return;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      g.el = canvas;
      g.cw = cw;
      g.ch = ch;
      g.dpr = dpr;
      g.fit = fitField(cw, ch);
      sprites.current?.clear();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);
    window.addEventListener('resize', resize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [mode, state.phase, tutorialActive]);

  const handleEvents = useCallback(
    (s: BubbleState, ev: readonly BubbleEvent[]) => {
      const v = view.current;
      if (!v) return;
      spawnFx(v, s, ev);
      let pops = 0;
      let drops = 0;
      for (const e of ev) {
        if (e.type === 'pop') pops += e.cells.length - 1;
        else if (e.type === 'drop') drops += e.cells.length;
        else if (e.type === 'heart') {
          sound.playHit();
          say(bubbleUi.timMat);
        } else if (e.type === 'descend') say(bubbleUi.haBanLoi);
        else if (e.type === 'roundClear') {
          sound.playCorrect({ answer: null });
          say(bubbleUi.dotXong);
        } else if (e.type === 'end') {
          if (s === game) pendingEnd.current = { reason: e.reason, at: v.time + END_DELAY };
        }
      }
      if (pops > 0) {
        sound.playPickup(drops > 0);
        if (!ev.some((e) => e.type === 'heart' || e.type === 'descend' || e.type === 'roundClear')) say(drops > 0 ? fmt(bubbleUi.trungRoi, { so: drops }) : fmt(bubbleUi.trungVo, { so: pops }));
      }
      refreshAim(v, s);
      if (s === practice) setTutorialStep((n) => (n === 4 ? 5 : n));
      bump();
    },
    [game, practice, say],
  );

  useEffect(() => {
    const canvas = canvasEl.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const cache = sprites.current as SpriteCache;
    const v = view.current as BubbleView;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      if (!holdRef.current) {
        stepView(v, s, dt);
        if (s.flying && v.flyDist >= s.flying.length) {
          handleEvents(s, land(s));
          v.flyDist = 0;
        }
        const pe = pendingEnd.current;
        if (pe && v.time >= pe.at && s.phase === 'ended') {
          pendingEnd.current = null;
          if (pe.reason === 'win') sound.playLevelComplete();
          setEnding(pe.reason);
        }
      }
      const geom = geo.current;
      if (document.visibilityState === 'hidden' || geom.cw < 2) return;
      drawBubble({ g, cw: geom.cw, ch: geom.ch, dpr: geom.dpr, fit: geom.fit, art: imagesRef.current, sprites: cache, slots: slotsOfPlan(planOf(s)) }, s, v);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cache.clear();
    };
  }, [handleEvents, mode, state.phase === 'load' ? 'load' : 'play', tutorialActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- điều khiển
  const showNudge = useCallback(() => {
    setNudge(true);
    say(bubbleUi.chonTruoc);
    setTimeout(() => setNudge(false), 2600);
  }, [say]);

  const fire = useCallback(() => {
    if (holdRef.current) return;
    const s = stateRef.current;
    const v = view.current;
    if (!v || s.phase !== 'play' || s.flying) return;
    if (!canShoot(s)) {
      showNudge();
      return;
    }
    if (shoot(s, v.aim)) {
      v.flyDist = 0;
      sound.playWhoosh();
      bump();
    }
  }, [showNudge]);

  const pickType = useCallback((i: number) => {
    if (holdRef.current) return;
    const s = stateRef.current;
    if (selectType(s, i)) {
      sound.playClick();
      setNudge(false);
      if (view.current) refreshAim(view.current, s);
      bump();
    }
  }, []);

  const aimTo = useCallback((delta: number) => {
    const v = view.current;
    if (!v || holdRef.current) return;
    v.aim = clampAngle(v.aim + delta);
    refreshAim(v, stateRef.current);
  }, []);

  const aimFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    const c = canvasEl.current;
    if (!v || !c || holdRef.current) return;
    const rect = c.getBoundingClientRect();
    v.aim = angleFromPoint(geo.current.fit, e.clientX - rect.left, e.clientY - rect.top);
    refreshAim(v, stateRef.current);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    down.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    aimFromEvent(e);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (down.current || e.pointerType === 'mouse') aimFromEvent(e);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!down.current) return;
    down.current = false;
    aimFromEvent(e);
    fire();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (holdRef.current || stateRef.current.phase !== 'play') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        aimTo((e.key === 'ArrowLeft' ? 1 : -1) * (e.shiftKey ? AIM_STEP_FINE : AIM_STEP));
      } else if ((e.code === 'Space' || e.key === 'Enter') && !(t && t.tagName === 'BUTTON')) {
        e.preventDefault();
        if (!e.repeat) fire();
      } else if (/^[1-5]$/.test(e.key)) {
        pickType(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aimTo, fire, pickType]);

  // ----- nạp trứng
  const onPick = useCallback(
    (id: number) => {
      const s = stateRef.current;
      const r = pickTrayEgg(s, id);
      if (r === 'dung') sound.playCorrect({ answer: null });
      else if (r === 'sai') sound.playWrong({ answer: null });
      bump();
      return r;
    },
    [],
  );
  const onStart = useCallback(() => {
    const s = stateRef.current;
    if (startRound(s)) {
      sound.playClick();
      const v = view.current;
      if (v) {
        resetView(v);
        v.aim = 90;
        refreshAim(v, s);
      }
      bump();
    }
  }, []);

  // ----- kết thúc
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const s = game;
    const p = s.spec.points;
    const parts: ScorePart[] = [
      { label: fmt(bubbleUi.phanVo), count: s.stats.popped, points: s.stats.popped * p.pop },
      { label: fmt(bubbleUi.phanRoi), count: s.stats.dropped, points: s.stats.dropped * p.drop },
      { label: fmt(bubbleUi.phanNap), count: s.stats.cleanLoads, points: s.stats.cleanLoads * p.cleanLoad },
      { label: fmt(bubbleUi.phanDot), count: s.stats.roundsCleared, points: s.stats.roundsCleared * p.round },
      { label: fmt(bubbleUi.phanTim), count: Math.max(0, s.hearts), points: Math.max(0, s.hearts) * p.heart },
    ];
    onFinish(bubbleScore(s), parts);
  }, [game, onFinish]);

  // ----- hướng dẫn làm thử
  const practiceShoot = useCallback(() => {
    const s = practice;
    if (s.phase !== 'play' || s.flying) return;
    if (s.selected === null) selectType(s, 0);
    const v = view.current;
    if (v && shoot(s, v.aim)) {
      v.flyDist = 0;
      sound.playWhoosh();
      bump();
    }
  }, [practice]);

  const picked = practice.load.picked.length > 0;
  const chosen = practice.selected !== null;
  const tutorialSteps: TutorialStep[] = useMemo(
    () => [
      { id: 'intro', title: fmt(tutorialTexts.man9.tieuDe), content: fmt(tutorialTexts.man9.intro), nextLabel: tutorialTexts.man9.batDauThu },
      { id: 'load', targetSelector: '#tutorial-man9-tray', interactive: true, hideNextButton: !picked, title: fmt(tutorialTexts.man9.tieuDe), content: tutorialTexts.man9.load },
      { id: 'pick', targetSelector: '#tutorial-man9-types', interactive: true, hideNextButton: !chosen, title: fmt(tutorialTexts.man9.tieuDe), content: tutorialTexts.man9.pick },
      { id: 'aim', targetSelector: '#tutorial-man9-board', interactive: true, title: fmt(tutorialTexts.man9.tieuDe), content: tutorialTexts.man9.aim, nextLabel: tutorialTexts.chung.thuTinhNgay },
      { id: 'shoot', targetSelector: '#tutorial-man9-board', interactive: true, hideNextButton: true, title: fmt(tutorialTexts.man9.tieuDe), content: tutorialTexts.man9.practice },
      { id: 'done', title: fmt(tutorialTexts.man9.tieuDe), content: fmt(tutorialTexts.man9.correct) },
    ],
    [picked, chosen],
  );

  const onTutorialNext = () => {
    if (tutorialStep === 1 && practice.phase === 'load' && loadComplete(practice)) {
      startRound(practice);
      const v = view.current;
      if (v) {
        resetView(v);
        v.aim = 90;
        refreshAim(v, practice);
      }
    }
    setTutorialStep((n) => Math.min(tutorialSteps.length - 1, n + 1));
  };
  const closeTutorial = () => setTutorialActive(false);

  // ----- dữ liệu hiển thị
  const s = state;
  const plan = planOf(s);
  const slots = slotsOfPlan(plan);
  const present = presentValues(s);
  const shotsLeft = shotsToDescend(s);
  const keyList = plan.keys;
  const selectedOk = s.selected !== null;
  const inLoad = s.phase === 'load';
  const endText = ending === 'win' ? fmt(bubbleUi.xongThang) : ending === 'hearts' ? fmt(bubbleUi.hetTim) : '';
  const tall = mode === 'tall';

  const keysPanel = (
    <section className="rounded-2xl border-[3px] border-nau-go bg-giay/95 p-2" aria-label={bubbleUi.khoaTieuDe} data-testid="khoa-rieng">
      <h2 className="font-display text-sm font-extrabold sm:text-base">{bubbleUi.khoaTieuDe}</h2>
      <p className="sr-only">{fmt(bubbleUi.khoaDoc, { ds: keyList.join(', ') })}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5" aria-hidden="true">
        {keyList.map((k) => (
          <li key={k} data-testid="khoa-muc" data-key={k} className="rounded-xl border-2 border-nau-go bg-white px-2 py-1 font-display text-base font-extrabold leading-none">
            {fmt(bubbleUi.khoaMuc, { x: k })}
          </li>
        ))}
      </ul>
    </section>
  );

  const hud = (
    <section className="flex flex-col gap-1 rounded-2xl border-[3px] border-nau-go bg-giay/95 p-2" aria-label="HUD" data-testid="hud">
      <div className="flex items-center gap-2">
        <span className="flex gap-0.5" role="img" aria-label={fmt(bubbleUi.tim, { so: Math.max(0, s.hearts), max: s.spec.hearts })} data-testid="tim" data-hearts={s.hearts}>
          {Array.from({ length: s.spec.hearts }, (_, i) => (
            <Heart key={i} on={i < s.hearts} />
          ))}
        </span>
        <span className="font-display text-sm font-extrabold sm:text-base" data-testid="dot">
          {fmt(bubbleUi.dot, { so: s.round + 1, max: s.spec.rounds.length })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 font-display text-sm font-extrabold leading-snug sm:text-base">
        <span data-testid="diem">{fmt(bubbleUi.diem, { so: tutorialActive ? 0 : bubbleScore(s) })}</span>
        {!inLoad && !tutorialActive && (
          <span data-testid="ha-ban" title={fmt(bubbleUi.haBanDoc, { so: shotsLeft })} data-left={shotsLeft}>
            {fmt(bubbleUi.haBan, { so: shotsLeft })}
          </span>
        )}
        {!inLoad && <span data-testid="trung-con">{fmt(bubbleUi.trungCon, { so: eggCount(s) })}</span>}
      </div>
      {tutorialActive && <p className="text-xs font-extrabold text-muc-tim-dam">{bubbleUi.vaoBanThu}</p>}
    </section>
  );

  const villain = (
    <section className="flex items-center gap-2 rounded-2xl border-[3px] border-nau-go bg-giay/95 p-2" aria-label={fmt(bubbleUi.phanDienNoi)} data-testid="phan-dien">
      <PortraitFrame portrait={CHARACTERS.phanDien.portrait} size={tall ? 48 : 88} />
      <p className="font-display text-sm font-extrabold leading-snug">{fmt(bubbleUi.phanDienNoi)}</p>
    </section>
  );

  const typeTray = (
    <div id="tutorial-man9-types" className="flex items-stretch justify-center gap-1.5" role="group" aria-label={bubbleUi.loaiTrung} data-testid="khay-loai">
      {plan.values.map((v, i) => {
        const here = present.has(v);
        const sel = s.selected === i;
        return (
          <button
            key={v}
            type="button"
            data-testid="nut-loai"
            data-value={v}
            data-index={i}
            aria-pressed={sel}
            aria-disabled={!here}
            aria-keyshortcuts={String(i + 1)}
            aria-label={fmt(!here ? bubbleUi.nutTrungHet : sel ? bubbleUi.nutTrungChon : bubbleUi.nutTrung, { y: v, so: i + 1 })}
            onClick={(e) => {
              pickType(i);
              e.currentTarget.blur();
            }}
            className={`relative grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-xl p-0.5 outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${here ? '' : 'opacity-40'} ${sel ? 'border-[4px] border-[#e8a317] bg-white' : 'border-2 border-nau-go bg-giay'}`}
          >
            <EggIcon value={v} slot={slotOf(slots, v)} size={tall ? 40 : 46} images={images} />
            <span className="absolute left-0.5 top-0 text-[11px] font-extrabold leading-none text-nau-go-dam" aria-hidden="true">
              {i + 1}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        data-testid="nut-ban"
        aria-disabled={!selectedOk}
        onClick={(e) => {
          fire();
          e.currentTarget.blur();
        }}
        title={selectedOk ? undefined : bubbleUi.nutBanKhoa}
        className={`min-h-12 min-w-14 cursor-pointer rounded-xl border-2 px-3 font-display text-base font-extrabold outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${selectedOk ? 'border-nau-go-dam bg-muc-tim text-white' : 'border-nau-go/50 bg-giay text-chu/50'} ${nudge ? 'outline outline-[3px] outline-[#e8a317]' : ''}`}
      >
        {bubbleUi.nutBan}
      </button>
    </div>
  );

  const boardArea = inLoad ? (
    <div className="min-h-0 flex-1 rounded-2xl border-[3px] border-nau-go bg-giay/95" data-testid="man9-khung" data-phase="load" data-round={s.round}>
      <BubbleLoad key={`${attempt}-${tutorialActive ? `t${practiceKey}` : 'g'}-${s.round}`} state={s} images={images} reduced={reduced} onPick={onPick} onStart={onStart} />
    </div>
  ) : (
    <>
      <div id="tutorial-man9-board" ref={wrapEl} className="relative min-h-0 flex-1" data-testid="man9-khung" data-phase={s.phase} data-round={s.round} role="application" aria-label={bubbleUi.khung}>
        <canvas
          ref={canvasEl}
          className="absolute inset-0 block touch-none"
          data-testid="ban-trung"
          aria-label={bubbleUi.banTrung}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            down.current = false;
          }}
        />
        {msg && (
          <p className="pointer-events-none absolute inset-x-2 top-2 z-10 mx-auto w-fit max-w-full rounded-2xl border-[3px] border-nau-go bg-giay px-3 py-1 text-center font-display text-sm font-extrabold sm:text-base" data-testid="loi-noi">
            {rich(msg)}
          </p>
        )}
        {ending && (
          <div role="status" className="absolute inset-x-3 top-[22%] z-30 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="het-van">
            <p className="font-display text-lg font-extrabold">
              <span className="sr-only">{plainPower(endText)}</span>
              <span aria-hidden="true">{rich(endText)}</span>
            </p>
            <Button size="md" className="min-h-11" autoFocus data-testid="nut-ket-qua" onClick={finish}>
              {bubbleUi.xemKetQua}
            </Button>
          </div>
        )}
      </div>
      {typeTray}
    </>
  );

  const helpBtn = (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        setPracticeKey((k) => k + 1);
        setTutorialStep(0);
        setTutorialActive(true);
      }}
      className="min-h-11 font-bold"
      aria-label={tutorialTexts.chung.huongDan}
      data-testid="nut-huong-dan"
    >
      <span aria-hidden="true">💡</span>
      <span>{tutorialTexts.chung.huongDan}</span>
    </Button>
  );

  const calc = <ModCalculator inline={!tall} open={calcOpen} onOpenChange={setCalcOpen} className={tall ? 'relative' : ''} />;

  return (
    <div
      id="tutorial-man9-game"
      className="fixed inset-0 select-none overflow-hidden bg-gradient-to-b from-[#f6d9a0] via-[#eec27a] to-[#c98f4a]"
      style={images.nen ? { backgroundImage: `url(${images.nen.src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      data-testid="man9"
    >
      <p role="status" aria-live="polite" className="sr-only" data-testid="loi-doc">
        {live}
      </p>
      {tall ? (
        <div className="flex h-full flex-col gap-1.5 p-1.5 pt-1.5">
          <div className="flex items-stretch gap-1.5 pr-12">
            <div className="min-w-0 flex-1">{hud}</div>
            <div className="flex shrink-0 flex-col gap-1">
              {helpBtn}
              {calc}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">{boardArea}</div>
          <div className="flex items-stretch gap-1.5">
            <div className="min-w-0 flex-1">{keysPanel}</div>
            <div className="shrink-0">{villain}</div>
          </div>
        </div>
      ) : (
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,44%)_minmax(0,1fr)] gap-2 p-2">
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            {keysPanel}
            {calc}
          </div>
          <div className="flex min-h-0 flex-col gap-1.5">{boardArea}</div>
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pt-12">
            {hud}
            {villain}
            {helpBtn}
          </div>
        </div>
      )}

      <TutorialSpotlight
        isOpen={tutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={onTutorialNext}
        onSkip={closeTutorial}
        feedbackMessage={tutorialStep === 1 && picked ? fmt(tutorialTexts.man9.loadDung) : undefined}
        feedbackType="success"
        actionButton={tutorialStep === tutorialSteps.length - 1 ? { label: tutorialTexts.chung.batDauChoi, onClick: closeTutorial, variant: 'primary' } : undefined}
      >
        {tutorialActive && tutorialStep === 4 && (
          <div data-tutorial-obstacle className="pointer-events-auto fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center">
            <Button variant="primary" size="lg" onClick={practiceShoot} data-testid="nut-ban-thu">
              <span aria-hidden="true">🎯</span>
              <span>{tutorialTexts.man9.banThu}</span>
            </Button>
          </div>
        )}
      </TutorialSpotlight>
    </div>
  );
}
