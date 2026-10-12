import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, Color, Float32BufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, SphereGeometry, type Group } from 'three';
import { SKY_HORIZON, SKY_RADIUS, SKY_ZENITH, createCloudLayout, skyMix } from './skyLayout';

/** Khối cầu trời: màu đỉnh (vertex color) chuyển từ #E8F6FF ở chân trời lên #8FCBFF. Dựng một lần. */
function createSkyGeometry(): SphereGeometry {
  const geo = new SphereGeometry(SKY_RADIUS, 24, 16);
  const pos = geo.getAttribute('position');
  const horizon = new Color(SKY_HORIZON);
  const zenith = new Color(SKY_ZENITH);
  const c = new Color();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    c.copy(horizon).lerp(zenith, skyMix(pos.getY(i) / SKY_RADIUS));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geo;
}

export interface SkyProps {
  /** false thì mây đứng yên ("Giảm chuyển động") */
  animate?: boolean;
}

/**
 * Trời và mây tròn do code dựng (spec 03 mục 2). Khối cầu đi theo camera nên không bao giờ "chạm tới" được.
 * Không cấp phát trong useFrame; rời cảnh thì dispose.
 */
export function Sky({ animate = true }: SkyProps) {
  const root = useRef<Group>(null);
  const clouds = useRef<Group>(null);
  const puffs = useRef<InstancedMesh>(null);

  const skyGeo = useMemo(createSkyGeometry, []);
  const skyMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false, toneMapped: false }), []);
  const layout = useMemo(() => createCloudLayout(20240915), []);
  const puffGeo = useMemo(() => new SphereGeometry(1, 10, 8), []);
  const puffMat = useMemo(() => new MeshBasicMaterial({ color: '#FFFFFF', fog: false, toneMapped: false }), []);

  // Đặt vị trí từng cục mây một lần (các đối tượng tạm tạo ở đây, không ở useFrame).
  useLayoutEffect(() => {
    const mesh = puffs.current;
    if (!mesh) return;
    const tmp = new Object3D();
    const m = new Matrix4();
    layout.forEach((p, i) => {
      tmp.position.set(p.x, p.y, p.z);
      tmp.scale.set(p.r * 1.25, p.r * 0.8, p.r);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, m.copy(tmp.matrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [layout]);

  useEffect(
    () => () => {
      skyGeo.dispose();
      skyMat.dispose();
      puffGeo.dispose();
      puffMat.dispose();
    },
    [skyGeo, skyMat, puffGeo, puffMat],
  );

  useFrame((state, delta) => {
    root.current?.position.copy(state.camera.position);
    if (animate && clouds.current) clouds.current.rotation.y += delta * 0.004;
  });

  return (
    <group ref={root} renderOrder={-10}>
      <mesh geometry={skyGeo} material={skyMat} frustumCulled={false} renderOrder={-2} />
      <group ref={clouds}>
        <instancedMesh ref={puffs} args={[puffGeo, puffMat, layout.length]} frustumCulled={false} renderOrder={-1} />
      </group>
    </group>
  );
}
