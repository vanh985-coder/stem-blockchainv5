/**
 * Đoạn phát của từng clip (spec 03 mục 3.2). Chỉnh được ở /dev/3d (thanh trượt jump và cheer), rồi bấm "Xuất ra
 * clipConfig.ts" và dán đè vào đây. Không import three.
 */
import type { ClipName } from './clips';

export interface ClipConfig {
  /** Điểm bắt đầu, theo tỉ lệ độ dài clip (0 đến 1) */
  from: number;
  /** Điểm kết thúc, theo tỉ lệ độ dài clip (0 đến 1). Bỏ trống thì dùng `seconds`, hoặc phát tới hết. */
  to?: number;
  /** Phát bao nhiêu giây kể từ `from` (dùng khi không có `to`) */
  seconds?: number;
  /** true: lặp; false: phát một lần rồi dừng */
  loop: boolean;
}

export type ClipConfigTable = Readonly<Record<ClipName, ClipConfig>>;

/** jump (jump_down dài 3,75 giây): đoạn 30%–70%, một lần. cheer (dài 12,1 giây): 2,5 giây đầu, một lần. Còn lại lặp cả clip. */
export const CLIP_CONFIG: ClipConfigTable = {
  idle: { from: 0, loop: true },
  walk: { from: 0, loop: true },
  run: { from: 0, loop: true },
  jump: { from: 0.3, to: 0.7, loop: false },
  cheer: { from: 0, seconds: 2.5, loop: false },
  hang: { from: 0, loop: true },
};

export interface PlaybackRange {
  start: number;
  end: number;
  loop: boolean;
}

/** Đoạn phát (giây) của một clip dài `duration` giây theo cấu hình. Luôn nằm trong [0, duration], end > start. */
export function playbackRange(duration: number, cfg: ClipConfig): PlaybackRange {
  const clamp = (v: number) => Math.min(duration, Math.max(0, v));
  const start = clamp(cfg.from * duration);
  let end = duration;
  if (cfg.to !== undefined) end = clamp(cfg.to * duration);
  else if (cfg.seconds !== undefined) end = clamp(start + cfg.seconds);
  if (end <= start) end = Math.min(duration, start + Math.max(duration * 0.01, 1e-3));
  return { start, end, loop: cfg.loop };
}

const NAMES: readonly ClipName[] = ['idle', 'walk', 'run', 'jump', 'cheer', 'hang'];
const num = (v: number) => String(Math.round(v * 1000) / 1000);

/** Nội dung file clipConfig.ts tương ứng với bảng cấu hình (dùng cho nút "Xuất ra clipConfig.ts" ở /dev/3d). */
export function formatClipConfig(table: ClipConfigTable): string {
  const rows = NAMES.map((n) => {
    const c = table[n];
    const parts = [`from: ${num(c.from)}`];
    if (c.to !== undefined) parts.push(`to: ${num(c.to)}`);
    else if (c.seconds !== undefined) parts.push(`seconds: ${num(c.seconds)}`);
    parts.push(`loop: ${c.loop}`);
    return `  ${n}: { ${parts.join(', ')} },`;
  });
  return `export const CLIP_CONFIG: ClipConfigTable = {\n${rows.join('\n')}\n};\n`;
}
