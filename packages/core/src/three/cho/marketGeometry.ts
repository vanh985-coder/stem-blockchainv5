/**
 * Hình học do code dựng cho chợ phiên (không có model trong file): thuyền gỗ, mui thuyền, chum vại, đống rơm. Hàm tạo hình học
 * thuần của three (không cần canvas hay GPU), dựng một lần rồi dùng chung cho mọi bản nhân bản.
 */
import { BoxGeometry, BufferGeometry as Geometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Vector2, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLOTH_PALETTE } from '../village/clothPoles';
import { PROP_SIZES, type PropKind } from './marketLayout';

/** Thân thuyền: dài 4,6 theo trục z, rộng 1,3, cao 0,55 (đáy ở y = 0), hai đầu thon và cong lên. */
export const BOAT_LENGTH = 4.6;
export const BOAT_WIDTH = 1.3;
export const BOAT_HEIGHT = 0.55;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createBoatHull(): BufferGeometry {
  const geo = new BoxGeometry(1, 1, 1, 2, 1, 10);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i); // −0,5 (đáy) hoặc 0,5 (mép)
    const zn = pos.getZ(i) * 2; // −1..1 dọc thân
    const end = Math.abs(zn);
    const pinch = 1 - 0.86 * smooth(0.35, 1, end);
    // đáy hẹp hơn mép (thân hình chữ V nông); đầu và đuôi vểnh lên
    const bottom = y < 0 ? 0.62 : 1;
    pos.setX(i, x * BOAT_WIDTH * pinch * bottom);
    y = (y + 0.5) * BOAT_HEIGHT + Math.pow(end, 3) * 0.32;
    pos.setY(i, y);
    pos.setZ(i, (zn * BOAT_LENGTH) / 2);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Mui thuyền bằng lá: nửa ống cong, trục dọc thân thuyền (z), dài 1,9, bán kính 0,62, đặt ở y = 0 (đặt lên mép thân khi dùng). */
export function createBoatCanopy(): BufferGeometry {
  const geo = new CylinderGeometry(0.62, 0.62, 1.9, 12, 1, true, 0, Math.PI);
  geo.rotateZ(Math.PI / 2); // trục theo x, nửa ống vòm lên trên
  geo.rotateY(Math.PI / 2); // trục theo z
  return geo;
}

/** Chum vại: cao 1,05, miệng nhỏ, bụng phình (bán kính 0,52). */
export function createJar(): BufferGeometry {
  const profile = [
    [0, 0],
    [0.26, 0],
    [0.44, 0.18],
    [0.52, 0.5],
    [0.44, 0.84],
    [0.27, 0.95],
    [0.3, 1.05],
    [0.18, 1.05],
    [0, 0.96],
  ].map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(profile, 14);
}

/**
 * Đống rơm: hình chóp bầu cao 2, bán kính chân 1. Đường viền đi từ ĐÁY lên ĐỈNH (như `createJar`): LatheGeometry quay mặt trước ra ngoài khi đường viền đi theo chiều đó.
 * (Bản cũ đi từ đỉnh xuống đáy nên mọi mặt quay vào trong: vật liệu một mặt chỉ vẽ mặt trong của thành phía sau, đống rơm ở game chạy và ở chợ trông bị khuyết một nửa.)
 */
export function createHayStack(): BufferGeometry {
  const profile = [
    [0, 0],
    [1, 0],
    [0.98, 0.35],
    [0.84, 0.9],
    [0.5, 1.5],
    [0.18, 1.9],
    [0, 2],
  ].map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(profile, 14);
}

/** Hộp có đáy ở y = 0, tâm ở (0, h/2, 0), rộng w (x), sâu d (z), cao h; dịch thêm (dx, dy, dz). */
function slab(w: number, h: number, d: number, dx = 0, dy = 0, dz = 0): BufferGeometry {
  const g = new BoxGeometry(w, h, d);
  g.translate(dx, h / 2 + dy, dz);
  return g;
}

