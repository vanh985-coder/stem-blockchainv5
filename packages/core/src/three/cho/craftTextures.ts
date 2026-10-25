/**
 * Texture đá, gỗ, tranh và đồng của đồ nhỏ dựng bằng code (mốc 3, bước L4): bốn texture nhỏ do code vẽ bằng canvas, gần trắng, chỉ điều chỉnh độ sáng (nhân với màu theo đỉnh, màu vật liệu hay màu từng bản của đồ, nên cùng một texture
 * vẫn ra đá xám, đá ấm, đá lạnh). Chia sẻ giữa mọi vật liệu cùng tên và đếm tham chiếu: vật liệu cuối cùng bị giải phóng thì texture được giải phóng theo (dựng lại cảnh không tăng số texture).
 * `applyBoxUV` đặt lại toạ độ ảnh theo mét thật để mật độ vân đều trên mọi bộ phận (tấm ván mỏng hay khối đá lớn cùng một cỡ vân).
 */
import { useEffect, useState } from 'react';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type MeshStandardMaterial, type Texture } from 'three';
import { createMulberry32 } from '../../lib/rng';
import type { PropKind } from './marketLayout';

export type CraftTextureName = 'stone' | 'wood' | 'thatch' | 'copper';

/** Loại đồ nhỏ nào dùng texture nào. */
export const CRAFT_TEXTURE_OF: Partial<Record<PropKind, CraftTextureName>> = {
  'khoi-da': 'stone',
  'ban-da': 'stone',
  'phien-da': 'stone',
  'da-xe': 'stone',
  'da-vun': 'stone',
  'ban-khac': 'stone',
  'ban-khac2': 'stone',
  'ban-khac3': 'stone',
  'phoi-go': 'wood',
  'gia-dau': 'wood',
  'ban-thu': 'wood',
  'khung-cua-da': 'wood',
  'mai-che': 'thatch',
  'chuong-ga': 'thatch',
  'may-soi-dau': 'copper',
};

/** Một chu kỳ của texture phủ bấy nhiêu mét thật của đồ. */
export const CRAFT_TEXTURE_TILE: Readonly<Record<CraftTextureName, number>> = { stone: 1.6, wood: 1.2, thatch: 1.1, copper: 1.8 };

/**
 * Đặt toạ độ ảnh theo mét thật, chọn mặt chiếu theo trục lớn nhất của pháp tuyến đỉnh (trên dưới: x–z; trước sau: x–y; hai bên: z–y), chia cho `tile` mét. Hình học phải có pháp tuyến theo đỉnh
 * (hộp, trụ, khối 20 mặt, cầu của three đều có). Ghi đè thuộc tính `uv`.
 */
