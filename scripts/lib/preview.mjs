// Dựng ảnh xem trước một model .glb bằng bộ vẽ phần mềm (không cần trình duyệt), để so gốc | chính | xa.
// Chiếu song song, z-buffer, đổ bóng lambert theo pháp tuyến nội suy; màu từ baseColorFactor, COLOR_0 và texture baseColor.
// Lưới có xương được vẽ ở tư thế gốc. Không áp normal map và không có phản chiếu: ảnh chỉ để so hình khối và màu giữa các bản.
import sharp from 'sharp';
import { jointMatrices } from './glb.mjs';

const TEX_SIZE = 512;

async function loadTexture(texture) {
  const img = texture.getImage();
  if (!img) return null;
  const { data, info } = await sharp(Buffer.from(img)).resize(TEX_SIZE, TEX_SIZE, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Thu các primitive (đã đưa về tọa độ thế giới) thành danh sách mảnh. */
async function collect(doc) {
  const texCache = new Map();
  const pieces = [];
  const skinCache = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const skin = node.getSkin();
    let jm = null;
    if (skin) {
      if (!skinCache.has(skin)) skinCache.set(skin, jointMatrices(skin));
      jm = skinCache.get(skin);
    }
    // Lưới có xương: vị trí đã nằm trong không gian thế giới sau skinning, bỏ qua ma trận của node.
    const m = skin ? IDENTITY : node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const nrmA = prim.getAttribute('NORMAL');
      const J = skin ? prim.getAttribute('JOINTS_0') : null;
      const W = skin ? prim.getAttribute('WEIGHTS_0') : null;
      const n = pos.getCount();
      const world = new Float32Array(n * 3);
      const nrm = nrmA ? new Float32Array(n * 3) : null;
      const p = [0, 0, 0];
      const q = [0, 0, 0];
      const ji = [0, 0, 0, 0];
      const wi = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        pos.getElement(i, p);
        if (nrmA) nrmA.getElement(i, q);
        if (J && W) {
          J.getElement(i, ji);
          W.getElement(i, wi);
          let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
          for (let k = 0; k < 4; k++) {
            const w = wi[k];
            if (!w) continue;
            const mm = jm[ji[k]];
            x += w * (mm[0] * p[0] + mm[4] * p[1] + mm[8] * p[2] + mm[12]);
            y += w * (mm[1] * p[0] + mm[5] * p[1] + mm[9] * p[2] + mm[13]);
            z += w * (mm[2] * p[0] + mm[6] * p[1] + mm[10] * p[2] + mm[14]);
            if (nrm) {
              nx += w * (mm[0] * q[0] + mm[4] * q[1] + mm[8] * q[2]);
              ny += w * (mm[1] * q[0] + mm[5] * q[1] + mm[9] * q[2]);
              nz += w * (mm[2] * q[0] + mm[6] * q[1] + mm[10] * q[2]);
            }
          }
          world[i * 3] = x; world[i * 3 + 1] = y; world[i * 3 + 2] = z;
          if (nrm) { nrm[i * 3] = nx; nrm[i * 3 + 1] = ny; nrm[i * 3 + 2] = nz; }
        } else {
          world[i * 3] = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
          world[i * 3 + 1] = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
          world[i * 3 + 2] = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
          if (nrm) {
            nrm[i * 3] = m[0] * q[0] + m[4] * q[1] + m[8] * q[2];
            nrm[i * 3 + 1] = m[1] * q[0] + m[5] * q[1] + m[9] * q[2];
            nrm[i * 3 + 2] = m[2] * q[0] + m[6] * q[1] + m[10] * q[2];
          }
        }
      }
      const uvA = prim.getAttribute('TEXCOORD_0');
      let uv = null;
      if (uvA) {
        uv = new Float32Array(n * 2);
        const t = [0, 0];
        for (let i = 0; i < n; i++) {
          uvA.getElement(i, t);
          uv[i * 2] = t[0];
          uv[i * 2 + 1] = t[1];
        }
      }
      const colA = prim.getAttribute('COLOR_0');
      let col = null;
      if (colA) {
        col = new Float32Array(n * 3);
        const c = colA.getElementSize() === 4 ? [0, 0, 0, 0] : [0, 0, 0];
        for (let i = 0; i < n; i++) {
          colA.getElement(i, c);
          col[i * 3] = c[0];
          col[i * 3 + 1] = c[1];
          col[i * 3 + 2] = c[2];
        }
      }
      const mat = prim.getMaterial();
      const factor = mat ? mat.getBaseColorFactor() : [0.8, 0.8, 0.8, 1];
      let tex = null;
      const t = mat?.getBaseColorTexture();
      if (t && uv) {
        if (!texCache.has(t)) texCache.set(t, await loadTexture(t));
        tex = texCache.get(t);
      }
      const idxA = prim.getIndices();
      const idx = idxA ? idxA.getArray() : Uint32Array.from({ length: n }, (_, i) => i);
      pieces.push({ world, nrm, uv, col, tex, factor, idx });
    }
  }
  return pieces;
}

