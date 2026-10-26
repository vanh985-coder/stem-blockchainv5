import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, fmt, match3Ui, sound, useGameHint, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type ClipName, type PoseRequest, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { MATCH3_SPEC } from './match3Config';
import { hintFor } from './match3Hint';
import { advanceRound, createMatch3Game, match3Score, swapCells, type Cell, type Pos } from './match3Logic';
import type { Mark } from './man11Anim';
import { BACKGROUND_PATH, useMan11Textures } from './man11Art';
import { Man11Engine } from './man11Engine';
import { GRID, HUD_PX, man11Layout, type Man11Frame } from './man11Layout';
import { Man11Stage } from './Man11Stage';

/** Hạt giống của ván: khác nhau mỗi lần (ngẫu nhiên chỉ ở đây; luật trong `match3Logic` tất định theo hạt giống). */
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

const SAY_MS = 1900;
/** Vuốt: kéo quá chừng này ô (tính theo cạnh ô) thì coi là đổi chỗ với ô kề theo hướng kéo. */
const SWIPE_CELLS = 0.4;

type Say = { text: string; n: number; tone: 'tin' | 'xau' } | null;
type Banner = { done: boolean; bonus: number; turnsLeft: number; last: boolean } | null;

/** Mô tả một ô cho trình đọc màn hình ("lá đa", "hoa sen lá sen", "lá giả", "gió xoáy"). */
function cellName(c: Cell): string {
  if (c.kind === 'fake') return match3Ui.laGia;
  if (c.kind === 'wind') return match3Ui.gioXoay;
  const leaf = match3Ui.tenLa[c.leaf] ?? '';
  return c.lotus ? `${match3Ui.hoaSen} ${leaf}` : leaf;
}

