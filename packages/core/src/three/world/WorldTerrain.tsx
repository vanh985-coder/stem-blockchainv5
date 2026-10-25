import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, ExtrudeGeometry, IcosahedronGeometry, MeshStandardMaterial, Shape, type Texture } from 'three';
import { Fence, Hills, Instances, useDispose, useImageTexture, type Item } from '../cho/MarketProcedural';
import { createBoatCanopy, createBoatHull } from '../cho/marketGeometry';
import type { HillAvoid } from '../cho/hillLayout';
import { applyBoxUV, useCraftTexture } from '../cho/craftTextures';
import { createEdgeAlphaTexture, createGrassTexture, createPaddyTexture, createPlankTexture, createWaterTexture } from '../cho/marketTextures';
import { DECK_START_X, DECK_TOP, PLAZA_RADIUS, RAMP_START_X, WORLD_RADIUS } from '../cho/marketLayout';
import { POND_BANK, type VillageField, type VillageLayout, type VillageRoad, type VillageYard } from '../village/villageLayout';
import { RIVER_TRUNK_HALF, ribbonOf, riverBranch, type RiverPoint } from './river';
import { BRIDGE_DECK_END_X, BRIDGE_HALF_WIDTH, BRIDGE_RAMP_END_X, RIVER_EAST_X, RIVER_WEST_X, type WorldLayout, type WorldRoad } from './worldLayout';

/** Nhân màu cho ảnh đất (ảnh gốc rất vàng): dịu bớt cho hợp cỏ và nhà. */
const DIRT_TINT = '#DCC9A2';
const ROAD_Y = 0.022;
const PLAZA_Y = 0.03;
const YARD_Y = 0.03;
const WATER_Y = 0.02;
/** Cỏ làng phủ quanh khu: bán kính làng + bấy nhiêu. */
const VILLAGE_GRASS_MARGIN = 3;
/** Đồi xa cách mép chỗ dành riêng của làng ít nhất bấy nhiêu (đồi lấn vào làng thì bị đẩy ra, xem `layoutHills`). */
const HILL_MARGIN = 8;
/** Mỗi ô cỏ lặp lại trên chừng này đơn vị (làng càng rộng thì lặp càng nhiều để hoa văn không bị kéo giãn). */
const GRASS_TILE = 8.3;
const FIELD_Y = 0.012;
const POND_Y = 0.014;
const FIELD_BUND_COLOR = '#9C8A4F';
const POND_BANK_COLOR = '#7C9150';
const POND_WATER_COLOR = '#4F93A8';

