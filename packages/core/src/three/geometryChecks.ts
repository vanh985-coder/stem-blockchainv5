import type { BufferGeometry } from 'three';

/**
 * Thể tích có dấu của hình kín (tổng thể tích các tứ diện nối gốc tọa độ với từng tam giác). Dương: mặt trước (theo chiều quay của các đỉnh) quay RA NGOÀI, vật liệu mặc định
 * (chỉ vẽ mặt trước) cho ra hình đặc đúng; âm: các mặt quay vào trong nên từ ngoài nhìn chỉ thấy mặt trong của thành phía sau (hình như bị khuyết một phần).
 * Dùng trong test để bắt hình dựng bằng code (LatheGeometry với đường viền ngược chiều…) bị lộn trong ra ngoài.
 */
export function signedVolume(g: BufferGeometry): number {
  const p = g.getAttribute('position');
  const idx = g.index;
  const n = idx ? idx.count : p.count;
  let v = 0;
  for (let i = 0; i < n; i += 3) {
    const a = idx ? idx.getX(i) : i;
    const b = idx ? idx.getX(i + 1) : i + 1;
    const c = idx ? idx.getX(i + 2) : i + 2;
    const ax = p.getX(a);
    const ay = p.getY(a);
    const az = p.getZ(a);
    const bx = p.getX(b);
    const by = p.getY(b);
    const bz = p.getZ(b);
    const cx = p.getX(c);
    const cy = p.getY(c);
    const cz = p.getZ(c);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}
