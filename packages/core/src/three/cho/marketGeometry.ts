/**
 * Hình học do code dựng cho chợ phiên (không có model trong file): thuyền gỗ, mui thuyền, chum vại, đống rơm. Hàm tạo hình học
 * thuần của three (không cần canvas hay GPU), dựng một lần rồi dùng chung cho mọi bản nhân bản.
 */
import { BoxGeometry, BufferGeometry as Geometry, CatmullRomCurve3, CircleGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Path, Shape, SphereGeometry, TubeGeometry, Vector2, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createMulberry32 } from '../../lib/rng';
import { CLOTH_PALETTE } from '../village/clothPoles';
import { CRAFT_TEXTURE_OF, CRAFT_TEXTURE_TILE, applyBoxUV } from './craftTextures';
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

// ---------------------------------------------------------------------------
// Đồ nhỏ của Làng Khắc Dấu (mốc 3, bước L3): máy soi dấu (thân), bảng mẫu dấu, phiến đá xẻ, mái che xưởng, phôi gỗ, hòm thư, giá thư, chuồng bồ câu, chuồng gà, gà

const COPPER_DARK = 0x9c5a30;
const BRASS = 0xe0b25a;
const SOOT = 0x2b2420;
const THATCH = 0xc9a64f;
const BAMBOO = 0xc7a24e;
const PALE_WOOD = 0xd6b67c;
const MID_WOOD = 0xc09660;
const CREAM = 0xefe3c4;
const RED = 0xc2402f;
const COPPER_BODY = 0xdc8c4c;
const THATCH_PALE = 0xdcc27a;
const THATCH_DARK = 0xa88a3c;

/** Tô một hình học đặc (bỏ chỉ mục để gộp được) */
const solid = (g: BufferGeometry, hex: number): BufferGeometry => paint(toPlain(g), hex);
/** Hộp rộng w (x), cao h, sâu d (z), đáy ở y, tâm ngang (x, z) */
const boxAt = (w: number, h: number, d: number, x: number, y: number, z: number, hex: number): BufferGeometry => solid(slab(w, h, d, x, y, z), hex);
/** Trụ đứng bán kính r (rb là bán kính đáy nếu khác), cao h, đáy ở y, `seg` cạnh */
const cylAt = (r: number, h: number, x: number, y: number, z: number, hex: number, seg = 12, rb = r): BufferGeometry => solid(translated(new CylinderGeometry(r, rb, h, seg), x, y + h / 2, z), hex);
/** Trụ nằm dọc trục z (bán kính r, dài len), tâm (x, y, z) */
const cylAlongZ = (r: number, len: number, x: number, y: number, z: number, hex: number, seg = 14): BufferGeometry => {
  const g = new CylinderGeometry(r, r, len, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return solid(g, hex);
};
/** Trụ nằm dọc trục x */
const cylAlongX = (r: number, len: number, x: number, y: number, z: number, hex: number, seg = 10): BufferGeometry => {
  const g = new CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return solid(g, hex);
};
/** Khối 20 mặt kéo giãn (cục tròn thô: cánh gà, chim bồ câu) tâm (x, y, z) */
const blob = (sx: number, sy: number, sz: number, x: number, y: number, z: number, hex: number): BufferGeometry => {
  const g = new IcosahedronGeometry(1, 0);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return solid(g, hex);
};

/** Đường viền thân máy trong mặt phẳng x–y: hai vách thẳng từ y0 tới yc, nửa vòng tròn bán kính hw phía trên (mui tròn như hòm thư), mở rộng ra `grow`. Ngược chiều kim đồng hồ. */
function archShape(hw: number, y0: number, yc: number, grow = 0): Shape {
  const w = hw + grow;
  const s = new Shape();
  s.moveTo(-w, y0 - grow);
  s.lineTo(w, y0 - grow);
  s.lineTo(w, yc);
  s.absarc(0, yc, w, 0, Math.PI, false);
  s.lineTo(-w, y0 - grow);
  return s;
}

/** Cùng đường viền nhưng theo chiều kim đồng hồ (làm lỗ của đai). */
function archHole(hw: number, y0: number, yc: number): Path {
  const p = new Path();
  p.moveTo(-hw, y0);
  p.lineTo(-hw, yc);
  p.absarc(0, yc, hw, Math.PI, 0, true);
  p.lineTo(hw, y0);
  p.lineTo(-hw, y0);
  return p;
}

/** Khối đùn từ một đường viền (đã đặt giữa theo z), vát cạnh nhẹ cho mềm như vỏ đồng thật. */
function extruded(shape: Shape, depth: number, bevel: number, zCenter: number, hex: number): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
  g.translate(0, 0, zCenter - depth / 2);
  return solid(g, hex);
}

/** Đinh tán: nửa quả cầu nhỏ tâm (x, y, z). */
const rivet = (x: number, y: number, z: number, r = 0.055, hex = BRASS): BufferGeometry => solid(translated(new SphereGeometry(r, 6, 4), x, y, z), hex);

/** Hai đai thép đồng vòng quanh thân máy (vị trí z) và đường viền thân: dùng chung cho thân, đai và hàng đinh tán. */
const MACHINE_BAND_Z = [-0.42, 0.42] as const;

/** Bệ đá hai bậc của máy soi dấu (bán kính đúng bằng vật cản tròn của máy): vật riêng để vật liệu đá không bị ánh kim của đồng. Cao 0,5. */
function createInspectorBase(): BufferGeometry {
  const k = PROP_SIZES['de-may'];
  return mergeGeometries([cylAt(k.r, 0.3, 0, 0, 0, STONE, 16), cylAt(1.45, 0.2, 0, 0.3, 0, 0x7f7f78, 16)])!;
}

