import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Character } from '../Character';
import { Villager } from '../Villager';
import { WalkWorld } from '../WalkWorld';
import { circle, type CircleObstacle } from '../collision';
import type { QualityLevel } from '../quality';
import type { WalkApi } from '../walkApi';
import { ColliderDebug } from './ColliderDebug';
import { MarketProps, MarketTerrain } from './MarketProcedural';
import { ModelInstances } from './ModelInstances';
import { MARKET_MODELS, PLAYER_START, WORLD_RADIUS, densityFor, generateMarket, groundHeight, type MarketLayout } from './marketLayout';

/** Người đi lại trên 4 con đường: bà cụ và chú nông dân xen kẽ (clip walk, dừng thì idle). */
const VILLAGER_MODELS = ['characters/dan-lang-ba-cu', 'characters/dan-lang-nong-dan', 'characters/dan-lang-nong-dan', 'characters/dan-lang-ba-cu'];
/** Dân làng là vật cản tròn bán kính này. */
const VILLAGER_RADIUS = 0.45;
const NO_INTERACTABLES: readonly never[] = [];

export interface MarketSceneProps {
  api: WalkApi;
  paused: boolean;
  level: QualityLevel;
  /** Đường dẫn ảnh đất (manifest) cho sân chợ và đường */
  dirtUrl: string | null;
  /** false ("Giảm chuyển động") thì nước sông không trôi */
  animate: boolean;
  /** Góc nhìn cố định để chụp ảnh hay kiểm tra (dev): "top" từ trên cao, "oblique" từ xa chếch xuống; bỏ trống thì camera bám theo người chơi */
  overview?: "top" | "oblique" | "free";
  /** Vẽ khung lưới đỏ của mọi vật cản và mặt cầu tàu (`?debug=colliders`) để soi bằng mắt */
  debugColliders?: boolean;
  /** Bố cục (mặc định `generateMarket()`); test hay công cụ có thể truyền bố cục riêng */
  layout?: MarketLayout;
}

/** Số liệu mỗi khung hình của bộ dựng hình (tam giác, draw call...), đọc ở `window.__marketStats` để kiểm tra hiệu năng. */
export interface MarketStats {
  triangles: number;
  calls: number;
  geometries: number;
  textures: number;
}

/** Ghi số liệu của khung hình trước vào window.__marketStats (chỉ gán số vào đối tượng có sẵn, không cấp phát mỗi khung). */
const stats: MarketStats = { triangles: 0, calls: 0, geometries: 0, textures: 0 };
function StatsProbe() {
  useFrame(({ gl }) => {
    const w = window as unknown as { __marketStats?: MarketStats };
    if (w.__marketStats !== stats) w.__marketStats = stats;
    const i = gl.info;
    stats.triangles = i.render.triangles;
    stats.calls = i.render.calls;
    stats.geometries = i.memory.geometries;
    stats.textures = i.memory.textures;
  });
  return null;
}

/**
 * Chợ phiên 3D (spec 04 mục 3, bản đơn giản của mốc 2): cây đa giữa sân, lều chợ, giếng, 4 cổng làng ở 4 hướng, nhà và bụi tre
 * bao quanh, đường đất, ruộng lúa, sông, bến tàu, thuyền. Người chơi (học sinh) xuất hiện ở phía nam cây đa, nhìn về cổng Làng Giấy.
 * Mọi đồ vật có vật cản (hàm va chạm của bước 6); vật cao chắn camera thì kéo camera lại gần; dân làng cũng là vật cản.
 * Nhà, lều, cây, cổng nhân bản bằng InstancedMesh (một draw call mỗi phần), có bản xa theo khoảng cách. Dùng trong <Scene3D>.
 */
export function MarketScene({ api, paused, level, dirtUrl, animate, overview, debugColliders = false, layout: given }: MarketSceneProps) {
  // Mức Thấp bớt lều và bụi tre (mật độ theo mức chất lượng)
  const layout = useMemo(() => given ?? generateMarket(undefined, densityFor(level)), [given, level]);
  // Chỉ khi chạy dev: mở bố cục ra window để kiểm tra bằng trình duyệt.
  if (import.meta.env.DEV) (window as unknown as { __marketLayout?: MarketLayout }).__marketLayout = layout;
  const byModel = useMemo(() => MARKET_MODELS.map((id) => ({ id, items: layout.placements.filter((p) => p.model === id) })), [layout]);
  // Dân làng: vật cản tròn đi theo từng người (mỗi khung hình Villager ghi vị trí vào đây).
  const villagers = useMemo<CircleObstacle[]>(() => layout.villagerPaths.map((p) => circle(p[0][0], p[0][1], VILLAGER_RADIUS)), [layout]);
  const obstacles = useMemo(() => [...layout.obstacles, ...villagers], [layout, villagers]);

  return (
    <WalkWorld
      api={api}
      paused={paused}
      obstacles={obstacles}
      boundsRadius={WORLD_RADIUS}
      interactables={NO_INTERACTABLES}
      cameraBlockers={layout.blockers}
      groundHeight={groundHeight}
      onNearestChange={noop}
      groundUrl={null}
      showGround={false}
      start={PLAYER_START}
      freeCamera={!!overview}
    >
      {overview && <OverviewCamera kind={overview} />}
      <MarketTerrain layout={layout} dirtUrl={dirtUrl} animate={animate} />
      {byModel.map(({ id, items }) => (items.length > 0 ? <ModelInstances key={id} id={id} items={items} level={level} /> : null))}
      <MarketProps layout={layout} />
      {layout.villagerPaths.map((path, i) => (
        <Villager key={i} id={VILLAGER_MODELS[i % VILLAGER_MODELS.length]} waypoints={path} seed={101 + i * 17} start={i % path.length} collider={villagers[i]} />
      ))}
      <Character id="characters/lai-buon" position={[layout.merchant.x, 0, layout.merchant.z]} rotation={[0, layout.merchant.yaw, 0]} mood="idle" seed={9} />
      {debugColliders && <ColliderDebug colliders={layout.colliders} dynamic={villagers} />}
      <StatsProbe />
    </WalkWorld>
  );
}

/** Camera cố định nhìn toàn cảnh (chỉ để chụp ảnh và kiểm tra). */
function OverviewCamera({ kind }: { kind: "top" | "oblique" | "free" }) {
  const camera = useThree((st) => st.camera);
  // "free": nơi kiểm tra (dev) đặt camera bằng window.__freeCam = { x, y, z, tx, ty, tz } để chụp cận cảnh một đồ vật
  useFrame(() => {
    const f = (window as unknown as { __freeCam?: { x: number; y: number; z: number; tx: number; ty: number; tz: number } }).__freeCam;
    if (kind === "free" && f) {
      camera.position.set(f.x, f.y, f.z);
      camera.lookAt(f.tx, f.ty, f.tz);
    }
  });
  useEffect(() => {
    if (kind === "free") return;
    if (kind === "top") camera.position.set(0, 135, -52);
    else camera.position.set(-70, 48, -78);
    camera.lookAt(0, 0, 0);
  }, [camera, kind]);
  return null;
}

function noop() {
  /* chợ chưa có vật tương tác (bước 8) */
}
