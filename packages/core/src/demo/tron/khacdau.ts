/** Chế độ trọn: Làng Khắc Dấu (K01 đến K10). Dịch chuyển bằng bản đồ lớn; thẻ nhanh gấp 1,5 lần Làng Giấy. Màn 7 ba trạm (khóa riêng, khóa công khai, chữ ký). */
import { bai3Texts } from '../../content/lessons/bai-3';
import { fmt } from '../../content/characters';
import { PEOPLE, verify } from '../../lessons/bai-3/logic';
import { clickEl, q, qa, typeInto, type Ctx } from '../actions';
import { getProbe } from '../probe';
import { buttonByText, dwell, playVnDialogs } from '../ui';
import { demoWorld, waitWorldReady } from '../world';
import { driveLesson, answerReflection, lessonStage, skipTutorial } from '../scenes/lesson';
import { onPath } from '../scenes/common';
import { hold, tronEnterLevel, tronEnterVillage, tronTeleportCards } from './common';
import { beginSeg, endSeg, markSeg } from './marks';
import { publicKey } from '../../lessons/bai-3/logic';
import { TRON_DATA } from './data';
import { nextFrame } from '../scenes/common';
import { tutorialTexts } from '../../content/tutorial';

const VILLAGE = 'lang-khac-dau' as const;
const E = bai3Texts.tramDe;
const M = bai3Texts.tramTb;
const H = bai3Texts.tramKho;

/** K01 dịch chuyển bằng bản đồ + cảnh chú Dũng. */
export const tronKdVao = (ctx: Ctx): Promise<void> => tronEnterVillage(ctx, VILLAGE, 'khac-dau', 'K01', null);

/** K02 bốn thẻ "Em có biết?" của Làng Khắc Dấu. */
export const tronKdThe = (ctx: Ctx): Promise<void> => tronTeleportCards(ctx, VILLAGE, 'K02');

interface Man7Probe {
  station: 'de' | 'tb' | 'kho';
  tutorialOpen: boolean;
  // trạm Dễ
  part?: number;
  p1Step?: string;
  // trạm Trung bình
  txs?: { id: string; senderId: string; message: string; sig: { r: number; s: number }; attachedKey: number | null; isFake?: boolean }[];
  decided?: number;
  feedbackOpen?: boolean;
  verifying?: boolean;
  hasResult?: boolean;
  // trạm Khó
  p1Found?: boolean;
  p1Running?: boolean;
  p2Step?: string;
  bruteRunning?: boolean;
  bruteDone?: boolean;
  p3Done?: boolean;
}
const probe7 = () => getProbe<Man7Probe>('man7');
const dnd = (id: string) => q('[data-dnd-id="' + id + '"]');
/** Đặt thẻ vào ô bằng cách chạm thẻ rồi chạm ô (cách chạm của trò kéo thả; hoạt động chắc hơn kéo). */
async function place(ctx: Ctx, from: Element, to: Element): Promise<void> {
  await clickEl(ctx, from, { settle: 600 });
  await clickEl(ctx, to, { settle: 700 });
}
/** Nút Thật/Giả của thẻ giao dịch uid=197609(Acer) gid=197121 groups=197121: leo từ phần tử của thẻ tới tổ tiên gần nhất có nút cùng nhãn (mỗi thẻ có đúng một cặp nút). */
function decisionButton(id: string, label: string): HTMLButtonElement | null {
  let p: HTMLElement | null = dnd('tx-' + id);
  while (p) {
    const b = [...p.querySelectorAll<HTMLButtonElement>('button')].find((x) => (x.textContent ?? '').includes(label));
    if (b) return b;
    p = p.parentElement;
  }
  return null;
}
const skipTut = (ctx: Ctx): Promise<void> => skipTutorial(ctx, 500);

async function click(ctx: Ctx, get: () => HTMLElement | null, label: string, settle = 700): Promise<void> {
  const el = await ctx.ctl.waitFor(get, label, 20000);
  await clickEl(ctx, el, { settle });
}

