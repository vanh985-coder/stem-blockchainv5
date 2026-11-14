/** Đi lại trong thế giới mở /cho như người chơi: lái camera và phím tiến qua `walkApi`, theo đường của `roadGraph`. */
import type { VillageId } from '../village';
import type { WalkApi } from '../three/walkApi';
import { createRouter, type RouteStep } from '../three/world/roadGraph';
import type { assembleWorld } from '../three/world/worldLayout';
import type { WorldTarget } from '../three/world/worldTargets';
import { clickEl, pressKey, q, type Ctx } from './actions';
import { keyDown, keyTap, keyUp } from './keys';
import { turnToward } from './timing';
import { dismissGuideIfOpen, playVnDialogs } from './ui';

export interface DemoWorldState {
  api: WalkApi;
  world: ReturnType<typeof assembleWorld>;
  ready: boolean;
  inside: VillageId | null;
  entering: boolean;
  near: WorldTarget | null;
  dialogOpen: boolean;
  know: { village: VillageId; scroll?: number } | null;
  guideOpen: boolean;
  bigMap: boolean;
  seq: string;
  gated: boolean;
  nextBoard: number | null;
  knowMasks: Record<VillageId, number>;
}

export function demoWorld(): DemoWorldState | undefined {
  return (window as unknown as { __demoWorld?: DemoWorldState }).__demoWorld;
}

const frame = (ctx: Ctx): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame((t) => resolve(t))).then(async (t) => {
    await ctx.ctl.checkpoint();
    return t as number;
  });

/** Phím đi bộ đang giữ (W tiến, Shift chạy): bot đi bằng sự kiện bàn phím thật, chỉ riêng hướng nhìn (camera) đặt trực tiếp vì chuột xoay camera bị khóa chuột. */
const held = { forward: false, run: false };

function setWalkKeys(forward: boolean, run: boolean): void {
  if (forward !== held.forward) {
    held.forward = forward;
    if (forward) keyDown('KeyW');
    else keyUp('KeyW');
  }
  if (run !== held.run) {
    held.run = run;
    if (run) keyDown('ShiftLeft');
    else keyUp('ShiftLeft');
  }
}

function stopMoving(_api: WalkApi): void {
  setWalkKeys(false, false);
}

/** Chờ trang thế giới dựng xong (cảnh 3D sẵn sàng). */
export async function waitWorldReady(ctx: Ctx): Promise<DemoWorldState> {
  return ctx.ctl.waitFor(() => {
    const w = demoWorld();
    return w && w.ready && w.api.player ? w : null;
  }, 'world ready', 240000);
}

/** Bấm vào khung 3D một cái để khóa chuột (giả) như người chơi thật. */
export async function engageWorld(ctx: Ctx): Promise<void> {
  const w = await waitWorldReady(ctx);
  if (document.pointerLockElement) return;
  const canvas = q('canvas');
  if (canvas) await clickEl(ctx, canvas, { settle: 400 });
  await ctx.ctl.waitFor(() => document.pointerLockElement !== null || demoWorld()?.dialogOpen, 'pointer lock', 5000).catch(() => undefined);
  void w;
}

export interface WalkOpts {
  run?: boolean;
  /** Tới sát đích trong khoảng này (đơn vị cảnh) thì dừng */
  arrive?: number;
  /** Chế độ trọn: thay cách xử lý khi hộp thoại bật lên giữa đường (mặc định: lật hết hộp thoại) */
  onDialog?: () => Promise<void>;
}

/** Đi theo đường tới nút `nodeId` của đồ thị thế giới. Dừng chờ khi có hộp thoại hay đang vào làng. */
export async function walkToNode(ctx: Ctx, nodeId: string, opts: WalkOpts = {}): Promise<void> {
  const w = await waitWorldReady(ctx);
  const api = w.api;
  const router = createRouter(w.world.graph);
  router.setTarget(nodeId);
  const step: RouteStep = { x: 0, z: 0, remaining: 0, found: false };
  let last = performance.now();
  let stuckSince = performance.now();
  let stuckPos = { x: api.player?.x ?? 0, z: api.player?.z ?? 0 };
  let nudge = 0;
  try {
    for (;;) {
      const t = await frame(ctx);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const s = demoWorld();
      if (!s || !api.player) continue;
      if (s.dialogOpen || s.entering || s.guideOpen || s.know || s.bigMap || ctx.ctl.paused) {
        stopMoving(api);
        // Hộp thoại bật lên giữa đường (cảnh mở đầu làng...): xem hết rồi đi tiếp
        if (s.dialogOpen) await (opts.onDialog ? opts.onDialog() : playVnDialogs(ctx));
        else if (s.guideOpen) await dismissGuideIfOpen(ctx);
        stuckSince = performance.now();
        continue;
      }
      const p = api.player;
      router.next(p.x, p.z, step);
      if (!step.found) throw new Error(`no route to ${nodeId}`);
      if (step.remaining < (opts.arrive ?? 1.4)) return;
      const want = Math.atan2(step.x - p.x, step.z - p.z) + nudge;
      api.camera.yaw = turnToward(api.camera.yaw, want, 4.5 * dt);
      let diff = want - api.camera.yaw;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      setWalkKeys(Math.abs(diff) < 0.9, opts.run ?? true);
      // kẹt (đứng yên mà đang bấm tiến): nhảy và lệch hướng một lúc
      const moved = Math.hypot(p.x - stuckPos.x, p.z - stuckPos.z);
      if (moved > 0.4) {
        stuckPos = { x: p.x, z: p.z };
        stuckSince = performance.now();
        nudge = 0;
      } else if (performance.now() - stuckSince > 1500) {
        keyTap('Space');
        nudge = nudge === 0 ? 0.7 : -nudge;
        stuckSince = performance.now();
      }
    }
  } finally {
    stopMoving(api);
  }
}

