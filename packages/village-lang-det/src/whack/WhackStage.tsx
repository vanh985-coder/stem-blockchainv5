/**
 * Cảnh 3D/2.5D của màn 5 (Scene25D, camera trực giao): chuột giấy, vệt sáng vùng đập, vết mực trên sổ, tiền đồng (hình rời, DÙNG POOL: tạo sẵn một lần, mỗi khung hình chỉ đổi vị trí, cỡ, hiện/ẩn;
 * không tạo object mới trong useFrame), học sinh cầm quạt nan, {phanDien} làm trùm và cô Chi (model 3D, đặt trong Actor25D).
 * Vị trí mọi thứ đọc từ \`WhackView\` (đối tượng đổi tại chỗ do vòng lặp của \`WhackGame\` giữ); ở đây không có luật chơi.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Material, type Object3D, type Texture } from 'three';
import { Actor25D, Character, type Aim, type PoseRequest } from '@so-chung/core/three/index';
import { BOOK_POINT, imageToWorld, laneHeading, lanePose } from './man05Lanes';
import { MOUSE_ASPECT, makeGlowTexture, type WhackTextures } from './whackArt';
import { WHACK_SPEC, type MouseKind } from './whackConfig';
import type { WhackState } from './whackLogic';

/** Trùm trên màn: ở làn nào, vị trí dọc làn (như `pos` của logic), hướng mặt (0 nhìn ra người chơi, π quay lưng chạy lên), hệ số cỡ thêm */
export interface BossView {
  show: boolean;
  lane: number;
  pos: number;
  yaw: number;
}

/** Dữ liệu chia sẻ giữa vòng lặp của game và cảnh (đổi tại chỗ, không cấp phát) */
export interface WhackView {
  state: WhackState;
  /** Đồng hồ hoạt cảnh (giây; chỉ chạy khi game không tạm dừng) */
  clock: number;
  reduced: boolean;
  /** Vệt sáng của làn vừa đập: 1 rồi giảm dần về 0 */
  laneFlash: Float32Array;
  /** Vết mực vừa loang: 1 rồi giảm dần về 0 (hiệu ứng nảy) */
  inkPop: Float32Array;
  student: { x: number; y: number; tx: number; ty: number };
  boss: BossView;
  /** Đang chạy thử các chuyển động đầu dưới màn hình tải: hiện {phanDien} ở giữa sân */
  warm: boolean;
}

export function createView(state: WhackState, reduced: boolean): WhackView {
  return {
    state,
    clock: 0,
    reduced,
    laneFlash: new Float32Array(WHACK_SPEC.lanes),
    inkPop: new Float32Array(WHACK_SPEC.inkMax),
    student: { x: STUDENT_HOME.x, y: STUDENT_HOME.y, tx: STUDENT_HOME.x, ty: STUDENT_HOME.y },
    boss: { show: false, lane: 0, pos: 0, yaw: 0 },
    warm: false,
  };
}

/** Chỗ đứng ban đầu của học sinh (chân, tọa độ thế giới của khung 16 × 9): dưới cùng, hơi lệch về phía các làn */
export const STUDENT_HOME = { x: -1.5, y: -4.2 } as const;
/** Cỡ chiều cao nhân vật trên màn (đơn vị thế giới; khung cao 9) */
export const STUDENT_HEIGHT = 3.2;
export const BOSS_HEIGHT = 2.9;
const CHI_SPOT = { x: 6.9, y: -2.9, height: 3.0 } as const;

const POOL = 20;
const BASE_W = 2.5;
const KIND_SCALE: Record<MouseKind, number> = { thuong: 1, doiLan: 1, nhanh: 0.8, to: 1.5 };
const Z = { glow: -1.7, ink: -1.0, mouse: -1.2, coin: -0.9 } as const;
/** Chỗ các vết mực trên sổ (lệch so với tâm sổ, đơn vị thế giới) */
const INK_SPOTS: readonly (readonly [number, number, number])[] = [
  [-0.55, 0.1, 0.7],
  [0.15, 0.22, 0.55],
  [0.62, 0.02, 0.6],
  [-0.2, -0.2, 0.6],
  [0.45, -0.24, 0.5],
  [-0.78, -0.18, 0.5],
  [0.02, 0.02, 0.8],
  [0.78, 0.26, 0.5],
];

const KIND_ORDER: readonly MouseKind[] = ['thuong', 'doiLan', 'nhanh', 'to'];
const POSE = { x: 0, y: 0, scale: 1 };
const POSE2 = { x: 0, y: 0, scale: 1 };
const BOOK = imageToWorld(BOOK_POINT.u, BOOK_POINT.v);

