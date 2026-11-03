// Người chơi tự động cho màn 12 "Leo bậc gỗ", dùng chung cho scripts/man12-bac-go-check.mjs và các script cũ cần chơi hết màn 12 (p3a-climax-check).
// Chỉ thao tác thật: phím (←, →, Space) hay chạm (CDP touch) lên nút ◀ ▶ Nhảy. Quyết định đọc trạng thái qua cầu nối đo `window.__climbReal`
// (có khi chạy dev hay build bản đo VITE_PROBE=true). Số liệu luật chép từ climbConfig.ts; đổi luật thì đổi ở đây.
export const SPEC = { gravity: 30, gap: 3, slide: [0, 0.7, 1.4], slideAmp: 0.4, choiceX: { 2: [-2.2, 2.2], 3: [-2.6, 0, 2.6] } };

/** Chạy TRONG trang: quyết định thao tác ở khung hiện tại. `want`: { wrong, hole } (nhắm bậc sai, nhảy tại chỗ cho hụt). Trả { move, jump, state }. */
export function decideInPage(want, SPEC) {
  const s = want.practice ? window.__climb : window.__climbReal;
  if (!s || s.phase !== 'playing' || s.mode !== 'free') return { move: 0, jump: false, idle: true };
  if (!want.practice && (window.__climbUi?.tutorialActive || window.__climbUi?.banner)) return { move: 0, jump: false, idle: true };
  const p = s.player;
  const idx = want.wrong ? s.choices.findIndex((c) => !c.correct && c.crack === null) : s.choices.findIndex((c) => c.correct);
  if (idx < 0) return { move: 0, jump: false };
  if (p.grounded) {
    if (s.time < s.lockUntil) return { move: 0, jump: false };
    // đi tới gần bậc nhắm một đoạn rồi nhảy (lái nốt trên không), hoặc nhảy tại chỗ nếu muốn hụt
    return { move: 0, jump: true };
  }
  if (want.hole) return { move: 0, jump: false };
  const ty = SPEC.gap * (s.level + 1);
  const disc = p.vy * p.vy + 2 * SPEC.gravity * (p.y - ty);
  const t = disc < 0 ? 0 : Math.max(0, (p.vy + Math.sqrt(disc)) / SPEC.gravity);
  const c = s.choices[idx];
  const n = s.choices.length;
  const sc = s.slow ? 0.5 : 1;
  const clock = s.slideClock + t * sc;
  const speed = SPEC.slide[Math.min(s.round, 2)];
  const tri = (u) => Math.abs((((u % 4) + 4) % 4) - 2) - 1;
  const off = speed > 0 ? SPEC.slideAmp * tri((clock * speed) / SPEC.slideAmp + c.phase) : 0;
  const target = SPEC.choiceX[n][c.slot] + off;
  const dx = target - p.x;
  return { move: Math.abs(dx) < 0.08 ? 0 : dx > 0 ? 1 : -1, jump: false };
}

/** Bộ điều khiển: phím (máy tính) hay chạm (điện thoại). `ctx` = { page, touch }. */
export function createDriver(ctx) {
  const { page, touch } = ctx;
  let dir = 0;
  let handle = null;
  const rects = {};
  async function btnCenter(id) {
    const box = await (await page.$(`[data-testid="${id}"]`))?.boundingBox();
    if (!box) throw new Error(`Không thấy nút ${id}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  async function setDir(d) {
    if (d === dir) return;
    if (touch) {
      if (handle) {
        await handle.end().catch(() => {});
        handle = null;
      }
      if (d !== 0) {
        const c = await btnCenter(d < 0 ? 'man12-nut-trai' : 'man12-nut-phai');
        handle = await page.touchscreen.touchStart(c.x, c.y);
      }
    } else {
      if (dir < 0) await page.keyboard.up('ArrowLeft');
      if (dir > 0) await page.keyboard.up('ArrowRight');
      if (d < 0) await page.keyboard.down('ArrowLeft');
      if (d > 0) await page.keyboard.down('ArrowRight');
    }
    dir = d;
  }
  async function jump() {
    if (touch) {
      const c = await btnCenter('man12-nut-nhay');
      const h = await page.touchscreen.touchStart(c.x, c.y);
      await h.end();
    } else await page.keyboard.press('Space');
  }
  async function release() {
    await setDir(0);
  }
  void rects;
  return { setDir, jump, release, get dir() { return dir; } };
}

/**
 * Chơi tự động cho tới khi `until(state)` đúng (chạy trong trang) hay hết `timeoutMs`. Gặp bảng báo (xong vòng, hết tim) thì dừng và trả 'banner'.
 * want: { wrong, hole } hoặc hàm (state) => want. Trả lý do dừng.
 */
export async function autoplay(ctx, { want = {}, until = null, timeoutMs = 60000, stopAtBanner = true } = {}) {
  const drv = createDriver(ctx);
  const t0 = Date.now();
  let lastJump = 0;
  try {
    while (Date.now() - t0 < timeoutMs) {
      const w = typeof want === 'function' ? await ctx.page.evaluate(want) : want;
      const d = await ctx.page.evaluate(decideInPage, w, SPEC);
      if (stopAtBanner) {
        const b = await ctx.page.evaluate(() => Boolean(document.querySelector('[data-testid="banner"]')));
        if (b) return 'banner';
      }
      if (until && (await ctx.page.evaluate(until))) return 'until';
      await drv.setDir(d.move);
      if (d.jump && Date.now() - lastJump > 250) {
        await drv.jump();
        lastJump = Date.now();
      }
      await new Promise((r) => setTimeout(r, 16));
    }
    return 'timeout';
  } finally {
    await drv.release();
  }
}
