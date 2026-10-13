import { Detailed } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { AnimationClip, Object3D } from 'three';
import { getManifest, loadManifest } from '../assets/store';
import { hasAsset } from '../assets/manifest';
import { useQualityLevel } from './QualityContext';
import { isUsableMid, lodId, midId, modelPath } from './modelIds';
import { cloneModel, disposeClone, readModel, releaseModel, retainModel } from './modelLoader';
import { lodDistance, lodTiers } from './quality';
import { useShadowFlags } from './useShadowFlags';

/** Thuộc tính của <group>, bỏ `id` (số định danh của Object3D) vì <Model id> dùng `id` làm đường dẫn model. */
type GroupProps = Omit<ThreeElements['group'], 'id'>;

export interface UsedModel {
  /** Bản nhân bản riêng cho chỗ dùng này (đã đủ xương nếu model có xương) */
  scene: Object3D;
  animations: AnimationClip[];
  /** true nếu thiếu file hoặc tải lỗi và `scene` là hình thay thế */
  placeholder: boolean;
}

/**
 * Model theo id, ví dụ "characters/bac-an", "env/cay-da" (đường dẫn trong models/, bản chính; bản xa là "<id>-xa").
 * Dùng trong <Canvas>, cần Suspense phía trên (<Scene3D> đã có): chưa tải xong thì component tạm dừng.
 * Mỗi lần gọi trả về một bản nhân bản mới (SkeletonUtils.clone), hình học và vật liệu dùng chung.
 */
export function useModel(id: string): UsedModel {
  const data = readModel(id);
  const scene = useMemo(() => cloneModel(data), [data]);
  useEffect(() => {
    retainModel(id);
    return () => {
      releaseModel(id);
      disposeClone(scene);
    };
  }, [id, scene]);
  return { scene, animations: data.animations, placeholder: data.placeholder };
}

/** Đọc manifest trong render: chưa tải xong thì tạm dừng (Suspense). */
function useManifestReady() {
  const manifest = getManifest();
  if (!manifest) throw loadManifest();
  return manifest;
}

interface ShadowProps {
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function Single({ id, castShadow = false, receiveShadow = false, ...group }: { id: string } & ShadowProps & GroupProps) {
  const { scene } = useModel(id);
  const level = useQualityLevel();
  useShadowFlags(scene, castShadow && level !== 'low', receiveShadow && level !== 'low');
  return (
    <group {...group}>
      <primitive object={scene} />
    </group>
  );
}

function WithLod({ id, castShadow = false, receiveShadow = false, ...group }: { id: string } & ShadowProps & GroupProps) {
  const near = useModel(id);
  const far = useModel(lodId(id));
  const level = useQualityLevel();
  const shadowMaps = level !== 'low';
  useShadowFlags(near.scene, castShadow && shadowMaps, receiveShadow && shadowMaps);
  useShadowFlags(far.scene, false, receiveShadow && shadowMaps);
  return (
    <group {...group}>
      <Detailed distances={[0, lodDistance(level)]} hysteresis={0.05}>
        <primitive object={near.scene} />
        <primitive object={far.scene} />
      </Detailed>
    </group>
  );
}

/** Model có 3 bậc (chính, vừa, xa): bản vừa chỉ khi manifest có và nhẹ hơn hẳn bản chính. */
function WithLod3({ id, castShadow = false, receiveShadow = false, ...group }: { id: string } & ShadowProps & GroupProps) {
  const near = useModel(id);
  const mid = useModel(midId(id));
  const far = useModel(lodId(id));
  const level = useQualityLevel();
  const shadowMaps = level !== 'low';
  useShadowFlags(near.scene, castShadow && shadowMaps, receiveShadow && shadowMaps);
  useShadowFlags(mid.scene, false, receiveShadow && shadowMaps);
  useShadowFlags(far.scene, false, receiveShadow && shadowMaps);
  const tiers = lodTiers(level);
  return (
    <group {...group}>
      <Detailed distances={[0, tiers.mid, tiers.far]} hysteresis={0.05}>
        <primitive object={near.scene} />
        <primitive object={mid.scene} />
        <primitive object={far.scene} />
      </Detailed>
    </group>
  );
}

export type ModelLod = 'auto' | 'near' | 'far';

export interface ModelProps extends GroupProps, ShadowProps {
  /** Đường dẫn trong models/, ví dụ "characters/ti", "env/cong-lang-giay" */
  id: string;
  /**
   * "auto" (mặc định): tự đổi bậc theo khoảng cách. Có bản vừa thì 3 bậc: chính, vừa, xa (xem `lodTiers`: bản xa từ 12 / 30 / 40 ở Thấp / Vừa / Cao); không thì 2 bậc, bản xa khi camera xa hơn `lodDistance` (Thấp 12, Vừa 20, Cao 30).
   * "near": luôn bản chính. "far": luôn bản xa. Model không có bản xa thì luôn dùng bản chính.
   */
  lod?: ModelLod;
}

/**
 * Model 3D đặt vào cảnh. Tự chọn bản xa theo khoảng cách (drei Detailed). Thiếu file thì hiện hình thay thế.
 * Dùng trong <Scene3D>.
 */
export function Model({ id, lod = 'auto', ...rest }: ModelProps) {
  const manifest = useManifestReady();
  const hasFar = hasAsset(manifest, modelPath(lodId(id)));
  if (!hasFar || lod === 'near') return <Single id={id} {...rest} />;
  if (lod === 'far') return <Single id={lodId(id)} {...rest} />;
  if (isUsableMid(manifest[modelPath(midId(id))]?.tris)) return <WithLod3 id={id} {...rest} />;
  return <WithLod id={id} {...rest} />;
}

