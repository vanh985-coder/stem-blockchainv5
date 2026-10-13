import { useFrame, useThree } from '@react-three/fiber';

/** Camera tự do để chụp ảnh và kiểm tra (chỉ khi mở `?cam=free`): nơi kiểm tra đặt camera bằng window.__freeCam = { x, y, z, tx, ty, tz }; chưa đặt thì camera đi theo người chơi như thường. */
export function FreeCamera() {
  const camera = useThree((st) => st.camera);
  useFrame(() => {
    const f = (window as unknown as { __freeCam?: { x: number; y: number; z: number; tx: number; ty: number; tz: number } }).__freeCam;
    if (!f) return;
    camera.position.set(f.x, f.y, f.z);
    camera.lookAt(f.tx, f.ty, f.tz);
  });
  return null;
}
