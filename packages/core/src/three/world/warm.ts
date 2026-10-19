/**
 * Làm ấm texture cho GPU trước khi vùng làng dựng (mốc 2, bước W2): đẩy từng texture lên GPU bằng `renderer.initTexture`, MỖI KHUNG HÌNH TỐI ĐA MỘT CÁI, và chờ sau texture lớn.
 * Texture 2048 ngốn khoảng 20 ms ở luồng chính, rồi tiếp tục tạo mip và sao chép ở tiến trình GPU; đẩy dồn hay đẩy ngay lúc vẽ lần đầu thì luồng chính phải chờ ở lệnh GL kế tiếp (khựng 80 đến 100 ms).
 */
import { Color, InstancedMesh, Scene, type BufferGeometry, type Camera, type Material, type Mesh, type Object3D, type Texture, type WebGLRenderer } from 'three';
import { sceneTextures, textureSize, textureUsable } from '../SceneWarmup';

/** Chờ chừng này (ms) sau khi đẩy một texture từ 2048 điểm ảnh trở lên, để GPU làm xong trước khi đẩy cái tiếp theo hay dựng nhân vật. */
export const WARM_GAP_MS = 140;
/** Cạnh dài từ đây trở lên thì coi là texture lớn. */
export const BIG_TEXTURE = 2048;

/** Phải chờ bao lâu (ms) sau khi đẩy một texture cỡ `width` × `height`: texture lớn chờ `WARM_GAP_MS`, nhỏ thì khung kế tiếp (0). */
export function warmGapMs(width: number, height: number): number {
  return Math.max(width, height) >= BIG_TEXTURE ? WARM_GAP_MS : 0;
}

/** Texture dùng được của các cảnh, không trùng, theo thứ tự gặp. */
export function usableTextures(scenes: readonly Object3D[]): Texture[] {
  const seen = new Set<Texture>();
  for (const s of scenes) for (const t of sceneTextures(s)) if (textureUsable(t)) seen.add(t);
  return [...seen];
}

/**
 * Đẩy lần lượt `textures` lên GPU, mỗi khung hình tối đa một cái, chờ `warmGapMs` sau texture lớn (và chờ nốt khoảng đó sau texture cuối nếu nó lớn). Trả về khi xong, hoặc ngay khi `isCancelled()`.
 * Texture đã ở trên GPU thì `initTexture` không làm gì (chỉ tốn một lần kiểm tra).
 */
export function warmTextures(gl: WebGLRenderer, textures: readonly Texture[], isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    let readyAt = 0;
    const step = () => {
      if (isCancelled()) return resolve();
      const now = performance.now();
      if (now < readyAt) {
        requestAnimationFrame(step);
        return;
      }
      if (i >= textures.length) return resolve();
      const t = textures[i++];
      gl.initTexture(t);
      const { width, height } = textureSize(t);
      readyAt = now + warmGapMs(width, height);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/**
 * Biên dịch trước shader cho các vật liệu `materials` (chạy ở tiến trình GPU, không chặn luồng chính: `compileAsync`), mỗi vật liệu gắn vào một InstancedMesh một bản có màu từng bản (đúng như lúc vẽ thật nên cùng
 * chương trình shader). Chương trình mới mà để tới lúc vẽ lần đầu mới biên dịch thì luồng chính phải chờ 40 đến 60 ms ở khung hình đó. `scene` là cảnh thật (để lấy ánh sáng và sương mù).
 */
export async function compileAhead(gl: WebGLRenderer, camera: Camera, scene: Scene, items: readonly { geometry: BufferGeometry; material: Material }[], isCancelled: () => boolean): Promise<void> {
  if (items.length === 0 || isCancelled()) return;
  const tmp = new Scene();
  const meshes = items.map(({ geometry, material }) => {
    const m = new InstancedMesh(geometry, material, 1);
    m.setColorAt(0, new Color(1, 1, 1));
    m.castShadow = true; // như lúc vẽ thật (đồ vật vừa đổ vừa nhận bóng): cùng chương trình shader
    m.receiveShadow = true;
    tmp.add(m);
    return m;
  });
  try {
    await gl.compileAsync(tmp, camera, scene);
  } finally {
    for (const m of meshes) m.dispose(); // chỉ giải phóng bộ đệm bản nhân bản; hình học và vật liệu do nơi gọi giữ
  }
}

/** Vật liệu của mọi mesh trong các cảnh (không trùng), kèm hình học của mesh đầu tiên dùng nó (để gắn vào InstancedMesh khi biên dịch trước). */
export function materialsOf(scenes: readonly Object3D[]): { geometry: BufferGeometry; material: Material }[] {
  const seen = new Map<Material, BufferGeometry>();
  for (const s of scenes) {
    s.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || (mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!seen.has(m)) seen.set(m, mesh.geometry);
    });
  }
  return [...seen].map(([material, geometry]) => ({ geometry, material }));
}

/** Các model nhân vật đã làm ấm texture (đang ở trên GPU); bỏ khi model bị giải phóng. */
const warmedModels = new Set<string>();
export const isModelWarm = (id: string): boolean => warmedModels.has(id);
export const markModelWarm = (id: string): void => void warmedModels.add(id);
export const unmarkModelWarm = (id: string): void => void warmedModels.delete(id);
