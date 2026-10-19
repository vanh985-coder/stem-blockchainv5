import { AnimationClip, BoxGeometry, CapsuleGeometry, Color, Mesh, MeshStandardMaterial, Object3D, Texture, type Material } from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { asset, loadManifest } from '../assets/store';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { devWarn } from '../lib/dev';
import { MAX_RUNTIME_TEXTURE, modelPath, oversizedTextures, placeholderHsl, placeholderKind } from './modelIds';

/** Một model đã tải. `scene` là bản gốc dùng chung; mỗi chỗ dùng phải nhân bản bằng `cloneModel`. */
export interface ModelData {
  id: string;
  scene: Object3D;
  animations: AnimationClip[];
  /** true nếu thiếu file hoặc tải lỗi và đây là hình thay thế */
  placeholder: boolean;
}

interface Entry {
  status: 'pending' | 'ready';
  promise: Promise<ModelData>;
  data?: ModelData;
  refs: number;
  disposeTimer?: ReturnType<typeof setTimeout>;
  /** Lần cuối có component đọc model này lúc render (giờ `Date.now()`); đọc rồi mà chưa kịp `retainModel` (effect chạy sau commit) thì chưa được dọn */
  lastRead: number;
}

const cache = new Map<string, Entry>();
let loader: GLTFLoader | null = null;

/** Hoãn giải phóng một chút để StrictMode (gắn, gỡ, gắn lại) và chuyển cảnh nhanh không làm tải lại. */
const DISPOSE_DELAY_MS = 1500;

/** Số luồng phụ giải mã meshopt: chừa một lõi cho luồng chính, tối đa 3 (0 nếu không có Worker, như khi chạy test). */
export function decoderWorkerCount(cores: number | undefined, hasWorker: boolean): number {
  if (!hasWorker) return 0;
  return Math.max(1, Math.min(3, (cores ?? 2) - 1));
}

/**
 * GLTFLoader dùng chung. File nén meshopt cần MeshoptDecoder (bản đóng gói cùng ứng dụng, không tải từ CDN). Giải mã ở luồng phụ (`useWorkers`) để luồng chính không đứng khi vùng làng tải model:
 * trước đây giải mã chạy ngay trên luồng chính và là một nguồn gây khựng khi đi từ chợ vào làng.
 */
function getLoader(): GLTFLoader {
  if (!loader) {
    const n = decoderWorkerCount(typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency, typeof Worker !== 'undefined');
    if (n > 0) MeshoptDecoder.useWorkers(n);
    loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

/** Hình thay thế: capsule màu cho nhân vật (cao ~1,7), khối màu cho đồ vật (cạnh 1, đứng trên mặt đất). */
export function createPlaceholder(id: string): Object3D {
  const [h, s, l] = placeholderHsl(id);
  const material = new MeshStandardMaterial({ color: new Color().setHSL(h / 360, s, l), roughness: 0.8 });
  const root = new Object3D();
  if (placeholderKind(id) === 'capsule') {
    const mesh = new Mesh(new CapsuleGeometry(0.3, 1.1, 4, 12), material);
    mesh.position.y = 0.85;
    root.add(mesh);
  } else {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    mesh.position.y = 0.5;
    root.add(mesh);
  }
  return root;
}

/** Mọi texture của model (không trùng), duyệt qua các trường của vật liệu. */
function collectTextures(scene: Object3D): Texture[] {
  const seen = new Set<Texture>();
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats as Material[]) {
      for (const value of Object.values(m)) {
        const tex = value as Texture | null;
        if (tex && tex.isTexture) seen.add(tex);
      }
    }
  });
  return [...seen];
}

function textureSizes(scene: Object3D): { width: number; height: number }[] {
  const out: { width: number; height: number }[] = [];
  for (const tex of collectTextures(scene)) {
    const img = tex.image as { width?: number; height?: number } | undefined;
    if (img && img.width && img.height) out.push({ width: img.width, height: img.height });
  }
  return out;
}

async function fetchModel(id: string): Promise<ModelData> {
  await loadManifest();
  const url = asset(modelPath(id));
  if (!url) {
    devWarn(fmt(ui.dev.modelThieu, { id }));
    return { id, scene: createPlaceholder(id), animations: [], placeholder: true };
  }
  try {
    const gltf = await getLoader().loadAsync(url);
    const big = oversizedTextures(textureSizes(gltf.scene));
    if (big.length > 0) {
      // Cảnh báo ở mọi chế độ: texture quá lớn ăn bộ nhớ điện thoại (spec 03 mục 9).
      console.warn(`[so-chung] ${fmt(ui.dev.modelTextureLon, { id, x: big[0].width, y: big[0].height, max: MAX_RUNTIME_TEXTURE })}`);
    }
    return { id, scene: gltf.scene, animations: gltf.animations, placeholder: false };
  } catch (e) {
    devWarn(fmt(ui.dev.modelLoi, { id, loi: String(e) }));
    return { id, scene: createPlaceholder(id), animations: [], placeholder: true };
  }
}

