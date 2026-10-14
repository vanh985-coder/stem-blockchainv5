import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { asset, useManifest } from '@so-chung/core';
import {
  Character,
  DynamicBoxes,
  DynamicModel,
  Hills,
  SceneWarmup,
  StatsProbe,
  createEdgeAlphaTexture,
  createGrassTexture,
  createPaddyTexture,
  locomotionTimeScale,
  shadowFocus,
  useDispose,
  useImageTexture,
  useQualityLevel,
  type CharacterInfo,
  type DynamicBoxesApi,
  type DynamicInstancesApi,
  type PoseRequest,
} from '@so-chung/core/three/index';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import { speedAt } from './runnerLogic';
import { COLORS, MODEL_IDS, emitCell, type BoxColor, type Emitter, type ModelKey } from './runnerShapes';
import { RACK_LEG_HEIGHT, SCENERY_DENSITY, SCENERY_IDS, SEGMENT_LENGTH, buildTemplates, emitSegment, segmentCapacity, segmentRange, type SceneryEmitter, type SceneryModel } from './runnerScenery';
import type { RunnerSession } from './runnerSession';
import { CAMERA, OBSTACLE_LOD, SCENERY_LOD, VIEW_AHEAD, VIEW_BEHIND, blinkVisible, chaseCamera, shakeAmount, type CameraPose } from './runnerView';

const DIRT_TEXTURE = 'ui/textures/duong-dat';
const RUN_CLIPS = ['idle', 'run', 'jump'] as const;
/** Nhân vật chính của game (học sinh) và {phanDien} (model Tí); tên hiển thị lấy qua `{phanDien}` ở chỗ có chữ. */
const PLAYER_MODEL = 'characters/hoc-sinh-nam';
const VILLAIN_MODEL = 'characters/ti';
/** Thời gian cả cú nhảy thường (giây), để clip nhảy vừa khít */
const AIR_SECONDS = (2 * SPEC.jump.v0) / SPEC.jump.gravity;

export interface RunnerWorldProps {
  session: RunnerSession;
  paused: boolean;
  /** Báo khi tim hoặc số mét (làm tròn) đổi, cho HUD */
  onHud: (hearts: number, meters: number) => void;
  /** Báo một lần, ~1 giây sau khi hết tim (cho thấy cú va), kèm điểm */
  onOver: (score: number) => void;
}

/** Trơn từng khung: cập nhật mô phỏng và vị trí nội suy trước mọi thành phần vẽ khác (ưu tiên nhỏ hơn chạy trước). */
function Driver({ session, paused, onHud, onOver }: RunnerWorldProps) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const hud = useRef({ hearts: -1, meters: -1 });
  const overFor = useRef(0);
  const overSent = useRef(false);
  const cbs = useRef({ onHud, onOver });
  cbs.current = { onHud, onOver };
  useEffect(() => {
    hud.current.hearts = -1;
    hud.current.meters = -1;
    overFor.current = 0;
    overSent.current = false;
  }, [session]);

  useFrame((_, dt) => {
    session.update(dt, pausedRef.current);
    session.refreshView();
    const s = session.state;
    // bóng đổ và camera bám theo nhân vật
    shadowFocus.x = session.view.x;
    shadowFocus.z = session.view.z;
    const meters = Math.floor(s.distance);
    if (hud.current.hearts !== s.hearts || hud.current.meters !== meters) {
      hud.current.hearts = s.hearts;
      hud.current.meters = meters;
      cbs.current.onHud(s.hearts, meters);
    }
    if (session.over && !overSent.current) {
      overFor.current += dt;
      if (overFor.current >= 1) {
        overSent.current = true;
        cbs.current.onOver(session.score);
      }
    }
  }, -10);
  return null;
}

/** Camera sau lưng, hơi cao, rung nhẹ khi va. */
function RunnerCamera({ session }: { session: RunnerSession }) {
  const camera = useThree((st) => st.camera);
  const pose = useMemo<CameraPose>(() => ({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 }), []);
  useEffect(() => {
    const c = camera as { fov?: number; updateProjectionMatrix?: () => void };
    if (c.fov !== undefined) {
      c.fov = CAMERA.fov;
      c.updateProjectionMatrix?.();
    }
  }, [camera]);
  useFrame(() => {
    const v = session.view;
    chaseCamera(pose, v.z, v.x, v.y, shakeAmount(session.state.invuln, T.hitInvulnSec), session.time);
    camera.position.set(pose.px, pose.py, pose.pz);
    camera.lookAt(pose.tx, pose.ty, pose.tz);
  });
  return null;
}

