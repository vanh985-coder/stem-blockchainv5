import { describe, expect, it } from 'vitest';
import { CHICKEN_SPEC } from './chickenConfig';
import {
  BOSS_DIMS,
  CARD_MIN_FONT_PX,
  CHECK_VIEWPORTS,
  CHICKEN_DIMS,
  FACING,
  HUD,
  MEDICINE_BAR,
  RUN_HOME,
  SHOOT_FROM,
  SLING,
  SLING_BOX,
  SPARKLES,
  STUDENT_BOX,
  bossPose,
  boxesOverlap,
  cardAnchor,
  cardFontPx,
  chickenBox,
  chickenHit,
  chickenPose,
  coopPoint,
  framePxWidth,
  hudBox,
  keepClearBoxes,
  medicineBarBox,
  riderFoot,
  runHomeSeconds,
  slingAngle,
  slingTip,
  sparkleAt,
  spriteDims,
  CHICKEN_ART,
  type ChickenPose,
} from './chickenLayout';

const pose = (): ChickenPose => ({ x: 0, y: 0, scale: 1, height: 0, width: 0 });
const L = CHICKEN_SPEC.laneLength;
const names = ['ná', 'học sinh', 'bảng thuốc 3 nút', 'bảng thuốc 4 nút', 'HUD'] as const;

describe('chickenLayout: ná, học sinh, bảng thuốc và HUD không che nửa dưới ba làn', () => {
  const clear = keepClearBoxes();

  it('lấy mẫu nửa dưới của cả ba làn (mỗi đơn vị pos, từ giữa làn tới cổng)', () => {
    expect(clear).toHaveLength(CHICKEN_SPEC.lanes * (L - SHOOT_FROM + 1));
  });

  for (const vp of CHECK_VIEWPORTS) {
    it(`${vp.width}×${vp.height}: không đồ nào chồng lên làn, và không đồ nào chồng lên nhau`, () => {
      const fw = framePxWidth(vp.width, vp.height);
      const boxes = [SLING_BOX, STUDENT_BOX, medicineBarBox(fw, 3), medicineBarBox(fw, 4), hudBox(fw)];
      boxes.forEach((b, i) => {
        clear.forEach((c) => expect(boxesOverlap(b, c), `${names[i]} che làn ở ${vp.width}×${vp.height}`).toBe(false));
      });
      const overlap = (a: number, b: number) => boxesOverlap(boxes[a], boxes[b]);
      expect(overlap(0, 1), 'ná và học sinh').toBe(false);
      expect(overlap(0, 3), 'ná và bảng thuốc 4 nút').toBe(false);
      expect(overlap(1, 3), 'học sinh và bảng thuốc').toBe(false);
      expect(overlap(3, 4), 'bảng thuốc và HUD').toBe(false);
      expect(overlap(0, 4) || overlap(1, 4)).toBe(false);
    });

    it(`${vp.width}×${vp.height}: mọi hộp nằm trong khung 16 × 9, nút thuốc từ 44 điểm ảnh trở lên`, () => {
      const fw = framePxWidth(vp.width, vp.height);
      for (const b of [SLING_BOX, STUDENT_BOX, medicineBarBox(fw, 4), hudBox(fw)]) {
        expect(b.x0).toBeGreaterThanOrEqual(-8);
        expect(b.x1).toBeLessThanOrEqual(8);
        expect(b.y0).toBeGreaterThanOrEqual(-4.5);
        expect(b.y1).toBeLessThanOrEqual(4.5);
      }
      const ppu = fw / 16;
      expect(MEDICINE_BAR.w).toBeGreaterThanOrEqual(44);
      expect(MEDICINE_BAR.h).toBeGreaterThanOrEqual(44);
      const bar = medicineBarBox(fw, 4);
      expect((bar.y1 - bar.y0) * ppu).toBeCloseTo(MEDICINE_BAR.h, 6);
      expect((hudBox(fw).x1 - hudBox(fw).x0) * ppu).toBeCloseTo(HUD.width, 6);
    });

    it(`${vp.width}×${vp.height}: chữ thẻ số trên gà từ 14 điểm ảnh trở lên ở mọi chỗ gà đứng, nhất là nửa dưới làn`, () => {
      const fw = framePxWidth(vp.width, vp.height);
      const ppu = fw / 16;
      const p = pose();
      for (let lane = 0; lane < CHICKEN_SPEC.lanes; lane++) {
        for (let pos = 0; pos <= L; pos += 0.5) {
          chickenPose(lane, pos, p);
          expect(cardFontPx(p.height * ppu)).toBeGreaterThanOrEqual(CARD_MIN_FONT_PX);
          expect(cardFontPx(p.height * ppu, true)).toBeGreaterThan(cardFontPx(p.height * ppu));
        }
      }
    });
  }

  it('thân gà và thẻ số của nửa dưới không chui ra ngoài khung', () => {
    for (const c of clear) {
      expect(c.x0).toBeGreaterThan(-8);
      expect(c.x1).toBeLessThan(8);
      expect(c.y1).toBeLessThan(4.5);
      expect(c.y0).toBeGreaterThan(-4.5);
    }
  });
});

