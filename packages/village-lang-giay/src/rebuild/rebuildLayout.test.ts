import { describe, expect, it } from 'vitest';
import { ACTORS, REDUCED_MOTION_SCALE, VILLAIN_TIMING, villainFx, villainStageAt, AREAS, CARD_MAX_CQW, CARD_MIN_CQW, MIN_TOUCH_PX, PHONE_FRAME_PX, cardHeight, cardWidth, cqwToHeightPct, slotLeft, worldPoint, type Box } from './rebuildLayout';
import { REBUILD_SPEC } from './rebuildConfig';

const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('bố cục màn 3', () => {
  it('các vùng không chồng nhau (thanh trên, chuỗi, dải giữa, rổ, khay)', () => {
    const names = Object.keys(AREAS) as (keyof typeof AREAS)[];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) expect(overlap(AREAS[names[i]], AREAS[names[j]]), `${names[i]} và ${names[j]}`).toBe(false);
  });

  it('mọi vùng nằm trong khung', () => {
    for (const b of Object.values(AREAS)) {
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(100);
      expect(b.y0).toBeGreaterThanOrEqual(0);
      expect(b.y1).toBeLessThanOrEqual(100);
    }
  });

  it('chuỗi (bìa + trang) và khay (trang + trang giả) vừa một hàng ở mọi vòng, thẻ cao vừa vùng của hàng', () => {
    for (const r of REBUILD_SPEC.rounds) {
      const slots = r.pages + 1; // bìa + các trang; khay có tối đa r.pages + 1 thẻ (cả trang giả)
      const w = cardWidth(slots);
      const last = slotLeft(slots - 1, w) + w;
      expect(last).toBeLessThanOrEqual(AREAS.chain.x1 + 1e-9);
      expect(w).toBeGreaterThanOrEqual(CARD_MIN_CQW);
      expect(w).toBeLessThanOrEqual(CARD_MAX_CQW);
      expect(cqwToHeightPct(cardHeight(w))).toBeLessThanOrEqual(AREAS.chain.y1 - AREAS.chain.y0 + 1e-9);
      expect(cqwToHeightPct(cardHeight(w))).toBeLessThanOrEqual(AREAS.tray.y1 - AREAS.tray.y0 + 1e-9);
    }
  });

  it('vùng chạm tối thiểu 44 điểm ảnh ở điện thoại ngang (khung 693 điểm ảnh) cho thẻ ở mọi vòng, rộng và cao', () => {
    for (const r of REBUILD_SPEC.rounds) {
      const w = cardWidth(r.pages + 1);
      expect((w / 100) * PHONE_FRAME_PX).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
      expect((cardHeight(w) / 100) * PHONE_FRAME_PX).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    }
  });

  it('vòng ít trang thì thẻ to hơn (tối đa 8,6cqw)', () => {
    expect(cardWidth(6)).toBeGreaterThan(cardWidth(10));
    expect(cardWidth(2)).toBe(CARD_MAX_CQW);
  });

  it('đổi điểm theo tỉ lệ khung sang tọa độ thế giới: tâm khung là gốc, góc dưới phải là (8, −4,5)', () => {
    expect(worldPoint(0.5, 0.5)).toEqual({ x: 0, y: 0 });
    expect(worldPoint(1, 1)).toEqual({ x: 8, y: -4.5 });
  });
});

describe('{phanDien} nhét trang giả', () => {
  it('các mốc tăng dần: vào, thả, ra, xong', () => {
    expect(VILLAIN_TIMING.enterEnd).toBeLessThan(VILLAIN_TIMING.dropAt);
    expect(VILLAIN_TIMING.dropAt).toBeLessThan(VILLAIN_TIMING.exitStart);
    expect(VILLAIN_TIMING.exitStart).toBeLessThan(VILLAIN_TIMING.end);
  });
  it('giai đoạn theo thời gian: chạy vào, cười, chạy ra, đi mất', () => {
    expect(villainStageAt(-1)).toBe('idle');
    expect(villainStageAt(0.5)).toBe('enter');
    expect(villainStageAt(VILLAIN_TIMING.dropAt)).toBe('cheer');
    expect(villainStageAt(3.0)).toBe('exit');
    expect(villainStageAt(VILLAIN_TIMING.end)).toBe('gone');
    expect(villainStageAt(0.4, REDUCED_MOTION_SCALE)).toBe('cheer');
  });
  it('đi từ ngoài khung bên phải tới điểm dừng, đứng yên khi cười, rồi chạy ra lại; không bao giờ ra ngoài đoạn đường', () => {
    expect(villainFx(0)).toBeCloseTo(ACTORS.villainOffscreen.fx, 12);
    expect(villainFx(VILLAIN_TIMING.enterEnd)).toBeCloseTo(ACTORS.villainStop.fx, 12);
    expect(villainFx(2.0)).toBe(ACTORS.villainStop.fx);
    expect(villainFx(VILLAIN_TIMING.end)).toBeCloseTo(ACTORS.villainOffscreen.fx, 12);
    let prev = villainFx(0);
    for (let t = 0.05; t <= VILLAIN_TIMING.enterEnd; t += 0.05) {
      const x = villainFx(t);
      expect(x).toBeLessThanOrEqual(prev + 1e-12);
      prev = x;
    }
  });
});