/** Học sinh: chạy giữa làn, đổi làn, nhảy (clip jump), trượt (tư thế slide), nhấp nháy khi mất tim. */
function PlayerView({ session }: { session: RunnerSession }) {
  const group = useRef<Group>(null);
  const [anim, setAnim] = useState<'run' | 'idle' | 'jump'>('run');
  const [jumpN, setJumpN] = useState(0);
  const [pose, setPose] = useState<PoseRequest | undefined>(undefined);
  const [info, setInfo] = useState<CharacterInfo | null>(null);
  const [runScale, setRunScale] = useState(1);
  const last = useRef({ anim: 'run' as 'run' | 'idle' | 'jump', sliding: false, scale: 1, over: false });

  useFrame(() => {
    const s = session.state;
    const g = group.current;
    if (g) {
      g.position.set(session.view.x, session.view.y, session.view.z);
      g.visible = blinkVisible(s.invuln, session.time);
    }
    const l = last.current;
    const want = s.phase === 'over' ? 'idle' : s.grounded ? 'run' : 'jump';
    if (want !== l.anim) {
      l.anim = want;
      setAnim(want);
      if (want === 'jump') setJumpN((n) => n + 1);
    }
    const sliding = s.slide > 0 && s.grounded;
    if (sliding && !l.sliding) setPose((p) => ({ name: 'slide', n: (p?.n ?? 0) + 1 }));
    l.sliding = sliding;
    if (s.phase === 'over' && !l.over) {
      l.over = true;
      setPose((p) => ({ name: 'sad', n: (p?.n ?? 0) + 1 }));
    }
    // nhịp bước khớp tốc độ chạy: đổi hệ số chỉ khi lệch từ 0,1 trở lên (hiếm)
    const scale = Math.round(locomotionTimeScale(speedAt(s.time) * s.speedScale, info?.runSpeed ?? null) * 10) / 10;
    if (Math.abs(scale - l.scale) >= 0.1) {
      l.scale = scale;
      setRunScale(scale);
    }
  });

  // clip nhảy (đoạn đã cắt) dài `jumpSeconds` giây được phát nhanh hay chậm cho vừa đúng thời gian ở trên không của cú nhảy thường
  const jumpScale = info?.jumpSeconds ? Math.min(2.4, Math.max(0.6, info.jumpSeconds / AIR_SECONDS)) : 1;
  const timeScale = anim === 'run' ? runScale : anim === 'jump' ? jumpScale : 1;
  return (
    <group ref={group}>
      <Character id={PLAYER_MODEL} clips={RUN_CLIPS} animation={anim} trigger={jumpN} returnTo="run" timeScale={timeScale} pose={pose} onReady={setInfo} />
    </group>
  );
}

/** {phanDien}: chạy phía trước (cách 12 đến 15 đơn vị), ôm xấp trang sổ trên lưng. Chưa ném rơm (bước 12). */
function VillainView({ session }: { session: RunnerSession }) {
  const group = useRef<Group>(null);
  const [info, setInfo] = useState<CharacterInfo | null>(null);
  const [scale, setScale] = useState(1);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const v = session.view;
    // lách nhẹ qua lại giữa đường như đang chạy trốn
    g.position.set(Math.sin(session.time * 0.8) * 1.2, 0, v.villainZ);
    g.rotation.y = Math.cos(session.time * 0.8) * 0.12;
  });
  useEffect(() => {
    setScale(Math.round(locomotionTimeScale(11, info?.runSpeed ?? null) * 10) / 10);
  }, [info]);
  return (
    <group ref={group}>
      <Character id={VILLAIN_MODEL} clips={RUN_CLIPS} animation="run" timeScale={scale} castShadow={false} onReady={setInfo} />
      <mesh position={[0, 1.15, -0.3]}>
        <boxGeometry args={[0.55, 0.4, 0.34]} />
        <meshStandardMaterial color="#F3EBD2" roughness={1} />
      </mesh>
      <mesh position={[0, 1.38, -0.3]} rotation={[0, 0.3, 0.05]}>
        <boxGeometry args={[0.5, 0.06, 0.32]} />
        <meshStandardMaterial color="#E6D9B5" roughness={1} />
      </mesh>
    </group>
  );
}

