/**
 * Hình học do code dựng cho chợ phiên (không có model trong file): thuyền gỗ, mui thuyền, chum vại, đống rơm. Hàm tạo hình học
 * thuần của three (không cần canvas hay GPU), dựng một lần rồi dùng chung cho mọi bản nhân bản.
 */
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, LatheGeometry, Vector2, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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

/** Đống rơm: hình chóp bầu cao 2, bán kính chân 1. */
export function createHayStack(): BufferGeometry {
  const profile = [
    [0, 2],
    [0.18, 1.9],
    [0.5, 1.5],
    [0.84, 0.9],
    [0.98, 0.35],
    [1, 0],
    [0, 0],
  ].map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(profile, 14);
}

/** Hộp có đáy ở y = 0, tâm ở (0, h/2, 0), rộng w (x), sâu d (z), cao h; dịch thêm (dx, dy, dz). */
function slab(w: number, h: number, d: number, dx = 0, dy = 0, dz = 0): BufferGeometry {
  const g = new BoxGeometry(w, h, d);
  g.translate(dx, h / 2 + dy, dz);
  return g;
}

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
    case 'chan': {
      const g = new CylinderGeometry(k.r, k.r, k.h, 8);
      g.translate(0, k.h / 2, 0);
      return g;
    }
    default:
      return null;
  }
}
