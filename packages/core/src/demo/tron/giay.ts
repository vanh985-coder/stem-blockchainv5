/** Chế độ trọn: phần mở đầu (S01 đến S03) và Làng Giấy (G01 đến G15). Mỗi đoạn ghi mốc đúng lúc hình hiện ra và giữ mức tối thiểu trước khi sang đoạn sau. */
import { bai1Texts } from '../../content/lessons/bai-1';
import { ui } from '../../content/ui';
import { huongDan } from '../../content/huongDan';
import { scrollNodeId } from '../../three/village/scrollTargets';
import { gateNodeId } from '../../three/world/worldLayout';
import { clickEl, dragEl, q, type Ctx } from '../actions';
import { buttonByText, dwell, playVnDialogs, answerKnowCard } from '../ui';
import { demoWorld, engageWorld, walkAndInteract, walkToNode, waitWorldReady } from '../world';
import { driveLesson, answerReflection, lessonStage, skipTutorial } from '../scenes/lesson';
import { nextFrame, onPath } from '../scenes/common';
import { answerPage, cardEl, enterLevelFromVillage, installRunnerAutopilot, man1Probe, man2Probe, man3Probe } from '../scenes/giay';
import { tutorialTexts } from '../../content/tutorial';
import { beginSeg, endSeg, markSeg } from './marks';

const hold = (ctx: Ctx) => () => endSeg(ctx);

/** Hộp "Hướng dẫn chơi" tự mở ở lần vào chợ đầu: đóng ngay (lời thuyết minh thay phần này). */
async function closeGuideQuick(ctx: Ctx): Promise<void> {
  const dlg = await ctx.ctl.waitFor(() => q('[data-testid="huong-dan"]'), 'guide dialog', 6000).catch(() => null);
  if (!dlg) return;
  await ctx.ctl.sleep(800);
  const close = dlg.querySelector<HTMLButtonElement>('button[aria-label="' + huongDan.dong + '"]');
  if (close) await clickEl(ctx, close, { settle: 500 });
}

/** S01 trang chủ, S02 truyện mở đầu, S03 chợ phiên với bảng Nhiệm vụ. */
export async function tronIntro(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  markSeg('S01');
  await ctl.sleep(1500);
  await endSeg(ctx);
  const btn = await ctl.waitFor(() => buttonByText(ui.trangChu.choiThu), 'play-as-guest button', 15000);
  await clickEl(ctx, btn, { settle: 800 });
  await ctl.waitFor(() => onPath('/truyen'), 'story page', 15000);
  markSeg('S02');
  // 14 trang truyện: dàn đều mức tối thiểu của đoạn ra các trang, trang cuối giữ cho đủ
  await playVnDialogs(ctx, { beforeLast: hold(ctx) });
  await ctl.waitFor(() => onPath('/cho'), 'market page', 30000);
  await waitWorldReady(ctx);
  await closeGuideQuick(ctx);
  markSeg('S03');
  await ctl.sleep(1000);
}

/** G01 đi bộ từ chợ về cổng Làng Giấy, G02 cảnh mở đầu của bác An. */
export async function tronGiayWalk(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const w0 = await waitWorldReady(ctx);
  await engageWorld(ctx);
  await endSeg(ctx);
  markSeg('G01');
  const first = w0.world.villages.find((v) => v.id === 'lang-giay')?.layout.scrolls?.[0];
  if (!first) throw new Error('no scrolls in lang-giay');
  const onDialog = async () => {
    await beginSeg(ctx, 'G02');
    await playVnDialogs(ctx, { beforeLast: hold(ctx) });
  };
  await walkToNode(ctx, gateNodeId('giay'), { run: false, onDialog });
  await walkToNode(ctx, scrollNodeId('lang-giay', first.index), { run: false, onDialog });
  await ctl.waitFor(() => demoWorld()?.inside === 'lang-giay', 'inside lang-giay', 30000);
  // cảnh mở đầu có thể bật sau khi vào cổng: xem hết
  if (demoWorld()?.dialogOpen) await onDialog();
}

const CARD_CODES = ['G03', 'G04', 'G05', 'G06'] as const;

/** Nhặt 4 thẻ "Em có biết?" của một làng theo thứ tự chỉ số (nội dung thẻ khớp lời thuyết minh), mỗi thẻ một mã đoạn. */
export async function tronCards(ctx: Ctx, village: 'lang-giay', codes: readonly string[], opts: { run?: boolean } = {}): Promise<void> {
  const { ctl } = ctx;
  const w0 = await waitWorldReady(ctx);
  if (w0.inside !== village) throw new Error('not inside ' + village);
  await engageWorld(ctx);
  const scrolls = [...(w0.world.villages.find((v) => v.id === village)?.layout.scrolls ?? [])].sort((a, b) => a.index - b.index);
  for (let i = 0; i < scrolls.length; i++) {
    const s = scrolls[i];
    await walkAndInteract(ctx, scrollNodeId(village, s.index), (t) => t.kind === 'scroll' && t.index === s.index, { x: s.x, z: s.z }, { run: opts.run ?? false, before: hold(ctx) });
    await ctl.waitFor(() => demoWorld()?.know?.scroll === s.index, 'know dialog ' + s.index, 5000);
    markSeg(codes[i]);
    await answerKnowCard(ctx, village, s.index, { beforeStash: hold(ctx) });
    await ctl.waitFor(() => demoWorld()?.know === null, 'know closed', 5000);
    await ctl.sleep(900);
  }
}

