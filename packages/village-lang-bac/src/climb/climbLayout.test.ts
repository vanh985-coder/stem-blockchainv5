import { describe, expect, it } from 'vitest';
import { fitFrame } from '@so-chung/core/three/scene25d/layout25d';
import { CLIMB_ROUNDS, CLIMB_SPEC } from './climbConfig';
import {
  BAR,
  COIN,
  CROWN,
  HANDLE,
  LABEL,
  LEVEL_GAP,
  ROOT,
  TRUNK,
  WORLD,
  barY,
  cameraY,
  coinSpots,
  frameOf,
  feetY,
  heldLabelVisible,
  playerTopY,
  labelFontPx,
  labelY,
  pxPerUnit,
  rootY,
  topY,
  trunkTiles,
} from './climbLayout';

/** Bề rộng ở cỡ 1 px của chuỗi dài nhất có thể ("Nay: 131769", 11 ký tự; ước 0,56 em mỗi ký tự cho phông đậm). */
const WIDEST = 11 * 0.56;

describe('bố cục màn 12', () => {
  it('hai nhãn của cặp tay nắm không chồng nhau; tay nắm chạy trong thanh ngang', () => {
    expect(LABEL.width).toBeLessThan(2 * CLIMB_SPEC.halfGap);
    const reachX = CLIMB_SPEC.sway + CLIMB_SPEC.halfGap;
    expect(reachX + HANDLE.width / 2).toBeLessThanOrEqual(BAR.width / 2);
  });

  it('một tầng: tay nắm dưới thanh, nhãn trên thanh, tiền đồng ở giữa nhãn tầng dưới và tay nắm tầng trên; người chơi không đụng thanh tầng dưới', () => {
    for (let k = 0; k < 6; k++) {
      const labelTop = labelY(k) + LABEL.height / 2;
      const nextHandleBottom = barY(k + 1) - HANDLE.height;
      for (const c of coinSpots(k)) {
        expect(c.y - COIN.size / 2).toBeGreaterThan(labelTop);
        expect(c.y + COIN.size / 2).toBeLessThan(nextHandleBottom + 0.6);
      }
      // nhãn tầng k + 1 nằm dưới tay nắm tầng k + 2
      expect(labelY(k + 1) + LABEL.height / 2).toBeLessThan(barY(k + 2) - HANDLE.height + 0.2);
      // chân người chơi treo ở tầng k + 1 ở trên thanh tầng k
      expect(feetY(k + 1)).toBeGreaterThan(barY(k) + BAR.height / 2);
      // người chơi treo ở tầng k không che nhãn trên thanh của tầng k (đỉnh ngón tay dưới đáy nhãn)
      expect(playerTopY(k)).toBeLessThan(labelY(k) - LABEL.height / 2);
    }
  });

  it('khung nhìn (dọc và ngang): thấy người chơi từ đầu tới chân, thanh và nhãn của tầng trên', () => {
    for (const frame of ['portrait', 'landscape'] as const) {
      const H = WORLD[frame].height;
      for (let k = 0; k < 6; k++) {
        const cy = cameraY(frame, k);
        const bottom = cy - H / 2;
        const top = cy + H / 2;
        expect(feetY(k), `${frame} tầng ${k}: chân`).toBeGreaterThanOrEqual(bottom - 0.15);
        expect(labelY(k + 1) + LABEL.height / 2, `${frame} tầng ${k}: nhãn tầng trên`).toBeLessThanOrEqual(top - (frame === 'portrait' ? 0.8 : 0.4)); // chừa thanh HUD (khung ngang: HUD ở hai góc, giữa trống)
      }
    }
  });

  it('chữ nhãn ≥ 14 px và vừa bề rộng nhãn ở 360 × 640, 844 × 390, 1366 × 768 (cả "Chữ to")', () => {
    for (const s of [
      { w: 360, h: 640 },
      { w: 844, h: 390 },
      { w: 1366, h: 768 },
    ]) {
      const frame = frameOf(s.w, s.h);
      const box = fitFrame({ width: s.w, height: s.h }, WORLD[frame].width / WORLD[frame].height);
      const ppu = pxPerUnit(frame, box.width);
      for (const large of [false, true]) {
        const f = labelFontPx(ppu, large, WIDEST);
        expect(f, `${s.w}x${s.h}`).toBeGreaterThanOrEqual(14);
        expect(f * WIDEST, `${s.w}x${s.h} bề rộng`).toBeLessThanOrEqual(LABEL.width * ppu * 0.9 + 1e-9);
        expect(f * 1.2 * 2, `${s.w}x${s.h} chiều cao`).toBeLessThanOrEqual(LABEL.height * ppu);
      }
    }
  });

  it('nhãn tay nắm đang giữ: ẩn từ lúc bật lên tới khi người chơi về xong chỗ treo; hiện lại khi về tay nắm cũ hay sang tầng mới', () => {
    // đang treo, đoạn chuyển động đã xong
    expect(heldLabelVisible(null, 5000, 4000)).toBe(true);
    // vừa bật lên (cú bật đang bay tới đỉnh): ẩn
    expect(heldLabelVisible(5350, 5100, 4000)).toBe(false);
    // tới đỉnh, nắm trượt (ngõ cụt hay hụt): người chơi đang tụt về (320 ms): vẫn ẩn, hết đoạn tụt thì hiện
    expect(heldLabelVisible(null, 5400, 5350 + 320)).toBe(false);
    expect(heldLabelVisible(null, 5700, 5350 + 320)).toBe(true);
    // nắm được, sang tầng mới (160 ms kéo về chỗ treo): ẩn rồi hiện
    expect(heldLabelVisible(null, 5400, 5350 + 160)).toBe(false);
    expect(heldLabelVisible(null, 5600, 5350 + 160)).toBe(true);
  });

  it('thân cây liền từ gốc tới ngọn ở cả 4 vòng (các khúc chồng nhau, không hở)', () => {
    for (const r of CLIMB_ROUNDS) {
      const tiles = trunkTiles(r.depth);
      expect(tiles[0] - TRUNK.tile / 2).toBeLessThanOrEqual(rootY() + ROOT.height / 2);
      for (let i = 1; i < tiles.length; i++) expect(tiles[i] - tiles[i - 1]).toBeLessThanOrEqual(TRUNK.tile);
      expect(tiles[tiles.length - 1] + TRUNK.tile / 2).toBeGreaterThanOrEqual(topY(r.depth) - CROWN.height / 2);
      expect(topY(r.depth)).toBeGreaterThan(barY(r.depth));
    }
    expect(LEVEL_GAP).toBeGreaterThan(LABEL.above + LABEL.height / 2 + HANDLE.height);
  });
});