export interface WhackStageProps {
  view: React.RefObject<WhackView>;
  textures: WhackTextures;
  studentPose?: PoseRequest;
  studentAim: Aim | null;
  fan: Object3D | null;
  villain: { clip: 'idle' | 'run' | 'cheer'; n: number; pose?: PoseRequest };
  chiHappy: number;
}

const STUDENT_CLIPS = ['idle'] as const;
const VILLAIN_CLIPS = ['idle', 'run', 'cheer'] as const;

export function WhackStage({ view, textures, studentPose, studentAim, fan, villain, chiHappy }: WhackStageProps) {
  // Hình học và vật liệu dùng chung: tạo một lần, dọn khi rời cảnh
  const kit = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const glowTex = makeGlowTexture();
    const basic = (map: Texture | null, color = '#ffffff', extra: Partial<ConstructorParameters<typeof MeshBasicMaterial>[0]> = {}) =>
      new MeshBasicMaterial({ map, color: new Color(color), transparent: true, depthWrite: false, toneMapped: false, ...extra });
    const mice: Record<MouseKind, MeshBasicMaterial> = {
      thuong: basic(textures.thuong),
      doiLan: basic(textures.doiLan),
      nhanh: basic(textures.nhanh),
      to: basic(textures.to),
    };
    // chuột to khựng và chớp sáng: cùng hình, nhân màu lên (toneMapped tắt nên > 1 thành sáng hơn)
    const toFlash = basic(textures.to, '#ffffff');
    toFlash.color.setRGB(1.9, 1.9, 1.9);
    const toGlow = basic(textures.to, '#ffffff');
    toGlow.color.setRGB(1.35, 1.35, 1.35);
    const ink = basic(textures.vetMuc);
    const coin = basic(textures.dong);
    const glow = Array.from({ length: WHACK_SPEC.lanes }, () => basic(glowTex, '#fff3a0', { opacity: 0.6 }));
    return { geo, glowTex, mice, toFlash, toGlow, ink, coin, glow };
  }, [textures]);
  useEffect(
    () => () => {
      kit.geo.dispose();
      kit.glowTex.dispose();
      for (const m of [...Object.values(kit.mice), kit.toFlash, kit.toGlow, kit.ink, kit.coin, ...kit.glow] as Material[]) m.dispose();
    },
    [kit],
  );

  // Vệt sáng vùng đập của từng làn: vị trí, góc, cỡ tính một lần (khung thế giới cố định 16 × 9)
  const zones = useMemo(
    () =>
      Array.from({ length: WHACK_SPEC.lanes }, (_, lane) => {
        const a = lanePose(lane, WHACK_SPEC.zoneStart, { x: 0, y: 0, scale: 1 });
        const b = lanePose(lane, WHACK_SPEC.zoneEnd, { x: 0, y: 0, scale: 1 });
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, length: Math.hypot(dx, dy) + 0.55, width: 1.7 * ((a.scale + b.scale) / 2), rot: Math.atan2(dy, dx) - Math.PI / 2 };
      }),
    [],
  );
  const headings = useMemo(() => Array.from({ length: WHACK_SPEC.lanes }, (_, l) => laneHeading(l)), []);

  const mouseMeshes = useRef<(Mesh | null)[]>([]);
  const slotId = useRef(new Int32Array(POOL));
  const slotLane = useRef(new Int8Array(POOL));
  const slotOx = useRef(new Float32Array(POOL));
  const slotOy = useRef(new Float32Array(POOL));
  const slotX = useRef(new Float32Array(POOL));
  const slotY = useRef(new Float32Array(POOL));
  const inkMeshes = useRef<(Mesh | null)[]>([]);
  const glowMeshes = useRef<(Mesh | null)[]>([]);
  const coinMesh = useRef<Mesh>(null);
  const studentGroup = useRef<Group>(null);
  const villainGroup = useRef<Group>(null);
  const warmShown = useRef(false);

  useFrame((_, dt) => {
    const v = view.current;
    if (!v) return;
    const s = v.state;
    const reduced = v.reduced;
    const t = v.clock;

    // ---- chạy thử dưới màn hình tải: vẽ một lần mỗi hình chuột, đồng và vết mực (thu nhỏ sát 0) để texture lên GPU trước, không khựng khi loại chuột đó xuất hiện lần đầu
    if (v.warm) {
      for (let k = 0; k < KIND_ORDER.length; k++) {
        const wm = mouseMeshes.current[k];
        if (!wm) continue;
        wm.material = kit.mice[KIND_ORDER[k]];
        wm.position.set(0, 0, Z.mouse);
        wm.scale.set(0.02, 0.02, 1);
        wm.visible = true;
      }
      const wc = coinMesh.current;
      if (wc) {
        wc.position.set(0, 0, Z.coin);
        wc.scale.set(0.02, 0.02, 1);
        wc.visible = true;
      }
      const wi = inkMeshes.current[0];
      if (wi) {
        wi.scale.set(0.02, 0.02, 1);
        wi.visible = true;
      }
      warmShown.current = true;
    } else if (warmShown.current) {
      warmShown.current = false;
      for (let k = 0; k < KIND_ORDER.length; k++) {
        const wm = mouseMeshes.current[k];
        if (wm && slotId.current[k] === 0) wm.visible = false;
      }
    }

    // ---- chuột: gán mỗi con một ô trong pool (giữ ô theo id), giải phóng ô của con đã biến mất
    const ids = slotId.current;
    for (let k = 0; k < POOL; k++) {
      if (ids[k] === 0) continue;
      let alive = false;
      for (let i = 0; i < s.mice.length; i++) {
        if (s.mice[i].id === ids[k]) {
          alive = true;
          break;
        }
      }
      if (!alive) {
        ids[k] = 0;
        const mesh = mouseMeshes.current[k];
        if (mesh) mesh.visible = false;
      }
    }
    for (let i = 0; i < s.mice.length; i++) {
      const m = s.mice[i];
      let k = -1;
      let free = -1;
      for (let j = 0; j < POOL; j++) {
        if (ids[j] === m.id) {
          k = j;
          break;
        }
        if (ids[j] === 0 && free < 0) free = j;
      }
      if (k < 0) {
        if (free < 0) continue; // pool đầy (không xảy ra với luật hiện tại)
        k = free;
        ids[k] = m.id;
        slotLane.current[k] = m.lane;
        slotOx.current[k] = 0;
        slotOy.current[k] = 0;
        const p0 = lanePose(m.lane, m.pos, POSE);
        slotX.current[k] = p0.x;
        slotY.current[k] = p0.y;
      }
      const mesh = mouseMeshes.current[k];
      if (!mesh) continue;
      const p = lanePose(m.lane, m.pos, POSE);
      if (slotLane.current[k] !== m.lane) {
        // đổi làn: nhảy sang làn mới nhưng vẽ trượt dần từ chỗ cũ
        slotOx.current[k] = slotX.current[k] - p.x;
        slotOy.current[k] = slotY.current[k] - p.y;
        slotLane.current[k] = m.lane;
      }
      const decay = reduced ? 0 : Math.max(0, 1 - dt * 9);
      slotOx.current[k] *= decay;
      slotOy.current[k] *= decay;
      const x = p.x + slotOx.current[k];
      const y = p.y + slotOy.current[k];
      slotX.current[k] = x;
      slotY.current[k] = y;
      const w = BASE_W * p.scale * KIND_SCALE[m.kind];
      mesh.position.set(x, y, Z.mouse + (m.pos / 10) * 0.2);
      mesh.scale.set(w, w / MOUSE_ASPECT, 1);
      mesh.rotation.z = headings[m.lane];
      let mat: MeshBasicMaterial = kit.mice[m.kind];
      if (m.kind === 'to' && m.flash) mat = reduced ? kit.toGlow : Math.floor(t * 12) % 2 === 0 ? kit.toFlash : kit.mice.to;
      if (mesh.material !== mat) mesh.material = mat;
      mesh.visible = true;
    }

    // ---- vệt sáng vùng đập (nhấp nhô nhẹ; "Giảm chuyển động" thì đứng yên) và vệt sáng của làn vừa đập
    for (let l = 0; l < WHACK_SPEC.lanes; l++) {
      const f = v.laneFlash[l];
      if (f > 0) v.laneFlash[l] = Math.max(0, f - dt * 4);
      const mat = kit.glow[l];
      mat.opacity = 0.5 + (reduced ? 0 : 0.12 * Math.sin(t * 4 + l)) + 0.4 * f;
    }

    // ---- vết mực trên sổ: hiện theo số vết, vừa loang thì nảy to rồi nhỏ lại
    for (let i = 0; i < WHACK_SPEC.inkMax; i++) {
      const mesh = inkMeshes.current[i];
      if (!mesh) continue;
      const on = s.ink > i;
      mesh.visible = on;
      if (!on) continue;
      const pop = v.inkPop[i];
      if (pop > 0) v.inkPop[i] = Math.max(0, pop - dt * 3.5);
      const spot = INK_SPOTS[i];
      const k = spot[2] * (1 + (reduced ? 0 : 0.7 * pop));
      mesh.scale.set(k * 1.3, (k * 1.3) / MOUSE_ASPECT, 1);
    }

    // ---- tiền đồng
    const cm = coinMesh.current;
    if (cm) {
      const c = s.coin;
      if (c) {
        const p = lanePose(c.lane, c.pos, POSE);
        const bob = reduced ? 0 : Math.sin(t * 6) * 0.06;
        cm.position.set(p.x, p.y + 0.18 + bob, Z.coin);
        const k = 0.85 * (0.7 + 0.3 * p.scale);
        cm.scale.set(k, k, 1);
        // sắp biến mất thì nhấp nháy (đứng yên khi "Giảm chuyển động")
        kit.coin.opacity = c.life < 0.7 && !reduced ? (Math.floor(t * 10) % 2 === 0 ? 1 : 0.35) : 1;
        cm.visible = true;
      } else cm.visible = false;
    }

    // ---- học sinh trượt tới chỗ đứng mới (dịch thẳng khi "Giảm chuyển động")
    const st = v.student;
    const g = studentGroup.current;
    if (g) {
      const kk = reduced ? 1 : Math.min(1, dt * 14);
      st.x += (st.tx - st.x) * kk;
      st.y += (st.ty - st.y) * kk;
      g.position.set(st.x, st.y, 0);
    }

    // ---- trùm chạy dọc làn (hoặc đứng giữa sân lúc chạy thử dưới màn hình tải)
    const vg = villainGroup.current;
    if (vg) {
      const b = v.boss;
      const shown = b.show || v.warm;
      vg.visible = shown;
      if (shown) {
        const lane = v.warm ? 1 : b.lane;
        const pos = v.warm ? 8 : b.pos;
        const p = lanePose(lane, pos, POSE2);
        vg.position.set(p.x, p.y - 0.2, 0);
        vg.scale.setScalar(0.45 + 0.55 * p.scale);
        vg.rotation.y = b.yaw;
      }
    }
  });

  const front = { x: 0, y: 0 };
  return (
    <>
      {zones.map((z, l) => (
        <mesh
          key={`g${l}`}
          ref={(m) => {
            glowMeshes.current[l] = m;
          }}
          geometry={kit.geo}
          material={kit.glow[l]}
          position={[z.x, z.y, Z.glow]}
          rotation-z={z.rot}
          scale={[z.width, z.length, 1]}
          renderOrder={-6}
        />
      ))}
      {INK_SPOTS.map((spot, i) => (
        <mesh
          key={`i${i}`}
          ref={(m) => {
            inkMeshes.current[i] = m;
          }}
          geometry={kit.geo}
          material={kit.ink}
          position={[BOOK.x + spot[0], BOOK.y + spot[1], Z.ink + i * 0.01]}
          rotation-z={i * 0.9}
          visible={false}
          renderOrder={-3}
        />
      ))}
      {Array.from({ length: POOL }, (_, k) => (
        <mesh
          key={`m${k}`}
          ref={(m) => {
            mouseMeshes.current[k] = m;
          }}
          geometry={kit.geo}
          material={kit.mice.thuong}
          visible={false}
          renderOrder={-4}
        />
      ))}
      <mesh ref={coinMesh} geometry={kit.geo} material={kit.coin} visible={false} renderOrder={-2} />

      <Actor25D x={CHI_SPOT.x} y={CHI_SPOT.y} height={CHI_SPOT.height} layer="actorsBack">
        <Character id="characters/co-chi" happyTrigger={chiHappy} />
      </Actor25D>

      <group ref={villainGroup} visible={false}>
        <Actor25D x={front.x} y={front.y} height={BOSS_HEIGHT} layer="actors">
          <Character id="characters/ti" animation={villain.clip} trigger={villain.n} returnTo="idle" clips={VILLAIN_CLIPS} pose={villain.pose} />
        </Actor25D>
      </group>

      <group ref={studentGroup}>
        <Actor25D x={0} y={0} height={STUDENT_HEIGHT} layer="actorsFront">
          <Character id="characters/hoc-sinh-nam" clips={STUDENT_CLIPS} pose={studentPose} aim={studentAim} heldProp={fan} />
        </Actor25D>
      </group>
    </>
  );
}

