import { describe, expect, it } from 'vitest';
import { ROAD_HALF_WIDTH, SCENERY_DENSITY, SEGMENT_LENGTH, TEMPLATE_COUNT, buildTemplates, emitSegment, segmentCapacity, segmentOf, segmentRange, templateFor, type SceneryEmitter } from './runnerScenery';
import { OBSTACLE_LOD, SCENERY_LOD, VIEW_AHEAD, VIEW_BEHIND, lodTier, segmentsKept } from './runnerView';

interface Counts {
  models: { model: string; x: number; z: number; yaw: number }[];
  sheets: number;
  legs: number;
}

function collect(index: number, templates = buildTemplates(1), density = 1, sheets = 4): Counts {
  const out: Counts = { models: [], sheets: 0, legs: 0 };
  const e: SceneryEmitter = {
    model: (model, x, _y, z, yaw) => void out.models.push({ model, x, z, yaw }),
    sheet: () => void out.sheets++,
    leg: () => void out.legs++,
  };
  emitSegment(index, templates, e, density, sheets);
  return out;
}

describe('cảnh hai bên đường cuộn vô tận', () => {
  it('đoạn dài 40 đơn vị; mẫu sinh theo hạt giống nên cùng hạt giống cùng mẫu', () => {
    expect(SEGMENT_LENGTH).toBe(40);
    expect(buildTemplates(7)).toEqual(buildTemplates(7));
    expect(buildTemplates(7)).not.toEqual(buildTemplates(8));
    expect(buildTemplates(7)).toHaveLength(TEMPLATE_COUNT);
  });

  it('mọi vật nằm ngoài lòng đường và trong phạm vi đoạn của nó', () => {
    const t = buildTemplates(3);
    for (let i = -3; i < 12; i++) {
      const c = collect(i, t);
      expect(c.models.length).toBeGreaterThan(3);
      for (const m of c.models) {
        expect(Math.abs(m.x), `${m.model} đoạn ${i}`).toBeGreaterThan(ROAD_HALF_WIDTH + 1.5);
        expect(m.z).toBeGreaterThanOrEqual(i * SEGMENT_LENGTH - 0.01);
        expect(m.z).toBeLessThanOrEqual((i + 1) * SEGMENT_LENGTH + 0.01);
      }
    }
  });

  it('có đủ nhà ngói, nhà tranh, bụi tre và phên phơi giấy khi chạy một đoạn đường dài', () => {
    const t = buildTemplates(20260214);
    const seen = new Set<string>();
    let sheets = 0;
    for (let i = 0; i < 24; i++) {
      const c = collect(i, t);
      for (const m of c.models) seen.add(m.model);
      sheets += c.sheets;
    }
    expect([...seen].sort()).toEqual(['bui-tre', 'nha-ngoi', 'nha-tranh']);
    expect(sheets).toBeGreaterThan(8);
  });

  it('có cả hai bên đường và mặt nhà quay ra đường', () => {
    const t = buildTemplates(5);
    let left = 0;
    let right = 0;
    for (let i = 0; i < 12; i++) {
      for (const m of collect(i, t).models) {
        if (m.x > 0) left++;
        else right++;
        // mặt trước của model là +Z; xoay yaw thì mặt hướng (sin yaw, cos yaw): phải hướng vào đường (x ngược dấu với x của nhà)
        if (m.model === 'nha-ngoi' || m.model === 'nha-tranh') expect(Math.sin(m.yaw) * m.x).toBeLessThan(0);
      }
    }
    expect(left).toBeGreaterThan(10);
    expect(right).toBeGreaterThan(10);
  });

  it('lặp lại theo chỉ số: cùng đoạn cho cùng kết quả; đoạn cách nhau một chu kỳ dùng cùng mẫu', () => {
    const t = buildTemplates(9);
    expect(collect(4, t)).toEqual(collect(4, t));
    for (let i = 0; i < 20; i++) expect(templateFor(i, TEMPLATE_COUNT).template).toBe(templateFor(i + TEMPLATE_COUNT, TEMPLATE_COUNT).template);
    const flips = new Set(Array.from({ length: 40 }, (_, i) => templateFor(i).mirror));
    expect(flips.size).toBe(2);
    expect(templateFor(-1).template).toBe(TEMPLATE_COUNT - 1);
  });

  it('mức chất lượng càng thấp càng ít vật; mức Thấp mỗi giá phơi chỉ một phên', () => {
    const t = buildTemplates(11);
    const count = (level: 'low' | 'medium' | 'high') => {
      let n = 0;
      let sheets = 0;
      for (let i = 0; i < 12; i++) {
        const c = collect(i, t, SCENERY_DENSITY[level].density, SCENERY_DENSITY[level].sheets);
        n += c.models.length;
        sheets += c.sheets;
      }
      return { n, sheets };
    };
    const lo = count('low');
    const mid = count('medium');
    const hi = count('high');
    expect(lo.n).toBeLessThan(mid.n);
    expect(mid.n).toBeLessThan(hi.n);
    expect(lo.sheets).toBeLessThan(mid.sheets);
    expect(mid.sheets).toBeLessThan(hi.sheets);
  });

  it('sức chứa tính theo mẫu đủ cho mọi đoạn', () => {
    const t = buildTemplates(13);
    const cap = segmentCapacity(t);
    for (let i = 0; i < 30; i++) {
      const c = collect(i, t);
      const houses = c.models.filter((m) => m.model !== 'bui-tre').length;
      const bamboo = c.models.filter((m) => m.model === 'bui-tre').length;
      expect(houses).toBeLessThanOrEqual(cap.houses);
      expect(bamboo).toBeLessThanOrEqual(cap.bamboo);
      expect(c.sheets).toBeLessThanOrEqual(cap.sheets);
      expect(c.legs).toBeLessThanOrEqual(cap.legs);
    }
  });

  it('đoạn chứa vị trí và phạm vi đoạn cần vẽ', () => {
    expect(segmentOf(0)).toBe(0);
    expect(segmentOf(39.99)).toBe(0);
    expect(segmentOf(40)).toBe(1);
    expect(segmentOf(-0.01)).toBe(-1);
    expect(segmentRange(100, 18, 60)).toEqual({ first: 2, last: 4 });
  });
});

