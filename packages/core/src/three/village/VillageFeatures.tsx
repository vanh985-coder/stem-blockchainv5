import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, LinearFilter, Matrix4, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, SphereGeometry, SRGBColorSpace, Vector3, type BufferGeometry, type Group, type Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fmt } from '../../content/characters';
import { stampBoardText } from '../../content/villageFeatures';
import { PEOPLE } from '../../lessons/bai-3/logic';
import { acquireCraftTexture, applyBoxUV, releaseCraftTexture, CRAFT_TEXTURE_TILE } from '../cho/craftTextures';
import { attachCopperSheen } from '../cho/copperSheen';
import { DOVECOTE_PIGEONS, PIGEON_NECK, STAMP_BOARD, createPigeonHead } from '../cho/marketGeometry';
import { COPPER_SHEEN_INTENSITY, LOW_COPPER } from '../cho/MarketProcedural';
import { PROP_SIZES, type PropPlacement } from '../cho/marketLayout';
import type { QualityLevel } from '../quality';
import { usePlayerState } from '../WalkWorld';

/**
 * Phần chuyển động và chữ của đồ dựng bằng code ở Làng Khắc Dấu (mốc 3, bước L3), vẽ riêng vì không nhân bản chung được:
 *  - **máy soi dấu** (`may-soi-dau`; thân đồng nằm ở `createCraftProp`): ba bánh răng đồng thau (một to ở mặt trước, hai ở bên phải ăn khớp nhau và một bên trái) quay chậm, đèn lồng tròn nhấp nháy;
 *    "Giảm chuyển động" (`animate` = false) thì bánh răng đứng yên và đèn sáng đều;
 *  - **bảng mẫu dấu** (`bang-mau`): chữ trên 6 tấm gỗ, mỗi tấm là tên một người và mẫu dấu công khai của người đó, lấy từ `PEOPLE` của Bài 3 (`lessons/bai-3/logic`, không đặt số riêng).
 * Không tạo object mới trong useFrame; rời cảnh thì giải phóng hình học, vật liệu và texture.
 * Thân máy và khung bảng là đồ nhỏ nhân bản bị ẩn khi xa người chơi hơn tầm vẽ đồ nhỏ (`maxDistance`); phần vẽ riêng ở đây ẩn theo cùng tầm, để không còn bánh răng, đèn hay chữ lơ lửng giữa trời.
 */

/** Bán kính chừa thêm quanh một món khi so với tầm vẽ (máy và bảng đều nhỏ hơn bấy nhiêu). */
const FEATURE_RADIUS = 4;

const BRASS = 0xe89a58; // bánh răng đồng (như thân máy), không phải đồng thau vàng
const HUB = 0xa96030;

