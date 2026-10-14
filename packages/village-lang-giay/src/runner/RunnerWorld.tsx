import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConeGeometry, ExtrudeGeometry, Path, Shape, Sprite, SpriteMaterial, type Group, type Texture } from 'three';
import { asset, sound, useManifest } from '@so-chung/core';
import {
  Character,
  DynamicBoxes,
  DynamicModel,
  Hills,
  SceneWarmup,
  StatsProbe,
  createEdgeAlphaTexture,
  createGrassTexture,
  createHayStack,
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
import { ParticlePool, flightProgress, markerScale, pageFlutter, strawPosition, type Vec3 } from './runnerFlight';
import { speedAt, villainX, type PickupKind } from './runnerLogic';
import { COLORS, MODEL_IDS, emitCell, srgbToLinear, type BoxColor, type Emitter, type ModelKey } from './runnerShapes';
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

/** Số liệu cho thanh trên của màn chơi (đổi thì mới báo, không báo mỗi khung hình). Số giây còn lại của vật đặc biệt làm tròn lên. */
export interface RunnerHud {
  hearts: number;
  pages: number;
  coins: number;
  meters: number;
  round: number;
  shield: number;
  boots: number;
  magnet: number;
}

/** Câu hỏi giữa ván đang ở đâu: vòng vừa xong, đã trả lời chưa (đúng/sai), có phải hết giờ không. */
export interface QuizView {
  round: number;
  answered: boolean | null;
  timedOut: boolean;
}

export interface RunnerWorldProps {
  session: RunnerSession;
  paused: boolean;
  /** Báo khi số liệu thanh trên đổi */
  onHud: (hud: RunnerHud) => void;
  /** Báo khi câu hỏi giữa ván xuất hiện, được trả lời hoặc hết giờ, và khi biến mất (null) */
  onQuiz: (quiz: QuizView | null) => void;
  /** Báo một lần, ~1 giây sau khi ván kết thúc (cho thấy cú va), kèm điểm */
  onOver: (score: number) => void;
}

const PICKUP_COLOR: Record<PickupKind, BoxColor> = {
  trang: srgbToLinear(250, 244, 220),
  dong: srgbToLinear(255, 205, 70),
  nonla: srgbToLinear(120, 200, 110),
  guoc: srgbToLinear(190, 140, 80),
  tui: srgbToLinear(255, 120, 150),
};
const SPINE: BoxColor = srgbToLinear(91, 63, 214);
const MARK: BoxColor = [0.045, 0.03, 0.018];
const GOLD: BoxColor = srgbToLinear(240, 190, 60);
const HAT: BoxColor = srgbToLinear(236, 214, 150);

/** Trơn từng khung: cập nhật mô phỏng và vị trí nội suy trước mọi thành phần vẽ khác (ưu tiên nhỏ hơn chạy trước), rồi phát âm thanh, hạt và báo thanh trên / câu hỏi. */
function Driver({ session, paused, onHud, onQuiz, onOver, fx }: RunnerWorldProps & { fx: ParticlePool }) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const last = useRef({ hearts: -1, pages: -1, coins: -1, meters: -1, round: -1, shield: -1, boots: -1, magnet: -1, quizKey: '' });
  const overFor = useRef(0);
  const overSent = useRef(false);
  const cbs = useRef({ onHud, onQuiz, onOver });
  cbs.current = { onHud, onQuiz, onOver };
  useEffect(() => {
    const l = last.current;
    l.hearts = l.pages = l.coins = l.meters = l.round = l.shield = l.boots = l.magnet = -1;
    l.quizKey = '';
    overFor.current = 0;
    overSent.current = false;
  }, [session]);

  useFrame((_, dt) => {
    session.update(dt, pausedRef.current);
    session.refreshView();
    const s = session.state;
    shadowFocus.x = session.view.x;
    shadowFocus.z = session.view.z;

    // âm thanh và hạt theo sự kiện của mọi bước vừa chạy
    const ev = session.frameEvents;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e.type === 'pickup') {
        const c = PICKUP_COLOR[e.kind];
        fx.burst(e.x, e.kind === 'dong' || e.kind === 'trang' ? T.itemY : T.itemY + 0.1, e.z, e.kind === 'trang' || e.kind === 'dong' ? 6 : 10, 0.5, c[0], c[1], c[2], e.id);
        if (e.kind === 'trang') sound.playPickup(false);
        else if (e.kind === 'dong') sound.playPickup(true);
        else sound.playPowerUp();
      } else if (e.type === 'hit') sound.playHit(e.shielded);
      else if (e.type === 'throw') sound.playWhoosh();
      else if (e.type === 'answer' && e.timedOut) sound.playWrong();
    }

    // thanh trên: chỉ báo khi có số đổi
    const l = last.current;
    const meters = Math.floor(s.distance);
    const shield = Math.ceil(s.shield);
    const boots = Math.ceil(s.boots);
    const magnet = Math.ceil(s.magnet);
    if (l.hearts !== s.hearts || l.pages !== s.pages || l.coins !== s.coins || l.meters !== meters || l.round !== s.round || l.shield !== shield || l.boots !== boots || l.magnet !== magnet) {
      l.hearts = s.hearts;
      l.pages = s.pages;
      l.coins = s.coins;
      l.meters = meters;
      l.round = s.round;
      l.shield = shield;
      l.boots = boots;
      l.magnet = magnet;
      cbs.current.onHud({ hearts: s.hearts, pages: s.pages, coins: s.coins, meters, round: s.round, shield, boots, magnet });
    }
    // câu hỏi giữa ván
    const q = s.phase === 'quiz' ? s.quiz : null;
    const key = q ? `${q.round}:${q.answered}:${q.timedOut}` : '';
    if (key !== l.quizKey) {
      l.quizKey = key;
      cbs.current.onQuiz(q ? { round: q.round, answered: q.answered, timedOut: q.timedOut } : null);
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
    // Chỉ khi chạy dev: window.__freeCam = { x, y, z, tx, ty, tz } đặt camera tự do để chụp ảnh kiểm tra (chụp ngang từng chướng ngại)
    const f = import.meta.env.DEV ? (window as unknown as { __freeCam?: { x: number; y: number; z: number; tx: number; ty: number; tz: number } }).__freeCam : undefined;
    if (f) {
      camera.position.set(f.x, f.y, f.z);
      camera.lookAt(f.tx, f.ty, f.tz);
      return;
    }
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

/** {phanDien}: chạy phía trước (cách 12 đến 15 đơn vị), ôm xấp trang sổ; vung tay khi ném rơm, trượt tay khi làm rơi trang. */
function VillainView({ session }: { session: RunnerSession }) {
  const group = useRef<Group>(null);
  const [info, setInfo] = useState<CharacterInfo | null>(null);
  const [scale, setScale] = useState(1);
  const [pose, setPose] = useState<PoseRequest | undefined>(undefined);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const v = session.view;
    // lách nhẹ qua lại giữa đường như đang chạy trốn (cùng công thức `villainX` với chỗ ném rơm và rơi trang)
    g.position.set(villainX(session.state.time), 0, v.villainZ);
    g.rotation.y = Math.cos(session.state.time * 0.8) * 0.12;
    const ev = session.frameEvents;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e.type === 'throw') setPose((p) => ({ name: 'swing', n: (p?.n ?? 0) + 1 }));
      else if (e.type === 'drop') setPose((p) => ({ name: 'slide', n: (p?.n ?? 0) + 1 }));
    }
  });
  useEffect(() => {
    setScale(Math.round(locomotionTimeScale(11, info?.runSpeed ?? null) * 10) / 10);
  }, [info]);
  return (
    <group ref={group}>
      <Character id={VILLAIN_MODEL} clips={RUN_CLIPS} animation="run" timeScale={scale} pose={pose} castShadow={false} onReady={setInfo} />
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

/** Cả cảnh được dựng bằng các "bể" bản dùng lại: mỗi khung hình ghi lại ma trận của các vật đang thấy (chướng ngại, cảnh hai bên, rơm đang bay), không tạo vật mới. */
function WorldDrawer({ session }: { session: RunnerSession }) {
  const level = useQualityLevel();
  const templates = useMemo(() => buildTemplates(20260214), []);
  const cap = useMemo(() => segmentCapacity(templates), [templates]);
  const obs = OBSTACLE_LOD[level];
  const sce = SCENERY_LOD[level];
  const dens = SCENERY_DENSITY[level];
  const seg = Math.ceil((VIEW_AHEAD[level] + VIEW_BEHIND) / SEGMENT_LENGTH) + 1;

  const hayGeometry = useMemo(() => createHayStack(), []);
  useDispose(useMemo(() => [hayGeometry], [hayGeometry]));
  const refs = useMemo(
    () => ({
      'xe-bo': { current: null as DynamicInstancesApi | null },
      'xe-cho-hang': { current: null as DynamicInstancesApi | null },
      phen: { current: null as DynamicInstancesApi | null },
      'nha-ngoi': { current: null as DynamicInstancesApi | null },
      'nha-tranh': { current: null as DynamicInstancesApi | null },
      'bui-tre': { current: null as DynamicInstancesApi | null },
      boxes: { current: null as DynamicBoxesApi | null },
      hay: { current: null as DynamicBoxesApi | null },
    }),
    [],
  );
  // danh sách khóa tính một lần (không gọi Object.keys mỗi khung hình)
  const keys = useMemo(() => Object.keys(refs) as (keyof typeof refs)[], [refs]);
  // vị trí camera (để tính khoảng cách chọn bậc) ghi mỗi khung hình
  const cam = useMemo(() => ({ x: 0, z: 0 }), []);
  const flight = useMemo<Vec3>(() => ({ x: 0, y: 0, z: 0 }), []);
  const out = useMemo(() => {
    const dist = (x: number, z: number) => Math.hypot(x - cam.x, z - cam.z);
    const obstacle: Emitter = {
      model(key: ModelKey, x, y, z, yaw, sx, sy, sz) {
        refs[key].current?.add(x, y, z, yaw, sx, sy, sz, 1, 1, 1, dist(x, z));
      },
      box(x, y, z, sx, sy, sz, yaw, c: BoxColor) {
        refs.boxes.current?.add(x, y, z, sx, sy, sz, yaw, c[0], c[1], c[2]);
      },
      hay(x, y, z, rx, h, rz, c: BoxColor) {
        // hình đống rơm cao 2 và bán kính 1 ở cỡ gốc, chân ở y = 0
        refs.hay.current?.add(x, y, z, rx, h / 2, rz, 0, c[0], c[1], c[2]);
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
    const st = session.state;
    cam.x = v.x * CAMERA.followX;
    cam.z = v.z - CAMERA.back;
    for (let i = 0; i < keys.length; i++) refs[keys[i]].current?.begin();
    const { first, last } = segmentRange(v.z, VIEW_BEHIND, VIEW_AHEAD[level]);
    for (let i = first; i <= last; i++) emitSegment(i, templates, out.scenery, dens.density, dens.sheets);
    const rows = st.rows;
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].cells;
      for (let l = 0; l < 3; l++) {
        const c = cells[l];
        if (!c) continue;
        if (c.thrown && c.landAt > st.time) {
          // rơm {phanDien} đang bay: vòng cung từ tay xuống làn (chỗ rơi có bóng báo trước, vẽ ở PickupDrawer)
          const u = flightProgress(c.t0, c.landAt, st.time);
          strawPosition(flight, u, c.fromX, c.fromZ, SPEC.laneX[l], (c.z0 + c.z1) / 2);
          out.obstacle.hay(flight.x, flight.y, flight.z, 0.6, 0.6, 0.45, COLORS.ro);
          continue;
        }
        emitCell(c, SPEC.laneX[l], out.obstacle);
      }
    }
    for (let i = 0; i < keys.length; i++) refs[keys[i]].current?.end();
  });

  const sceneryCap = (n: number) => Math.max(1, n * seg);
  return (
    <>
      <DynamicModel id={MODEL_IDS['xe-bo']} capacity={8} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs['xe-bo']} receiveShadow />
      <DynamicModel id={MODEL_IDS['xe-cho-hang']} capacity={T.truck.units * 5} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs['xe-cho-hang']} receiveShadow />
      <DynamicModel id={MODEL_IDS.phen} capacity={Math.max(24, sceneryCap(cap.sheets) + 24)} level={level} nearDist={obs.near} midDist={obs.mid} apiRef={refs.phen} />
      <DynamicModel id={SCENERY_IDS['nha-ngoi']} capacity={sceneryCap(cap.houses)} level={level} nearDist={sce.near} midDist={sce.mid} apiRef={refs['nha-ngoi']} />
      <DynamicModel id={SCENERY_IDS['nha-tranh']} capacity={sceneryCap(cap.houses)} level={level} nearDist={sce.near} midDist={sce.mid} apiRef={refs['nha-tranh']} />
      <DynamicModel id={SCENERY_IDS['bui-tre']} capacity={sceneryCap(cap.bamboo)} level={level} nearDist={sce.near} midDist={sce.mid} apiRef={refs['bui-tre']} />
      <DynamicBoxes capacity={sceneryCap(cap.legs) + 160} apiRef={refs.boxes} />
      <DynamicBoxes capacity={48} apiRef={refs.hay} geometry={hayGeometry} roughness={1} />
    </>
  );
}

