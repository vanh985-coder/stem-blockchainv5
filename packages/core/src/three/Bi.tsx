import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3, type Group, type Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createMulberry32 } from '../lib/rng';
import { BI_CAMERA_OFFSET, BI_COLOR, BI_FOLLOW_OFFSET, BI_SIZE, biCameraOffset, blinkScale, bobOffset, dampFactor, nextBlinkDelay, spinAngle } from './biMotion';
import { turnToward } from './staticMotion';

type GroupProps = Omit<ThreeElements['group'], 'id'>;

export interface BiProps extends GroupProps {
  /**
   * Đối tượng để Bi bay theo sau (thường là người chơi). Bi luôn ở sau vai phải người đó, quay mặt cùng hướng.
   * Cần đặt Bi và đối tượng này cùng một cha (hệ tọa độ thế giới của cảnh). Bỏ trống thì Bi lơ lửng tại chỗ.
   */
  target?: RefObject<Object3D | null>;
  /** Vị trí so với đối tượng, trong hệ tọa độ của đối tượng (mặc định sau vai phải, hơi cao hơn đầu) */
  offset?: readonly [number, number, number];
  /** Đổi giá trị này để Bi xoay một vòng (vui) */
  happyTrigger?: number;
  /** Hạt giống cho nhịp chớp mắt */
  seed?: number;
  /**
   * Có thì Bi bay sau vai phải theo góc nhìn của camera (xem `BI_CAMERA_OFFSET`) thay vì theo hướng mặt của đối tượng: `yaw` là góc quay ngang của camera, đọc mỗi khung hình
   * (cảnh đi lại truyền `api.camera`). Bỏ trống thì dùng `offset` trong hệ tọa độ của đối tượng.
   */
  cameraYaw?: { yaw: number };
  /** Mỗi khung hình ghi vị trí (x, z) của Bi vào đây (để Bi làm vật tương tác nói chuyện được) */
  track?: { x: number; z: number };
}

/** Tốc độ bay theo (độ gắt của làm mượt, càng lớn càng bám sát). */
const FOLLOW_RATE = 5;
const TURN_RATE = 4;

/**
 * Bi do code dựng (spec 03 mục 3.5): khối hộp bo tròn cạnh ~0,5 màu muc-tim hơi phát sáng, hai mắt tròn trắng chớp
 * mỗi 3–5 giây, một mắt xích nhỏ trên đỉnh đầu. Bay nhấp nhô (biên độ 0,1, chu kỳ 2 giây), theo sau vai người chơi,
 * xoay một vòng khi vui. Không cấp phát trong useFrame; rời cảnh thì dispose.
 */
export function Bi({ target, offset = BI_FOLLOW_OFFSET, happyTrigger, seed = 1, track, cameraYaw, ...group }: BiProps) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const eyes = useRef<Group>(null);

  const bodyGeo = useMemo(() => new RoundedBoxGeometry(BI_SIZE, BI_SIZE, BI_SIZE, 4, 0.12), []);
  const eyeGeo = useMemo(() => new SphereGeometry(0.075, 16, 12), []);
  const linkGeo = useMemo(() => new TorusGeometry(0.075, 0.024, 8, 20), []);
  const bodyMat = useMemo(() => new MeshStandardMaterial({ color: BI_COLOR, emissive: BI_COLOR, emissiveIntensity: 0.35, roughness: 0.45 }), []);
  const eyeMat = useMemo(() => new MeshBasicMaterial({ color: '#FFFFFF' }), []);
  const linkMat = useMemo(() => new MeshStandardMaterial({ color: '#F2B33D', metalness: 0.6, roughness: 0.35 }), []);
  useEffect(
    () => () => {
      for (const o of [bodyGeo, eyeGeo, linkGeo, bodyMat, eyeMat, linkMat]) o.dispose();
    },
    [bodyGeo, eyeGeo, linkGeo, bodyMat, eyeMat, linkMat],
  );

  // Đối tượng tạm dùng lại mỗi khung hình (không new trong useFrame).
  const tmp = useMemo(() => ({ pos: new Vector3(), dir: new Vector3(), off: { x: 0, y: 0, z: 0 } }), []);
  const rng = useMemo(() => createMulberry32(seed), [seed]);
  const st = useRef({ init: false, yaw: 0, nextBlink: -1, blinkAt: -1, happyAt: -1, pendingHappy: false });

  useEffect(() => {
    if (happyTrigger !== undefined) st.current.pendingHappy = true;
  }, [happyTrigger]);

  useFrame((state, dt) => {
    const o = outer.current;
    const i = inner.current;
    const e = eyes.current;
    if (!o || !i || !e) return;
    const s = st.current;
    const t = state.clock.elapsedTime;

    const tgt = target?.current;
    if (tgt) {
      tgt.updateWorldMatrix(true, false);
      if (cameraYaw) {
        // sau vai phải theo góc nhìn của camera: vị trí của đối tượng cộng độ lệch trong cảnh
        tgt.getWorldPosition(tmp.pos);
        biCameraOffset(cameraYaw.yaw, BI_CAMERA_OFFSET, tmp.off);
        tmp.pos.set(tmp.pos.x + tmp.off.x, tmp.pos.y + tmp.off.y, tmp.pos.z + tmp.off.z);
      } else {
        tmp.pos.set(offset[0], offset[1], offset[2]);
        tgt.localToWorld(tmp.pos);
      }
      if (!s.init) {
        o.position.copy(tmp.pos);
        s.init = true;
      } else {
        o.position.lerp(tmp.pos, dampFactor(dt, FOLLOW_RATE));
      }
      tgt.getWorldDirection(tmp.dir);
      s.yaw = turnToward(s.yaw, Math.atan2(tmp.dir.x, tmp.dir.z), TURN_RATE * dt);
      o.rotation.y = s.yaw;
    }
    if (track) {
      track.x = o.position.x;
      track.z = o.position.z;
    }

    if (s.pendingHappy) {
      s.pendingHappy = false;
      s.happyAt = t;
    }
    i.position.y = bobOffset(t);
    i.rotation.y = spinAngle(s.happyAt < 0 ? -1 : t - s.happyAt);

    if (s.nextBlink < 0) s.nextBlink = t + nextBlinkDelay(rng());
    if (t >= s.nextBlink) {
      s.blinkAt = t;
      s.nextBlink = t + nextBlinkDelay(rng());
    }
    e.scale.y = blinkScale(s.blinkAt < 0 ? -1 : t - s.blinkAt);
  });

  const half = BI_SIZE / 2;
  return (
    <group ref={outer} {...group}>
      <group ref={inner}>
        <mesh geometry={bodyGeo} material={bodyMat} castShadow />
        <group ref={eyes} position={[0, 0.04, half - 0.015]}>
          <mesh geometry={eyeGeo} material={eyeMat} position={[-0.115, 0, 0]} scale={[1, 1, 0.45]} />
          <mesh geometry={eyeGeo} material={eyeMat} position={[0.115, 0, 0]} scale={[1, 1, 0.45]} />
        </group>
        <mesh geometry={linkGeo} material={linkMat} position={[0, half + 0.06, 0]} rotation={[0, Math.PI / 2, 0]} castShadow />
      </group>
    </group>
  );
}

