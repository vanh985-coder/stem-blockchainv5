import { describe, expect, it } from 'vitest';
import { CAMERA_MIN_DISTANCE, cameraClearance } from '../cameraCollision';
import { cameraOffset, PITCH_DEFAULT } from '../cameraRig';
import { PLAYER_RADIUS, resolveCollisions } from '../collision';
import { footprintRadius, generateMarket, PLAYER_START, WORLD_RADIUS } from './marketLayout';

const layout = generateMarket();
const off = { x: 0, y: 0, z: 0 };

describe('camera trong chợ phiên', () => {
  it('với mọi vị trí đi được và mọi góc nhìn, hệ số kéo camera hữu hạn, không dưới khoảng tối thiểu và camera không nằm trong vật cản', () => {
    let blockedCases = 0;
    let total = 0;
    for (let gx = -40; gx <= 40; gx += 4) {
      for (let gz = -40; gz <= 40; gz += 4) {
        const probe = { x: gx, z: gz };
        resolveCollisions(probe, PLAYER_RADIUS, layout.obstacles, WORLD_RADIUS);
        for (let k = 0; k < 8; k++) {
          const yaw = (k / 8) * Math.PI * 2;
          for (const pitch of [0.2, PITCH_DEFAULT, 0.9]) {
            cameraOffset(yaw, pitch, off);
            const fy = 1.3;
            const t = cameraClearance(probe.x, fy, probe.z, probe.x + off.x, off.y + 0, probe.z + off.z, layout.blockers);
            total++;
            expect(Number.isFinite(t), `(${probe.x.toFixed(1)}, ${probe.z.toFixed(1)}) yaw ${yaw.toFixed(2)}`).toBe(true);
            expect(t).toBeGreaterThan(0);
            expect(t).toBeLessThanOrEqual(1);
            const len = Math.hypot(off.x, off.y - fy, off.z);
            expect(t * len).toBeGreaterThanOrEqual(Math.min(len, CAMERA_MIN_DISTANCE) - 1e-6);
            if (t < 1) blockedCases++;
          }
        }
      }
    }
    expect(total).toBeGreaterThan(1000);
    expect(blockedCases).toBeGreaterThan(20); // có chỗ camera bị vật cản kéo lại
  });

  it('đứng sát tường nhà, quay lưng vào nhà: camera được kéo lại gần, không nằm trong nhà', () => {
    const house = layout.placements.find((p) => p.model === 'env/nha-mai-ngoi')!;
    const houseShapes = layout.blockers.filter((b) => b.shape.type === 'obox' && Math.hypot(b.shape.x - house.x, b.shape.z - house.z) < 3.5).map((b) => b.shape as { x: number; z: number; hx: number; hz: number; yaw: number });
    const ux = -house.x / Math.hypot(house.x, house.z);
    const uz = -house.z / Math.hypot(house.x, house.z);
    // đứng giữa nhà và sân chợ, cách tâm nhà 4,2 (sát tường), nhìn về sân chợ: camera ở phía nhà
    const standOff = footprintRadius(house) + 0.9;
    const px = house.x + ux * standOff;
    const pz = house.z + uz * standOff;
    const yaw = Math.atan2(ux, uz);
    cameraOffset(yaw, PITCH_DEFAULT, off);
    const t = cameraClearance(px, 1.3, pz, px + off.x, off.y, pz + off.z, layout.blockers);
    expect(t).toBeLessThan(0.9);
    const cx = px + (off.x) * t;
    const cz = pz + (off.z) * t;
    for (const sh of houseShapes) {
      const cos = Math.cos(sh.yaw);
      const sin = Math.sin(sh.yaw);
      const lx = (cx - sh.x) * cos - (cz - sh.z) * sin;
      const lz = (cx - sh.x) * sin + (cz - sh.z) * cos;
      expect(Math.abs(lx) < sh.hx && Math.abs(lz) < sh.hz).toBe(false);
    }
  });

  it('chỗ xuất hiện: camera mặc định (sau lưng, cao 4) không bị vật cản nào chặn', () => {
    cameraOffset(0, PITCH_DEFAULT, off);
    expect(cameraClearance(PLAYER_START[0], 1.3, PLAYER_START[1], PLAYER_START[0] + off.x, off.y, PLAYER_START[1] + off.z, layout.blockers)).toBe(1);
  });
});
