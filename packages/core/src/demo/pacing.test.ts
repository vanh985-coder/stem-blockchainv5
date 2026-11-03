import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config/gameConfig';
import { spawnDelayMs } from '../lessons/bai-1/logic';
import { PACING, VIDEO_PACING, pace, videoPacing, withOverrides } from './pacing';
import { readTime, typingDelays } from './timing';

describe('nhịp video của demo', () => {
  it('ngoài demo (hay ?day=1) thì không có nhịp video', () => {
    expect(videoPacing(false)).toBeNull();
    expect(PACING).toBeNull();
    expect(pace(1500)).toBe(1500);
  });

  it('bản không demo giữ nguyên số cũ của bài 1', () => {
    const c = GAME_CONFIG.lesson1;
    expect([c.easyPages, c.mediumPages, c.hardStartPages, c.tamperAnimMs, c.hardDurationMs, c.spawnStartMs, c.spawnMinMs, c.spawnFastMs]).toEqual([5, 5, 6, 2000, 60000, 6000, 3000, 2000]);
    expect(spawnDelayMs(0, false)).toBe(6000);
    expect(spawnDelayMs(20, false)).toBe(3000);
    expect(spawnDelayMs(3, true)).toBe(2000);
  });

  it('withOverrides: không có ghi đè thì trả đúng đối tượng gốc; có thì trộn sâu và không sửa gốc', () => {
    const base = { a: 1, b: { c: 2, d: 3 }, e: [1, 2] };
    expect(withOverrides(base, null)).toBe(base);
    expect(withOverrides(base, undefined)).toBe(base);
    const out = withOverrides(base, { b: { c: 9 }, e: [7] });
    expect(out).toEqual({ a: 1, b: { c: 9, d: 3 }, e: [7] });
    expect(base).toEqual({ a: 1, b: { c: 2, d: 3 }, e: [1, 2] });
  });

  it('nhịp gõ và đọc mặc định giữ số cũ; nhịp video nằm trong khoảng yêu cầu', () => {
    for (const d of typingDelays(200, 3)) expect(d >= 120 && d <= 200).toBe(true);
    expect(readTime('', 1)).toBe(1000);
    expect(readTime('x'.repeat(500), 1)).toBe(2000);
    const v = VIDEO_PACING;
    for (const d of typingDelays(200, 3, v.typeMs)) expect(d >= 60 && d <= 90).toBe(true);
    expect(readTime('', 1, v.readMs)).toBe(500);
    expect(readTime('x'.repeat(500), 1, v.readMs)).toBe(1000);
    expect(v.dialogMs).toBe(1000);
  });

  it('nhịp video: trạm Khó của Màn 1 để mạng chạy trước bot 10 đến 20 trang', () => {
    const L = VIDEO_PACING.lesson1;
    // bắt đầu lệch 5 trang (6 trang, trang 2 bị sửa), mạng thêm 1 trang mỗi hardSpawnMs: nếu bot không sửa trang nào thì lệch tối đa
    const maxGap = (GAME_CONFIG.lesson1.hardStartPages - GAME_CONFIG.lesson1.hardTamperIndex) + Math.floor(L.hardDurationMs / L.hardSpawnMs);
    expect(maxGap).toBeLessThanOrEqual(20);
    expect(L.gapMin).toBeGreaterThanOrEqual(10);
    expect(L.gapMax).toBeLessThanOrEqual(20);
    expect(L.hardSpawnMs).toBeLessThan(GAME_CONFIG.lesson1.spawnMinMs);
    expect(L.tamperIndex).toBeLessThan(GAME_CONFIG.lesson1.mediumPages);
    expect(L.easyPrefilled).toBeLessThan(GAME_CONFIG.lesson1.easyPages);
  });
});
