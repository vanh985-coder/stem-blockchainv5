import { describe, expect, it } from 'vitest';
import { BI_TARGET_ID } from '../cho/marketTargets';
import { assembleWorld } from './worldLayout';
import { boardTargetId, composeTargets, createWorldBase, createZoneTargets, guideTargetId, parseWorldTarget } from './worldTargets';

const world = assembleWorld();
const giay = world.villages.find((v) => v.id === 'lang-giay')!;

describe('vật tương tác của thế giới mở', () => {
  it('đọc lại mã biển và người dẫn, và mã của chợ', () => {
    expect(parseWorldTarget(boardTargetId('lang-giay', 3))).toEqual({ kind: 'board', village: 'lang-giay', level: 3 });
    expect(parseWorldTarget(guideTargetId('lang-det'))).toEqual({ kind: 'guide', village: 'lang-det' });
    expect(parseWorldTarget('gate:giay')).toEqual({ kind: 'gate', gate: 'giay' });
    expect(parseWorldTarget('khong-co-gi')).toBeNull();
  });

  it('cổng đặt ở cổng ngoài thế giới, dân làng 4 người, Bi dự phòng', () => {
    const base = createWorldBase(world.villages);
    expect(base.gates).toHaveLength(4);
    const g = base.gates.find((q) => q.id === 'gate:giay')!;
    expect(g.x).toBeCloseTo(giay.gate.x, 9);
    expect(g.z).toBeCloseTo(giay.gate.z, 9);
    expect(base.villagers).toHaveLength(4);
    expect(base.bi.id).toBe(BI_TARGET_ID);
    expect(base.bi.fallback).toBe(true);
  });

  it('vùng làng có biển theo bố cục rồi người dẫn', () => {
    const t = createZoneTargets(giay);
    expect(t.length).toBe(giay.layout.boards.length + 1);
    expect(t[0].id).toBe(boardTargetId('lang-giay', giay.layout.boards[0].level));
    expect(t[t.length - 1].id).toBe(guideTargetId('lang-giay'));
  });

  it('ghép: chỉ cổng đang đóng, vùng đã tải trước, Bi cuối cùng', () => {
    const base = createWorldBase(world.villages);
    const zone = createZoneTargets(giay);
    const all = composeTargets(base, [zone], new Set(['det', 'bac']));
    const ids = all.map((i) => i.id);
    expect(ids.slice(0, zone.length)).toEqual(zone.map((z) => z.id));
    expect(ids).toContain('gate:det');
    expect(ids).toContain('gate:bac');
    expect(ids).not.toContain('gate:giay');
    expect(ids[ids.length - 1]).toBe(BI_TARGET_ID);
    // không có vùng nào tải và mọi cổng mở thì còn dân làng và Bi
    expect(composeTargets(base, [], new Set())).toHaveLength(5);
  });

  it('dùng lại đúng đối tượng (vị trí sống không mất khi danh sách đổi)', () => {
    const base = createWorldBase(world.villages);
    const a = composeTargets(base, [], new Set(['det']));
    const b = composeTargets(base, [], new Set(['det', 'bac']));
    expect(a[0]).toBe(b.find((i) => i.id === 'gate:det'));
    expect(a[a.length - 1]).toBe(base.bi);
  });
});
