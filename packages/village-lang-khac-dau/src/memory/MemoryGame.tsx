import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three';
import { ASSETS_URL, Button, fmt, lookupAsset, memoryUi, sound, useGameHint, useManifest, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { ModCalculator } from '../ui/ModCalculator';
import { MemoryBoard, MemoryVillain, type BoardCard } from './MemoryBoard';
import { MEMORY_SPEC } from './memoryConfig';
import { FACE_FONT, drawFaceAtlas } from './memoryFaces';
import { GRID_AREA, HUD_AREA, MIN_LABEL_PX, WORLD, cardFonts, framePct, gridLayout, pxPerUnit, type MemoryFrame } from './memoryLayout';
import { advanceRound, createMemoryGame, flipCard, memoryScore, roundScore, tickMemory, type MemoryEvent, type MemoryState } from './memoryLogic';
import { hintFor } from './memoryHint';

const BACKGROUND = 'scenes/man-08-kho-dau';
const CARD_ART = { back: 'ui/cards/the-mat-sau', khuon: 'ui/cards/the-khuon-rieng', mau: 'ui/cards/the-mau-cong-khai' } as const;

/** Vệt tím hiện chừng này ms trước khi hai thẻ đổi chỗ, rồi thẻ trượt về chỗ mới trong `SWAP_MOVE_MS` (Giảm chuyển động: đổi chỗ ngay). Tự chọn: spec chỉ nói "có hoạt cảnh chỉ rõ". */
const SWAP_GLOW_MS = 1000;
const SWAP_MOVE_MS = 450;

/** Hạt giống của ván: khác nhau mỗi lần (ngẫu nhiên chỉ ở đây; luật trong `memoryLogic` tất định theo hạt giống). */
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

/** Ép mức chất lượng bằng ?q=low|medium|high; không có thì theo Cài đặt. */
function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

type Art = { back: HTMLImageElement | null; khuon: HTMLImageElement | null; mau: HTMLImageElement | null; done: boolean };

/** Nạp ảnh mặt sau và nền hai loại mặt trước (theo manifest). Thiếu file hay ảnh lỗi thì null: thẻ dùng màu thay thế, không lỗi trang. */
function useCardArt(): Art {
  const manifest = useManifest();
  const [art, setArt] = useState<Art>({ back: null, khuon: null, mau: null, done: false });
  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const load = (path: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, path);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    void Promise.all([load(CARD_ART.back), load(CARD_ART.khuon), load(CARD_ART.mau)]).then(([back, khuon, mau]) => {
      if (alive) setArt({ back, khuon, mau, done: true });
    });
    return () => {
      alive = false;
    };
  }, [manifest]);
  return art;
}