describe('chickenLayout: gà, thẻ số, trúng gà', () => {
  it('gà càng gần cổng càng to; gà trùm to hơn gà thường ở cùng chỗ', () => {
    const a = chickenPose(1, 0, pose());
    const b = chickenPose(1, L, pose());
    expect(b.height).toBeGreaterThan(a.height * 2);
    expect(b.height).toBeCloseTo(CHICKEN_DIMS.contentH, 9);
    const boss = bossPose(1, L, pose());
    expect(boss.height).toBeGreaterThan(b.height);
    expect(boss.width).toBeCloseTo(BOSS_DIMS.contentW, 9);
  });

  it('spriteDims: khung ảnh chứa phần có hình, chân ở đáy phần có hình', () => {
    const d = spriteDims(CHICKEN_ART, 2);
    expect(d.quadH).toBeCloseTo(2 / (CHICKEN_ART.v1 - CHICKEN_ART.v0), 9);
    expect(d.quadW / d.quadH).toBeCloseTo(CHICKEN_ART.aspect, 9);
    // chân (đáy phần có hình) ở dưới tâm khung ảnh một đoạn (v1 − 0,5) × quadH
    expect(d.centerUp).toBeCloseTo((CHICKEN_ART.v1 - 0.5) * d.quadH, 9);
    expect(d.centerUp).toBeGreaterThan(0);
    expect(d.contentW).toBeLessThan(d.quadW);
  });

  it('thẻ số treo trên đầu, lệch về phía mặt gà (gà quay sang trái nên thẻ lệch sang trái)', () => {
    const p = chickenPose(0, 6, pose());
    const a = cardAnchor(p, { x: 0, y: 0 });
    expect(FACING).toBe(-1);
    expect(a.x).toBeLessThan(p.x);
    expect(a.y).toBeGreaterThan(p.y + p.height);
  });

  it('cỡ chữ thẻ số: kẹp trong 14 đến 30, "Chữ to" nhân 1,15', () => {
    expect(cardFontPx(10)).toBe(14);
    expect(cardFontPx(70)).toBe(14);
    expect(cardFontPx(100)).toBe(20);
    expect(cardFontPx(1000)).toBe(30);
    expect(cardFontPx(1000, true)).toBe(35);
  });

  it('chickenHit: trúng thân và thẻ số, trượt khi ở xa, khoảng cách tính tới giữa thân', () => {
    const p = chickenPose(1, 8, pose());
    expect(chickenHit(p.x, p.y + p.height / 2, p)).toBeCloseTo(0, 9);
    expect(chickenHit(p.x, p.y + p.height * 1.2, p)).toBeGreaterThan(0);
    expect(chickenHit(p.x + p.width, p.y + p.height / 2, p)).toBe(-1);
    expect(chickenHit(p.x, p.y - p.height, p)).toBe(-1);
    expect(chickenHit(p.x, chickenBox(p).y1 + 0.2, p)).toBe(-1);
  });

  it('{phanDien} ngồi trên yên: chỗ đặt chân nằm trong thân gà trùm, cao hơn nửa thân', () => {
    const p = bossPose(1, 5, pose());
    const foot = riderFoot(p, { x: 0, y: 0 });
    expect(Math.abs(foot.x - p.x)).toBeLessThan(p.width / 2);
    expect(foot.y).toBeGreaterThan(p.y + p.height * 0.5);
    expect(foot.y).toBeLessThan(p.y + p.height);
  });
});