/** Trạm Dễ: ký bằng khóa riêng, thả vào máy xác minh, xem Tí mạo danh bị bắt, rồi ghép 5 khóa riêng với khóa công khai. */
async function easyStation(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await ctl.waitFor(() => probe7()?.station === 'de', 'man 7 probe de', 15000);
  if (probe7()?.tutorialOpen) await skipTut(ctx);
  await ctl.sleep(1500);
  await click(ctx, () => buttonByText(E.kyBangKhoaRiengCua), 'sign button');
  await ctl.waitFor(() => probe7()?.p1Step === 'signed', 'signed', 8000);
  await ctl.sleep(1500);
  await click(ctx, () => q<HTMLButtonElement>('#tutorial-man7de-verify-btn button'), 'drop into machine');
  await ctl.waitFor(() => probe7()?.p1Step === 'verified_my', 'verified', 15000);
  await ctl.sleep(2500);
  await click(ctx, () => buttonByText(fmt(E.tiepTheoXemGianLan)), 'show fraud button');
  await ctl.waitFor(() => probe7()?.p1Step === 'ti_fraud_ready', 'fraud ready', 8000);
  await ctl.sleep(1500);
  await click(ctx, () => q<HTMLButtonElement>('[data-dnd-id="slot-machine-easy"] button'), 'scan fraud');
  await ctl.waitFor(() => probe7()?.p1Step === 'ti_detected', 'fraud detected', 20000);
  await ctl.sleep(2500);
  await click(ctx, () => buttonByText(E.sangPhan2GhepCap), 'part 2 button');
  await ctl.waitFor(() => probe7()?.part === 2, 'part 2', 8000);
  await ctl.sleep(1500);
  const pairs: [string, number][] = [['giang', 10], ['hoa', 20], ['khang', 8], ['lan', 17], ['minh', 11]];
  for (const [friend, pub] of pairs) {
    const card = await ctl.waitFor(() => dnd('card-pub-' + pub), 'card ' + pub, 8000);
    const slot = await ctl.waitFor(() => dnd('slot-friend-' + friend), 'slot ' + friend, 8000);
    await place(ctx, card, slot);
    await ctl.sleep(500);
  }
  await click(ctx, () => buttonByText(E.kiemTraKetQua), 'check part 2');
  await ctl.sleep(2500);
}

/** Trạm Trung bình: với mỗi giao dịch, thả giao dịch và khóa công khai của người gửi (theo danh bạ) vào máy, kiểm tra chữ ký, chọn Thật/Giả đúng, rồi nộp. */
async function mediumStation(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await ctl.waitFor(() => probe7()?.station === 'tb' && probe7()?.txs, 'man 7 probe tb', 15000);
  if (probe7()?.tutorialOpen) await skipTut(ctx);
  await ctl.sleep(1500);
  const txs = probe7()!.txs!;
  for (const tx of txs) {
    const pub = PEOPLE.find((p) => p.id === tx.senderId)?.publicKey;
    if (pub === undefined) throw new Error('unknown sender ' + tx.senderId);
    const real = verify(pub, tx.message, tx.sig);
    console.info('[tron] k04 tx ' + tx.senderId + ' real=' + real + ' isFake=' + tx.isFake);
    await place(ctx, await ctl.waitFor(() => dnd('tx-' + tx.id), 'tx ' + tx.id, 8000), await ctl.waitFor(() => dnd('slot-tx'), 'slot-tx', 8000));
    await ctl.sleep(500);
    await place(ctx, await ctl.waitFor(() => dnd('key-' + pub), 'key ' + pub, 8000), await ctl.waitFor(() => dnd('slot-key'), 'slot-key', 8000));
    await ctl.sleep(500);
    await click(ctx, () => buttonByText(bai3Texts.mayXacMinh.kiemTraChuKy), 'verify');
    await ctl.waitFor(() => probe7()?.hasResult && !probe7()?.verifying, 'verify result', 8000);
    await ctl.sleep(2500);
    const label = real ? bai3Texts.theGiaoDich.that : bai3Texts.theGiaoDich.gia;
    await click(ctx, () => decisionButton(tx.id, label), 'decision ' + label);
    await ctl.sleep(800);
  }
  await click(ctx, () => buttonByText(M.nopKetQuaThamDinh), 'submit');
  await ctl.sleep(2500);
}