function paintAll(g: BufferGeometry, hex: number): BufferGeometry {
  const { r, g: gr, b } = new Color(hex);
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([r, gr, b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

/** Bánh răng trục z (đủ hai mặt phẳng ở z = ±thickness/2): đĩa, `teeth` răng hộp quanh vành, ổ trục giữa nhô ra hai bên. Màu theo đỉnh (đồng thau, ổ trục sẫm hơn). */
export function createGear(radius: number, teeth: number, thickness: number): BufferGeometry {
  const disc = new CylinderGeometry(radius * 0.84, radius * 0.84, thickness, Math.max(12, teeth * 2));
  disc.rotateX(Math.PI / 2);
  const parts: BufferGeometry[] = [paintAll(disc, BRASS)];
  const toothW = ((2 * Math.PI * radius * 0.84) / teeth) * 0.5;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tooth = new BoxGeometry(radius * 0.26, toothW, thickness);
    tooth.translate(radius * 0.84 + radius * 0.07, 0, 0);
    tooth.rotateZ(a);
    parts.push(paintAll(tooth, BRASS));
  }
  const hub = new CylinderGeometry(radius * 0.26, radius * 0.26, thickness * 2, 10);
  hub.rotateX(Math.PI / 2);
  parts.push(paintAll(hub, HUB));
  const merged = mergeGeometries(
    parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  ) as BufferGeometry;
  for (const p of parts) p.dispose();
  return applyBoxUV(merged, CRAFT_TEXTURE_TILE.copper);
}

/** Bánh răng của máy: vị trí (hệ máy, mặt trước là +Z), bán kính, số răng, trục (z: mặt trước; x: hai bên), chiều quay và tốc độ (rad/giây) */
interface GearDef {
  x: number;
  y: number;
  z: number;
  r: number;
  teeth: number;
  axis: 'z' | 'x';
  speed: number;
}
export const MACHINE_GEARS: readonly GearDef[] = [
  { x: 0, y: 1.2, z: 0.96, r: 0.5, teeth: 12, axis: 'z', speed: -0.5 },
  { x: 1.16, y: 1.3, z: 0, r: 0.42, teeth: 11, axis: 'x', speed: 0.55 },
  { x: 1.16, y: 2.05, z: 0.1, r: 0.3, teeth: 8, axis: 'x', speed: -0.55 * (0.42 / 0.3) },
  { x: -1.16, y: 1.3, z: 0, r: 0.42, teeth: 11, axis: 'x', speed: -0.45 },
];
/** Đèn lồng trên đỉnh máy: tâm quả cầu thủy tinh (hệ máy) và nhịp nhấp nháy (giây một chu kỳ) */
export const MACHINE_LAMP = { y: 3.37, period: 1.6 } as const;

const FONT = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';
/** Số điểm ảnh mỗi đơn vị của ảnh chữ trên bảng (bảng 6,6 × 3,2) */
const BOARD_PPU = 160;

/** Vẽ chữ của sáu tấm lên ảnh bảng: số mẫu dấu to ở giữa tấm, tên người nhỏ phía dưới. Nền trong suốt. */
export function drawStampBoard(canvas: HTMLCanvasElement, entries: readonly { name: string; key: number }[]): void {
  const w = PROP_SIZES['bang-mau'].box!.hx * 2 * BOARD_PPU;
  const h = PROP_SIZES['bang-mau'].h * BOARD_PPU;
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  STAMP_BOARD.plaques.forEach((q, i) => {
    const e = entries[i];
    if (!e) return;
    const cx = (q.x + PROP_SIZES['bang-mau'].box!.hx) * BOARD_PPU;
    const cy = (PROP_SIZES['bang-mau'].h - q.y) * BOARD_PPU;
    ctx.fillStyle = '#3a2412';
    ctx.font = `800 70px ${FONT}`;
    ctx.fillText(String(e.key), cx, cy - 14);
    ctx.font = `700 27px ${FONT}`;
    ctx.fillText(e.name, cx, cy + 40, STAMP_BOARD.w * BOARD_PPU * 0.92);
  });
}

/** Sáu tên và mẫu dấu công khai của bảng: đúng 6 người của bảng khóa Bài 3 (`PEOPLE`), tên theo `content/villageFeatures.ts` (tên phản diện qua {phanDien}). */
export function stampBoardEntries(format: (text: string) => string = fmt): { name: string; key: number }[] {
  return PEOPLE.map((p) => ({ name: format(stampBoardText.ten[p.id as keyof typeof stampBoardText.ten]), key: p.publicKey }));
}

const KINDS = ['may-soi-dau', 'bang-mau', 'chuong-bo-cau'] as const;

function useDispose(list: readonly { dispose(): void }[]): void {
  useEffect(
    () => () => {
      for (const d of list) d.dispose();
    },
    [list],
  );
}

/** Ẩn nhóm khi người chơi xa hơn `maxDistance` (cùng tầm với đồ nhỏ nhân bản); trả về true nếu còn hiện. */
function useRangeCull(group: { current: Group | null }, p: PropPlacement, maxDistance: number): (() => boolean) {
  const player = usePlayerState();
  return () => {
    const g = group.current;
    if (!g || !player) return true;
    const dx = player.x - p.x;
    const dz = player.z - p.z;
    const r = maxDistance + FEATURE_RADIUS;
    g.visible = dx * dx + dz * dz <= r * r;
    return g.visible;
  };
}

function Machine({ p, animate, maxDistance, gearGeos, gearMat, lampGeo, lampMat }: { p: PropPlacement; animate: boolean; maxDistance: number; gearGeos: BufferGeometry[]; gearMat: MeshStandardMaterial; lampGeo: SphereGeometry; lampMat: MeshStandardMaterial }) {
  const gears = useRef<(Mesh | null)[]>([]);
  const group = useRef<Group>(null);
  const inRange = useRangeCull(group, p, maxDistance);
  useFrame((state) => {
    if (!inRange() || !animate) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < MACHINE_GEARS.length; i++) {
      const m = gears.current[i];
      if (m) m.rotation.z = t * MACHINE_GEARS[i].speed + i * 0.4;
    }
    // nhấp nháy: sáng rõ nửa chu kỳ đầu, mờ nửa sau
    const phase = (t % MACHINE_LAMP.period) / MACHINE_LAMP.period;
    lampMat.emissiveIntensity = phase < 0.55 ? 1.6 : 0.25;
  });
  return (
    <group ref={group} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]} scale={p.scale}>
      {MACHINE_GEARS.map((g, i) => (
        <group key={i} position={[g.x, g.y, g.z]} rotation={[0, g.axis === 'x' ? Math.PI / 2 : 0, 0]}>
          <mesh
            ref={(m) => {
              gears.current[i] = m;
            }}
            geometry={gearGeos[i]}
            material={gearMat}
            castShadow
          />
        </group>
      ))}
      <mesh geometry={lampGeo} material={lampMat} position={[0, MACHINE_LAMP.y, 0]} />
    </group>
  );
}

