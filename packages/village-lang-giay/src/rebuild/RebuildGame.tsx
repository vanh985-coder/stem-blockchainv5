import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BiAvatar, Button, Hearts, fmt, rebuildUi, sound, useGameHint, useSettings, type MiniGameRenderProps, type ScorePart } from '@so-chung/core';
import { PROBE } from '@so-chung/core/lib/dev';
import { Scene25D, isQualityChoice, type QualityChoice, type Sprite25D } from '@so-chung/core/three/index';
import { REBUILD_KEEP as KEEP, REBUILD_SPEC as SPEC } from './rebuildConfig';
import { hintFor } from './rebuildHint';
import { BacAnActor, StudentActor, VillainActor, type Reaction } from './RebuildActors';
import { Basket, CardFace, ChainRow, DragGhost, KeepChainRow, Tray, slotOfTarget, useCardDrag, type DropTarget } from './RebuildCards';
import { AREAS, KEEP_VILLAIN_TIMING, REDUCED_MOTION_SCALE, VILLAIN_TIMING, cardHeight, cardWidth, center, villainStageAt, worldPoint, type VillainStage } from './rebuildLayout';
import {
  advance,
  beginKeep,
  binCard,
  binFromSlot,
  binFromTable,
  createRebuild,
  insertFake,
  inspectionLine,
  keepChainStatus,
  keepScoreNow,
  keepTimeLeft,
  placeCard,
  placeInSlot,
  rebuildScore,
  roundScore,
  scoreParts,
  stepKeep,
  type Card,
  type KeepEvent,
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

/** m:ss từ số giây còn lại. */
const clockText = (sec: number): string => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Thanh trên: tim, vòng, điểm, (vòng 3: đồng hồ 90 giây và thanh trạng thái chuỗi), nút "Soi công thức". */
function HudBar({ hearts, round, score, soiOpen, onSoi, clock, status }: { hearts: number; round: number; score: number; soiOpen: boolean; onSoi: () => void; clock: number | null; status: 'dung' | 'lech' | null }) {
  return (
    <div className="absolute flex items-center justify-between" style={{ left: `${AREAS.hud.x0}cqw`, right: `${100 - AREAS.hud.x1}cqw`, top: `${AREAS.hud.y0}%` }}>
      <div className="flex items-center gap-3 rounded-nut border-2 border-nau-go bg-giay/90 px-3 py-1" data-testid="hud">
        <Hearts current={hearts} max={SPEC.hearts} size="sm" />
        <span className="font-display text-base font-extrabold" data-testid="vong">
          {fmt(rebuildUi.vong, { so: round + 1, max: SPEC.rounds.length })}
        </span>
        <span className="font-display text-base font-extrabold" data-testid="diem">
          {fmt(rebuildUi.diem, { so: score })}
        </span>
        {clock !== null && (
          <span role="timer" aria-label={fmt(rebuildUi.dongHo, { giay: clock })} className={`rounded-nut border-2 px-2 font-display text-base font-extrabold tabular-nums ${clock <= 10 ? 'border-do-son bg-do-son/20 text-do-son-dam' : 'border-nau-go bg-giay'}`} data-testid="dong-ho" data-sec={clock}>
            {clockText(clock)}
          </span>
        )}
        {status && <ChainStatus status={status} />}
      </div>
      <Button size="sm" variant={soiOpen ? 'primary' : 'secondary'} onClick={onSoi} className="min-h-11" data-testid="nut-soi" aria-pressed={soiOpen}>
        {rebuildUi.soiNut}
      </Button>
    </div>
  );
}

/** Thanh trạng thái chuỗi của vòng 3 (nằm trong thanh trên): chỉ nói "Chuỗi đang lệch" hay "Chuỗi đúng", không chỉ ra ô nào lệch. */
function ChainStatus({ status }: { status: 'dung' | 'lech' }) {
  return (
    <span
      role="status"
      data-testid="trang-thai-chuoi"
      data-status={status}
      className={`rounded-nut border-2 px-2 font-display text-sm font-extrabold ${status === 'dung' ? 'border-xanh-la bg-xanh-la/20 text-xanh-la-dam' : 'border-do-son bg-do-son/20 text-do-son-dam'}`}
    >
      {status === 'dung' ? rebuildUi.chuoiDung : rebuildUi.chuoiLech}
    </span>
  );
}

/**
 * Dựng sẵn các thành phần lần đầu xuất hiện ở vòng 3 (bước X2b): đồng hồ đỏ, hai thanh trạng thái chuỗi, bong bóng lời của Bi, ô trống nhấp nháy và nháy đỏ, thẻ mới ném ra bàn,
 * thẻ rung, thẻ đang chọn, và bảng hết giờ. Cùng cách với thẻ kéo dựng sẵn (bước 14b): nằm ở góc dưới phải, gần như trong suốt (độ mờ 0,4%, chưa tới một mức màu) và không bắt chuột, để trình duyệt vẽ sẵn các lớp này (và nạp sẵn
 * chữ có dấu, hoạt ảnh CSS) lúc màn hình tải còn che cảnh, nên lần sửa thành công đầu tiên, gợi ý của Bi hay lúc hết giờ không phải vẽ lần đầu giữa lúc chơi.
 */
function KeepWarm({ width }: { width: number }) {
  const sample = { prev: 0, content: 0, code: 0 };
  return (
    <div aria-hidden="true" data-testid="giu-so-dung-san" className="pointer-events-none absolute" style={{ left: '56cqw', top: '70%', width: '40cqw', opacity: 0.004 }}>
      <div className="flex items-center gap-1">
        <span className="rounded-nut border-2 border-do-son bg-do-son/20 px-2 font-display text-base font-extrabold tabular-nums text-do-son-dam">0:09</span>
        <ChainStatus status="lech" />
        <ChainStatus status="dung" />
      </div>
      <div className="flex animate-toast-pop items-center gap-[1cqw]">
        <BiAvatar size={56} className="shrink-0" />
        <p className="rounded-[1.2cqw] border-[0.3cqw] border-muc-tim bg-giay px-[1.4cqw] py-[0.8cqw] font-display font-bold text-chu" style={{ fontSize: 'max(1.9cqw, 13px)' }}>
          {rebuildUi.biGoiYTrai} {rebuildUi.biSuaXong} {rebuildUi.biLechQua}
        </p>
      </div>
      <div className="flex gap-1">
        <CardFace card={sample} width={width * 0.6} mood="new" />
        <CardFace card={sample} width={width * 0.6} mood="shake" />
        <CardFace card={sample} width={width * 0.6} mood="selected" />
        <div className="relative animate-pulse rounded-[0.9cqw] border-[0.3cqw] border-dashed border-muc-tim bg-muc-tim/15" style={{ width: `${width * 0.6}cqw`, height: `${cardHeight(width * 0.6)}cqw` }}>
          <span className="absolute inset-0 animate-shake rounded-[0.9cqw] bg-do-son/35" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-[1.4cqw] border-[0.3cqw] border-nau-go bg-giay p-[1.6cqw] text-center" style={{ fontSize: 'max(1.9cqw, 13px)' }}>
        <p className="font-display font-extrabold">{fmt(rebuildUi.hetGio, { so: 3, sua: 12, lech: 0, diem: 300 })}</p>
        <Button size="md" tabIndex={-1}>
          {rebuildUi.xemKetQua}
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

type Banner = { kind: 'roundDone'; round: number; points: number; last: boolean } | { kind: 'keepDone'; round: number; points: number; fixed: number; left: number } | { kind: 'over' };

/** Nhãn một dòng điểm ở màn kết quả. */
function rowLabel(r: ScorePartRow): string {
  switch (r.key) {
    case 'vong':
      return fmt(rebuildUi.phanVong, { so: r.round + 1 });
    case 'trangGia':
      return fmt(rebuildUi.phanTrangGia, { so: r.round + 1 });
    case 'sua':
      return fmt(rebuildUi.phanSua, { so: r.round + 1, diem: KEEP.fixPoints });
    case 'nhanh':
      return fmt(rebuildUi.phanNhanh, { so: r.round + 1, giay: KEEP.fastWithin, diem: KEEP.fastBonus });
    case 'conLech':
      return fmt(rebuildUi.phanConLech, { so: r.round + 1, diem: KEEP.leftPenalty });
  }
}

/**
 * Màn 3 "Ghép lại cuốn sổ" (spec 05): Scene25D (nền xưởng giấy, rổ trang giả là hình rời, Bác An, học sinh và {phanDien} là model 3D) và lớp HTML phủ lên: thẻ trang kéo thả
 * (chuột, ngón tay) hoặc chạm chọn rồi chạm đặt, soi công thức, thanh trên. Luật nằm hết ở `rebuildLogic`; ở đây chỉ nối thao tác, hoạt cảnh và âm thanh vào luật.
 * Vòng 3 (giữ sổ 90 giây) chạy bằng vòng lặp `requestAnimationFrame` gọi `stepKeep`; {phanDien} chạy vào trước giờ tráo `KEEP_VILLAIN_TIMING.dropAt` giây để lần tráo rơi đúng lúc nó cười.
 */
export function RebuildGame({ paused, attempt, onFinish, setHint }: MiniGameRenderProps) {
  const { settings } = useSettings();
  const reduced = settings.reducedMotion;
  const forced = useMemo(forcedQuality, []);
  const state = useMemo<RebuildState>(() => createRebuild(newSeed()), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Nút "?": câu nhắc theo trạng thái ván (không lộ đáp án)
  useGameHint(setHint, () => hintFor(state));

  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<readonly string[]>([]);
  const [badFlash, setBadFlash] = useState(0);
  const [badSlot, setBadSlot] = useState<{ slot: number; n: number } | null>(null);
  const [say, setSay] = useState<Say | null>(null);
  const [reaction, setReaction] = useState<Reaction>({ kind: 'none', n: 0 });
  const [soiOpen, setSoiOpen] = useState(false);
  const [villain, setVillain] = useState<{ stage: VillainStage; startedAt: number; flying: boolean; landed: boolean }>({ stage: 'idle', startedAt: 0, flying: false, landed: false });
  const [clock, setClock] = useState<number>(KEEP.seconds);
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
  useEffect(() => {
    if (!badSlot) return;
    const t = setTimeout(() => setBadSlot(null), 700);
    return () => clearTimeout(t);
  }, [badSlot]);

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

  // Nạp trước các chuyển động đầu tiên khi màn hình tải còn che cảnh: học sinh buồn (sad), chỉ tay (point), vui (cheer); {phanDien} chạy (run), cười (cheer); rồi về đứng yên.
  // Lần đầu mỗi chuyển động tốn vài chục mili giây nên chạy thử trước, lúc em chưa nhìn thấy.
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
    setFreshIds([]);
    setBadFlash(0);
    setBadSlot(null);
    setSay(null);
    setReaction({ kind: 'none', n: 0 });
    setSoiOpen(false);
    setClock(KEEP.seconds);
    setVillain({ stage: 'idle', startedAt: 0, flying: false, landed: false });
  }, [state]);

  // {phanDien} chạy vào nhét trang giả (vòng 2): chạy vào → cười và thả trang → chạy ra → trang giả vào khay
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

  const keep = state.keep;
  const keepMode = keep !== null;
  const keepRunning = phase === 'keep' && !!keep?.running;
  const playing = (phase === 'play' || keepRunning) && !paused;
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
          speak(rebuildUi.biDuChuoi, 'tot');
          react('cheer');
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
    [hitHeartsOut, react, speak, state],
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

  // ----- Vòng 3: đặt trang thật vào ô trống, kéo trang vào rổ
  const doKeepPlace = useCallback(
    (id: string, slot: number) => {
      const r = placeInSlot(state, id, slot);
      if (r.kind === 'fixed') {
        sound.playPickup(true);
        setSelected(null);
        setFreshIds([]);
        speak(r.chainOk ? rebuildUi.biChuoiDungLai : fmt(rebuildUi.biSuaXong, { diem: r.points }), 'tot');
        react('cheer');
      } else if (r.kind === 'badPrev') {
        sound.playWrong();
        setShake((s) => ({ id, n: (s?.n ?? 0) + 1 }));
        setBadSlot((b) => ({ slot, n: (b?.n ?? 0) + 1 }));
        speak(rebuildUi.biSaiMaTruoc, 'xau');
        react('sad');
        hitHeartsOut();
      } else if (state.keep?.slots[slot]) {
        speak(rebuildUi.biOCoTrang, 'tin');
      }
      bump();
    },
    [hitHeartsOut, react, speak, state],
  );

  const doKeepBin = useCallback(
    (id: string) => {
      const slot = state.keep ? state.keep.slots.findIndex((c) => c?.id === id) : -1;
      const r = slot >= 0 ? binFromSlot(state, slot) : binFromTable(state, id);
      if (r.kind === 'binned') {
        sound.playCorrect();
        setSelected(null);
        speak(rebuildUi.biDaBat, 'tot');
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
      if (state.keep) {
        if (target === 'basket') doKeepBin(id);
        else if (slotOfTarget(target) >= 0 && state.tray.some((c) => c.id === id)) doKeepPlace(id, slotOfTarget(target));
        return;
      }
      if (target === 'chain') doPlace(id);
      else if (target === 'basket') doBin(id);
      // thả ra ngoài: thẻ về chỗ cũ, không phạt
    },
    [doBin, doKeepBin, doKeepPlace, doPlace, state],
  );
  const { ghost, hover, bind } = useCardDrag({ overlayRef, enabled: playing, onTap, onDrop });

  const activateChain = useCallback(() => {
    if (!playing) return;
    if (selected) doPlace(selected);
    else speak(rebuildUi.nhacChon, 'tin');
  }, [doPlace, playing, selected, speak]);
  const activateSlot = useCallback(
    (slot: number) => {
      if (!playing) return;
      if (selected && state.tray.some((c) => c.id === selected)) doKeepPlace(selected, slot);
      else speak(rebuildUi.nhacChon, 'tin');
    },
    [doKeepPlace, playing, selected, speak, state],
  );
  const activateBasket = useCallback(() => {
    if (!playing) return;
    if (selected) (state.keep ? doKeepBin : doBin)(selected);
    else speak(rebuildUi.nhacChon, 'tin');
  }, [doBin, doKeepBin, playing, selected, speak, state]);

  // Thẻ đang chọn hay đang kéo: ở khay (bàn), hoặc ở một ô của chuỗi (vòng 3)
  const findCard = useCallback((id: string | null): Card | null => (id ? (state.tray.find((c) => c.id === id) ?? state.keep?.slots.find((c) => c?.id === id) ?? null) : null), [state]);
  const selectedCard = findCard(selected);
  useEffect(() => {
    if (selected && !findCard(selected)) setSelected(null);
  });

  // ----- Vòng 3: đồng hồ và {phanDien} chạy vào tráo trang (vòng lặp requestAnimationFrame, không dùng useFrame nên không đụng cảnh 3D)
  const handleKeepEvents = useCallback(
    (events: readonly KeepEvent[]) => {
      for (const e of events) {
        if (e.kind === 'swap') {
          sound.playHit(true);
          setFreshIds([e.real.id, e.decoy.id]);
          setVillain((v) => ({ ...v, flying: false }));
        } else if (e.kind === 'overflow') {
          sound.playWrong();
          speak(fmt(rebuildUi.biLechQua, {}), 'xau');
          react('sad');
          hitHeartsOut();
        } else if (e.kind === 'hint') {
          speak(e.half === 'left' ? rebuildUi.biGoiYTrai : rebuildUi.biGoiYPhai, 'tin');
        } else {
          sound.playLevelComplete();
          setSelected(null);
          setSay(null);
          react(e.left === 0 ? 'cheer' : 'point');
        }
      }
      bump();
    },
    [hitHeartsOut, react, speak],
  );

  useEffect(() => {
    if (phase !== 'keep' || paused) return;
    const k = reduced ? REDUCED_MOTION_SCALE : 1;
    const T = KEEP_VILLAIN_TIMING;
    let raf = 0;
    let last = performance.now();
    let engaged = -1; // giờ tráo mà nhịp chạy vào hiện tại phục vụ
    let animStart = 0;
    let stage: VillainStage = 'idle';
    let thrown = false;
    let shownClock = -1;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const kp = state.keep;
      if (!kp || state.phase !== 'keep' || !kp.running) return;
      const events = stepKeep(state, dt);
      if (events.length > 0) handleKeepEvents(events);
      if (state.phase !== 'keep') {
        setVillain({ stage: 'idle', startedAt: 0, flying: false, landed: false });
        return;
      }
      const left = Math.ceil(keepTimeLeft(kp));
      if (left !== shownClock) {
        shownClock = left;
        setClock(left);
      }
      // {phanDien} bắt đầu chạy vào khi còn `dropAt` giây nữa tới giờ tráo (vào giữa chừng nếu đang tạm dừng rồi tiếp tục)
      const toSwap = kp.nextSwapAt - kp.elapsed;
      if (engaged !== kp.nextSwapAt && kp.nextSwapAt <= KEEP.seconds - KEEP.noSwapLast && toSwap <= T.dropAt * k) {
        engaged = kp.nextSwapAt;
        animStart = now - (T.dropAt * k - toSwap) * 1000;
        thrown = false;
        stage = 'idle';
        sound.playWhoosh();
      }
      if (engaged >= 0 && stage !== 'gone') {
        const t = (now - animStart) / 1000;
        const next = villainStageAt(t, k, T);
        if (next !== stage) {
          stage = next;
          setVillain((v) => ({ stage: next, startedAt: animStart, flying: next === 'gone' ? false : v.flying, landed: v.landed }));
        }
        if (!thrown && t >= T.enterEnd * k) {
          thrown = true;
          setVillain((v) => ({ ...v, flying: true, landed: false }));
          requestAnimationFrame(() => setVillain((v) => ({ ...v, landed: true })));
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setVillain({ stage: 'idle', startedAt: 0, flying: false, landed: false });
    };
  }, [phase, paused, reduced, state, handleKeepEvents]);

  const running = phase === 'play' ? roundScore(state.errors, state.fakeBinned) : phase === 'keep' && keep ? keepScoreNow(keep) : 0;
  const score = rebuildScore(state) + running;
  const lastPart = state.parts[state.parts.length - 1];
  const banner: Banner | null =
    phase === 'roundDone' && keep
      ? { kind: 'keepDone', round: state.round, points: lastPart?.points ?? 0, fixed: lastPart?.keep?.fixed ?? 0, left: lastPart?.keep?.left ?? 0 }
      : phase === 'roundDone'
        ? { kind: 'roundDone', round: state.round, points: lastPart?.points ?? 0, last: state.round >= SPEC.rounds.length - 1 }
        : phase === 'over'
          ? { kind: 'over' }
          : null;
  const intro = phase === 'keep' && !!keep && !keep.running;

  if (PROBE) Object.assign(window, { __rebuild: state, __rebuildUi: { overlay: overlayRef } });

  const sprites = useMemo(basketSprites, []);
  // Nhân vật 3D chỉ dựng lại khi phản ứng hay giai đoạn của {phanDien} đổi, không dựng lại mỗi lần kéo thẻ (mỗi lần kéo là một lần vẽ lại lớp thẻ HTML)
  const actors = useMemo(
    () => (
      <>
        <BacAnActor />
        <StudentActor reaction={reaction} />
        <VillainActor stage={villain.stage} startedAt={villain.startedAt} reduced={reduced} timing={keepMode ? KEEP_VILLAIN_TIMING : VILLAIN_TIMING} />
      </>
    ),
    [reaction, villain.stage, villain.startedAt, reduced, keepMode],
  );
  const armed = playing && (!!selected || !!ghost);
  const flightSeconds = keepMode ? (KEEP_VILLAIN_TIMING.dropAt - KEEP_VILLAIN_TIMING.enterEnd) * (reduced ? REDUCED_MOTION_SCALE : 1) : 0.7;

  return (
    <div className="fixed inset-0 select-none bg-black" data-testid="man3">
      <Scene25D
        background={BACKGROUND}
        sprites={sprites}
        quality={forced}
        hold={!warm}
        onReady={warmUp}
        overlay={
          <div ref={overlayRef} className="absolute inset-0 select-none" style={{ containerType: 'size' }} data-testid="man3-khung" data-phase={phase} data-villain={villain.stage} data-flying={villain.flying ? (villain.landed ? 'landed' : 'start') : 'no'}>
            <HudBar hearts={state.hearts} round={state.round} score={score} soiOpen={soiOpen} onSoi={() => setSoiOpen((o) => !o)} clock={keepMode ? clock : null} status={keep ? keepChainStatus(keep) : null} />
            <p className="absolute rounded-nut bg-giay/90 px-[1cqw] py-[0.15cqw] font-bold text-chu" style={{ left: `${AREAS.chain.x0}cqw`, top: '10.2%', fontSize: 'max(1.45cqw, 11px)' }}>
              {rebuildUi.chuThich}
            </p>
            {keep ? (
              <>
                <KeepChainRow
                  width={width}
                  genesis={state.deal.genesis}
                  slots={keep.slots}
                  selected={selected}
                  shake={shake}
                  dragId={ghost?.id ?? null}
                  enabled={playing}
                  armed={armed}
                  hoverSlot={slotOfTarget(hover)}
                  badSlot={badSlot}
                  bind={bind as (id: string) => Record<string, unknown>}
                  onSelectKey={onTap}
                  onSlotActivate={activateSlot}
                  version={version}
                />
              </>
            ) : (
              <ChainRow slots={slots} width={width} genesis={state.deal.genesis} chain={state.chain} armed={armed} hover={hover === 'chain'} badFlash={badFlash} onActivate={activateChain} version={version} />
            )}
            <Basket armed={armed} hover={hover === 'basket'} onActivate={activateBasket} label={rebuildUi.roTrangGia} />
            <Tray cards={state.tray} width={width} selected={selected} shake={shake} fresh={fresh} freshIds={freshIds} dragId={ghost?.id ?? null} enabled={playing} bind={bind as (id: string) => Record<string, unknown>} onSelectKey={onTap} version={version} />
            {villain.flying && <FlyingPage landed={villain.landed} width={width} seconds={flightSeconds} />}
            <KeepWarm width={width} />
            <DragGhost ghost={ghost} card={findCard(ghost?.id ?? null)} width={width} />
            <BiSay say={say} />
            {soiOpen && playing && <InspectPanel card={selectedCard} onClose={() => setSoiOpen(false)} />}
            {intro && (
              <div role="dialog" aria-label={fmt(rebuildUi.giuSoTieuDe, { so: state.round + 1 })} className="absolute z-20 flex flex-col items-center gap-2 rounded-[1.4cqw] border-[0.3cqw] border-nau-go bg-giay p-[1.6cqw] text-center" style={{ left: `${AREAS.mid.x0 + 4}cqw`, top: `${AREAS.mid.y0 + 1}%`, width: `${AREAS.mid.x1 - AREAS.mid.x0 - 8}cqw`, fontSize: 'max(1.7cqw, 12px)' }} data-testid="giu-so-gioi-thieu">
                <p className="font-display font-extrabold" style={{ fontSize: 'max(2cqw, 14px)' }}>
                  {fmt(rebuildUi.giuSoTieuDe, { so: state.round + 1 })}
                </p>
                <p>{fmt(rebuildUi.giuSoLoi, { giay: KEEP.seconds, nhanh: KEEP.fastWithin })}</p>
                <p className="font-bold text-nau-go-dam" data-testid="bac-an-dong-vien">
                  {rebuildUi.bacAnDongVien}
                </p>
                <Button
                  size="md"
                  className="min-h-11"
                  data-testid="nut-bat-dau-giu-so"
                  onClick={() => {
                    beginKeep(state);
                    bump();
                  }}
                >
                  {rebuildUi.giuSoBatDau}
                </Button>
              </div>
            )}
            {banner && (
              <div role="status" className="absolute flex flex-col items-center gap-2 rounded-[1.4cqw] border-[0.3cqw] border-nau-go bg-giay p-[1.6cqw] text-center" style={{ left: `${AREAS.mid.x0 + 8}cqw`, top: `${AREAS.mid.y0 + 3}%`, width: `${AREAS.mid.x1 - AREAS.mid.x0 - 16}cqw`, fontSize: 'max(1.9cqw, 13px)' }} data-testid="banner">
                <p className="font-display font-extrabold">
                  {banner.kind === 'over' ? rebuildUi.hetTim : banner.kind === 'keepDone' ? fmt(rebuildUi.hetGio, { so: banner.round + 1, sua: banner.fixed, lech: banner.left, diem: banner.points }) : fmt(rebuildUi.vongXong, { so: banner.round + 1, diem: banner.points })}
                </p>
                <Button
                  size="md"
                  className="min-h-11"
                  data-testid="nut-tiep"
                  onClick={() => {
                    if (banner.kind === 'over') finish();
                    else if (banner.kind === 'keepDone' || banner.last) {
                      advance(state);
                      bump();
                      finish();
                    } else {
                      advance(state);
                      setFresh(null);
                      setSay(null);
                      bump();
                    }
                  }}
                >
                  {banner.kind === 'over' || banner.kind === 'keepDone' || banner.last ? rebuildUi.xemKetQua : rebuildUi.vongTiep}
                </Button>
              </div>
            )}
          </div>
        }
      >
        {actors}
      </Scene25D>
    </div>
  );
}