/** Trạm Khó: thử x từ 1 (máy thử lần lượt tới khi ra khóa công khai), thử tay, dò số lớn, rồi câu suy ngẫm. */
async function hardStation(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await ctl.waitFor(() => probe7()?.station === 'kho', 'man 7 probe kho', 15000);
  if (probe7()?.tutorialOpen) await skipTut(ctx);
  await ctl.sleep(1500);
  // phần 1: thử tay x = 1, 2, 3 rồi để máy thử lần lượt tới khi ra
  for (const x of [1, 2, 3]) {
    const input = await ctl.waitFor(() => q<HTMLInputElement>('#tutorial-man7kho-input-box input[type="number"]'), 'x input', 10000);
    await typeInto(ctx, input, String(x));
    await click(ctx, () => q<HTMLButtonElement>('#tutorial-man7kho-try-btn button:not([disabled])'), 'try x', 900);
    await ctl.sleep(800);
  }
  await click(ctx, () => buttonByText(H.deMayThuLanLuot), 'auto run');
  await ctl.waitFor(() => probe7()?.p1Found, 'x found', 60000);
  await ctl.sleep(3000);
  // câu dự đoán chuyển tiếp: chọn một phương án rồi mới có nút sang phần 2
  await click(ctx, () => buttonByText(H.timDuocNeuDungMay), 'prediction option');
  await ctl.sleep(1500);
  await click(ctx, () => buttonByText(H.sangPhan2ThuVoi), 'to part 2');
  // phần 2: bước A thử vài số rồi nhận "mình chịu"; bước B xem số liệu; bước C dò số lớn
  await ctl.waitFor(() => probe7()?.p2Step === 'A', 'p2 step A', 8000);
  const guess = await ctl.waitFor(() => q<HTMLInputElement>('input[placeholder="' + H.nhapSoX + '"]'), 'p2 input', 8000);
  await typeInto(ctx, guess, '123456');
  await click(ctx, () => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.textContent ?? '').trim() === H.thuGiaTriX && !b.disabled) ?? null, 'p2 try', 900);
  await ctl.sleep(2000);
  await click(ctx, () => buttonByText(H.emThayViecNayLa), 'give up');
  await ctl.waitFor(() => probe7()?.p2Step === 'B', 'p2 step B', 8000);
  await ctl.sleep(3000);
  await click(ctx, () => buttonByText(H.deMayThuXemNhanh), 'to step C');
  await ctl.waitFor(() => probe7()?.p2Step === 'C', 'p2 step C', 8000);
  await ctl.sleep(2000);
  // cấu hình thứ ba (p = 1000003) mới ghi nhận "đã chạy xong" để mở bước sang phần 3
  const cfg = await ctl.waitFor(() => {
    const l = qa<HTMLButtonElement>('button.rounded-\\[12px\\].text-left');
    return l.length >= 3 && !l[2].disabled ? l[2] : null;
  }, 'brute config (p = 1000003)', 8000);
  await clickEl(ctx, cfg, { settle: 800 });
  await ctl.waitFor(() => probe7()?.bruteDone && !probe7()?.bruteRunning, 'brute done', 90000);
  await ctl.sleep(3500);
  await click(ctx, () => buttonByText(H.sangPhan3TinhHuong), 'to part 3');
  await ctl.sleep(2500);
  await click(ctx, () => buttonByText(H.thuRut50XuRa), 'withdraw try');
  await ctl.sleep(2500);
  const opts = await ctl.waitFor(() => {
    const b = qa<HTMLButtonElement>('button.w-full.text-left');
    return b.length >= 4 ? b : null;
  }, 'p3 options', 8000);
  await clickEl(ctx, opts[3], { settle: 800 });
  await ctl.sleep(3000);
}

/** K03 trạm Dễ, K04 trạm Trung bình, K05 trạm Khó, K06 màn kết quả màn 7. */
export async function tronKdM7(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await tronEnterLevel(ctx, VILLAGE, 7, hold(ctx));
  await ctl.waitFor(() => lessonStage(), 'lesson page', 30000);
  markSeg('K03');
  await driveLesson(ctx, {
    playStation: async (c, i) => {
      if (i === 1) markSeg('K04');
      if (i === 2) markSeg('K05');
      if (i === 0) await easyStation(c);
      else if (i === 1) await mediumStation(c);
      else await hardStation(c);
    },
    beforeNext: hold(ctx),
  });
  markSeg('K06');
  await ctl.sleep(1500);
}

interface Man8Probe {
  phase: string;
  tutorialActive: boolean;
  round: number;
  cards: { id: string; pairKey: number; matched: boolean; flipped: boolean }[];
}
const probe8 = () => getProbe<Man8Probe>('man8');

/** Bắt đầu một game phụ từ màn kết quả trước (nút Chơi tiếp), rồi ghi mã đoạn khi thẻ bắt đầu hiện. */
async function openGame(ctx: Ctx, path: string, code: string): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  if (!onPath(path)) {
    const btn = q<HTMLButtonElement>('[data-demo="complete-extra"]') ?? q<HTMLButtonElement>('[data-testid="choi-tiep"]');
    if (btn) await clickEl(ctx, btn, { settle: 600 });
    await ctl.waitFor(() => onPath(path), 'route ' + path, 20000);
  }
  await ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
  markSeg(code);
  await dwell(ctx, q('[data-testid="the-luat"]')?.textContent ?? '');
  const start = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-start"]'), 'start button', 5000);
  await clickEl(ctx, start, { settle: 600 });
}

async function skipGameTutorial(ctx: Ctx, active: () => boolean | undefined): Promise<void> {
  if (!active()) return;
  const tut = await ctx.ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'game tutorial', 60000);
  await ctx.ctl.sleep(500);
  await clickEl(ctx, tut, { settle: 800 });
}