function StampBoard({ p, maxDistance, plane, material }: { p: PropPlacement; maxDistance: number; plane: PlaneGeometry; material: MeshBasicMaterial }) {
  const group = useRef<Group>(null);
  const inRange = useRangeCull(group, p, maxDistance);
  useFrame(() => {
    inRange();
  });
  return (
    <group ref={group} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]} scale={p.scale}>
      <mesh geometry={plane} material={material} position={[0, PROP_SIZES['bang-mau'].h / 2, STAMP_BOARD.front + 0.008]} renderOrder={2} />
    </group>
  );
}

/** Nhịp gật đầu của bồ câu (rad/giây) và biên độ cúi (rad); mỗi con lệch pha riêng. */
const PIGEON_NOD = { speed: 2.3, amp: 0.42 } as const;

/**
 * Đầu bồ câu của các chuồng bồ câu: MỘT InstancedMesh cho mọi con (đầu và mỏ, tâm xoay ở cổ). Mỗi con gật đầu nhẹ theo nhịp riêng (cúi xuống rồi ngẩng lại, nghỉ một lúc); "Giảm chuyển động" thì đứng yên.
 * Ma trận mỗi bản ghi vào mảng dựng sẵn (không tạo object mới trong useFrame); ẩn cả nhóm khi xa mọi chuồng quá tầm vẽ đồ nhỏ.
 */
function Pigeons({ props, animate, maxDistance }: { props: readonly PropPlacement[]; animate: boolean; maxDistance: number }) {
  const player = usePlayerState();
  const res = useMemo(() => {
    const geometry = createPigeonHead();
    const material = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.85, vertexColors: true });
    const count = props.length * DOVECOTE_PIGEONS.length;
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const white = new Color(1, 1, 1);
    for (let i = 0; i < count; i++) mesh.setColorAt(i, white); // có màu theo bản để cùng chương trình shader với các đồ nhỏ nhân bản (đã biên dịch trước)
    mesh.frustumCulled = false;
    // ma trận cố định của từng chuồng (vị trí, hướng, tỉ lệ) và hai ma trận tạm dùng lại mỗi khung hình
    const bases = props.map((p) => new Matrix4().compose(new Vector3(p.x, 0, p.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), p.yaw), new Vector3(p.scale, p.scale, p.scale)));
    return { geometry, material, mesh, bases, local: new Matrix4(), out: new Matrix4() };
  }, [props]);
  useDispose(useMemo(() => [res.geometry, res.material, res.mesh], [res]));
  const pose = (time: number, moving: boolean) => {
    let i = 0;
    for (let b = 0; b < res.bases.length; b++) {
      for (let k = 0; k < DOVECOTE_PIGEONS.length; k++, i++) {
        const p = DOVECOTE_PIGEONS[k];
        const s = moving ? Math.sin(time * PIGEON_NOD.speed + (b * 3 + k) * 1.9) : 0;
        const angle = s > 0.45 ? ((s - 0.45) / 0.55) * PIGEON_NOD.amp : 0;
        res.local.makeRotationX(angle).setPosition(p.x, p.y + PIGEON_NECK.y, p.z + PIGEON_NECK.z);
        res.out.multiplyMatrices(res.bases[b], res.local);
        res.mesh.setMatrixAt(i, res.out);
      }
    }
    res.mesh.instanceMatrix.needsUpdate = true;
  };
  // đứng yên (hoặc vừa dựng): ghi tư thế nghỉ một lần
  useEffect(() => {
    if (!animate) pose(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, animate]);
  useFrame((state) => {
    let near = false;
    const r = maxDistance + FEATURE_RADIUS;
    for (let b = 0; b < props.length; b++) {
      const dx = (player?.x ?? 0) - props[b].x;
      const dz = (player?.z ?? 0) - props[b].z;
      if (!player || dx * dx + dz * dz <= r * r) near = true;
    }
    res.mesh.visible = near;
    if (near && animate) pose(state.clock.elapsedTime, true);
  });
  return <primitive object={res.mesh} />;
}

