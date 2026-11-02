import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BiAvatar, Button, Hearts, TutorialSpotlight, fmt, rebuildUi, sound, tutorialTexts, useGameHint, useSettings, type MiniGameRenderProps, type ScorePart, type TutorialStep } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type QualityChoice, type Sprite25D } from '@so-chung/core/three/index';
import type { FrameMode } from '@so-chung/core/three/scene25d/layout25d';
import { REBUILD_SPEC as SPEC } from './rebuildConfig';
import { hintFor } from './rebuildHint';
import { BacAnActor, StudentActor, VillainActor, type Reaction } from './RebuildActors';
import { Basket, ChainRow, DragGhost, Tray, useCardDrag, type DropTarget } from './RebuildCards';
import { AREAS, REDUCED_MOTION_SCALE, VILLAIN_TIMING, cardHeight, cardWidth, center, villainStageAt, worldPoint, type VillainStage } from './rebuildLayout';
import {
  advance,
  binCard,
  createRebuild,
  insertFake,
  inspectionLine,
  placeCard,
  rebuildScore,
  roundScore,
  scoreParts,
  type Card,
  type RebuildState,
  type ScorePartRow,
} from './rebuildLogic';

const BACKGROUND = 'scenes/man-03-xuong-giay';
const BASKET_ASSET = 'sprites/man-03-ghep-so/ro-trang-gia';

/** Hạt giống của ván: khác nhau mỗi lần (ngẫu nhiên chỉ ở đây; mọi luật trong `rebuildLogic` đều tất định theo hạt giống). */
const newSeed = (): number => (Math.random() * 2 ** 31) >>> 0;

/** Ép mức chất lượng bằng ?q=low|medium|high (để kiểm tra hiệu năng); không có thì theo Cài đặt. */
function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Hình rời của cảnh: rổ trang giả ở dải giữa bên phải (sau nhân vật). */
function basketSprites(): Sprite25D[] {
  const c = center(AREAS.basket);
  const p = worldPoint(c.fx, c.fy + 0.04);
  return [{ key: 'ro', asset: BASKET_ASSET, x: p.x, y: p.y, layer: 'back', width: 5.6 }];
}

interface Say {
  text: string;
  n: number;
  tone: 'tot' | 'xau' | 'tin';
}

/** Lời của Bi: bong bóng nhỏ ở dải giữa, tự tắt sau vài giây. */
function BiSay({ say }: { say: Say | null }) {
  if (!say) return null;
  const tone = say.tone === 'tot' ? 'border-xanh-la' : say.tone === 'xau' ? 'border-do-son' : 'border-muc-tim';
  return (
    <div role="status" aria-live="polite" key={say.n} className="absolute flex animate-toast-pop items-center gap-[1cqw]" style={{ left: `${AREAS.mid.x0}cqw`, top: `${AREAS.mid.y0 + 1}%`, width: `${AREAS.mid.x1 - AREAS.mid.x0 - 30}cqw` }} data-testid="bi-noi">
      <BiAvatar size={56} className="shrink-0" />
      <p className={`rounded-[1.2cqw] border-[0.3cqw] bg-giay px-[1.4cqw] py-[0.8cqw] font-display font-bold text-chu ${tone}`} style={{ fontSize: 'max(1.9cqw, 13px)' }}>
        {say.text}
      </p>
    </div>
  );
}

/**
 * "Soi công thức" (spec 05 Màn 3): hiện phép tính của thẻ đang chọn kèm kết quả và khớp hay không, ví dụ "(31 × 2 + 7) mod 100 = 69 → khớp". Không nói thẻ nào là trang giả
 * và không nói đặt vào đâu: em tự so với mã trang trước của chuỗi. Nằm gọn trong dải giữa (không che chuỗi và khay). Đóng bằng nút "Soi công thức" ở thanh trên (bật tắt) hoặc phím Escape.
 */
