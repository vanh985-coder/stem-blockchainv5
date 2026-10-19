import { describe, expect, it } from 'vitest';
import { GATE_TRIGGER_DISTANCE, ZONE_LOAD_DISTANCE, ZONE_UNLOAD_DELAY, ZONE_UNLOAD_DISTANCE, insideVillage, nearGate, newZoneState, rimDistance, stepZone } from './worldZones';
import { effectivePages, lastGiver, targetNodeId } from './worldQuest';
import { assembleWorld } from './worldLayout';
import { createRouter, type RouteStep } from './roadGraph';

describe('vùng làng: tải và dọn có độ trễ', () => {
  it('khoảng cách tới rìa: 0 khi ở trong, đúng khoảng cách khi ở ngoài', () => {
    expect(rimDistance(0, 89.5, 21, 0, 89.5)).toBe(0);
    expect(rimDistance(0, 89.5, 21, 0, 0)).toBeCloseTo(68.5, 9);
    expect(rimDistance(0, 89.5, 21, 30, 89.5)).toBeCloseTo(9, 9);
  });
  it('chưa tải: tải khi rìa dưới 60, chưa tải ở 60 trở lên', () => {
    const s = newZoneState();
    expect(stepZone(s, ZONE_LOAD_DISTANCE, 0)).toBe(false);
    expect(s.loaded).toBe(false);
    expect(stepZone(s, ZONE_LOAD_DISTANCE - 0.1, 0)).toBe(true);
    expect(s.loaded).toBe(true);
  });
  it('đã tải: ở giữa 60 và 90 thì giữ nguyên; xa hơn 90 phải liên tục đủ độ trễ mới dọn', () => {
    const s = newZoneState();
    stepZone(s, 10, 0);
    expect(stepZone(s, 75, 1)).toBe(false);
    expect(stepZone(s, ZONE_UNLOAD_DISTANCE + 1, 2)).toBe(false); // bắt đầu đếm
    expect(stepZone(s, ZONE_UNLOAD_DISTANCE + 1, 2 + ZONE_UNLOAD_DELAY - 0.1)).toBe(false);
    expect(s.loaded).toBe(true);
    expect(stepZone(s, ZONE_UNLOAD_DISTANCE + 1, 2 + ZONE_UNLOAD_DELAY)).toBe(true);
    expect(s.loaded).toBe(false);
  });
  it('quay lại trong ngưỡng dọn giữa chừng thì hủy đếm', () => {
    const s = newZoneState();
    stepZone(s, 10, 0);
    stepZone(s, 95, 1);
    stepZone(s, 80, 2);
    expect(s.farSince).toBe(-1);
    stepZone(s, 95, 3);
    expect(stepZone(s, 95, 3 + ZONE_UNLOAD_DELAY - 0.5)).toBe(false);
    expect(s.loaded).toBe(true);
  });
  it('lắc qua lại quanh ngưỡng không tải rồi dọn liên tục: tải một lần rồi giữ', () => {
    const s = newZoneState();
    let changes = 0;
    for (let t = 0; t < 40; t++) if (stepZone(s, t % 2 ? 59 : 75, t)) changes++;
    expect(changes).toBe(1);
  });
});

describe('vào làng và gần cổng', () => {
  it('vào làng khi cách tâm làng dưới bán kính vào làng (đã bước qua cổng)', () => {
    expect(insideVillage(0, 89.5, 0, 72)).toBe(false); // đang ở cổng
    expect(insideVillage(0, 89.5, 0, 74)).toBe(true);
    expect(insideVillage(0, 89.5, 0, 60)).toBe(false);
  });
  it('gần cổng nào trong 12: cổng gần nhất; ngoài tầm thì null', () => {
    const gates = [
      { id: 'giay' as const, x: 0, z: 72 },
      { id: 'det' as const, x: 0, z: -72 },
    ];
    expect(nearGate(gates, 0, 62)).toBe('giay');
    expect(nearGate(gates, 0, -60.5)).toBe('det');
    expect(nearGate(gates, 0, 50)).toBeNull();
    expect(GATE_TRIGGER_DISTANCE).toBe(12);
  });
});

describe('nhiệm vụ và đích mũi tên', () => {
  it('đang chờ chiếu cảnh trao trang thì chưa tính trang mới; chiếu xong thì tính ngay', () => {
    expect(effectivePages(1, true)).toBe(0);
    expect(effectivePages(1, false)).toBe(1);
    expect(effectivePages(0, true)).toBe(0);
    expect(effectivePages(4, true)).toBe(3);
    expect(effectivePages(9, false)).toBe(4);
  });
  it('làng vừa trao trang cuối', () => {
    expect(lastGiver(0)).toBeNull();
    expect(lastGiver(1)).toBe('lang-giay');
    expect(lastGiver(3)).toBe('lang-khac-dau');
  });
  it('ngoài làng: đích là cổng làng cần tới theo số trang; đủ 4 trang thì không có đích', () => {
    expect(targetNodeId({ inVillage: null, nextBoard: null, pages: 0 })).toBe('gate:giay');
    expect(targetNodeId({ inVillage: null, nextBoard: 1, pages: 1 })).toBe('gate:det');
    expect(targetNodeId({ inVillage: null, nextBoard: null, pages: 3 })).toBe('gate:bac');
    expect(targetNodeId({ inVillage: null, nextBoard: null, pages: 4 })).toBeNull();
  });
  it('trong làng còn việc: đích là biển của việc tiếp theo; làng xong việc thì ra cổng làng kế tiếp', () => {
    expect(targetNodeId({ inVillage: 'lang-giay', nextBoard: 2, pages: 0 })).toBe('board:2');
    expect(targetNodeId({ inVillage: 'lang-giay', nextBoard: null, pages: 1 })).toBe('gate:det');
  });
});

describe('mũi tên đi theo đường trong thế giới thật', () => {
  const w = assembleWorld();
  const router = createRouter(w.graph);
  const out: RouteStep = { x: 0, z: 0, remaining: 0, found: false };
  it('từ chỗ xuất hiện ở chợ (0, −10) tới cổng Làng Giấy: đi vòng quanh cây đa, dài hơn đường chim bay', () => {
    router.setTarget('gate:giay');
    router.next(0, -10, out);
    expect(out.found).toBe(true);
    expect(out.remaining).toBeGreaterThan(82); // chim bay 82
    expect(out.remaining).toBeLessThan(140);
    expect(out.z).toBeLessThan(0); // điểm kế tiếp không nằm xuyên cây đa về phía bắc
  });
  it('từ chợ tới biển màn 3 trong Làng Giấy, và tới cổng Bạc qua cầu, đều tìm được đường', () => {
    router.setTarget('board:3');
    router.next(0, 0, out);
    expect(out.found).toBe(true);
    expect(out.remaining).toBeGreaterThan(80);
    router.setTarget('gate:bac');
    router.next(-20, 0, out);
    expect(out.found).toBe(true);
    expect(out.remaining).toBeCloseTo(52, 0); // dọc trục đông, qua cầu
  });
});