/** K07 màn 8 lật thẻ vòng 1 (4 cặp). */
export async function tronKdM8(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await openGame(ctx, '/lang/lang-khac-dau/man/8', 'K07');
  await ctl.waitFor(() => probe8(), 'memory probe', 60000);
  await skipGameTutorial(ctx, () => probe8()?.tutorialActive);
  await ctl.waitFor(() => probe8()?.phase === 'playing' && !probe8()?.tutorialActive, 'memory playing', 30000);
  await ctl.sleep(1500);
  const cardEl = (id: string) => q('[data-testid="the"][data-id="' + id + '"]');
  while (q('[data-testid="man8"]')) {
    await ctl.checkpoint();
    const p = probe8();
    if (!p) {
      await ctl.sleep(250);
      continue;
    }
    if (p.phase === 'roundDone' || p.phase === 'gameOver') {
      const go = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-tiep"]'), 'round banner button', 8000).catch(() => null);
      if (go) {
        await ctl.sleep(1500);
        await endSeg(ctx);
        await clickEl(ctx, go, { settle: 800 });
      }
      continue;
    }
    if (p.phase !== 'playing') {
      await ctl.sleep(250);
      continue;
    }
    const open = p.cards.filter((c) => !c.matched && !c.flipped);
    const first = open[0];
    const mate = first && open.find((c) => c.id !== first.id && c.pairKey === first.pairKey);
    const a = first && cardEl(first.id);
    const b = mate && cardEl(mate.id);
    if (!a || !b) {
      await ctl.sleep(250);
      continue;
    }
    await clickEl(ctx, a, { settle: 700 });
    await clickEl(ctx, b, { settle: 1800 });
  }
  await ctl.waitFor(() => q('[data-demo="game-leave"]'), 'result screen', 15000);
  await ctl.sleep(2500);
}

interface Man9Probe {
  state: { phase: string; flying: unknown; hearts: number; board: unknown[] };
  tutorialActive: boolean;
  setAim: (a: number) => void;
  bestShot: () => Promise<{ type: number; angle: number }>;
}
const probe9 = () => getProbe<Man9Probe>('man9');

/** K08 nạp trứng, K09 đợt bắn trứng (đợt 1, ít trứng). */
export async function tronKdM9(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await openGame(ctx, '/lang/lang-khac-dau/man/9', 'K08');
  await ctl.waitFor(() => probe9(), 'bubble probe', 60000);
  await skipGameTutorial(ctx, () => probe9()?.tutorialActive);
  await ctl.waitFor(() => q('[data-testid="nap-trung"]'), 'load step', 30000);
  await ctl.sleep(2000);
  for (const k of TRON_DATA.man9.keys) {
    const want = publicKey(k);
    const egg = await ctl.waitFor(() => qa<HTMLButtonElement>('[data-testid="trung-khay"]').find((b) => b.dataset.value === String(want) && b.dataset.taken === '0') ?? null, 'tray egg ' + want, 8000);
    await clickEl(ctx, egg, { settle: 1200 });
  }
  await endSeg(ctx);
  await click(ctx, () => q<HTMLButtonElement>('[data-testid="nut-bat-dau"]:not([disabled])'), 'start round', 900);
  await ctl.waitFor(() => probe9()?.state.phase === 'play', 'play phase', 8000);
  markSeg('K09');
  await ctl.sleep(1500);
  let guard = 0;
  while (probe9()?.state.phase === 'play' && guard++ < 80) {
    await ctl.checkpoint();
    const p = probe9()!;
    if (p.state.flying) {
      await nextFrame(ctx);
      continue;
    }
    const shot = await p.bestShot();
    const typeBtn = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-loai"][data-index="' + shot.type + '"]'), 'type button', 5000);
    await clickEl(ctx, typeBtn, { settle: 500 });
    p.setAim(shot.angle);
    await ctl.sleep(600);
    await click(ctx, () => q<HTMLButtonElement>('[data-testid="nut-ban"]'), 'fire', 400);
    await ctl.waitFor(() => !probe9()?.state.flying, 'shot landed', 15000);
    await ctl.sleep(500);
  }
  await ctl.sleep(1500);
  await endSeg(ctx);
  const end = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-ket-qua"]'), 'end button', 15000);
  await clickEl(ctx, end, { settle: 600 });
  await ctl.waitFor(() => q('[data-demo="game-leave"]'), 'result screen', 15000);
  await ctl.sleep(2500);
}

/** K10 chú Dũng trao Trang Sổ Vàng thứ ba. */
export async function tronKdTrao(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  if (!onPath('/cho')) {
    const leave = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-leave"]'), 'leave button', 8000);
    await clickEl(ctx, leave, { settle: 800 });
    await ctl.waitFor(() => onPath('/cho'), 'back to the market page', 20000);
  }
  await waitWorldReady(ctx);
  await ctl.waitFor(() => demoWorld()?.dialogOpen, 'golden page ceremony', 40000);
  markSeg('K10');
  await playVnDialogs(ctx, { beforeLast: hold(ctx) });
  await ctl.sleep(2000);
}

void answerReflection;
void beginSeg;