function InspectPanel({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const line = card ? inspectionLine(card) : null;
  return (
    <div
      role="dialog"
      aria-label={rebuildUi.soiTieuDe}
      data-testid="soi-cong-thuc"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="absolute z-20 rounded-[1.2cqw] border-[0.3cqw] border-nau-go bg-giay px-[1.4cqw] py-[0.8cqw]"
      style={{ left: `${AREAS.mid.x0 + 3}cqw`, top: `${AREAS.mid.y0 + 0.5}%`, width: `${AREAS.mid.x1 - AREAS.mid.x0 - 6}cqw`, fontSize: 'max(1.7cqw, 12px)' }}
    >
      {!card || !line ? (
        <p data-testid="soi-chua-chon">{rebuildUi.soiChuaChon}</p>
      ) : (
        <p role="status" className={`font-display font-extrabold ${line.kind === 'khop' ? 'text-xanh-la-dam' : 'text-do-son-dam'}`} data-testid="soi-ket-qua">
          {fmt(line.kind === 'khop' ? rebuildUi.soiKhop : rebuildUi.soiLech, { truoc: card.prev, noidung: card.content, kq: line.expected, ma: card.code })}
        </p>
      )}
    </div>
  );
}

/** Thanh trên: tim, vòng, điểm, nút "💡 Hướng dẫn" và nút "Soi công thức". */
function HudBar({
  hearts,
  round,
  score,
  soiOpen,
  onSoi,
  onOpenTutorial,
}: {
  hearts: number;
  round: number;
  score: number;
  soiOpen: boolean;
  onSoi: () => void;
  onOpenTutorial: () => void;
}) {
  return (
    <div className="absolute flex items-center justify-between" style={{ left: `${AREAS.hud.x0}cqw`, right: `max(${100 - AREAS.hud.x1}cqw, 4.25rem)`, top: `${AREAS.hud.y0}%` }}>
      <div className="flex items-center rounded-nut border-2 border-nau-go bg-giay/90 px-3 gap-3 py-1" data-testid="hud">
        <Hearts current={hearts} max={SPEC.hearts} size="sm" />
        <span className="font-display text-base font-extrabold" data-testid="vong">
          {fmt(rebuildUi.vong, { so: round + 1, max: SPEC.rounds.length })}
        </span>
        <span className="font-display text-base font-extrabold" data-testid="diem">
          {fmt(rebuildUi.diem, { so: score })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onOpenTutorial} className="min-h-11 min-w-11 text-nau-go-dam font-bold" aria-label={tutorialTexts.chung.huongDan}>
          <span>💡</span>
          <span className="hidden sm:inline">{tutorialTexts.chung.huongDan}</span>
        </Button>
        <Button id="tutorial-man3-soi" size="sm" variant={soiOpen ? 'primary' : 'secondary'} onClick={onSoi} className="min-h-11 min-w-11" data-testid="nut-soi" aria-pressed={soiOpen}>
          {rebuildUi.soiNut}
        </Button>
      </div>
    </div>
  );
}

/** Thẻ giấy úp bay từ {phanDien} vào khay lúc thả trang (không hiện số nên không lộ trang giả). */
function FlyingPage({ landed, width, seconds }: { landed: boolean; width: number; seconds: number }) {
  const h = cardHeight(width);
  const from = { left: `${ACTORS_HAND.x}cqw`, top: `${ACTORS_HAND.y}%` };
  const to = { left: `${AREAS.tray.x0 + 30}cqw`, top: `${AREAS.tray.y0}%` };
  const pos = landed ? to : from;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-[0.9cqw] border-[0.3cqw] border-nau-go bg-giay"
      style={{ width: `${width}cqw`, height: `${h}cqw`, ...pos, transition: `left ${seconds}s ease-in, top ${seconds}s ease-in, transform ${seconds}s ease-in`, transform: landed ? 'rotate(8deg)' : 'rotate(-18deg)', zIndex: 15 }}
      data-testid="trang-bay"
    >
      <span className="absolute inset-x-[20%] bottom-[12%] h-[18%] rounded-full bg-muc-tim/70" />
    </div>
  );
}
/** Bàn tay {phanDien} lúc thả trang (tỉ lệ khung). */
const ACTORS_HAND = { x: 60, y: 44 } as const;

type Banner = { kind: 'roundDone'; round: number; points: number } | { kind: 'over' };

/** Nhãn một dòng điểm ở màn kết quả. */
function rowLabel(r: ScorePartRow): string {
  switch (r.key) {
    case 'vong':
      return fmt(rebuildUi.phanVong, { so: r.round + 1 });
    case 'trangGia':
      return fmt(rebuildUi.phanTrangGia, { so: r.round + 1 });
  }
}

