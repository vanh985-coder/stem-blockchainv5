import type { ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { CanvasTexture, CircleGeometry, MeshBasicMaterial } from 'three';
import { useQualityLevel } from './QualityContext';

/** Texture vệt bóng: hình tròn đen mờ dần ra rìa. Dựng một lần cho mỗi vệt (nhỏ, 64×64). */
function createBlobTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
}

export interface BlobShadowProps extends Omit<ThreeElements['mesh'], 'geometry' | 'material'> {
  /** Bán kính vệt bóng (đơn vị) */
  radius?: number;
}

/**
 * Vệt bóng tròn dưới chân, dùng ở mức Thấp thay cho bản đồ bóng (spec 03 mục 2). Mức Vừa và Cao thì không vẽ gì
 * (đã có bóng mềm). Đặt làm con của nhân vật hoặc vật, ngay trên mặt đất.
 */
export function BlobShadow({ radius = 0.5, ...mesh }: BlobShadowProps) {
  const level = useQualityLevel();
  const enabled = level === 'low';
  const geo = useMemo(() => new CircleGeometry(1, 20), []);
  const mat = useMemo(() => {
    if (!enabled) return null;
    return new MeshBasicMaterial({ map: createBlobTexture(), transparent: true, depthWrite: false, toneMapped: false, fog: false });
  }, [enabled]);
  useEffect(
    () => () => {
      geo.dispose();
      mat?.map?.dispose();
      mat?.dispose();
    },
    [geo, mat],
  );
  if (!mat) return null;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[radius, radius, radius]} renderOrder={1} {...mesh} geometry={geo} material={mat} />;
}
