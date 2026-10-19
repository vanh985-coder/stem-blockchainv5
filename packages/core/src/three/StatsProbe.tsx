import { useFrame } from '@react-three/fiber';

/** Số liệu mỗi khung hình của bộ dựng hình (tam giác, draw call...), đọc ở `window.__marketStats` để kiểm tra hiệu năng. */
export interface MarketStats {
  triangles: number;
  calls: number;
  geometries: number;
  textures: number;
}

/** Ghi số liệu của khung hình trước vào window.__marketStats (chỉ gán số vào đối tượng có sẵn, không cấp phát mỗi khung). */
const stats: MarketStats = { triangles: 0, calls: 0, geometries: 0, textures: 0 };
export function StatsProbe() {
  useFrame(({ gl, scene, camera }) => {
    const w = window as unknown as { __marketStats?: MarketStats; __r3f?: unknown };
    if (w.__marketStats !== stats) w.__marketStats = stats;
    if (import.meta.env.DEV && !w.__r3f) w.__r3f = { scene, camera, gl }; // chỉ khi chạy dev: cho công cụ đo tam giác theo loại vật
    const i = gl.info;
    stats.triangles = i.render.triangles;
    stats.calls = i.render.calls;
    stats.geometries = i.memory.geometries;
    stats.textures = i.memory.textures;
  });
  return null;
}
