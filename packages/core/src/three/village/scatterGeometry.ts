/**
 * Hình học dựng bằng code cho đồ rải của làng lớn (bước X3): bụi tre, cây ăn quả, phên phơi giấy, cầu ao, đồi. Mỗi loại là MỘT hình học gộp (màu theo đỉnh) nên một draw call cho cả loại; nhẹ
 * (dưới 200 tam giác mỗi món). Chân ở y = 0. Khớp cỡ ở `SCATTER_SIZES` (có test). Thuần của three: không cần canvas hay GPU.
 */
import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, PlaneGeometry, SphereGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ScatterKind } from './scatter';

/** Tô cả hình học một màu theo đỉnh (để gộp nhiều bộ phận khác màu thành một hình học). */
function paint(g: BufferGeometry, hex: number): BufferGeometry {
  const n = g.getAttribute('position').count;
  const { r, g: gr, b } = new Color(hex);
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = r;
    c[i * 3 + 1] = gr;
    c[i * 3 + 2] = b;
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

/** Bỏ thuộc tính uv để các bộ phận gộp được với nhau (hình học dựng sẵn của three đều có uv; ta không dùng ảnh). */
function bare(g: BufferGeometry): BufferGeometry {
  g.deleteAttribute('uv');
  return g;
}

/** Gộp các bộ phận (đưa hết về không chỉ mục: khối 20 mặt của three không có chỉ mục còn hộp và ống thì có). */
const merge = (parts: BufferGeometry[]): BufferGeometry => {
  const out = mergeGeometries(
    parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  ) as BufferGeometry;
  for (const p of parts) p.dispose();
  return out;
};

const STALK = 0x9db24e;
const LEAF = 0x4f9a3c;
const WOOD = 0x8a5a2b;
const WOOD_DARK = 0x6b4526;
const PAPER = 0xf0e7cf;
const CANOPY = 0x4c9a3f;

/** Bụi tre: 5 thân (ống 5 cạnh hở hai đầu, nghiêng ra ngoài) cao 5,6 đến 7, mỗi thân một cụm lá (khối 20 mặt dẹt); rộng 3,6. Khoảng 150 tam giác. */
export function createBambooClump(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const heights = [6.4, 7, 5.8, 6.7, 5.6];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const h = heights[k];
    const lean = 0.1 + (k % 2) * 0.05;
    const stalk = bare(new CylinderGeometry(0.07, 0.11, h, 5, 1, true));
    stalk.translate(0, h / 2, 0);
    stalk.rotateZ(-Math.cos(a) * lean);
    stalk.rotateX(Math.sin(a) * lean);
    stalk.translate(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    parts.push(paint(stalk, STALK));
    const leaf = bare(new IcosahedronGeometry(1, 0));
    leaf.scale(1.05, 0.62, 1.05);
    leaf.translate(Math.cos(a) * (0.6 + Math.sin(lean) * h * 0.95), h * 0.93, Math.sin(a) * (0.6 + Math.sin(lean) * h * 0.95));
    parts.push(paint(leaf, LEAF));
  }
  return merge(parts);
}

/** Cây ăn quả: thân 0,4 cao 1,8 và tán tròn dẹt bán kính 1,7 (khối 80 mặt) ở y = 2,5; cao 3,95. Khoảng 90 tam giác. */
export function createFruitTree(): BufferGeometry {
  const trunk = bare(new CylinderGeometry(0.2, 0.3, 1.8, 5, 1, true));
  trunk.translate(0, 0.9, 0);
  const crown = bare(new IcosahedronGeometry(1.7, 1));
  crown.scale(1, 0.85, 1);
  crown.translate(0, 2.5, 0);
  return merge([paint(trunk, WOOD_DARK), paint(crown, CANOPY)]);
}

const slab = (w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry => {
  const g = bare(new BoxGeometry(w, h, d));
  g.translate(x, y, z);
  return g;
};

/** Phên phơi giấy: giá tre 4 chân cao 0,85, hai thanh dọc dài 2,4 và ba tấm giấy dó phơi trên mặt (rộng 2,4, sâu 1,6, cao 0,9). 108 tam giác. */
export function createDryingRack(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const x of [-1.1, 1.1]) for (const z of [-0.65, 0.65]) parts.push(paint(slab(0.09, 0.85, 0.09, x, 0.425, z), WOOD_DARK));
  for (const z of [-0.65, 0.65]) parts.push(paint(slab(2.4, 0.07, 0.07, 0, 0.86, z), WOOD));
  for (const x of [-0.78, 0, 0.78]) parts.push(paint(slab(0.72, 0.03, 1.3, x, 0.9, 0), PAPER));
  return merge(parts);
}

/** Cầu ao: sàn ván 10 tấm rộng 3 (z), dài 5 (x), cao 0,3 và 6 cột thấp ở hai mép; đi lên được. 192 tam giác. */
export function createPondJetty(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) parts.push(paint(slab(0.46, 0.1, 3, -2.25 + i * 0.5, 0.3, 0), WOOD));
  for (const x of [-2.4, 0, 2.4]) for (const z of [-1.5, 1.5]) parts.push(paint(slab(0.13, 0.95, 0.13, x, 0.475, z), WOOD_DARK));
  return merge(parts);
}

/** Đồi: nửa quả cầu bán kính 1 (nửa trên), chân ở y = 0; kéo giãn theo bán kính chân và chiều cao khi đặt. Không màu theo đỉnh (màu từng đồi qua nhân màu). 64 tam giác. */
export function createHill(): BufferGeometry {
  return bare(new SphereGeometry(1, 16, 4, 0, Math.PI * 2, 0, Math.PI / 2));
}

