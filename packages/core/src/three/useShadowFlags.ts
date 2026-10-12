import { useEffect } from 'react';
import type { Mesh, Object3D } from 'three';

/** Bật hoặc tắt đổ và nhận bóng cho mọi mesh của một đối tượng. */
export function useShadowFlags(scene: Object3D, cast: boolean, receive: boolean): void {
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
    });
  }, [scene, cast, receive]);
}