/**
 * Màn 3 "Ghép lại cuốn sổ" (spec 05): Scene25D (nền xưởng giấy, rổ trang giả là hình rời, Bác An, học sinh và {phanDien} là model 3D) và lớp HTML phủ lên: thẻ trang kéo thả
 * (chuột, ngón tay) hoặc chạm chọn rồi chạm đặt, soi công thức, thanh trên. Luật nằm hết ở `rebuildLogic`.
 */
export function RebuildGame({ paused: pausedByFrame, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const [frame, setFrame] = useState<FrameMode>('landscape');
  const onModeChange = useCallback((m: FrameMode) => setFrame(m), []);

  // Hướng dẫn focus và làm thử Màn 3
  const [tutorialActive, setTutorialActive] = useState(attempt <= 1);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [, setSoiPracticed] = useState(false);

  const paused = pausedByFrame || frame === 'rotate' || tutorialActive;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo<RebuildState>(() => createRebuild(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Nút "?": câu nhắc theo trạng thái ván (không lộ đáp án)
  useGameHint(setHint, 3, () => hintFor(state));

  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [badFlash, setBadFlash] = useState(0);
  const [say, setSay] = useState<Say | null>(null);
  const [reaction, setReaction] = useState<Reaction>({ kind: 'none', n: 0 });
  const [soiOpen, setSoiOpen] = useState(false);
  const [villain, setVillain] = useState<{ stage: VillainStage; startedAt: number; flying: boolean; landed: boolean }>({ stage: 'idle', startedAt: 0, flying: false, landed: false });
  const finished = useRef(false);
  const [warm, setWarm] = useState(false);

  const react = useCallback((kind: Reaction['kind']) => setReaction((r) => ({ kind, n: r.n + 1 })), []);
  const speak = useCallback((text: string, tone: Say['tone']) => setSay((s) => ({ text, tone, n: (s?.n ?? 0) + 1 })), []);

  // Ô báo sai (đỏ) tắt sau 0,7 giây
  useEffect(() => {
    if (badFlash === 0) return;
    const t = setTimeout(() => setBadFlash(0), 700);
    return () => clearTimeout(t);
  }, [badFlash]);

  // Bong bóng lời của Bi tự tắt; phản ứng chỉ tay hết sau một lúc
  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), 3600);
    return () => clearTimeout(t);
  }, [say]);
  useEffect(() => {
    if (reaction.kind !== 'point') return;
    const t = setTimeout(() => setReaction((r) => (r.kind === 'point' && r.n === reaction.n ? { kind: 'none', n: r.n } : r)), 1800);
    return () => clearTimeout(t);
  }, [reaction]);

  // Nạp trước các chuyển động đầu tiên khi màn hình tải còn che cảnh
  const warmUp = useCallback(() => {
    const now = () => performance.now();
    const steps: [number, () => void][] = [
      [0, () => { setReaction((r) => ({ kind: 'sad', n: r.n + 1 })); setVillain({ stage: 'enter', startedAt: now(), flying: false, landed: false }); }],
      [300, () => { setReaction((r) => ({ kind: 'point', n: r.n + 1 })); setVillain((v) => ({ ...v, stage: 'cheer' })); }],
      [600, () => { setReaction((r) => ({ kind: 'cheer', n: r.n + 1 })); setVillain((v) => ({ ...v, stage: 'exit' })); }],
      [1000, () => { setReaction((r) => ({ kind: 'none', n: r.n + 1 })); setVillain({ stage: 'idle', startedAt: 0, flying: false, landed: false }); }],
      [1400, () => setWarm(true)],
    ];
    steps.forEach(([ms, fn]) => setTimeout(fn, ms));
  }, []);

  // Ván mới: dọn các trạng thái hiện hình
  useEffect(() => {
    finished.current = false;
    setSelected(null);
    setShake(null);
    setFresh(null);
    setBadFlash(0);
    setSay(null);
    setReaction({ kind: 'none', n: 0 });
    setSoiOpen(false);
    setVillain({ stage: 'idle', startedAt: 0, flying: false, landed: false });
  }, [state]);

  // {phanDien} chạy vào nhét trang giả (vòng 2)
  const phase = state.phase;
  const round = state.round;
  useEffect(() => {
    if (phase !== 'villain' || paused) return;
    const k = reduced ? REDUCED_MOTION_SCALE : 1;
    const at = (sec: number, fn: () => void) => setTimeout(fn, sec * 1000 * k);
    const startedAt = performance.now();
    setSelected(null);
    setSoiOpen(false);
    setVillain({ stage: villainStageAt(0, k), startedAt, flying: false, landed: false });
    const timers = [
      at(VILLAIN_TIMING.enterEnd, () => {
        setVillain((v) => ({ ...v, stage: 'cheer' }));
        speak(rebuildUi.phanDienCuoi, 'tin');
      }),
      at(VILLAIN_TIMING.dropAt, () => {
        setVillain((v) => ({ ...v, flying: true, landed: false }));
        react('point');
        requestAnimationFrame(() => setVillain((v) => ({ ...v, landed: true })));
      }),
      at(VILLAIN_TIMING.exitStart, () => setVillain((v) => ({ ...v, stage: 'exit', flying: false }))),
      at(VILLAIN_TIMING.end, () => {
        insertFake(state);
        setVillain((v) => ({ ...v, stage: 'gone' }));
        if (state.deal.fake) setFresh(state.deal.fake.id);
        speak(fmt(rebuildUi.biNhetTrang, {}), 'tin');
        bump();
      }),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase, round, paused, reduced, state, speak, react]);

  const playing = phase === 'play' && !paused;
  const width = cardWidth(state.deal.real.length + 1);
  const slots = state.deal.real.length + 1;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const parts: ScorePart[] = scoreParts(state).map((r) => ({ label: rowLabel(r), count: r.count, points: r.points }));
    onFinish(rebuildScore(state), parts);
  }, [onFinish, state]);

  const hitHeartsOut = useCallback(() => {
    if (state.phase === 'over' && state.over === 'hearts') {
      sound.playHit(false);
      speak(rebuildUi.biHetTim, 'xau');
      react('sad');
    }
  }, [react, speak, state]);

  const doPlace = useCallback(
    (id: string) => {
      const r = placeCard(state, id);
      if (r.kind === 'ok') {
        sound.playPickup(true);
        setSelected(null);
        setFresh(null);
        if (r.roundDone) {
          sound.playLevelComplete();
          react('cheer');
          if (state.phase === 'over' && state.over === 'done') {
            // Vòng 2 kết thúc ngay khi ghép xong chuỗi 7 trang -> vào thẳng màn kết quả
            finish();
          } else {
            speak(rebuildUi.biDuChuoi, 'tot');
          }
        }
      } else if (r.kind === 'badPrev' || r.kind === 'fake') {
        sound.playWrong();
        setShake((s) => ({ id, n: (s?.n ?? 0) + 1 }));
        setBadFlash((n) => n + 1);
        speak(fmt(r.kind === 'badPrev' ? rebuildUi.biSaiMaTruoc : rebuildUi.biTrangGia, {}), 'xau');
        react('sad');
        hitHeartsOut();
      }
      bump();
    },
    [finish, hitHeartsOut, react, speak, state],
  );

  const doBin = useCallback(
    (id: string) => {
      const r = binCard(state, id);
      if (r.kind === 'binned') {
        sound.playCorrect();
        setSelected(null);
        speak(fmt(rebuildUi.biBatDuoc, { so: r.bonus }), 'tot');
        react('point');
      } else if (r.kind === 'realBack') {
        sound.playWrong();
        setShake((s) => ({ id, n: (s?.n ?? 0) + 1 }));
        speak(rebuildUi.biTrangThat, 'xau');
        react('sad');
        hitHeartsOut();
      }
      bump();
    },
    [hitHeartsOut, react, speak, state],
  );

  const onTap = useCallback((id: string) => setSelected((s) => (s === id ? null : id)), []);
  const onDrop = useCallback(
    (id: string, target: DropTarget | null) => {
      if (target === 'chain') doPlace(id);
      else if (target === 'basket') doBin(id);
    },
    [doBin, doPlace],
  );
  const { ghost, hover, bind } = useCardDrag({ overlayRef, enabled: playing, onTap, onDrop });

  const activateChain = useCallback(() => {
    if (!playing) return;
    if (selected) doPlace(selected);
    else speak(rebuildUi.nhacChon, 'tin');
  }, [doPlace, playing, selected, speak]);
  const activateBasket = useCallback(() => {
    if (!playing) return;
    if (selected) doBin(selected);
    else speak(rebuildUi.nhacChon, 'tin');
  }, [doBin, playing, selected, speak]);

  const findCard = useCallback((id: string | null): Card | null => (id ? (state.tray.find((c) => c.id === id) ?? null) : null), [state]);
  const selectedCard = findCard(selected);
  useEffect(() => {
    if (selected && !findCard(selected)) setSelected(null);
  });

  const running = phase === 'play' ? roundScore(state.errors, state.fakeBinned) : 0;
  const score = rebuildScore(state) + running;
  const lastPart = state.parts[state.parts.length - 1];
  const banner: Banner | null =
    phase === 'roundDone'
      ? { kind: 'roundDone', round: state.round, points: lastPart?.points ?? 0 }
      : phase === 'over' && state.over === 'hearts'
        ? { kind: 'over' }
        : null;

  if (PROBE && typeof window !== 'undefined') Object.assign(window, { __rebuild: state, __rebuildUi: { overlay: overlayRef } });

  const sprites = useMemo(basketSprites, []);
  const actors = useMemo(
    () => (
      <>
        <BacAnActor />
        <StudentActor reaction={reaction} />
        <VillainActor stage={villain.stage} startedAt={villain.startedAt} reduced={reduced} timing={VILLAIN_TIMING} />
      </>
    ),
    [reaction, villain.stage, villain.startedAt, reduced],
  );
  const armed = playing && (!!selected || !!ghost);
  const flightSeconds = 0.7;

  const doPracticePlace = useCallback(() => {
    const lastCode = state.chain.length > 0 ? state.chain[state.chain.length - 1].code : state.deal.genesis;
    const targetCard = state.tray.find((c) => c.prev === lastCode && !c.isFake) || state.tray[0];
    if (!targetCard) return;
    const res = placeCard(state, targetCard.id);
    if (res.kind === 'ok') {
      sound.playPickup(true);
      setSelected(null);
      setSoiOpen(false);
      setSoiPracticed(true);
      react('cheer');
      setTutorialStep(6);
      bump();
    }
  }, [react, state]);

  const startRealGame = useCallback(() => {
    setTutorialActive(false);
    setSoiOpen(false);
    const fresh = createRebuild(newSeed());
    Object.assign(state, fresh);
    setSelected(null);
    setFresh(null);
    setSay(null);
    bump();
  }, [state]);

  const tutorialSteps: TutorialStep[] = useMemo(() => [
    {
      id: 'intro',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: fmt(tutorialTexts.man3.intro),
    },
    {
      id: 'chain',
      targetSelector: '#tutorial-man3-chain',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: tutorialTexts.man3.chain,
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'tray',
      targetSelector: '#tutorial-man3-tray',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: fmt(tutorialTexts.man3.tray),
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'basket',
      targetSelector: '#tutorial-man3-basket',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: tutorialTexts.man3.basket,
      nextLabel: tutorialTexts.chung.daHieu,
    },
    {
      id: 'soi',
      targetSelector: '#tutorial-man3-soi',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: tutorialTexts.man3.soi,
      nextLabel: tutorialTexts.chung.thuTinhNgay,
    },
    {
      id: 'practice',
      targetSelector: '#tutorial-man3-tray',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: tutorialTexts.man3.practice,
      interactive: true,
      hideNextButton: true,
    },
    {
      id: 'ready',
      title: fmt(tutorialTexts.man3.tieuDe),
      content: tutorialTexts.man3.correct,
    },
  ], []);

  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man3">
      <Scene25D
        background={BACKGROUND}
        sprites={sprites}
        quality={forced}
        hold={!warm}
        onReady={warmUp}
        onModeChange={onModeChange}
        overlay={
          <div ref={overlayRef} className="absolute inset-0 select-none" style={{ containerType: 'size' }} data-testid="man3-khung" data-phase={phase} data-villain={villain.stage} data-flying={villain.flying ? (villain.landed ? 'landed' : 'start') : 'no'}>
            <HudBar
              hearts={state.hearts}
              round={state.round}
              score={score}
              soiOpen={soiOpen}
              onSoi={() => {
                setSoiOpen((o) => !o);
                if (tutorialActive && tutorialStep === 5) {
                  setSoiPracticed(true);
                  setTutorialStep(6);
                }
              }}
              onOpenTutorial={() => {
                setTutorialActive(true);
                setTutorialStep(0);
                setSoiPracticed(false);
              }}
            />
            <p className="absolute rounded-nut bg-giay/90 px-[1cqw] py-[0.15cqw] font-bold text-chu" style={{ left: `${AREAS.chain.x0}cqw`, top: '10.2%', fontSize: 'max(1.45cqw, 11px)' }}>
              {rebuildUi.chuThich}
            </p>
            <div id="tutorial-man3-chain">
              <ChainRow slots={slots} width={width} genesis={state.deal.genesis} chain={state.chain} armed={armed} hover={hover === 'chain'} badFlash={badFlash} onActivate={activateChain} version={version} />
            </div>
            <div id="tutorial-man3-basket">
              <Basket armed={armed} hover={hover === 'basket'} onActivate={activateBasket} label={rebuildUi.roTrangGia} />
            </div>
            <div id="tutorial-man3-tray">
              <Tray cards={state.tray} width={width} selected={selected} shake={shake} fresh={fresh} freshIds={[]} dragId={ghost?.id ?? null} enabled={playing && !tutorialActive} bind={bind as (id: string) => Record<string, unknown>} onSelectKey={onTap} version={version} />
            </div>
            {villain.flying && <FlyingPage landed={villain.landed} width={width} seconds={flightSeconds} />}
            <DragGhost ghost={ghost} card={findCard(ghost?.id ?? null)} width={width} />
            <BiSay say={say} />
            {soiOpen && playing && <InspectPanel card={selectedCard} onClose={() => setSoiOpen(false)} />}
            {banner && (
              <div role="status" className="absolute flex flex-col items-center gap-2 rounded-[1.4cqw] border-[0.3cqw] border-nau-go bg-giay p-[1.6cqw] text-center" style={{ left: `${AREAS.mid.x0 + 8}cqw`, top: `${AREAS.mid.y0 + 3}%`, width: `${AREAS.mid.x1 - AREAS.mid.x0 - 16}cqw`, fontSize: 'max(1.9cqw, 13px)' }} data-testid="banner">
                <p className="font-display font-extrabold">
                  {banner.kind === 'over' ? rebuildUi.hetTim : fmt(rebuildUi.vongXong, { so: banner.round + 1, diem: banner.points })}
                </p>
                <Button
                  size="md"
                  className="min-h-11"
                  data-testid="nut-tiep"
                  onClick={() => {
                    if (banner.kind === 'over') {
                      finish();
                    } else {
                      advance(state);
                      setFresh(null);
                      setSay(null);
                      bump();
                    }
                  }}
                >
                  {banner.kind === 'over' ? rebuildUi.xemKetQua : rebuildUi.vongTiep}
                </Button>
              </div>
            )}
          </div>
        }
      >
        {actors}
      </Scene25D>

      <TutorialSpotlight
        isOpen={tutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={() => {
          if (tutorialStep < tutorialSteps.length - 1) {
            setTutorialStep((prev) => prev + 1);
          } else {
            startRealGame();
          }
        }}
        onPrev={() => {
          if (tutorialStep > 0) {
            setTutorialStep((prev) => prev - 1);
          }
        }}
        onSkip={startRealGame}
        actionButton={
          tutorialStep === tutorialSteps.length - 1
            ? {
                label: tutorialTexts.chung.batDauChoi,
                onClick: startRealGame,
                variant: 'primary',
              }
            : undefined
        }
      >
        {tutorialActive && tutorialStep === 5 && (
          <div data-tutorial-obstacle className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 pointer-events-auto">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setSoiOpen((o) => !o);
                sound.playClick();
              }}
              className="shadow-xl"
            >
              <span>🔍</span>
              <span>{rebuildUi.soiNut}</span>
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={doPracticePlace}
              className="shadow-xl animate-bounce"
            >
              <span>🧩</span>
              <span>{tutorialTexts.man3.ghepThu}</span>
            </Button>
          </div>
        )}
      </TutorialSpotlight>
    </div>
  );
}