export interface VillageFeaturesProps {
  /** Đồ nhỏ của làng (đã ở tọa độ thế giới); chỉ lấy máy soi dấu và bảng mẫu dấu */
  props: readonly PropPlacement[];
  /** false ("Giảm chuyển động"): bánh răng đứng yên, đèn sáng đều */
  animate: boolean;
  /** Tầm vẽ đồ nhỏ của mức chất lượng (`PROPS_MAX_DISTANCE`): xa hơn thì ẩn */
  maxDistance: number;
  /** Mức chất lượng: Thấp thì bánh răng không dùng bản đồ môi trường */
  level?: QualityLevel;
}

/** Bánh răng quay chậm và đèn nhấp nháy của máy soi dấu, chữ trên bảng mẫu dấu (xem chú thích đầu file). */
export function VillageFeatures({ props, animate, maxDistance, level }: VillageFeaturesProps) {
  const machines = useMemo(() => props.filter((p) => p.kind === KINDS[0]), [props]);
  const boards = useMemo(() => props.filter((p) => p.kind === KINDS[1]), [props]);
  const dovecotes = useMemo(() => props.filter((p) => p.kind === KINDS[2]), [props]);
  const res = useMemo(() => {
    const gearGeos = MACHINE_GEARS.map((g) => createGear(g.r, g.teeth, 0.14));
    const copperMap = acquireCraftTexture('copper');
    // mức Thấp: bánh răng cũng chỉ có màu đồng và ánh kim thấp, không ánh kim giả (như thân máy)
    const gearMat = new MeshStandardMaterial(
      level === 'low'
        ? { color: '#FFFFFF', vertexColors: true, metalness: LOW_COPPER.metalness, roughness: LOW_COPPER.roughness, emissive: LOW_COPPER.emissive, ...(copperMap ? { map: copperMap } : {}) }
        : { color: '#FFFFFF', vertexColors: true, metalness: 0.7, roughness: 0.34, emissive: '#2a1308', ...(copperMap ? { map: copperMap } : {}) },
    );
    if (level !== 'low') attachCopperSheen(gearMat, COPPER_SHEEN_INTENSITY);
    const lampGeo = new SphereGeometry(0.2, 12, 8);
    lampGeo.scale(1, 1.3, 1);
    const lampMat = new MeshStandardMaterial({ color: '#FFE9A8', emissive: '#FFB52E', emissiveIntensity: 1.2, roughness: 0.25 });
    const canvas = document.createElement('canvas');
    drawStampBoard(canvas, stampBoardEntries());
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.anisotropy = 4;
    const plane = new PlaneGeometry(PROP_SIZES['bang-mau'].box!.hx * 2, PROP_SIZES['bang-mau'].h);
    const boardMat = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return { gearGeos, gearMat, lampGeo, lampMat, canvas, texture, plane, boardMat, copperMap };
  }, [level]);
  useDispose(useMemo(() => [...res.gearGeos, res.gearMat, res.lampGeo, res.lampMat, res.texture, res.plane, res.boardMat], [res]));
  useEffect(
    () => () => {
      if (res.copperMap) releaseCraftTexture('copper');
    },
    [res],
  );
  // vẽ lại chữ khi phông chữ tải xong (lần đầu có thể còn dùng phông dự phòng)
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts) return;
    void Promise.all([fonts.load(`800 70px ${FONT}`, '0123456789'), fonts.load(`700 27px ${FONT}`, stampBoardEntries().map((e) => e.name).join(''))])
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        drawStampBoard(res.canvas, stampBoardEntries());
        res.texture.needsUpdate = true;
      });
    return () => {
      alive = false;
    };
  }, [res]);
  return (
    <>
      {machines.map((p, i) => (
        <Machine key={`m${i}`} p={p} animate={animate} maxDistance={maxDistance} gearGeos={res.gearGeos} gearMat={res.gearMat} lampGeo={res.lampGeo} lampMat={res.lampMat} />
      ))}
      {boards.map((p, i) => (
        <StampBoard key={`b${i}`} p={p} maxDistance={maxDistance} plane={res.plane} material={res.boardMat} />
      ))}
      {dovecotes.length > 0 && <Pigeons props={dovecotes} animate={animate} maxDistance={maxDistance} />}
    </>
  );
}

