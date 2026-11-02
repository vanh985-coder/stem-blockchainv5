/**
 * Vẽ bàn trứng của màn 9 bằng canvas 2D (không three.js). Mọi thứ đổi theo thời gian nằm trong `BubbleView` (cấp phát sẵn một lần, kể cả bể hiệu ứng `fx`):
 * vòng vẽ `drawBubble` và `stepView` không tạo đối tượng mới. Vạch ngắm được tính lại ở `refreshAim` (gọi khi đổi góc hay đổi bàn), không phải ở vòng vẽ.
 */
import { BUBBLE_SPEC } from './bubbleConfig';
import { eggImageIndex, SpriteCache, type BubbleImages } from './bubbleArt';
import { LAUNCHER_ART, eggFontPx, frameRect, type Fit } from './bubbleLayout';
import { cellCenter, launcherPoint, planOf, pointAlong, tracePath, type BubbleEvent, type BubbleState, type Point } from './bubbleLogic';

const FX_POOL = 160;
const GRAVITY = 46;

export interface Fx {
  on: boolean;
  /** 0: trứng vỡ (to ra rồi mờ); 1: trứng rơi (rơi xuống, xoay) */
  kind: 0 | 1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  v: number;
}

export interface BubbleView {
  fx: Fx[];
  /** Góc ngắm hiện tại (độ) */
  aim: number;
  /** Vạch ngắm: máy bắn tới lần nảy tường đầu tiên (hay tới chỗ dừng) */
  aimPts: Point[];
  /** Số hàng tấm trần đang hiển thị (chạy dần tới `state.lowered`) */
  lowerShown: number;
  /** Quãng đường trứng đã bay (đơn vị trứng) */
  flyDist: number;
  /** Thời gian rung bàn còn lại (giây) khi mất tim */
  shake: number;
  reduced: boolean;
  time: number;
}

export function createView(reduced: boolean): BubbleView {
  const fx: Fx[] = [];
  for (let i = 0; i < FX_POOL; i++) fx.push({ on: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, v: 0 });
  return { fx, aim: 90, aimPts: [], lowerShown: 0, flyDist: 0, shake: 0, reduced, time: 0 };
}

/** Tính lại vạch ngắm (đoạn đầu của đường bay) theo góc `view.aim` và bàn hiện tại */
export function refreshAim(view: BubbleView, state: BubbleState): void {
  view.aimPts = tracePath(state, view.aim, 1);
}

function spawn(view: BubbleView, kind: 0 | 1, x: number, y: number, v: number, vx: number, vy: number, life: number): void {
  for (const f of view.fx) {
    if (f.on) continue;
    f.on = true;
    f.kind = kind;
    f.x = x;
    f.y = y;
    f.vx = vx;
    f.vy = vy;
    f.t = 0;
    f.life = life;
    f.v = v;
    return;
  }
}

const tmp: Point = { x: 0, y: 0 };

/** Đổi các sự kiện của một lần trứng chạm bàn thành hiệu ứng (không có hiệu ứng khi "Giảm chuyển động") */
export function spawnFx(view: BubbleView, state: BubbleState, ev: readonly BubbleEvent[]): void {
  const lowered = state.lowered - (ev.some((e) => e.type === 'descend') ? 1 : 0);
  for (const e of ev) {
    if (e.type === 'heart') view.shake = view.reduced ? 0 : 0.5;
    if (view.reduced) continue;
    if (e.type === 'pop') {
      for (const c of e.cells) {
        cellCenter(state.shift, c.r, c.c, tmp, lowered);
        spawn(view, 0, tmp.x, tmp.y, e.value, 0, 0, 0.32);
      }
    } else if (e.type === 'drop') {
      for (const c of e.cells) {
        cellCenter(state.shift, c.r, c.c, tmp, lowered);
        spawn(view, 1, tmp.x, tmp.y, c.value, (c.c % 3 - 1) * 1.2, -4, 1.1);
      }
    }
  }
}

