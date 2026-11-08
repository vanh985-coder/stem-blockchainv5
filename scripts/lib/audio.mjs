// Nén âm thanh cho assets:build bằng ffmpeg (gói ffmpeg-static, có sẵn file chạy): -codec:a libmp3lame -b:a <kbps> -ar 44100.
// Kiểm đầu ra: node scripts/check-audio.mjs (giải mã lại, so thời lượng, kênh, tần số mẫu và RMS với file gốc).
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);

/** Nhạc nền (nhac-*) về 96 kbps, đoạn ngắn (am-*) về 64 kbps. */
export const MUSIC_KBPS = 96;
export const SFX_KBPS = 64;
/** Tần số mẫu của mọi file đầu ra. */
export const SAMPLE_RATE = 44100;
/** Bài dài hơn mức này thì chỉ ghi tên vào báo cáo, không tự cắt. */
export const LONG_TRACK_SEC = 180;

/** Quy tắc nén theo tên file không đuôi; null nếu không phải nhạc/âm của game. */
export function audioRule(name) {
  if (name.startsWith('nhac-')) return { kind: 'audio', kbps: MUSIC_KBPS };
  if (name.startsWith('am-')) return { kind: 'audio', kbps: SFX_KBPS };
  return null;
}

/** Thời lượng (giây) đọc từ dòng "Duration: hh:mm:ss.xx" của ffmpeg; 0 nếu không đọc được. */
export function parseDuration(stderr) {
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/**
 * Nén mp3 ở `kbps`. Trả { data: Buffer, duration (giây), method: 'ffmpeg' }.
 * Nếu ffmpeg không chạy được trên máy này thì chép nguyên file gốc (method: 'goc', kèm `warning`) để vẫn có nhạc.
 */
export async function recompressMp3(srcBytes, kbps) {
  const dir = await mkdtemp(path.join(tmpdir(), 'sc-audio-'));
  const inFile = path.join(dir, 'in.mp3');
  const outFile = path.join(dir, 'out.mp3');
  try {
    await writeFile(inFile, srcBytes);
    const { stderr } = await run(ffmpegPath, ['-v', 'info', '-y', '-i', inFile, '-vn', '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', `${kbps}k`, '-ar', String(SAMPLE_RATE), outFile], { encoding: 'utf8' });
    return { data: await readFile(outFile), duration: parseDuration(stderr), method: 'ffmpeg' };
  } catch (e) {
    return { data: srcBytes, duration: 0, method: 'goc', warning: `ffmpeg không chạy được (${e.code ?? e.message}): giữ nguyên file gốc, không nén` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
