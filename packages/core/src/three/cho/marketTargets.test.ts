import { describe, expect, it } from 'vitest';
import { nearestInteractable } from '../interaction';
import { GATES, VILLAGER_PATHS } from './marketLayout';
import { BI_TARGET_ID, biSlot, createInteractables, gateTargetId, parseTarget, villagerSlot, villagerTargetId } from './marketTargets';

describe('vật tương tác ở chợ', () => {
  it('4 cổng, 4 dân làng, rồi Bi (vật dự phòng); mỗi mã đọc ngược được', () => {
    const list = createInteractables();
    expect(list).toHaveLength(GATES.length + VILLAGER_PATHS.length + 1);
    expect(list[biSlot()].id).toBe(BI_TARGET_ID);
    expect(list[biSlot()].fallback).toBe(true);
    expect(list.filter((i) => i.fallback)).toHaveLength(1);
    GATES.forEach((g, i) => {
      expect(list[i].id).toBe(gateTargetId(g.id));
      expect(parseTarget(list[i].id)).toEqual({ kind: 'gate', gate: g.id });
      expect([list[i].x, list[i].z]).toEqual([g.x, g.z]);
    });
    VILLAGER_PATHS.forEach((p, i) => {
      expect(list[villagerSlot(i)].id).toBe(villagerTargetId(i));
      expect(parseTarget(list[villagerSlot(i)].id)).toEqual({ kind: 'villager', index: i });
      expect([list[villagerSlot(i)].x, list[villagerSlot(i)].z]).toEqual([p[0][0], p[0][1]]);
    });
    expect(parseTarget('bi')).toEqual({ kind: 'bi' });
  });

  it('mã lạ thì null', () => {
    for (const id of ['', 'gate:xxx', 'villager:9', 'villager:-1', 'villager:a', 'cong:giay']) expect(parseTarget(id), id).toBeNull();
  });

  it('đứng ở chỗ xuất hiện (0, −10): không có cổng hay dân làng, Bi (khi bay sát người) là vật được chọn', () => {
    const list = createInteractables();
    list[biSlot()].x = 0.8;
    list[biSlot()].z = -9.4;
    expect(list[nearestInteractable(0, -10, list)].id).toBe(BI_TARGET_ID);
  });

  it('đứng trước cổng Giấy (0, 28): cổng được chọn dù Bi gần hơn', () => {
    const list = createInteractables();
    list[biSlot()].x = 0.6;
    list[biSlot()].z = 28.2;
    expect(list[nearestInteractable(0, 28.1, list)].id).toBe(gateTargetId('giay'));
  });

  it('dân làng đi tới chỗ người chơi thì nói chuyện được (đối tượng sống được cập nhật)', () => {
    const list = createInteractables();
    list[biSlot()].x = 5;
    list[biSlot()].z = 5;
    expect(nearestInteractable(10, 10, list)).toBe(-1);
    list[villagerSlot(0)].x = 10.5;
    list[villagerSlot(0)].z = 10;
    expect(list[nearestInteractable(10, 10, list)].id).toBe(villagerTargetId(0));
  });
});
