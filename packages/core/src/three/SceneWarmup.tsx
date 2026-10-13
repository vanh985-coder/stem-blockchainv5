import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import type { Camera, InstancedMesh, Material, Object3D, Scene, Texture, WebGLRenderer } from 'three';

/** Một thay đổi tạm cần hoàn lại sau khi nạp trước. */
interface Saved {
  object: Object3D;
  visible: boolean;
  count?: number;
}

const isTexture = (v: unknown): v is Texture => !!v && (v as { isTexture?: boolean }).isTexture === true;

/**
 * Kích thước ảnh của texture (0 nếu chưa có ảnh, ảnh chưa tải xong, hay ImageBitmap đã bị đóng). Texture có kích thước 0 mà đưa lên GPU thì WebGL báo
 * "glTexStorage2D: One or more image dimensions are not positive" và "glGenerateMipmap: ... does not support mipmap generation".
 */
export function textureSize(t: Texture): { width: number; height: number } {
  const img = t.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; complete?: boolean } | null | undefined;
  if (!img) return { width: 0, height: 0 };
  if (img.complete === false) return { width: 0, height: 0 };
  return { width: img.naturalWidth ?? img.videoWidth ?? img.width ?? 0, height: img.naturalHeight ?? img.videoHeight ?? img.height ?? 0 };
}

/** Texture có ảnh dùng được (rộng và cao đều dương) thì mới đưa lên GPU. */
export function textureUsable(t: Texture): boolean {
  const { width, height } = textureSize(t);
  return width > 0 && height > 0;
}

/** Mọi texture đang gắn vào vật liệu của cảnh (map, normalMap, ...), mỗi texture một lần. */
export function sceneTextures(scene: Object3D): Texture[] {
  const seen = new Set<Texture>();
  scene.traverse((o) => {
    const m = (o as { material?: Material | Material[] }).material;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      for (const v of Object.values(mat as unknown as Record<string, unknown>)) if (isTexture(v)) seen.add(v);
    }
  });
  return [...seen];
}

/**
 * Nạp trước cho GPU mọi thứ của cảnh, kể cả những bản đang ẩn (bậc chính, vừa, xa của model nhân bản chỉ hiện ở khoảng cách riêng): bật tạm mọi vật ẩn và mọi
 * InstancedMesh có 0 bản (đặt 1 bản), initTexture cho mọi texture, compile biên dịch shader, rồi vẽ một khung hình để đẩy hình học lên GPU và biên dịch cả shader
 * bóng; sau đó hoàn lại. Nhờ vậy lúc đang chơi, đổi bậc model không phải nạp hay biên dịch gì thêm (không khựng). Gọi khi màn hình tải còn che cảnh.
 */
export function warmUp(gl: WebGLRenderer, scene: Scene, camera: Camera): void {
  const saved: Saved[] = [];
  scene.traverse((o) => {
    const inst = o as InstancedMesh;
    const s: Saved = { object: o, visible: o.visible };
    if (inst.isInstancedMesh) {
      s.count = inst.count;
      if (inst.count < 1) inst.count = 1;
    }
    o.visible = true;
    saved.push(s);
  });
  try {
    for (const t of sceneTextures(scene)) {
      if (textureUsable(t)) gl.initTexture(t);
      else if (import.meta.env.DEV) console.warn('[3D] Skipped texture with no usable image (width or height 0):', t.name || t.uuid);
    }
    gl.compile(scene, camera);
    gl.render(scene, camera);
  } finally {
    for (const s of saved) {
      s.object.visible = s.visible;
      if (s.count !== undefined) (s.object as InstancedMesh).count = s.count;
    }
  }
}

/**
 * Nạp trước cảnh (xem warmUp) ngay khi mọi model đã tải xong và đã gắn vào cảnh, trước khi màn hình tải tắt. Đặt làm con CUỐI của cảnh, trong Scene3D; cần key
 * đổi khi cảnh dựng lại (ví dụ đổi mức chất lượng).
 */
export function SceneWarmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    // ?warmup=off tắt nạp trước (chỉ để so sánh khi đo hiệu năng)
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('warmup') === 'off') return;
    const t0 = performance.now();
    warmUp(gl, scene, camera);
    if (import.meta.env.DEV) (window as unknown as { __warmupMs?: number }).__warmupMs = performance.now() - t0;
  }, [gl, scene, camera]);
  return null;
}