export function applyBoxUV(g: BufferGeometry, tile: number): BufferGeometry {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (az >= ax) {
      u = pos.getX(i);
      v = pos.getY(i);
    } else {
      u = pos.getZ(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

const SIZE: Readonly<Record<CraftTextureName, number>> = { stone: 256, wood: 128, thatch: 256, copper: 128 };

type Ctx = CanvasRenderingContext2D;

/** Vẽ `draw` chín lần lệch đúng một chu kỳ để nét chạm mép tràn sang mép đối diện (texture lát liền). */
function tiled(size: number, draw: (dx: number, dy: number) => void): void {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(dx, dy);
}

function drawStone(g: Ctx, s: number): void {
  const rng = createMulberry32(4101);
  g.fillStyle = '#F2F0EA';
  g.fillRect(0, 0, s, s);
  // hạt: nhiều chấm nhỏ sáng tối
  for (let i = 0; i < 2600; i++) {
    const light = rng() < 0.5;
    g.fillStyle = light ? `rgba(255,255,250,${0.1 + rng() * 0.2})` : `rgba(60,58,52,${0.05 + rng() * 0.13})`;
    const w = 1 + rng() * 3;
    g.fillRect(rng() * s, rng() * s, w, w * (0.6 + rng() * 0.8));
  }
  // vệt loang tối và sáng
  for (let i = 0; i < 14; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const r = 18 + rng() * 38;
    const dark = rng() < 0.55;
    tiled(s, (dx, dy) => {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, dark ? 'rgba(70,66,58,0.2)' : 'rgba(255,253,246,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
  // vân đá: các đường uốn, sẫm và sáng (thạch anh)
  const vein = (dark: boolean) => {
    const x0 = rng() * s;
    const y0 = rng() * s;
    const a = rng() * Math.PI;
    const len = 70 + rng() * 120;
    const bend = (rng() - 0.5) * 60;
    tiled(s, (dx, dy) => {
      g.strokeStyle = dark ? `rgba(52,50,44,${0.28 + rng() * 0.18})` : `rgba(255,255,250,${0.6 + rng() * 0.3})`;
      g.lineWidth = dark ? 1 + rng() * 1.6 : 0.8 + rng();
      g.beginPath();
      g.moveTo(x0 + dx, y0 + dy);
      g.quadraticCurveTo(x0 + dx + Math.cos(a) * len * 0.5 + bend, y0 + dy + Math.sin(a) * len * 0.5 - bend, x0 + dx + Math.cos(a) * len, y0 + dy + Math.sin(a) * len);
      g.stroke();
    });
  };
  for (let i = 0; i < 7; i++) vein(true);
  for (let i = 0; i < 5; i++) vein(false);
  // vài vết nứt ngắn
  for (let i = 0; i < 10; i++) {
    const x = rng() * s;
    const y = rng() * s;
    g.strokeStyle = 'rgba(40,38,34,0.4)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rng() - 0.5) * 26, y + (rng() - 0.5) * 26);
    g.lineTo(x + (rng() - 0.5) * 40, y + (rng() - 0.5) * 40);
    g.stroke();
  }
}

function drawWood(g: Ctx, s: number): void {
  const rng = createMulberry32(4102);
  g.fillStyle = '#E4E0DA';
  g.fillRect(0, 0, s, s);
  // thớ gỗ: nhiều đường uốn nhẹ nằm ngang
  for (let i = 0; i < 70; i++) {
    const y = rng() * s;
    const amp = 1 + rng() * 3.5;
    const ph = rng() * 6.28;
    const dark = rng() < 0.7;
    g.strokeStyle = dark ? `rgba(86,58,30,${0.1 + rng() * 0.2})` : `rgba(255,250,236,${0.12 + rng() * 0.18})`;
    g.lineWidth = 0.7 + rng() * 1.7;
    g.beginPath();
    for (let x = 0; x <= s; x += 8) {
      const yy = y + Math.sin(x / 22 + ph) * amp;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  // mắt gỗ
  for (let i = 0; i < 3; i++) {
    const x = rng() * s;
    const y = rng() * s;
    for (let r = 2; r < 12; r += 2.4) {
      g.strokeStyle = `rgba(70,46,24,${0.35 - r * 0.02})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(x, y, r * 1.8, r, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // khe ván dọc
  for (let x = 0; x < s; x += s / 2) {
    g.fillStyle = 'rgba(50,32,16,0.22)';
    g.fillRect(x, 0, 2, s);
  }
}

function drawThatch(g: Ctx, s: number): void {
  const rng = createMulberry32(4103);
  g.fillStyle = '#E6E2D6';
  g.fillRect(0, 0, s, s);
  // sợi rơm: hàng nghìn nét ngắn, phần lớn theo một hướng (xuôi dốc), lệch nhẹ. Gom các nét cùng màu và độ đậm thành MỘT đường rồi vẽ một lần (vẽ từng nét một mất 120 đến 180 ms trên luồng chính, gom lại còn vài mili giây);
  // nét tràn qua mép thì thêm một bản lệch đúng một chu kỳ để texture lát liền.
  const styles = [
    { color: 'rgba(92,66,24,0.14)', width: 1.2 },
    { color: 'rgba(92,66,24,0.24)', width: 1.6 },
    { color: 'rgba(92,66,24,0.34)', width: 2 },
    { color: 'rgba(255,248,214,0.2)', width: 1.2 },
    { color: 'rgba(255,248,214,0.32)', width: 1.6 },
    { color: 'rgba(255,248,214,0.42)', width: 2 },
  ];
  const segs: number[][][] = styles.map(() => []);
  for (let i = 0; i < 2600; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const a = Math.PI / 2 + (rng() - 0.5) * 0.9;
    const len = 9 + rng() * 26;
    const k = (rng() < 0.55 ? 0 : 3) + Math.floor(rng() * 3);
    const x1 = x + Math.cos(a) * len;
    const y1 = y + Math.sin(a) * len;
    segs[k].push([x, y, x1, y1]);
    const ox = x1 >= s ? -s : x1 < 0 ? s : 0;
    const oy = y1 >= s ? -s : y1 < 0 ? s : 0;
    if (ox !== 0) segs[k].push([x + ox, y, x1 + ox, y1]);
    if (oy !== 0) segs[k].push([x, y + oy, x1, y1 + oy]);
  }
  styles.forEach((st, k) => {
    g.strokeStyle = st.color;
    g.lineWidth = st.width;
    g.beginPath();
    for (const [x0, y0, x1, y1] of segs[k]) {
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
  });
  // vài đường buộc ngang sẫm
  for (let y = s / 6; y < s; y += s / 3) {
    g.fillStyle = 'rgba(70,48,18,0.3)';
    g.fillRect(0, y, s, 3);
  }
}

function drawCopper(g: Ctx, s: number): void {
  const rng = createMulberry32(4104);
  g.fillStyle = '#F0EBE6';
  g.fillRect(0, 0, s, s);
  // vệt mài xước ngang rất mảnh
  for (let i = 0; i < 160; i++) {
    const y = rng() * s;
    g.strokeStyle = rng() < 0.5 ? `rgba(255,244,230,${0.05 + rng() * 0.1})` : `rgba(110,70,40,${0.03 + rng() * 0.06})`;
    g.lineWidth = 0.6 + rng() * 1.2;
    const x0 = rng() * s;
    g.beginPath();
    g.moveTo(x0, y);
    g.lineTo(x0 + 20 + rng() * 80, y + (rng() - 0.5) * 2);
    g.stroke();
  }
  // vệt oxy hóa loang sẫm và vài đốm xanh đồng rất nhạt
  for (let i = 0; i < 12; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const r = 14 + rng() * 30;
    const green = rng() < 0.25;
    tiled(s, (dx, dy) => {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, green ? 'rgba(120,170,150,0.16)' : 'rgba(80,48,24,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
}

const DRAW: Readonly<Record<CraftTextureName, (g: Ctx, s: number) => void>> = { stone: drawStone, wood: drawWood, thatch: drawThatch, copper: drawCopper };

const cache = new Map<CraftTextureName, { texture: CanvasTexture; refs: number }>();

/** Lấy texture dùng chung (dựng ở lần đầu, đếm tham chiếu); null khi không có canvas (chạy test ở node). Mỗi lần lấy phải có một lần `releaseCraftTexture`. */
export function acquireCraftTexture(name: CraftTextureName): Texture | null {
  const had = cache.get(name);
  if (had) {
    had.refs++;
    return had.texture;
  }
  if (typeof document === 'undefined') return null;
  const s = SIZE[name];
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  if (!g) return null;
  DRAW[name](g, s);
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 4;
  cache.set(name, { texture: t, refs: 1 });
  return t;
}

/** Trả một tham chiếu; hết tham chiếu thì giải phóng texture. */
export function releaseCraftTexture(name: CraftTextureName): void {
  const had = cache.get(name);
  if (!had) return;
  if (--had.refs <= 0) {
    had.texture.dispose();
    cache.delete(name);
  }
}

/** Số texture dùng chung đang giữ (để test giải phóng). */
export function craftTextureCount(): number {
  return cache.size;
}

/**
 * Gắn texture dùng chung vào một vật liệu: lấy một tham chiếu và đặt `map` (texture chỉ chỉnh độ sáng, màu vẫn của vật liệu); khi vật liệu bị giải phóng thì trả tham chiếu. Không có canvas (test ở node) thì
 * để nguyên vật liệu. Trả về true nếu đã gắn.
 */
export function attachCraftTexture(material: MeshStandardMaterial, name: CraftTextureName): boolean {
  const map = acquireCraftTexture(name);
  if (!map) return false;
  material.map = map;
  const dispose = material.dispose.bind(material);
  let released = false;
  material.dispose = () => {
    dispose();
    if (!released) {
      released = true;
      releaseCraftTexture(name);
    }
  };
  return true;
}

/** Hook: texture dùng chung cho thành phần React (null lúc đầu và khi không có canvas); trả tham chiếu khi gỡ. */
export function useCraftTexture(name: CraftTextureName): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    setTexture(acquireCraftTexture(name));
    return () => {
      releaseCraftTexture(name);
      setTexture(null);
    };
  }, [name]);
  return texture;
}