/** Tô cả hình học một màu (thuộc tính màu theo đỉnh): để gộp nhiều bộ phận khác màu (đá, gỗ, ngói) thành MỘT hình học và MỘT draw call; vật liệu dùng `vertexColors`. */
function paint(g: BufferGeometry, hex: number): BufferGeometry {
  const n = g.getAttribute('position').count;
  const { r, g: gr, b } = new Color(hex); // màu sRGB đổi sang không gian tuyến tính của bộ dựng hình (màu theo đỉnh không tự đổi)
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = r;
    c[i * 3 + 1] = gr;
    c[i * 3 + 2] = b;
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

const STONE = 0x9a9a90;
const WOOD = 0x8a5a2b;
const WOOD_DARK = 0x6b4526;
const TILE = 0xc2592b;
const POT = 0x2f2f2f;
const BRICK = 0x9b5a45;

/** Đặt hình học ở (x, y, z) (tâm hình). */
function translated(g: BufferGeometry, x: number, y: number, z: number): BufferGeometry {
  g.translate(x, y, z);
  return g;
}

/** Hình chóp bốn mặt (mái ngói) rộng `w` (x) × sâu `d` (z) ở chân y, cao `h`: nón 4 cạnh xoay 45° rồi kéo giãn. */
function pyramid(w: number, d: number, h: number, y: number): BufferGeometry {
  const g = new ConeGeometry(Math.SQRT1_2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(w, 1, d);
  g.translate(0, y + h / 2, 0);
  return g;
}

/** Cột trụ đứng bán kính r cao h, chân ở y, tâm (x, z). */
function post(r: number, h: number, x: number, y: number, z: number): BufferGeometry {
  const g = new CylinderGeometry(r, r, h, 10);
  g.translate(x, y + h / 2, z);
  return g;
}

/**
 * Cối giã dó (cối đạp): nền đá, cối đá hình trụ, đòn gánh gỗ gác lên cột, chày thả vào cối. Khung bao đúng hộp PROP_SIZES `coi-gia` (2,2 × 0,9, cao 1,15), tâm ở gốc.
 */
function createPounder(): BufferGeometry {
  const k = PROP_SIZES['coi-gia'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  return mergeGeometries([
    paint(slab(hx * 2, 0.25, hz * 2), STONE), // nền đá
    paint(translated(new CylinderGeometry(0.4, 0.34, 0.45, 14), hx - 0.5, 0.25 + 0.225, 0), STONE), // cối đá
    paint(translated(new CylinderGeometry(0.1, 0.1, 0.7, 8), hx - 0.5, 0.7, 0), WOOD_DARK), // chày
    paint(post(0.09, k.h - 0.25 - 0.05, -0.35, 0.25, 0), WOOD_DARK), // cột đỡ đòn
    paint(slab(hx * 2 - 0.2, 0.1, 0.18, 0, k.h - 0.1, 0), WOOD), // đòn gánh (đỉnh ở đúng chiều cao)
  ])!;
}

/** Bếp nấu dó: bệ đá, nồi gang lớn trên bếp, cửa lò đen phía trước, ống khói gạch. Khung bao đúng hộp PROP_SIZES `bep-do` (2,0 × 1,2, cao 1,9). */
function createStove(): BufferGeometry {
  const k = PROP_SIZES['bep-do'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  return mergeGeometries([
    paint(slab(hx * 2, 0.8, hz * 2), STONE), // bệ đá
    paint(translated(new CylinderGeometry(0.5, 0.42, 0.38, 14), -0.3, 0.8 + 0.19, 0), POT), // nồi lớn
    paint(slab(0.55, 0.62, 0.45, -0.3, 0, -hz + 0.225), POT), // cửa lò (sát mép trước, nằm trong khung bao)
    paint(slab(0.5, k.h, 0.5, hx - 0.25, 0, hz - 0.3), BRICK), // ống khói (cao bằng khung bao)
  ])!;
}

/**
 * Đình làng nhỏ: nền đá cao 0,5, bốn cột gỗ, xà ngang, mái ngói bốn mái (hình chóp) vươn ra ngoài nền, đỉnh có nóc nhỏ. Khung bao của nền (vật cản) là hộp PROP_SIZES `dinh` (6,2 × 5,0), cao tổng 6.
 */
function createPavilion(): BufferGeometry {
  const k = PROP_SIZES.dinh;
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const plinth = 0.5;
  const colH = 3.0;
  const px = hx - 0.6;
  const pz = hz - 0.6;
  const roofY = plinth + colH;
  const roofH = k.h - roofY - 0.3;
  const parts: BufferGeometry[] = [
    paint(slab(hx * 2, plinth, hz * 2), STONE),
    ...[
      [-px, -pz],
      [px, -pz],
      [-px, pz],
      [px, pz],
    ].map(([x, z]) => paint(post(0.2, colH, x, plinth, z), WOOD)),
    paint(slab(px * 2 + 0.5, 0.25, 0.3, 0, roofY - 0.25, -pz), WOOD_DARK), // xà trước
    paint(slab(px * 2 + 0.5, 0.25, 0.3, 0, roofY - 0.25, pz), WOOD_DARK), // xà sau
    paint(slab(0.3, 0.25, pz * 2 + 0.5, -px, roofY - 0.25, 0), WOOD_DARK),
    paint(slab(0.3, 0.25, pz * 2 + 0.5, px, roofY - 0.25, 0), WOOD_DARK),
    paint(pyramid(hx * 2 + 1.8, hz * 2 + 1.6, roofH, roofY), TILE), // mái vươn ra ngoài nền 0,9 và 0,8
    paint(post(0.14, 0.3, 0, roofY + roofH, 0), WOOD_DARK), // nóc nhỏ
  ];
  return mergeGeometries(parts)!;
}

const CLAY = 0xa8643c;
const INDIGO = 0x2c52a8;
const MADDER = 0xc2402f;
/** Sáu màu vải nhuộm tự nhiên (cùng bảng với vải trên sào, xem village/clothPoles.ts): đỏ son, hồng phai, chàm, vàng nghệ, nâu, trắng mộc. */
const CLOTH_COLORS = CLOTH_PALETTE;

/**
 * Chum nhuộm: chính hình chum bầu tròn miệng loe của Làng Giấy (createJar) phóng 1,7 lần, mặt nước nhuộm (chàm hay đỏ) phẳng trong miệng chum ngay dưới vành. Cao 1,785; vòng bụng rộng nhất ở bán kính 0,884.
 */
const DYE_JAR_SCALE = 1.7;
function createDyeVat(water: number): BufferGeometry {
  const jar = createJar();
  jar.scale(DYE_JAR_SCALE, DYE_JAR_SCALE, DYE_JAR_SCALE);
  const surface = new CircleGeometry(0.28, 14);
  surface.rotateX(-Math.PI / 2);
  surface.translate(0, 1.05 * DYE_JAR_SCALE - 0.012, 0); // ngay dưới vành miệng
  return mergeGeometries([paint(toPlain(jar), CLAY), paint(toPlain(surface), water)])!;
}

/** Trộn hai màu (mã sRGB) theo tỉ lệ t. */
const mixHex = (a: number, b: number, t: number): number => new Color(a).lerp(new Color(b), t).getHex();

/**
 * Mặt cắt đầu cuộn vải (quay ra +Z, ở z = 0): đĩa màu nhạt và một dải xoắn ốc sẫm 1,75 vòng nổi lên 0,004 (mỗi vòng 9 đoạn), tức vân xoắn của lớp vải cuộn. Khoảng 36 tam giác.
 */
function spiralCap(radius: number, hex: number): BufferGeometry {
  const disc = toPlain(new CircleGeometry(radius, 8));
  const turns = 1.75;
  const steps = Math.round(turns * 9);
  const w = radius * 0.2;
  const pos: number[] = [];
  const pt = (k: number, side: number) => {
    const th = (k / steps) * turns * Math.PI * 2;
    const r = radius * 0.14 + (radius * 0.8 - radius * 0.14) * (k / steps) + side * w * 0.5;
    return [Math.cos(th) * r, Math.sin(th) * r, 0.004];
  };
  for (let k = 0; k < steps; k++) {
    const a0 = pt(k, -1);
    const b0 = pt(k, 1);
    const a1 = pt(k + 1, -1);
    const b1 = pt(k + 1, 1);
    pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
  }
  const ribbon = new Geometry();
  ribbon.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const n = pos.length / 3;
  ribbon.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: n }, () => [0, 0, 1]).flat(), 3));
  ribbon.setAttribute('uv', new Float32BufferAttribute(new Array(n * 2).fill(0), 2));
  return mergeGeometries([paint(disc, mixHex(hex, 0xf4ecd8, 0.5)), paint(ribbon, mixHex(hex, 0x2a1a10, 0.45))])!;
}

