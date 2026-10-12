/**
 * Chỉ dùng trong test (Node): đọc file .glb thật trong assets-build/ bằng GLTFLoader của three.
 * Texture bị bỏ đi (Node không có bộ giải mã ảnh), vì test chỉ cần xương, hình học và clip.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../assets-build');

// GLTFLoader đọc buffer dạng data URI qua FileLoader, cần ProgressEvent (Node không có sẵn).
if (typeof (globalThis as { ProgressEvent?: unknown }).ProgressEvent === 'undefined') {
  (globalThis as { ProgressEvent?: unknown }).ProgressEvent = class extends Event {
    constructor(type: string, init?: object) {
      super(type);
      Object.assign(this, init);
    }
  };
}

interface GlbJson {
  textures?: unknown;
  images?: unknown;
  samplers?: unknown;
  materials?: { pbrMetallicRoughness?: Record<string, unknown>; normalTexture?: unknown; occlusionTexture?: unknown; emissiveTexture?: unknown }[];
  extensionsUsed?: string[];
  buffers: { uri?: string }[];
}

/** GLB không texture, dạng JSON kèm buffer nhúng (data URI). */
function stripTextures(buf: Buffer): string {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as GlbJson;
  const binStart = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binStart);
  const bin = buf.subarray(binStart + 8, binStart + 8 + binLen);
  delete json.textures;
  delete json.images;
  delete json.samplers;
  for (const m of json.materials ?? []) {
    const p = m.pbrMetallicRoughness ?? {};
    delete p.baseColorTexture;
    delete p.metallicRoughnessTexture;
    delete m.normalTexture;
    delete m.occlusionTexture;
    delete m.emissiveTexture;
  }
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((e) => e !== 'EXT_texture_webp');
  json.buffers[0].uri = `data:application/octet-stream;base64,${bin.toString('base64')}`;
  return JSON.stringify(json);
}

const cache = new Map<string, Promise<GLTF>>();

/** Tải model theo id ("characters/ti") từ assets-build/, dùng manifest để tìm tên file có mã băm. */
export function loadGltfForTest(id: string): Promise<GLTF> {
  let p = cache.get(id);
  if (!p) {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')) as Record<string, { file: string }>;
    const entry = manifest[`models/${id}`];
    if (!entry) throw new Error(`manifest has no models/${id}`);
    const buf = readFileSync(path.join(ROOT, entry.file));
    p = new Promise<GLTF>((resolve, reject) => {
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(stripTextures(buf), '', resolve, reject);
    });
    cache.set(id, p);
  }
  return p;
}