/**
 * Thân máy soi dấu (theo ảnh mẫu `source/objects/may-soi-dau.jpg`): thân hình trụ nằm ngang mui tròn như hòm thư, đồng ánh kim (màu sáng, vát cạnh; vật liệu kim loại có vân mài, xem `craftMaterial`), hai đai đồng sẫm
 * vòng quanh thân có hàng đinh tán, khung khe nhận thư có bốn đinh, đĩa đỡ phía sau từng bánh răng, ống dẫn cong và bình nhỏ trên mui, đế lồng đèn. Đặt trên bệ đá tròn bán kính 1,75 (vật cản tròn), cao 3,9.
 * Các bánh răng (một to ở mặt trước, hai ở hai bên, một nhỏ ăn khớp) và bóng đèn tròn KHÔNG nằm ở đây: chúng quay và nhấp nháy nên do `VillageFeatures` vẽ riêng, ở đây chỉ có trục, tay quay và đế của chúng.
 */
function createInspector(): BufferGeometry {
  const k = PROP_SIZES['may-soi-dau'];
  const parts: BufferGeometry[] = [
    cylAt(k.r, 0.04, 0, 0, 0, COPPER_DARK, 16), // đĩa mỏng nằm trong bệ đá (bệ là vật `de-may` riêng, vật liệu đá không kim loại); giữ đúng bán kính vật cản
    cylAt(1.28, 0.06, 0, 0.5, 0, COPPER_DARK, 16), // vành chân thân
    extruded(archShape(0.93, 0.5, 2.0), 1.46, 0.07, 0, COPPER_BODY), // thân: hộp đồng mui tròn, rộng 2,0, sâu 1,6, đỉnh mui ở 3,0
  ];
  // hai đai và hàng đinh tán dọc đường viền đai
  for (const z of MACHINE_BAND_Z) {
    const band = archShape(0.93, 0.46, 2.0, 0.1);
    band.holes.push(archHole(0.96, 0.46, 2.0));
    parts.push(extruded(band, 0.16, 0.015, z, COPPER_DARK));
    for (const y of [0.72, 1.08, 1.44, 1.8]) for (const sx of [-1, 1]) parts.push(rivet(sx * 1.03, y, z));
    for (let i = 1; i < 7; i++) {
      const a = (i / 7) * Math.PI;
      parts.push(rivet(Math.cos(a) * 1.035, 2.0 + Math.sin(a) * 1.035, z));
    }
  }
  parts.push(
    // khe nhận thư: khung đồng sẫm có viền, khe đen, khay hứng thư bằng đồng thau, bốn đinh ở góc khung
    boxAt(1.55, 0.5, 0.1, 0, 1.97, 0.78, COPPER_DARK),
    boxAt(1.2, 0.16, 0.12, 0, 2.14, 0.8, SOOT),
    boxAt(1.4, 0.06, 0.4, 0, 1.78, 0.8, BRASS),
    boxAt(1.28, 0.03, 0.05, 0, 2.3, 0.84, BRASS), // gờ trên khe
  );
  for (const sx of [-1, 1]) for (const y of [2.0, 2.4]) parts.push(rivet(sx * 0.72, y, 0.85, 0.045));
  // đĩa đỡ phía sau từng bánh răng, rồi trục (mặt trước và hai bên)
  parts.push(
    cylAlongZ(0.62, 0.06, 0, 1.2, 0.82, COPPER_DARK, 20),
    cylAlongX(0.5, 0.06, 1.03, 1.3, 0, COPPER_DARK, 18),
    cylAlongX(0.5, 0.06, -1.03, 1.3, 0, COPPER_DARK, 18),
    cylAlongX(0.36, 0.06, 1.03, 2.05, 0.1, COPPER_DARK, 14),
    cylAlongZ(0.13, 0.2, 0, 1.2, 0.86, BRASS),
    cylAlongX(0.1, 0.2, 1.06, 1.3, 0, BRASS),
    cylAlongX(0.1, 0.2, -1.06, 1.3, 0, BRASS),
    cylAlongX(0.1, 0.2, 1.06, 2.15, 0.1, BRASS),
    // tay quay bên phải
    cylAlongX(0.06, 0.45, 1.25, 1.75, -0.2, BRASS),
    boxAt(0.07, 0.5, 0.07, 1.46, 1.45, -0.2, BRASS),
    cylAlongX(0.07, 0.22, 1.55, 1.45, -0.2, COPPER_DARK),
  );
  // ống dẫn cong trên mui (ống tròn uốn từ mui lên rồi gập ngang) và bình nhỏ có nắp
  const pipe = new TubeGeometry(
    new CatmullRomCurve3([new Vector3(0.55, 2.7, -0.3), new Vector3(0.55, 3.1, -0.3), new Vector3(0.6, 3.3, -0.3), new Vector3(0.85, 3.37, -0.3)]),
    14,
    0.09,
    8,
    false,
  );
  parts.push(solid(pipe, COPPER_DARK), solid(translated(new SphereGeometry(0.09, 8, 6), 0.85, 3.37, -0.3), COPPER_DARK), cylAt(0.15, 0.08, 0.55, 2.74, -0.3, BRASS, 10));
  parts.push(cylAt(0.22, 0.32, -0.6, 2.82, -0.25, COPPER_DARK, 12), cylAt(0.12, 0.1, -0.6, 3.14, -0.25, BRASS, 10), cylAt(0.16, 0.04, -0.6, 3.2, -0.25, COPPER_DARK, 10));
  // đế lồng đèn trên đỉnh mui (đèn thủy tinh do VillageFeatures vẽ), chân và nắp lồng
  parts.push(cylAt(0.25, 0.12, 0, 3.0, 0, BRASS, 12));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(cylAt(0.025, 0.5, sx * 0.17, 3.12, sz * 0.17, BRASS, 6));
  parts.push(solid(translated(new ConeGeometry(0.26, 0.25, 12), 0, 3.62 + 0.125, 0), BRASS), cylAt(0.04, 0.03, 0, 3.87, 0, BRASS, 8));
  return mergeGeometries(parts)!;
}