/** Atlas 24 mặt trước và mặt sau, vẽ theo số điểm ảnh thật của thẻ (chữ ≥ 14 px); vẽ lại khi thẻ đổi cỡ đáng kể hay bật "Chữ to". */
function useFaceAtlas(art: Art, cardPx: number, largeText: boolean): Texture | null {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    const sample = `${memoryUi.nhanKhuon} ${memoryUi.nhanMau} 0123456789`;
    void Promise.all([fonts.load(`700 24px ${FACE_FONT}`, sample), fonts.load(`800 24px ${FACE_FONT}`, sample)])
      .catch(() => undefined)
      .then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const dpr = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);
  // vẽ lại khi cạnh thẻ đổi từ 1 điểm ảnh (vòng mới, đổi cỡ cửa sổ) để chữ luôn đúng cỡ trên màn hình; atlas 5 × 5 ô, tối đa 1920 × 1920
  const px = Math.floor(cardPx); // làm tròn xuống: chữ trên màn hình không nhỏ hơn cỡ đã tính
  const cell = px > 0 ? Math.min(384, Math.max(96, Math.round(px * dpr))) : 0;
  const tex = useMemo(() => {
    if (!art.done || !fontsReady || cell === 0) return null;
    const scale = cell / px;
    const f = cardFonts(px, largeText);
    const canvas = document.createElement('canvas');
    const smallest = drawFaceAtlas(canvas, { back: art.back, khuon: art.khuon, mau: art.mau }, cell, f.label * scale, f.number * scale, MIN_LABEL_PX * scale);
    if (PROBE) Object.assign(window, { __memoryLabelPx: smallest / scale });
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, fontsReady, px, cell, largeText]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/** Đo bề rộng (điểm ảnh) của phần tử. Dùng callback ref vì lớp phủ của Scene25D chỉ gắn vào sau khi cảnh đo xong khung. */
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

type Line = { kind: 'khop'; x: number; y: number; n: number } | { kind: 'sai'; n: number } | { kind: 'trao'; n: number } | null;
type SwapShow = { ids: readonly [string, string]; n: number } | null;

const ids = (s: MemoryState): string[] => s.cards.map((c) => c.id);

/**
 * Màn 8 "Lật thẻ tìm cặp khóa" (spec 07): Scene25D (nền kho dấu, thẻ là mặt phẳng hai mặt lật bằng xoay 180°, {phanDien} model 3D ló ra mép phải khi tráo bài) và lớp HTML
 * phủ lên: thanh trên, Máy tính mod, nút trong suốt đặt đúng chỗ từng thẻ (chuột, chạm, phím mũi tên và Enter/Space, nhãn cho trình đọc màn hình).
 * Luật nằm hết ở `memoryLogic`; ở đây chỉ nối thao tác, hoạt cảnh và âm thanh vào luật. Vòng lặp `requestAnimationFrame` gọi `stepMemory` (ms).
 */
export function MemoryGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo<MemoryState>(() => createMemoryGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [frame, setFrame] = useState<MemoryFrame>('landscape');
  const [overlayRef, framePx] = useWidth();
  const [shown, setShown] = useState<string[]>(() => ids(state));
  const [swapShow, setSwapShow] = useState<SwapShow>(null);
  const [line, setLine] = useState<Line>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [warm, setWarm] = useState(false);
  const [warmPeek, setWarmPeek] = useState(false);
  const roundErrors = useRef<number[]>([]);
  const finished = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Ván mới: dọn trạng thái hiện hình
  useEffect(() => {
    finished.current = false;
    roundErrors.current = [];
    setShown(ids(state));
    setSwapShow(null);
    setLine(null);
    setCalcOpen(false);
    setCursor(0);
  }, [state]);

  const art = useCardArt();
  const spec = MEMORY_SPEC.rounds[state.round];
  const grid = useMemo(() => gridLayout(frame, spec.cols, spec.rows), [frame, spec.cols, spec.rows]);
  const cardPx = framePx > 0 ? grid.card * pxPerUnit(frame, framePx) : 0;
  const atlas = useFaceAtlas(art, cardPx, settings.largeText);

  // Nạp trước clip cười của {phanDien} lúc màn hình tải còn che cảnh (lần đầu mỗi chuyển động tốn vài chục mili giây)
  const warmUp = useCallback(() => {
    setWarmPeek(true);
    setTimeout(() => setWarmPeek(false), 500);
    setTimeout(() => setWarm(true), 900);
  }, []);

  // ----- Vòng lặp thời gian: đồng hồ úp lại 800 ms và đồng hồ tráo bài (vòng 3). Mở Máy tính mod hay đang chiếu hoạt cảnh tráo thì đồng hồ tráo đứng yên.
  const swapRef = useRef<SwapShow>(null);
  swapRef.current = swapShow;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Nút "?": câu nhắc theo trạng thái ván (không lộ đáp án)
  useGameHint(setHint, () => hintFor(state));
  const calcRef = useRef(false);
  calcRef.current = calcOpen;
  const handleEvents = useCallback(
    (events: readonly MemoryEvent[]) => {
      for (const e of events) {
        if (e.kind === 'swap') {
          sound.playWhoosh();
          setSwapShow((s) => ({ ids: [e.cards[0].id, e.cards[1].id], n: (s?.n ?? 0) + 1 }));
          setLine((l) => ({ kind: 'trao', n: (l?.n ?? 0) + 1 }));
        }
      }
      bump();
    },
    [],
  );
  useEffect(() => {
    if (paused || !warm) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (state.phase !== 'playing') return;
      const before = state.waitingFlipBack;
      const events = tickMemory(state, dt, pausedRef.current, { swapClock: !calcRef.current && !swapRef.current });
      if (events.length > 0 || before !== state.waitingFlipBack) handleEvents(events);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, warm, state, handleEvents]);

  // Hoạt cảnh tráo: vệt tím ở chỗ cũ, rồi hai thẻ trượt sang chỗ mới, rồi {phanDien} nấp lại
  const swapN = swapShow?.n ?? 0;
  useEffect(() => {
    if (!swapShow) return;
    const t1 = setTimeout(() => setShown(ids(state)), SWAP_GLOW_MS);
    const t2 = setTimeout(() => setSwapShow(null), SWAP_GLOW_MS + (reduced ? 0 : SWAP_MOVE_MS));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapN]);

  const playing = state.phase === 'playing' && !paused && warm && !swapShow;

  const onFlip = useCallback(
    (id: string) => {
      if (!playing) return;
      const r = flipCard(
        state,
        state.cards.findIndex((c) => c.id === id),
      );
      if (r.kind === 'ignored') return;
      if (r.kind === 'first') sound.playClick();
      else if (r.kind === 'mismatch') {
        sound.playWrong();
        setLine((l) => ({ kind: 'sai', n: (l?.n ?? 0) + 1 }));
      } else {
        const [k, m] = r.cards[0].type === 'khuon' ? r.cards : [r.cards[1], r.cards[0]];
        sound.playCorrect();
        setLine((l) => ({ kind: 'khop', x: k.value, y: m.value, n: (l?.n ?? 0) + 1 }));
        if (r.roundDone) {
          roundErrors.current.push(state.errors);
          sound.playLevelComplete();
        }
      }
      bump();
    },
    [playing, state],
  );

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const parts: ScorePart[] = state.roundScores.map((points, i) => ({ label: fmt(memoryUi.phanVong, { so: i + 1 }), count: roundErrors.current[i] ?? 0, points }));
    onFinish(memoryScore(state), parts);
  }, [onFinish, state]);

  const nextRound = useCallback(() => {
    if (advanceRound(state)) {
      setShown(ids(state));
      setLine(null);
      setCursor(0);
      bump();
    }
  }, [state]);

  // ----- Bàn phím: mũi tên di chuyển ô chọn, Enter/Space (nút gốc của trình duyệt) để lật
  const count = state.cards.length;
  const onGridKey = (e: React.KeyboardEvent) => {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -spec.cols, ArrowDown: spec.cols }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const next = Math.min(count - 1, Math.max(0, cursor + d));
    setCursor(next);
    buttons.current[next]?.focus();
  };

  const byId = useMemo(() => new Map(state.cards.map((c) => [c.id, c])), [state.cards]); // đổi theo vòng (bộ thẻ mới)
  const glowIds = swapShow?.ids ?? null;
  const items: BoardCard[] = shown.flatMap((id, slot) => {
    const card = byId.get(id);
    const p = grid.slots[slot];
    return card && p ? [{ card, x: p.x, y: p.y, glow: !!glowIds && glowIds.includes(id) }] : [];
  });

  const running = state.phase === 'playing' ? roundScore(state.errors) : 0;
  const score = memoryScore(state) + running;
  const done = state.phase === 'roundDone' || state.phase === 'gameOver';
  const lastScore = state.roundScores[state.roundScores.length - 1] ?? 0;
  const hud = HUD_AREA[frame];
  const hudTL = framePct(frame, hud.x0, hud.y1);
  const hudBR = framePct(frame, hud.x1, hud.y0);
  const area = GRID_AREA[frame];
  const areaTL = framePct(frame, area.x0, area.y1);
  const areaBR = framePct(frame, area.x1, area.y0);
  const world = WORLD[frame];
  const btnW = (grid.card / world.width) * 100;
  const btnH = (grid.card / world.height) * 100;
  const portrait = frame === 'portrait';
  const textSize = portrait ? 'max(3.6cqw, 0.875rem)' : 'max(1.6cqw, 0.875rem)';
  const ready = warm && !!atlas && art.done;

  if (PROBE) Object.assign(window, { __memory: state, __memoryUi: { shown, swapShow, cardPx } });

  const onModeChange = useCallback((m: FrameMode) => setFrame(m === 'portrait' ? 'portrait' : 'landscape'), []);

  const lineText =
    line?.kind === 'khop' ? `${memoryUi.khopLoi} ${fmt(memoryUi.khop, { x: line.x, y: line.y })}` : line?.kind === 'sai' ? memoryUi.saiLoi : line?.kind === 'trao' ? fmt(memoryUi.trao) : '';

  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man8">
      <Scene25D
        background={BACKGROUND}
        quality={forced}
        allowPortrait
        hold={!ready}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div ref={overlayRef} className="absolute inset-0" style={{ containerType: 'size', fontSize: textSize }} data-testid="man8-khung" data-phase={state.phase} data-round={state.round} data-swap={swapShow ? 'yes' : 'no'}>
            <div className={`absolute flex flex-col gap-2 p-2 ${portrait ? "pr-12" : ""}`} style={{ left: `${hudTL.left}%`, top: `${hudTL.top}%`, width: `${hudBR.left - hudTL.left}%`, height: `${hudBR.top - hudTL.top}%` }}>
              <div className={`flex ${portrait ? 'flex-row items-start justify-between' : 'flex-col'} gap-2`}>
                <ModCalculator open={calcOpen} onOpenChange={setCalcOpen} className="relative z-30" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 border-nau-go bg-giay px-3 py-1 font-display font-extrabold" data-testid="hud">
                  <span data-testid="vong">{fmt(memoryUi.vong, { so: state.round + 1, max: MEMORY_SPEC.rounds.length })}</span>
                  <span data-testid="diem">{fmt(memoryUi.diem, { so: score })}</span>
                  <span data-testid="sai">{fmt(memoryUi.sai, { so: state.phase === 'playing' ? state.errors : (roundErrors.current[state.round] ?? 0) })}</span>
                </div>
              </div>
              <p role="status" aria-live="polite" className={`rounded-2xl border-2 px-3 py-1 font-display font-extrabold ${lineText ? '' : 'invisible'} ${line?.kind === 'khop' ? 'border-xanh-la bg-giay text-xanh-la-dam' : line?.kind === 'trao' ? 'border-muc-tim bg-giay text-muc-tim-dam' : 'border-do-son bg-giay text-do-son-dam'}`} data-testid="dong-ket-qua">
                {lineText || ' '}
              </p>
            </div>

            <div role="group" aria-label={memoryUi.luoi} onKeyDown={onGridKey} className="absolute" style={{ left: `${areaTL.left}%`, top: `${areaTL.top}%`, width: `${areaBR.left - areaTL.left}%`, height: `${areaBR.top - areaTL.top}%` }}>
              {shown.map((id, slot) => {
                const card = byId.get(id);
                const p = grid.slots[slot];
                if (!card || !p) return null;
                const at = framePct(frame, p.x, p.y);
                const left = ((at.left - areaTL.left) / (areaBR.left - areaTL.left)) * 100;
                const top = ((at.top - areaTL.top) / (areaBR.top - areaTL.top)) * 100;
                const w = (btnW / (areaBR.left - areaTL.left)) * 100;
                const h = (btnH / (areaBR.top - areaTL.top)) * 100;
                const up = card.isFlipped || card.isMatched;
                const face = card.type === 'khuon' ? fmt(memoryUi.theKhuon, { x: card.value }) : fmt(memoryUi.theMau, { y: card.value });
                const label = !up ? fmt(memoryUi.theUp, { so: Math.floor(slot / spec.cols) + 1, so2: (slot % spec.cols) + 1 }) : card.isMatched ? fmt(memoryUi.daKhop, { nhan: face }) : face;
                return (
                  <button
                    key={slot}
                    ref={(el) => {
                      buttons.current[slot] = el;
                    }}
                    type="button"
                    tabIndex={slot === cursor ? 0 : -1}
                    aria-label={label}
                    aria-disabled={!playing || up}
                    data-testid="the"
                    data-slot={slot}
                    data-id={id}
                    data-up={up ? 'yes' : 'no'}
                    onFocus={() => setCursor(slot)}
                    onClick={() => {
                      setCursor(slot);
                      onFlip(id);
                    }}
                    className="absolute cursor-pointer rounded-[8%] border-[3px] border-transparent bg-transparent outline-none focus-visible:border-chu focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-white"
                    style={{ left: `${left - w / 2}%`, top: `${top - h / 2}%`, width: `${w}%`, height: `${h}%` }}
                  />
                );
              })}
            </div>

            {done && (
              <div role="status" className="absolute inset-x-[10%] top-[35%] z-20 mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="banner">
                <p className="font-display font-extrabold">{fmt(memoryUi.vongXong, { so: state.round + 1, k: roundErrors.current[state.round] ?? 0, diem: lastScore })}</p>
                <Button size="md" className="min-h-11" data-testid="nut-tiep" onClick={state.phase === 'gameOver' ? finish : nextRound}>
                  {state.phase === 'gameOver' ? memoryUi.xemKetQua : memoryUi.vongTiep}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <MemoryBoard items={items} cardSize={grid.card} atlas={atlas} reduced={reduced} />
        <MemoryVillain frame={frame} peek={warmPeek || !!swapShow} n={swapN + (warmPeek ? 1000 : 0)} reduced={reduced && !warmPeek} />
      </Scene25D>
    </div>
  );
}

