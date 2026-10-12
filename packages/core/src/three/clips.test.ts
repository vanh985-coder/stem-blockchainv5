import { describe, expect, it } from 'vitest';
import { CLIP_DONORS, CLIP_NAMES, borrowClips, findClip, findClipName, stripClipSuffix } from './clips';
import { loadGltfForTest } from './testGlb';

const HANG = 'hanging from a horizontal bar with both arms straight up above ';

describe('tìm clip theo từ khóa', () => {
  const names = ['idle.001', 'Walk.001', 'run.001', 'jump_down.001', 'cheer.001', HANG];

  it('bỏ hậu tố .001 và không phân biệt hoa thường', () => {
    expect(stripClipSuffix('IDLE.001')).toBe('idle');
    expect(stripClipSuffix('jump_down.012')).toBe('jump_down');
    expect(stripClipSuffix('walk')).toBe('walk');
    expect(findClipName(names, 'idle')).toBe('idle.001');
    expect(findClipName(names, 'walk')).toBe('Walk.001');
    expect(findClipName(names, 'run')).toBe('run.001');
    expect(findClipName(names, 'jump')).toBe('jump_down.001');
    expect(findClipName(names, 'cheer')).toBe('cheer.001');
  });

  it('"hang" khớp tên dài "hanging from a horizontal bar…"', () => {
    expect(findClipName(names, 'hang')).toBe(HANG);
    expect(findClipName([HANG], 'run')).toBeUndefined();
    expect(findClipName([HANG], 'idle')).toBeUndefined();
  });

  it('không có thì undefined; hậu tố số không được tính vào khớp', () => {
    expect(findClipName(['idle.001', 'walk.001'], 'run')).toBeUndefined();
    expect(findClipName(['x.001'], 'idle')).toBeUndefined();
    expect(findClipName([], 'walk')).toBeUndefined();
  });

  it('findClip trả đúng phần tử', () => {
    const clips = names.map((name) => ({ name, id: name.length }));
    expect(findClip(clips, 'jump')).toBe(clips[3]);
    expect(findClip(clips, 'hang')).toBe(clips[5]);
    expect(findClip([], 'idle')).toBeUndefined();
  });
});

describe('mượn clip giữa các model có xương', () => {
  const names: Record<string, string[]> = {
    'characters/hoc-sinh-nam': ['cheer.001', HANG, 'idle.001', 'jump_down.001', 'run.001', 'walk.001'],
    'characters/ti': ['idle.001', 'jump_down.001', 'run.001', 'cheer.001'],
    'characters/dan-lang-ba-cu': ['walk.001', 'idle.001'],
    'characters/dan-lang-nong-dan': ['walk.001', 'idle.001'],
  };
  const namesOf = (id: string) => names[id] ?? [];

  it('Tí mượn walk và hang của học sinh, giữ clip của mình', () => {
    const r = borrowClips('characters/ti', namesOf, CLIP_NAMES);
    expect(r.walk).toEqual({ model: 'characters/hoc-sinh-nam', name: 'walk.001' });
    expect(r.hang).toEqual({ model: 'characters/hoc-sinh-nam', name: HANG });
    expect(r.idle).toEqual({ model: 'characters/ti', name: 'idle.001' });
    expect(r.run).toEqual({ model: 'characters/ti', name: 'run.001' });
    expect(r.jump?.model).toBe('characters/ti');
    expect(r.cheer?.model).toBe('characters/ti');
  });

  it('học sinh có đủ 6 clip, không mượn ai', () => {
    const r = borrowClips('characters/hoc-sinh-nam', namesOf, CLIP_NAMES);
    expect(Object.keys(r).sort()).toEqual([...CLIP_NAMES].sort());
    for (const c of CLIP_NAMES) expect(r[c]?.model).toBe('characters/hoc-sinh-nam');
  });

  it('bà cụ mượn run, jump, cheer, hang của học sinh', () => {
    const r = borrowClips('characters/dan-lang-ba-cu', namesOf, CLIP_NAMES);
    expect(r.walk?.model).toBe('characters/dan-lang-ba-cu');
    expect(r.idle?.model).toBe('characters/dan-lang-ba-cu');
    for (const c of ['run', 'jump', 'cheer', 'hang'] as const) expect(r[c]?.model).toBe('characters/hoc-sinh-nam');
  });

  it('chỉ hỏi model cho mượn khi thật sự cần (tải lười)', () => {
    const asked: string[] = [];
    const spy = (id: string) => {
      asked.push(id);
      return namesOf(id);
    };
    borrowClips('characters/hoc-sinh-nam', spy, CLIP_NAMES);
    expect(asked).toEqual(['characters/hoc-sinh-nam']);
    asked.length = 0;
    borrowClips('characters/ti', spy, ['idle', 'run']);
    expect(asked).toEqual(['characters/ti']);
    asked.length = 0;
    borrowClips('characters/ti', spy, ['idle', 'walk']);
    expect(asked).toEqual(['characters/ti', 'characters/hoc-sinh-nam']);
  });

  it('clip không ai có thì không có trong kết quả', () => {
    const r = borrowClips('characters/bac-an', () => [], ['idle', 'walk'], ['characters/ti']);
    expect(r).toEqual({});
  });

  it('thứ tự cho mượn: học sinh đứng đầu', () => {
    expect(CLIP_DONORS[0]).toBe('characters/hoc-sinh-nam');
  });
});

describe('clip trong file thật (assets-build)', () => {
  const expected: Record<string, string[]> = {
    'characters/hoc-sinh-nam': ['idle', 'walk', 'run', 'jump', 'cheer', 'hang'],
    'characters/ti': ['idle', 'run', 'jump', 'cheer'],
    'characters/dan-lang-ba-cu': ['idle', 'walk'],
    'characters/dan-lang-nong-dan': ['idle', 'walk'],
  };
  for (const [id, clips] of Object.entries(expected)) {
    it(`${id}: tìm được đúng các clip ${clips.join(', ')} và không thừa`, async () => {
      const gltf = await loadGltfForTest(id);
      const names = gltf.animations.map((a) => a.name);
      for (const c of CLIP_NAMES) {
        expect(findClipName(names, c) !== undefined, `${id} ${c}`).toBe(clips.includes(c));
      }
    });
  }

  it('mượn trên file thật: Tí có đủ 6 clip sau khi mượn của học sinh', async () => {
    const all = Object.fromEntries(await Promise.all(Object.keys(expected).map(async (id) => [id, (await loadGltfForTest(id)).animations.map((a) => a.name)])));
    const r = borrowClips('characters/ti', (id) => all[id] ?? [], CLIP_NAMES);
    expect(Object.keys(r).sort()).toEqual([...CLIP_NAMES].sort());
    expect(r.walk?.model).toBe('characters/hoc-sinh-nam');
  });
});