/** Đất, đường, ruộng và đồi, đi theo nhân vật theo bước đúng bằng chu kỳ texture nên không thấy mối nối. */
function RunnerGround({ session }: { session: RunnerSession }) {
  const manifest = useManifest();
  const dirtUrl = useMemo(() => (manifest ? asset(DIRT_TEXTURE) : null), [manifest]);
  const LEN = 240;
  const roadW = 7.4;
  const dirt = useImageTexture(dirtUrl, [2, LEN / 4]);
  const tex = useMemo(
    () => ({
      paddy: createPaddyTexture([512 / 32, 512 / 32]),
      grass: createGrassTexture([64 / 5, LEN / 5]),
      lateral: createEdgeAlphaTexture('lateral'),
    }),
    [],
  );
  useDispose(useMemo(() => Object.values(tex), [tex]));
  const paddy = useRef<Group>(null);
  const strip = useRef<Group>(null);
  const hills = useRef<Group>(null);
  useFrame(() => {
    const z = session.view.z;
    if (paddy.current) paddy.current.position.z = Math.floor(z / 32) * 32;
    if (strip.current) strip.current.position.z = Math.floor(z / SEGMENT_LENGTH) * SEGMENT_LENGTH + 70;
    if (hills.current) hills.current.position.z = z;
  });
  return (
    <>
      <group ref={paddy}>
        <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
          <planeGeometry args={[512, 512]} />
          <meshStandardMaterial map={tex.paddy} roughness={1} />
        </mesh>
      </group>
      <group ref={strip}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[64, LEN]} />
          <meshStandardMaterial map={tex.grass} roughness={1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.022} receiveShadow>
          <planeGeometry args={[roadW, LEN]} />
          <meshStandardMaterial key={dirt ? 'a' : 'b'} map={dirt ?? undefined} color={dirt ? '#DCC9A2' : '#C9A064'} alphaMap={tex.lateral} transparent depthWrite={false} roughness={1} />
        </mesh>
      </group>
      <group ref={hills}>
        <Hills />
      </group>
    </>
  );
}

