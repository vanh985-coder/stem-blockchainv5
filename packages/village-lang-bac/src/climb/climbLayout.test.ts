import { describe, expect, it } from 'vitest';
import { CLIMB_SPEC } from './climbConfig';
import { tierY } from './climbLogic';
import { CROWN, PLAYER, ROOT, SIGN, STEP, TRUNK, WORLD, cameraY, crackAlpha, crownY, frameOf, labelFontPx, pxPerUnit, rootY, signY, trunkTiles, villainY } from './climbLayout';

/** Bề rộng ở cỡ 1 px của chuỗi dài nhất có thể (6 chữ số của gốc vòng 3; ước 0,62 em mỗi chữ số cho phông đậm). */
const WIDEST = 6 * 0.62;

describe('bố cục màn 12', () => {
  it('đầu người đứng thẳng không chạm đáy bậc tầng trên', () => {
    expect(PLAYER.height).toBeLessThan(CLIMB_SPEC.gap - STEP.height);
  });

  it('khung nhìn (dọc và ngang): thấy người chơi, bậc đang đứng và các bậc lựa chọn tầng trên, kể cả đỉnh cú nhảy', () => {
    for (const frame of ['portrait', 'landscape'] as const) {
      const H = WORLD[frame].height;
      for (let k = 0; k < 5; k++) {
        const cy = cameraY(frame, k);
        const top = cy + H / 2;
        const bottom = cy - H / 2;
        expect(tierY(k) - STEP.height).toBeGreaterThan(bottom);
        expect(tierY(k) + CLIMB_SPEC.jumpApex + PLAYER.height * 0.5).toBeLessThan(top + 1);
        expect(tierY(k + 1)).toBeLessThan(top);
        expect(tierY(k + 1) - STEP.height).toBeGreaterThan(bottom);
      }
    }
  });

  it('bậc và biên đi lại nằm trong khung (khung dọc rộng 9, ngang rộng 16 nên cây ở giữa, hai bên là trời)', () => {
    const reach = CLIMB_SPEC.bounds + CLIMB_SPEC.playerHalf;
    const farStep = Math.max(...Object.values(CLIMB_SPEC.choiceX).flat().map(Math.abs)) + CLIMB_SPEC.slideAmplitude + STEP.width / 2;
    for (const w of [WORLD.portrait.width, WORLD.landscape.width]) {
      expect(reach).toBeLessThan(w / 2);
      expect(farStep).toBeLessThan(w / 2);
    }
    expect(WORLD.landscape.width / 2 - farStep).toBeGreaterThan(3);
  });

  it('ngọn cây: biển "Gốc trong sổ" ở trên đầu người đứng ở gốc, {phanDien} ngồi trên biển, gốc cây dưới tầng lá', () => {
    for (const depth of [3, 4]) {
      expect(signY(depth) - SIGN.height / 2).toBeGreaterThan(tierY(depth) + PLAYER.height);
      expect(villainY(depth)).toBeGreaterThan(signY(depth) + SIGN.height / 2);
      expect(crownY(depth) + CROWN.height / 2).toBeGreaterThan(villainY(depth));
      expect(rootY() + ROOT.height / 2).toBeGreaterThan(tierY(0) - STEP.height);
      expect(trunkTiles(depth).length).toBeGreaterThanOrEqual(Math.floor((depth * CLIMB_SPEC.gap) / TRUNK.tile));
    }
  });

  it('chữ số trên bậc ≥ 16 px ở 360 × 800 (chữ to nhân 1,15), thu cho vừa bề rộng bậc nhưng không dưới 16', () => {
    const ppu = pxPerUnit('portrait', 360);
    expect(labelFontPx(ppu, false, WIDEST)).toBeGreaterThanOrEqual(16);
    expect(labelFontPx(ppu, true, WIDEST)).toBeGreaterThanOrEqual(16);
    expect(labelFontPx(ppu, true, 2 * 0.62)).toBeGreaterThanOrEqual(16 * 1.15 - 1e-9);
    expect(labelFontPx(pxPerUnit('landscape', 1366), false, WIDEST)).toBeGreaterThan(30);
  });

  it('chọn khung theo kích thước màn hình', () => {
    expect(frameOf(360, 800)).toBe('portrait');
    expect(frameOf(844, 390)).toBe('landscape');
    expect(frameOf(1366, 768)).toBe('landscape');
  });

  it('bậc sai mờ dần trong 0,4 giây', () => {
    expect(crackAlpha(CLIMB_SPEC.crackSeconds)).toBe(1);
    expect(crackAlpha(0)).toBe(0);
    expect(crackAlpha(CLIMB_SPEC.crackSeconds / 2)).toBeCloseTo(0.5);
  });
});
