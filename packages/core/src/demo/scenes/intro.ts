/** Cảnh mở đầu: trang chủ, cốt truyện, chợ, đi bộ tới Làng Giấy và nhặt 4 thẻ "Em có biết?". */
import { ui } from '../../content/ui';
import { scrollNodeId } from '../../three/village/scrollTargets';
import { gateNodeId } from '../../three/world/worldLayout';
import { clickEl, q, type Ctx } from '../actions';
import { answerKnowCard, buttonByText, dismissGuideIfOpen, playVnDialogs } from '../ui';
import { demoWorld, engageWorld, walkAndInteract, walkToNode, waitWorldReady } from '../world';

const onPath = (prefix: string) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`);

/** Trang chủ → Chơi thử → cốt truyện 14 trang → vào chợ. */
export async function gioiThieu(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  if (location.pathname === '/' || location.pathname === '') {
    await ctl.sleep(2500);
    const btn = await ctl.waitFor(() => buttonByText(ui.trangChu.choiThu), 'play-as-guest button', 15000);
    await clickEl(ctx, btn, { settle: 800 });
  }
  if (onPath('/truyen')) {
    await playVnDialogs(ctx);
  }
  await ctl.waitFor(() => onPath('/cho'), 'market page', 30000);
  await waitWorldReady(ctx);
}

/** Ở chợ: xem hướng dẫn tự mở, đi bộ theo mũi tên nhiệm vụ qua cổng vào Làng Giấy, xem cảnh mở đầu làng. */
export async function choDenLangGiay(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await waitWorldReady(ctx);
  await ctl.sleep(1500);
  await dismissGuideIfOpen(ctx);
  await engageWorld(ctx);
  await ctl.sleep(1200);
  await walkToNode(ctx, gateNodeId('giay'));
  const first = demoWorld()?.world.villages.find((v) => v.id === 'lang-giay')?.layout.scrolls?.[0];
  if (!first) throw new Error('no scrolls in lang-giay');
  await walkToNode(ctx, scrollNodeId('lang-giay', first.index));
  await ctl.waitFor(() => demoWorld()?.inside === 'lang-giay', 'inside lang-giay', 30000);
  await playVnDialogs(ctx);
}

/** Nhặt đủ thẻ trong làng (gần nhất trước), trả lời đúng câu hỏi của từng thẻ. */
export async function giayThe(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const w0 = await waitWorldReady(ctx);
  if (w0.inside !== 'lang-giay') throw new Error('not inside lang-giay');
  await engageWorld(ctx);
  const village = w0.world.villages.find((v) => v.id === 'lang-giay');
  const scrolls = village?.layout.scrolls ?? [];
  const got = (mask: number, i: number) => (mask & (1 << i)) !== 0;
  for (;;) {
    const w = demoWorld();
    if (!w) throw new Error('world gone');
    const left = scrolls.filter((s) => !got(w.knowMasks['lang-giay'] ?? 0, s.index));
    if (left.length === 0) break;
    const p = w.api.player;
    left.sort((a, b) => Math.hypot(a.x - (p?.x ?? 0), a.z - (p?.z ?? 0)) - Math.hypot(b.x - (p?.x ?? 0), b.z - (p?.z ?? 0)));
    const s = left[0];
    await walkAndInteract(ctx, scrollNodeId('lang-giay', s.index), (t) => t.kind === 'scroll' && t.index === s.index, { x: s.x, z: s.z });
    await ctl.waitFor(() => demoWorld()?.know?.scroll === s.index, `know dialog ${s.index}`, 5000);
    await answerKnowCard(ctx, 'lang-giay', s.index);
    await ctl.waitFor(() => demoWorld()?.know === null, 'know closed', 5000);
    await ctl.sleep(900);
  }
  void q;
}