/**
 * Đồi đá: nửa khối cầu dẹt có mặt lởm chởm (đỉnh lệch theo bán kính, ô nhỏ phẳng), chân ở y = 0, bán kính 1 như đồi cỏ nên đặt chung bằng `scale` và `sy`. Có toạ độ ảnh lặp 4 × 2 lần để phủ texture đá (vân đá, xem
 * `craftTextures`). Độ lệch tính từ vị trí đỉnh nên các đỉnh trùng nhau cùng lệch như nhau (không hở mặt).
 */
export function createStoneHill(): BufferGeometry {
  const g = new SphereGeometry(1, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < 1e-6) continue; // viền chân giữ nguyên
    const n = Math.sin(x * 12.9898 + z * 78.233 + y * 37.719) * 43758.5453;
    const f = 1 + ((n - Math.floor(n)) - 0.5) * 0.26;
    pos.setXYZ(i, x * f, y * (1 + ((n * 7.13 - Math.floor(n * 7.13)) - 0.5) * 0.3), z * f);
  }
  const flat = g.toNonIndexed();
  g.dispose();
  const uv = flat.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 2);
  flat.computeVertexNormals();
  return flat;
}

const BERRY_LEAF = [0x6fa33e, 0x5e9232, 0x7bb047];

/** Thêm thuộc tính aSway (độ đung đưa 0 đến 1 của từng đỉnh) và aSlot (chỗ treo vải 0, 1, 2; −1 là trụ và xà) cho cả hình học: bộ đổ bóng đỉnh của vật liệu sào vải đọc cả hai. */
function withCloth(g: BufferGeometry, slot: number, sway: (y: number) => number): BufferGeometry {
  const pos = g.getAttribute('position');
  const a = new Float32Array(pos.count);
  const s = new Float32Array(pos.count).fill(slot);
  for (let i = 0; i < pos.count; i++) a[i] = sway(pos.getY(i));
  g.setAttribute('aSway', new Float32BufferAttribute(a, 1));
  g.setAttribute('aSlot', new Float32BufferAttribute(s, 1));
  return g;
}

/** Chiều dài thiết kế của tấm vải trên sào và độ cao mép trên (chỗ vải buộc vào xà); bộ đổ bóng đỉnh co tấm về mép trên theo từng sào. */
export const CLOTH_DESIGN_LENGTH = 2.0;
export const CLOTH_TOP = 2.46;
/** Hoành độ ba chỗ treo vải và bề rộng một tấm. */
export const CLOTH_SLOT_X = [-1.4, 0, 1.4] as const;
export const CLOTH_PANEL_WIDTH = 1.15;

/**
 * Sào phơi vải: hai trụ tre cao 2,6 ở x = ±2,0, xà ngang dài 4,4 ở y = 2,5 và BA chỗ treo vải (rộng 1,15, dài thiết kế 2,0, chia lưới 2 × 5 để lay được). Màu, độ dài và có treo hay không của từng chỗ do từng sào quyết định
 * (xem clothPoles.ts, bộ đổ bóng đỉnh giải mã từ màu bản); aSway = 0 ở trụ và xà, tăng dần từ mép trên tới mép dưới tấm vải. 96 tam giác. Vải hai mặt (vật liệu DoubleSide); màu gốc của tấm là trắng mộc.
 */
export function createClothPole(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const stick = (w: number, h: number, d: number, x: number, y: number) => {
    const g = bare(new BoxGeometry(w, h, d));
    g.translate(x, y + h / 2, 0);
    return withCloth(g, -1, () => 0);
  };
  for (const x of [-2, 2]) parts.push(paint(stick(0.1, 2.6, 0.1, x, 0), WOOD_DARK));
  parts.push(paint(stick(4.4, 0.08, 0.08, 0, 2.46), WOOD));
  CLOTH_SLOT_X.forEach((x, slot) => {
    const g = bare(new PlaneGeometry(CLOTH_PANEL_WIDTH, CLOTH_DESIGN_LENGTH, 2, 5));
    g.translate(x, CLOTH_TOP - CLOTH_DESIGN_LENGTH / 2, 0);
    parts.push(paint(withCloth(g, slot, (y) => Math.min(1, Math.max(0, (CLOTH_TOP - y) / CLOTH_DESIGN_LENGTH))), 0xe6ddc8));
  });
  return merge(parts);
}

/**
 * Luống dâu: hàng năm bụi dâu thấp (khối 20 mặt dẹt, bán kính 0,8, cao 0,95) cách nhau 1,3 dọc trục x, ba sắc xanh xen kẽ. Dài 6,4. 100 tam giác.
 */
export function createMulberryRow(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let k = 0; k < 5; k++) {
    const g = bare(new IcosahedronGeometry(1, 0));
    g.scale(0.8, 0.5, 0.8);
    g.translate(-2.6 + k * 1.3, 0.45, 0);
    parts.push(paint(g, BERRY_LEAF[k % BERRY_LEAF.length]));
  }
  return merge(parts);
}

export function createScatterGeometry(kind: ScatterKind): BufferGeometry {
  switch (kind) {
    case 'tre':
      return createBambooClump();
    case 'cay-qua':
      return createFruitTree();
    case 'phen':
      return createDryingRack();
    case 'cau-ao':
      return createPondJetty();
    case 'doi':
      return createHill();
    case 'sao-vai':
      return createClothPole();
    case 'luong-dau':
      return createMulberryRow();
  }
}

/** Loại có màu theo đỉnh (vật liệu `vertexColors`); đồi dùng nhân màu theo từng bản. */
export const SCATTER_VERTEX_COLORS: Readonly<Record<ScatterKind, boolean>> = { tre: true, 'cay-qua': true, phen: true, 'cau-ao': true, doi: false, 'sao-vai': true, 'luong-dau': true };