function getEntry(id: string): Entry {
  let entry = cache.get(id);
  if (!entry) {
    const created: Entry = {
      status: 'pending',
      refs: 0,
      lastRead: 0,
      promise: fetchModel(id).then((data) => {
        created.status = 'ready';
        created.data = data;
        return data;
      }),
    };
    entry = created;
    cache.set(id, entry);
  }
  return entry;
}

/** Bắt đầu tải model (nếu chưa) và trả về Promise. Dùng ngoài React, ví dụ liệt kê clip ở /dev/3d. */
export function preloadModel(id: string): Promise<ModelData> {
  return getEntry(id).promise;
}

/**
 * Dùng trong render (có Suspense): ném Promise khi chưa tải xong, trả về dữ liệu khi đã có.
 * Thiếu file hoặc tải lỗi thì trả về hình thay thế (placeholder = true), không ném lỗi.
 */
export function readModel(id: string): ModelData {
  const entry = getEntry(id);
  if (entry.status === 'pending') throw entry.promise;
  entry.lastRead = Date.now();
  return entry.data as ModelData;
}

/** Nhân bản để dùng một chỗ. SkeletonUtils.clone giữ đúng xương của model có xương; hình học và vật liệu dùng chung. */
export function cloneModel(data: ModelData): Object3D {
  return cloneSkinned(data.scene);
}

/** Giải phóng riêng phần của bản nhân bản: xương của model có xương (texture xương nằm trên GPU). */
export function disposeClone(scene: Object3D): void {
  scene.traverse((o) => {
    const skinned = o as { isSkinnedMesh?: boolean; skeleton?: { dispose(): void } };
    if (skinned.isSkinnedMesh) skinned.skeleton?.dispose();
  });
}

/** Giải phóng hình học, vật liệu, texture của một model gốc. */
export function disposeModelScene(scene: Object3D): void {
  const textures = collectTextures(scene);
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats as Material[]) m.dispose();
  });
  for (const t of textures) {
    t.dispose();
    // GLTFLoader nạp ảnh dạng ImageBitmap: texture.dispose() chỉ giải phóng bản trên GPU, còn bitmap (bản giải nén trong RAM,
    // ~16 MB cho ảnh 2048×2048) chỉ được thu gom khi trình duyệt muốn. Đóng ngay để vào/ra cảnh nhiều lần không phình bộ nhớ.
    const img = t.image as { close?: () => void } | undefined;
    if (img && typeof img.close === 'function') img.close();
  }
}

/** Đánh dấu một chỗ đang dùng model. Gọi `releaseModel` khi không dùng nữa. */
export function retainModel(id: string): void {
  const entry = cache.get(id);
  if (!entry) return;
  entry.refs++;
  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = undefined;
  }
}

/** Hết chỗ dùng thì sau một lúc giải phóng model khỏi bộ nhớ (rời cảnh thì dispose, spec 03 mục 9). */
export function releaseModel(id: string): void {
  const entry = cache.get(id);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0 || entry.disposeTimer) return;
  scheduleDispose(id, entry, DISPOSE_DELAY_MS);
}

/**
 * Có được dọn model chưa: hết chỗ dùng, và không có ai vừa đọc lúc render mà chưa kịp giữ (nếu dọn lúc đó, scene vừa render sẽ mang texture đã đóng, rộng cao 0,
 * lên GPU và WebGL báo texture kích thước 0). Trả về số mili giây còn phải chờ (0 = dọn được).
 */
export function disposeWaitMs(refs: number, lastRead: number, now: number, delay: number = DISPOSE_DELAY_MS): number {
  if (refs > 0) return delay;
  return Math.max(0, lastRead + delay - now);
}

function scheduleDispose(id: string, entry: Entry, wait: number): void {
  entry.disposeTimer = setTimeout(() => {
    entry.disposeTimer = undefined;
    if (entry.refs > 0) return;
    const more = disposeWaitMs(entry.refs, entry.lastRead, Date.now());
    if (more > 0) {
      scheduleDispose(id, entry, more);
      return;
    }
    cache.delete(id);
    if (entry.data) disposeModelScene(entry.data.scene);
  }, wait);
}

/** Số model đang giữ trong bộ nhớ đệm và tổng số chỗ đang dùng (để kiểm tra rò rỉ khi vào/ra cảnh). */
export function modelCacheStats(): { entries: number; refs: number } {
  let refs = 0;
  cache.forEach((e) => (refs += e.refs));
  return { entries: cache.size, refs };
}
