import { describe, expect, it } from 'vitest';
import { assembleWorld } from '../worldLayout';
import { NAME_DISTANCE_ON_ROAD, NAME_LATERAL, boardMark, mapMarkers, miniNamePoint, type MapMarker, type MarkerInput } from './mapMarkers';

const world = assembleWorld();
const base = (over: Partial<MarkerInput> = {}): MarkerInput => ({
  villages: world.villages,
  gateOpen: { giay: true, det: false, 'khac-dau': false, bac: false },
  levelStates: { 1: 'open', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'coming-soon', 6: 'coming-soon', 7: 'locked', 8: 'coming-soon', 9: 'coming-soon', 10: 'locked', 11: 'coming-soon', 12: 'coming-soon' },
  inside: null,
  knowMasks: {},
  target: null,
  ...over,
});
function of<K extends MapMarker['kind']>(ms: MapMarker[], kind: K): Extract<MapMarker, { kind: K }>[] {
  return ms.filter((m): m is Extract<MapMarker, { kind: K }> => m.kind === kind);
}

describe('ký hiệu trên bản đồ', () => {
  it('biển: xong, đang mở, khóa, sắp ra mắt (màn chưa có trạng thái coi như khóa)', () => {
    expect(boardMark('done')).toBe('done');
    expect(boardMark('open')).toBe('open');
    expect(boardMark('locked')).toBe('locked');
    expect(boardMark('coming-soon')).toBe('soon');
    expect(boardMark(undefined)).toBe('locked');
  });

  it('cổng: luôn có đủ 4 cổng, mở hoặc khóa theo tiến độ', () => {
    for (const scope of ['mini', 'big'] as const) {
      const gates = of(mapMarkers(base(), scope), 'gate');
      expect(gates).toHaveLength(4);
      expect(Object.fromEntries(gates.map((g) => [g.village, g.open]))).toEqual({ 'lang-giay': true, 'lang-det': false, 'lang-khac-dau': false, 'lang-bac': false });
    }
  });

  it('cổng đặt đúng chỗ cổng thế giới', () => {
    const g = of(mapMarkers(base(), 'big'), 'gate')[0];
    expect(g.x).toBeCloseTo(0, 9);
    expect(g.z).toBeCloseTo(72, 9);
  });

  it('biển: bản đồ lớn hiện cả 4 làng (3 biển mỗi làng); bản đồ nhỏ ở ngoài làng không hiện biển, trong làng chỉ hiện biển của làng đó', () => {
    expect(of(mapMarkers(base(), 'big'), 'board')).toHaveLength(12);
    expect(of(mapMarkers(base(), 'mini'), 'board')).toHaveLength(0);
    const inGiay = of(mapMarkers(base({ inside: 'lang-giay' }), 'mini'), 'board');
    expect(inGiay.map((b) => [b.level, b.mark])).toEqual([[1, 'open'], [2, 'locked'], [3, 'locked']]);
    const inDet = of(mapMarkers(base({ inside: 'lang-det' }), 'mini'), 'board');
    expect(inDet.map((b) => b.level)).toEqual([4, 5, 6]);
  });

  it('trạng thái biển theo màn: xong, đang mở, khóa, sắp ra mắt', () => {
    const ms = of(mapMarkers(base({ levelStates: { 1: 'done', 2: 'open', 3: 'locked', 4: 'coming-soon' } }), 'big'), 'board');
    const m = Object.fromEntries(ms.map((b) => [b.level, b.mark]));
    expect(m[1]).toBe('done');
    expect(m[2]).toBe('open');
    expect(m[3]).toBe('locked');
    expect(m[4]).toBe('soon');
  });

  it('giáo viên thấy mọi thứ đã mở: trạng thái mở của nơi gọi được giữ nguyên', () => {
    const open = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 'open'])) as MarkerInput['levelStates'];
    const ms = mapMarkers(base({ gateOpen: { giay: true, det: true, 'khac-dau': true, bac: true }, levelStates: open }), 'big');
    expect(of(ms, 'gate').every((g) => g.open)).toBe(true);
    expect(of(ms, 'board').every((b) => b.mark === 'open')).toBe(true);
  });

  it('thẻ chưa nhặt: chỉ hiện khi đang ở trong làng đó; thẻ đã nhặt biến mất', () => {
    expect(of(mapMarkers(base(), 'mini'), 'scroll')).toHaveLength(0);
    expect(of(mapMarkers(base(), 'big'), 'scroll')).toHaveLength(0);
    expect(of(mapMarkers(base({ inside: 'lang-bac' }), 'mini'), 'scroll')).toHaveLength(0); // làng chưa có thẻ rải
    expect(of(mapMarkers(base({ inside: 'lang-khac-dau' }), 'mini'), 'scroll')).toHaveLength(4); // Làng Khắc Dấu có 4 thẻ rải (bước L3)
    expect(of(mapMarkers(base({ inside: 'lang-det' }), 'mini'), 'scroll')).toHaveLength(4); // Làng Dệt có 4 thẻ rải
    for (const scope of ['mini', 'big'] as const) {
      const all = of(mapMarkers(base({ inside: 'lang-giay' }), scope), 'scroll');
      expect(all.map((s) => s.index)).toEqual([0, 1, 2, 3]);
      const some = of(mapMarkers(base({ inside: 'lang-giay', knowMasks: { 'lang-giay': 0b0101 } }), scope), 'scroll');
      expect(some.map((s) => s.index)).toEqual([1, 3]);
      expect(of(mapMarkers(base({ inside: 'lang-giay', knowMasks: { 'lang-giay': 15 } }), scope), 'scroll')).toHaveLength(0);
    }
  });

  it('thẻ nằm đúng chỗ cuộn giấy trong làng', () => {
    const giay = world.villages[0];
    const ms = of(mapMarkers(base({ inside: 'lang-giay' }), 'mini'), 'scroll');
    for (const s of ms) {
      const sc = giay.layout.scrolls!.find((q) => q.index === s.index)!;
      expect([s.x, s.z]).toEqual([sc.x, sc.z]);
    }
  });

  it('điểm đến của nhiệm vụ: có thì hiện đúng chỗ, không có thì không hiện', () => {
    expect(of(mapMarkers(base(), 'mini'), 'target')).toHaveLength(0);
    const t = of(mapMarkers(base({ target: { x: 3, z: 72 } }), 'mini'), 'target');
    expect(t).toHaveLength(1);
    expect([t[0].x, t[0].z]).toEqual([3, 72]);
    expect(of(mapMarkers(base({ target: { x: 3, z: 72 } }), 'big'), 'target')).toHaveLength(1);
  });

  it('tên làng: đủ 4; bản đồ nhỏ đặt cạnh đường ra làng (trong vòng nhìn khi đứng ở chợ), bản đồ lớn đặt giữa chỗ của làng', () => {
    const mini = of(mapMarkers(base(), 'mini'), 'name');
    expect(mini).toHaveLength(4);
    for (const n of mini) expect(Math.hypot(n.x, n.z)).toBeLessThan(88 * 0.8);
    const big = of(mapMarkers(base(), 'big'), 'name');
    expect(big.map((n) => Math.round(Math.hypot(n.x, n.z)))).toEqual([197, 197, 197, 197]);
    const giay = big.find((n) => n.village === 'lang-giay')!;
    expect([Math.round(giay.x), Math.round(giay.z)]).toEqual([0, 197]);
  });

  it('chỗ đặt tên làng nhỏ: không đè lên cổng, cách tâm chợ đúng khoảng quy định và lệch sang bên', () => {
    for (const v of world.villages) {
      const p = miniNamePoint(v.frame);
      expect(Math.hypot(p.x - v.gate.x, p.z - v.gate.z)).toBeGreaterThan(20);
      const along = p.x * v.frame.dirX + p.z * v.frame.dirZ;
      expect(along).toBeCloseTo(NAME_DISTANCE_ON_ROAD, 9);
      expect(Math.abs(p.x * -v.frame.dirZ + p.z * v.frame.dirX)).toBeCloseTo(NAME_LATERAL, 9);
    }
  });

  it('mỗi ký hiệu có mã riêng, không trùng', () => {
    const ms = mapMarkers(base({ inside: 'lang-giay', target: { x: 0, z: 1 } }), 'big');
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
  });
});