describe('chickenLayout: ná và học sinh', () => {
  it('ná quay về phía gà: gà bên phải thì góc dương, bên trái thì âm, thẳng phía trên thì 0, kẹp ở ±maxAngle', () => {
    expect(slingAngle(SLING.x, 0)).toBeCloseTo(0, 9);
    expect(slingAngle(2, 0)).toBeGreaterThan(0);
    expect(slingAngle(-2, 0)).toBeLessThan(0);
    expect(slingAngle(40, -4)).toBeCloseTo(SLING.maxAngle, 9);
    expect(slingAngle(-40, -4)).toBeCloseTo(-SLING.maxAngle, 9);
  });

  it('đầu chạc ná: thẳng đứng thì ở ngay trên chân cán, nghiêng thì lệch về phía nghiêng', () => {
    const up = slingTip(0, { x: 0, y: 0 });
    expect(up.x).toBeCloseTo(SLING.x, 9);
    expect(up.y).toBeCloseTo(SLING.baseY + SLING.height * 0.95, 9);
    expect(slingTip(0.5, { x: 0, y: 0 }).x).toBeGreaterThan(SLING.x);
    expect(slingTip(-0.5, { x: 0, y: 0 }).x).toBeLessThan(SLING.x);
  });

  it('ná quét qua mọi góc vẫn nằm trong SLING_BOX', () => {
    for (let a = -SLING.maxAngle; a <= SLING.maxAngle + 1e-9; a += 0.05) {
      const t = slingTip(a, { x: 0, y: 0 });
      expect(t.x).toBeGreaterThan(SLING_BOX.x0);
      expect(t.x).toBeLessThan(SLING_BOX.x1);
      expect(t.y).toBeLessThan(SLING_BOX.y1);
    }
  });
});

describe('chickenLayout: gà khỏi bệnh chạy về chuồng', () => {
  it('chuồng ở mép trái đường, bên trái mọi làn', () => {
    const c = coopPoint({ x: 0, y: 0 });
    const p = chickenPose(0, L, pose());
    expect(c.x).toBeLessThan(p.x);
  });

  it('thời gian chạy tỉ lệ với quãng đường, làn xa chuồng thì chạy lâu hơn', () => {
    const near = chickenPose(0, 5, pose());
    const far = chickenPose(2, 5, pose());
    expect(runHomeSeconds(far.x, far.y)).toBeGreaterThan(runHomeSeconds(near.x, near.y));
    const c = coopPoint({ x: 0, y: 0 });
    expect(runHomeSeconds(c.x + RUN_HOME.speed, c.y)).toBeCloseTo(1, 9);
    expect(runHomeSeconds(far.x, far.y)).toBeLessThan(2.5);
  });

  it('tia lấp lánh: có SPARKLES tia, cỡ 0 ở hai đầu và to nhất ở giữa, ngoài khoảng thì cỡ 0, các tia tỏa ra khác hướng nhau', () => {
    const o = { dx: 0, dy: 0, scale: 0 };
    expect(sparkleAt(0, 0, o).scale).toBeCloseTo(0, 9);
    expect(sparkleAt(0, RUN_HOME.sparkle, o).scale).toBeCloseTo(0, 6);
    expect(sparkleAt(0, RUN_HOME.sparkle / 2, o).scale).toBeCloseTo(1, 9);
    expect(sparkleAt(0, RUN_HOME.sparkle + 1, o).scale).toBe(0);
    expect(sparkleAt(0, -1, o).scale).toBe(0);
    const spots = new Set(Array.from({ length: SPARKLES }, (_, i) => `${sparkleAt(i, 0.3, o).dx.toFixed(3)},${o.dy.toFixed(3)}`));
    expect(spots.size).toBe(SPARKLES);
  });
});