/** Đi thẳng tới điểm (x, z) (đoạn cuối, khi đã gần). */
export async function walkToPoint(ctx: Ctx, x: number, z: number, arrive = 1.2, maxMs = 6000): Promise<void> {
  const w = await waitWorldReady(ctx);
  const api = w.api;
  const t0 = performance.now();
  let last = t0;
  try {
    for (;;) {
      const t = await frame(ctx);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const p = api.player;
      if (!p || demoWorld()?.dialogOpen) continue;
      if (Math.hypot(x - p.x, z - p.z) < arrive || performance.now() - t0 > maxMs) return;
      api.camera.yaw = turnToward(api.camera.yaw, Math.atan2(x - p.x, z - p.z), 5 * dt);
      setWalkKeys(true, false);
    }
  } finally {
    stopMoving(api);
  }
}

/** Đi tới nút rồi nhấn E khi vật tương tác gần nhất thỏa `match`; đi nhích thêm về phía vật nếu chưa đủ gần. */
export async function walkAndInteract(ctx: Ctx, nodeId: string, match: (t: WorldTarget) => boolean, at: { x: number; z: number }, opts: WalkOpts & { before?: () => Promise<void> } = {}): Promise<void> {
  await walkToNode(ctx, nodeId, opts);
  const near = () => {
    const n = demoWorld()?.near;
    return n && match(n) ? n : null;
  };
  if (!near()) await walkToPoint(ctx, at.x, at.z, 0.8, 5000);
  await ctx.ctl.waitFor(near, `near target for ${nodeId}`, 6000);
  await ctx.ctl.sleep(500);
  // chế độ trọn: đứng yên chờ cho đủ mức tối thiểu của đoạn trước
  if (opts.before) await opts.before();
  await pressKey(ctx, 'KeyE');
}

/**
 * Dịch chuyển bằng bản đồ lớn như người chơi: bấm M, bấm điểm đến (mã điểm: 'gate:det', 'scroll:lang-det:0'...), bấm "Đi tới". Mỗi bước dừng đủ lâu để người xem thấy thao tác.
 */
export async function teleportViaMap(ctx: Ctx, markerId: string, opts: { hold?: number } = {}): Promise<void> {
  const { ctl } = ctx;
  const hold = opts.hold ?? 1400;
  await waitWorldReady(ctx);
  // phím M bị bỏ qua khi thế giới đang bận (hiệu ứng mở cổng, trao trang, hộp thoại): chờ rảnh rồi bấm, không mở thì bấm lại
  await ctl.waitFor(() => {
    const w = demoWorld();
    return w && w.seq === 'idle' && !w.entering && !w.dialogOpen && !w.guideOpen && !w.know ? w : null;
  }, 'world idle before opening the map', 120000);
  for (let i = 0; i < 6 && !q('[data-testid="ban-do-lon"]'); i++) {
    await pressKey(ctx, 'KeyM');
    await ctl.sleep(1500);
  }
  await ctl.waitFor(() => q('[data-testid="ban-do-lon"]'), 'big map', 8000);
  await ctl.sleep(hold);
  const dot = await ctl.waitFor(() => q('[data-testid="teleport-' + markerId + '"]'), 'teleport marker ' + markerId, 8000);
  await clickEl(ctx, dot, { settle: hold });
  const go = await ctl.waitFor(() => q('[data-testid="nut-di-toi"]'), 'teleport confirm button', 8000);
  await clickEl(ctx, go, { settle: 300 });
  await ctl.waitFor(() => !q('[data-testid="ban-do-lon"]') && !q('[data-testid="fade-overlay"]'), 'map closed after teleport', 8000);
  await ctl.sleep(600);
}