export function stepView(view: BubbleView, state: BubbleState, dt: number): void {
  view.time += dt;
  if (view.shake > 0) view.shake = Math.max(0, view.shake - dt);
  const target = state.lowered;
  if (view.reduced || Math.abs(view.lowerShown - target) < 0.002) view.lowerShown = target;
  else view.lowerShown += (target - view.lowerShown) * Math.min(1, dt * 7);
  if (state.flying) view.flyDist = Math.min(state.flying.length, view.flyDist + BUBBLE_SPEC.speed * dt);
  for (const f of view.fx) {
    if (!f.on) continue;
    f.t += dt;
    if (f.t >= f.life) {
      f.on = false;
      continue;
    }
    if (f.kind === 1) {
      f.vy += GRAVITY * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
  }
}

/** Dọn mọi hiệu ứng đang chạy (ván mới, rời màn) */
export function resetView(view: BubbleView): void {
  for (const f of view.fx) f.on = false;
  view.flyDist = 0;
  view.shake = 0;
  view.lowerShown = 0;
}

export interface DrawCtx {
  g: CanvasRenderingContext2D;
  cw: number;
  ch: number;
  dpr: number;
  fit: Fit;
  art: BubbleImages;
  sprites: SpriteCache;
}

const WOOD = '#8a5a2b';
const WOOD_DARK = '#5a3716';

function sprite(d: DrawCtx, v: number): HTMLCanvasElement | null {
  const px = d.fit.scale * d.dpr;
  return d.sprites.get(v, px, eggFontPx(d.fit.scale) * d.dpr, d.art.trung[eggImageIndex(v)]);
}

function putEgg(d: DrawCtx, x: number, y: number, v: number, alpha = 1, scale = 1): void {
  const sp = sprite(d, v);
  if (!sp) return;
  const side = (sp.width / d.dpr) * scale;
  d.g.globalAlpha = alpha;
  d.g.drawImage(sp, d.fit.ox + x * d.fit.scale - side / 2, d.fit.oy + y * d.fit.scale - side / 2, side, side);
  d.g.globalAlpha = 1;
}

export function drawBubble(d: DrawCtx, state: BubbleState, view: BubbleView): void {
  const { g, fit } = d;
  const S = fit.scale;
  g.setTransform(d.dpr, 0, 0, d.dpr, 0, 0);
  g.imageSmoothingQuality = 'high'; // ảnh gốc lớn gấp nhiều lần cỡ hiển thị: thu nhỏ chất lượng cao để khung, máy bắn, trứng vỡ không răng cưa
  g.clearRect(0, 0, d.cw, d.ch);
  const shakeX = view.shake > 0 ? Math.sin(view.time * 70) * 0.12 * S * (view.shake / 0.5) : 0;
  g.save();
  g.translate(shakeX, 0);
  const X = (x: number) => fit.ox + x * S;
  const Y = (y: number) => fit.oy + y * S;

  // khung bàn
  if (d.art.khung) {
    // lòng khung trong suốt: phủ một lớp tối mờ để nền sân đình không làm rối bàn, rồi vẽ khung đều tỉ lệ ảnh (lòng khớp vùng chơi)
    g.fillStyle = 'rgba(40,24,10,0.3)';
    g.fillRect(fit.ox, fit.oy, fit.w, fit.h);
    const fr = frameRect(fit);
    g.drawImage(d.art.khung, fr.x, fr.y, fr.w, fr.h);
  } else {
    g.fillStyle = 'rgba(255,243,208,0.92)';
    g.strokeStyle = WOOD_DARK;
    g.lineWidth = Math.max(3, S * 0.12);
    g.beginPath();
    g.roundRect(fit.ox - 0.1 * S, fit.oy - 0.1 * S, fit.w + 0.2 * S, fit.h + 0.2 * S, S * 0.45);
    g.fill();
    g.stroke();
  }

  // tấm trần (hạ dần)
  const plate = (0.28 + view.lowerShown * BUBBLE_SPEC.rowH) * S;
  g.fillStyle = WOOD;
  g.beginPath();
  g.roundRect(fit.ox, fit.oy, fit.w, plate, [S * 0.35, S * 0.35, S * 0.1, S * 0.1]);
  g.fill();
  g.fillStyle = WOOD_DARK;
  g.fillRect(fit.ox, fit.oy + plate - Math.max(2, S * 0.08), fit.w, Math.max(2, S * 0.08));

  // dây giới hạn
  const lineY = Y(BUBBLE_SPEC.limitRow * BUBBLE_SPEC.rowH);
  g.strokeStyle = '#c0392b';
  g.lineWidth = Math.max(2.5, S * 0.09);
  g.setLineDash([S * 0.35, S * 0.22]);
  g.beginPath();
  g.moveTo(fit.ox + S * 0.1, lineY);
  g.lineTo(fit.ox + fit.w - S * 0.1, lineY);
  g.stroke();
  g.setLineDash([]);

  // trứng trên bàn
  const lowered = view.lowerShown;
  for (let r = 0; r < state.board.length; r++) {
    const row = state.board[r];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null) continue;
      cellCenter(state.shift, r, c, tmp, lowered);
      putEgg(d, tmp.x, tmp.y, v);
    }
  }

  // vạch ngắm
  const l = launcherPoint();
  const canShoot = state.phase === 'play' && !state.flying && state.selected !== null;
  const pts = view.aimPts;
  if (state.phase === 'play' && pts.length > 1) {
    g.strokeStyle = canShoot ? 'rgba(60,35,10,0.85)' : 'rgba(60,35,10,0.35)';
    g.lineWidth = Math.max(2, S * 0.07);
    g.setLineDash([S * 0.25, S * 0.25]);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(X(pts[0].x), Y(pts[0].y));
    for (let i = 1; i < pts.length; i++) g.lineTo(X(pts[i].x), Y(pts[i].y));
    g.stroke();
    g.setLineDash([]);
    const end = pts[pts.length - 1];
    g.strokeStyle = canShoot ? 'rgba(60,35,10,0.6)' : 'rgba(60,35,10,0.25)';
    g.lineWidth = Math.max(1.5, S * 0.05);
    g.beginPath();
    g.arc(X(end.x), Y(end.y), S * 0.45, 0, Math.PI * 2);
    g.stroke();
  }

  // máy bắn
  const a = (view.aim * Math.PI) / 180;
  g.save();
  g.translate(X(l.x), Y(l.y));
  if (!d.art.may) {
    g.fillStyle = WOOD_DARK;
    g.beginPath();
    g.ellipse(0, S * 0.45, S * 1.35, S * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = WOOD;
    g.beginPath();
    g.ellipse(0, S * 0.38, S * 1.2, S * 0.4, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.rotate(Math.PI / 2 - a);
  if (d.art.may) {
    // giữ tỉ lệ ảnh; tâm xoay là túi da giữ trứng (trùng điểm đặt trứng đã chọn)
    const mh = LAUNCHER_ART.height * S;
    const mw = mh * LAUNCHER_ART.aspect;
    g.drawImage(d.art.may, -mw / 2, -mh * LAUNCHER_ART.pivotY, mw, mh);
  } else {
    g.fillStyle = WOOD_DARK;
    g.beginPath();
    g.roundRect(-S * 0.3, -S * 1.45, S * 0.6, S * 1.45, S * 0.15);
    g.fill();
    g.fillStyle = WOOD;
    g.beginPath();
    g.roundRect(-S * 0.2, -S * 1.4, S * 0.4, S * 1.3, S * 0.1);
    g.fill();
  }
  g.restore();
  // trứng đã nạp trong máy bắn
  if (state.phase === 'play' && !state.flying) {
    if (state.selected !== null) putEgg(d, l.x, l.y, planOf(state).values[state.selected]);
    else {
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = Math.max(2, S * 0.07);
      g.setLineDash([S * 0.15, S * 0.15]);
      g.beginPath();
      g.arc(X(l.x), Y(l.y), S * 0.42, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  }

  // trứng đang bay
  if (state.flying) {
    pointAlong(state.flying.path, view.flyDist, tmp);
    putEgg(d, tmp.x, tmp.y, state.flying.value);
  }

  // hiệu ứng
  for (const f of view.fx) {
    if (!f.on) continue;
    const k = f.t / f.life;
    if (f.kind === 0) {
      putEgg(d, f.x, f.y, f.v, 1 - k, 1 + k * 0.35);
      if (d.art.vo) {
        const side = S * (0.9 + k * 0.8);
        g.globalAlpha = 1 - k;
        g.drawImage(d.art.vo, X(f.x) - side / 2, Y(f.y) - side / 2, side, side);
        g.globalAlpha = 1;
      } else {
        g.strokeStyle = '#ffffff';
        g.globalAlpha = 1 - k;
        g.lineWidth = Math.max(2, S * 0.08);
        g.beginPath();
        g.arc(X(f.x), Y(f.y), S * (0.4 + k * 0.7), 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
    } else {
      putEgg(d, f.x, f.y, f.v, Math.min(1, 2 - 2 * k));
    }
  }
  g.restore();
}
