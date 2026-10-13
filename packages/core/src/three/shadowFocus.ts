/**
 * Bóng đổ bám theo người chơi (mốc 2, bước 8): máy ảnh bóng của mặt trời chỉ phủ vùng quanh người chơi (nửa cạnh `SHADOW_RANGE`), nên bản
 * đồ bóng 1024 hoặc 2048 dồn hết vào chỗ đang nhìn thấy gần, và chỉ vật trong vùng đó mới đổ bóng. Hàm thuần, không import three.
 */

/** Nửa cạnh vùng bóng quanh người chơi (đơn vị cảnh). */
export const SHADOW_RANGE = 25;
/** Khoảng cách từ điểm nhìn tới mặt trời (phải nằm trong `far` của máy ảnh bóng). */
export const SUN_DISTANCE = 60;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Điểm người chơi đang đứng: nơi có người chơi ghi vào mỗi khung hình và nơi vẽ bóng đọc ra. Chỉ có một cảnh đi lại tại một lúc, nên một đối tượng
 * dùng chung là đủ (không cấp phát trong useFrame).
 */
export const shadowFocus: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Dịch điểm `focus` trong mặt phẳng vuông góc với hướng ánh sáng cho tròn từng texel của bản đồ bóng, để bóng không "nhấp nháy" (tràn
 * từng điểm ảnh) khi người chơi đi. `dir` là vectơ đơn vị từ điểm nhìn về phía mặt trời, `texel` là bề rộng một texel trong cảnh
 * (= 2 × nửa cạnh / kích thước bản đồ bóng). Hai trục của lưới là hai trục của máy ảnh bóng (`lookAt` với trục đứng (0, 1, 0)). Ghi kết quả vào `out`.
 */
export function snapToLightTexel(focus: Vec3, dir: Vec3, texel: number, out: Vec3): Vec3 {
  // trục phải = lên × dir, trục lên = dir × phải (như Matrix4.lookAt của three)
  let rx = dir.z;
  let ry = 0;
  let rz = -dir.x;
  const rl = Math.hypot(rx, rz);
  if (rl < 1e-9) {
    // ánh sáng thẳng đứng: lấy trục x, z làm lưới
    out.x = Math.round(focus.x / texel) * texel;
    out.y = focus.y;
    out.z = Math.round(focus.z / texel) * texel;
    return out;
  }
  rx /= rl;
  rz /= rl;
  const ux = dir.y * rz - dir.z * ry;
  const uy = dir.z * rx - dir.x * rz;
  const uz = dir.x * ry - dir.y * rx;
  const a = focus.x * rx + focus.y * ry + focus.z * rz;
  const b = focus.x * ux + focus.y * uy + focus.z * uz;
  const da = Math.round(a / texel) * texel - a;
  const db = Math.round(b / texel) * texel - b;
  out.x = focus.x + da * rx + db * ux;
  out.y = focus.y + da * ry + db * uy;
  out.z = focus.z + da * rz + db * uz;
  return out;
}

/** Đưa vectơ về độ dài 1 (ghi vào `out`). Vectơ không thì trả về hướng thẳng đứng. */
export function normalizeInto(v: Vec3, out: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z);
  if (l < 1e-9) {
    out.x = 0;
    out.y = 1;
    out.z = 0;
  } else {
    out.x = v.x / l;
    out.y = v.y / l;
    out.z = v.z / l;
  }
  return out;
}
