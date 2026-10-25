import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, chickenUi, fmt, plainPower, rich, sound, useGameHint, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type Aim, type PoseRequest, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { useChickenTextures } from './chickenArt';
import { CHICKEN_SPEC } from './chickenConfig';
import { hintFor } from './chickenHint';
import {
  HUD,
  MEDICINE_BAR,
  MEDICINE_COLORS,
  STUDENT,
  RIDER,
  bossPose,
  cardAnchor,
  cardFontPx,
  chickenHit,
  chickenPose,
  riderFoot,
  runHomeSeconds,
  slingAngle,
  slingTip,
  type ChickenPose,
} from './chickenLayout';
import { chickenScore, createChickenGame, dropLabel, selectMedicine, shoot, startWave, tickChicken, type Chicken, type ChickenEvent, type EndReason } from './chickenLogic';
import { ChickenLoad } from './ChickenLoad';
import { ChickenStage, createView, type ChickenView, type RunnerView } from './ChickenStage';

const LEVEL_ID = 9;
const BACKGROUND = 'scenes/man-09-duong-lang';
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Số ô thẻ số có sẵn (gà thường tối đa 12 cùng lúc theo pool của cảnh, cộng gà trùm) */
const CARDS = 14;
/** Mốc thời gian (giây, đồng hồ hoạt cảnh): {phanDien} ngã (hurt) rồi chạy lên cuối đường; chữ "Ối!" hiện lúc ngã; bảng kết thúc hiện sau khi {phanDien} chạy mất */
const T = { fall: 1.1, flee: 1.5, endComplete: 3.0, endLost: 0.9, bubble: 1.1, aim: 1.4 } as const;

type Villain = { clip: 'idle' | 'run'; n: number; pose?: PoseRequest };
interface Bubble {
  id: number;
  text: string;
  /** Phần trăm khung */
  left: number;
  top: number;
  until: number;
  kind: 'sai' | 'oi';
}

const POSE: ChickenPose = { x: 0, y: 0, scale: 1, height: 0, width: 0 };
const ANCH = { x: 0, y: 0 };
const FOOT = { x: 0, y: 0 };

const posFor = (c: Chicken, out: ChickenPose): ChickenPose => (c.boss ? bossPose(c.lane, c.pos, out) : chickenPose(c.lane, c.pos, out));

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 22" className="size-5" aria-hidden="true" data-on={on ? '1' : '0'}>
      <path d="M12 21 C-6 9 3 -2 12 5 C21 -2 30 9 12 21 Z" fill={on ? '#d8452f' : 'none'} stroke="#4a2c12" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Màn 9 "Chữa đàn gà" (spec 07): Scene25D (đường vào làng có 3 làn), gà bệnh chạy lạch bạch, ná cao su ở giữa đáy xoay về con gà được chọn, học sinh đứng cạnh ná, gà trùm có {phanDien} cưỡi. Luật nằm hết ở
 * `chickenLogic`; ở đây chỉ nối thao tác (phím 1 đến 4 chọn thuốc, bấm chuột hay chạm vào gà để bắn, mũi tên trái phải chọn gà, Enter hay Space bắn), hoạt cảnh, âm thanh vào luật. Bước nạp đạn ở `ChickenLoad`.
 * Vòng lặp requestAnimationFrame gọi `tickChicken` (giây); tạm dừng (nút "?", tab ẩn, nhắc xoay ngang) thì mọi đồng hồ đứng yên (gà, viên thuốc, nhịp sinh, hoạt cảnh).
 * Thẻ số trên gà là phần tử HTML cập nhật trực tiếp (không qua React) trong vòng lặp; cỡ chữ theo cỡ gà trên màn hình, không dưới 14 điểm ảnh.
 */