export const tronGiayCards = (ctx: Ctx): Promise<void> => tronCards(ctx, 'lang-giay', CARD_CODES);

/** Bỏ qua hướng dẫn làm thử (lời thuyết minh thay phần này). */
const skipTut = (ctx: Ctx): Promise<void> => skipTutorial(ctx, 500);

/** Trạm Khó của màn 1: bot sửa đúng 3 trang (96, 10, 67) rồi dừng; mạng cứ thêm trang nên hết giờ chuỗi của làng dài hơn. */
async function tronHardRace(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  while (!man1Probe()?.timeUp) {
    const p = man1Probe();
    if (!p || p.expected === null || (p.fixed ?? 0) >= 3) {
      await ctl.sleep(200);
      continue;
    }
    await answerPage(ctx, false, [150, 220]);
    await ctl.sleep(1200);
  }
  const end = man1Probe();
  console.info('[tron] man-1 hard end ' + JSON.stringify({ gap: end?.remaining, fixed: end?.fixed, networkAdded: end?.networkAdded }));
  await ctl.sleep(2500);
}

async function tronMan1Station(ctx: Ctx, idx: number): Promise<void> {
  const { ctl } = ctx;
  const name = (['de', 'tb', 'kho'] as const)[idx];
  await ctl.waitFor(() => man1Probe()?.station === name, 'man 1 probe ' + name, 15000);
  if (man1Probe()?.tutorialOpen) await skipTut(ctx);
  await ctl.sleep(1000);
  if (idx === 1) markSeg('G08');
  if (idx === 2) markSeg('G09');
  if (idx === 0) {
    while (lessonStage() === 'play') {
      if (!(await answerPage(ctx, false))) await ctl.sleep(250);
    }
    return;
  }
  if (idx === 1) {
    await ctl.sleep(1500);
    while (!man1Probe()?.reflection) {
      if (!(await answerPage(ctx, false))) await ctl.sleep(300);
    }
    await answerReflection(ctx);
    const done = await ctl.waitFor(() => buttonByText(bai1Texts.tb.xongTram), 'station finish button', 5000);
    await clickEl(ctx, done, { settle: 600 });
    return;
  }
  await tronHardRace(ctx);
  await answerReflection(ctx);
  const done = await ctl.waitFor(() => buttonByText(bai1Texts.kho.xongTram), 'station finish button', 5000);
  await clickEl(ctx, done, { settle: 600 });
}

/** G07 trạm Dễ, G08 trạm Trung bình, G09 trạm Khó, G10 màn kết quả màn 1. */
export async function tronGiayM1(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await enterLevelFromVillage(ctx, 'lang-giay', 1, { run: false, before: hold(ctx) });
  await ctl.waitFor(() => lessonStage(), 'lesson page', 30000);
  markSeg('G07');
  await driveLesson(ctx, { playStation: tronMan1Station, beforeNext: hold(ctx) });
  markSeg('G10');
  await ctl.sleep(1500);
}

/** G11 màn 2 bắt đầu chạy, G12 bảng câu hỏi cuối vòng. */
export async function tronGiayM2(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const path = '/lang/lang-giay/man/2';
  await endSeg(ctx);
  if (!onPath(path)) {
    const extra = q<HTMLButtonElement>('[data-demo="complete-extra"]');
    if (extra) await clickEl(ctx, extra, { settle: 600 });
    else await enterLevelFromVillage(ctx, 'lang-giay', 2, { run: false });
    await ctl.waitFor(() => onPath(path), 'route ' + path, 20000);
  }
  await ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
  markSeg('G11');
  await dwell(ctx, q('[data-testid="the-luat"]')?.textContent ?? '');
  const start = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-start"]'), 'start button', 5000);
  await clickEl(ctx, start, { settle: 600 });
  const probe = await ctl.waitFor(() => man2Probe(), 'runner probe', 60000);
  if (probe.tutorialActive) {
    const tut = await ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'runner tutorial', 60000);
    await ctl.sleep(500);
    await clickEl(ctx, tut, { settle: 800 });
  }
  const brain = await probe.makeBrain();
  installRunnerAutopilot(ctx, probe.session, brain);
  await ctl.sleep(800);
  let quizDone = false;
  while (!q('[data-testid="diem"]')) {
    await nextFrame(ctx);
    const s = man2Probe()?.session.state;
    if (s?.phase === 'quiz' && !quizDone) {
      quizDone = true;
      const panel = await ctl.waitFor(() => q('[data-testid="cau-hoi"]'), 'runner quiz panel', 8000);
      const opts = await ctl.waitFor(() => {
        const b = [...panel.querySelectorAll<HTMLButtonElement>('ul button')];
        return b.length > 0 && man2Probe()?.correctIndex != null ? b : null;
      }, 'quiz options', 8000);
      await endSeg(ctx);
      markSeg('G12');
      await dwell(ctx, panel.querySelector('h2')?.textContent ?? '');
      await clickEl(ctx, opts[man2Probe()?.correctIndex ?? 0], { settle: 500 });
      await dwell(ctx, q('[data-testid="quiz-giai-thich"]')?.textContent ?? '');
      await endSeg(ctx);
      const next = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="quiz-tiep"] button'), 'quiz continue', 6000);
      await clickEl(ctx, next, { settle: 500 });
    }
  }
  await ctl.waitFor(() => q('[data-testid="diem"]'), 'result screen', 10000);
  await ctl.sleep(3000);
}

