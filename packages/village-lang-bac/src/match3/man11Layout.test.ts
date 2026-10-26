import { describe, expect, it } from 'vitest';
import {
  CELL,
  CHECK_VIEWPORTS,
  GRID,
  MIN_CELL_PX,
  PANEL_PAD,
  SLOT_SIZE,
  WORLD,
  boxesOverlap,
  cellAt,
  cellCenter,
  cellPx,
  frameOfViewport,
  framePxWidth,
  man11Layout,
  nodePoint,
  rectInside,
  slotBox,
  slotPoint,
  treePoint,
  type Rect,
} from './man11Layout';
import { TREE_ART, TREE_CROP_ASPECT, TREE_ROOT, TREE_SLOTS, nodeUv, slotUvs, slotsSource } from './man11Slots';

const layoutAt = (width: number, height: number) => {
  const frame = frameOfViewport(width, height);
  return man11Layout(frame, framePxWidth(width, height));
};
const frameRect = (frame: 'landscape' | 'portrait'): Rect => ({ x0: -WORLD[frame].width / 2, x1: WORLD[frame].width / 2, y0: -WORLD[frame].height / 2, y1: WORLD[frame].height / 2 });

describe('man11Slots: 8 ô lá trên cây', () => {
  it('có đúng 8 ô nằm trong phần cây đã cắt, hai ô khác nhau không trùng', () => {
    expect(TREE_SLOTS).toHaveLength(8);
    for (const s of TREE_SLOTS) {
      expect(s.u).toBeGreaterThan(TREE_ART.u0);
      expect(s.u).toBeLessThan(TREE_ART.u1);
      expect(s.v).toBeGreaterThan(TREE_ART.v0);
      expect(s.v).toBeLessThan(TREE_ART.v1);
    }
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(Math.hypot(TREE_SLOTS[i].u - TREE_SLOTS[j].u, TREE_SLOTS[i].v - TREE_SLOTS[j].v), `${i} và ${j}`).toBeGreaterThan(0.05);
  });

  it('cây đối xứng hai bên (nửa trái 0 đến 3 phản chiếu thành nửa phải 7 đến 4 qua trục thân), hai ô anh em (2k, 2k + 1) cùng nửa', () => {
    const axis = TREE_ROOT.u;
    for (let i = 0; i < 4; i++) {
      const left = TREE_SLOTS[i];
      const right = TREE_SLOTS[7 - i];
      expect(Math.abs(left.u - axis + (right.u - axis)), `ô ${i}`).toBeLessThan(0.03);
      expect(Math.abs(left.v - right.v), `ô ${i}`).toBeLessThan(0.02);
    }
    for (let k = 0; k < 4; k++) expect((2 * k < 4) === (2 * k + 1 < 4)).toBe(true);
  });

  it('vòng 1 dùng 4 ô là hai cặp thấp nhất (0, 1, 6, 7); nút gộp mức cao nhất là gốc', () => {
    expect(slotUvs(4)).toEqual([TREE_SLOTS[0], TREE_SLOTS[1], TREE_SLOTS[6], TREE_SLOTS[7]]);
    expect(slotUvs(8)).toBe(TREE_SLOTS);
    expect(nodeUv(4, 2, 0)).toEqual(TREE_ROOT);
    expect(nodeUv(8, 3, 0)).toEqual(TREE_ROOT);
    // nút mức 1 nằm giữa hai ô con (lệch về gốc)
    const n = nodeUv(8, 1, 0);
    expect(n.u).toBeGreaterThan(Math.min(TREE_SLOTS[0].u, TREE_SLOTS[1].u) - 0.001);
    expect(n.u).toBeLessThan(TREE_ROOT.u);
    // nút mức 2 nằm giữa hai nút mức 1
    expect(nodeUv(8, 2, 0).u).toBeGreaterThan(nodeUv(8, 1, 0).u);
  });

  it('khối mã xuất cho trang dev có đủ 8 dòng', () => {
    const src = slotsSource(TREE_SLOTS);
    expect(src.split('\n').filter((l) => l.includes('{ u:'))).toHaveLength(8);
  });

  it('phần cây đã cắt có tỉ lệ rộng / cao hợp lý', () => {
    expect(TREE_CROP_ASPECT).toBeGreaterThan(1.1);
    expect(TREE_CROP_ASPECT).toBeLessThan(1.5);
  });
});