/** Bản sao texture (dùng chung ảnh và bản trên GPU) với số lần lặp riêng; giải phóng khi đổi hay rời cảnh. */
function useRepeated(base: Texture | null, rx: number, ry: number): Texture | null {
  const tex = useMemo(() => {
    if (!base) return null;
    const t = base.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
  }, [base, rx, ry]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/** Đường gạch (đại lộ, lối lên đình; bước X3): ô gạch vuông cạnh 3 đơn vị, hơi đỏ hơn đất. */
const BRICK_TILE = 3;
const BRICK_TINT = '#E3CDBB';
/** Màu đá viền sân lát gạch. */
const KERB_COLOR: readonly [number, number, number] = [0.6, 0.58, 0.54];

function RoadStrip({ road, dirt, lateral, brick = null }: { road: WorldRoad & { kind?: 'dat' | 'gach' }; dirt: Texture | null; lateral: Texture; brick?: Texture | null }) {
  const len = Math.hypot(road.x1 - road.x0, road.z1 - road.z0);
  const yaw = Math.atan2(road.x1 - road.x0, road.z1 - road.z0);
  const isBrick = road.kind === 'gach';
  const map = useRepeated(isBrick ? brick : dirt, isBrick ? road.width / BRICK_TILE : road.width / 3, isBrick ? len / BRICK_TILE : len * 0.7);
  return (
    <group position={[(road.x0 + road.x1) / 2, ROAD_Y, (road.z0 + road.z1) / 2]} rotation-y={yaw}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[road.width, len]} />
        <meshStandardMaterial key={map ? 'a' : 'b'} map={map ?? undefined} color={map ? (isBrick ? BRICK_TINT : DIRT_TINT) : isBrick ? '#B98466' : '#C9A064'} alphaMap={lateral} transparent depthWrite={false} roughness={1} />
      </mesh>
    </group>
  );
}

/** Sân đất nện hay sân lát gạch (sân đình): hình tròn mép mờ; ô đất lặp theo cỡ sân (mỗi ô ${YARD_TILE} đơn vị, gạch mỗi ô ${BRICK_TILE}) để sân rộng không bị kéo giãn thành vằn lớn. */
const YARD_TILE = 6;
function YardDisc({ yard, y, dirt, brick, radial }: { yard: VillageYard; y: number; dirt: Texture | null; brick: Texture | null; radial: Texture }) {
  const isBrick = yard.kind === 'gach';
  const isStain = yard.kind === 'vet';
  const rep = ((yard.r + 1.5) * 2) / (isBrick ? BRICK_TILE : YARD_TILE);
  const map = useRepeated(isStain ? null : isBrick ? brick : dirt, rep, rep);
  if (isStain) {
    return (
      <mesh position={[yard.x, y, yard.z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[yard.r + 1.5, 32]} />
        <meshStandardMaterial color={yard.tint ?? '#6E5040'} alphaMap={radial} transparent opacity={yard.opacity ?? 0.45} depthWrite={false} roughness={1} />
      </mesh>
    );
  }
  return (
    <mesh position={[yard.x, y, yard.z]} rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[yard.r + 1.5, 40]} />
      <meshStandardMaterial key={map ? 'a' : 'b'} map={map ?? undefined} color={map ? (isBrick ? (yard.tint ?? BRICK_TINT) : DIRT_TINT) : isBrick ? '#B98466' : '#C9A064'} alphaMap={radial} transparent depthWrite={false} roughness={1} />
    </mesh>
  );
}

/**
 * Viền đá của sân lát gạch: một vòng khối đá thấp (cao 0,16, rộng 0,55) xếp quanh mép sân, so le và lệch nhẹ, bỏ chỗ có đường đi qua (đại lộ vào sân). Không có vật cản (đi bước lên được). Một InstancedMesh.
 */
function YardKerb({ yard, roads }: { yard: VillageYard; roads: readonly VillageRoad[] }) {
  const geo = useMemo(() => applyBoxUV(new BoxGeometry(1, 1, 1), 1.0), []);
  // flatShading (các mặt hộp vốn phẳng) để dùng chung chương trình shader với đá rời (texture, không màu theo đỉnh, flatShading)
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, flatShading: true }), []);
  const stoneTex = useCraftTexture('stone');
  useEffect(() => {
    mat.map = stoneTex;
    mat.needsUpdate = true;
  }, [mat, stoneTex]);
  useDispose(useMemo(() => [geo, mat], [geo, mat]));
  const items = useMemo<Item[]>(() => {
    const n = Math.round((Math.PI * 2 * (yard.r + 0.2)) / 1.45);
    const out: Item[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = yard.x + Math.cos(a) * (yard.r + 0.2 + (i % 2 ? 0.07 : -0.05));
      const z = yard.z + Math.sin(a) * (yard.r + 0.2 + (i % 2 ? 0.07 : -0.05));
      if (roads.some((r) => segmentDistance(x, z, r) < r.width / 2 + 0.9)) continue;
      const shade = 0.88 + ((i * 7) % 5) * 0.045;
      out.push({ x, z, y: 0.07, yaw: -a + Math.PI / 2 + (i % 3 ? 0.04 : -0.05), sx: 1.5 - (i % 3) * 0.08, sy: 0.16, sz: 0.55, color: [KERB_COLOR[0] * shade, KERB_COLOR[1] * shade, KERB_COLOR[2] * shade] });
    }
    return out;
  }, [yard, roads]);
  return <Instances geometry={geo} material={mat} items={items} receive />;
}

