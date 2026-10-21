import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Group } from 'three';
import { fmt } from '../../content/characters';
import { levelById } from '../../content/levels';
import type { LevelState } from '../../progress/unlock';
import type { VillageId } from '../../village';
import { Character } from '../Character';
import { SceneWarmup } from '../SceneWarmup';
import { StatsProbe } from '../StatsProbe';
import { Villager } from '../Villager';
import { WalkWorld, usePlayerState } from '../WalkWorld';
import { circle, type CircleObstacle, type Obstacle } from '../collision';
import type { Interactable } from '../interaction';
import type { QualityLevel } from '../quality';
import type { WalkApi } from '../walkApi';
import { ColliderDebug } from '../cho/ColliderDebug';
import { gateBarrierObstacle } from '../cho/footprints';
import { GateBarriers } from '../cho/GateBarrier';
import { MarketProps } from '../cho/MarketProcedural';
import { ModelInstances } from '../cho/ModelInstances';
import { MARKET_MODELS, PLAYER_START, type GateId, type Placement } from '../cho/marketLayout';
import { GroundArrow } from './GroundArrow';
import { Signposts } from './Signposts';
import { VillageFar } from './VillageFar';
import { VillageZone } from './VillageZone';
import { WorldTerrain } from './WorldTerrain';
import { WorldTracker, type LoadedZones, type PrewarmZones } from './WorldTracker';
import { ZonePrewarm } from './ZonePrewarm';
import { WORLD_BOUNDS } from './worldFrames';
import { worldGroundHeight, type WorldLayout } from './worldLayout';
import { PROBE } from '../../lib/dev';
import { VILLAGER_CULL, withinCullDistance } from '../cullDistance';

/** Người đi lại trên các con đường chợ: bà cụ và chú nông dân xen kẽ (clip walk, dừng thì idle). */
const VILLAGER_MODELS = ['characters/dan-lang-ba-cu', 'characters/dan-lang-nong-dan', 'characters/dan-lang-nong-dan', 'characters/dan-lang-ba-cu'];
const VILLAGER_RADIUS = 0.45;

export interface WorldSceneProps {
  world: WorldLayout;
  api: WalkApi;
  paused: boolean;
  level: QualityLevel;
  /** Đường dẫn ảnh đất (manifest); null thì dùng màu thay thế */
  dirtUrl: string | null;
  /** false ("Giảm chuyển động") thì nước sông không trôi, mũi tên không nhấp nhô */
  animate: boolean;
  /** Góc nhìn cố định để chụp ảnh hay kiểm tra (dev): "top" từ trên cao toàn thế giới, "oblique" chếch xuống, "free" do window.__freeCam đặt; bỏ trống thì camera bám theo người chơi */
  overview?: 'top' | 'oblique' | 'free';
  debugColliders?: boolean;
  /** Cổng nào đang mở (theo tiến độ); cổng đóng có then gỗ và dây đỏ và chắn lối đi */
  gateOpen: Readonly<Record<GateId, boolean>>;
  /** Danh sách vật tương tác đã ghép (xem `composeTargets`) */
  interactables: readonly Interactable[];
  /** Đối tượng sống ghi vị trí Bi và 4 dân làng mỗi khung hình (cùng đối tượng đã ghép vào `interactables`) */
  biTrack: { x: number; z: number };
  villagerTracks: readonly { x: number; z: number }[];
  onNearestChange: (index: number) => void;
  talkingVillager: number | null;
  /** Người dẫn của làng nào đang được nói chuyện (đứng yên quay mặt về người chơi) */
  talkingGuide: VillageId | null;
  talkAt: readonly [number, number, number];
  /** Chỗ và hướng xuất hiện (mặc định chỗ xuất hiện ở chợ, nhìn về +Z) */
  spawn?: { x: number; z: number; yaw: number };
  /** Cổng đang chơi hoạt cảnh mở (then gỗ và dây đỏ rơi); phải là cổng đang đóng (`gateOpen` false) */
  fallingGate?: GateId | null;
  onGateFallen?: () => void;
  /** Nút đích của mũi tên dưới chân (xem `targetNodeId`), null thì không có mũi tên */
  arrowTarget: string | null;
  /** Làng của nhiệm vụ hiện tại (luôn chuẩn bị sẵn); null nếu không có */
  mission: VillageId | null;
  /** Vùng làng nào đã tải (do `WorldTracker` báo, nơi dùng giữ trạng thái) */
  loaded: LoadedZones;
  /** Trạng thái các màn (để vẽ biển gỗ) */
  levelStates: Readonly<Record<number, LevelState | undefined>>;
  onZones: (loaded: LoadedZones) => void;
  onInside: (village: VillageId | null) => void;
  onNearGate: (gate: GateId | null) => void;
  /** Vùng làng đã dựng xong (từng phần dựng dần) */
  onZoneReady: (village: VillageId) => void;
}

