import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, resolveCollisions, type Obstacle, type Point2 } from '../collision';
import { WORLD_BOUNDS } from './worldFrames';
import { assembleWorld } from './worldLayout';
import { destinationName, teleportTarget, type TeleportTargetInput } from './teleport';
import type { VillageId } from '../../village';

const world = assembleWorld();
const allObstacles: readonly Obstacle[] = [
  ...world.baseObstacles,
  ...world.villages.flatMap((v) => v.layout.obstacles),
];

const blocked = (x: number, z: number, r = PLAYER_RADIUS): boolean => {
  const p: Point2 = { x, z };
  return resolveCollisions(p, r, allObstacles, WORLD_BOUNDS);
};

const VILLAGE_IDS: readonly VillageId[] = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];

const NAMES: Record<VillageId, string> = {
  'lang-giay': 'Làng Giấy',
  'lang-det': 'Làng Dệt',
  'lang-khac-dau': 'Làng Khắc Dấu',
  'lang-bac': 'Làng Bạc',
};

describe('Dịch chuyển tức thời trên bản đồ lớn (mốc 2, bước X4)', () => {
  describe('Tâm chợ', () => {
    it('trả về tọa độ an toàn, không vướng vật cản, trong WORLD_BOUNDS và yaw quay về mục tiêu', () => {
      const dest: TeleportTargetInput = { kind: 'market' };
      const res = teleportTarget(dest, world);

      expect(blocked(res.x, res.z)).toBe(false);
      expect(Math.hypot(res.x, res.z)).toBeLessThan(WORLD_BOUNDS - PLAYER_RADIUS);

      // Quay mặt về tâm chợ (0, 0)
      const expectedYaw = Math.atan2(0 - res.x, 0 - res.z);
      expect(res.yaw).toBeCloseTo(expectedYaw, 4);

      // Tên hiển thị
      expect(destinationName(dest, NAMES)).toBe('Tâm chợ');
    });
  });

  describe('4 cổng làng', () => {
    it('cả 4 cổng trả về tọa độ không vướng vật cản, trong WORLD_BOUNDS, yaw quay vào cổng', () => {
      for (const village of VILLAGE_IDS) {
        const dest: TeleportTargetInput = { kind: 'gate', village };
        const res = teleportTarget(dest, world);

        expect(blocked(res.x, res.z), `cổng ${village}`).toBe(false);
        expect(Math.hypot(res.x, res.z), `cổng ${village} trong bounds`).toBeLessThan(WORLD_BOUNDS - PLAYER_RADIUS);

        const v = world.villages.find((q) => q.id === village)!;
        expect(Math.hypot(res.x - v.gate.x, res.z - v.gate.z), `cách cổng 8.5 đơn vị (${village})`).toBeCloseTo(8.5, 1);

        // Yaw quay về cổng
        const expectedYaw = Math.atan2(v.gate.x - res.x, v.gate.z - res.z);
        expect(res.yaw).toBeCloseTo(expectedYaw, 3);

        expect(destinationName(dest, NAMES)).toBe(`Cổng ${NAMES[village]}`);
      }
    });
  });

  describe('12 biển chọn màn', () => {
    it('cả 12 biển trả về tọa độ không vướng vật cản, trong WORLD_BOUNDS, yaw quay về biển', () => {
      for (let level = 1; level <= 12; level++) {
        const v = world.villages.find((q) => q.layout.boards.some((b) => b.level === level))!;
        const dest: TeleportTargetInput = { kind: 'board', village: v.id, level };
        const res = teleportTarget(dest, world);

        expect(blocked(res.x, res.z), `biển màn ${level}`).toBe(false);
        expect(Math.hypot(res.x, res.z), `biển màn ${level} trong bounds`).toBeLessThan(WORLD_BOUNDS - PLAYER_RADIUS);

        const board = v.layout.boards.find((b) => b.level === level)!;
        const expectedYaw = Math.atan2(board.x - res.x, board.z - res.z);
        expect(res.yaw, `yaw biển ${level}`).toBeCloseTo(expectedYaw, 4);

        const name = destinationName(dest, NAMES);
        expect(name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('16 thẻ Em có biết chưa nhặt', () => {
    it('cả 16 thẻ trả về tọa độ không vướng vật cản, trong WORLD_BOUNDS, cách thẻ 3 đơn vị và yaw quay về thẻ', () => {
      for (const village of VILLAGE_IDS) {
        for (let index = 0; index < 4; index++) {
          const dest: TeleportTargetInput = { kind: 'scroll', village, index };
          const res = teleportTarget(dest, world);

          expect(blocked(res.x, res.z), `thẻ ${village} #${index}`).toBe(false);
          expect(Math.hypot(res.x, res.z), `thẻ ${village} #${index} trong bounds`).toBeLessThan(WORLD_BOUNDS - PLAYER_RADIUS);

          const v = world.villages.find((q) => q.id === village)!;
          const s = v.layout.scrolls!.find((q) => q.index === index)!;

          // Cách thẻ đúng 3 đơn vị
          const distToCard = Math.hypot(res.x - s.x, res.z - s.z);
          expect(distToCard, `cách thẻ 3 đơn vị (${village} #${index})`).toBeCloseTo(3, 4);

          // Yaw quay về thẻ
          const expectedYaw = Math.atan2(s.x - res.x, s.z - res.z);
          expect(res.yaw, `yaw thẻ ${village} #${index}`).toBeCloseTo(expectedYaw, 4);

          expect(destinationName(dest, NAMES)).toBe(`Thẻ "Em có biết?" ${index + 1} (${NAMES[village]})`);
        }
      }
    });
  });
});
