/**
 * Texture do code vẽ bằng canvas cho chợ phiên: ruộng lúa, cỏ, mặt nước, ván bến tàu, và hai mặt nạ trong suốt làm mềm mép đường đất.
 * Chỉ gọi ở trình duyệt (cần canvas), dựng một lần khi vào cảnh; component gọi `dispose()` khi rời cảnh.
 */
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { createMulberry32 } from '../../lib/rng';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}

function finish(c: HTMLCanvasElement, repeat: [number, number] | null, srgb = true): CanvasTexture {
  const t = new CanvasTexture(c);
  if (repeat) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  } else {
    t.wrapS = ClampToEdgeWrapping;
    t.wrapT = ClampToEdgeWrapping;
  }
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Ruộng lúa nhìn từ trên: các thửa xanh sọc hàng lúa, bờ ruộng nhạt. Một ô vẽ phủ 32 × 32 đơn vị. */
export function createPaddyTexture(repeat: [number, number]): Texture {
  const [c, g] = canvas(512, 512);
  const rng = createMulberry32(11);
  g.fillStyle = '#86C24A';
  g.fillRect(0, 0, 512, 512);
  const plots = [
    [0, 0, 256, 192, '#7CBA43'],
    [256, 0, 256, 192, '#9CCF55'],
    [0, 192, 192, 320, '#92C94F'],
    [192, 192, 320, 160, '#74B53F'],
    [192, 352, 320, 160, '#8DC64B'],
  ] as const;
  for (const [x, y, w, h, col] of plots) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
    // hàng lúa
    g.strokeStyle = 'rgba(40,110,30,0.28)';
    g.lineWidth = 2;
    for (let yy = y + 6; yy < y + h; yy += 10) {
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x + w, yy);
      g.stroke();
    }
  }
  // bờ ruộng
  g.fillStyle = '#C8C07A';
  for (const [x, y, w, h] of plots) {
    g.fillRect(x, y, w, 5);
    g.fillRect(x, y, 5, h);
  }
  // đốm
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(255,255,200,${0.04 + rng() * 0.06})`;
    g.fillRect(rng() * 512, rng() * 512, 2, 2);
  }
  return finish(c, repeat);
}

/** Cỏ làng: xanh nhạt lẫn đốm sáng tối. */
export function createGrassTexture(repeat: [number, number]): Texture {
  const [c, g] = canvas(256, 256);
  const rng = createMulberry32(23);
  g.fillStyle = '#93C25C';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const dark = rng() < 0.5;
    g.fillStyle = dark ? `rgba(60,120,40,${0.08 + rng() * 0.1})` : `rgba(210,235,130,${0.08 + rng() * 0.12})`;
    g.fillRect(rng() * 256, rng() * 256, 2 + rng() * 3, 2 + rng() * 3);
  }
  return finish(c, repeat);
}

/** Mặt nước sông: xanh, vệt sóng sáng nằm ngang theo chiều chảy (trục v). */
export function createWaterTexture(repeat: [number, number]): Texture {
  const [c, g] = canvas(256, 256);
  const rng = createMulberry32(5);
  g.fillStyle = '#4FB0E0';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 46; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const len = 18 + rng() * 40;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 6, y + len / 2, x, y + len);
    g.stroke();
  }
  return finish(c, repeat);
}

/** Ván gỗ bến tàu: các tấm ván dọc, vân gỗ. */
export function createPlankTexture(repeat: [number, number]): Texture {
  const [c, g] = canvas(128, 128);
  const rng = createMulberry32(9);
  const base = ['#9C6B3A', '#8A5C31', '#A8753F', '#935F34'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = base[i % base.length];
    g.fillRect(i * 16, 0, 16, 128);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(i * 16, 0, 2, 128);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(50,25,5,0.18)';
      g.fillRect(i * 16 + 3 + rng() * 10, rng() * 128, 1, 8 + rng() * 30);
    }
  }
  return finish(c, repeat);
}

/**
 * Mặt nạ trong suốt (kênh xanh lá dùng làm alphaMap): 'lateral' sáng ở giữa, mờ dần ra hai mép theo trục u (đường đất);
 * 'radial' sáng ở tâm, mờ dần ra rìa (sân chợ).
 */
export function createEdgeAlphaTexture(kind: 'lateral' | 'radial'): Texture {
  const [c, g] = canvas(128, 128);
  if (kind === 'lateral') {
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.16, '#ffffff');
    grad.addColorStop(0.84, '#ffffff');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
  } else {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.86, '#ffffff');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
  }
  g.fillRect(0, 0, 128, 128);
  return finish(c, null, false);
}