/**
 * Bảng gỗ treo 6 tấm mẫu dấu công khai: hai trụ có chân đá, xà ngang và mái hiên nhỏ, ván lưng, sáu tấm gỗ sáng (hai hàng ba) treo bằng dây. Số ghi trên tấm do `VillageFeatures` vẽ (mặt chữ). Khung bao đúng hộp
 * PROP_SIZES `bang-mau` (6,6 × 0,8, cao 3,2); mặt trước quay +Z.
 */
export const STAMP_BOARD = {
  /** Tâm các tấm (x, y) trong hệ bảng, bề rộng và cao của tấm, độ lồi của mặt tấm so với mặt phẳng z = 0 */
  plaques: [
    { x: -1.85, y: 2.15 },
    { x: 0, y: 2.15 },
    { x: 1.85, y: 2.15 },
    { x: -1.85, y: 1.15 },
    { x: 0, y: 1.15 },
    { x: 1.85, y: 1.15 },
  ],
  w: 1.5,
  h: 0.9,
  front: 0.13,
} as const;
function createStampBoard(): BufferGeometry {
  const k = PROP_SIZES['bang-mau'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    parts.push(boxAt(0.7, 0.25, hz * 2, sx * (hx - 0.35), 0, 0, STONE)); // chân đá
    parts.push(boxAt(0.24, k.h - 0.25, 0.24, sx * (hx - 0.35), 0.25, 0, WOOD_DARK)); // trụ
  }
  parts.push(boxAt(hx * 2, 0.22, 0.3, 0, 2.55, 0, WOOD_DARK)); // xà ngang trên
  parts.push(boxAt(hx * 2 - 0.2, 0.1, hz * 2, 0, k.h - 0.1, 0, TILE)); // mái hiên (cao đúng chiều cao)
  parts.push(boxAt(hx * 2 - 0.9, 2.1, 0.1, 0, 0.5, 0, WOOD)); // ván lưng
  for (const q of STAMP_BOARD.plaques) {
    parts.push(boxAt(STAMP_BOARD.w, STAMP_BOARD.h, 0.07, q.x, q.y - STAMP_BOARD.h / 2, STAMP_BOARD.front - 0.035, PALE_WOOD));
    parts.push(boxAt(STAMP_BOARD.w + 0.1, 0.07, 0.1, q.x, q.y + STAMP_BOARD.h / 2 - 0.03, STAMP_BOARD.front - 0.04, WOOD_DARK)); // thanh ngang trên tấm
    parts.push(boxAt(0.04, 0.2, 0.04, q.x - 0.4, q.y + STAMP_BOARD.h / 2 + 0.04, STAMP_BOARD.front - 0.04, 0xe8dcc0)); // dây treo
    parts.push(boxAt(0.04, 0.2, 0.04, q.x + 0.4, q.y + STAMP_BOARD.h / 2 + 0.04, STAMP_BOARD.front - 0.04, 0xe8dcc0));
  }
  return mergeGeometries(parts)!;
}