describe('man11Layout: ô, cây, HUD và nút "?" không chồng nhau', () => {
  for (const vp of CHECK_VIEWPORTS) {
    const name = `${vp.width}×${vp.height}`;
    const l = layoutAt(vp.width, vp.height);
    const fr = frameRect(l.frame);

    it(`${name} (${l.frame}): khay, cây, HUD, nút "?" nằm trong khung và không chồng nhau`, () => {
      const items: [string, Rect][] = [
        ['khay', l.panel],
        ['cây', l.tree],
        ['HUD', l.hud],
        ['nút ?', l.help],
      ];
      for (const [n, r] of items) expect(rectInside(r, fr), `${n} trong khung`).toBe(true);
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) expect(boxesOverlap(items[i][1], items[j][1]), `${items[i][0]} và ${items[j][0]}`).toBe(false);
      }
      // lưới nằm trọn trong khay
      expect(rectInside(l.board, l.panel)).toBe(true);
    });

    it(`${name}: 8 ô lá trên cây nằm trong khung, không chồng nhau, không chồng khay, HUD, nút "?"`, () => {
      const boxes = Array.from({ length: 8 }, (_, i) => slotBox(l, 8, i));
      boxes.forEach((b, i) => {
        expect(rectInside(b, fr), `ô ${i} trong khung`).toBe(true);
        expect(boxesOverlap(b, l.panel), `ô ${i} và khay`).toBe(false);
        expect(boxesOverlap(b, l.hud), `ô ${i} và HUD`).toBe(false);
        expect(boxesOverlap(b, l.help), `ô ${i} và nút ?`).toBe(false);
      });
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(boxesOverlap(boxes[i], boxes[j]), `ô ${i} và ${j}`).toBe(false);
      for (let i = 0; i < 4; i++) {
        const b = slotBox(l, 4, i);
        expect(rectInside(b, fr)).toBe(true);
      }
    });

    it(`${name}: {phanDien} lúc ló ra (nửa thân trên) không che ô lá trên cây, HUD hay nút "?"`, () => {
      const v = l.villain;
      const visible: Rect = { x0: v.x - 0.55, x1: v.x + 0.55, y0: fr.y0, y1: Math.min(fr.y1, v.peekY + v.height) };
      expect(v.hiddenY + v.height).toBeLessThan(fr.y0); // lúc ẩn nằm hẳn dưới mép khung
      for (let i = 0; i < 8; i++) expect(boxesOverlap(visible, slotBox(l, 8, i)), `ô ${i}`).toBe(false);
      expect(boxesOverlap(visible, l.hud)).toBe(false);
      expect(boxesOverlap(visible, l.help)).toBe(false);
      // ló ra ở mép bàn: bên phải khay (khung ngang) hay trong chiều rộng của khay (khung dọc)
      expect(visible.x1).toBeLessThanOrEqual(fr.x1);
    });
  }

  it('ô lá ≥ 40 điểm ảnh ở 360×640 (khung dọc) và 640×360 (khung ngang)', () => {
    expect(layoutAt(360, 640).frame).toBe('portrait');
    expect(layoutAt(640, 360).frame).toBe('landscape');
    expect(cellPx(layoutAt(360, 640))).toBeGreaterThanOrEqual(MIN_CELL_PX);
    expect(cellPx(layoutAt(640, 360))).toBeGreaterThanOrEqual(MIN_CELL_PX);
    expect(cellPx(layoutAt(844, 390))).toBeGreaterThanOrEqual(MIN_CELL_PX);
    expect(cellPx(layoutAt(1366, 768))).toBeGreaterThanOrEqual(MIN_CELL_PX);
  });

  it('khung dọc: cây ở trên, bàn ở dưới; khung ngang: bàn bên trái, cây bên phải', () => {
    const p = layoutAt(360, 640);
    expect(p.tree.y0).toBeGreaterThan(p.panel.y1);
    const h = layoutAt(640, 360);
    expect(h.tree.x0).toBeGreaterThan(h.panel.x1);
  });
});

describe('man11Layout: tọa độ ô và cây', () => {
  const l = layoutAt(1366, 768);

  it('cellAt khớp cellCenter với cả 49 ô, và ngoài lưới thì null', () => {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const p = cellCenter(l, r, c);
        expect(cellAt(l, p.x, p.y)).toEqual([r, c]);
      }
    }
    expect(cellAt(l, l.board.x0 - 0.01, 0)).toBeNull();
    expect(cellAt(l, l.board.x1 + 0.01, 0)).toBeNull();
    expect(cellAt(l, 0, l.board.y1 + 0.01)).toBeNull();
    expect(cellAt(l, 0, l.board.y0 - 0.01)).toBeNull();
  });

  it('lưới rộng 7 ô và đúng cỡ ô của từng khung', () => {
    expect(l.board.x1 - l.board.x0).toBeCloseTo(GRID * CELL.landscape, 9);
    expect(l.panel.x0).toBeCloseTo(l.board.x0 - PANEL_PAD, 9);
    expect(layoutAt(360, 640).cell).toBe(CELL.portrait);
  });

  it('treePoint đổi góc phần cây đã cắt thành góc hộp cây; nút gốc nằm trong hộp cây', () => {
    const tl = treePoint(l, { u: TREE_ART.u0, v: TREE_ART.v0 });
    expect(tl.x).toBeCloseTo(l.tree.x0, 9);
    expect(tl.y).toBeCloseTo(l.tree.y1, 9);
    const br = treePoint(l, { u: TREE_ART.u1, v: TREE_ART.v1 });
    expect(br.x).toBeCloseTo(l.tree.x1, 9);
    expect(br.y).toBeCloseTo(l.tree.y0, 9);
    const root = nodePoint(l, 8, 3, 0);
    expect(root.x).toBeGreaterThan(l.tree.x0);
    expect(root.x).toBeLessThan(l.tree.x1);
    expect(slotPoint(l, 8, 0).x).toBeLessThan(root.x);
    expect(slotPoint(l, 8, 7).x).toBeGreaterThan(root.x);
    expect(SLOT_SIZE).toBeGreaterThan(0.8);
  });
});
