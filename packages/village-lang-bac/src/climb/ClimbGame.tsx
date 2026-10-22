import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Texture } from 'three';
import { AssetImage, BiAvatar, Button, Hearts, climbUi, fmt, hasSeenGameTip, sound, useProgress, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type ClipName, type QualityChoice } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { ART, drawLabels, useClimbTextures } from './climbArt';
import { CLIMB_SPEC } from './climbConfig';
import { JUMP_RISE, LEVEL_GAP, pxPerUnit, type ClimbFrame } from './climbLayout';
import { advanceRound, climbScore, createClimbGame, jump, nextCenter, nodeLabel, stepClimb, type ClimbEvent, type ClimbState } from './climbLogic';
import { ClimbStage, STUDENT_HANG_CLIP, hangFeetY, newAnim, tweenAt, type ClimbAnim } from './ClimbStage';

/** Số màn của game này (để lưu cờ "đã nghe Bi giới thiệu"). */
const LEVEL_ID = 12;
/** Bắt được {phanDien}: chờ chừng này (ms) cho {phanDien} giật mình rồi mới hiện bảng hết vòng. Tự chọn. */
const CAUGHT_DELAY_MS = 1100;

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

/** Nhãn "Sổ / Nay" của vòng, vẽ lại khi đổi vòng, đổi cỡ khung (mỗi 4 px CSS mỗi đơn vị) hay bật "Chữ to"; chờ phông chữ nạp xong. */
function useLabels(state: ClimbState, round: number, ppu: number, largeText: boolean): { map: Map<string, Texture>; fontPx: number } | null {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    const sample = `${fmt(climbUi.so, { so: 0 })} ${fmt(climbUi.nay, { so: 123456789 })}`;
    void fonts
      .load(`700 24px "Baloo 2"`, sample)
      .catch(() => undefined)
      .then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const bucket = Math.floor(ppu / 4) * 4;
  const out = useMemo(() => (fontsReady && bucket > 0 ? drawLabels(state.tree, bucket, largeText) : null), [fontsReady, bucket, largeText, state, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => out?.map.forEach((t) => t.dispose()), [out]);
  return out;
}

type Banner = { kind: 'round'; depth: number; last: boolean } | { kind: 'lost' } | null;
type Say = { text: string; n: number; tone: 'xau' | 'tin' } | null;

/**
 * Màn 12 "Leo cây tìm lá giả" (spec 08): Scene25D khung dọc (khung ngang thì cây ở giữa, hai bên là trời), cây mọc từ dưới lên, camera đi theo người chơi; học sinh và {phanDien} là model 3D.
 * Luật nằm hết ở `climbLogic`; ở đây chỉ nối thao tác, hoạt cảnh, âm thanh vào luật. Cú bật nhận ngay ở pointerdown và keydown (không đợi click) để bớt trễ trên điện thoại.
 */
export function ClimbGame({ paused, attempt, onFinish }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const { progress, markGameTipSeen } = useProgress();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo<ClimbState>(() => createClimbGame(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const anim = useMemo<ClimbAnim>(() => newAnim(state.tree.depth), [state]);
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const [frame, setFrame] = useState<ClimbFrame>('portrait');
  const [overlayRef, framePx] = useWidth();
  const [banner, setBanner] = useState<Banner>(null);
  const [say, setSay] = useState<Say>(null);
  const [tip, setTip] = useState(() => !hasSeenGameTip(progress.game.data, LEVEL_ID));
  const [warm, setWarm] = useState(false);
  const [clips, setClips] = useState<{ student: ClipName; sn: number; villain: ClipName; vn: number }>({ student: STUDENT_HANG_CLIP, sn: 0, villain: 'idle', vn: 0 });
  const finished = useRef(false);

  const textures = useClimbTextures();
  const ppu = framePx > 0 ? pxPerUnit(frame, framePx) : 0;
  const labels = useLabels(state, state.round, ppu, settings.largeText);
  const ready = warm && textures.done && !!labels;

  // Ván mới
  useEffect(() => {
    finished.current = false;
    setBanner(null);
    setSay(null);
  }, [state]);

  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), 1600);
    return () => clearTimeout(t);
  }, [say]);

  // Nạp trước clip bật (học sinh), cười và giật mình ({phanDien}) lúc màn hình tải còn che cảnh
  const warmUp = useCallback(() => {
    setClips((c) => ({ ...c, student: 'jump', sn: c.sn + 1, villain: 'cheer', vn: c.vn + 1 }));
    setTimeout(() => setClips((c) => ({ ...c, villain: 'jump', vn: c.vn + 1 })), 400);
    setTimeout(() => setClips((c) => ({ ...c, student: STUDENT_HANG_CLIP, sn: c.sn + 1, villain: 'idle', vn: c.vn + 1 })), 800);
    setTimeout(() => setWarm(true), 1100);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const P = CLIMB_SPEC.points;
    const parts: ScorePart[] = [
      { label: fmt(climbUi.phanVong, { diem: P.perRound }), count: state.roundsDone, points: state.roundsDone * P.perRound },
      { label: climbUi.phanDong, count: state.coins, points: state.coins * P.perCoin },
      { label: fmt(climbUi.phanTim, { diem: P.perHeart }), count: state.hearts, points: state.hearts * P.perHeart },
    ];
    onFinish(climbScore(state), parts);
  }, [onFinish, state]);

  const handleEvents = useCallback(
    (events: readonly ClimbEvent[]) => {
      const now = performance.now();
      const from = anim.player;
      for (const e of events) {
        if (e.kind === 'up') {
          const y = tweenAt(from, now);
          anim.player = { y0: y, y1: hangFeetY(e.level), start: now, dur: 160, ease: 1 };
          anim.pull = { level: e.level, fromX: anim.pull.fromX, start: now };
          const gap = e.level - 1;
          for (let j = 0; j < CLIMB_SPEC.coinsPerGap; j++) {
            const c = anim.coins[gap * CLIMB_SPEC.coinsPerGap + j];
            if (c) {
              c.mode = e.coins > 0 ? 1 : 2;
              c.start = now;
            }
          }
          if (e.coins > 0) sound.playPickup(true);
          else sound.playClick();
        } else if (e.kind === 'deadEnd' || e.kind === 'miss') {
          const y = tweenAt(from, now);
          anim.player = { y0: y, y1: hangFeetY(state.level), start: now, dur: 320, ease: 2 };
          if (e.kind === 'deadEnd') {
            sound.playWrong();
            setSay((s) => ({ text: climbUi.nguCut, tone: 'xau', n: (s?.n ?? 0) + 1 }));
            setClips((c) => ({ ...c, villain: 'cheer', vn: c.vn + 1 }));
          } else setSay((s) => ({ text: climbUi.truot, tone: 'tin', n: (s?.n ?? 0) + 1 }));
        } else if (e.kind === 'roundDone') {
          sound.playLevelComplete();
          setClips((c) => ({ ...c, villain: 'jump', vn: c.vn + 1 }));
          setTimeout(() => setBanner({ kind: 'round', depth: state.tree.depth, last: state.phase === 'won' }), CAUGHT_DELAY_MS);
        } else if (e.kind === 'lost') {
          setTimeout(() => setBanner({ kind: 'lost' }), 700);
        }
      }
      bump();
    },
    [anim, state],
  );

  // Vòng lặp thời gian (requestAnimationFrame, không dùng useFrame nên không đụng cảnh 3D): tay nắm trượt theo đồng hồ của logic
  const holdLoop = paused || !ready || tip || banner !== null;
  useEffect(() => {
    if (holdLoop) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (state.phase !== 'playing') return;
      const events = stepClimb(state, dt);
      if (events.length > 0) handleEvents(events);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holdLoop, state, handleEvents]);

  const tryJump = useCallback(() => {
    if (holdLoop || state.phase !== 'playing') return;
    if (!jump(state)) return;
    const now = performance.now();
    const y = tweenAt(anim.player, now);
    anim.player = { y0: y, y1: hangFeetY(state.level) + LEVEL_GAP * JUMP_RISE, start: now, dur: CLIMB_SPEC.jumpPeak * 1000, ease: 1 };
    // x của tay nắm sẽ nắm (nếu nắm được) lúc tới đỉnh: để hoạt cảnh kéo tay nắm về giữa thân
    const c = nextCenter(state, state.peakAt ?? state.time);
    anim.pull.fromX = Math.abs(c - CLIMB_SPEC.halfGap) < Math.abs(c + CLIMB_SPEC.halfGap) ? c - CLIMB_SPEC.halfGap : c + CLIMB_SPEC.halfGap;
    sound.playWhoosh();
    setClips((cl) => ({ ...cl, student: 'jump', sn: cl.sn + 1 }));
  }, [anim, holdLoop, state]);

  // Space (không cuộn trang) và chạm/bấm chuột (pointerdown, không đợi click)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'INPUT')) return;
      e.preventDefault();
      if (!e.repeat) tryJump();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tryJump]);

  const nextRound = useCallback(() => {
    if (!advanceRound(state)) return;
    Object.assign(anim, newAnim(state.tree.depth));
    setBanner(null);
    setClips((c) => ({ ...c, student: STUDENT_HANG_CLIP, sn: c.sn + 1, villain: 'idle', vn: c.vn + 1 }));
    bump();
  }, [anim, state]);

  const closeTip = useCallback(() => {
    setTip(false);
    markGameTipSeen(LEVEL_ID);
  }, [markGameTipSeen]);

  const onModeChange = useCallback((m: FrameMode) => setFrame(m === 'landscape' ? 'landscape' : 'portrait'), []);

  if (PROBE) Object.assign(window, { __climb: state, __climbUi: { ppu, fontPx: labels?.fontPx ?? 0, frame, banner, tip, ready } });

  // Nhãn cho trình đọc màn hình: hai tay nắm tầng trên (đổi khi lên tầng, không đổi theo khung hình)
  const pair =
    state.level < state.tree.depth
      ? (['trai', 'phai'] as const).map((side, j) => {
          const t = nodeLabel(state.tree, state.level + 1, 2 * state.index + j);
          return fmt(climbUi.tayNam, { nhan: climbUi[side], so: t.book, so2: t.now });
        })
      : [];
  const portrait = frame === 'portrait';
  const textSize = portrait ? 'max(3.6cqw, 0.875rem)' : 'max(1.6cqw, 0.875rem)';
  const twoD = state.tree.depth;

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
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              tryJump();
            }}
          >
            <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between gap-2" data-testid="hud">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-nau-go bg-giay px-3 py-1 font-display font-extrabold">
                <span data-testid="vong">{fmt(climbUi.vong, { so: state.round + 1, max: CLIMB_SPEC.rounds.length })}</span>
                <Hearts current={state.hearts} max={CLIMB_SPEC.hearts} size="sm" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl border-2 border-nau-go bg-giay px-3 py-1 font-display font-extrabold" aria-label={fmt(climbUi.dong, { so: state.coins })} data-testid="dong">
                <AssetImage path={ART.coin} alt="" className="size-6" />
                <span>{state.coins}</span>
              </div>
            </div>
            <p className="sr-only" aria-live="polite">
              {pair.join('. ')}
            </p>
            {say && (
              <p
                key={say.n}
                role="status"
                className={`pointer-events-none absolute inset-x-0 top-[18%] mx-auto w-fit rounded-2xl border-[3px] bg-giay px-4 py-1 font-display font-extrabold ${say.tone === 'xau' ? 'border-do-son text-do-son-dam' : 'border-muc-tim text-muc-tim-dam'}`}
                data-testid="loi"
              >
                {say.text}
              </p>
            )}
            {tip && ready && (
              <div role="dialog" aria-label={climbUi.biGocCay} className="absolute inset-x-4 top-[30%] z-20 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="bi-goc-cay">
                <BiAvatar size={64} />
                <p className="font-display font-bold">{climbUi.biGocCay}</p>
                <Button size="md" className="min-h-11" onClick={closeTip} autoFocus>
                  {climbUi.hieuRoi}
                </Button>
              </div>
            )}
            {banner && (
              <div role="status" className="absolute inset-x-4 top-[30%] z-20 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border-[3px] border-nau-go bg-giay p-4 text-center" data-testid="banner">
                {banner.kind === 'round' ? (
                  <>
                    <p className="font-display text-lg font-extrabold">{fmt(climbUi.batDuoc)}</p>
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
          labels={labels?.map ?? null}
          version={version + twoD}
          reduced={reduced}
          studentClip={clips.student}
          studentTrigger={clips.sn}
          villainClip={clips.villain}
          villainTrigger={clips.vn}
        />
      </Scene25D>
    </div>
  );
}