/** Cả cảnh được dựng bằng các "bể" bản dùng lại: mỗi khung hình ghi lại ma trận của các vật đang thấy (chướng ngại, cảnh hai bên), không tạo vật mới. */
function WorldDrawer({ session }: { session: RunnerSession }) {
  const level = useQualityLevel();
  const templates = useMemo(() => buildTemplates(20260214), []);
  const cap = useMemo(() => segmentCapacity(templates), [templates]);
  const obs = OBSTACLE_LOD[level];
  const sce = SCENERY_LOD[level];
  const dens = SCENERY_DENSITY[level];
  const seg = Math.ceil((VIEW_AHEAD[level] + VIEW_BEHIND) / SEGMENT_LENGTH) + 1;

  const refs = useMemo(
    () => ({
      sap: { current: null as DynamicInstancesApi | null },
      'xe-bo': { current: null as DynamicInstancesApi | null },
      'xe-cho-hang': { current: null as DynamicInstancesApi | null },
      phen: { current: null as DynamicInstancesApi | null },
      'nha-ngoi': { current: null as DynamicInstancesApi | null },
      'nha-tranh': { current: null as DynamicInstancesApi | null },
      'bui-tre': { current: null as DynamicInstancesApi | null },
      boxes: { current: null as DynamicBoxesApi | null },
    }),
    [],
  );
  // danh sách khóa tính một lần (không gọi Object.keys mỗi khung hình)
  const keys = useMemo(() => Object.keys(refs) as (keyof typeof refs)[], [refs]);
  // vị trí camera (để tính khoảng cách chọn bậc) ghi mỗi khung hình
  const cam = useMemo(() => ({ x: 0, z: 0 }), []);
  const out = useMemo(() => {
    const dist = (x: number, z: number) => Math.hypot(x - cam.x, z - cam.z);
    const obstacle: Emitter = {
      model(key: ModelKey, x, y, z, yaw, sx, sy, sz) {
        refs[key].current?.add(x, y, z, yaw, sx, sy, sz, 1, 1, 1, dist(x, z));
      },
      box(x, y, z, sx, sy, sz, yaw, c: BoxColor) {
        refs.boxes.current?.add(x, y, z, sx, sy, sz, yaw, c[0], c[1], c[2]);
      },
    };
    const scenery: SceneryEmitter = {
      model(model: SceneryModel, x, y, z, yaw, scale) {
        refs[model].current?.add(x, y, z, yaw, scale, scale, scale, 1, 1, 1, dist(x, z));
      },
      sheet(x, z, yaw) {
        refs.phen.current?.add(x, 0, z, yaw, 1, 1, 1, 1, 1, 1, dist(x, z));
      },
      leg(x, z) {
        refs.boxes.current?.add(x, RACK_LEG_HEIGHT / 2, z, 0.07, RACK_LEG_HEIGHT, 0.07, 0, COLORS.go[0], COLORS.go[1], COLORS.go[2]);
      },
    };
    return { obstacle, scenery };
  }, [refs, cam]);

  useFrame(() => {
    const v = session.view;
    cam.x = v.x * CAMERA.followX;
    cam.z = v.z - CAMERA.back;
    for (let i = 0; i < keys.length; i++) refs[keys[i]].current?.begin();
    const { first, last } = segmentRange(v.z, VIEW_BEHIND, VIEW_AHEAD[level]);
    for (let i = first; i <= last; i++) emitSegment(i, templates, out.scenery, dens.density, dens.sheets);
    const rows = session.state.rows;
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].cells;
      for (let l = 0; l < 3; l++) {
        const c = cells[l];
        if (c) emitCell(c, SPEC.laneX[l], out.obstacle);
      }
    }
    for (let i = 0; i < keys.length; i++) refs[keys[i]].current?.end();
  });

  const sceneryCap = (n: number) => Math.max(1, n * seg);
  return (
    <>
      <DynamicModel id={MODEL_IDS.sap} capacity={16} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs.sap} receiveShadow />
      <DynamicModel id={MODEL_IDS['xe-bo']} capacity={12} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs['xe-bo']} receiveShadow />
      <DynamicModel id={MODEL_IDS['xe-cho-hang']} capacity={10} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs['xe-cho-hang']} receiveShadow />
      <DynamicModel id={MODEL_IDS.phen} capacity={Math.max(24, sceneryCap(cap.sheets) + 24)} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs.phen} />
      <DynamicModel id={SCENERY_IDS['nha-ngoi']} capacity={sceneryCap(cap.houses)} level={level} nearDist={sce.near} midDist={sce.mid} apiRef={refs['nha-ngoi']} />
      <DynamicModel id={SCENERY_IDS['nha-tranh']} capacity={sceneryCap(cap.houses)} level={level} nearDist={sce.near} midDist={sce.mid} apiRef={refs['nha-tranh']} />
      <DynamicModel id={SCENERY_IDS['bui-tre']} capacity={sceneryCap(cap.bamboo)} level={level} nearDist={sce.near} midDist={sce.mid} apiRef={refs['bui-tre']} />
      <DynamicBoxes capacity={sceneryCap(cap.legs) + 160} apiRef={refs.boxes} />
    </>
  );
}

/** Nạp trước cảnh (đổi mức chất lượng thì dựng lại). */
function Warmup() {
  const level = useQualityLevel();
  return <SceneWarmup key={level} />;
}

/** Mọi thứ bên trong khung 3D của màn 2 (đặt trong <Scene3D>): mặt đất, cảnh, chướng ngại, người chơi, {phanDien}, camera. */
export function RunnerWorld(props: RunnerWorldProps) {
  return (
    <>
      <Driver {...props} />
      <RunnerCamera session={props.session} />
      <RunnerGround session={props.session} />
      <WorldDrawer session={props.session} />
      <PlayerView session={props.session} />
      <VillainView session={props.session} />
      <StatsProbe />
      <Warmup />
    </>
  );
}