/**
 * Cuộn vải nằm NGANG (trục x), tâm ở gốc: ống vải dài `length` bán kính `radius` màu `hex`, hai đầu là mặt cắt có vân xoắn (`spiralCap`). Ống hở hai đầu và hai mặt cắt đóng lại nên là khối kín.
 */
function createClothBolt(radius: number, length: number, hex: number): BufferGeometry {
  const tube = toPlain(new CylinderGeometry(radius, radius, length, 10, 1, true));
  tube.rotateZ(Math.PI / 2);
  const capA = spiralCap(radius, hex);
  capA.rotateY(Math.PI / 2);
  capA.translate(length / 2, 0, 0);
  const capB = spiralCap(radius, hex);
  capB.rotateY(-Math.PI / 2);
  capB.translate(-length / 2, 0, 0);
  return mergeGeometries([paint(tube, hex), capA, capB])!;
}

/** Đặt một cuộn vải nằm ngang ở (x, y, z). */
function boltAt(radius: number, length: number, hex: number, x: number, y: number, z: number): BufferGeometry {
  const g = createClothBolt(radius, length, hex);
  g.translate(x, y, z);
  return g;
}

/** Đống sợi: nền gỗ tròn (bán kính 0,85), ba cuộn sợi màu và một cọc giữa cao 0,65. */
function createYarnPile(): BufferGeometry {
  const base = new CylinderGeometry(0.85, 0.85, 0.12, 16);
  base.translate(0, 0.06, 0);
  const skein = (x: number, z: number, hex: number) => {
    const g = new IcosahedronGeometry(1, 0);
    g.scale(0.4, 0.27, 0.4);
    g.translate(x, 0.385, z);
    return paint(toPlain(g), hex);
  };
  const stick = new CylinderGeometry(0.04, 0.04, 0.53, 6);
  stick.translate(0, 0.12 + 0.265, 0);
  return mergeGeometries([paint(toPlain(base), WOOD), skein(-0.32, -0.18, MADDER), skein(0.3, -0.2, INDIGO), skein(0, 0.34, CLOTH_COLORS[4]), paint(toPlain(stick), WOOD_DARK)])!;
}

