// P5: cột sáng thay biển chọn màn. Kiểm bằng thao tác thật (phím E, chạm) trên BẢN BUILD CÓ CẦU NỐI ĐO (VITE_PROBE). Cùng một script chạy cho bản "trước" và bản "sau".
//
// Chuẩn bị (CLAUDE.md mục 9; tắt server nền sau khi đo):
//   pnpm dev:assets &
//   (cd apps/hub && VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe-sau && npx vite preview --outDir dist-probe-sau --port 5191 --strictPort) &
// Chạy: node scripts/p5-check.mjs --tag=sau [--base=http://localhost:5191] [--size=0,1,2] [--only=shots,kinds,interact,motion,memory,fps] [--sc=mot-phan] [--vil=lang-giay] [--v]
// --tag=truoc chỉ chụp ảnh và đo FPS/tài nguyên (bản cũ chưa có cầu nối `__boardKinds`, tên nhóm `bien-<màn>`).
// Cầu nối đo dùng: window.__walkPlayer, __walkApi, __world, __worldInteractables, __worldInside, __r3f (scene, gl), __boardKinds (chỉ bản sau).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split('=').slice(1).join('=');
const flag = (n) => process.argv.includes(`--${n}`);
const TAG = arg('tag', 'sau');
const BASE = arg('base', process.env.BASE_URL ?? 'http://localhost:5191');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const ONLY = arg('only', 'shots,kinds,interact,motion,memory,fps').split(',');
const OUT = 'docs/screenshots/p5';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = arg('vil', 'lang-giay,lang-det,lang-khac-dau,lang-bac').split(',');
const SC_ONLY = arg('sc', '');
const FIRST = { 'lang-giay': 1, 'lang-det': 4, 'lang-khac-dau': 7, 'lang-bac': 10 };
const BIEN = { 1: 'Học cùng bác An', 2: 'Đuổi theo', 3: 'Ghép lại cuốn sổ', 4: 'Học cùng cụ Bình', 5: 'Đập', 6: 'Diều đưa sổ', 7: 'Học cùng chú Dũng', 8: 'Lật thẻ tìm cặp khóa', 9: 'Chữa đàn gà', 10: 'Học cùng thầy Linh', 11: 'Ghép lá cây sổ', 12: 'Leo cây tìm lá giả' };
mkdirSync(OUT, { recursive: true });

const results = [];
const shots = [];
const metrics = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---- tiến độ khách (định dạng gọn của ứng dụng, progress/compact.ts)
const lesson = [1, 1, 3, 3, 3];
const game = [1, 1, 3, 100];
const lvDone = (ids) => Object.fromEntries(ids.map((id) => [String(id), [1, 4, 7, 10].includes(id) ? lesson : game]));
const cookieOf = ({ lv = {}, gp = 0, kc = [0, 0, 0, 0] } = {}) => ({ v: 1, lv, gp, c: 0, u: Date.now(), st: 1, kc, gt: 8191, hd: 2147483647 });
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SCENARIOS = {
  moi: { progress: cookieOf(), expect: Object.fromEntries(ALL.map((i) => [i, 'locked'])) },
  'mot-phan': {
    progress: cookieOf({ lv: lvDone([1]), kc: [15, 15, 0, 0] }),
    expect: { 1: 'done', 2: 'open', 3: 'locked', 4: 'open', 5: 'locked', 6: 'locked', 7: 'locked', 8: 'locked', 9: 'locked', 10: 'locked', 11: 'locked', 12: 'locked' },
  },
  // Làng Bạc: bài học xong, game 1 đang mở, game 2 khóa (cả hai dáng cột "mở" và "xong" trong cùng một cảnh trước cây đa)
  'bac-mo': {
    progress: cookieOf({ lv: lvDone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), gp: 3, kc: [15, 15, 15, 15] }),
    expect: { 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'done', 6: 'done', 7: 'done', 8: 'done', 9: 'done', 10: 'done', 11: 'open', 12: 'locked' },
  },
  'hoan-thanh': { progress: cookieOf({ lv: lvDone(ALL), gp: 4, kc: [15, 15, 15, 15] }), expect: Object.fromEntries(ALL.map((i) => [i, 'done'])) },
};

