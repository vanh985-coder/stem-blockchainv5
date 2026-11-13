/** Việc chung của các làng sau Làng Giấy ở chế độ trọn: dịch chuyển bằng bản đồ, vào làng, nhặt thẻ, vào màn từ biển. */
import { scrollNodeId } from '../../three/village/scrollTargets';
import type { VillageId } from '../../village';
import { pressKey, q, type Ctx } from '../actions';
import { answerKnowCard, playVnDialogs } from '../ui';
import { demoWorld, engageWorld, teleportViaMap, waitWorldReady, walkToNode, walkToPoint } from '../world';
import { onPath } from '../scenes/common';
import { beginSeg, endSeg, markSeg } from './marks';

/** Hệ số nhịp đọc và trả lời thẻ ở ba làng sau (nhanh gấp 1,5 lần Làng Giấy) */
export const CARD_SPEED = 1.5;

export const hold = (ctx: Ctx) => () => endSeg(ctx);

/** Chờ vật tương tác gần nhất là `kind` (đi nhích tới điểm nếu chưa đủ gần), rồi nhấn E. */
async function interactHere(ctx: Ctx, kind: 'scroll' | 'board', at: { x: number; z: number }, before?: () => Promise<void>): Promise<void> {
  const near = () => demoWorld()?.near?.kind === kind;
  if (!near()) await walkToPoint(ctx, at.x, at.z, 0.8, 5000);
  await ctx.ctl.waitFor(near, 'near ' + kind, 6000);
  await ctx.ctl.sleep(500);
  if (before) await before();
  await pressKey(ctx, 'KeyE');
}

/** D01 / K01 / B01: bản đồ lớn, chọn cổng, "Đi tới"; rồi đi bộ vào làng để xem cảnh mở đầu (đoạn `introCode`). */
export async function tronEnterVillage(ctx: Ctx, village: VillageId, gateId: string, teleCode: string, introCode: string): Promise<void> {
  const w0 = await waitWorldReady(ctx);
  await engageWorld(ctx);
  await endSeg(ctx);
  markSeg(teleCode);
  await teleportViaMap(ctx, 'gate:' + gateId);
  const first = w0.world.villages.find((v) => v.id === village)?.layout.scrolls?.[0];
  if (!first) throw new Error('no scrolls in ' + village);
  const onDialog = async () => {
    await beginSeg(ctx, introCode);
    await playVnDialogs(ctx, { beforeLast: hold(ctx) });
  };
  await walkToNode(ctx, scrollNodeId(village, first.index), { run: false, onDialog });
  await ctx.ctl.waitFor(() => demoWorld()?.inside === village, 'inside ' + village, 30000);
  if (demoWorld()?.dialogOpen) await onDialog();
}

/** Nhặt 4 thẻ của làng: dịch chuyển bằng bản đồ tới từng cuộn, nhấn E, đọc và trả lời nhanh gấp 1,5 lần. Một mã đoạn cho cả bốn thẻ (`code`), giữ mức tối thiểu ở thẻ cuối. */
export async function tronTeleportCards(ctx: Ctx, village: VillageId, code: string): Promise<void> {
  const { ctl } = ctx;
  const w0 = await waitWorldReady(ctx);
  const scrolls = [...(w0.world.villages.find((v) => v.id === village)?.layout.scrolls ?? [])].sort((a, b) => a.index - b.index);
  const saved = ctl.speed;
  for (let i = 0; i < scrolls.length; i++) {
    const s = scrolls[i];
    await teleportViaMap(ctx, 'scroll:' + village + ':' + s.index);
    await interactHere(ctx, 'scroll', { x: s.x, z: s.z });
    await ctl.waitFor(() => demoWorld()?.know?.scroll === s.index, 'know dialog ' + s.index, 5000);
    if (i === 0) markSeg(code);
    ctl.speed = CARD_SPEED;
    try {
      await answerKnowCard(ctx, village, s.index, i === scrolls.length - 1 ? { beforeStash: hold(ctx) } : {});
    } finally {
      ctl.speed = saved;
    }
    await ctl.waitFor(() => demoWorld()?.know === null, 'know closed', 5000);
    await ctl.sleep(600);
  }
}

/** Vào màn `level` từ biển: bản đồ lớn chọn biển, "Đi tới", nhấn E. `before` chạy ngay trước khi nhấn E. */
export async function tronEnterLevel(ctx: Ctx, village: VillageId, level: number, before?: () => Promise<void>): Promise<void> {
  const path = '/lang/' + village + '/man/' + level;
  if (onPath(path)) return;
  const w = await waitWorldReady(ctx);
  await engageWorld(ctx);
  const board = w.world.villages.find((v) => v.id === village)?.layout.boards.find((b) => b.level === level);
  if (!board) throw new Error('no board for level ' + level);
  await teleportViaMap(ctx, 'board:' + village + ':' + level);
  await interactHere(ctx, 'board', { x: board.x, z: board.z }, before);
  await ctx.ctl.waitFor(() => onPath(path), 'route ' + path, 15000);
}

void q;
