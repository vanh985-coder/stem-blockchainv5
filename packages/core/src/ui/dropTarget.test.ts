import { describe, expect, it } from 'vitest';
import { acceptsCard, centerInside, intersectionArea, layoutScale, pickDropSlot, type Box } from './dropTarget';

const slot: Box = { left: 100, top: 100, width: 100, height: 50 };
const card = (left: number, top: number, w = 80, h = 60): Box => ({ left, top, width: w, height: h });

describe('intersectionArea', () => {
  it('không chạm thì 0, chạm cạnh thì 0', () => {
    expect(intersectionArea(card(0, 0), slot)).toBe(0);
    expect(intersectionArea(card(200, 100), slot)).toBe(0);
  });
  it('tính đúng phần giao', () => {
    expect(intersectionArea(card(60, 100, 80, 60), slot)).toBe(40 * 50);
  });
});

describe('acceptsCard', () => {
  it('thẻ đè lên ô nhưng tâm thẻ ở ngoài ô: nhận nếu giao ≥ 30% diện tích thẻ', () => {
    // thẻ 80×60 = 4800; ô lấy phần giao 80×20 = 1600 (33%), tâm thẻ (y=60+30=... dưới ô) ở ngoài
    const c = card(110, 130, 80, 60); // tâm (150,160) ngoài ô (cao đến 150)
    expect(centerInside(c, slot)).toBe(false);
    expect(intersectionArea(c, slot)).toBe(80 * 20);
    expect(acceptsCard(c, slot)).toBe(true);
  });
  it('giao dưới 30% và tâm ngoài ô: không nhận', () => {
    expect(acceptsCard(card(110, 140, 80, 60), slot)).toBe(false); // giao 80×10 = 800 (16,7%)
  });
  it('tâm thẻ trong ô thì nhận kể cả khi giao nhỏ hơn 30% (thẻ to hơn ô)', () => {
    const big = card(60, 40, 180, 170); // tâm (150,125) trong ô; giao 5000/30600 = 16%
    expect(centerInside(big, slot)).toBe(true);
    expect(acceptsCard(big, slot)).toBe(true);
  });
  it('thẻ rỗng không nhận', () => {
    expect(acceptsCard(card(100, 100, 0, 0), slot)).toBe(false);
  });
});

describe('pickDropSlot', () => {
  const a = { id: 'a', rect: { left: 0, top: 0, width: 100, height: 50 } };
  const b = { id: 'b', rect: { left: 110, top: 0, width: 100, height: 50 } };
  it('thả ra ngoài mọi ô thì null', () => {
    expect(pickDropSlot(card(500, 500), [a, b])).toBeNull();
  });
  it('chồng nhiều ô: lấy ô giao nhiều nhất', () => {
    // thẻ 80×50 ở x=60: giao với a 40×50, với b 30×50 (x 110–140)
    expect(pickDropSlot(card(60, 0, 80, 50), [a, b])).toBe('a');
    expect(pickDropSlot(card(75, 0, 80, 50), [a, b])).toBe('b'); // a giao 25, b giao 45
  });
  it('bằng nhau thì lấy ô có tâm gần tâm thẻ', () => {
    const c1 = { id: 'c1', rect: { left: 0, top: 0, width: 100, height: 100 } };
    const c2 = { id: 'c2', rect: { left: 0, top: 0, width: 100, height: 100 } };
    expect(pickDropSlot(card(10, 10, 40, 40), [c1, c2])).toBe('c1'); // hòa hoàn toàn: ô đầu
  });
  it('ô chỉ đủ điều kiện mới được chọn dù ô khác giao nhiều hơn một chút', () => {
    const near = { id: 'near', rect: { left: 0, top: 0, width: 100, height: 100 } };
    expect(pickDropSlot(card(95, 0, 80, 60), [near])).toBeNull(); // giao 5×60 nhỏ, tâm ngoài
  });
});

describe('layoutScale', () => {
  it('phần tử trong khối phóng 1,25: bề rộng vẽ / bề rộng bố cục', () => {
    expect(layoutScale(100, 80)).toBeCloseTo(1.25, 6);
  });
  it('số đo hỏng thì 1', () => {
    expect(layoutScale(0, 80)).toBe(1);
    expect(layoutScale(80, 0)).toBe(1);
    expect(layoutScale(Number.NaN, 80)).toBe(1);
  });
});