// Màu trong file là sRGB (texture) hoặc tuyến tính (màu đỉnh, baseColorFactor). Ảnh xem trước dựng trong sRGB:
// đổi màu đỉnh và hệ số từ tuyến tính sang sRGB để màu khớp với cách trình xem hiển thị.
const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

/** Dựng ảnh RGB vuông cạnh `size`. Góc nhìn: xoay quanh trục đứng `yaw`, nghiêng xuống `pitch` (radian). */
export async function renderRaw(doc, { size = 480, yaw = -0.6, pitch = 0.3 } = {}) {
  const pieces = await collect(doc);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Xoay quanh Y rồi quanh X; z lớn = gần người xem.
  const rot = (x, y, z) => {
    const x1 = cy * x + sy * z;
    const z1 = -sy * x + cy * z;
    return [x1, cp * y - sp * z1, sp * y + cp * z1];
  };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pc of pieces) {
    const w = pc.world;
    for (let i = 0; i < w.length; i += 3) {
      const [x, y, z] = rot(w[i], w[i + 1], w[i + 2]);
      w[i] = x; w[i + 1] = y; w[i + 2] = z;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (pc.nrm) {
      const nr = pc.nrm;
      for (let i = 0; i < nr.length; i += 3) {
        const [x, y, z] = rot(nr[i], nr[i + 1], nr[i + 2]);
        const l = Math.hypot(x, y, z) || 1;
        nr[i] = x / l; nr[i + 1] = y / l; nr[i + 2] = z / l;
      }
    }
  }
  const out = Buffer.alloc(size * size * 3);
  out.fill(238);
  if (!isFinite(minX)) return out;
  const scale = (size * 0.9) / Math.max(maxX - minX, maxY - minY, 1e-6);
  const ox = size / 2 - ((minX + maxX) / 2) * scale;
  const oy = size / 2 + ((minY + maxY) / 2) * scale;
  const zbuf = new Float32Array(size * size).fill(-Infinity);
  const light = [0.4, 0.7, 0.6];
  const ll = Math.hypot(...light);
  const lx = light[0] / ll, ly = light[1] / ll, lz = light[2] / ll;

  for (const pc of pieces) {
    const { world: w, nrm, uv, col, tex, factor, idx } = pc;
    const f0 = toSrgb(factor[0]), f1 = toSrgb(factor[1]), f2 = toSrgb(factor[2]);
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const ax = w[a * 3] * scale + ox, ay = oy - w[a * 3 + 1] * scale, az = w[a * 3 + 2];
      const bx = w[b * 3] * scale + ox, by = oy - w[b * 3 + 1] * scale, bz = w[b * 3 + 2];
      const cx = w[c * 3] * scale + ox, cy2 = oy - w[c * 3 + 1] * scale, cz = w[c * 3 + 2];
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy2))), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy2)));
      if (x0 > x1 || y0 > y1) continue;
      const den = (by - cy2) * (ax - cx) + (cx - bx) * (ay - cy2);
      if (Math.abs(den) < 1e-9) continue;
      // Pháp tuyến mặt, dùng khi model không có pháp tuyến đỉnh.
      let fnx = 0, fny = 0, fnz = 0;
      if (!nrm) {
        const ux = w[b * 3] - w[a * 3], uy = w[b * 3 + 1] - w[a * 3 + 1], uz = w[b * 3 + 2] - w[a * 3 + 2];
        const vx = w[c * 3] - w[a * 3], vy = w[c * 3 + 1] - w[a * 3 + 1], vz = w[c * 3 + 2] - w[a * 3 + 2];
        fnx = uy * vz - uz * vy; fny = uz * vx - ux * vz; fnz = ux * vy - uy * vx;
        const nl = Math.hypot(fnx, fny, fnz) || 1;
        fnx /= nl; fny /= nl; fnz /= nl;
      }
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const l1 = ((by - cy2) * (px - cx) + (cx - bx) * (py - cy2)) / den;
          const l2 = ((cy2 - ay) * (px - cx) + (ax - cx) * (py - cy2)) / den;
          const l3 = 1 - l1 - l2;
          if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
          const z = l1 * az + l2 * bz + l3 * cz;
          const zi = y * size + x;
          if (z <= zbuf[zi]) continue;
          zbuf[zi] = z;
          let nx, ny, nz;
          if (nrm) {
            nx = l1 * nrm[a * 3] + l2 * nrm[b * 3] + l3 * nrm[c * 3];
            ny = l1 * nrm[a * 3 + 1] + l2 * nrm[b * 3 + 1] + l3 * nrm[c * 3 + 1];
            nz = l1 * nrm[a * 3 + 2] + l2 * nrm[b * 3 + 2] + l3 * nrm[c * 3 + 2];
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
          } else {
            nx = fnx; ny = fny; nz = fnz;
          }
          if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const shade = 0.4 + 0.6 * Math.max(0, nx * lx + ny * ly + nz * lz);
          let r = f0, g = f1, bl = f2;
          if (col) {
            r *= toSrgb(l1 * col[a * 3] + l2 * col[b * 3] + l3 * col[c * 3]);
            g *= toSrgb(l1 * col[a * 3 + 1] + l2 * col[b * 3 + 1] + l3 * col[c * 3 + 1]);
            bl *= toSrgb(l1 * col[a * 3 + 2] + l2 * col[b * 3 + 2] + l3 * col[c * 3 + 2]);
          }
          if (tex) {
            let u = l1 * uv[a * 2] + l2 * uv[b * 2] + l3 * uv[c * 2];
            let v = l1 * uv[a * 2 + 1] + l2 * uv[b * 2 + 1] + l3 * uv[c * 2 + 1];
            u -= Math.floor(u);
            v -= Math.floor(v);
            const ti = (Math.min(tex.h - 1, (v * tex.h) | 0) * tex.w + Math.min(tex.w - 1, (u * tex.w) | 0)) * 3;
            r *= tex.data[ti] / 255;
            g *= tex.data[ti + 1] / 255;
            bl *= tex.data[ti + 2] / 255;
          }
          const o = zi * 3;
          out[o] = Math.min(255, r * 255 * shade);
          out[o + 1] = Math.min(255, g * 255 * shade);
          out[o + 2] = Math.min(255, bl * 255 * shade);
        }
      }
    }
  }
  return out;
}

/** Ghép các hình (raw RGB vuông cạnh `size`) cạnh nhau thành một PNG, mỗi hình có nhãn ở dưới. */
export async function composePanels(panels, size) {
  const band = 30;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const label = (txt, i) =>
    `<text x="${i * size + 10}" y="${size + 21}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="#222">${esc(txt)}</text>`;
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size * panels.length}" height="${size + band}">${panels.map((p, i) => label(p.label, i)).join('')}</svg>`);
  const layers = [];
  for (const [i, p] of panels.entries()) {
    layers.push({ input: await sharp(p.raw, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer(), left: i * size, top: 0 });
  }
  layers.push({ input: svg, left: 0, top: 0 });
  return sharp({ create: { width: size * panels.length, height: size + band, channels: 3, background: '#e4e4e4' } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}
