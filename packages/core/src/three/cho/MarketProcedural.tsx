import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import {
  BoxGeometry,
  ExtrudeGeometry,
  Shape,
  CylinderGeometry,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  TextureLoader,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { createMulberry32 } from '../../lib/rng';
import { FENCE_POST_HEIGHT, FENCE_RAIL_LENGTH, fenceLayout, DECK_START_X, DECK_TOP, DOCK_END_X, DOCK_HALF_WIDTH, PLAZA_RADIUS, RAMP_START_X, RIVER_X, ROAD_WIDTH, WORLD_RADIUS, type MarketLayout, type PropPlacement } from './marketLayout';
import { createBoatCanopy, createBoatHull, createCraftProp, createHayStack, createJar } from './marketGeometry';
import { createEdgeAlphaTexture, createGrassTexture, createPaddyTexture, createPlankTexture, createWaterTexture } from './marketTextures';

/** Một bản nhân bản tĩnh: vị trí, góc xoay, tỉ lệ (đều hoặc từng trục), nhân màu. */
interface Item {
  x: number;
  y?: number;
  z: number;
  yaw?: number;
  scale?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: readonly [number, number, number];
}

const tmp = { m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(), c: new Color(), axisY: new Vector3(0, 1, 0) };

/** Dựng InstancedMesh từ danh sách bản (chạy một lần, ngoài useFrame). Dùng chung một geometry và một material cho mọi bản. */
function buildInstanced(geometry: BufferGeometry, material: Material, items: readonly Item[], cast: boolean, receive: boolean): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    tmp.p.set(it.x, it.y ?? 0, it.z);
    tmp.q.setFromAxisAngle(tmp.axisY, it.yaw ?? 0);
    const k = it.scale ?? 1;
    tmp.s.set(it.sx ?? k, it.sy ?? k, it.sz ?? k);
    tmp.m.compose(tmp.p, tmp.q, tmp.s);
    mesh.setMatrixAt(i, tmp.m);
    if (it.color) mesh.setColorAt(i, tmp.c.setRGB(it.color[0], it.color[1], it.color[2]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.frustumCulled = false;
  return mesh;
}

function Instances({ geometry, material, items, cast = false, receive = false }: { geometry: BufferGeometry; material: Material; items: readonly Item[]; cast?: boolean; receive?: boolean }) {
  const mesh = useMemo(() => buildInstanced(geometry, material, items, cast, receive), [geometry, material, items, cast, receive]);
  useEffect(
    () => () => {
      mesh.dispose(); // chỉ giải phóng bộ đệm bản nhân bản; geometry và material do nơi gọi giải phóng
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/** Giải phóng một danh sách tài nguyên khi rời cảnh. */
function useDispose(list: { dispose(): void }[]) {
  useEffect(
    () => () => {
      for (const o of list) o.dispose();
    },
    [list],
  );
}

/** Tải ảnh từ URL (TextureLoader), cấu hình lặp và màu; trả về null khi chưa có hoặc tải lỗi. Giải phóng khi rời cảnh. */
function useImageTexture(url: string | null, repeat: [number, number]): Texture | null {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let loaded: Texture | null = null;
    new TextureLoader().load(
      url,
      (t) => {
        if (cancelled) return t.dispose();
        t.wrapS = RepeatWrapping;
        t.wrapT = RepeatWrapping;
        t.repeat.set(repeat[0], repeat[1]);
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 4;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => undefined,
    );
    return () => {
      cancelled = true;
      loaded?.dispose();
      setTex(null);
    };
  }, [url, repeat[0], repeat[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return tex;
}

export interface MarketTerrainProps {
  /** Bố cục: đá bờ sông lấy từ đây (có vật cản đúng chỗ) */
  layout: MarketLayout;
  /** Đường dẫn ảnh đất (ui/textures/duong-dat) lấy từ manifest; null thì dùng màu thay thế */
  dirtUrl: string | null;
  /** false (Giảm chuyển động) thì nước không trôi */
  animate: boolean;
}

/** Nhân màu cho ảnh đất (ảnh gốc rất vàng): dịu bớt cho hợp cỏ và nhà. */
const DIRT_TINT = '#DCC9A2';
const ROAD_Y = 0.022;
const PLAZA_Y = 0.03;
const WATER_Y = 0.02;

/**
 * Mặt đất và nước của chợ (do code dựng): ruộng lúa phủ rộng, cỏ làng, sân chợ và 4 con đường đất (mép mờ), sông ở phía đông,
 * bến tàu ván gỗ, thuyền, bờ sông có đá, hàng rào tre quanh rìa, dãy đồi xa. Mỗi loại một hoặc hai draw call.
 */
export function MarketTerrain({ layout, dirtUrl, animate }: MarketTerrainProps) {
  const dirt = useImageTexture(dirtUrl, [(PLAZA_RADIUS * 2) / 3, (PLAZA_RADIUS * 2) / 3]);
  const roadDirt = useImageTexture(dirtUrl, [ROAD_WIDTH / 3, 24]);
  const tex = useMemo(
    () => ({
      paddy: createPaddyTexture([800 / 32, 800 / 32]),
      grass: createGrassTexture([(WORLD_RADIUS + 8) / 5, (WORLD_RADIUS + 8) / 5]),
      water: createWaterTexture([20, 60]),
      plank: createPlankTexture([4, 1]),
      lateral: createEdgeAlphaTexture('lateral'),
      radial: createEdgeAlphaTexture('radial'),
    }),
    [],
  );
  useDispose(useMemo(() => Object.values(tex), [tex]));

  useFrame((_, dt) => {
    if (animate) tex.water.offset.y -= dt * 0.03;
  });

  return (
    <group>
      {/* ruộng lúa phủ rộng ra tận chân trời, cỏ làng bên trong */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial map={tex.paddy} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS + 8, 72]} />
        <meshStandardMaterial map={tex.grass} roughness={1} />
      </mesh>

      {/* sân chợ đất nện, mép mờ */}
      <mesh rotation-x={-Math.PI / 2} position-y={PLAZA_Y} receiveShadow>
        <circleGeometry args={[PLAZA_RADIUS + 1.5, 64]} />
        <meshStandardMaterial key={dirt ? 'a' : 'b'} map={dirt ?? undefined} color={dirt ? DIRT_TINT : '#C9A064'} alphaMap={tex.radial} transparent depthWrite={false} roughness={1} />
      </mesh>

      <Roads dirt={roadDirt} lateral={tex.lateral} />
      <River layout={layout} water={tex.water} plank={tex.plank} />
      <Fence />
      <Hills />
    </group>
  );
}

/** 4 con đường đất từ sân chợ ra 4 cổng: dải phẳng, mép mờ. */
function Roads({ dirt, lateral }: { dirt: Texture | null; lateral: Texture }) {
  // bắc, nam, tây, đông (phía đông dừng ở bờ sông)
  const roads = [
    { x: 0, z: (PLAZA_RADIUS - 1 + WORLD_RADIUS + 6) / 2, len: WORLD_RADIUS + 6 - (PLAZA_RADIUS - 1), yaw: 0 },
    { x: 0, z: -(PLAZA_RADIUS - 1 + WORLD_RADIUS + 6) / 2, len: WORLD_RADIUS + 6 - (PLAZA_RADIUS - 1), yaw: 0 },
    { x: (PLAZA_RADIUS - 1 + WORLD_RADIUS + 6) / 2, z: 0, len: WORLD_RADIUS + 6 - (PLAZA_RADIUS - 1), yaw: Math.PI / 2 },
    { x: -(PLAZA_RADIUS - 1 + (-RIVER_X + 0.5)) / 2, z: 0, len: -RIVER_X + 0.5 - (PLAZA_RADIUS - 1), yaw: Math.PI / 2 },
  ];
  return (
    <>
      {roads.map((r, i) => (
        <group key={i} position={[r.x, ROAD_Y, r.z]} rotation-y={r.yaw}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[ROAD_WIDTH, r.len]} />
            <meshStandardMaterial key={dirt ? 'a' : 'b'} map={dirt ?? undefined} color={dirt ? DIRT_TINT : '#C9A064'} alphaMap={lateral} transparent depthWrite={false} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Sông phía đông (−X), bờ có đá, bến tàu, thuyền gỗ. */
function River({ layout, water, plank }: { layout: MarketLayout; water: Texture; plank: Texture }) {
  const hull = useMemo(createBoatHull, []);
  const canopy = useMemo(createBoatCanopy, []);
  const hullMat = useMemo(() => new MeshStandardMaterial({ color: '#7B5230', roughness: 0.9 }), []);
  const canopyMat = useMemo(() => new MeshStandardMaterial({ color: '#C9A857', roughness: 1, side: 2 }), []);
  const postGeo = useMemo(() => new CylinderGeometry(0.11, 0.13, 1.1, 8), []);
  const postMat = useMemo(() => new MeshStandardMaterial({ color: '#6B4526', roughness: 1 }), []);
  const rockGeo = useMemo(() => new IcosahedronGeometry(0.55, 0), []);
  const rockMat = useMemo(() => new MeshStandardMaterial({ color: '#9A9A90', roughness: 1, flatShading: true }), []);
  useDispose(useMemo(() => [hull, canopy, hullMat, canopyMat, postGeo, postMat, rockGeo, rockMat], [hull, canopy, hullMat, canopyMat, postGeo, postMat, rockGeo, rockMat]));

  const boats = useMemo<Item[]>(
    () => [
      { x: -40.2, z: 4.6, yaw: Math.PI / 2 + 0.12, y: 0.0 },
      { x: -40.9, z: -4.8, yaw: Math.PI / 2 - 0.1, y: 0.0 },
      { x: -45.5, z: 9.5, yaw: Math.PI / 2 + 0.3, y: 0.0 },
      { x: -47, z: -11, yaw: Math.PI / 2 - 0.25, y: 0.0 },
    ],
    [],
  );
  const canopies = useMemo<Item[]>(() => boats.map((b) => ({ ...b, y: 0.5 })), [boats]);
  const posts = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const x of [-34.2, -37.4, -40.6]) for (const z of [-DOCK_HALF_WIDTH + 0.05, DOCK_HALF_WIDTH - 0.05]) out.push({ x, z, y: DECK_TOP + 0.05 });
    return out;
  }, []);
  // Đá bờ sông lấy từ bố cục (mỗi hòn có vật cản tròn bán kính 0,72 × tỉ lệ; hòn đá dẹt dài hơn theo x một chút)
  const rocks = useMemo<Item[]>(
    () => layout.props.filter((q) => q.kind === 'da').map((q) => ({ x: q.x, z: q.z, y: 0.2 * q.scale, sx: q.scale * 1.3, sy: q.scale * 0.7, sz: q.scale, yaw: q.yaw, color: q.tint })),
    [layout],
  );
  // Dốc lên cầu tàu: nêm từ mặt đất (x = RAMP_START_X) lên mặt sàn (x = DECK_START_X), rộng bằng cầu
  const ramp = useMemo(() => {
    const len = RAMP_START_X - DECK_START_X;
    const shape = new Shape();
    shape.moveTo(len / 2, 0);
    shape.lineTo(-len / 2, 0);
    shape.lineTo(-len / 2, DECK_TOP);
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: DOCK_HALF_WIDTH * 2, bevelEnabled: false });
    g.translate(0, 0, -DOCK_HALF_WIDTH);
    return g;
  }, []);
  useDispose(useMemo(() => [ramp], [ramp]));
  const deckLen = DECK_START_X - DOCK_END_X;
  return (
    <group>
      {/* nước */}
      <mesh rotation-x={-Math.PI / 2} position={[RIVER_X - 150, WATER_Y, 0]}>
        <planeGeometry args={[300, 800]} />
        <meshStandardMaterial map={water} roughness={0.2} metalness={0.05} />
      </mesh>
      {/* bờ sông */}
      <mesh position={[RIVER_X + 0.35, -0.02, 0]}>
        <boxGeometry args={[1.1, 0.06, 400]} />
        <meshStandardMaterial color="#A98652" roughness={1} />
      </mesh>
      <Instances geometry={rockGeo} material={rockMat} items={rocks} cast />
      {/* bến tàu */}
      {/* sàn đặc từ mặt đất lên tới DECK_TOP (người đứng trên mặt sàn: xem groundHeight) và dốc lên ở đầu cầu */}
      <mesh position={[(DECK_START_X + DOCK_END_X) / 2, DECK_TOP / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[deckLen, DECK_TOP, DOCK_HALF_WIDTH * 2]} />
        <meshStandardMaterial map={plank} roughness={0.95} />
      </mesh>
      <mesh geometry={ramp} position={[(RAMP_START_X + DECK_START_X) / 2, 0, 0]} receiveShadow castShadow>
        <meshStandardMaterial map={plank} roughness={0.95} />
      </mesh>
      <Instances geometry={postGeo} material={postMat} items={posts} cast />
      {/* thuyền gỗ: thân và mui lá */}
      <Instances geometry={hull} material={hullMat} items={boats} cast />
      <Instances geometry={canopy} material={canopyMat} items={canopies} cast />
    </group>
  );
}

/** Hàng rào tre quanh rìa vùng đi lại, có chừa 4 con đường và bến sông. Bố cục và vật cản lấy từ `fenceLayout` / `fenceColliders` (marketLayout.ts). */
function Fence() {
  const geo = useMemo(() => ({ post: new BoxGeometry(0.13, FENCE_POST_HEIGHT, 0.13), rail: new BoxGeometry(FENCE_RAIL_LENGTH, 0.09, 0.09) }), []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#C8B26C', roughness: 1 }), []);
  useDispose(useMemo(() => [geo.post, geo.rail, mat], [geo, mat]));
  const { posts, rails } = useMemo(() => {
    const f = fenceLayout();
    const posts: Item[] = f.posts.map((p) => ({ x: p.x, z: p.z, y: FENCE_POST_HEIGHT / 2, yaw: p.yaw }));
    const rails: Item[] = f.segments.flatMap((sg) => [0.45, 1.0].map((y) => ({ x: sg.x, z: sg.z, y, yaw: sg.yaw })));
    return { posts, rails };
  }, []);
  return (
    <>
      <Instances geometry={geo.post} material={mat} items={posts} cast />
      <Instances geometry={geo.rail} material={mat} items={rails} />
    </>
  );
}

/** Dãy đồi xa quanh chân trời (khối cầu dẹt, sương làm nhạt dần). */
function Hills() {
  const geo = useMemo(() => new SphereGeometry(1, 20, 10), []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#6FA66A', roughness: 1 }), []);
  useDispose(useMemo(() => [geo, mat], [geo, mat]));
  const items = useMemo<Item[]>(() => {
    const rng = createMulberry32(77);
    const out: Item[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rng() * 0.3;
      const d = 210 + rng() * 40;
      const s = 40 + rng() * 40;
      out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: -4, sx: s * 1.4, sy: 12 + rng() * 10, sz: s, yaw: rng() * 3 });
    }
    return out;
  }, []);
  return <Instances geometry={geo} material={mat} items={items} />;
}

const toItem = (p: PropPlacement, extra: Partial<Item> = {}): Item => ({ x: p.x, z: p.z, yaw: p.yaw, scale: p.scale, color: p.tint, ...extra });

/**
 * Đồ nhỏ do code dựng, rải theo bố cục: đống rơm cạnh nhà, chum vại cạnh lều và nhà, khóm hoa (bụi xanh kèm hoa đỏ).
 * Mỗi loại một InstancedMesh dùng chung geometry và material.
 */
/** Đồ gợi nghề quanh cổng (bước 8d): hình dựng (`createCraftProp`) và màu vật liệu; màu từng món nhân thêm màu `tint` của bố cục (cuộn vải nhiều màu). */
const CRAFT_KINDS = ['giay', 'vai', 'khoi-da', 'ban-da', 'hom', 'thung', 'chan'] as const;
const CRAFT_COLOR: Record<(typeof CRAFT_KINDS)[number], { color: string; roughness: number }> = {
  giay: { color: '#EFE6CC', roughness: 1 },
  vai: { color: '#FFFFFF', roughness: 0.95 },
  'khoi-da': { color: '#8E8E86', roughness: 1 },
  'ban-da': { color: '#9C9C92', roughness: 1 },
  hom: { color: '#8A5A2B', roughness: 0.9 },
  thung: { color: '#D2A85A', roughness: 1 },
  chan: { color: '#6B4526', roughness: 1 },
};

export function MarketProps({ layout }: { layout: MarketLayout }) {
  const crafts = useMemo(
    () => CRAFT_KINDS.map((kind) => ({ kind, geo: createCraftProp(kind)!, mat: new MeshStandardMaterial({ ...CRAFT_COLOR[kind], flatShading: kind === 'khoi-da' }) })),
    [],
  );
  useDispose(useMemo(() => crafts.flatMap((c) => [c.geo, c.mat]), [crafts]));
  const craftItems = useMemo(() => crafts.map((c) => layout.props.filter((p) => p.kind === c.kind).map((p) => toItem(p))), [crafts, layout]);

  const res = useMemo(() => {
    const hay = createHayStack();
    const jar = createJar();
    const bush = new IcosahedronGeometry(0.5, 1);
    const bloom = new SphereGeometry(0.1, 6, 4);
    const mats = {
      hay: new MeshStandardMaterial({ color: '#DDBB60', roughness: 1 }),
      jar: new MeshStandardMaterial({ color: '#B2582E', roughness: 0.8 }),
      bush: new MeshStandardMaterial({ color: '#4C9A3F', roughness: 1 }),
      bloom: new MeshStandardMaterial({ color: '#E23B3B', roughness: 0.7 }),
    };
    return { geos: { hay, jar, bush, bloom }, mats };
  }, []);
  useDispose(useMemo(() => [...Object.values(res.geos), ...Object.values(res.mats)], [res]));

  const items = useMemo(() => {
    const rng = createMulberry32(layout.seed ^ 0x5bd1e995);
    const hay = layout.props.filter((p) => p.kind === 'rom').map((p) => toItem(p));
    const jar = layout.props.filter((p) => p.kind === 'chum').map((p) => toItem(p));
    const bushes = layout.props.filter((p) => p.kind === 'hoa');
    const bush = bushes.map((p) => toItem(p, { sy: p.scale * 0.8, color: [p.tint[1] * 0.9, p.tint[1], p.tint[1] * 0.85] }));
    const bloom: Item[] = [];
    for (const p of bushes) {
      for (let k = 0; k < 6; k++) {
        const a = rng() * Math.PI * 2;
        const r = 0.28 * p.scale * (0.5 + rng() * 0.6);
        bloom.push({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, y: 0.32 * p.scale + rng() * 0.28 * p.scale, scale: p.scale, color: [1, 0.55 + rng() * 0.45, 0.55 + rng() * 0.45] });
      }
    }
    return { hay, jar, bush, bloom };
  }, [layout]);

  return (
    <>
      <Instances geometry={res.geos.hay} material={res.mats.hay} items={items.hay} cast receive />
      <Instances geometry={res.geos.jar} material={res.mats.jar} items={items.jar} cast receive />
      <Instances geometry={res.geos.bush} material={res.mats.bush} items={items.bush} cast receive />
      <Instances geometry={res.geos.bloom} material={res.mats.bloom} items={items.bloom} />
      {crafts.map((c, i) => (craftItems[i].length > 0 ? <Instances key={c.kind} geometry={c.geo} material={c.mat} items={craftItems[i]} cast={c.kind !== 'chan'} receive /> : null))}
    </>
  );
}
