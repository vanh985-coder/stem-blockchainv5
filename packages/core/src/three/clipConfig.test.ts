import { describe, expect, it } from 'vitest';
import { CLIP_CONFIG, formatClipConfig, playbackRange } from './clipConfig';

describe('clipConfig (spec 03 mục 3.2)', () => {
  it('jump 30%–70% một lần; cheer 2,5 giây đầu một lần; idle, walk, run, hang lặp', () => {
    expect(CLIP_CONFIG.jump).toEqual({ from: 0.3, to: 0.7, loop: false });
    expect(CLIP_CONFIG.cheer).toEqual({ from: 0, seconds: 2.5, loop: false });
    for (const c of ['idle', 'walk', 'run', 'hang'] as const) expect(CLIP_CONFIG[c].loop).toBe(true);
  });

  it('jump_down dài 3,75 giây: phát từ 1,125 tới 2,625', () => {
    const r = playbackRange(3.75, CLIP_CONFIG.jump);
    expect(r.start).toBeCloseTo(1.125, 6);
    expect(r.end).toBeCloseTo(2.625, 6);
    expect(r.loop).toBe(false);
  });
  it('cheer dài 12,13 giây: phát 2,5 giây đầu', () => {
    expect(playbackRange(12.13, CLIP_CONFIG.cheer)).toEqual({ start: 0, end: 2.5, loop: false });
  });
  it('clip ngắn hơn 2,5 giây thì phát hết, không vượt', () => {
    expect(playbackRange(1.5, CLIP_CONFIG.cheer).end).toBe(1.5);
  });
  it('không cấu hình đoạn cuối thì phát tới hết', () => {
    expect(playbackRange(15.38, CLIP_CONFIG.idle)).toEqual({ start: 0, end: 15.38, loop: true });
  });
  it('giá trị lệch lạc vẫn cho đoạn hợp lệ (end > start, trong clip)', () => {
    for (const cfg of [{ from: 0.9, to: 0.1, loop: false }, { from: -1, to: 5, loop: false }, { from: 1, loop: false }]) {
      const r = playbackRange(4, cfg);
      expect(r.start).toBeGreaterThanOrEqual(0);
      expect(r.end).toBeLessThanOrEqual(4);
      expect(r.end).toBeGreaterThan(r.start - 1e-9);
    }
  });

  it('xuất ra mã clipConfig.ts đúng định dạng', () => {
    const src = formatClipConfig(CLIP_CONFIG);
    expect(src).toContain('export const CLIP_CONFIG: ClipConfigTable = {');
    expect(src).toContain('jump: { from: 0.3, to: 0.7, loop: false },');
    expect(src).toContain('cheer: { from: 0, seconds: 2.5, loop: false },');
    expect(src).toContain('idle: { from: 0, loop: true },');
  });
  it('xuất ra làm tròn số, không để lại đuôi số lẻ dài', () => {
    const src = formatClipConfig({ ...CLIP_CONFIG, jump: { from: 0.30000000000000004, to: 0.7000000000000001, loop: false } });
    expect(src).toContain('jump: { from: 0.3, to: 0.7, loop: false },');
  });
});
