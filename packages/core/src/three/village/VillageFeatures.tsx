import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, DynamicDrawUsage, Euler, Float32BufferAttribute, Group, InstancedMesh, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, SphereGeometry, SRGBColorSpace, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fmt } from '../../content/characters';
import { stampBoardText } from '../../content/villageFeatures';
import { PEOPLE } from '../../lessons/bai-3/logic';
import { TAG_ATLAS, banyanTags, tagCell, tagPlane, tagSwing, tagTextScale, type BanyanTag } from './banyanTags';
import { applyBoxUV, attachCraftTexture, CRAFT_TEXTURE_TILE } from '../cho/craftTextures';
import { bakeCopperSheen } from '../cho/copperBake';
import { DOVECOTE_PIGEONS, PIGEON_NECK, STAMP_BOARD, createPigeonHead } from '../cho/marketGeometry';
import { LOW_COPPER } from '../cho/MarketProcedural';
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
  return bakeCopperSheen(applyBoxUV(merged, CRAFT_TEXTURE_TILE.copper), 0.5); // bánh răng quay: ánh kim nướng nhẹ hơn thân máy
}

/**
 * Vật liệu bánh răng: đồng có vân (texture `copper` dùng chung, trả tham chiếu khi vật liệu bị giải phóng); mức Thấp chỉ màu đồng và ánh kim thấp. Bánh răng vẽ bằng mesh thường (có màu theo đỉnh, có texture) nên là một chương trình shader
 * riêng: `ZonePrewarm` biên dịch trước bằng đúng vật liệu này (cờ `plain`), nếu không thì biên dịch ở khung đầu tiên bánh răng vào cảnh (một khung 130 đến 145 ms).
 */