/** Giá cuộn vải: hai trụ, ba tầng ván, mỗi tầng hai cuộn vải màu NẰM NGANG (đầu cuộn có vân xoắn). Khung bao đúng hộp PROP_SIZES `gia-vai`. */
function createClothShelf(): BufferGeometry {
  const k = PROP_SIZES['gia-vai'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(slabN(0.12, k.h, 0.12, sx * (hx - 0.06), 0, sz * (hz - 0.06)), WOOD_DARK));
  const tiers = [0.35, 0.8, 1.25];
  tiers.forEach((y, i) => {
    parts.push(paint(slabN(hx * 2 - 0.1, 0.06, hz * 2 - 0.1, 0, y - 0.06), WOOD));
    [-0.16, 0.16].forEach((z, j) => parts.push(boltAt(0.15, hx * 2 - 0.45, CLOTH_COLORS[(i * 2 + j + 1) % CLOTH_COLORS.length], 0, y + 0.15, z)));
  });
  parts.push(paint(slabN(hx * 2, 0.08, hz * 2, 0, k.h - 0.08), WOOD)); // nóc giá (cao đúng khung bao)
  return mergeGeometries(parts)!;
}

/** Sạp vải nhỏ: bàn thấp bốn chân (mặt cao 0,72) và ba cuộn vải màu nằm ngang xếp chồng (hai dưới, một trên). Khung bao đúng hộp PROP_SIZES `sap-vai`. */
function createClothStall(): BufferGeometry {
  const k = PROP_SIZES['sap-vai'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(slabN(0.1, 0.66, 0.1, sx * (hx - 0.08), 0, sz * (hz - 0.08)), WOOD_DARK));
  parts.push(paint(slabN(hx * 2, 0.06, hz * 2, 0, 0.66), WOOD));
  const r = 0.12;
  const len = hx * 2 - 0.24;
  parts.push(boltAt(r, len, CLOTH_COLORS[0], 0, 0.72 + r, -r));
  parts.push(boltAt(r, len, CLOTH_COLORS[3], 0, 0.72 + r, r));
  parts.push(boltAt(r, len, CLOTH_COLORS[2], 0, 0.72 + r + r * Math.sqrt(3), 0));
  return mergeGeometries(parts)!;
}

