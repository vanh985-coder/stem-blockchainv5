// Kiểm tra âm thanh đã nén: giải mã lại assets-build/audio/*.mp3 (qua manifest) bằng ffmpeg và so với assets/audio/*.mp3 gốc.
// Điều kiện: thời lượng lệch < 1 giây, số kênh và tần số mẫu hợp lệ, RMS không gần 0 và không lệch xa bản gốc. Chạy: node scripts/check-audio.mjs
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALID_RATES = new Set([44100]); // đầu ra luôn 44100 Hz (scripts/lib/audio.mjs)

/** Giải mã về PCM 16 bit đơn kênh, trả { rate, channels, duration, rms (0 đến 1) }. */
async function probe(file) {
  const { stdout, stderr } = await run(ffmpegPath, ['-v', 'info', '-i', file, '-f', 's16le', '-ac', '1', '-'], { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 });
  const info = stderr.toString('latin1');
  const m = /Audio: mp3[^,]*, (\d+) Hz, (mono|stereo|\d+ channels)/.exec(info);
  if (!m) throw new Error('không đọc được luồng mp3');
  const rate = Number(m[1]);
  const channels = m[2] === 'mono' ? 1 : m[2] === 'stereo' ? 2 : Number(m[2]);
  const n = Math.floor(stdout.length / 2);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = stdout.readInt16LE(i * 2) / 32768;
    sum += v * v;
  }
  return { rate, channels, duration: n / rate, rms: n ? Math.sqrt(sum / n) : 0 };
}

const manifest = JSON.parse(await readFile(path.join(ROOT, 'assets-build', 'manifest.json'), 'utf8'));
const keys = Object.keys(manifest).filter((k) => k.startsWith('audio/')).sort();
let bad = 0;
console.log('file                 giây gốc/ra  kênh  Hz     RMS gốc  RMS ra   kết quả');
for (const key of keys) {
  const name = key.slice('audio/'.length);
  const src = await probe(path.join(ROOT, 'assets', 'audio', `${name}.mp3`));
  const out = await probe(path.join(ROOT, 'assets-build', manifest[key].file));
  const problems = [];
  if (Math.abs(src.duration - out.duration) >= 1) problems.push(`thời lượng lệch ${(out.duration - src.duration).toFixed(2)} s`);
  if (out.channels < 1 || out.channels > 2) problems.push('số kênh lạ');
  if (!VALID_RATES.has(out.rate)) problems.push(`tần số mẫu ${out.rate}`);
  if (out.rms < 0.01) problems.push('RMS gần 0 (im lặng)');
  if (src.rms > 0 && (out.rms / src.rms < 0.5 || out.rms / src.rms > 2)) problems.push('RMS lệch xa bản gốc');
  if (problems.length) bad++;
  console.log(`${name.padEnd(18)} ${src.duration.toFixed(1).padStart(6)}/${out.duration.toFixed(1).padEnd(6)} ${String(out.channels).padStart(3)}  ${String(out.rate).padEnd(6)} ${src.rms.toFixed(4).padStart(7)}  ${out.rms.toFixed(4).padStart(7)}  ${problems.length ? 'LỖI: ' + problems.join('; ') : 'đạt'}`);
}
if (!keys.length) {
  console.log('Không có mục audio/ trong manifest.');
  bad++;
}
console.log(bad ? `\n${bad} file lỗi.` : `\nCả ${keys.length} file đạt.`);
process.exit(bad ? 1 : 0);
