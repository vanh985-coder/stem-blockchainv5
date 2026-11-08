import { describe, expect, it } from 'vitest';
import {
  MUSIC_DUCK_FACTOR,
  MUSIC_VOLUME_DEFAULT,
  SFX_MIN_GAP_MS,
  clampMusicVolume,
  effectiveTrack,
  musicGain,
  sfxDue,
  trackChange,
  trackForLevel,
  trackForPath,
} from './musicLogic';

describe('trackForLevel', () => {
  it('bài học 1, 4, 7, 10', () => {
    for (const n of [1, 4, 7, 10]) expect(trackForLevel(n)).toBe('baiHoc');
  });
  it('màn 2 chạy, màn 12 hồi hộp', () => {
    expect(trackForLevel(2)).toBe('chay');
    expect(trackForLevel(12)).toBe('hoiHop');
  });
  it('màn 5, 9 và các màn 2.5D còn lại là nhạc vui', () => {
    for (const n of [3, 5, 6, 8, 9, 11]) expect(trackForLevel(n)).toBe('vui');
  });
});

describe('trackForPath', () => {
  it('bản đồ, chợ và làng là nhạc bản đồ', () => {
    expect(trackForPath('/cho')).toBe('banDo');
    expect(trackForPath('/cho/')).toBe('banDo');
    expect(trackForPath('/ban-do')).toBe('banDo');
    expect(trackForPath('/lang/lang-det')).toBe('banDo');
  });
  it('màn theo số màn, kể cả có query', () => {
    expect(trackForPath('/lang/lang-giay/man/1')).toBe('baiHoc');
    expect(trackForPath('/lang/lang-giay/man/2')).toBe('chay');
    expect(trackForPath('/lang/lang-det/man/5')).toBe('vui');
    expect(trackForPath('/lang/lang-bac/man/12')).toBe('hoiHop');
    expect(trackForPath('/lang/lang-bac/man/12?canh=cuoi')).toBe('hoiHop');
    expect(trackForPath('/lang/lang-bac/man/10/')).toBe('baiHoc');
  });
  it('hội làng', () => {
    expect(trackForPath('/hoi-lang')).toBe('hoiLang');
  });
  it('trang khác và màn không có thì im lặng', () => {
    for (const p of ['/', '/truyen', '/giao-vien', '/giao-vien/abc', '/dang-nhap', '/lang/lang-bac/man/13', '/lang/lang-bac/man/0', '/lang/lang-bac/khac/x']) {
      expect(trackForPath(p)).toBeNull();
    }
  });
});

describe('clampMusicVolume', () => {
  it('kẹp trong 0 đến 1, làm tròn 0,05', () => {
    expect(clampMusicVolume(-1)).toBe(0);
    expect(clampMusicVolume(5)).toBe(1);
    expect(clampMusicVolume(0.4)).toBe(0.4);
    expect(clampMusicVolume(0.37)).toBe(0.35);
    expect(clampMusicVolume(0.62)).toBe(0.6);
  });
  it('không phải số thì về mặc định 40%', () => {
    expect(MUSIC_VOLUME_DEFAULT).toBe(0.4);
    expect(clampMusicVolume(Number.NaN)).toBe(0.4);
    expect(clampMusicVolume('0.9')).toBe(0.4);
    expect(clampMusicVolume(undefined)).toBe(0.4);
  });
});

describe('musicGain', () => {
  it('bình thường theo âm lượng đặt', () => {
    expect(musicGain({ enabled: true, volume: 0.4, duckCount: 0 })).toBe(0.4);
  });
  it('tắt nhạc là 0', () => {
    expect(musicGain({ enabled: false, volume: 0.9, duckCount: 0 })).toBe(0);
  });
  it('có câu hỏi hoặc lời thoại thì còn 30% âm lượng hiện tại, nhiều lớp chồng nhau vẫn 30%', () => {
    expect(MUSIC_DUCK_FACTOR).toBe(0.3);
    expect(musicGain({ enabled: true, volume: 0.4, duckCount: 1 })).toBeCloseTo(0.12, 10);
    expect(musicGain({ enabled: true, volume: 1, duckCount: 3 })).toBeCloseTo(0.3, 10);
  });
  it('đóng hết thì trở lại', () => {
    expect(musicGain({ enabled: true, volume: 0.6, duckCount: 0 })).toBe(0.6);
  });
  it('âm lượng lạ được kẹp', () => {
    expect(musicGain({ enabled: true, volume: 7, duckCount: 0 })).toBe(1);
    expect(musicGain({ enabled: true, volume: -2, duckCount: 0 })).toBe(0);
  });
});

describe('effectiveTrack', () => {
  const base = { wanted: 'vui' as const, enabled: true, unlocked: true, hidden: false };
  it('đủ điều kiện thì phát bài cần', () => {
    expect(effectiveTrack(base)).toBe('vui');
  });
  it('chưa có cử chỉ đầu tiên, nhạc tắt hoặc tab ẩn thì không phát', () => {
    expect(effectiveTrack({ ...base, unlocked: false })).toBeNull();
    expect(effectiveTrack({ ...base, enabled: false })).toBeNull();
    expect(effectiveTrack({ ...base, hidden: true })).toBeNull();
  });
  it('rời cảnh (không cần bài nào) thì không phát', () => {
    expect(effectiveTrack({ ...base, wanted: null })).toBeNull();
  });
});

describe('trackChange', () => {
  it('cùng bài thì giữ, không phát lại từ đầu', () => {
    expect(trackChange('banDo', 'banDo')).toBe('keep');
    expect(trackChange(null, null)).toBe('keep');
  });
  it('bắt đầu, dừng, chuyển bài', () => {
    expect(trackChange(null, 'chay')).toBe('start');
    expect(trackChange('chay', null)).toBe('stop');
    expect(trackChange('chay', 'vui')).toBe('switch');
  });
});

describe('sfxDue', () => {
  it('lần đầu phát được; cách quá ngắn thì không', () => {
    expect(sfxDue(undefined, 100)).toBe(true);
    expect(sfxDue(1000, 1000 + SFX_MIN_GAP_MS - 1)).toBe(false);
    expect(sfxDue(1000, 1000 + SFX_MIN_GAP_MS)).toBe(true);
  });
});