/** Chậu cây cảnh: đĩa lót tròn (bán kính 0,55), chậu sành loe miệng, tán lá hai khối 20 mặt dẹt và một cọc giữ cao 1,12. */
function createPotPlant(): BufferGeometry {
  const saucer = new CylinderGeometry(0.55, 0.55, 0.05, 16);
  saucer.translate(0, 0.025, 0);
  const pot = new CylinderGeometry(0.34, 0.24, 0.5, 12);
  pot.translate(0, 0.05 + 0.25, 0);
  const leaf = (x: number, y: number, z: number, s: number, hex: number) => {
    const g = new IcosahedronGeometry(1, 0);
    g.scale(s, s * 0.9, s);
    g.translate(x, y, z);
    return paint(toPlain(g), hex);
  };
  const stake = new CylinderGeometry(0.02, 0.02, 1.12 - 0.5, 5);
  stake.translate(0, 0.5 + (1.12 - 0.5) / 2, 0);
  return mergeGeometries([paint(toPlain(saucer), STONE), paint(toPlain(pot), CLAY), leaf(0, 0.78, 0, 0.42, 0x4f9a3c), leaf(0.18, 0.7, 0.14, 0.3, 0x6fb14a), paint(toPlain(stake), WOOD_DARK)])!;
}

/** Sào phơi sợi: hai trụ có chân ngang, xà ngang và sáu mớ sợi treo (kem, nâu vàng, chàm, đỏ). Khung bao đúng hộp PROP_SIZES `sao-soi`. */
function createYarnRack(): BufferGeometry {
  const k = PROP_SIZES['sao-soi'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    parts.push(paint(slabN(0.1, k.h, 0.1, sx * (hx - 0.05), 0), WOOD_DARK));
    parts.push(paint(slabN(0.1, 0.08, hz * 2, sx * (hx - 0.05), 0), WOOD_DARK)); // chân ngang
  }
  parts.push(paint(slabN(hx * 2, 0.08, 0.1, 0, k.h - 0.08), WOOD)); // xà ngang (đỉnh đúng chiều cao)
  const hanks = [CLOTH_COLORS[4], 0xc9a15a, INDIGO, MADDER, CLOTH_COLORS[4], INDIGO];
  hanks.forEach((hex, i) => parts.push(paint(slabN(0.16, 1.0, 0.06, -hx + 0.55 + i * ((hx * 2 - 1.1) / 5), k.h - 1.1), hex)));
  return mergeGeometries(parts)!;
}

/** Bỏ chỉ mục để gộp được với khối 20 mặt (không có chỉ mục) của three: mergeGeometries cần cả hai cùng có hay cùng không có chỉ mục. */
function toPlain(g: BufferGeometry): BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

const slabN = (w: number, h: number, d: number, dx = 0, dy = 0, dz = 0): BufferGeometry => toPlain(slab(w, h, d, dx, dy, dz));

/**
 * Đồ nhỏ gợi nghề quanh cổng làng (bước 8d), dựng bằng code, chân ở y = 0, đúng cỡ trong PROP_SIZES (có test): chồng giấy (hộp), cuộn vải (trụ đứng), khối đá (hộp), bàn đá khắc (mặt phiến và hai chân),
 * hòm gỗ (thân và nắp), thúng (trụ thon), chân giá phên phơi giấy (trụ mảnh). Kind khác (chum, rơm, hoa, đá) dựng ở nơi khác thì trả về null.
 */