/** Khoảng cách từ (x, z) tới đoạn tim của một con đường. */
function segmentDistance(x: number, z: number, r: VillageRoad): number {
  const dx = r.x1 - r.x0;
  const dz = r.z1 - r.z0;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - r.x0) * dx + (z - r.z0) * dz) / len2));
  return Math.hypot(x - (r.x0 + dx * t), z - (r.z0 + dz * t));
}

/** Mặt đất của một làng (luôn có, rẻ: vài draw call): cỏ làng, sân đất nện mép mờ, đường đất trong làng và hàng rào tre quanh khu. Đồ vật của làng nằm ở vùng (VillageZone). */
function VillageGround({ layout, dirt, brick, grass: grassBase, paddy, radial, lateral }: { layout: VillageLayout; dirt: Texture | null; brick: Texture | null; grass: Texture; paddy: Texture; radial: Texture; lateral: Texture }) {
  // tâm làng: hàng rào tròn của làng nhỏ, hoặc lũy tre của làng lớn (bản cũ chỉ đọc hàng rào nên cỏ của làng lớn nằm nhầm ở gốc tọa độ và mặt đất trong làng lộ ra ruộng lúa của cả thế giới)
  const cx = layout.wall?.center?.x ?? layout.fence?.center?.x ?? 0;
  const cz = layout.wall?.center?.z ?? layout.fence?.center?.z ?? 0;
  const rep = ((layout.radius + VILLAGE_GRASS_MARGIN) * 2) / GRASS_TILE;
  const grass = useRepeated(grassBase, rep, rep) ?? grassBase;
  return (
    <group>
      <mesh position={[cx, 0.001, cz]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[layout.radius + VILLAGE_GRASS_MARGIN, 64]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {layout.fields?.map((q, i) => (
        <Field key={`f${i}`} field={q} paddy={paddy} dirt={dirt} />
      ))}
      {layout.ponds?.map((p, i) => (
        <group key={`p${i}`} position={[p.x, 0, p.z]}>
          <mesh position-y={POND_Y} rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[p.r + POND_BANK, 40]} />
            <meshStandardMaterial color={POND_BANK_COLOR} roughness={1} />
          </mesh>
          <mesh position-y={POND_Y + 0.008} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[p.r, 40]} />
            <meshStandardMaterial color={p.water ?? POND_WATER_COLOR} roughness={0.15} metalness={0.05} />
          </mesh>
        </group>
      ))}
      {layout.yards.map((y, i) => (
        <YardDisc key={`y${i}`} yard={y} y={YARD_Y + i * 0.001} dirt={dirt} brick={brick} radial={radial} />
      ))}
      {layout.yards.filter((y) => y.kind === 'gach').map((y, i) => (
        <YardKerb key={`k${i}`} yard={y} roads={layout.roads} />
      ))}
      {layout.roads.map((r, i) => (
        <RoadStrip key={`r${i}`} road={r} dirt={dirt} brick={brick} lateral={lateral} />
      ))}
      {layout.fenceLayout && <Fence fence={layout.fenceLayout} />}
    </group>
  );
}

