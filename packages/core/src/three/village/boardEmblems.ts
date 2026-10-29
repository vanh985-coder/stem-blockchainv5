import { BoxGeometry, Float32BufferAttribute, TorusGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createScrollGeometry } from './KnowScrolls';
import type { PillarKind } from './boardPillar';

const paint = (g: BufferGeometry, r: number, gr: number, b: number): BufferGeometry => {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([r, gr, b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  g.deleteAttribute('uv');
  return g;
};

function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(
    parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  ) as BufferGeometry;
  for (const p of parts) p.dispose();
  return merged;
}

/** Vòng tròn xanh có dấu tích trắng (màn đã xong), nằm trong mặt phẳng xy, quay mặt về +z. */
function createTickGeometry(): BufferGeometry {
  const ring = new TorusGeometry(0.42, 0.07, 6, 20);
  const short = new BoxGeometry(0.1, 0.26, 0.1);
  short.rotateZ(Math.PI / 4);
  short.translate(-0.13, -0.04, 0);
  const long = new BoxGeometry(0.1, 0.5, 0.1);
  long.rotateZ(-Math.PI / 4);
  long.translate(0.08, 0.04, 0);
  return merge([paint(ring, 0.55, 0.95, 0.55), paint(short, 1, 1, 1), paint(long, 1, 1, 1)]);
}

/** Ổ khóa xám xanh (màn còn khóa hoặc sắp ra mắt): thân hộp và quai nửa vòng. */
function createLockGeometry(): BufferGeometry {
  const body = new BoxGeometry(0.56, 0.44, 0.2);
  body.translate(0, -0.1, 0);
  const shackle = new TorusGeometry(0.17, 0.05, 6, 12, Math.PI);
  shackle.translate(0, 0.12, 0);
  const hole = new BoxGeometry(0.08, 0.16, 0.22);
  hole.translate(0, -0.1, 0);
  return merge([paint(body, 0.62, 0.68, 0.8), paint(shackle, 0.78, 0.82, 0.9), paint(hole, 0.18, 0.2, 0.28)]);
}

/** Vật nổi trên cột sáng của biển theo dáng: cuộn giấy (mở), vòng tích (xong), ổ khóa (khóa). Màu theo đỉnh; không có uv. */
export function createEmblemGeometry(kind: PillarKind): BufferGeometry {
  return kind === 'open' ? createScrollGeometry() : kind === 'done' ? createTickGeometry() : createLockGeometry();
}
