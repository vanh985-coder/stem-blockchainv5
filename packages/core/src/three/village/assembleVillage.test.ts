import { describe, expect, it } from 'vitest';
import { assembleVillage, boardCollider, createVillageInteractables, parseVillageTarget, villageBiSlot, type VillageLayoutInput } from './villageLayout';

const INPUT: VillageLayoutInput = {
  id: 'lang-giay',
  radius: 20,
  gate: { model: 'env/cong-lang-giay', x: 0, z: -17.5, yaw: 0 },
  start: { x: 0, z: -14, yaw: 0 },
  placements: [{ model: 'env/nha-mai-ngoi', x: -12, z: 0, yaw: 0, scale: 1, tint: [1, 1, 1] }],
  props: [{ kind: 'be-ngam', x: 0, z: 9, yaw: 0, scale: 1, tint: [1, 1, 1] }],
  boards: [{ level: 1, icon: 'ui/icons/trang-vang', x: 4, z: -9, yaw: Math.PI }],
  guide: { character: 'bacAn', x: -5, z: 5, yaw: Math.PI },
  yards: [],
  roads: [],
  fence: { radius: 19, gap: 6 },
  seed: 1,
};

describe('assembleVillage', () => {
  const v = assembleVillage(INPUT);
  it('gom model cần tải: cổng và các model đặt (không trùng)', () => {
    expect(v.models).toEqual(['env/cong-lang-giay', 'env/nha-mai-ngoi']);
  });
  it('có vật cản cho nhà, bể ngâm, biển, người dẫn, hàng rào; số vật cản khớp danh sách hình', () => {
    expect(v.colliders.length).toBeGreaterThan(10);
    expect(v.obstacles).toHaveLength(v.colliders.length);
    const board = boardCollider(INPUT.boards[0]);
    expect(v.colliders.some((c) => JSON.stringify(c.shape) === JSON.stringify(board.shape))).toBe(true);
  });
  it('hàng rào chừa lối quanh cổng', () => {
    expect(v.fenceLayout).not.toBeNull();
    for (const r of v.fenceLayout!.posts) expect(Math.hypot(r.x - INPUT.gate.x, r.z - INPUT.gate.z)).toBeGreaterThanOrEqual(6);
  });
  it('không có hàng rào khi bố cục không yêu cầu', () => {
    expect(assembleVillage({ ...INPUT, fence: undefined }).fenceLayout).toBeNull();
  });
});

describe('vật tương tác của làng', () => {
  const list = createVillageInteractables(INPUT);
  it('biển, người dẫn, cổng, Bi theo thứ tự; Bi là vật dự phòng ở đúng chỉ số', () => {
    expect(list.map((i) => i.id)).toEqual(['board:1', 'guide', 'gate', 'bi']);
    expect(list[villageBiSlot(INPUT)].id).toBe('bi');
    expect(list[villageBiSlot(INPUT)].fallback).toBe(true);
  });
  it('đọc id thành đích', () => {
    expect(parseVillageTarget('board:3')).toEqual({ kind: 'board', level: 3 });
    expect(parseVillageTarget('guide')).toEqual({ kind: 'guide' });
    expect(parseVillageTarget('gate')).toEqual({ kind: 'gate' });
    expect(parseVillageTarget('bi')).toEqual({ kind: 'bi' });
    expect(parseVillageTarget('khac')).toBeNull();
  });
});
