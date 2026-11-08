// Nén âm thanh cho assets:build: giải mã mp3 gốc (mpg123, WASM) rồi mã hóa lại bằng lamejs (thuần JS), không cần ffmpeg.
import { MPEGDecoder } from 'mpg123-decoder';
import lamejs from '@breezystack/lamejs';

/** Nhạc nền (nhac-*) về 96 kbps, đoạn ngắn (am-*) về 64 kbps. */
export const MUSIC_KBPS = 96;
export const SFX_KBPS = 64;
/** Bài dài hơn mức này thì chỉ ghi tên vào báo cáo, không tự cắt. */
export const LONG_TRACK_SEC = 180;

/** Quy tắc nén theo tên file không đuôi; null nếu không phải nhạc/âm của game. */
export function audioRule(name) {
  if (name.startsWith('nhac-')) return { kind: 'audio', kbps: MUSIC_KBPS };
  if (name.startsWith('am-')) return { kind: 'audio', kbps: SFX_KBPS };
  return null;
}

const toInt16 = (f32) => {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
};

/** Giải mã mp3 rồi mã hóa lại ở `kbps`. Trả { data: Buffer, duration (giây), sampleRate, channels }. */
export async function recompressMp3(srcBytes, kbps) {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const { channelData, sampleRate, samplesDecoded } = decoder.decode(new Uint8Array(srcBytes));
    if (!samplesDecoded) throw new Error('không giải mã được mp3');
    const channels = Math.min(2, channelData.length);
    const left = toInt16(channelData[0]);
    const right = channels === 2 ? toInt16(channelData[1]) : null;
    const enc = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const chunks = [];
    const BLOCK = 1152 * 8;
    for (let i = 0; i < left.length; i += BLOCK) {
      const l = left.subarray(i, i + BLOCK);
      const buf = right ? enc.encodeBuffer(l, right.subarray(i, i + BLOCK)) : enc.encodeBuffer(l);
      if (buf.length) chunks.push(Buffer.from(buf));
    }
    const tail = enc.flush();
    if (tail.length) chunks.push(Buffer.from(tail));
    return { data: Buffer.concat(chunks), duration: samplesDecoded / sampleRate, sampleRate, channels };
  } finally {
    decoder.free();
  }
}