export function createCraftProp(kind: PropKind): BufferGeometry | null {
  const k = PROP_SIZES[kind];
  switch (kind) {
    case 'giay':
      return slab(k.box!.hx * 2, k.h, k.box!.hz * 2);
    case 'vai': {
      const g = new CylinderGeometry(k.r, k.r, k.h, 16);
      g.translate(0, k.h / 2, 0);
      return g;
    }
    case 'khoi-da': {
      // tảng đá thô: khối 20 mặt kéo giãn cho vừa khung bao hx × h × hz (đỉnh khối 20 mặt nằm sát trục nên khung bao đúng bằng cỡ)
      const g = new IcosahedronGeometry(1, 0);
      const phi = (1 + Math.sqrt(5)) / 2;
      const ext = phi / Math.hypot(1, phi); // tọa độ lớn nhất của khối 20 mặt đơn vị
      g.scale(k.box!.hx / ext, k.h / 2 / ext, k.box!.hz / ext);
      g.translate(0, k.h / 2, 0);
      return g;
    }
    case 'ban-da': {
      // mặt phiến dày 0,14 đặt trên hai chân đá
      const top = 0.14;
      const legH = k.h - top;
      return mergeGeometries([slab(k.box!.hx * 2, top, k.box!.hz * 2, 0, legH), slab(0.22, legH, k.box!.hz * 1.6, -k.box!.hx * 0.7), slab(0.22, legH, k.box!.hz * 1.6, k.box!.hx * 0.7)]);
    }
    case 'hom':
      // thân cao 0,56 và nắp 0,14 rộng hơn một chút (nắp nằm trong khung bao của hòm)
      return mergeGeometries([slab(k.box!.hx * 2, k.h - 0.14, k.box!.hz * 2), slab(k.box!.hx * 2, 0.14, k.box!.hz * 2, 0, k.h - 0.14)]);
    case 'thung': {
      const g = new CylinderGeometry(k.r, k.r * 0.78, k.h, 16, 1, false);
      g.translate(0, k.h / 2, 0);
      return g;
    }
    case 'ban-chep': {
      // bàn chép sổ: mặt bàn dày 0,1 trên bốn chân gỗ
      const top = 0.1;
      const legH = k.h - top;
      const hx = k.box!.hx;
      const hz = k.box!.hz;
      const leg = (sx: number, sz: number) => slab(0.12, legH, 0.12, sx * (hx - 0.1), 0, sz * (hz - 0.1));
      return mergeGeometries([slab(hx * 2, top, hz * 2, 0, legH), leg(-1, -1), leg(-1, 1), leg(1, -1), leg(1, 1)]);
    }
    case 'so-chung': {
      // cuốn Sổ Chung đặt trên bàn (bìa tím): đáy ở y = lift
      const g = slab(k.box!.hx * 2, k.h, k.box!.hz * 2);
      g.translate(0, k.lift ?? 0, 0);
      return g;
    }
    case 'be-ngam': {
      // bể ngâm giấy: đáy và bốn thành đá, giữa lõm xuống để thấy mặt nước
      const hx = k.box!.hx;
      const hz = k.box!.hz;
      const t = 0.18;
      return mergeGeometries([slab(hx * 2, 0.45, hz * 2), slab(hx * 2, k.h - 0.45, t, 0, 0.45, -(hz - t / 2)), slab(hx * 2, k.h - 0.45, t, 0, 0.45, hz - t / 2), slab(t, k.h - 0.45, (hz - t) * 2, -(hx - t / 2), 0.45, 0), slab(t, k.h - 0.45, (hz - t) * 2, hx - t / 2, 0.45, 0)]);
    }
    case 'nuoc': {
      const g = slab(k.box!.hx * 2, k.h, k.box!.hz * 2);
      g.translate(0, k.lift ?? 0, 0);
      return g;
    }
    case 'chan': {
      const g = new CylinderGeometry(k.r, k.r, k.h, 8);
      g.translate(0, k.h / 2, 0);
      return g;
    }
    case 'coi-gia':
      return createPounder();
    case 'bep-do':
      return createStove();
    case 'dinh':
      return createPavilion();
    case 'chum-cham':
      return createDyeVat(INDIGO);
    case 'chum-do':
      return createDyeVat(MADDER);
    case 'dong-soi':
      return createYarnPile();
    case 'gia-vai':
      return createClothShelf();
    case 'sao-soi':
      return createYarnRack();
    case 'sap-vai':
      return createClothStall();
    case 'chau-canh':
      return createPotPlant();
    default:
      return null;
  }
}
