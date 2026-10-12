// Đọc, ghi và kiểm tra file .glb cho assets-build.mjs và test (spec 01 mục 5, spec 03 mục 3.2).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

/** NodeIO đọc được file nén Draco và meshopt, ghi được file meshopt. */
export async function createIO() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });
}

/** Bộ xương Mixamo chuẩn: 65 xương, tên bắt đầu bằng "mixamorig:" (spec 03 mục 3.2). */
export const MIXAMO_JOINT_COUNT = 65;
export const MIXAMO_PREFIX = 'mixamorig:';

/** Clip bắt buộc còn sau khi nén, theo từ khóa (spec 03 mục 3.2). Khóa là đường dẫn manifest. */
export const REQUIRED_CLIPS = {
  'models/characters/hoc-sinh-nam': ['idle', 'walk', 'run', 'jump', 'cheer', 'hang'],
  'models/characters/ti': ['idle', 'run', 'jump', 'cheer'],
  'models/characters/dan-lang-ba-cu': ['idle', 'walk'],
  'models/characters/dan-lang-nong-dan': ['idle', 'walk'],
};

/** Tìm clip theo từ khóa: không phân biệt hoa thường, bỏ hậu tố ".001". Trả clip đầu tiên khớp hoặc undefined. */
export function findClip(clips, keyword) {
  const kw = keyword.toLowerCase();
  return clips.find((c) => c.name.replace(/\.\d+$/, '').toLowerCase().includes(kw));
}

/**
 * Thông tin cần cho bảng tổng kết và phép kiểm tra. Hàm thuần theo Document đã đọc.
 * - tris: số tam giác (chỉ primitive dạng tam giác)
 * - skins/joints/jointNames: số bộ xương, số xương của bộ xương nhiều xương nhất, tên các xương đó
 * - clips: [{ name, duration, channels }]
 * - textures: [{ width, height, bytes, mime }]
 */
export function inspectDoc(doc) {
  const root = doc.getRoot();
  let tris = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const idx = prim.getIndices();
      tris += (idx ? idx.getCount() : (prim.getAttribute('POSITION')?.getCount() ?? 0)) / 3;
    }
  }
  const skins = root.listSkins();
  let jointNames = [];
  for (const s of skins) {
    const names = s.listJoints().map((j) => j.getName());
    if (names.length > jointNames.length) jointNames = names;
  }
  const clips = root.listAnimations().map((a) => {
    let duration = 0;
    for (const s of a.listSamplers()) {
      const max = s.getInput()?.getMax([]);
      if (max && max[0] > duration) duration = max[0];
    }
    return { name: a.getName(), duration, channels: a.listChannels().length };
  });
  const textures = root.listTextures().map((t) => {
    const size = t.getSize() ?? [0, 0];
    return { width: size[0], height: size[1], bytes: t.getImage()?.byteLength ?? 0, mime: t.getMimeType() };
  });
  return {
    tris,
    skins: skins.length,
    joints: jointNames.length,
    jointNames,
    clips,
    textures,
    extensions: root.listExtensionsUsed().map((e) => e.extensionName),
  };
}

/** Texture lớn nhất theo số điểm ảnh, hoặc null. */
export function largestTexture(info) {
  return info.textures.reduce((best, t) => (!best || t.width * t.height > best.width * best.height ? t : best), null);
}

export function textureBytes(info) {
  return info.textures.reduce((s, t) => s + t.bytes, 0);
}

/**
 * Kiểm tra một nhân vật có xương sau nén. Trả { problems: string[], found: { từKhóa: tênClip } }.
 * problems rỗng nghĩa là đạt.
 */
export function checkCharacter(info, key) {
  const problems = [];
  const found = {};
  if (info.joints !== MIXAMO_JOINT_COUNT) problems.push(`có ${info.joints} xương, cần ${MIXAMO_JOINT_COUNT}`);
  const bad = info.jointNames.filter((n) => !n.startsWith(MIXAMO_PREFIX));
  if (bad.length) problems.push(`${bad.length} xương không phải tên Mixamo (ví dụ "${bad[0]}")`);
  if (!info.jointNames.includes(`${MIXAMO_PREFIX}Hips`)) problems.push(`thiếu xương ${MIXAMO_PREFIX}Hips`);
  for (const kw of REQUIRED_CLIPS[key] ?? []) {
    const clip = findClip(info.clips, kw);
    if (!clip) problems.push(`thiếu clip "${kw}"`);
    else {
      found[kw] = clip.name;
      if (!(clip.duration > 0) || clip.channels === 0) problems.push(`clip "${clip.name}" rỗng`);
    }
  }
  return { problems, found };
}

// ---------------------------------------------------------------------------
// Hộp bao của lưới có xương ở tư thế gốc (skinning với xương đứng yên). Dùng để chắc chắn
// quantize/nén không làm lệch bộ xương: so hộp bao trước và sau nén.

export function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

/** Ma trận skinning (jointWorld * inverseBind) của từng xương ở tư thế gốc. */
export function jointMatrices(skin) {
  const ibm = skin.getInverseBindMatrices();
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return skin.listJoints().map((j, i) => mul(j.getWorldMatrix(), ibm ? ibm.getElement(i, new Array(16)) : identity));
}

export function skinnedRestBounds(doc) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const node of doc.getRoot().listNodes()) {
    const skin = node.getSkin();
    const mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const jm = jointMatrices(skin);
    const p = [0, 0, 0];
    const ji = [0, 0, 0, 0];
    const wi = [0, 0, 0, 0];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const J = prim.getAttribute('JOINTS_0');
      const W = prim.getAttribute('WEIGHTS_0');
      if (!pos || !J || !W) continue;
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p);
        J.getElement(i, ji);
        W.getElement(i, wi);
        let x = 0, y = 0, z = 0;
        for (let k = 0; k < 4; k++) {
          const w = wi[k];
          if (!w) continue;
          const m = jm[ji[k]];
          x += w * (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]);
          y += w * (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]);
          z += w * (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]);
        }
        if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
        if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
        if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
      }
    }
  }
  return { min, max };
}

/** Độ lệch lớn nhất giữa hai hộp bao, tính theo tỉ lệ cạnh dài nhất của hộp a. */
export function boundsDeviation(a, b) {
  const size = Math.max(a.max[0] - a.min[0], a.max[1] - a.min[1], a.max[2] - a.min[2]) || 1;
  let d = 0;
  for (let i = 0; i < 3; i++) d = Math.max(d, Math.abs(a.min[i] - b.min[i]), Math.abs(a.max[i] - b.max[i]));
  return d / size;
}