/** G13 màn 3 bắt đầu, G14 trang giả (vòng 2). */
export async function tronGiayM3(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const path = '/lang/lang-giay/man/3';
  await endSeg(ctx);
  if (!onPath(path)) {
    const next = q<HTMLButtonElement>('[data-testid="choi-tiep"]');
    if (next) await clickEl(ctx, next, { settle: 600 });
    else await enterLevelFromVillage(ctx, 'lang-giay', 3, { run: false });
    await ctl.waitFor(() => onPath(path), 'route ' + path, 20000);
  }
  await ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
  markSeg('G13');
  await dwell(ctx, q('[data-testid="the-luat"]')?.textContent ?? '');
  const start = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-start"]'), 'start button', 5000);
  await clickEl(ctx, start, { settle: 600 });
  await ctl.waitFor(() => man3Probe(), 'man 3 probe', 60000);
  if (man3Probe()?.tutorialActive) {
    const tut = await ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'man 3 tutorial', 60000);
    await ctl.sleep(500);
    await clickEl(ctx, tut, { settle: 800 });
  }
  await ctl.waitFor(() => man3Probe()?.phase === 'play', 'play phase', 30000);
  await ctl.sleep(1500);
  let fakeShown = false;
  while (q('[data-testid="man3"]')) {
    await ctl.checkpoint();
    const p = man3Probe();
    if (!p) {
      await ctl.sleep(200);
      continue;
    }
    if (p.phase === 'roundDone') {
      const go = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-tiep"]'), 'round banner button', 8000).catch(() => null);
      if (go) {
        await ctl.sleep(1500);
        await endSeg(ctx);
        await clickEl(ctx, go, { settle: 800 });
      }
      continue;
    }
    if (p.phase !== 'play') {
      await ctl.sleep(250);
      continue;
    }
    const fake = p.fakeId();
    if (fake && !fakeShown) {
      fakeShown = true;
      await beginSeg(ctx, 'G14');
      // soi công thức một lần: bật Soi, chạm trang giả, đọc phép tính, tắt Soi, rồi kéo vào rổ
      const soi = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-soi"]'), 'inspect button', 5000);
      await clickEl(ctx, soi, { settle: 500 });
      const fc = await ctl.waitFor(() => cardEl(fake), 'fake card', 5000);
      await clickEl(ctx, fc, { settle: 600 });
      const line = await ctl.waitFor(() => q('[data-testid="soi-ket-qua"]'), 'inspect result', 5000);
      await dwell(ctx, line.textContent ?? '');
      await endSeg(ctx);
      await clickEl(ctx, soi, { settle: 500 });
    }
    const id = fake ?? p.rightId();
    const card = id ? cardEl(id) : null;
    const target = q(fake ? '[data-drop="basket"]' : '[data-drop="chain"]');
    if (!card || !target) {
      await ctl.sleep(250);
      continue;
    }
    await dragEl(ctx, card, target);
    await ctl.sleep(500);
  }
  await ctl.waitFor(() => q('[data-testid="diem"]'), 'result screen', 10000);
  await ctl.sleep(3000);
}

/** G15 bác An trao Trang Sổ Vàng thứ nhất. */
export async function tronGiayTrao(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  if (!onPath('/cho')) {
    const leave = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-leave"]'), 'leave button', 8000);
    await clickEl(ctx, leave, { settle: 800 });
    await ctl.waitFor(() => onPath('/cho'), 'back to the market page', 20000);
  }
  await waitWorldReady(ctx);
  await ctl.waitFor(() => demoWorld()?.dialogOpen, 'golden page ceremony', 40000);
  markSeg('G15');
  await playVnDialogs(ctx, { beforeLast: hold(ctx) });
  await ctl.sleep(2000);
}