/** Ruộng lúa: bờ ruộng đất nâu viền quanh, mặt ruộng xanh có hàng lúa (cùng hoa văn ruộng lúa phủ ngoài biên, lặp theo cỡ). Ruộng dâu (`kind: 'dau'`): mặt đất nâu, luống dâu là đồ rải. Đi qua được. */
const MULBERRY_SOIL = '#A58E63';
function Field({ field: q, paddy, dirt }: { field: VillageField; paddy: Texture; dirt: Texture | null }) {
  const isMulberry = q.kind === 'dau';
  const lua = useRepeated(paddy, (q.hx * 2) / 8, (q.hz * 2) / 8);
  const soil = useRepeated(dirt, (q.hx * 2) / 6, (q.hz * 2) / 6);
  const map = isMulberry ? soil : lua;
  return (
    <group position={[q.x, 0, q.z]} rotation-y={q.yaw}>
      <mesh position-y={FIELD_Y - 0.003} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[q.hx * 2 + 0.7, q.hz * 2 + 0.7]} />
        <meshStandardMaterial color={FIELD_BUND_COLOR} roughness={1} />
      </mesh>
      <mesh position-y={FIELD_Y} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[q.hx * 2, q.hz * 2]} />
        <meshStandardMaterial map={map ?? undefined} color={isMulberry ? MULBERRY_SOIL : map ? '#FFFFFF' : '#A9C95F'} roughness={1} />
      </mesh>
    </group>
  );
}

/** Mặt lưới dải nước từ đường tim đã làm mượt (xem `ribbonOf`): nằm ngang (pháp tuyến +y), uv chạy dọc dòng chảy. */
function ribbonGeometry(points: readonly RiverPoint[], uvLength: number, widen = 0): BufferGeometry {
  const r = ribbonOf(widen > 0 ? points.map((p) => ({ ...p, w: p.w + widen })) : points, uvLength);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(r.positions, 3));
  g.setAttribute('uv', new BufferAttribute(r.uvs, 2));
  const normals = new Float32Array(r.positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute('normal', new BufferAttribute(normals, 3));
  g.setIndex(new BufferAttribute(r.indices, 1));
  return g;
}