/** Đồng xu có lỗ vuông (hình ép từ đường tròn khoét lỗ vuông), dày 0,06, mặt hướng +z. */
function createCoinGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, 0.3, 0, Math.PI * 2, false);
  const hole = new Path();
  const h = 0.085;
  hole.moveTo(-h, -h);
  hole.lineTo(-h, h);
  hole.lineTo(h, h);
  hole.lineTo(h, -h);
  hole.closePath();
  shape.holes.push(hole);
  const g = new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -0.03);
  return g;
}

const SPRITE_SLOTS = 6;

/** Bể biểu tượng (guốc mộc, túi tiền): mặt phẳng luôn quay về camera, xoay lắc và nhấp nhô. Ảnh lấy từ manifest. */
function useIconSprites(texture: Texture | null): Sprite[] {
  const sprites = useMemo(
    () =>
      Array.from({ length: SPRITE_SLOTS }, () => {
        const s = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false }));
        s.visible = false;
        s.scale.setScalar(0.9);
        return s;
      }),
    [],
  );
  useEffect(() => {
    for (const s of sprites) {
      s.material.map = texture;
      s.material.needsUpdate = true;
    }
  }, [sprites, texture]);
  useEffect(
    () => () => {
      for (const s of sprites) s.material.dispose();
    },
    [sprites],
  );
  return sprites;
}

