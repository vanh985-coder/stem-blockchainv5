import { useMemo } from 'react';
import { Fence, Hills, useDispose, useImageTexture } from '../cho/MarketProcedural';
import { createEdgeAlphaTexture, createGrassTexture, createPaddyTexture } from '../cho/marketTextures';
import type { VillageLayout } from './villageLayout';

/** Nhân màu cho ảnh đất (ảnh gốc rất vàng), như ở chợ. */
const DIRT_TINT = '#DCC9A2';
const ROAD_Y = 0.022;
const YARD_Y = 0.03;

/**
 * Mặt đất của làng (do code dựng, dùng chung mọi làng): ruộng lúa phủ rộng ra chân trời, cỏ làng, sân đất nện (mép mờ), đường đất, hàng rào tre quanh khu và dãy đồi xa.
 * Rời cảnh thì giải phóng texture.
 */
export function VillageTerrain({ layout, dirtUrl }: { layout: VillageLayout; dirtUrl: string | null }) {
  const dirt = useImageTexture(dirtUrl, [8, 8]);
  const roadDirt = useImageTexture(dirtUrl, [2, 12]);
  const tex = useMemo(
    () => ({
      paddy: createPaddyTexture([800 / 32, 800 / 32]),
      grass: createGrassTexture([(layout.radius + 8) / 5, (layout.radius + 8) / 5]),
      lateral: createEdgeAlphaTexture('lateral'),
      radial: createEdgeAlphaTexture('radial'),
    }),
    [layout.radius],
  );
  useDispose(useMemo(() => Object.values(tex), [tex]));
  const dirtMap = dirt ?? undefined;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial map={tex.paddy} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[layout.radius + 3, 72]} />
        <meshStandardMaterial map={tex.grass} roughness={1} />
      </mesh>
      {layout.yards.map((y, i) => (
        <mesh key={`y${i}`} position={[y.x, YARD_Y + i * 0.001, y.z]} rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[y.r + 1.5, 48]} />
          <meshStandardMaterial key={dirt ? 'a' : 'b'} map={dirtMap} color={dirt ? DIRT_TINT : '#C9A064'} alphaMap={tex.radial} transparent depthWrite={false} roughness={1} />
        </mesh>
      ))}
      {layout.roads.map((r, i) => {
        const len = Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
        const yaw = Math.atan2(r.x1 - r.x0, r.z1 - r.z0);
        return (
          <group key={`r${i}`} position={[(r.x0 + r.x1) / 2, ROAD_Y, (r.z0 + r.z1) / 2]} rotation-y={yaw}>
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[r.width, len]} />
              <meshStandardMaterial key={roadDirt ? 'a' : 'b'} map={roadDirt ?? undefined} color={roadDirt ? DIRT_TINT : '#C9A064'} alphaMap={tex.lateral} transparent depthWrite={false} roughness={1} />
            </mesh>
          </group>
        );
      })}
      {layout.fenceLayout && <Fence fence={layout.fenceLayout} />}
      <Hills />
    </group>
  );
}