/**
 * Thế giới mở 3D ở /cho (mốc 2, bước W1): chợ ở giữa, 4 con đường dài ra cổng 4 làng (đường sang Làng Bạc qua cầu), biển chỉ đường ở lối ra chợ, mũi tên dưới chân chỉ theo đường.
 * Chợ và đường luôn có; mỗi làng là một vùng tải khi người chơi cách rìa làng dưới 60 và dọn khi xa hơn 90 (có độ trễ, dựng dần qua nhiều khung hình), từ xa vẫn thấy làng bằng bản xa nhẹ.
 * Dùng lại WalkWorld, va chạm, 3 bậc model và nạp trước của chợ. Đặt trong <Scene3D>.
 */
export function WorldScene({
  world,
  api,
  paused,
  level,
  dirtUrl,
  animate,
  overview,
  debugColliders = false,
  gateOpen,
  interactables,
  biTrack,
  villagerTracks,
  onNearestChange,
  talkingVillager,
  talkingGuide,
  talkAt,
  spawn,
  fallingGate = null,
  onGateFallen,
  arrowTarget,
  loaded,
  levelStates,
  onZones,
  onInside,
  onNearGate,
  onZoneReady,
  mission,
}: WorldSceneProps) {
  if (PROBE) Object.assign(window, { __world: world, __loadedZones: loaded });
  const market = world.market;
  // làng nào đang được chuẩn bị sẵn (tải sẵn model, nướng hình học, làm ấm texture khi còn xa): xem WorldTracker và ZonePrewarm
  const [prewarm, setPrewarm] = useState<PrewarmZones>({ 'lang-giay': false, 'lang-det': false, 'lang-khac-dau': false, 'lang-bac': false });
  // làng nào đã chuẩn bị xong: vùng làng chỉ dựng khi chuẩn bị xong (hoặc chờ quá ZONE_PREWARM_WAIT giây)
  const [prewarmed, setPrewarmed] = useState<ReadonlySet<VillageId>>(new Set());
  const onPrewarmDone = useCallback((id: VillageId, done: boolean) => setPrewarmed((prev) => (prev.has(id) === done ? prev : done ? new Set(prev).add(id) : new Set([...prev].filter((x) => x !== id)))), []);
  const byModel = useMemo(() => MARKET_MODELS.map((id) => ({ id, items: market.placements.filter((p) => p.model === id) })), [market]);
  const gateItems = useMemo(() => world.gates.map((g) => ({ id: g.model, village: world.villages.find((v) => v.gate.id === g.id)!.id, items: [{ model: g.model, x: g.x, z: g.z, yaw: g.yaw, scale: 1, tint: [1, 1, 1] as const } satisfies Placement] })), [world]);
  // dân làng: vật cản tròn đi theo từng người (mỗi khung hình Villager ghi vị trí vào đây)
  const villagers = useMemo<CircleObstacle[]>(() => market.villagerPaths.map((p) => circle(p[0][0], p[0][1], VILLAGER_RADIUS)), [market]);
  const closedGates = useMemo(() => world.gates.filter((g) => !gateOpen[g.id]), [world, gateOpen]);
  const barriers = useMemo<Obstacle[]>(() => closedGates.flatMap((g) => gateBarrierObstacle(g.model, g.x, g.z, g.yaw) ?? []), [closedGates]);
  const loadedVillages = useMemo(() => world.villages.filter((v) => loaded[v.id]), [world, loaded]);
  // dân làng trong từng làng: vật cản tròn đi theo (tạo một lần mỗi làng; chỉ tính khi vùng đã tải)
  const zoneVillagers = useMemo(() => new Map(world.villages.map((v) => [v.id, (v.layout.villagers ?? []).map((p) => circle(p[0][0], p[0][1], VILLAGER_RADIUS))])), [world]);
  const obstacles = useMemo(
    () => [...world.baseObstacles, ...loadedVillages.flatMap((v) => v.layout.obstacles), ...barriers, ...villagers, ...loadedVillages.flatMap((v) => zoneVillagers.get(v.id) ?? [])],
    [world, loadedVillages, barriers, villagers, zoneVillagers],
  );
  const blockers = useMemo(() => [...world.baseBlockers, ...loadedVillages.flatMap((v) => v.layout.blockers)], [world, loadedVillages]);
  if (PROBE) Object.assign(window, { __worldObstacles: obstacles, __worldBarriers: barriers });
  const dynamicColliders = useMemo(() => [...villagers, ...loadedVillages.flatMap((v) => zoneVillagers.get(v.id) ?? [])], [villagers, loadedVillages, zoneVillagers]);
  const colliders = useMemo(() => [...world.baseColliders, ...loadedVillages.flatMap((v) => v.layout.colliders)], [world, loadedVillages]);
  const start: readonly [number, number] = spawn ? [spawn.x, spawn.z] : PLAYER_START;

  return (
    <WalkWorld
      api={api}
      paused={paused}
      obstacles={obstacles}
      boundsRadius={WORLD_BOUNDS}
      interactables={interactables}
      biTrack={biTrack}
      cameraBlockers={blockers}
      groundHeight={worldGroundHeight}
      onNearestChange={onNearestChange}
      groundUrl={null}
      showGround={false}
      start={start}
      startYaw={spawn?.yaw ?? 0}
      freeCamera={!!overview}
    >
      {overview && <OverviewCamera kind={overview} />}
      <WorldTerrain world={world} dirtUrl={dirtUrl} animate={animate} />
      {byModel.map(({ id, items }) => (items.length > 0 ? <ModelInstances key={id} id={id} items={items} level={level} /> : null))}
      {gateItems.map(({ id, village, items }) => {
        // cổng của làng chưa chuẩn bị xong chỉ vẽ bản xa: không tải bản chính và bản vừa (5 MB cho 3 cổng) cho tới khi người chơi tới gần
        const full = prewarmed.has(village) || loaded[village]; // chỉ khi đã chuẩn bị xong (hình học bản chính và bản vừa đã nướng sẵn): dựng lúc đó mới không khựng
        return <ModelInstances key={`${id}|${full ? 'f' : 'n'}`} id={id} items={items} level={level} farOnly={!full} />;
      })}
      <MarketProps layout={market} />
      <VillageFar villages={world.villages} level={level} loaded={loaded} />
      {world.villages.map((v) => (prewarm[v.id] ? <ZonePrewarm key={`${v.id}|${level}`} village={v} level={level} onDone={onPrewarmDone} /> : null))}
      {loadedVillages.map((v) => (
        <VillageZone
          key={v.id}
          village={v}
          level={level}
          labels={boardLabels(v.layout.boards.map((b) => b.level))}
          icons={Object.fromEntries(v.layout.boards.map((b) => [b.level, b.icon]))}
          states={levelStates}
          guideTalking={talkingGuide === v.id}
          talkAt={talkAt}
          villagerColliders={zoneVillagers.get(v.id) ?? []}
          prewarmed={prewarmed.has(v.id)}
          onReady={onZoneReady}
        />
      ))}
      {market.villagerPaths.map((path, i) => (
        <Villager key={i} id={VILLAGER_MODELS[i % VILLAGER_MODELS.length]} waypoints={path} seed={101 + i * 17} start={i % path.length} collider={villagers[i]} track={villagerTracks[i]} hold={talkingVillager === i} cullDistance={VILLAGER_CULL[level]} />
      ))}
      <CullGroup x={market.merchant.x} z={market.merchant.z} distance={VILLAGER_CULL[level] + 6}>
        <Suspense fallback={null}>
          <Character id="characters/lai-buon" position={[market.merchant.x, 0, market.merchant.z]} rotation={[0, market.merchant.yaw, 0]} mood="idle" seed={9} />
        </Suspense>
      </CullGroup>
      <GateBarriers gates={closedGates} falling={fallingGate} onFallen={onGateFallen} animate={animate} />
      <Signposts signposts={world.signposts} />
      <GroundArrow graph={world.graph} target={arrowTarget} animate={animate} />
      <WorldTracker villages={world.villages} mission={mission} onZones={onZones} onPrewarm={setPrewarm} onInside={onInside} onNearGate={onNearGate} />
      {debugColliders && <ColliderDebug colliders={colliders} dynamic={dynamicColliders} />}
      <StatsProbe />
      {/* con cuối: nạp trước mọi bậc model của chợ và cổng lên GPU lúc còn màn hình tải (đổi mức chất lượng thì dựng lại) */}
      <SceneWarmup key={level} />
    </WalkWorld>
  );
}