export function gearMaterial(level?: QualityLevel): MeshStandardMaterial {
  const m = new MeshStandardMaterial(
    level === 'low'
      ? { color: '#FFFFFF', vertexColors: true, metalness: LOW_COPPER.metalness, roughness: LOW_COPPER.roughness, emissive: LOW_COPPER.emissive }
      : { color: '#FFFFFF', vertexColors: true, metalness: 0.55, roughness: 0.3, emissive: '#2a1308' },
  );
  attachCraftTexture(m, 'copper');
  return m;
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

const KINDS = ['may-soi-dau', 'bang-mau', 'chuong-bo-cau', 'cay-the'] as const;

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

// ---------------------------------------------------------------------------
// Thẻ gỗ ghi số trên cây đa Làng Bạc (bước L6): tấm gỗ và dây là hai InstancedMesh (màu theo đỉnh, cùng chương trình shader với đồ nhỏ nhân bản), chữ là một mặt phẳng phủ lên từng tấm (ảnh chữ chung vẽ bằng phông của game,
// vật liệu cơ bản như bảng mẫu dấu), cả ba cùng lay quanh chỗ buộc dây bằng cách ghi lại ma trận mỗi khung hình (không tạo object mới trong useFrame). "Giảm chuyển động" thì đứng yên.

const TAG_WOOD_FRONT = 0xd6b67c;
const TAG_WOOD_EDGE = 0x8a5a2b;
const TAG_ROPE = 0x4a3524;
const TAG_INK = '#3a2210';
const TAG_HALO = 'rgba(250, 236, 196, 0.92)';
/** Cỡ phông dùng khi đo và vẽ chữ trong ô (điểm ảnh); chữ được co về cỡ thật bằng phép biến đổi. */
const TAG_FONT_PX = 100;

/** Tấm gỗ đơn vị (1 × 1 × 0,07, tâm ở gốc): mặt trước và sau sáng, bốn cạnh sẫm (màu theo đỉnh); nhân tỉ lệ (rộng, cao, 1) khi đặt. */
export function createTagPlate(): BufferGeometry {
  const g = new BoxGeometry(1, 1, 0.07);
  const nor = g.getAttribute('normal');
  const c = new Float32Array(nor.count * 3);
  const front = new Color(TAG_WOOD_FRONT);
  const edge = new Color(TAG_WOOD_EDGE);
  for (let i = 0; i < nor.count; i++) {
    const col = Math.abs(nor.getZ(i)) > 0.5 ? front : edge;
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

/** Sợi dây đơn vị (trụ mảnh dài 1, tâm ở gốc); nhân tỉ lệ (1, dài, 1) khi đặt. */
export function createTagRope(): BufferGeometry {
  return paintAll(new CylinderGeometry(0.014, 0.014, 1, 5), TAG_ROPE);
}

/** Vẽ số của 15 thẻ lên ảnh chung: mỗi thẻ một ô, chữ mực nâu sẫm nét mềm có viền sáng nhẹ, co vừa mặt phẳng chữ của thẻ. Nền trong suốt. */
export function drawTagAtlas(canvas: HTMLCanvasElement, tags: readonly BanyanTag[]): void {
  const size = TAG_ATLAS.cell * TAG_ATLAS.cols;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `800 ${TAG_FONT_PX}px ${FONT}`;
  for (const t of tags) {
    const cell = tagCell(t.id);
    const plane = tagPlane(t);
    const k = tagTextScale(t, TAG_FONT_PX, ctx.measureText(t.digits).width);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.px, cell.py, TAG_ATLAS.cell, TAG_ATLAS.cell);
    ctx.clip();
    // đơn vị thế giới → điểm ảnh của ô (mặt phẳng chữ phủ kín ô); chữ đặt giữa, chân chữ số ở 0,36 cỡ phông dưới tâm
    ctx.translate(cell.px + TAG_ATLAS.cell / 2, cell.py + TAG_ATLAS.cell / 2);
    ctx.scale((TAG_ATLAS.cell / plane.w) * k, (TAG_ATLAS.cell / plane.h) * k);
    const baseline = TAG_FONT_PX * 0.36;
    ctx.lineWidth = 9;
    ctx.strokeStyle = TAG_HALO;
    ctx.strokeText(t.digits, 0, baseline);
    ctx.fillStyle = TAG_INK;
    ctx.fillText(t.digits, 0, baseline);
    ctx.restore();
  }
}

/**
 * Ảnh chữ chung của 15 thẻ, dùng chung giữa bước chuẩn bị làng và vùng làng (đếm tham chiếu): vẽ chữ trên ảnh 1024 × 1024 và đẩy lên GPU là việc nặng (vài chục ms), nên `ZonePrewarm` làm trước (chờ phông chữ của game,
 * vẽ một lần, đẩy lên GPU) và vùng làng chỉ lấy lại. Hết tham chiếu thì giải phóng.
 */
let tagAtlas: { canvas: HTMLCanvasElement; texture: CanvasTexture; refs: number; fontReady: boolean } | null = null;
export function acquireTagAtlas(): { canvas: HTMLCanvasElement; texture: CanvasTexture } {
  if (!tagAtlas) {
    const canvas = document.createElement('canvas');
    drawTagAtlas(canvas, banyanTags());
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    tagAtlas = { canvas, texture, refs: 0, fontReady: false };
  }
  tagAtlas.refs++;
  return tagAtlas;
}
export function releaseTagAtlas(): void {
  if (!tagAtlas) return;
  if (--tagAtlas.refs <= 0) {
    tagAtlas.texture.dispose();
    tagAtlas = null;
  }
}
/** Chờ phông chữ của game tải xong rồi vẽ lại ảnh chữ (một lần cho cả ảnh dùng chung). */
export async function readyTagAtlas(): Promise<void> {
  const a = tagAtlas;
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!a || a.fontReady || !fonts) return;
  await fonts.load(`800 ${TAG_FONT_PX}px ${FONT}`, '0123456789').catch(() => undefined);
  if (tagAtlas !== a || a.fontReady) return;
  drawTagAtlas(a.canvas, banyanTags());
  a.texture.needsUpdate = true;
  a.fontReady = true;
}

/** Vật liệu chữ của thẻ (cơ bản, trong suốt, không đổ bóng, như chữ bảng mẫu dấu): `ZonePrewarm` biên dịch trước bằng đúng vật liệu này (cờ `plain`). */
export function tagDigitMaterial(map: CanvasTexture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

function BanyanTags({ p, animate, maxDistance }: { p: PropPlacement; animate: boolean; maxDistance: number }) {
  const player = usePlayerState();
  const res = useMemo(() => {
    const tags = banyanTags();
    const plateGeo = createTagPlate();
    const ropeGeo = createTagRope();
    const wood = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9, vertexColors: true });
    const ropeMat = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, vertexColors: true });
    const white = new Color(1, 1, 1);
    const ropes: { tag: number; x: number; len: number }[] = [];
    for (const t of tags) {
      const rope = t.top - (t.y + t.h / 2);
      for (const x of t.w > 0.6 ? [-t.w * 0.32, t.w * 0.32] : [0]) ropes.push({ tag: t.id, x, len: rope + 0.02 });
    }
    const plates = new InstancedMesh(plateGeo, wood, tags.length);
    const cords = new InstancedMesh(ropeGeo, ropeMat, ropes.length);
    for (let i = 0; i < tags.length; i++) plates.setColorAt(i, white); // màu theo bản để cùng chương trình shader với các đồ nhỏ nhân bản (đã biên dịch trước)
    for (let i = 0; i < ropes.length; i++) cords.setColorAt(i, white);
    for (const m of [plates, cords]) {
      m.instanceMatrix.setUsage(DynamicDrawUsage);
      m.frustumCulled = false;
    }
    const { canvas, texture } = acquireTagAtlas();
    const digitMat = tagDigitMaterial(texture);
    const planes = tags.map((t) => {
      const plane = tagPlane(t);
      const g = new PlaneGeometry(plane.w, plane.h);
      const cell = tagCell(t.id);
      const uv = g.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, cell.u0 + (cell.u1 - cell.u0) * uv.getX(i), cell.v0 + (cell.v1 - cell.v0) * uv.getY(i));
      return g;
    });
    const root = new Group();
    const digits = planes.map((g) => {
      const m = new Mesh(g, digitMat);
      m.matrixAutoUpdate = false;
      m.renderOrder = 2;
      m.frustumCulled = false;
      root.add(m);
      return m;
    });
    root.add(plates, cords);
    // ma trận cố định: từ hệ cây ra thế giới rồi tới chỗ buộc dây của từng thẻ (xoay theo hướng thẻ)
    const base = new Matrix4().compose(new Vector3(p.x, 0, p.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), p.yaw), new Vector3(p.scale, p.scale, p.scale));
    const pivots = tags.map((t) => new Matrix4().multiplyMatrices(base, new Matrix4().compose(new Vector3(t.x, t.top, t.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), t.yaw), new Vector3(1, 1, 1))));
    const swings = tags.map((t) => tagSwing(t));
    return { tags, ropes, plateGeo, ropeGeo, wood, ropeMat, plates, cords, canvas, texture, digitMat, planes, digits, root, pivots, swings, sw: new Matrix4(), euler: new Euler(), tagM: new Matrix4(), local: new Matrix4(), out: new Matrix4() };
  }, [p]);
  useDispose(useMemo(() => [res.plateGeo, res.ropeGeo, res.wood, res.ropeMat, res.plates, res.cords, res.digitMat, ...res.planes], [res]));
  useEffect(() => () => releaseTagAtlas(), [res]);
  /** Ma trận của thẻ `i` (chỗ buộc dây, đã xoay theo lay) ghi vào `res.tagM`. */
  const swingOf = (i: number, time: number, moving: boolean) => {
    const s = res.swings[i];
    const a = moving ? s.amp * Math.sin(time * s.speed + s.phase) : 0;
    const b = moving ? s.amp * 0.6 * Math.sin(time * s.speed * 0.8 + s.phase * 1.3) : 0;
    res.euler.set(b, 0, a);
    res.sw.makeRotationFromEuler(res.euler);
    res.tagM.multiplyMatrices(res.pivots[i], res.sw);
  };
  const pose = (time: number, moving: boolean) => {
    let r = 0;
    for (let i = 0; i < res.tags.length; i++) {
      const t = res.tags[i];
      swingOf(i, time, moving);
      const drop = t.top - t.y;
      res.local.makeScale(t.w, t.h, 1).setPosition(0, -drop, 0);
      res.out.multiplyMatrices(res.tagM, res.local);
      res.plates.setMatrixAt(i, res.out);
      res.local.makeTranslation(0, -drop, 0.04);
      res.digits[i].matrix.multiplyMatrices(res.tagM, res.local);
      res.digits[i].matrixWorldNeedsUpdate = true;
    }
    for (const c of res.ropes) {
      swingOf(c.tag, time, moving);
      res.local.makeScale(1, c.len, 1).setPosition(c.x, -c.len / 2 + 0.01, 0);
      res.out.multiplyMatrices(res.tagM, res.local);
      res.cords.setMatrixAt(r++, res.out);
    }
    res.plates.instanceMatrix.needsUpdate = true;
    res.cords.instanceMatrix.needsUpdate = true;
  };
  // tư thế nghỉ (đứng yên hoặc vừa dựng): ghi một lần
  useEffect(() => {
    pose(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res]);
  // chữ đã vẽ ở bước chuẩn bị; nếu vùng làng dựng mà chưa có (không qua chuẩn bị) thì chờ phông chữ rồi vẽ lại
  useEffect(() => {
    void readyTagAtlas();
  }, [res]);
  useFrame((state) => {
    const dx = (player?.x ?? p.x) - p.x;
    const dz = (player?.z ?? p.z) - p.z;
    const r = maxDistance + FEATURE_RADIUS + 8;
    const near = !player || dx * dx + dz * dz <= r * r;
    res.root.visible = near;
    if (near && animate) pose(state.clock.elapsedTime, true);
  });
  return <primitive object={res.root} />;
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
  const banyans = useMemo(() => props.filter((p) => p.kind === KINDS[3]), [props]);
  const res = useMemo(() => {
    const gearGeos = MACHINE_GEARS.map((g) => createGear(g.r, g.teeth, 0.14));
    const gearMat = gearMaterial(level);
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
    return { gearGeos, gearMat, lampGeo, lampMat, canvas, texture, plane, boardMat };
  }, [level]);
  useDispose(useMemo(() => [...res.gearGeos, res.gearMat, res.lampGeo, res.lampMat, res.texture, res.plane, res.boardMat], [res]));
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
      {banyans.map((p, i) => (
        <BanyanTags key={`t${i}`} p={p} animate={animate} maxDistance={maxDistance} />
      ))}
    </>
  );
}

