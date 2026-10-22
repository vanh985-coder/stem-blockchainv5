import { describe, expect, it } from 'vitest';
import { MOUSE_SENSITIVITY_MAX, MOUSE_SENSITIVITY_MIN, SETTINGS_KEY, clampMouseSensitivity, parseStored, resolveSettings, serializeStored } from './settings';

describe('cài đặt', () => {
  it('khóa lưu là sochung.v3.settings', () => {
    expect(SETTINGS_KEY).toBe('sochung.v3.settings');
  });

  it('chưa lưu gì: giảm chuyển động theo máy, chữ to tắt', () => {
    expect(resolveSettings({}, true)).toEqual({ reducedMotion: true, largeText: false, soundEnabled: true, quality: 'auto', mouseSensitivity: 1, rotateMap: false });
    expect(resolveSettings({}, false)).toEqual({ reducedMotion: false, largeText: false, soundEnabled: true, quality: 'auto', mouseSensitivity: 1, rotateMap: false });
  });

  it('đã chọn rõ thì ưu tiên lựa chọn, kể cả khi ngược với máy', () => {
    expect(resolveSettings({ reducedMotion: false }, true).reducedMotion).toBe(false);
    expect(resolveSettings({ reducedMotion: true, largeText: true }, false)).toEqual({ reducedMotion: true, largeText: true, soundEnabled: true, quality: 'auto', mouseSensitivity: 1, rotateMap: false });
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

  it('chất lượng 3D: mặc định auto; chọn rõ thì giữ; giá trị lạ thì bỏ qua', () => {
    expect(resolveSettings({}, false).quality).toBe('auto');
    expect(resolveSettings({ quality: 'high' }, false).quality).toBe('high');
    expect(parseStored('{"quality":"low"}')).toEqual({ quality: 'low' });
    expect(parseStored('{"quality":"auto"}')).toEqual({ quality: 'auto' });
    expect(parseStored('{"quality":"cao"}')).toEqual({});
    expect(parseStored('{"quality":3}')).toEqual({});
  });

  it('độ nhạy chuột: mặc định 1; kẹp trong 0,3 đến 3; làm tròn 0,1; giá trị lạ thì bỏ qua', () => {
    expect(resolveSettings({}, false).mouseSensitivity).toBe(1);
    expect(resolveSettings({ mouseSensitivity: 2.5 }, false).mouseSensitivity).toBe(2.5);
    expect(clampMouseSensitivity(0)).toBe(MOUSE_SENSITIVITY_MIN);
    expect(clampMouseSensitivity(99)).toBe(MOUSE_SENSITIVITY_MAX);
    expect(clampMouseSensitivity(1.26)).toBe(1.3);
    expect(clampMouseSensitivity(Number.NaN)).toBe(1);
    expect(clampMouseSensitivity('2')).toBe(1);
    expect(parseStored('{"mouseSensitivity":1.5}')).toEqual({ mouseSensitivity: 1.5 });
    expect(parseStored('{"mouseSensitivity":50}')).toEqual({ mouseSensitivity: MOUSE_SENSITIVITY_MAX });
    expect(parseStored('{"mouseSensitivity":"nhanh"}')).toEqual({});
    expect(parseStored('{"mouseSensitivity":null}')).toEqual({});
  });

  it('lưu rồi đọc lại ra như cũ', () => {
    const s = { reducedMotion: false, largeText: true, soundEnabled: false, quality: 'medium' as const, mouseSensitivity: 1.7 };
    expect(parseStored(serializeStored(s))).toEqual(s);
  });
});