/** Sông phía đông (−X): đoạn thân thẳng giữa hai bờ có cầu gỗ cho đường sang Làng Bạc, hai nhánh uốn qua khe giữa các làng (xem river.ts), đá hai bờ, thuyền gỗ. */
function River({ world, water, plank }: { world: WorldLayout; water: Texture; plank: Texture }) {
  const hull = useMemo(createBoatHull, []);
  const canopy = useMemo(createBoatCanopy, []);
  const hullMat = useMemo(() => new MeshStandardMaterial({ color: '#7B5230', roughness: 0.9 }), []);
  const canopyMat = useMemo(() => new MeshStandardMaterial({ color: '#C9A857', roughness: 1, side: 2 }), []);
  const postGeo = useMemo(() => new CylinderGeometry(0.11, 0.13, 1.1, 8), []);
  const postMat = useMemo(() => new MeshStandardMaterial({ color: '#6B4526', roughness: 1 }), []);
  const rockGeo = useMemo(() => applyBoxUV(new IcosahedronGeometry(0.55, 0), 1.0), []);
  const rockMat = useMemo(() => new MeshStandardMaterial({ color: '#9A9A90', roughness: 1, flatShading: true }), []);
  // đá hai bờ sông: vân đá dùng chung với đá của làng (bước L4); chưa có texture thì giữ màu xám phẳng
  const stoneTex = useCraftTexture('stone');
  useEffect(() => {
    rockMat.map = stoneTex;
    rockMat.needsUpdate = true;
  }, [rockMat, stoneTex]);
  const bridgeLen = DECK_START_X - BRIDGE_DECK_END_X;
  const deckGeo = useMemo(() => new BoxGeometry(bridgeLen, DECK_TOP, BRIDGE_HALF_WIDTH * 2), [bridgeLen]);
  const rampGeo = useMemo(() => {
    const len = RAMP_START_X - DECK_START_X;
    const shape = new Shape();
    shape.moveTo(len / 2, 0);
    shape.lineTo(-len / 2, 0);
    shape.lineTo(-len / 2, DECK_TOP);
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: BRIDGE_HALF_WIDTH * 2, bevelEnabled: false });
    g.translate(0, 0, -BRIDGE_HALF_WIDTH);
    return g;
  }, []);
  useDispose(useMemo(() => [hull, canopy, hullMat, canopyMat, postGeo, postMat, rockGeo, rockMat, deckGeo, rampGeo], [hull, canopy, hullMat, canopyMat, postGeo, postMat, rockGeo, rockMat, deckGeo, rampGeo]));

  const boats = useMemo<Item[]>(
    () => [
      { x: -40.2, z: 5.6, yaw: Math.PI / 2 + 0.12, y: 0.0 },
      { x: -41.9, z: -5.8, yaw: Math.PI / 2 - 0.1, y: 0.0 },
      { x: -46.5, z: 10.5, yaw: Math.PI / 2 + 0.3, y: 0.0 },
      { x: -47.5, z: -11, yaw: Math.PI / 2 - 0.25, y: 0.0 },
    ],
    [],
  );
  const canopies = useMemo<Item[]>(() => boats.map((b) => ({ ...b, y: 0.5 })), [boats]);
  const posts = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (let x = DECK_START_X - 0.2; x >= BRIDGE_DECK_END_X + 0.2; x -= 3.4) for (const z of [-BRIDGE_HALF_WIDTH + 0.05, BRIDGE_HALF_WIDTH - 0.05]) out.push({ x, z, y: DECK_TOP + 0.05 });
    return out;
  }, []);
  const rocks = useMemo<Item[]>(
    () =>
      world.riverRocks.map((q) => ({ x: q.x, z: q.z, y: 0.2 * q.scale, sx: q.scale * 1.3, sy: q.scale * 0.7, sz: q.scale, yaw: q.yaw, color: q.tint })),
    [world],
  );
  const waterWidth = RIVER_WEST_X - RIVER_EAST_X;
  const midX = (RIVER_WEST_X + RIVER_EAST_X) / 2;
  const trunkLen = RIVER_TRUNK_HALF * 2;
  const branches = useMemo(() => {
    const out = (['ne', 'se'] as const).map((side) => {
      const pts = riverBranch(side);
      return { water: ribbonGeometry(pts, 13.3), bank: ribbonGeometry(pts, 13.3, 1.6) };
    });
    return out;
  }, []);
  useDispose(useMemo(() => branches.flatMap((b) => [b.water, b.bank]), [branches]));
  const bankMat = useMemo(() => new MeshStandardMaterial({ color: '#A98652', roughness: 1 }), []);
  useDispose(useMemo(() => [bankMat], [bankMat]));
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[midX, WATER_Y, 0]}>
        <planeGeometry args={[waterWidth, trunkLen]} />
        <meshStandardMaterial map={water} roughness={0.2} metalness={0.05} />
      </mesh>
      {[RIVER_WEST_X + 0.35, RIVER_EAST_X - 0.35].map((x) => (
        <mesh key={x} position={[x, -0.02, 0]}>
          <boxGeometry args={[1.1, 0.06, trunkLen]} />
          <meshStandardMaterial color="#A98652" roughness={1} />
        </mesh>
      ))}
      {branches.map((b, i) => (
        <group key={i}>
          <mesh geometry={b.bank} material={bankMat} position-y={-0.012} />
          <mesh geometry={b.water} position-y={WATER_Y}>
            <meshStandardMaterial map={water} roughness={0.2} metalness={0.05} />
          </mesh>
        </group>
      ))}
      <Instances geometry={rockGeo} material={rockMat} items={rocks} cast />
      {/* cầu: sàn đặc cao DECK_TOP (người đứng trên mặt sàn: xem worldGroundHeight), hai dốc ở hai đầu, cột hai bên */}
      <mesh geometry={deckGeo} position={[(DECK_START_X + BRIDGE_DECK_END_X) / 2, DECK_TOP / 2, 0]} receiveShadow castShadow>
        <meshStandardMaterial map={plank} roughness={0.95} />
      </mesh>
      <mesh geometry={rampGeo} position={[(RAMP_START_X + DECK_START_X) / 2, 0, 0]} receiveShadow castShadow>
        <meshStandardMaterial map={plank} roughness={0.95} />
      </mesh>
      <mesh geometry={rampGeo} position={[(BRIDGE_DECK_END_X + BRIDGE_RAMP_END_X) / 2, 0, 0]} rotation-y={Math.PI} receiveShadow castShadow>
        <meshStandardMaterial map={plank} roughness={0.95} />
      </mesh>
      <Instances geometry={postGeo} material={postMat} items={posts} cast />
      <Instances geometry={hull} material={hullMat} items={boats} cast />
      <Instances geometry={canopy} material={canopyMat} items={canopies} cast />
    </group>
  );
}