async function newCtx(browser, size, progress, { reduced = false, quality = 'low' } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    Element.prototype.requestPointerLock = function () {
      Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE);
  await page.evaluate(
    (p, red, q) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: red, largeText: false, rotateMap: false, quality: q }));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
    },
    progress,
    reduced,
    quality,
  );
  return { page, size, errors, touch: size.touch };
}

async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB`);
  const file = `${TAG}-${name}-${ctx.size.name}.jpg`;
  writeFileSync(`${OUT}/${file}`, buf);
  shots.push({ file, bytes: buf.length });
}

async function skipScenes(ctx) {
  for (let i = 0; i < 6; i++) {
    const skipped = await ctx.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) b.click();
      return Boolean(b);
    });
    await sleep(skipped ? 1200 : 400);
  }
}

/** Vào làng bằng `?tu=` rồi chờ vùng làng dựng xong (biển đủ 3 cột ở bản sau). */
async function openVillage(ctx, id, extra = '') {
  await ctx.page.goto(`${BASE}/cho?tu=${id}&q=low&warmup=off${extra}`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForFunction(() => window.__walkPlayer && window.__world && window.__worldInteractables, { timeout: 120000 });
  await skipScenes(ctx);
  await ctx.page.waitForFunction((v) => !/Đang vào làng/.test(document.body.innerText) && window.__worldInside === v && window.__worldInteractables.filter((i) => i.id.startsWith(`board:${v}:`)).length === 3, { timeout: 170000 }, id);
  await skipScenes(ctx);
  await sleep(6000); // cảnh mở đầu làng hiện muộn khi máy chậm
  await skipScenes(ctx);
  await sleep(1500);
}

const boardInfo = (ctx, id) =>
  ctx.page.evaluate((v) => {
    const w = window.__world.villages.find((q) => q.id === v);
    const f = w.frame;
    const boards = window.__worldInteractables.filter((i) => i.id.startsWith(`board:${v}:`)).map((i) => ({ level: Number(i.id.split(':')[2]), x: i.x, z: i.z }));
    return { dx: f.dirX, dz: f.dirZ, yaw: f.yaw, boards: boards.sort((a, b) => a.level - b.level) };
  }, id);

/** Đứng cách `back` về phía cổng so với điểm (x, z), nhìn vào làng. */
async function standAt(ctx, info, x, z, back) {
  await ctx.page.evaluate(
    (i, px, pz, b) => {
      window.__walkPlayer.x = px - i.dx * b;
      window.__walkPlayer.z = pz - i.dz * b;
      window.__walkPlayer.yaw = i.yaw;
      if (window.__walkApi?.camera) window.__walkApi.camera.yaw = i.yaw;
    },
    info,
    x,
    z,
    back,
  );
  await sleep(1400);
}
const standOverview = (ctx, info) => {
  const mid = info.boards[1];
  return standAt(ctx, info, mid.x, mid.z, 6);
};
const standNear = (ctx, info, level) => {
  const b = info.boards.find((q) => q.level === level);
  return standAt(ctx, info, b.x, b.z, 1.4);
};

async function interact(ctx) {
  if (ctx.touch) {
    const btn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^Tương tác với/.test(b.getAttribute('aria-label') ?? '')));
    const el = btn.asElement();
    if (!el) return false;
    const r = await el.boundingBox();
    await ctx.page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    return true;
  }
  await ctx.page.keyboard.press('KeyE');
  return true;
}

/** Bỏ qua mọi cảnh đang chiếu (nút "Bỏ qua") cho tới khi lời nhắc tương tác ("Xem biển:" hay "Vào màn:") hiện. */
async function waitLabel(ctx, ms = 120000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const st = await ctx.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) b.click();
      return { skip: Boolean(b), label: /(Xem biển|Vào màn):/.test(document.body.innerText) };
    });
    if (st.label && !st.skip) return true;
    // bấm 'Bỏ qua' bằng mã không phải cú bấm thật nên máy tính còn tạm dừng (không khóa chuột): một cú bấm chuột thật vào cảnh để chơi tiếp
    if (!st.skip && !ctx.touch) await ctx.page.mouse.click(ctx.size.w / 2, ctx.size.h / 2);
    await sleep(st.skip ? 1500 : 800);
  }
  return false;
}

// ---------- đo ----------
const heapMB = (page) =>
  page.evaluate(() => {
    if (typeof window.gc === 'function') window.gc();
    return performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
  });
const memory = (page) =>
  page.evaluate(() => {
    const i = window.__r3f?.gl?.info;
    return i ? { geometries: i.memory.geometries, textures: i.memory.textures, calls: i.render.calls, triangles: i.render.triangles } : null;
  });
async function fps(page, ms = 4000) {
  return page.evaluate(
    (dur) =>
      new Promise((resolve) => {
        const t = [];
        let last = performance.now();
        const start = last;
        const tick = (now) => {
          t.push(now - last);
          last = now;
          if (now - start < dur) requestAnimationFrame(tick);
          else {
            t.sort((a, b) => a - b);
            const mean = t.reduce((s, v) => s + v, 0) / t.length;
            resolve({ frames: t.length, fps: 1000 / mean, p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1] });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

async function runSize(browser, size) {
  const withAfter = TAG !== 'truoc';

  // ===== 1. ảnh + dáng cột theo trạng thái (3 kịch bản × 4 làng) =====
  if (ONLY.includes('shots') || ONLY.includes('kinds')) {
    const scenarios = SC_ONLY ? SC_ONLY.split(',') : size.name === '1366x768' ? Object.keys(SCENARIOS) : ['mot-phan'];
    for (const sc of scenarios) {
      const ctx = await newCtx(browser, size, SCENARIOS[sc].progress, { reduced: flag('reduced') });
      for (const id of ORDER) {
        await openVillage(ctx, id);
        const info = await boardInfo(ctx, id);
        check(ctx, `${sc}/${id}`, 'đủ 3 biển, đúng 3 màn của làng', info.boards.map((b) => b.level).join() === [0, 1, 2].map((k) => FIRST[id] + k).join(), info.boards.map((b) => b.level).join());
        await standOverview(ctx, info);
        if (ONLY.includes('shots')) await shot(ctx, `${sc}-${id}`);
        if (withAfter && ONLY.includes('kinds')) {
          const got = await ctx.page.evaluate((lv) => lv.map((l) => window.__boardKinds?.[l] ?? null), info.boards.map((b) => b.level));
          const want = info.boards.map((b) => SCENARIOS[sc].expect[b.level]);
          check(ctx, `${sc}/${id}`, 'dáng cột đúng trạng thái màn', got.join() === want.join(), `${got.join()} / mong ${want.join()}`);
          const seen = await ctx.page.evaluate((lv) => {
            const s = window.__r3f?.scene;
            return lv.map((l) => {
              const g = s?.getObjectByName(`bien-${l}`);
              return g ? g.children.filter((c) => c.geometry && c.geometry.type === 'CylinderGeometry' && c.material?.blending === 2).length + (g.children.some((c) => c.children?.length) ? 1 : 0) : -1;
            });
          }, info.boards.map((b) => b.level));
          check(ctx, `${sc}/${id}`, 'mỗi biển có cột sáng và vật nổi trong cảnh', seen.every((n) => n === 2), seen.join());
        }
      }
      check(ctx, sc, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.slice(0, 2).join(' | '));
      await ctx.page.close();
    }
  }

  // ===== 2. tương tác thật: E/chạm, tên và đích đến đúng, màn khóa báo đúng lý do =====
  if (ONLY.includes('interact') && withAfter && (size.name === '1366x768' || size.name === '360x800')) {
    const sc = 'mot-phan';
    const cases = [
      { id: 'lang-giay', level: 2, want: 'nav' },
      { id: 'lang-giay', level: 1, want: 'nav' },
      { id: 'lang-giay', level: 3, want: 'khoa', text: /Hoàn thành màn 2/ },
      { id: 'lang-det', level: 4, want: 'nav' },
      { id: 'lang-det', level: 6, want: 'khoa', text: /Hoàn thành màn 4/ },
      { id: 'lang-khac-dau', level: 7, want: 'khoa', text: /tìm đủ thẻ/ },
      { id: 'lang-bac', level: 12, want: 'khoa', text: /Hoàn thành màn 10/ },
    ];
    for (const c of cases) {
      const ctx = await newCtx(browser, size, SCENARIOS[sc].progress);
      await openVillage(ctx, c.id);
      const info = await boardInfo(ctx, c.id);
      await standNear(ctx, info, c.level);
      // máy đo chạy GL phần mềm (2 khung/giây): cảnh mở đầu làng có thể hiện muộn; bỏ qua cảnh rồi chờ lời nhắc tương tác (tối đa 120 giây)
      await waitLabel(ctx);
      const label = await ctx.page.evaluate(() => document.body.innerText);
      if (ctx.touch) check(ctx, `tương tác ${c.id}/${c.level}`, `lời nhắc ghi đúng tên màn "${BIEN[c.level]}"`, new RegExp(`(Xem biển|Vào màn): ${BIEN[c.level]}`).test(label), '');
      else {
        // máy tính: lời nhắc "E: …" ẩn khi phiên tạm dừng (khóa chuột giả của máy đo); kiểm vật tương tác gần nhất đúng là biển của màn này (đích đến), việc ghi tên do lượt chạm ở trên kiểm
        const near = await ctx.page.evaluate(() => {
          const p = window.__walkPlayer;
          let best = null;
          let bd = Infinity;
          for (const i of window.__worldInteractables) {
            const d = Math.hypot(i.x - p.x, i.z - p.z);
            if (d < bd) { bd = d; best = i.id; }
          }
          return { id: best, d: bd };
        });
        check(ctx, `tương tác ${c.id}/${c.level}`, `vật tương tác gần nhất là biển màn ${c.level} (tên "${BIEN[c.level]}")`, near.id === `board:${c.id}:${c.level}` && near.d < 2.2, JSON.stringify(near));
      }
      const url0 = ctx.page.url();
      await interact(ctx);
      if (c.want === 'nav') {
        const ok = await ctx.page.waitForFunction((n) => location.pathname.includes(`/man/${n}`), { timeout: 20000 }, c.level).then(() => true, () => false);
        check(ctx, `tương tác ${c.id}/${c.level}`, `${ctx.touch ? 'chạm' : 'phím E'} vào được màn ${c.level}`, ok, ctx.page.url());
      } else {
        await sleep(900);
        const body = await ctx.page.evaluate(() => document.body.innerText);
        check(ctx, `tương tác ${c.id}/${c.level}`, `màn khóa báo đúng lý do (${c.text})`, c.text.test(body) && ctx.page.url() === url0, '');
        if (c.level === 3) await shot(ctx, `khoa-bao-ly-do`);
      }
      await ctx.page.close();
    }
  }

  // ===== 3. giảm chuyển động: cột sáng đứng yên nhưng vẫn nhận biết =====
  if (ONLY.includes('motion') && withAfter) {
    for (const reduced of [false, true]) {
      const ctx = await newCtx(browser, size, SCENARIOS['mot-phan'].progress, { reduced });
      await openVillage(ctx, 'lang-giay');
      const info = await boardInfo(ctx, 'lang-giay');
      await standOverview(ctx, info);
      const rot = () => ctx.page.evaluate(() => [1, 2, 3].map((l) => { const g = window.__r3f.scene.getObjectByName(`bien-${l}`); const e = g.children[g.children.length - 1]; return [e.rotation.y, e.position.y]; }));
      const a = await rot();
      await sleep(1200);
      const b = await rot();
      const moved = a.some((v, i) => v[0] !== b[i][0] || v[1] !== b[i][1]);
      check(ctx, reduced ? 'giảm chuyển động' : 'chuyển động thường', reduced ? 'vật nổi và cột sáng đứng yên' : 'vật nổi của màn đang mở chuyển động', reduced ? !moved : moved, JSON.stringify([a[1], b[1]]));
      if (reduced) {
        await shot(ctx, 'giam-chuyen-dong-lang-giay');
        check(ctx, 'giảm chuyển động', 'vẫn thấy đủ 3 cột (dáng khác nhau)', (await ctx.page.evaluate(() => Object.values(window.__boardKinds ?? {}).length)) >= 3, '');
      }
      await ctx.page.close();
    }
  }

  // ===== 4. FPS và tài nguyên đứng trước biển (cùng môi trường) =====
  if (ONLY.includes('fps')) {
    const ctx = await newCtx(browser, size, SCENARIOS['mot-phan'].progress);
    await openVillage(ctx, 'lang-giay');
    const info = await boardInfo(ctx, 'lang-giay');
    await standOverview(ctx, info);
    await sleep(1500);
    const f = await fps(ctx.page, 5000);
    const m = await memory(ctx.page);
    const heap = await heapMB(ctx.page);
    metrics.push({ size: size.name, lang: 'lang-giay', fps: Number(f.fps.toFixed(1)), p95ms: Number(f.p95.toFixed(1)), maxMs: Number(f.max.toFixed(1)), heapMB: Number(heap.toFixed(1)), ...m });
    console.log(`   đo ${size.name}: ${f.fps.toFixed(1)} fps, p95 ${f.p95.toFixed(0)} ms, geo ${m?.geometries}, tex ${m?.textures}, tam giác ${m?.triangles}, draw ${m?.calls}`);
    await ctx.page.close();
  }

  // ===== 5. vào/ra làng nhiều lần: tài nguyên đứng yên =====
  if (ONLY.includes('memory') && size.name === '1366x768') {
    const ctx = await newCtx(browser, size, SCENARIOS['mot-phan'].progress);
    await openVillage(ctx, 'lang-giay');
    const info = await boardInfo(ctx, 'lang-giay');
    const series = [];
    for (let n = 0; n < 12; n++) {
      await ctx.page.evaluate(() => { window.__walkPlayer.x = 0; window.__walkPlayer.z = 0; });
      await ctx.page.waitForFunction(() => !window.__worldInside, { timeout: 30000 }).catch(() => {});
      await sleep(5500); // làng dọn sau 3 giây khi cách rìa > 90
      await standOverview(ctx, info);
      await ctx.page.waitForFunction((v) => window.__worldInside === v, { timeout: 60000 }, 'lang-giay').catch(() => {});
      await ctx.page.waitForFunction(() => window.__worldInteractables.filter((i) => i.id.startsWith('board:lang-giay:')).length === 3, { timeout: 120000 });
      await skipScenes(ctx);
      await sleep(3000);
      const m = await memory(ctx.page);
      series.push({ n: n + 1, geometries: m.geometries, textures: m.textures, heapMB: Number((await heapMB(ctx.page)).toFixed(1)) });
    }
    metrics.push({ size: size.name, vaoRa: series });
    const tail = series.slice(-4);
    check(ctx, 'vào/ra làng 12 lần', 'geometries và textures đứng yên sau vài lần đầu', new Set(tail.map((s) => s.geometries)).size === 1 && new Set(tail.map((s) => s.textures)).size === 1, JSON.stringify(series.map((s) => [s.geometries, s.textures])));
    const grow = (series[series.length - 1].heapMB - series[3].heapMB) / (series.length - 4);
    check(ctx, 'vào/ra làng 12 lần', 'heap tăng ≤ 0,3 MB mỗi lần', grow <= 0.3, `${grow.toFixed(2)} MB/lần`);
    await ctx.page.close();
  }
}

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    try {
      await runSize(browser, size);
    } catch (e) {
      results.push({ size: size.name, area: 'lỗi chạy', name: e.message, ok: false, detail: '' });
      console.log(`✗ ${size.name}: ${e.message}`);
    }
    const mine = results.slice(before);
    console.log(`${mine.every((r) => r.ok) ? '✓' : '✗'} ${size.name}: ${mine.filter((r) => r.ok).length}/${mine.length}`);
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/ket-qua-${TAG}.json`, JSON.stringify({ results, shots, metrics }, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
