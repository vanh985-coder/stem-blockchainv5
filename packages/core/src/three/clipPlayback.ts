import { AnimationClip } from 'three';
import { playbackRange, type ClipConfig } from './clipConfig';
import type { ClipName } from './clips';

/** Track vị trí của xương hông. Tên sau khi three đọc là "mixamorigHips.position" (bỏ dấu ":"). */
const HIPS_POSITION = /hips\.position$/i;
/** Sai số khi so sánh thời điểm khung khóa (giây). */
const EPS = 1e-4;

function hipsTrack(clip: AnimationClip) {
  return clip.tracks.find((t) => HIPS_POSITION.test(t.name));
}

/**
 * Khóa chuyển động gốc (in-place): bỏ phần dịch chuyển ngang (x, z) của `mixamorig:Hips`, giữ nguyên độ cao (y) để
 * nhảy và nhún vẫn đúng. Vị trí nhân vật do code điều khiển, không do clip. Trả về clip mới, clip gốc giữ nguyên.
 * Cố định x, z bằng giá trị ở khung đầu tiên (không phải 0) để giữ đúng tư thế hông của clip.
 */
export function lockRootMotion(clip: AnimationClip): AnimationClip {
  const out = clip.clone();
  const track = hipsTrack(out);
  if (track && track.values.length >= 3) {
    const v = track.values;
    const x0 = v[0];
    const z0 = v[2];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
    }
  }
  return out;
}

/** Khoảng dịch ngang lớn nhất của hông so với khung đầu (đơn vị của model). 0 nếu không có track hông. */
export function maxHorizontalDrift(clip: AnimationClip): number {
  const track = hipsTrack(clip);
  if (!track) return 0;
  const v = track.values;
  let max = 0;
  for (let i = 0; i < v.length; i += 3) max = Math.max(max, Math.hypot(v[i] - v[0], v[i + 2] - v[2]));
  return max;
}

/**
 * Tốc độ tiến tới (đơn vị model/giây) mà clip gốc ngầm có: khoảng dịch ngang của hông từ khung đầu tới khung cuối chia cho
 * thời lượng. Dùng cho clip đi, chạy để nhân vật di chuyển đúng tốc độ chân bước (không trượt chân).
 */
export function rootSpeed(clip: AnimationClip): number {
  const track = hipsTrack(clip);
  if (!track || clip.duration <= 0 || track.values.length < 6) return 0;
  const v = track.values;
  const n = v.length;
  return Math.hypot(v[n - 3] - v[0], v[n - 1] - v[2]) / clip.duration;
}

/**
 * Cắt clip lấy các khung khóa trong [start, end] (giây), dời để khung đầu tiên ở thời điểm 0. Dùng thay cho
 * AnimationUtils.subclip vì subclip bỏ khung khóa cuối nên đoạn ngắn hơn yêu cầu tới 2 khung.
 */
export function cutClip(source: AnimationClip, name: string, start: number, end: number): AnimationClip {
  const tracks = source.tracks.map((track) => {
    const times = track.times;
    const size = track.getValueSize();
    let from = 0;
    while (from < times.length - 1 && times[from] < start - EPS) from++;
    let to = from;
    while (to + 1 < times.length && times[to + 1] <= end + EPS) to++;
    const forced = to === from && to + 1 < times.length;
    if (forced) to++; // luôn có ít nhất 2 khung để nội suy (track hằng như scale chỉ có 2 khung ở đầu và cuối clip)
    const cut = track.clone();
    const t0 = times[from];
    const limit = Math.max(end - t0, EPS);
    cut.times = Float32Array.from(times.subarray(from, to + 1), (t, i) => (forced && i === to - from ? Math.min(t - t0, limit) : t - t0));
    cut.values = track.values.slice(from * size, (to + 1) * size);
    return cut;
  });
  return new AnimationClip(name, -1, tracks);
}

export interface PlayableClip {
  clip: AnimationClip;
  loop: boolean;
}

/**
 * Clip sẵn sàng phát: đã khóa chuyển động gốc và cắt theo cấu hình (jump 30%–70%, cheer 2,5 giây đầu…).
 * Clip lặp cả đoạn thì không cắt.
 */
export function buildPlayableClip(source: AnimationClip, name: ClipName, cfg: ClipConfig): PlayableClip {
  const locked = lockRootMotion(source);
  const { start, end, loop } = playbackRange(source.duration, cfg);
  if (start <= 1e-6 && end >= source.duration - 1e-6) return { clip: locked, loop };
  return { clip: cutClip(locked, name, start, end), loop };
}