/**
 * Vật nhặt và hiệu ứng: trang sổ (hai hộp: giấy và gáy tím), tiền đồng (hình ép có lỗ vuông, xoay), nón lá (hình nón), guốc mộc và túi tiền (biểu tượng quay về camera), trang đang rơi lả tả
 * kèm bóng báo chỗ rơi, bóng báo chỗ rơm sắp rơi, và hạt lấp lánh khi nhặt. Mọi thứ dùng bể bản dùng lại.
 */
function PickupDrawer({ session, fx }: { session: RunnerSession; fx: ParticlePool }) {
  const level = useQualityLevel();
  const manifest = useManifest();
  const geometries = useMemo(() => ({ coin: createCoinGeometry(), hat: new ConeGeometry(0.42, 0.28, 18).translate(0, 0.1, 0) }), []);
  useDispose(useMemo(() => Object.values(geometries), [geometries]));
  const guocTex = useImageTexture(manifest ? asset('ui/icons/guoc-moc') : null, [1, 1]);
  const tuiTex = useImageTexture(manifest ? asset('ui/icons/tui-tien') : null, [1, 1]);
  const guocSprites = useIconSprites(guocTex);
  const tuiSprites = useIconSprites(tuiTex);
  const refs = useMemo(
    () => ({
      pages: { current: null as DynamicBoxesApi | null },
      coins: { current: null as DynamicBoxesApi | null },
      hats: { current: null as DynamicBoxesApi | null },
      marks: { current: null as DynamicBoxesApi | null },
      sparks: { current: null as DynamicBoxesApi | null },
    }),
    [],
  );
  const keys = useMemo(() => Object.keys(refs) as (keyof typeof refs)[], [refs]);
  const tmp = useMemo<Vec3>(() => ({ x: 0, y: 0, z: 0 }), []);

  useFrame((_, dt) => {
    const st = session.state;
    const t = st.time;
    const v = session.view;
    const ahead = VIEW_AHEAD[level];
    for (let i = 0; i < keys.length; i++) refs[keys[i]].current?.begin();
    let ng = 0;
    let nt = 0;
    const items = st.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.z < v.z - 14 || it.z > v.z + ahead) continue;
      const pending = it.landAt > t;
      const bob = Math.sin(t * 3 + it.id) * 0.07;
      switch (it.kind) {
        case 'trang': {
          let yaw = t * 1.6 + it.id * 0.9;
          let x = it.x;
          let y = it.y + bob;
          let z = it.z;
          if (pending) {
            const u = flightProgress(it.t0, it.landAt, t);
            yaw = pageFlutter(tmp, u, it.fromX, it.fromZ, it.x, it.z, it.y, it.id * 1.7);
            x = tmp.x;
            y = tmp.y;
            z = tmp.z;
            // bóng báo chỗ rơi
            const m = markerScale(u);
            refs.marks.current?.add(it.x, 0.035, it.z, 0.75 * m, 0.02, 0.75 * m, 0, MARK[0], MARK[1], MARK[2]);
          }
          const c = PICKUP_COLOR.trang;
          refs.pages.current?.add(x, y, z, 0.46, 0.62, 0.05, yaw, c[0], c[1], c[2]);
          // gáy tím ở mép trái của trang (xoay theo trang)
          refs.pages.current?.add(x - Math.cos(yaw) * 0.21, y, z + Math.sin(yaw) * 0.21, 0.06, 0.62, 0.075, yaw, SPINE[0], SPINE[1], SPINE[2]);
          break;
        }
        case 'dong':
          refs.coins.current?.add(it.x, it.y + bob, it.z, 1, 1, 1, t * 2.4 + it.id, GOLD[0], GOLD[1], GOLD[2]);
          break;
        case 'nonla':
          refs.hats.current?.add(it.x, it.y - 0.1 + bob, it.z, 1, 1, 1, t * 1.4 + it.id, HAT[0], HAT[1], HAT[2]);
          break;
        case 'guoc':
        case 'tui': {
          const pool = it.kind === 'guoc' ? guocSprites : tuiSprites;
          const n = it.kind === 'guoc' ? ng++ : nt++;
          const s = pool[n];
          if (s) {
            s.visible = true;
            s.position.set(it.x, it.y + 0.15 + bob, it.z);
            s.material.rotation = Math.sin(t * 2 + it.id) * 0.3;
          }
          break;
        }
      }
    }
    for (let i = ng; i < SPRITE_SLOTS; i++) guocSprites[i].visible = false;
    for (let i = nt; i < SPRITE_SLOTS; i++) tuiSprites[i].visible = false;
    // bóng báo chỗ rơm sắp rơi (chỉ rơm đang bay)
    const rows = st.rows;
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].cells;
      for (let l = 0; l < 3; l++) {
        const c = cells[l];
        if (c && c.thrown && c.landAt > t) {
          const m = markerScale(flightProgress(c.t0, c.landAt, t));
          refs.marks.current?.add(SPEC.laneX[l], 0.035, (c.z0 + c.z1) / 2, 1.6 * m, 0.02, 1.0 * m, 0, MARK[0], MARK[1], MARK[2]);
        }
      }
    }
    // hạt lấp lánh khi nhặt
    fx.update(Math.min(dt, 0.05));
    for (let i = 0; i < fx.capacity; i++) {
      const s = fx.size(i);
      if (s > 0) refs.sparks.current?.add(fx.x[i], fx.y[i], fx.z[i], 0.1 * s, 0.1 * s, 0.1 * s, fx.age[i] * 6, fx.r[i], fx.g[i], fx.b[i]);
    }
    for (let i = 0; i < keys.length; i++) refs[keys[i]].current?.end();
  });

  return (
    <>
      <DynamicBoxes capacity={160} apiRef={refs.pages} roughness={0.95} />
      <DynamicBoxes capacity={64} apiRef={refs.coins} geometry={geometries.coin} roughness={0.35} />
      <DynamicBoxes capacity={16} apiRef={refs.hats} geometry={geometries.hat} roughness={0.9} />
      <DynamicBoxes capacity={48} apiRef={refs.marks} roughness={1} />
      <DynamicBoxes capacity={fx.capacity} apiRef={refs.sparks} roughness={0.6} />
      {guocSprites.map((s) => (
        <primitive key={s.uuid} object={s} />
      ))}
      {tuiSprites.map((s) => (
        <primitive key={s.uuid} object={s} />
      ))}
    </>
  );
}

/** Nạp trước cảnh (đổi mức chất lượng thì dựng lại). */
function Warmup() {
  const level = useQualityLevel();
  return <SceneWarmup key={level} />;
}

/** Mọi thứ bên trong khung 3D của màn 2 (đặt trong <Scene3D>): mặt đất, cảnh, chướng ngại, vật nhặt, người chơi, {phanDien}, camera. */
export function RunnerWorld(props: RunnerWorldProps) {
  const fx = useMemo(() => new ParticlePool(64), []);
  return (
    <>
      <Driver {...props} fx={fx} />
      <RunnerCamera session={props.session} />
      <RunnerGround session={props.session} />
      <WorldDrawer session={props.session} />
      <PickupDrawer session={props.session} fx={fx} />
      <PlayerView session={props.session} />
      <VillainView session={props.session} />
      <StatsProbe />
      <Warmup />
    </>
  );
}