/** Ẩn nhóm khi người chơi cách (x, z) xa hơn `distance` (người đứng yên như lái buôn: không vẽ khi ở xa). */
function CullGroup({ x, z, distance, children }: { x: number; z: number; distance: number; children: ReactNode }) {
  const player = usePlayerState();
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current && player) ref.current.visible = withinCullDistance(x, z, player.x, player.z, distance);
  });
  return <group ref={ref}>{children}</group>;
}

/** Chữ trên biển các màn (đã qua fmt). */
function boardLabels(levels: readonly number[]): Record<number, string> {
  return Object.fromEntries(levels.map((l) => [l, fmt(levelById(l)?.bien ?? '')]));
}

/** Camera cố định nhìn toàn cảnh (chỉ để chụp ảnh và kiểm tra). */
function OverviewCamera({ kind }: { kind: 'top' | 'oblique' | 'free' }) {
  const camera = useThree((st) => st.camera);
  // "free": nơi kiểm tra (dev) đặt camera bằng window.__freeCam = { x, y, z, tx, ty, tz } để chụp cận cảnh một đồ vật
  useFrame(() => {
    const f = (window as unknown as { __freeCam?: { x: number; y: number; z: number; tx: number; ty: number; tz: number } }).__freeCam;
    if (kind === 'free' && f) {
      camera.position.set(f.x, f.y, f.z);
      camera.lookAt(f.tx, f.ty, f.tz);
    }
  });
  useEffect(() => {
    if (kind === 'free') return;
    if (kind === 'top') camera.position.set(0, 330, -40);
    else camera.position.set(-170, 130, -190);
    camera.lookAt(0, 0, 0);
  }, [camera, kind]);
  return null;
}