const DIRS: Record<string, readonly [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

/**
 * Màn 11 "Ghép lá cây sổ" (spec 08): Scene25D (khung ngang: bàn bên trái, cây bên phải; khung dọc: cây ở trên, bàn ở dưới; chơi được cả hai, không nhắc xoay). Luật nằm hết ở `match3Logic`: ở đây chỉ nối thao tác
 * (kéo hay chạm hai ô kề, bàn phím) vào `swapCells`, rồi đổi DANH SÁCH SỰ KIỆN logic trả về thành hoạt cảnh (`man11Anim`) do `Man11Engine` phát; trong lúc diễn hoạt không nhận thao tác. Cây chỉ hiện ô lấp, cành gộp,
 * gốc khi lá bay tới nơi (mốc của dòng thời gian). Tạm dừng ("?" mở, tab ẩn) làm đồng hồ hoạt cảnh đứng yên thật.
 */
export function Match3Game({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo(() => createMatch3Game(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const engine = useMemo(() => new Man11Engine(state.board, state.slots.length), [state]);
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const [frame, setFrame] = useState<Man11Frame>('landscape');
  const [overlayRef, framePx] = useWidth();
  const layout = useMemo(() => man11Layout(frame, framePx), [frame, framePx]);
  const textures = useMan11Textures();
  const [warm, setWarm] = useState(false);
  const [clip, setClip] = useState<{ name: ClipName; n: number }>({ name: 'idle', n: 0 });
  const [pose, setPose] = useState<PoseRequest | undefined>(undefined);
  const [sel, setSel] = useState<Pos | null>(null);
  const [cursor, setCursor] = useState<Pos>([3, 3]);
  const [kbd, setKbd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState<Say>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [hud, setHud] = useState(() => ({ turns: state.turnsLeft, score: 0, trees: 0 }));
  const finished = useRef(false);
  const ready = warm && textures.done && framePx > 0;

  const refs = useRef({ paused, ready, banner, sel, reduced });
  refs.current = { paused, ready, banner, sel, reduced };

  // Ván mới
  useEffect(() => {
    finished.current = false;
    setBanner(null);
    setSay(null);
    setSel(null);
    setBusy(false);
    setHud({ turns: state.turnsLeft, score: 0, trees: 0 });
  }, [state]);

  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), SAY_MS);
    return () => clearTimeout(t);
  }, [say]);

  // Nạp trước clip cười và tư thế vung tay của {phanDien} lúc màn hình tải còn che cảnh
  const warmUp = useCallback(() => {
    setClip((c) => ({ name: 'cheer', n: c.n + 1 }));
    setPose((p) => ({ name: 'swing', n: (p?.n ?? 0) + 1 }));
    setTimeout(() => setClip((c) => ({ name: 'idle', n: c.n + 1 })), 700);
    setTimeout(() => setWarm(true), 1000);
  }, []);

  const syncHud = useCallback(() => {
    setHud({ turns: state.turnsLeft, score: match3Score(state), trees: state.results.filter((r) => r.done).length });
  }, [state]);

  const saySomething = useCallback((text: string, tone: 'tin' | 'xau' = 'tin') => setSay((s) => ({ text, tone, n: (s?.n ?? 0) + 1 })), []);

  // Mốc thời gian của hoạt cảnh: âm thanh, lời nói, {phanDien}, hết vòng
  const onMark = useCallback(
    (m: Mark) => {
      switch (m.type) {
        case 'swap':
          sound.playClick();
          break;
        case 'swapBack':
          sound.playWrong();
          saySomething(match3Ui.khongTaoHang, 'xau');
          break;
        case 'clear':
          sound.playPickup(false);
          break;
        case 'lotus':
          sound.playPowerUp();
          break;
        case 'wind':
          sound.playWhoosh();
          break;
        case 'slot':
          sound.playCorrect();
          break;
        case 'branch':
          sound.playPickup(true);
          break;
        case 'tree':
          sound.playLevelComplete();
          saySomething(match3Ui.cayXong);
          break;
        case 'swing':
          setPose((p) => ({ name: 'swing', n: (p?.n ?? 0) + 1 }));
          break;
        case 'throw':
          sound.playWhoosh();
          break;
        case 'land':
          sound.playHit(false);
          saySomething(fmt(match3Ui.phanDienNem), 'xau');
          break;
        case 'cheer':
          setClip((c) => ({ name: 'cheer', n: c.n + 1 }));
          break;
        case 'shuffle':
          sound.playWhoosh();
          saySomething(match3Ui.xaoBan);
          break;
        case 'roundEnd':
          setBanner({ done: !!m.done, bonus: m.bonus ?? 0, turnsLeft: m.turnsLeft ?? 0, last: state.round === state.spec.rounds.length - 1 });
          break;
        default:
          break;
      }
    },
    [saySomething, state],
  );
  const onIdle = useCallback(() => {
    setBusy(false);
    setClip((c) => (c.name === 'idle' ? c : { name: 'idle', n: c.n + 1 }));
    syncHud();
  }, [syncHud]);

  const canAct = useCallback(() => {
    const r = refs.current;
    return r.ready && !r.paused && !r.banner && !engine.playing && state.phase === 'play';
  }, [engine, state]);

  const tryMove = useCallback(
    (a: Pos, b: Pos) => {
      if (!canAct()) return;
      const res = swapCells(state, a, b);
      setSel(null);
      if (res.events.length === 0) {
        if (!res.ok && res.why === 'fake') {
          sound.playWrong();
          saySomething(match3Ui.laGiaKhongDoi, 'xau');
        }
        return;
      }
      engine.playEvents(res.events, refs.current.reduced, onMark);
      setBusy(true);
      setHud((h) => ({ ...h, turns: state.turnsLeft }));
      bump();
    },
    [canAct, engine, onMark, saySomething, state],
  );

  // Nút "?": câu nhắc theo trạng thái ván (không chỉ nước đi)
  useGameHint(setHint, 11, () => hintFor(state));

  // Bàn phím: mũi tên di chuyển con trỏ; Enter hay Space chọn ô rồi mũi tên để đổi chỗ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const dir = DIRS[e.key];
      if (dir) {
        if (!canAct()) return;
        e.preventDefault();
        setKbd(true);
        const from = refs.current.sel ?? cursor;
        const to: Pos = [from[0] + dir[0], from[1] + dir[1]];
        if (to[0] < 0 || to[0] >= GRID || to[1] < 0 || to[1] >= GRID) return;
        if (refs.current.sel) {
          tryMove(refs.current.sel, to);
          setCursor(to);
        } else setCursor(to);
      } else if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        if (!canAct()) return;
        e.preventDefault();
        if (e.repeat) return;
        setKbd(true);
        setSel((s) => (s && s[0] === cursor[0] && s[1] === cursor[1] ? null : cursor));
      } else if (e.key === 'Escape') setSel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAct, cursor, tryMove]);

  // Chạm, kéo: chạm một ô để chọn, chạm ô kề để đổi; hoặc kéo từ ô này sang ô kề
  const hit = useRef<HTMLDivElement>(null);
  const drag = useRef<{ cell: Pos; x: number; y: number; done: boolean; wasSel: boolean; moved: boolean } | null>(null);
  const cellOf = (e: React.PointerEvent): Pos | null => {
    const el = hit.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const size = r.width / GRID;
    const c = Math.floor((e.clientX - r.left) / size);
    const row = Math.floor((e.clientY - r.top) / size);
    return row >= 0 && row < GRID && c >= 0 && c < GRID ? [row, c] : null;
  };
  const onDown = (e: React.PointerEvent) => {
    if (!canAct()) return;
    const cell = cellOf(e);
    if (!cell) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setKbd(false);
    setCursor(cell);
    const s = refs.current.sel;
    if (s && Math.abs(s[0] - cell[0]) + Math.abs(s[1] - cell[1]) === 1) {
      drag.current = null;
      tryMove(s, cell);
      return;
    }
    const wasSel = !!s && s[0] === cell[0] && s[1] === cell[1];
    if (!wasSel) setSel(cell);
    drag.current = { cell, x: e.clientX, y: e.clientY, done: false, wasSel, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = hit.current;
    if (!d || d.done || !el) return;
    const size = el.getBoundingClientRect().width / GRID;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * SWIPE_CELLS) return;
    d.moved = true;
    d.done = true;
    const to: Pos = Math.abs(dx) > Math.abs(dy) ? [d.cell[0], d.cell[1] + Math.sign(dx)] : [d.cell[0] + Math.sign(dy), d.cell[1]];
    if (to[0] >= 0 && to[0] < GRID && to[1] >= 0 && to[1] < GRID) tryMove(d.cell, to);
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && d.wasSel) setSel(null);
  };

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const P = MATCH3_SPEC.points;
    const trees = state.results.filter((r) => r.done).length;
    const spare = state.results.reduce((sum, r) => sum + (r.done ? r.turnsLeft : 0), 0);
    const parts: ScorePart[] = [
      { label: fmt(match3Ui.phanLa, { diem: P.leaf }), count: state.stats.leavesCleared, points: state.stats.leavesCleared * P.leaf },
      { label: fmt(match3Ui.phanO, { diem: P.slot }), count: state.stats.slotsFilled, points: state.stats.slotsFilled * P.slot },
      { label: fmt(match3Ui.phanCay, { so: trees, max: state.spec.rounds.length, diem: P.tree }), count: trees, points: trees * P.tree },
      { label: fmt(match3Ui.phanDu, { diem: P.spare }), count: spare, points: spare * P.spare },
      { label: match3Ui.phanLaGia, count: state.stats.fakesGone, points: 0 },
    ];
    onFinish(match3Score(state), parts);
  }, [onFinish, state]);

  const nextRound = useCallback(() => {
    if (state.round + 1 < state.spec.rounds.length) {
      advanceRound(state);
      engine.startRound(state.board, state.slots.length);
      setBanner(null);
      setSel(null);
      setSay(null);
      syncHud();
      bump();
    } else {
      advanceRound(state);
      setBanner(null);
      finish();
    }
  }, [engine, finish, state, syncHud]);

  const onModeChange = useCallback((m: FrameMode) => setFrame(m === 'landscape' ? 'landscape' : 'portrait'), []);

  if (PROBE) {
    Object.assign(window, {
      __match3: state,
      __match3Engine: engine,
      __match3Move: (a: Pos, b: Pos) => tryMove(a, b),
      __match3Finish: () => {
        engine.finish();
        finish();
      },
      __match3Ui: { layout, frame, framePx, busy, banner, ready, version },
    });
  }

  const ppu = layout.ppu;
  const W = frame === 'landscape' ? 16 : 9;
  const H = frame === 'landscape' ? 9 : 16;
  const cellPx = layout.cell * ppu;
  const boardLeft = (layout.board.x0 + W / 2) * ppu;
  const boardTop = (H / 2 - layout.board.y1) * ppu;
  const hudLeft = (layout.hud.x0 + W / 2) * ppu;
  const hudTop = (H / 2 - layout.hud.y1) * ppu;
  const hudWidth = (layout.hud.x1 - layout.hud.x0) * ppu;
  const hudHeight = HUD_PX[frame];
  const cursorCell = kbd && !sel ? cursor : null;
  const needs = useMemo(() => state.slots.map((x) => x.need), [state, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const describe = (p: Pos | null, chosen: boolean): string => {
    if (!p) return '';
    const c = state.board[p[0]]?.[p[1]];
    return c ? fmt(chosen ? match3Ui.oChon : match3Ui.o, { x: p[0] + 1, y: p[1] + 1, la: cellName(c) }) : '';
  };
  const portrait = frame === 'portrait';
  const pill = 'flex items-center justify-center rounded-2xl border-2 border-nau-go bg-giay px-2 font-display text-sm font-extrabold leading-none whitespace-nowrap';

  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man11">
      <Scene25D
        background={BACKGROUND_PATH}
        quality={forced}
        allowPortrait
        hold={!ready}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div
            ref={overlayRef}
            className="absolute inset-0 touch-none select-none"
            role="application"
            aria-label={match3Ui.khung}
            aria-busy={busy}
            data-testid="man11-khung"
            data-phase={state.phase}
            data-round={state.round}
            data-turns={state.turnsLeft}
            data-frame={frame}
          >
            {/* HUD: vòng, lượt, cây xong, điểm (khung dọc hẹp: hai hàng hai ô) */}
            <div className="pointer-events-none absolute grid gap-1" style={{ left: hudLeft, top: hudTop, width: hudWidth, height: hudHeight, gridTemplateColumns: portrait ? '1fr 1fr' : 'repeat(4, auto)', justifyContent: 'start', columnGap: 6 }} data-testid="hud">
              <span className={pill} data-testid="hud-vong">
                {fmt(match3Ui.vong, { so: state.round + 1, max: state.spec.rounds.length })}
              </span>
              <span className={pill} data-testid="hud-luot">
                {fmt(match3Ui.luot, { so: hud.turns })}
              </span>
              <span className={pill} data-testid="hud-cay">
                {fmt(match3Ui.cay, { so: hud.trees, max: state.spec.rounds.length })}
              </span>
              <span className={pill} data-testid="hud-diem">
                {fmt(match3Ui.diem, { so: hud.score })}
              </span>
            </div>
            {/* Vùng chạm của bàn 7 × 7 và viền ô đang chọn */}
            <div
              ref={hit}
              className="absolute touch-none"
              style={{ left: boardLeft, top: boardTop, width: cellPx * GRID, height: cellPx * GRID }}
              data-testid="man11-ban"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {sel && <div className="pointer-events-none absolute rounded-xl border-4 border-muc-tim bg-white/25" style={{ left: sel[1] * cellPx, top: sel[0] * cellPx, width: cellPx, height: cellPx }} data-testid="o-chon" />}
              {cursorCell && <div className="pointer-events-none absolute rounded-xl border-4 border-dashed border-nau-go-dam" style={{ left: cursorCell[1] * cellPx, top: cursorCell[0] * cellPx, width: cellPx, height: cellPx }} data-testid="o-con-tro" />}
            </div>
            <p className="sr-only" aria-live="polite">
              {describe(sel, true) || (kbd ? describe(cursor, false) : '')}
            </p>
            {say && (
              <p
                key={say.n}
                role="status"
                className={`pointer-events-none absolute w-max max-w-[90%] rounded-2xl border-[3px] bg-giay px-3 py-1 text-center font-display text-sm font-extrabold ${say.tone === 'xau' ? 'border-do-son text-do-son-dam' : 'border-muc-tim text-muc-tim-dam'}`}
                style={{ left: ((layout.tree.x0 + layout.tree.x1) / 2 + W / 2) * ppu, top: (H / 2 - (layout.tree.y0 + 1.2)) * ppu, transform: 'translate(-50%, -50%)' }}
                data-testid="loi"
              >
                {say.text}
              </p>
            )}
            {banner && (
              <div
                role="status"
                className="absolute z-20 flex w-[min(28rem,calc(100%-2rem))] flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center"
                style={portrait ? { left: '50%', top: '42%', transform: 'translate(-50%, -50%)' } : { left: ((layout.tree.x0 + layout.tree.x1) / 2 + W / 2) * ppu, top: '58%', transform: 'translate(-50%, -50%)' }}
                data-testid="banner"
              >
                {banner.done ? (
                  <>
                    <p className="font-display text-lg font-extrabold">{match3Ui.cayXong}</p>
                    <p className="font-display font-bold">{match3Ui.cayGop}</p>
                    <p>{fmt(match3Ui.thuong, { diem: MATCH3_SPEC.points.tree, luot: banner.turnsLeft, so: banner.turnsLeft * MATCH3_SPEC.points.spare })}</p>
                  </>
                ) : (
                  <p className="font-display text-lg font-extrabold">{match3Ui.hetLuot}</p>
                )}
                <Button size="md" className="min-h-11" data-testid="nut-tiep" autoFocus onClick={nextRound}>
                  {banner.last ? match3Ui.xemKetQua : match3Ui.vongTiep}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <Man11Stage
          layout={layout}
          engine={engine}
          textures={textures}
          needs={needs}
          version={version}
          reduced={reduced}
          paused={paused}
          onMark={onMark}
          onIdle={onIdle}
          villainClip={clip.name}
          villainTrigger={clip.n}
          pose={pose}
        />
      </Scene25D>
    </div>
  );
}