export interface WorldTerrainProps {
  world: WorldLayout;
  /** Đường dẫn ảnh đất (ui/textures/duong-dat) lấy từ manifest; null thì dùng màu thay thế */
  dirtUrl: string | null;
  /** Đường dẫn ảnh gạch (ui/textures/san-gach) cho đường gạch trong làng; null thì dùng màu thay thế */
  brickUrl?: string | null;
  /** false (Giảm chuyển động) thì nước không trôi */
  animate: boolean;
}

/**
 * Mặt đất của cả thế giới (do code dựng): ruộng lúa phủ rộng, cỏ chợ, sân chợ, 4 con đường dài ra cổng làng, sông có cầu, hàng rào chợ, đồi xa, và mặt đất của 4 làng (cỏ, sân, đường, hàng rào).
 * Tất cả rẻ (vài chục draw call) nên luôn có; đồ vật của làng thì tải theo vùng (VillageZone). Rời cảnh thì giải phóng texture.
 */
export function WorldTerrain({ world, dirtUrl, brickUrl = null, animate }: WorldTerrainProps) {
  const dirt = useImageTexture(dirtUrl, [(PLAZA_RADIUS * 2) / 3, (PLAZA_RADIUS * 2) / 3]);
  const roadDirt = useImageTexture(dirtUrl, [1, 1]);
  const yardDirt = useImageTexture(dirtUrl, [1, 1]);
  const brick = useImageTexture(brickUrl, [1, 1]);
  const tex = useMemo(
    () => ({
      paddy: createPaddyTexture([1000 / 32, 1000 / 32]),
      grass: createGrassTexture([(WORLD_RADIUS + 8) / 5, (WORLD_RADIUS + 8) / 5]),
      villageGrass: createGrassTexture([1, 1]),
      fieldPaddy: createPaddyTexture([1, 1]),
      water: createWaterTexture([1, 30]),
      plank: createPlankTexture([4, 1]),
      lateral: createEdgeAlphaTexture('lateral'),
      radial: createEdgeAlphaTexture('radial'),
    }),
    [],
  );
  useDispose(useMemo(() => Object.values(tex), [tex]));
  const hillAvoid = useMemo<HillAvoid[]>(() => world.villages.map((v) => ({ x: v.center.x, z: v.center.z, r: v.radius + HILL_MARGIN })), [world]);
  useFrame((_, dt) => {
    if (animate) tex.water.offset.y -= dt * 0.03;
  });
  return (
    <group>
      {/* ruộng lúa phủ rộng ra tận chân trời, cỏ chợ bên trong */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
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
      {world.roads.map((r, i) => (
        <RoadStrip key={i} road={r} dirt={roadDirt} lateral={tex.lateral} />
      ))}
      <River world={world} water={tex.water} plank={tex.plank} />
      <Fence />
      <Hills minDistance={400} spread={60} size={80} sizeVar={60} height={28} heightVar={20} avoid={hillAvoid} />
      {world.villages.map((v) => (
        <VillageGround key={v.id} layout={v.layout} dirt={yardDirt} brick={brick} grass={tex.villageGrass} paddy={tex.fieldPaddy} radial={tex.radial} lateral={tex.lateral} />
      ))}
    </group>
  );
}

