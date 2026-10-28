// P2a: kiểm đường trả lời THẬT trên bản production (apps/hub/dist chạy bằng `vite preview`, cổng 4180).
// Mỗi lần "nộp bài" là chuột/chạm/bàn phím thật lên DOM, không gọi sound/onAnswer.
//
// Chuẩn bị:  VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true pnpm --filter @so-chung/hub build
//            pnpm dev:assets  &  (cd apps/hub && npx vite preview --port 4180 --strictPort) &
// Chạy:      node scripts/p2a-real-check.mjs [--man=1,4] [--tram=0,2] [--size=0,1,2] [--phase=tram,vongdoi,hop]
//            [--deep] [--dev-url=http://localhost:5173] [--no-write] [--v]
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { launch, openLesson, OUT, problems, SIZES } from './lib/p2a-real.mjs';
import { man1Tram0, man1Tram1, man1Tram2, man1Tram2Finish } from './lib/p2a-stations-1.mjs';
import { man4Tram0, man4Tram1, man4Tram2 } from './lib/p2a-stations-2.mjs';
import { man7Tram0, man7Tram1, man7Tram2, man7Tram2Auto } from './lib/p2a-stations-3.mjs';
import { man10Tram0, man10Tram1, man10Tram2 } from './lib/p2a-stations-4.mjs';
import { lifecycle, sheetRerender } from './lib/p2a-lifecycle.mjs';

const arg = (name, def) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3).split(',') : def;
};
const flag = (name) => process.argv.includes(`--${name}`);

const DRIVERS = {
  '1:0': man1Tram0,
  '1:1': man1Tram1,
  '1:2': async (ctx) => { await man1Tram2(ctx); await man1Tram2Finish(ctx); },
  '4:0': man4Tram0,
  '4:1': man4Tram1,
  '4:2': man4Tram2,
  '7:0': man7Tram0,
  '7:1': man7Tram1,
  '7:2': man7Tram2,
  '7:2auto': man7Tram2Auto,
  '10:0': man10Tram0,
  '10:1': man10Tram1,
  '10:2': man10Tram2,
};

const mans = arg('man', ['1', '4', '7', '10']).map(Number);
const trams = arg('tram', ['0', '1', '2']).map(Number);
const sizeIdx = arg('size', ['0', '1', '2']).map(Number);
const phases = arg('phase', ['tram', 'vongdoi', 'hop']);
const devUrl = arg('dev-url', [null])[0];
const write = !flag('no-write');
const fullRun = !process.argv.some((a) => /^--(man|tram|size|phase)=/.test(a));
if (write) {
  mkdirSync(OUT, { recursive: true });
  // Chạy đủ bộ thì xoá ảnh và số đo cũ của lượt kiểm thao tác thật để không lẫn bản cũ.
  if (fullRun) for (const f of readdirSync(OUT)) if (f.startsWith('thuc-') || f === 'real-measurements.json' || f === 'real-shots.json') rmSync(`${OUT}/${f}`);
}

const browser = await launch();
const all = [];
const shots = [];
const failures = [];

function report(label, ctx) {
  for (const r of ctx.records) {
    if (flag('v')) console.log(`   ${r.ok ? '·' : '!'} [${r.expect}/${r.actual}] ${r.step}${r.scrollAfter !== undefined ? ` (cuộn ${Math.round(r.scrollAfter)}/${Math.round(r.scrollMax)})` : ''}`);
    const p = r.kind ? (r.ok ? [] : [`kỳ vọng ${r.expect}, thực tế ${r.actual}`]) : problems(r);
    if (p.length) failures.push(`${label} — ${r.step}: ${p.join('; ')}`);
  }
  if (ctx.errors.length) failures.push(`${label}: ${ctx.errors.join(' | ')}`);
  if (write) {
    for (const s of ctx.shots) {
      const file = `thuc-man${ctx.man}-${s.name}-${ctx.size.name}.jpg`;
      writeFileSync(`${OUT}/${file}`, s.buf);
      shots.push({ file, bytes: s.bytes, size: ctx.size.name, man: ctx.man, scrollTop: s.scrollTop, scrollMax: s.scrollMax, sheetOpen: s.sheetOpen, praise: s.praise, sparks: s.sparks });
    }
  }
  all.push(...ctx.records.map((r) => ({ scenario: ctx.scenario, ...r })));
  const ok = ctx.records.every((r) => (r.kind ? r.ok : problems(r).length === 0)) && ctx.errors.length === 0;
  console.log(`${ok ? '✓' : '✗'} ${label}: ${ctx.records.length} bước, ${ctx.records.filter((r) => r.expect === 1 && r.actual === 1).length} đợt khen đúng`);
}

try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    if (phases.includes('tram')) {
      for (const man of mans) {
        for (const tram of trams) {
          for (const variant of ['', 'auto']) {
            const driver = DRIVERS[`${man}:${tram}${variant}`];
            if (!driver) continue;
            const label = `màn ${man} trạm ${tram}${variant ? ' (máy tự dò)' : ''} @ ${size.name}`;
            const ctx = await openLesson(browser, size, man, tram);
            ctx.deep = flag('deep') || size.touch;
            ctx.scenario = 'trạm';
            try {
              await driver(ctx);
            } catch (e) {
              failures.push(`${label}: lỗi chạy: ${e.message}`);
              console.log(`✗ ${label}: ${e.message}`);
            }
            report(label, ctx);
            await ctx.page.close();
          }
        }
      }
    }
    if (phases.includes('vongdoi')) {
      for (const man of mans) {
        const ctxs = await lifecycle(browser, size, man);
        for (const c of ctxs) report(`màn ${man} vòng đời "${c.scenario}" @ ${size.name}`, c);
      }
    }
    if (phases.includes('hop')) {
      const c1 = await sheetRerender(browser, size, 'bản production: hộp phản hồi, cha render lại');
      report(`hộp phản hồi render lại (production) @ ${size.name}`, c1);
      if (devUrl) {
        const c2 = await sheetRerender(browser, size, 'bản dev (StrictMode): hộp phản hồi, effect nối lại', devUrl);
        report(`hộp phản hồi render lại (dev StrictMode) @ ${size.name}`, c2);
      }
    }
  }
} finally {
  await browser.close();
}
if (write) {
  writeFileSync(`${OUT}/real-measurements.json`, JSON.stringify(all, null, 1));
  writeFileSync(`${OUT}/real-shots.json`, JSON.stringify(shots, null, 1));
}
if (failures.length) {
  console.log('\nLỖI:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('\nTất cả đạt.');
