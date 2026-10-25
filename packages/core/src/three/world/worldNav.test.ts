import { describe, expect, it } from 'vitest';
import { GATE_TRIGGER_DISTANCE, ZONE_LOAD_DISTANCE, ZONE_PREWARM_DISTANCE, ZONE_PREWARM_RELEASE, ZONE_UNLOAD_DELAY, ZONE_UNLOAD_DISTANCE, insideVillage, nearGate, newZoneState, onRoadTo, rimDistance, ROAD_START_AXIAL, stepPrewarm, stepZone } from './worldZones';
import { effectivePages, lastGiver, targetNodeId } from './worldQuest';
import { assembleWorld } from './worldLayout';
import { createRouter, type RouteStep } from './roadGraph';
import { resolveCollisions } from '../collision';
import { PLAYER_START } from '../cho/marketLayout';

describe('vùng làng: tải và dọn có độ trễ', () => {
  it('khoảng cách tới rìa: 0 khi ở trong, đúng khoảng cách khi ở ngoài', () => {
    expect(rimDistance(0, 89.5, 21, 0, 89.5)).toBe(0);
    expect(rimDistance(0, 89.5, 21, 0, 0)).toBeCloseTo(68.5, 9);
    expect(rimDistance(0, 89.5, 21, 30, 89.5)).toBeCloseTo(9, 9);
  });
  it('chưa tải: tải khi rìa dưới ngưỡng tải (50), chưa tải ở ngưỡng trở lên', () => {
    const s = newZoneState();
    expect(stepZone(s, ZONE_LOAD_DISTANCE, 0)).toBe(false);
    expect(s.loaded).toBe(false);
    expect(stepZone(s, ZONE_LOAD_DISTANCE - 0.1, 0)).toBe(true);
    expect(s.loaded).toBe(true);
  });
  it('đã tải: ở giữa ngưỡng tải và 90 thì giữ nguyên; xa hơn 90 phải liên tục đủ độ trễ mới dọn', () => {
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
    for (let t = 0; t < 40; t++) if (stepZone(s, t % 2 ? ZONE_LOAD_DISTANCE - 1 : 75, t)) changes++;
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

describe('chuẩn bị sẵn vùng làng (bước W2, chọn lọc ở bước W3)', () => {
  it('làng không cần thì bật khi rìa dưới 56, giữ nguyên giữa 56 và 100, tắt khi xa hơn 100', () => {
    const s = newZoneState();
    expect(stepPrewarm(s, ZONE_PREWARM_DISTANCE)).toBe(false);
    expect(s.prewarm).toBe(false);
    expect(stepPrewarm(s, ZONE_PREWARM_DISTANCE - 0.1)).toBe(true);
    expect(s.prewarm).toBe(true);
    expect(stepPrewarm(s, 80)).toBe(false); // giữa hai ngưỡng: giữ
    expect(s.prewarm).toBe(true);
    expect(stepPrewarm(s, ZONE_PREWARM_RELEASE)).toBe(false);
    expect(stepPrewarm(s, ZONE_PREWARM_RELEASE + 0.1)).toBe(true);
    expect(s.prewarm).toBe(false);
    expect(stepPrewarm(s, 80)).toBe(false); // vùng giữa mà chưa bật thì chưa bật
    expect(s.prewarm).toBe(false);
  });
  it('vùng đang tải luôn được chuẩn bị; làng cần (nhiệm vụ, đang ở trên đường tới) được chuẩn bị dù xa, và thôi khi hết cần và đã xa', () => {
    const s = newZoneState();
    s.loaded = true;
    expect(stepPrewarm(s, 500)).toBe(true);
    expect(s.prewarm).toBe(true);
    const t = newZoneState();
    expect(stepPrewarm(t, 300, true)).toBe(true); // làng của nhiệm vụ: xa vẫn chuẩn bị
    expect(t.prewarm).toBe(true);
    expect(stepPrewarm(t, 300, true)).toBe(false);
    expect(stepPrewarm(t, 300, false)).toBe(true); // hết cần và xa quá ngưỡng bỏ
    expect(t.prewarm).toBe(false);
  });
  it('thứ tự ngưỡng: chuẩn bị trước khi tải, bỏ sau khi dọn', () => {
    expect(ZONE_PREWARM_DISTANCE).toBeGreaterThan(ZONE_LOAD_DISTANCE);
    expect(ZONE_PREWARM_RELEASE).toBeGreaterThan(ZONE_UNLOAD_DISTANCE);
    expect(ZONE_PREWARM_RELEASE).toBeGreaterThan(ZONE_PREWARM_DISTANCE);
  });
  it('đường dẫn tới làng: từ mép sân chợ trở ra, trong dải rộng 6 mỗi bên trục; hướng khác hay trong sân chợ thì chưa', () => {
    // làng Giấy ở phía bắc (+Z): dir (0, 1)
    expect(onRoadTo(0, 1, 0, ROAD_START_AXIAL)).toBe(true);
    expect(onRoadTo(0, 1, 5.9, 60)).toBe(true);
    expect(onRoadTo(0, 1, 6.1, 60)).toBe(false); // lệch khỏi đường
    expect(onRoadTo(0, 1, 0, ROAD_START_AXIAL - 0.1)).toBe(false); // còn trong sân chợ
    expect(onRoadTo(0, 1, 0, -30)).toBe(false); // đường khác (phía nam)
    expect(onRoadTo(0, -1, 0, -30)).toBe(true); // làng Dệt (nam)
    expect(onRoadTo(-1, 0, -40, 3)).toBe(true); // làng Bạc (đông, −X)
  });
  it('lúc mới vào /cho (chỗ xuất hiện mặc định): không làng nào được tải hay nằm trong ngưỡng chuẩn bị theo khoảng cách, và người chơi chưa ở trên con đường nào', () => {
    const w = assembleWorld();
    for (const v of w.villages) {
      const rim = rimDistance(v.center.x, v.center.z, v.radius, PLAYER_START[0], PLAYER_START[1]);
      expect(rim, v.id).toBeGreaterThan(ZONE_PREWARM_DISTANCE);
      expect(rim, v.id).toBeGreaterThan(ZONE_LOAD_DISTANCE);
      expect(onRoadTo(v.frame.dirX, v.frame.dirZ, PLAYER_START[0], PLAYER_START[1]), v.id).toBe(false);
    }
  });
});

describe('mũi tên trong Làng Giấy mở rộng (bước W2)', () => {
  const w = assembleWorld();
  const router = createRouter(w.graph);
  const out: RouteStep = { x: 0, z: 0, remaining: 0, found: false };
  const giay = w.villages[0];

  it('từ cổng tới từng biển và tới chỗ đứng trước bác An đều có đường; tới bác An dài hơn tới biển 2 (phải vòng qua khoảng giữa các biển)', () => {
    router.setTarget('board:2');
    router.next(giay.gate.x, giay.gate.z, out);
    expect(out.found).toBe(true);
    const toBoard2 = out.remaining;
    expect(toBoard2).toBeGreaterThan(20);
    router.setTarget('guide:lang-giay');
    router.next(giay.gate.x, giay.gate.z, out);
    expect(out.found).toBe(true);
    expect(out.remaining).toBeGreaterThan(toBoard2);
    for (const l of [1, 2, 3]) {
      router.setTarget(`board:${l}`);
      router.next(giay.gate.x, giay.gate.z, out);
      expect(out.found, `màn ${l}`).toBe(true);
    }
  });
  it('đi theo điểm kế tiếp từ cổng vào tới biển 1: tới nơi trong số bước hợp lý và không bước nào xuyên vật cản (người chơi bán kính 0,4)', () => {
    const obstacles = [...w.baseObstacles, ...giay.layout.obstacles];
    router.setTarget('board:1');
    let x = giay.gate.x;
    let z = giay.gate.z; // đứng ngay ở cổng
    let steps = 0;
    for (; steps < 400; steps++) {
      router.next(x, z, out);
      if (out.remaining < 1.5) break;
      const d = Math.hypot(out.x - x, out.z - z);
      const stride = Math.min(1, d);
      x += ((out.x - x) / d) * stride;
      z += ((out.z - z) / d) * stride;
      expect(obstacles.some((o) => resolveCollisionsFree(o, x, z)), `bước ${steps} (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(false);
    }
    expect(steps).toBeLessThan(120); // đường dài chừng 40 đơn vị
    expect(Math.hypot(x - giay.boardStands[0].x, z - giay.boardStands[0].z)).toBeLessThan(2);
  });
});

/** (x, z) nằm trong vật cản (bán kính người chơi 0,4)? */
function resolveCollisionsFree(o: import('../collision').Obstacle, x: number, z: number): boolean {
  const p = { x, z };
  return resolveCollisions(p, 0.4, [o]) && Math.hypot(p.x - x, p.z - z) > 0.15;
}

describe('thẻ Em có biết trong đồ thị đường và đích mũi tên (bước X3)', () => {
  const w = assembleWorld();
  const ids = new Set(w.graph.nodes.map((n) => n.id));

  it('mỗi thẻ có một nút chỗ đứng trong đồ thị, nối liền với đường làng', () => {
    for (let i = 0; i < 4; i++) expect(ids.has(`scroll:lang-giay:${i}`), `thẻ ${i}`).toBe(true);
    for (let i = 0; i < 4; i++) expect(ids.has(`scroll:lang-det:${i}`), `thẻ Làng Dệt ${i}`).toBe(true);
    for (let i = 0; i < 4; i++) expect(ids.has(`scroll:lang-khac-dau:${i}`), `thẻ Làng Khắc Dấu ${i}`).toBe(true);
    expect(ids.has('scroll:lang-bac:0')).toBe(false); // làng chưa dựng chưa có thẻ
  });

  it('mũi tên: trong làng còn thẻ thì dẫn tới thẻ; hết thẻ thì như cũ (biển màn tiếp, hoặc cổng); ngoài làng thì không dẫn tới thẻ', () => {
    expect(targetNodeId({ inVillage: 'lang-giay', nextBoard: 1, pages: 0, scroll: 2 })).toBe('scroll:lang-giay:2');
    expect(targetNodeId({ inVillage: 'lang-giay', nextBoard: 1, pages: 0, scroll: null })).toBe('board:1');
    expect(targetNodeId({ inVillage: 'lang-giay', nextBoard: 1, pages: 0, scroll: -1 })).toBe('board:1');
    expect(targetNodeId({ inVillage: 'lang-giay', nextBoard: 1, pages: 0 })).toBe('board:1');
    expect(targetNodeId({ inVillage: null, nextBoard: null, pages: 0, scroll: 2 })).toBe('gate:giay');
  });

  it('từ cổng đi theo mũi tên tới từng thẻ được (có đường), độ dài đi bộ hợp lý (từ 60 đến 330)', () => {
    const r = createRouter(w.graph);
    for (let i = 0; i < 4; i++) {
      r.setTarget(`scroll:lang-giay:${i}`);
      const d = r.distanceFrom('gate:giay');
      expect(Number.isFinite(d), `thẻ ${i}`).toBe(true);
      expect(d).toBeGreaterThan(60);
      expect(d).toBeLessThan(330);
    }
  });
});
