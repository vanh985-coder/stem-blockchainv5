import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Character } from '../Character';
import { SceneWarmup } from '../SceneWarmup';
import { StatsProbe } from '../StatsProbe';
import { Villager } from '../Villager';
import { WalkWorld } from '../WalkWorld';
import { circle, type CircleObstacle, type Obstacle } from '../collision';
import type { Interactable } from '../interaction';
import type { QualityLevel } from '../quality';
import type { WalkApi } from '../walkApi';
import { ColliderDebug } from './ColliderDebug';
import { gateBarrierObstacle } from './footprints';
import { GateBarriers } from './GateBarrier';
import { GuideArrow } from './GuideArrow';
import { MarketProps, MarketTerrain } from './MarketProcedural';
import { ModelInstances } from './ModelInstances';
import { GATES, MARKET_MODELS, PLAYER_START, WORLD_RADIUS, densityFor, generateMarket, groundHeight, type GateId, type MarketLayout } from './marketLayout';
import { biSlot, villagerSlot } from './marketTargets';

/** Người đi lại trên 4 con đường: bà cụ và chú nông dân xen kẽ (clip walk, dừng thì idle). */
const VILLAGER_MODELS = ['characters/dan-lang-ba-cu', 'characters/dan-lang-nong-dan', 'characters/dan-lang-nong-dan', 'characters/dan-lang-ba-cu'];
/** Dân làng là vật cản tròn bán kính này. */
const VILLAGER_RADIUS = 0.45;

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
  /** Cổng nào đang mở (theo tiến độ); cổng đóng có thanh then gỗ và dây đỏ và chắn lối đi */
  gateOpen: Readonly<Record<GateId, boolean>>;
  /**
   * Vật tương tác (do `createInteractables()` tạo): cổng, dân làng, Bi. Dân làng và Bi ghi vị trí mới vào các đối tượng này mỗi khung hình
   * (đúng thứ tự: cổng, dân làng, Bi).
   */
  interactables: readonly Interactable[];
  /** Báo chỉ số vật tương tác gần nhất (−1 nếu không có) */
  onNearestChange: (index: number) => void;
  /** Cổng cần tới theo nhiệm vụ (mũi tên trên đầu nhân vật chỉ về đó); null thì không có mũi tên */
  targetGate: GateId | null;
  /** Dân làng thứ mấy đang được nói chuyện (đứng yên, quay mặt về người chơi); null nếu không có */
  talkingVillager: number | null;
  /** Chỗ và hướng xuất hiện (mặc định `PLAYER_START`, nhìn về +Z); từ làng về thì ngay trước cổng làng đó (`marketSpawn`) */
  spawn?: { x: number; z: number; yaw: number };
}

/**
 * Chợ phiên 3D (spec 04 mục 3, bản đơn giản của mốc 2): cây đa giữa sân, lều chợ, giếng, 4 cổng làng ở 4 hướng, nhà và bụi tre
 * bao quanh, đường đất, ruộng lúa, sông, bến tàu, thuyền. Người chơi (học sinh) xuất hiện ở phía nam cây đa, nhìn về cổng Làng Giấy.
 * Mọi đồ vật có vật cản (hàm va chạm của bước 6); vật cao chắn camera thì kéo camera lại gần; dân làng cũng là vật cản.
 * Nhà, lều, cây, cổng nhân bản bằng InstancedMesh (một draw call mỗi phần), có bản xa theo khoảng cách. Dùng trong <Scene3D>.
 */
export function MarketScene({ api, paused, level, dirtUrl, animate, overview, debugColliders = false, layout: given, gateOpen, interactables, onNearestChange, targetGate, talkingVillager, spawn }: MarketSceneProps) {
  // Mức Thấp bớt lều và bụi tre (mật độ theo mức chất lượng)
  const layout = useMemo(() => given ?? generateMarket(undefined, densityFor(level)), [given, level]);
  // Chỉ khi chạy dev: mở bố cục ra window để kiểm tra bằng trình duyệt.
  if (import.meta.env.DEV) (window as unknown as { __marketLayout?: MarketLayout }).__marketLayout = layout;
  const byModel = useMemo(() => MARKET_MODELS.map((id) => ({ id, items: layout.placements.filter((p) => p.model === id) })), [layout]);
  // Dân làng: vật cản tròn đi theo từng người (mỗi khung hình Villager ghi vị trí vào đây).
  const villagers = useMemo<CircleObstacle[]>(() => layout.villagerPaths.map((p) => circle(p[0][0], p[0][1], VILLAGER_RADIUS)), [layout]);
  // Cổng đóng chắn kín lối đi (thanh then gỗ); cổng mở thì không có vật chắn này.
  const closedGates = useMemo(() => GATES.filter((g) => !gateOpen[g.id]), [gateOpen]);
  const barriers = useMemo<Obstacle[]>(() => closedGates.flatMap((g) => gateBarrierObstacle(g.model, g.x, g.z, g.yaw) ?? []), [closedGates]);
  const obstacles = useMemo(() => [...layout.obstacles, ...barriers, ...villagers], [layout, barriers, villagers]);
  // Chỉ khi chạy dev: mở vật cản ra window để kiểm tra bằng trình duyệt.
  if (import.meta.env.DEV) Object.assign(window, { __marketObstacles: obstacles, __marketBarriers: barriers });
  const targetPos = useMemo(() => {
    const g = GATES.find((q) => q.id === targetGate);
    return g ? { x: g.x, z: g.z } : null;
  }, [targetGate]);

  return (
    <WalkWorld
      api={api}
      paused={paused}
      obstacles={obstacles}
      boundsRadius={WORLD_RADIUS}
      interactables={interactables}
      biTrack={interactables[biSlot()]}
      cameraBlockers={layout.blockers}
      groundHeight={groundHeight}
      onNearestChange={onNearestChange}
      groundUrl={null}
      showGround={false}
      start={spawn ? [spawn.x, spawn.z] : PLAYER_START}
      startYaw={spawn?.yaw ?? 0}
      freeCamera={!!overview}
    >
      {overview && <OverviewCamera kind={overview} />}
      <MarketTerrain layout={layout} dirtUrl={dirtUrl} animate={animate} />
      {byModel.map(({ id, items }) => (items.length > 0 ? <ModelInstances key={id} id={id} items={items} level={level} /> : null))}
      <MarketProps layout={layout} />
      {layout.villagerPaths.map((path, i) => (
        <Villager key={i} id={VILLAGER_MODELS[i % VILLAGER_MODELS.length]} waypoints={path} seed={101 + i * 17} start={i % path.length} collider={villagers[i]} track={interactables[villagerSlot(i)]} hold={talkingVillager === i} />
      ))}
      <Character id="characters/lai-buon" position={[layout.merchant.x, 0, layout.merchant.z]} rotation={[0, layout.merchant.yaw, 0]} mood="idle" seed={9} />
      <GateBarriers gates={closedGates} />
      <GuideArrow target={targetPos} animate={animate} />
      {debugColliders && <ColliderDebug colliders={layout.colliders} dynamic={villagers} />}
      <StatsProbe />
      {/* con cuối: nạp trước mọi bậc model lên GPU lúc còn màn hình tải (đổi mức chất lượng thì dựng lại) */}
      <SceneWarmup key={level} />
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

