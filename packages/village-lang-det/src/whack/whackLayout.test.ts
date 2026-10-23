import { describe, expect, it } from 'vitest';
import { fitFrame } from '@so-chung/core/three/scene25d/layout25d';
import { WORLD_FRAME, lanePose } from './man05Lanes';
import {
  BOSS_HIT_POS,
  BOSS_LOGIC_STOP,
  BOSS_WAIT_POS,
  CHECK_VIEWPORTS,
  CHI,
  CHAR_HALF_WIDTH,
  GUARD_FROM,
  STUDENT,
  boxesOverlap,
  bookBox,
  bossBox,
  bossViewPos,
  chiBox,
  guardBox,
  hudBox,
  keepClearBoxes,
  studentBox,
  studentHome,
  studentStand,
  zoneBox,
  type Box,
} from './whackLayout';
import { WHACK_SPEC } from './whackConfig';

const GAP = 0.1;
const LANES = Array.from({ length: WHACK_SPEC.lanes }, (_, l) => l);
const inFrame = (b: Box): boolean => b.x0 >= -WORLD_FRAME.width / 2 && b.x1 <= WORLD_FRAME.width / 2 && b.y0 >= -WORLD_FRAME.height / 2 && b.y1 <= WORLD_FRAME.height / 2;

describe('bố cục cảnh màn 5 (whackLayout.ts)', () => {
  it('hộp bao vùng đập nằm trong khung, nằm trong hộp bao đoạn giữ trống, và 4 vùng nối nhau từ trái sang phải', () => {
    for (const l of LANES) {
      const z = zoneBox(l);
      const g = guardBox(l);
      expect(inFrame(z)).toBe(true);
      expect(g.x0).toBeLessThanOrEqual(z.x0 + 1e-9);
      expect(g.y1).toBeGreaterThan(z.y1);
      expect(g.y0).toBeCloseTo(z.y0, 9);
    }
    for (let l = 1; l < LANES.length; l++) expect(zoneBox(l).x0).toBeGreaterThan(zoneBox(l - 1).x0);
    expect(GUARD_FROM).toBeLessThan(WHACK_SPEC.zoneStart);
  });

  it('học sinh đứng dưới đuôi các làn: ở mọi chỗ đứng và cả lúc trượt giữa các làn, hộp bao (kể cả quạt giơ cao) không giao 4 vùng đập và đoạn làn ngay trên', () => {
    const stands = LANES.map(studentStand);
    const sweep = studentBox(Math.min(...stands));
    sweep.x1 = studentBox(Math.max(...stands)).x1;
    for (const l of LANES) expect(boxesOverlap(sweep, guardBox(l), GAP), `làn ${l + 1}`).toBe(false);
    for (const x of [...stands, studentHome()]) expect(inFrame(studentBox(x)), `x ${x}`).toBe(true);
    // chỗ đứng theo thứ tự làn, mỗi làn cách làn trước ít nhất một thân người
    for (let l = 1; l < stands.length; l++) expect(stands[l] - stands[l - 1]).toBeGreaterThan(CHAR_HALF_WIDTH * STUDENT.height);
  });

  it('học sinh đứng ra ngoài mép cuốn sổ (không che sổ và vết mực) ở mọi làn', () => {
    const book = bookBox();
    for (const l of LANES) expect(boxesOverlap({ ...studentBox(studentStand(l)), y0: book.y0, y1: book.y1 }, book), `làn ${l + 1}`).toBe(false);
  });

  it('cô Chi đứng cố định bên trái, cách xa mọi làn, nằm trong khung', () => {
    const c = chiBox();
    expect(inFrame(c)).toBe(true);
    expect(CHI.x).toBeLessThan(-4);
    for (const l of LANES) {
      expect(boxesOverlap(c, guardBox(l), GAP), `làn ${l + 1} (đoạn giữ trống)`).toBe(false);
      expect(boxesOverlap(c, zoneBox(l), GAP)).toBe(false);
    }
  });

  it('{phanDien} đứng chờ câu hỏi ở đầu làn: ở cả 4 làn, hộp bao không giao vùng đập hay đoạn giữ trống của BẤT KỲ làn nào, và nằm trong khung', () => {
    for (const lane of LANES) {
      const b = bossBox(lane, BOSS_WAIT_POS);
      expect(inFrame(b), `làn ${lane + 1}`).toBe(true);
      for (const other of LANES) expect(boxesOverlap(b, guardBox(other), GAP), `trùm ở làn ${lane + 1}, vùng làn ${other + 1}`).toBe(false);
    }
    // ánh xạ vị trí chạy của logic về chỗ chờ: 0 → 0, tới giữa vùng đập → chỗ chờ, không vượt quá
    expect(bossViewPos(0)).toBe(0);
    expect(bossViewPos(BOSS_LOGIC_STOP)).toBeCloseTo(BOSS_WAIT_POS, 9);
    expect(bossViewPos(BOSS_LOGIC_STOP * 3)).toBeCloseTo(BOSS_WAIT_POS, 9);
    for (let p = 0; p < BOSS_LOGIC_STOP; p += 0.5) expect(bossViewPos(p + 0.5)).toBeGreaterThanOrEqual(bossViewPos(p));
  });

  it('chỗ {phanDien} bị đét (cuối làn, ngay trên sổ) cùng làn với chỗ học sinh đứng: trùm ở ngay phía trên học sinh', () => {
    for (const lane of LANES) {
      const b = bossBox(lane, BOSS_HIT_POS);
      const s = studentBox(studentStand(lane));
      expect(Math.abs((b.x0 + b.x1) / 2 - (s.x0 + s.x1) / 2), `làn ${lane + 1}`).toBeLessThan(1.6);
      expect(b.y1).toBeGreaterThan(s.y0);
      expect(lanePose(lane, BOSS_HIT_POS, { x: 0, y: 0, scale: 1 }).y).toBeGreaterThan(STUDENT.feetY);
    }
  });

  it('HUD ở 640×360, 844×390, 1366×768 và 1024×768 (4:3): không che 4 vùng đập và đoạn làn ngay trên; nằm trong khung', () => {
    for (const vp of CHECK_VIEWPORTS) {
      const frame = fitFrame(vp, 16 / 9);
      const h = hudBox(frame.width);
      expect(inFrame(h), `${vp.width}x${vp.height}`).toBe(true);
      for (const b of keepClearBoxes()) expect(boxesOverlap(h, b, GAP), `${vp.width}x${vp.height}`).toBe(false);
    }
  });

  it('mọi nhân vật và HUD cùng lúc, ở 4 cỡ khung: không cái nào giao hộp bao 4 vùng đập (hộp bao đoạn giữ trống)', () => {
    for (const vp of CHECK_VIEWPORTS) {
      const frame = fitFrame(vp, 16 / 9);
      const boxes: [string, Box][] = [
        ['học sinh (làn 1)', studentBox(studentStand(0))],
        ['học sinh (làn 4)', studentBox(studentStand(3))],
        ['học sinh (nghỉ)', studentBox(studentHome())],
        ['cô Chi', chiBox()],
        ['trùm làn 1', bossBox(0, BOSS_WAIT_POS)],
        ['trùm làn 4', bossBox(3, BOSS_WAIT_POS)],
        ['HUD', hudBox(frame.width)],
      ];
      for (const [name, b] of boxes) for (const l of LANES) expect(boxesOverlap(b, zoneBox(l)), `${vp.width}x${vp.height}: ${name} giao vùng đập ${l + 1}`).toBe(false);
    }
  });
});
