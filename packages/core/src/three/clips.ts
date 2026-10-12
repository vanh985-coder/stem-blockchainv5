/**
 * Tên clip theo từ khóa và mượn clip giữa các model có xương (spec 03 mục 3.2). Hàm thuần, không import three.
 */

export type ClipName = 'idle' | 'walk' | 'run' | 'jump' | 'cheer' | 'hang';

export const CLIP_NAMES: readonly ClipName[] = ['idle', 'walk', 'run', 'jump', 'cheer', 'hang'];

/** Từ khóa tìm clip (không phân biệt hoa thường, bỏ hậu tố ".001"). "hang" khớp cả tên dài "hanging from a horizontal bar…". */
export const CLIP_KEYWORDS: Readonly<Record<ClipName, string>> = {
  idle: 'idle',
  walk: 'walk',
  run: 'run',
  jump: 'jump',
  cheer: 'cheer',
  hang: 'hang',
};

/** Bỏ hậu tố ".001", ".002"… ở cuối và đưa về chữ thường. */
export function stripClipSuffix(name: string): string {
  return name.replace(/\.\d+$/, '').toLowerCase();
}

/** Tên clip đầu tiên khớp từ khóa của `clip`, hoặc undefined. */
export function findClipName(names: readonly string[], clip: ClipName): string | undefined {
  const keyword = CLIP_KEYWORDS[clip];
  return names.find((n) => stripClipSuffix(n).includes(keyword));
}

/** Clip đầu tiên khớp từ khóa của `clip`, hoặc undefined. */
export function findClip<T extends { name: string }>(clips: readonly T[], clip: ClipName): T | undefined {
  const keyword = CLIP_KEYWORDS[clip];
  return clips.find((c) => stripClipSuffix(c.name).includes(keyword));
}

/** Nguồn của một clip: model nào, tên clip nào trong model đó. */
export interface ClipSource {
  model: string;
  name: string;
}

/**
 * Model có xương cho mượn clip, theo thứ tự ưu tiên: học sinh có đủ cả 6 clip nên đứng đầu.
 * Mọi model có xương đều là bộ xương Mixamo 65 xương cùng tên nên clip phát được trên model khác.
 */
export const CLIP_DONORS: readonly string[] = ['characters/hoc-sinh-nam', 'characters/ti', 'characters/dan-lang-ba-cu', 'characters/dan-lang-nong-dan'];

/**
 * Với mỗi clip cần dùng: lấy của chính model nếu có, không thì mượn của model cho mượn đầu tiên có clip đó.
 * `namesOf` trả tên clip của một model; được gọi **lười** (chỉ khi thật sự cần mượn), nên nơi gọi có thể tải model
 * cho mượn đúng lúc. Clip không ai có thì không có trong kết quả.
 */
export function borrowClips(
  ownId: string,
  namesOf: (modelId: string) => readonly string[],
  wanted: readonly ClipName[],
  donors: readonly string[] = CLIP_DONORS,
): Partial<Record<ClipName, ClipSource>> {
  const out: Partial<Record<ClipName, ClipSource>> = {};
  const ownNames = namesOf(ownId);
  let missing: ClipName[] = [];
  for (const clip of wanted) {
    const name = findClipName(ownNames, clip);
    if (name !== undefined) out[clip] = { model: ownId, name };
    else missing.push(clip);
  }
  for (const donor of donors) {
    if (missing.length === 0) break;
    if (donor === ownId) continue;
    const names = namesOf(donor);
    const still: ClipName[] = [];
    for (const clip of missing) {
      const name = findClipName(names, clip);
      if (name !== undefined) out[clip] = { model: donor, name };
      else still.push(clip);
    }
    missing = still;
  }
  return out;
}
