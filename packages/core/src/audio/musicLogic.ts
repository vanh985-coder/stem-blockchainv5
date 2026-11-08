/**
 * Logic thuần của nhạc nền (không React, không Web Audio): chọn bài theo đường dẫn trang, tính âm lượng, quyết định chuyển bài.
 * Bộ phát nằm ở `musicManager.ts`.
 */

/** Bài nhạc nền, theo cảnh. */
export type MusicTrack = 'banDo' | 'baiHoc' | 'chay' | 'vui' | 'hoiHop' | 'hoiLang';
/** Đoạn âm ngắn phát một lần. */
export type SfxKey = 'thang' | 'thua' | 'cauHoi';

/** Khóa manifest của từng bài (assets/audio/<tên>.mp3, đường dẫn không đuôi như đồ họa). */
export const MUSIC_ASSET: Readonly<Record<MusicTrack, string>> = {
  banDo: 'audio/nhac-ban-do',
  baiHoc: 'audio/nhac-bai-hoc',
  chay: 'audio/nhac-chay',
  vui: 'audio/nhac-vui',
  hoiHop: 'audio/nhac-hoi-hop',
  hoiLang: 'audio/nhac-hoi-lang',
};

export const SFX_ASSET: Readonly<Record<SfxKey, string>> = {
  thang: 'audio/am-thang',
  thua: 'audio/am-thua',
  cauHoi: 'audio/am-cau-hoi',
};

export const SFX_KEYS: readonly SfxKey[] = ['thang', 'thua', 'cauHoi'];

/** Thời gian chuyển bài (giảm dần bài cũ, tăng dần bài mới), giây. */
export const MUSIC_FADE_SEC = 1;
/** Thời gian hạ/nâng âm lượng khi có câu hỏi hoặc lời thoại, giây. */
export const MUSIC_DUCK_FADE_SEC = 0.3;
/** Âm lượng nhạc nền mặc định (0 đến 1). */
export const MUSIC_VOLUME_DEFAULT = 0.4;
export const MUSIC_VOLUME_STEP = 0.05;
/** Khi có câu hỏi hoặc lời thoại, nhạc nền còn bấy nhiêu phần âm lượng đang đặt. */
export const MUSIC_DUCK_FACTOR = 0.3;
/** Âm lượng cố định của các đoạn âm ngắn (thắng, thua, câu hỏi). */
export const SFX_VOLUME = 0.8;
/** Cùng một đoạn âm không phát lại trong khoảng này (mili giây): màn thắng gọi âm thắng từ hai chỗ. */
export const SFX_MIN_GAP_MS = 1500;

/** Hàm thuần: bài nhạc của một màn. 1, 4, 7, 10 là bài học; 2 là chạy; 12 là hồi hộp; 5, 9 và các màn 2.5D còn lại là vui. */
export function trackForLevel(level: number): MusicTrack {
  if (level === 1 || level === 4 || level === 7 || level === 10) return 'baiHoc';
  if (level === 2) return 'chay';
  if (level === 12) return 'hoiHop';
  return 'vui';
}

/**
 * Hàm thuần: bài nhạc của một đường dẫn trang (chưa kèm `?query`). Bản đồ, chợ và các làng (cảnh 3D đi lại) là nhạc bản đồ;
 * `/lang/<id>/man/<n>` theo màn; hội làng riêng; trang khác (trang chủ, truyện, giáo viên, đăng nhập) không có nhạc (null).
 */
export function trackForPath(pathname: string): MusicTrack | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (path === '/cho' || path === '/ban-do') return 'banDo';
  if (path === '/hoi-lang') return 'hoiLang';
  const m = /^\/lang\/[^/]+(?:\/man\/(\d+))?(?:\/.*)?$/.exec(path);
  if (!m) return null;
  if (m[1] === undefined) return path.split('/').length <= 3 ? 'banDo' : null;
  const level = Number(m[1]);
  return level >= 1 && level <= 12 ? trackForLevel(level) : null;
}

/** Hàm thuần: đưa âm lượng về 0 đến 1, làm tròn tới 0,05; không phải số thì về mặc định. */
export function clampMusicVolume(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return MUSIC_VOLUME_DEFAULT;
  return Math.round(Math.min(1, Math.max(0, v)) * 20) / 20;
}

/** Hàm thuần: độ lợi (gain) áp lên nhạc nền. Tắt nhạc là 0; có câu hỏi hoặc lời thoại (`duckCount` > 0) thì còn 30% âm lượng đang đặt. */
export function musicGain(opts: { enabled: boolean; volume: number; duckCount: number }): number {
  if (!opts.enabled) return 0;
  const v = clampMusicVolume(opts.volume);
  return opts.duckCount > 0 ? v * MUSIC_DUCK_FACTOR : v;
}

/** Bài thật sự nên phát: cần đã có cử chỉ đầu tiên của người chơi, nhạc bật, tab đang hiện; ngược lại không phát gì. */
export function effectiveTrack(opts: { wanted: MusicTrack | null; enabled: boolean; unlocked: boolean; hidden: boolean }): MusicTrack | null {
  return opts.unlocked && opts.enabled && !opts.hidden ? opts.wanted : null;
}

export type TrackChange = 'keep' | 'start' | 'stop' | 'switch';

/** Hàm thuần: đổi từ bài đang phát sang bài cần phát. Cùng bài thì giữ nguyên (không phát lại từ đầu). */
export function trackChange(current: MusicTrack | null, next: MusicTrack | null): TrackChange {
  if (current === next) return 'keep';
  if (next === null) return 'stop';
  return current === null ? 'start' : 'switch';
}

/** Hàm thuần: có phát đoạn âm ngắn lúc này không (cách lần phát trước đủ xa). */
export function sfxDue(lastAt: number | undefined, now: number): boolean {
  return lastAt === undefined || now - lastAt >= SFX_MIN_GAP_MS;
}