describe('tầm nhìn và bậc model (ngân sách như chợ)', () => {
  it('chỉ giữ khoảng 5 đoạn (spec 05) hoặc ít hơn ở mọi mức', () => {
    for (const l of ['low', 'medium', 'high'] as const) {
      expect(segmentsKept(l)).toBeLessThanOrEqual(5);
      expect(segmentsKept(l)).toBeGreaterThanOrEqual(3);
    }
  });
  it('mức cao nhìn xa hơn; mức Thấp gần như chỉ dùng bản xa', () => {
    expect(VIEW_AHEAD.low).toBeLessThan(VIEW_AHEAD.medium);
    expect(VIEW_AHEAD.medium).toBeLessThan(VIEW_AHEAD.high);
    expect(VIEW_BEHIND).toBeGreaterThan(0);
    expect(OBSTACLE_LOD.low.mid).toBe(0);
    expect(SCENERY_LOD.low.near).toBe(0);
    expect(OBSTACLE_LOD.low.near).toBeLessThan(OBSTACLE_LOD.medium.near);
    expect(OBSTACLE_LOD.medium.near).toBeLessThan(OBSTACLE_LOD.high.near);
  });
  it('lodTier chọn chính / vừa / xa theo khoảng cách', () => {
    expect(lodTier(3, 10, 20)).toBe(0);
    expect(lodTier(15, 10, 20)).toBe(1);
    expect(lodTier(25, 10, 20)).toBe(2);
    expect(lodTier(15, 10, 0)).toBe(2);
    expect(lodTier(1, 0, 0)).toBe(2);
  });
});
