import { describe, expect, it } from 'vitest';
import { SETTINGS_KEY, parseStored, resolveSettings, serializeStored } from './settings';

describe('cài đặt', () => {
  it('khóa lưu là sochung.v3.settings', () => {
    expect(SETTINGS_KEY).toBe('sochung.v3.settings');
  });

  it('chưa lưu gì: giảm chuyển động theo máy, chữ to tắt', () => {
    expect(resolveSettings({}, true)).toEqual({ reducedMotion: true, largeText: false, soundEnabled: true });
    expect(resolveSettings({}, false)).toEqual({ reducedMotion: false, largeText: false, soundEnabled: true });
  });

  it('đã chọn rõ thì ưu tiên lựa chọn, kể cả khi ngược với máy', () => {
    expect(resolveSettings({ reducedMotion: false }, true).reducedMotion).toBe(false);
    expect(resolveSettings({ reducedMotion: true, largeText: true }, false)).toEqual({ reducedMotion: true, largeText: true, soundEnabled: true });
  });

  it('đọc dữ liệu hỏng thì bỏ qua', () => {
    expect(parseStored(null)).toEqual({});
    expect(parseStored('không phải json')).toEqual({});
    expect(parseStored('[1,2]')).toEqual({});
    expect(parseStored('{"reducedMotion":"có","largeText":true,"x":1}')).toEqual({ largeText: true });
  });

  it('âm thanh mặc định bật; đã tắt thì giữ tắt', () => {
    expect(resolveSettings({}, false).soundEnabled).toBe(true);
    expect(resolveSettings({ soundEnabled: false }, false).soundEnabled).toBe(false);
    expect(parseStored('{"soundEnabled":false}')).toEqual({ soundEnabled: false });
    expect(parseStored('{"soundEnabled":"không"}')).toEqual({});
  });

  it('lưu rồi đọc lại ra như cũ', () => {
    const s = { reducedMotion: false, largeText: true, soundEnabled: false };
    expect(parseStored(serializeStored(s))).toEqual(s);
  });
});