/** Phiến đá đang xẻ: hai giá gỗ, phiến đá dày 0,3 (3,4 × 1,8) có đường rạch xẻ sẫm, hai cái nêm sắt và cái búa nằm trên phiến. Khung bao đúng hộp PROP_SIZES `phien-da` (3,4 × 1,8, cao 1,3). */
function createSlabTrestle(): BufferGeometry {
  const k = PROP_SIZES['phien-da'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const legH = 0.85;
  const top = legH + 0.3;
  return mergeGeometries([
    boxAt(0.3, legH, 1.5, -hx * 0.62, 0, 0, WOOD_DARK),
    boxAt(0.3, legH, 1.5, hx * 0.62, 0, 0, WOOD_DARK),
    boxAt(hx * 2, 0.3, hz * 2, 0, legH, 0, STONE),
    boxAt(hx * 1.7, 0.03, 0.07, 0, top, 0.12, 0x4a4a46), // đường rạch xẻ
    boxAt(0.14, 0.12, 0.1, -0.8, top, 0.12, 0x3f3f3c), // nêm
    boxAt(0.14, 0.12, 0.1, 0.4, top, 0.12, 0x3f3f3c),
    cylAlongX(0.035, 0.5, 0.95, top + 0.035, 0.5, WOOD_DARK, 6), // cán búa
    boxAt(0.14, k.h - top, 0.14, 0.75, top, 0.5, 0x4a4a46), // đầu búa (đỉnh đúng chiều cao)
  ])!;
}

/**
 * Mái che xưởng: bốn cột tre, xà dọc và ngang, mái tranh bốn mái vươn ra hết khung (vật liệu có vân rơm, xem `craftMaterial`), mép mái có hàng bó tranh xòe xuống so le hai màu, đỉnh có nắp tranh sẫm.
 * Khung bao đúng hộp PROP_SIZES `mai-che` (6,4 × 4,8, cao 3,6). Không có vật cản (đi dưới mái được).
 */
function createShelter(): BufferGeometry {
  const k = PROP_SIZES['mai-che'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const colH = 2.55;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(cylAt(0.14, colH, sx * (hx - 0.45), 0, sz * (hz - 0.45), BAMBOO, 8));
  for (const sz of [-1, 1]) parts.push(boxAt(hx * 2 - 0.5, 0.18, 0.2, 0, colH - 0.18, sz * (hz - 0.45), WOOD_DARK));
  for (const sx of [-1, 1]) parts.push(boxAt(0.2, 0.18, hz * 2 - 0.5, sx * (hx - 0.45), colH - 0.18, 0, WOOD_DARK));
  parts.push(solid(pyramid(hx * 2, hz * 2, k.h - colH, colH), THATCH));
  // hàng bó tranh xòe xuống ở mép mái: so le hai màu, mỗi bó hơi lệch và dài ngắn khác nhau
  const rng = createMulberry32(7301);
  const fringe = (x: number, z: number, wide: number, deep: number) => {
    const len = 0.22 + rng() * 0.2;
    parts.push(boxAt(wide, len, deep, x, colH - len + 0.04, z, rng() < 0.5 ? THATCH : THATCH_PALE));
  };
  for (let x = -hx + 0.32; x <= hx - 0.3; x += 0.44) for (const sz of [-1, 1]) fringe(x + (rng() - 0.5) * 0.06, sz * (hz - 0.07), 0.36, 0.12);
  for (let z = -hz + 0.32; z <= hz - 0.3; z += 0.44) for (const sx of [-1, 1]) fringe(sx * (hx - 0.07), z + (rng() - 0.5) * 0.06, 0.12, 0.36);
  // nắp đỉnh mái và hai dây tre buộc ngang sườn mái
  parts.push(solid(pyramid(1.0, 0.8, 0.42, k.h - 0.42), THATCH_DARK));
  return mergeGeometries(parts)!;
}

/** Chồng phôi gỗ chưa khắc: bốn lớp ván mỏng xếp chéo (ngang rồi dọc). Khung bao đúng hộp PROP_SIZES `phoi-go` (1,4 × 0,9, cao 0,6). */
function createBlankStack(): BufferGeometry {
  const k = PROP_SIZES['phoi-go'];
  const parts: BufferGeometry[] = [];
  for (let layer = 0; layer < 4; layer++) {
    const y = layer * 0.15;
    const hex = layer % 2 ? MID_WOOD : PALE_WOOD;
    if (layer % 2 === 0) for (const z of [-0.31, 0, 0.31]) parts.push(boxAt(k.box!.hx * 2, 0.15, 0.28, 0, y, z, hex));
    else for (const x of [-0.5, -0.17, 0.17, 0.5]) parts.push(boxAt(0.3, 0.15, k.box!.hz * 2, x, y, 0, hex));
  }
  return mergeGeometries(parts)!;
}

/** Hòm thư gỗ trên cột: đế đá, cột, thân hòm mái chóp, khe thư và cờ đỏ. Khung bao đúng hộp PROP_SIZES `hom-thu` (0,8 × 0,7, cao 1,6). */
function createMailbox(): BufferGeometry {
  const k = PROP_SIZES['hom-thu'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  return mergeGeometries([
    boxAt(hx * 2, 0.08, hz * 2, 0, 0, 0, STONE),
    boxAt(0.14, 0.9, 0.14, 0, 0.08, 0, WOOD_DARK),
    boxAt(hx * 2, 0.45, hz * 1.75, 0, 0.98, 0, WOOD),
    solid(pyramid(hx * 2, hz * 1.75, k.h - 1.43, 1.43), TILE),
    boxAt(0.5, 0.05, 0.03, 0, 1.3, hz * 0.875, SOOT), // khe thư
    boxAt(0.06, 0.32, 0.05, hx - 0.03, 1.1, 0.05, RED), // cờ
    boxAt(0.14, 0.1, 0.05, hx - 0.03 - 0.04, 1.34, 0.05, RED),
  ])!;
}

/** Giá xếp thư: bốn cột, ba tầng ván, mỗi tầng vài cuộn thư buộc dây đỏ và xấp thư phẳng. Khung bao đúng hộp PROP_SIZES `gia-thu` (2,4 × 0,9, cao 1,6). */
function createLetterRack(): BufferGeometry {
  const k = PROP_SIZES['gia-thu'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(boxAt(0.1, k.h, 0.1, sx * (hx - 0.05), 0, sz * (hz - 0.05), WOOD_DARK));
  [0.3, 0.75, 1.2].forEach((y, i) => {
    parts.push(boxAt(hx * 2 - 0.1, 0.05, hz * 2 - 0.1, 0, y - 0.05, 0, WOOD));
    for (let j = 0; j < 5; j++) {
      const x = -hx + 0.5 + j * ((hx * 2 - 1.0) / 4);
      const z = ((i + j) % 2 ? 0.12 : -0.12);
      if ((i + j) % 3 === 2) parts.push(boxAt(0.34, 0.04 * (2 + (j % 3)), 0.24, x, y, z, CREAM)); // xấp thư phẳng
      else {
        parts.push(cylAlongX(0.075, 0.46, x, y + 0.075, z, CREAM, 8));
        parts.push(cylAlongX(0.082, 0.05, x, y + 0.075, z, RED, 8)); // dây buộc
      }
    }
  });
  parts.push(boxAt(hx * 2, 0.08, hz * 2, 0, k.h - 0.08, 0, WOOD)); // nóc giá
  return mergeGeometries(parts)!;
}

/** Chuồng bồ câu đưa thư: đế đá, cột cao, sàn, nhà gỗ có ba lỗ chui và mái ngói chóp, thanh đậu phía trước với ba con bồ câu (thân tĩnh; đầu gật do `VillageFeatures`). Khung bao đúng hộp PROP_SIZES `chuong-bo-cau` (2,0 × 2,0, cao 3,8). */
function createDovecote(): BufferGeometry {
  const k = PROP_SIZES['chuong-bo-cau'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [
    boxAt(hx * 2, 0.12, hz * 2, 0, 0, 0, STONE),
    boxAt(0.24, 2.0, 0.24, 0, 0.12, 0, WOOD_DARK),
    boxAt(1.9, 0.1, 1.9, 0, 2.1, 0, WOOD),
    boxAt(1.4, 1.0, 1.4, 0, 2.2, 0, 0xcaa56a),
    solid(pyramid(1.9, 1.9, 0.6, 3.2), TILE),
    boxAt(1.4, 0.04, 0.12, 0, 2.28, 0.76, WOOD_DARK), // thanh đậu
    boxAt(0.9, 0.04, 0.04, 0, 2.34, 0.88, WOOD_DARK),
  ];
  for (const x of [-0.42, 0, 0.42]) parts.push(boxAt(0.26, 0.3, 0.03, x, 2.62, 0.71, SOOT)); // lỗ chui
  for (const p of DOVECOTE_PIGEONS) parts.push(...pigeonBody(p.x, p.y, p.z, p.body));
  return mergeGeometries(parts)!;
}

/** Chuồng gà tre: sàn trên bốn chân, nhà phên tre có cửa và mái tranh thấp, hai bậc thang, một đoạn rào thấp phía trước bên trái. Khung bao đúng hộp PROP_SIZES `chuong-ga` (3,4 × 2,6, cao 1,9). */
function createCoop(): BufferGeometry {
  const k = PROP_SIZES['chuong-ga'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(boxAt(0.12, 0.45, 0.12, sx * (hx - 0.1), 0, sz * (hz - 0.1), WOOD_DARK));
  parts.push(boxAt(hx * 2, 0.1, hz * 2, 0, 0.45, 0, WOOD));
  parts.push(boxAt(1.9, 1.0, 1.7, 0.4, 0.55, -0.3, BAMBOO)); // nhà phên
  for (let i = 0; i < 7; i++) parts.push(boxAt(0.04, 1.0, 0.04, -0.45 + i * 0.3, 0.55, 0.56, WOOD_DARK)); // nan đứng ở mặt trước
  parts.push(boxAt(0.55, 0.6, 0.04, 0.4, 0.55, 0.57, SOOT)); // cửa chui
  parts.push(translated(solid(pyramid(2.5, 2.0, k.h - 1.55, 1.55), THATCH), 0.4, 0, -0.3));
  parts.push(boxAt(0.5, 0.06, 0.34, 0.4, 0.2, 0.78, WOOD), boxAt(0.5, 0.06, 0.34, 0.4, 0.05, 1.05, WOOD)); // hai bậc thang
  for (const x of [-1.6, -1.05, -0.5]) parts.push(boxAt(0.06, 0.55, 0.06, x, 0.55, hz - 0.1, WOOD_DARK)); // rào thấp
  parts.push(boxAt(1.2, 0.05, 0.05, -1.05, 0.95, hz - 0.1, BAMBOO), boxAt(1.2, 0.05, 0.05, -1.05, 0.72, hz - 0.1, BAMBOO));
  return mergeGeometries(parts)!;
}

/** Con gà đứng trên ổ rơm (tròn bán kính 0,38): thân và đuôi cục tròn, đầu, mỏ, mào đỏ, hai chân. Màu thân nhân thêm `tint` của bố cục. Cao 0,75. */
function createHen(): BufferGeometry {
  const k = PROP_SIZES.ga;
  return mergeGeometries([
    cylAt(k.r, 0.06, 0, 0, 0, 0xd8b860, 16), // ổ rơm
    cylAt(0.018, 0.2, -0.07, 0.06, 0.02, 0xd9902c, 5),
    cylAt(0.018, 0.2, 0.07, 0.06, 0.02, 0xd9902c, 5),
    blob(0.2, 0.17, 0.26, 0, 0.3, 0, 0xe3a23c), // thân
    blob(0.1, 0.15, 0.12, 0, 0.4, -0.25, 0xb87424), // đuôi
    blob(0.09, 0.1, 0.1, 0, 0.55, 0.2, 0xe3a23c), // đầu
    solid(translated(new ConeGeometry(0.035, 0.1, 6).rotateX(Math.PI / 2), 0, 0.54, 0.31), 0xe8b030), // mỏ
    blob(0.025, 0.07, 0.07, 0, k.h - 0.07 * 0.85065, 0.2, RED), // mào (đỉnh đúng chiều cao)
    blob(0.015, 0.04, 0.03, 0, 0.5, 0.29, RED), // yếm
  ])!;
}

/** Đặt lại hình học vừa khít hộp hx × hz (rộng 2hx theo x, 2hz theo z, tâm ở gốc) và cao đúng h với đáy ở y = 0: cho các đồ rải ngẫu nhiên (đá vụn) và khung ghép (khung cưa). */
function fitBox(g: BufferGeometry, hx: number, hz: number, h: number): BufferGeometry {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.max.x + b.min.x) / 2, -b.min.y, -(b.max.z + b.min.z) / 2);
  g.scale((hx * 2) / (b.max.x - b.min.x), h / (b.max.y - b.min.y), (hz * 2) / (b.max.z - b.min.z));
  g.boundingBox = null;
  return g;
}

/** Hộp xoay quanh trục y một góc, tâm ngang (x, z), đáy ở y. */
const boxYaw = (w: number, h: number, d: number, x: number, y: number, z: number, yaw: number, hex: number): BufferGeometry => {
  const g = new BoxGeometry(w, h, d);
  g.rotateY(yaw);
  g.translate(x, y + h / 2, z);
  return solid(g, hex);
};

/** Năm sắc đá cho các khối: xám ấm, xám lạnh, cát, xám sẫm, nâu nhạt. */
const STONE_TINTS = [0xa8a49a, 0x9a9ea0, 0xb2a58f, 0x8f8f88, 0xa59a8c] as const;

/** Bàn đá khắc dấu (ba biến thể xếp dụng cụ khác nhau): mặt phiến đá trên hai chân đá, trên mặt có con dấu đang khắc (khối gỗ có hoa văn nổi), đục, búa gỗ, khay mực đỏ, vụn gỗ và một hai con dấu đã khắc xong. Khung bao: hộp PROP_SIZES `ban-khac` (như bàn đá), cao 1,05 (con dấu đã khắc xong cao nhất). */
function createStampBench(variant: number): BufferGeometry {
  const k = PROP_SIZES['ban-khac'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const top = 0.14;
  const legH = 0.8 - top;
  const rng = createMulberry32(6100 + variant * 17);
  const parts: BufferGeometry[] = [
    boxAt(hx * 2, top, hz * 2, 0, legH, 0, STONE_TINTS[(variant + 1) % STONE_TINTS.length]),
    boxAt(0.22, legH, hz * 1.6, -hx * 0.7, 0, 0, STONE_TINTS[variant % STONE_TINTS.length]),
    boxAt(0.22, legH, hz * 1.6, hx * 0.7, 0, 0, STONE_TINTS[(variant + 2) % STONE_TINTS.length]),
  ];
  const y0 = 0.8;
  // các chỗ đặt (theo biến thể): con dấu đang khắc, khay mực, con dấu xong (đứng), đục, búa
  const slots = [
    [-0.55, -0.12],
    [-0.05, 0.12],
    [0.45, -0.1],
    [0.1, -0.28],
    [-0.4, 0.26],
  ];
  const order = [0, 1, 2, 3, 4].sort(() => rng() - 0.5);
  const at = (i: number) => slots[order[i]];
  // con dấu đang khắc: khối gỗ vuông, mặt trên có hoa văn nổi (các ô sẫm)
  const [sx, sz] = at(0);
  parts.push(boxYaw(0.17, 0.19, 0.17, sx, y0, sz, rng() * 0.6, MID_WOOD));
  for (let i = 0; i < 4; i++) parts.push(boxAt(0.05, 0.02, 0.05, sx + (i % 2 ? 0.04 : -0.04), y0 + 0.19, sz + (i < 2 ? 0.04 : -0.04), SOOT));
  // khay mực đỏ: khung gỗ sẫm, mặt mực đỏ
  const [kx, kz] = at(1);
  parts.push(boxAt(0.27, 0.05, 0.2, kx, y0, kz, WOOD_DARK), boxAt(0.2, 0.012, 0.13, kx, y0 + 0.05, kz, RED));
  // con dấu đã khắc xong đứng: đế vuông và cán tròn (đỉnh đúng chiều cao bàn)
  const [fx, fz] = at(2);
  parts.push(boxAt(0.15, 0.1, 0.15, fx, y0, fz, PALE_WOOD), cylAt(0.04, 0.15, fx, y0 + 0.1, fz, MID_WOOD, 8));
  if (variant !== 1) {
    const [gx, gz] = at(3);
    parts.push(boxAt(0.12, 0.08, 0.12, gx, y0, gz, MID_WOOD), cylAt(0.032, 0.1, gx, y0 + 0.08, gz, PALE_WOOD, 8));
  }
  // đục: lưỡi thép và cán gỗ nằm nghiêng nhẹ; búa gỗ: đầu trụ nằm ngang và cán
  const [cx, cz] = at(variant === 1 ? 3 : 4);
  const chisel = new BoxGeometry(0.035, 0.02, 0.22);
  chisel.rotateY(0.5 + rng());
  chisel.translate(cx, y0 + 0.012, cz);
  parts.push(solid(chisel, 0x8c9298));
  const handle = new CylinderGeometry(0.024, 0.024, 0.14, 8);
  handle.rotateX(Math.PI / 2);
  handle.rotateY(0.5 + rng());
  handle.translate(cx - 0.06, y0 + 0.024, cz - 0.1);
  parts.push(solid(handle, WOOD_DARK));
  const mx = variant === 2 ? -0.2 : 0.38;
  parts.push(cylAlongX(0.055, 0.16, mx, y0 + 0.055, 0.3, WOOD_DARK, 10), boxAt(0.3, 0.035, 0.035, mx + 0.17, y0, 0.3, MID_WOOD));
  // vụn gỗ
  for (let i = 0; i < 5; i++) parts.push(boxYaw(0.04 + rng() * 0.03, 0.012, 0.025, (rng() - 0.5) * 1.3, y0, (rng() - 0.5) * 0.7, rng() * 3, PALE_WOOD));
  return mergeGeometries(parts)!;
}

/** Giá gỗ bày con dấu đã khắc xong: bốn cột, ba tầng ván, mỗi tầng một hàng con dấu (đứng, hoặc nằm ngửa mặt khắc đỏ, hoặc để trống). Khung bao đúng hộp PROP_SIZES `gia-dau` (1,8 × 0,7, cao 1,35). */
function createStampRack(): BufferGeometry {
  const k = PROP_SIZES['gia-dau'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const rng = createMulberry32(6200);
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(boxAt(0.09, k.h, 0.09, sx * (hx - 0.045), 0, sz * (hz - 0.045), WOOD_DARK));
  [0.3, 0.68, 1.06].forEach((y, row) => {
    parts.push(boxAt(hx * 2 - 0.08, 0.05, hz * 2 - 0.06, 0, y - 0.05, 0, row % 2 ? WOOD : MID_WOOD));
    for (let j = 0; j < 6; j++) {
      const x = -hx + 0.32 + j * ((hx * 2 - 0.64) / 5) + (rng() - 0.5) * 0.06;
      const z = (rng() - 0.5) * 0.18;
      const roll = rng();
      if (roll < 0.14) continue; // chỗ trống
      const base = [PALE_WOOD, MID_WOOD, 0xb5865a][Math.floor(rng() * 3)];
      if (roll < 0.7) parts.push(boxAt(0.14, 0.09, 0.14, x, y, z, base), cylAt(0.034, 0.1, x, y + 0.09, z, WOOD_DARK, 8));
      else parts.push(boxAt(0.15, 0.07, 0.15, x, y, z, base), boxAt(0.1, 0.012, 0.1, x, y + 0.07, z, RED)); // nằm ngửa mặt khắc có mực đỏ
    }
  });
  parts.push(boxAt(hx * 2, 0.05, hz * 2, 0, k.h - 0.05, 0, WOOD)); // nóc giá
  return mergeGeometries(parts)!;
}

/** Khối đá vuông đã xẻ xếp chồng: lớp dưới hai khối dài theo z, lớp giữa hai khối dài theo x, lớp trên một khối; mỗi khối một sắc đá, hơi lệch. Khung bao đúng hộp PROP_SIZES `da-xe` (1,8 × 1,4, cao 1,2). */
function createStoneStack(): BufferGeometry {
  const k = PROP_SIZES['da-xe'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const rng = createMulberry32(6300);
  const tint = () => STONE_TINTS[Math.floor(rng() * STONE_TINTS.length)];
  const parts: BufferGeometry[] = [
    boxAt(hx - 0.03, 0.42, hz * 2, -hx / 2 - 0.015, 0, 0, tint()),
    boxAt(hx - 0.03, 0.42, hz * 2, hx / 2 + 0.015, 0, 0, tint()),
    boxAt(hx * 1.78, 0.4, hz - 0.04, 0.02, 0.42, -hz / 2 - 0.02, tint()),
    boxAt(hx * 1.7, 0.4, hz - 0.04, -0.03, 0.42, hz / 2 + 0.02, tint()),
    boxYaw(hx * 1.0, k.h - 0.82, hz * 0.8, 0.0, 0.82, 0.0, 0.08, tint()),
  ];
  // vết đục trên mặt khối lớp giữa
  for (let i = 0; i < 4; i++) parts.push(boxAt(0.5 + rng() * 0.3, 0.012, 0.025, -0.4 + i * 0.25, 0.82, -hz / 2 - 0.02 + (rng() - 0.5) * 0.2, 0x6f6c66));
  return mergeGeometries(parts)!;
}

/** Đống đá vụn: mười sáu mảnh đá nhỏ nhiều cỡ nhiều sắc rơi quanh chỗ đục, thấp. Khung bao đúng hộp PROP_SIZES `da-vun` (1,6 × 1,2, cao 0,32). */
function createRubble(): BufferGeometry {
  const k = PROP_SIZES['da-vun'];
  const rng = createMulberry32(6400);
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const g = new IcosahedronGeometry(1, 0);
    const s = 0.07 + rng() * 0.15;
    g.scale(s * (0.8 + rng() * 0.6), s * (0.45 + rng() * 0.4), s * (0.8 + rng() * 0.6));
    g.rotateY(rng() * 6.28);
    const r = Math.sqrt(rng());
    const a = rng() * 6.28;
    g.translate(Math.cos(a) * r * k.box!.hx * 0.85, s * 0.35, Math.sin(a) * r * k.box!.hz * 0.85);
    parts.push(solid(g, STONE_TINTS[Math.floor(rng() * STONE_TINTS.length)]));
  }
  return fitBox(mergeGeometries(parts)!, k.box!.hx, k.box!.hz, k.h);
}

/** Khung cưa đá bằng gỗ: hai khung chữ A ở hai đầu nối xà ngang trên, hai thanh đỡ dọc, khối đá đã xẻ một nửa nằm trên thanh đỡ, lưỡi cưa thép dài hai cán gỗ đặt trong rãnh cưa. Khung bao đúng hộp PROP_SIZES `khung-cua-da` (2,6 × 1,3, cao 1,75). */
function createSawFrame(): BufferGeometry {
  const k = PROP_SIZES['khung-cua-da'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const parts: BufferGeometry[] = [];
  const topY = k.h - 0.12;
  const dz = hz - 0.08 - 0.1;
  const dy = topY - 0.05;
  const len = Math.hypot(dz, dy);
  const angle = Math.atan2(dz, dy);
  for (const sx of [-1, 1]) {
    const x = sx * (hx - 0.1);
    for (const sz of [-1, 1]) {
      const leg = new BoxGeometry(0.11, len, 0.11);
      leg.rotateX(-sz * angle);
      leg.translate(x, 0.05 + dy / 2, sz * ((hz - 0.08 + 0.1) / 2));
      parts.push(solid(leg, WOOD_DARK));
    }
    parts.push(boxAt(0.1, 0.08, hz * 1.5, x, 0.36, 0, WOOD)); // thanh giằng chân
  }
  parts.push(boxAt(hx * 2, 0.12, 0.14, 0, topY, 0, WOOD_DARK)); // xà ngang trên
  for (const sz of [-1, 1]) parts.push(boxAt(hx * 2 - 0.2, 0.08, 0.1, 0, 0.6, sz * 0.32, WOOD)); // hai thanh đỡ khối đá
  // khối đá đang xẻ và rãnh cưa sẫm
  parts.push(boxAt(1.7, 0.42, 0.66, -0.15, 0.68, 0, 0xa59a8c), boxAt(1.2, 0.02, 0.03, 0.1, 1.1, 0, 0x4a4844));
  // lưỡi cưa thép dài, hai cán gỗ dựng ở hai đầu
  parts.push(boxAt(1.1, 0.14, 0.015, 0.2, 1.11, 0, 0x9aa0a6));
  for (const sx of [-1, 1]) parts.push(boxAt(0.07, 0.3, 0.07, 0.2 + sx * 0.6, 1.11, 0, WOOD_DARK));
  return fitBox(mergeGeometries(parts)!, hx, hz, k.h);
}

/** Bàn viết thư của trạm: mặt bàn trên bốn chân, một xấp bao thư buộc dây đỏ (dây đan chữ thập và nút), hai bao thư rời, lọ mực và bút lông. Khung bao: hộp PROP_SIZES `ban-thu` (2,2 × 1,1), cao 1,1 (ngọn bút lông). */
function createLetterTable(): BufferGeometry {
  const k = PROP_SIZES['ban-thu'];
  const hx = k.box!.hx;
  const hz = k.box!.hz;
  const topT = 0.1;
  const legH = 0.85 - topT;
  const parts: BufferGeometry[] = [boxAt(hx * 2, topT, hz * 2, 0, legH, 0, WOOD)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(boxAt(0.12, legH, 0.12, sx * (hx - 0.1), 0, sz * (hz - 0.1), WOOD_DARK));
  const y0 = 0.85;
  // xấp bao thư buộc dây
  for (let i = 0; i < 4; i++) parts.push(boxYaw(0.38, 0.028, 0.27, -0.45 + (i % 2 ? 0.012 : -0.01), y0 + i * 0.028, 0.05, (i - 1.5) * 0.05, i === 3 ? 0xf6efd8 : CREAM));
  const top = y0 + 4 * 0.028;
  parts.push(boxAt(0.4, 0.016, 0.03, -0.45, top, 0.05, RED), boxAt(0.03, 0.016, 0.29, -0.45, top, 0.05, RED), boxAt(0.07, 0.03, 0.07, -0.45, top + 0.016, 0.05, 0xa8301f));
  // hai bao thư rời, một cái có dấu sáp đỏ
  parts.push(boxYaw(0.34, 0.012, 0.24, 0.15, y0, 0.2, 0.4, CREAM), boxYaw(0.34, 0.012, 0.24, 0.3, y0 + 0.012, -0.15, -0.3, 0xf6efd8), boxAt(0.05, 0.01, 0.05, 0.3, y0 + 0.024, -0.15, RED));
  // lọ mực và bút lông (ngọn bút đúng chiều cao)
  parts.push(cylAt(0.065, 0.1, 0.78, y0, 0.15, SOOT, 10), cylAt(0.012, 0.1, 0.78, y0 + 0.1, 0.15, WOOD_DARK, 6), solid(translated(new ConeGeometry(0.035, 0.05, 6), 0.78, y0 + 0.2 + 0.025, 0.15), 0xf2f1ec));
  return mergeGeometries(parts)!;
}

/** Chim bồ câu đậu trên thanh của chuồng (tọa độ trong hệ chuồng, tỉ lệ 1): chân đứng ở (x, y, z), quay mặt +z. Đầu và mỏ không nằm trong hình tĩnh mà do `VillageFeatures` vẽ để gật đầu quanh cổ. */
export const DOVECOTE_PIGEONS = [
  { x: -0.3, y: 2.32, z: 0.76, body: 0xf2f1ec },
  { x: 0.05, y: 2.32, z: 0.76, body: 0xb4b4bc },
  { x: 0.33, y: 2.32, z: 0.76, body: 0xdadad6 },
] as const;
/** Chỗ cổ bồ câu (tâm xoay của đầu) so với chân chim. */
export const PIGEON_NECK = { y: 0.2, z: 0.09 } as const;

/** Thân một con bồ câu (không đầu): hai chân, thân, cổ ánh tím, cánh sẫm và đuôi vểnh. */
function pigeonBody(x: number, y: number, z: number, hex: number): BufferGeometry[] {
  return [
    cylAt(0.012, 0.09, x - 0.035, y, z, 0xd9788c, 5),
    cylAt(0.012, 0.09, x + 0.035, y, z, 0xd9788c, 5),
    blob(0.1, 0.085, 0.17, x, y + 0.14, z - 0.01, hex),
    blob(0.1, 0.07, 0.12, x, y + 0.16, z - 0.04, mixHex(hex, 0x6c6c78, 0.35)),
    blob(0.065, 0.075, 0.075, x, y + 0.2, z + 0.07, mixHex(hex, 0x6c86b0, 0.4)),
    solid(translated(new ConeGeometry(0.05, 0.2, 5).rotateX(-Math.PI / 2 - 0.35), x, y + 0.2, z - 0.24), mixHex(hex, 0x50505c, 0.3)),
  ];
}

/** Đầu bồ câu với mỏ, tâm xoay (cổ) ở gốc, mặt hướng +z: dùng một InstancedMesh cho mọi con của mọi chuồng. */
export function createPigeonHead(): BufferGeometry {
  return mergeGeometries([blob(0.052, 0.05, 0.06, 0, 0.035, 0.035, 0xc8c8d0), solid(translated(new ConeGeometry(0.016, 0.05, 6).rotateX(Math.PI / 2), 0, 0.03, 0.1), 0xd9a05a), blob(0.012, 0.012, 0.012, 0.03, 0.05, 0.065, SOOT), blob(0.012, 0.012, 0.012, -0.03, 0.05, 0.065, SOOT)])!;
}

/**
 * Đồ nhỏ gợi nghề quanh cổng làng (bước 8d), dựng bằng code, chân ở y = 0, đúng cỡ trong PROP_SIZES (có test); loại có texture (`CRAFT_TEXTURE_OF`) được đặt lại toạ độ ảnh theo mét thật. Kind khác (chum, rơm, hoa, đá) dựng ở nơi khác thì trả về null.
 */
export function createCraftProp(kind: PropKind): BufferGeometry | null {
  const g = buildCraftProp(kind);
  const tex = CRAFT_TEXTURE_OF[kind];
  if (g && tex) applyBoxUV(g, CRAFT_TEXTURE_TILE[tex]);
  return g;
}

/** Dựng hình học từng loại (chưa đặt toạ độ ảnh). */
function buildCraftProp(kind: PropKind): BufferGeometry | null {
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
    case 'may-soi-dau':
      return createInspector();
    case 'de-may':
      return createInspectorBase();
    case 'bang-mau':
      return createStampBoard();
    case 'phien-da':
      return createSlabTrestle();
    case 'mai-che':
      return createShelter();
    case 'phoi-go':
      return createBlankStack();
    case 'hom-thu':
      return createMailbox();
    case 'gia-thu':
      return createLetterRack();
    case 'chuong-bo-cau':
      return createDovecote();
    case 'chuong-ga':
      return createCoop();
    case 'ga':
      return createHen();
    case 'ban-khac':
      return createStampBench(0);
    case 'ban-khac2':
      return createStampBench(1);
    case 'ban-khac3':
      return createStampBench(2);
    case 'gia-dau':
      return createStampRack();
    case 'da-xe':
      return createStoneStack();
    case 'da-vun':
      return createRubble();
    case 'khung-cua-da':
      return createSawFrame();
    case 'ban-thu':
      return createLetterTable();
    default:
      return null;
  }
}