export function ChickenGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const largeText = settings.largeText;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo(() => createChickenGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useRef<ChickenView>(createView(state, reduced));
  const viewKey = useRef(state);
  if (viewKey.current !== state) {
    viewKey.current = state;
    view.current = createView(state, reduced);
  }
  view.current.reduced = reduced;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const textures = useChickenTextures();

  const overlayEl = useRef<HTMLDivElement | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const [mode, setMode] = useState<FrameMode>('landscape');
  const [warm, setWarm] = useState(false);
  const [villain, setVillain] = useState<Villain>({ clip: 'idle', n: 0 });
  const [studentAim, setStudentAim] = useState<Aim | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [ending, setEnding] = useState<EndReason | null>(null);
  const [live, setLive] = useState('');
  const bubbleList = useRef<Bubble[]>([]);
  const bubbleId = useRef(0);
  const pendingEnd = useRef<{ reason: EndReason; at: number } | null>(null);
  const aimUntil = useRef(0);
  const target = useRef(0);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const ringEl = useRef<HTMLDivElement | null>(null);
  const finished = useRef(false);

  const ready = warm && textures.done;
  const rotated = mode === 'rotate';
  const holdLoop = paused || !ready || rotated;
  const holdRef = useRef(holdLoop);
  holdRef.current = holdLoop;
  useGameHint(setHint, LEVEL_ID, () => hintFor(state));

  // Ván mới: dọn mọi thứ
  useEffect(() => {
    finished.current = false;
    pendingEnd.current = null;
    aimUntil.current = 0;
    target.current = 0;
    bubbleList.current = [];
    setBubbles([]);
    setEnding(null);
    setLive('');
    setStudentAim(null);
    setVillain({ clip: 'idle', n: 0 });
  }, [state]);

  // Đo khung (điểm ảnh) để đặt thẻ số: callback ref vì lớp phủ chỉ gắn vào sau khi cảnh đo xong khung
  const setOverlay = useCallback((el: HTMLDivElement | null) => {
    overlayEl.current = el;
    if (el) size.current = { w: el.clientWidth, h: el.clientHeight };
  }, []);
  useEffect(() => {
    const el = overlayEl.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, mode]);

  // Nạp trước mọi hình và chuyển động lúc màn hình tải còn che cảnh (tư thế hurt, clip run của {phanDien}, tư thế chỉ của học sinh) để lần đầu không khựng
  const warmUp = useCallback(() => {
    const v = view.current;
    v.warm = true;
    setVillain({ clip: 'run', n: 1, pose: { name: 'hurt', n: 1 } });
    setStudentAim({ az: -0.5, el: 0.2 });
    setTimeout(() => setVillain({ clip: 'idle', n: 2 }), 600);
    setTimeout(() => {
      v.warm = false;
      setStudentAim(null);
      setWarm(true);
    }, 1200);
  }, []);

  const addBubble = useCallback((text: string, left: number, top: number, kind: Bubble['kind']) => {
    const b: Bubble = { id: ++bubbleId.current, text, left: Math.min(92, Math.max(8, left)), top: Math.max(3, top), until: view.current.clock + T.bubble, kind };
    bubbleList.current = [...bubbleList.current.slice(-3), b];
    setBubbles(bubbleList.current);
  }, []);

  const addRunner = useCallback((kind: RunnerView['kind'], c: Chicken) => {
    const v = view.current;
    let slot = v.runners.find((r) => !r.on);
    if (!slot) slot = v.runners.reduce((a, b) => (b.t0 < a.t0 ? b : a));
    posFor(c, POSE);
    slot.on = true;
    slot.kind = kind;
    slot.t0 = v.clock;
    slot.lane = c.lane;
    slot.pos = c.pos;
    slot.x = POSE.x;
    slot.y = POSE.y;
    slot.scale = POSE.scale;
    slot.boss = c.boss;
    slot.seconds = runHomeSeconds(POSE.x, POSE.y);
  }, []);

  const handleEvents = useCallback(
    (events: readonly ChickenEvent[]) => {
      const v = view.current;
      for (const e of events) {
        switch (e.type) {
          case 'cure':
            sound.playCorrect();
            if (!e.chicken.boss) {
              addRunner('cure', e.chicken);
              setLive(fmt(chickenUi.khoi, { so: e.points }));
            } else if (e.bossCard !== undefined) {
              addRunner('spark', e.chicken);
              setLive(chickenUi.trumDoiThe);
            } else {
              // gà trùm khỏi hẳn: {phanDien} ngã nhào (hurt) kêu "Ối!", rồi chạy mất
              addRunner('cure', e.chicken);
              const p = bossPose(e.chicken.lane, e.chicken.pos, POSE);
              riderFoot(p, FOOT);
              v.villain.mode = 'fall';
              v.villain.t0 = v.clock;
              v.villain.x = FOOT.x;
              v.villain.y = FOOT.y;
              v.villain.gy = p.y;
              v.villain.scale = p.scale;
              setVillain((c) => ({ clip: 'idle', n: c.n + 1, pose: reduced ? c.pose : { name: 'hurt', n: (c.pose?.n ?? 0) + 1 } }));
              addBubble(chickenUi.oi, (FOOT.x / 16 + 0.5) * 100, (0.5 - (FOOT.y + p.height * RIDER.heightRatio * 1.2) / 9) * 100, 'oi');
            }
            break;
          case 'wrong': {
            sound.playWrong();
            const p = posFor(e.chicken, POSE);
            addBubble(chickenUi.khongDung, (p.x / 16 + 0.5) * 100, (0.5 - (p.y + p.height * 1.45) / 9) * 100, 'sai');
            setLive(chickenUi.khongDung);
            break;
          }
          case 'leak':
            sound.playWrong();
            addRunner('leak', e.chicken);
            setLive(chickenUi.mat);
            break;
          case 'bossStart':
            v.villain.mode = 'ride';
            v.villain.t0 = v.clock;
            setVillain((c) => ({ clip: 'idle', n: c.n + 1 }));
            break;
          case 'end':
            pendingEnd.current = { reason: e.reason, at: v.clock + (e.reason === 'complete' ? T.endComplete : T.endLost) };
            break;
          default:
            break;
        }
      }
      if (events.length > 0) bump();
    },
    [addRunner, addBubble, reduced],
  );

  /** Thẻ số trên đầu từng con gà và vòng sáng quanh con gà được chọn, đặt trực tiếp lên phần tử (không qua React) */
  const syncCards = useCallback(() => {
    const { w, h } = size.current;
    if (!(w > 0)) return;
    const ppu = w / 16;
    const cards = cardEls.current;
    let used = 0;
    let ringShown = false;
    for (const c of state.chickens) {
      const el = cards[used];
      if (!el) break;
      used++;
      const p = posFor(c, POSE);
      cardAnchor(p, ANCH);
      const font = cardFontPx(p.height * ppu, largeText);
      const text = String(c.card);
      if (el.dataset.v !== text) {
        el.textContent = text;
        el.dataset.v = text;
      }
      if (el.dataset.f !== String(font)) {
        el.style.fontSize = `${font}px`;
        el.dataset.f = String(font);
      }
      el.style.transform = `translate(${((ANCH.x / 16 + 0.5) * w).toFixed(1)}px, ${((0.5 - ANCH.y / 9) * h).toFixed(1)}px) translate(-50%, -100%)`;
      el.style.display = 'block';
      const sel = c.id === target.current;
      el.dataset.target = sel ? 'true' : 'false';
      if (sel && ringEl.current) {
        const ring = ringEl.current;
        const rw = p.width * ppu * 1.05;
        ring.style.width = `${rw.toFixed(1)}px`;
        ring.style.height = `${(rw * 0.3).toFixed(1)}px`;
        ring.style.transform = `translate(${((p.x / 16 + 0.5) * w).toFixed(1)}px, ${((0.5 - p.y / 9) * h).toFixed(1)}px) translate(-50%, -50%)`;
        ring.style.display = 'block';
        ringShown = true;
      }
    }
    for (let i = used; i < cards.length; i++) {
      const el = cards[i];
      if (el && el.style.display !== 'none') el.style.display = 'none';
    }
    if (!ringShown && ringEl.current && ringEl.current.style.display !== 'none') ringEl.current.style.display = 'none';
    if (target.current !== 0 && !state.chickens.some((c) => c.id === target.current)) target.current = 0;
  }, [state, largeText]);

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
      const events = tickChicken(state, dt, false);
      if (events.length > 0) handleEvents(events);
      // học sinh thôi chỉ về phía gà sau một lúc; chữ nổi hết hạn thì gỡ
      if (aimUntil.current > 0 && v.clock >= aimUntil.current) {
        aimUntil.current = 0;
        setStudentAim(null);
      }
      if (bubbleList.current.length > 0 && bubbleList.current.some((b) => b.until <= v.clock)) {
        bubbleList.current = bubbleList.current.filter((b) => b.until > v.clock);
        setBubbles(bubbleList.current);
      }
      // {phanDien} sau khi gà trùm khỏi: ngã tại chỗ, rồi chạy lên cuối đường, rồi mất
      const vl = v.villain;
      if (vl.mode === 'fall' && v.clock - vl.t0 >= T.fall) {
        vl.mode = 'flee';
        vl.t0 = v.clock;
        setVillain((c) => ({ clip: 'run', n: c.n + 1, pose: c.pose }));
      } else if (vl.mode === 'flee' && v.clock - vl.t0 >= T.flee) {
        vl.mode = 'hidden';
      }
      const pe = pendingEnd.current;
      if (pe && v.clock >= pe.at && state.phase === 'ended') {
        pendingEnd.current = null;
        if (pe.reason === 'complete') sound.playLevelComplete();
        setEnding(pe.reason);
      }
      syncCards();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, handleEvents, syncCards]);

  // ----- điều khiển: chọn thuốc, chọn gà, bắn
  const pick = useCallback(
    (i: number) => {
      if (holdRef.current) return;
      if (selectMedicine(state, i)) {
        sound.playClick();
        bump();
      }
    },
    [state],
  );

  const fire = useCallback(
    (chickenId: number) => {
      if (holdRef.current) return;
      const c = state.chickens.find((x) => x.id === chickenId);
      if (!c) return;
      const v = view.current;
      target.current = chickenId;
      v.aimId = chickenId;
      const r = shoot(state, chickenId);
      if (!r.ok) return;
      const p = posFor(c, POSE);
      const tx = p.x;
      const ty = p.y + p.height * 0.5;
      const angle = slingAngle(tx, ty);
      slingTip(angle, ANCH);
      const slot = v.pills.find((q) => q.id === 0) ?? v.pills[0];
      slot.id = r.projectile.id;
      slot.sx = ANCH.x;
      slot.sy = ANCH.y;
      slot.tx = tx;
      slot.ty = ty;
      sound.playWhoosh();
      // học sinh quay người, chỉ về phía con gà vừa nhắm
      setStudentAim({ az: Math.max(-1.3, Math.min(1.3, Math.atan2(tx - STUDENT.x, 6))), el: Math.max(-0.5, Math.min(0.7, Math.atan2(ty - (STUDENT.feetY + STUDENT.height * 0.7), 9))) });
      aimUntil.current = v.clock + T.aim;
      bump();
    },
    [state],
  );

  const nearestGate = useCallback((): Chicken | null => {
    let best: Chicken | null = null;
    for (const c of state.chickens) if (best === null || c.pos > best.pos) best = c;
    return best;
  }, [state]);

  const cycleTarget = useCallback(
    (dir: -1 | 1) => {
      if (state.chickens.length === 0) return;
      const sorted = [...state.chickens].sort((a, b) => posFor(a, POSE).x - posFor(b, POSE).x);
      const at = sorted.findIndex((c) => c.id === target.current);
      const next = at < 0 ? (nearestGate() ?? sorted[0]) : sorted[(at + dir + sorted.length) % sorted.length];
      target.current = next.id;
      view.current.aimId = next.id;
      setLive(fmt(chickenUi.gaDangChon, { so: next.card }));
      sound.playClick();
    },
    [state, nearestGate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (state.phase !== 'wave' && state.phase !== 'boss') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      if (digit) {
        const i = Number(digit[1]) - 1;
        if (i < state.spec.rounds[state.round].keys.length) {
          e.preventDefault();
          if (!e.repeat) pick(i);
        }
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (!holdRef.current) cycleTarget(e.code === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        // nút đang có tiêu điểm (nút thuốc, nút "?") tự xử lý Enter và Space của nó
        if (t && t.closest('button, [role="button"]')) return;
        e.preventDefault();
        if (e.repeat || holdRef.current) return;
        const c = state.chickens.find((x) => x.id === target.current) ?? nearestGate();
        if (c) fire(c.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, pick, fire, cycleTarget, nearestGate]);

  /** Điểm của khung (phần trăm) đổi sang tọa độ thế giới, rồi tìm con gà trúng (gần giữa thân nhất; cùng khoảng cách thì con gần cổng hơn) */
  const chickenAt = (e: React.PointerEvent<HTMLDivElement>): Chicken | null => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!(r.width > 0)) return null;
    const x = ((e.clientX - r.left) / r.width - 0.5) * 16;
    const y = (0.5 - (e.clientY - r.top) / r.height) * 9;
    let best: Chicken | null = null;
    let bestD = Infinity;
    for (const c of state.chickens) {
      const d = chickenHit(x, y, posFor(c, POSE));
      if (d >= 0 && (d < bestD || (d === bestD && best !== null && c.pos > best.pos))) {
        best = c;
        bestD = d;
      }
    }
    return best;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, [data-chicken-ui]')) return;
    if (state.phase !== 'wave' && state.phase !== 'boss') return;
    const c = chickenAt(e);
    if (c) fire(c.id);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || holdRef.current || (state.phase !== 'wave' && state.phase !== 'boss')) return;
    if ((e.target as HTMLElement).closest('button, [data-chicken-ui]')) return;
    const c = chickenAt(e);
    if (c && c.id !== target.current) {
      target.current = c.id;
      view.current.aimId = c.id;
    }
  };

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const st = state.stats;
    const pts = CHICKEN_SPEC.points;
    const parts: ScorePart[] = [
      { label: chickenUi.phanGa, count: st.cured, points: st.cured * pts.cure },
      { label: chickenUi.phanSai, count: st.wrongShots, points: st.wrongShots * pts.wrong },
      { label: chickenUi.phanNap, count: st.cleanLoads, points: st.cleanLoads * pts.cleanLoad },
      { label: chickenUi.phanTrum, count: st.bossCleared ? 1 : 0, points: st.bossCleared ? pts.boss : 0 },
    ];
    onFinish(chickenScore(state), parts);
  }, [onFinish, state]);

  const onDrop = useCallback(
    (labelId: number, medicine: number) => {
      const r = dropLabel(state, labelId, medicine);
      if (r.ok) sound.playCorrect();
      else if (r.why === 'bounce') sound.playWrong();
      return r;
    },
    [state],
  );
  const onStart = useCallback(() => {
    if (startWave(state)) {
      sound.playClick();
      view.current.aimId = 0;
      target.current = 0;
      bump();
    }
  }, [state]);

  const onModeChange = useCallback((m: FrameMode) => setMode(m), []);
  if (PROBE) {
    Object.assign(window, {
      __chicken: state,
      __chickenView: view.current,
      __chickenUi: { ready, mode, ending, phase: state.phase },
      // tua nhanh để thử gà trùm và hết ván: chạy `seconds` giây của luật rồi xử lý sự kiện như bình thường
      __chickenSim: (seconds: number) => {
        const step = 1 / 30;
        for (let t = 0; t < seconds; t += step) {
          view.current.clock += step;
          handleEvents(tickChicken(state, step, false));
        }
        bump();
      },
    });
  }

  const phase = state.phase;
  const inWave = phase === 'wave' || phase === 'boss';
  const keys = state.spec.rounds[state.round].keys;
  const load = state.loads[state.round];
  const labelValue = (i: number): number | string => {
    const id = load.slots[i];
    return load.labels.find((l) => l.id === id)?.value ?? '';
  };
  const boss = phase === 'boss' || state.stats.reachedBoss;
  const endText = ending === 'complete' ? fmt(chickenUi.xongTrum) : ending === 'hearts' ? fmt(chickenUi.hetTim) : ending === 'boss' ? fmt(chickenUi.trumToiCong) : '';

  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man9">
      <Scene25D
        background={BACKGROUND}
        quality={forced}
        hold={!ready}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div
            ref={setOverlay}
            className="absolute inset-0 touch-none select-none overflow-hidden"
            style={{ containerType: 'size' }}
            role="application"
            aria-label={chickenUi.khung}
            data-testid="man9-khung"
            data-phase={phase}
            data-round={state.round}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
          >
            <p role="status" aria-live="polite" className="sr-only" data-testid="loi-doc">
              {live}
            </p>

            {Array.from({ length: CARDS }, (_, i) => (
              <div
                key={i}
                ref={(el) => {
                  cardEls.current[i] = el;
                }}
                aria-hidden="true"
                data-testid="the-ga"
                className="pointer-events-none absolute left-0 top-0 z-[5] select-none rounded-lg border-[3px] border-nau-go bg-giay px-1.5 py-0.5 font-display font-extrabold leading-none text-chu data-[target=true]:z-[6] data-[target=true]:border-[#e8a317] data-[target=true]:bg-white data-[target=true]:outline data-[target=true]:outline-[3px] data-[target=true]:outline-[#ffd23f]"
                style={{ display: 'none' }}
              />
            ))}
            <div ref={ringEl} aria-hidden="true" data-testid="vong-chon" className="pointer-events-none absolute left-0 top-0 z-[4] rounded-[50%] border-[3px] border-[#ffd23f]" style={{ display: 'none' }} />

            {phase !== 'load' && (
              <div className="pointer-events-none absolute z-10 flex flex-col justify-center gap-0.5 rounded-2xl border-2 border-nau-go bg-giay px-2 py-1" style={{ left: HUD.left, top: HUD.top, width: HUD.width, height: HUD.height }} data-testid="hud">
                <div className="flex items-center gap-2">
                  <span className="flex gap-0.5" role="img" aria-label={fmt(chickenUi.tim, { so: Math.max(0, state.hearts), max: state.spec.hearts })} data-testid="tim" data-hearts={state.hearts}>
                    {Array.from({ length: state.spec.hearts }, (_, i) => (
                      <Heart key={i} on={i < state.hearts} />
                    ))}
                  </span>
                  <span className="font-display text-sm font-extrabold" data-testid="dot">
                    {phase === 'boss' ? chickenUi.dotTrum : fmt(chickenUi.dot, { so: state.round + 1, max: state.spec.rounds.length })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 font-display text-sm font-extrabold leading-snug">
                  <span data-testid="diem">{fmt(chickenUi.diem, { so: chickenScore(state) })}</span>
                  {boss ? <span data-testid="trum-chua">{fmt(chickenUi.trumChua, { so: state.stats.bossCures, max: state.spec.boss.cures })}</span> : <span data-testid="chua">{fmt(chickenUi.chua, { so: state.stats.cured })}</span>}
                </div>
              </div>
            )}

            {inWave && (
              <div role="group" aria-label={chickenUi.nhomThuoc} className="absolute z-10 flex" style={{ left: MEDICINE_BAR.left, bottom: MEDICINE_BAR.bottom, gap: MEDICINE_BAR.gap }} data-chicken-ui data-testid="bang-thuoc">
                {keys.map((x, i) => {
                  const sel = state.selected === i;
                  const y = labelValue(i);
                  return (
                    <button
                      key={x}
                      type="button"
                      data-testid="nut-thuoc"
                      data-med={i}
                      aria-pressed={sel}
                      aria-keyshortcuts={String(i + 1)}
                      aria-label={fmt(sel ? chickenUi.thuocNutChon : chickenUi.thuocNut, { x, y, so: i + 1 })}
                      onClick={(e) => {
                        pick(i);
                        e.currentTarget.blur();
                      }}
                      className={`flex cursor-pointer flex-col items-center justify-start overflow-hidden rounded-xl font-display font-extrabold leading-none text-chu outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${sel ? 'border-[4px] border-[#e8a317] bg-white' : 'border-2 border-nau-go bg-giay'}`}
                      style={{ width: MEDICINE_BAR.w, height: MEDICINE_BAR.h }}
                    >
                      <span className="block h-1.5 w-full shrink-0" style={{ background: MEDICINE_COLORS[i] }} aria-hidden="true" />
                      <span className="mt-1 text-sm" aria-hidden="true">
                        {fmt(chickenUi.thuoc, { x })}
                      </span>
                      <span className="mt-0.5 text-base" aria-hidden="true" data-testid="nhan-thuoc">
                        {y}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {bubbles.map((b) => (
              <p
                key={b.id}
                className={`pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-2xl border-[3px] bg-giay px-3 py-0.5 font-display text-sm font-extrabold sm:text-base ${b.kind === 'sai' ? 'border-do-son text-do-son-dam' : 'border-muc-tim text-muc-tim-dam'}`}
                style={{ left: `${b.left}%`, top: `${b.top}%` }}
                data-testid={b.kind === 'sai' ? 'khong-dung' : 'oi'}
              >
                {b.text}
              </p>
            ))}

            {phase === 'load' && ready && <ChickenLoad key={`${attempt}-${state.round}`} state={state} reduced={reduced} onDrop={onDrop} onStart={onStart} />}

            {ending && (
              <div data-chicken-ui role="status" className="absolute inset-x-4 top-[28%] z-30 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="het-van" onPointerDown={(e) => e.stopPropagation()}>
                <p className="font-display text-lg font-extrabold">
                  <span className="sr-only">{plainPower(endText)}</span>
                  <span aria-hidden="true">{rich(endText)}</span>
                </p>
                <Button size="md" className="min-h-11" autoFocus data-testid="nut-ket-qua" onClick={finish}>
                  {chickenUi.xemKetQua}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <ChickenStage view={view} textures={textures} studentAim={studentAim} villain={villain} />
      </Scene25D>
    </div>
  );
}
