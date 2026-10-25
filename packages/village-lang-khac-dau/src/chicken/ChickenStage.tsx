/**
 * Cảnh 2.5D của màn 9 (Scene25D, camera trực giao): gà bệnh chạy lạch bạch dọc ba làn, gà khỏi bệnh lấp lánh rồi chạy về chuồng, ná cao su xoay về con gà được chọn, viên thuốc bay vòng cung, gà trùm
 * với {phanDien} ngồi trên yên (hình rời DÙNG POOL: tạo sẵn một lần, mỗi khung hình chỉ đổi vị trí, cỡ, hiện/ẩn; không tạo object mới trong useFrame), học sinh đứng cạnh ná (model 3D, đặt trong Actor25D).
 * Vị trí mọi thứ đọc từ `ChickenView` (đối tượng đổi tại chỗ do vòng lặp của `ChickenGame` giữ); ở đây không có luật chơi. Số đo bố cục ở `chickenLayout.ts`, `man09Lanes.ts` (hàm thuần có test).
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Material, type Texture } from 'three';
import { Actor25D, Character, type Aim, type PoseRequest } from '@so-chung/core/three/index';
import { lanePose, imageToWorld, COOP_POINT, type LanePose } from './man09Lanes';
import {
  BOSS_DIMS,
  BOSS_HEIGHT,
  CHICKEN_DIMS,
  CHICKEN_HEIGHT,
  FACING,
  MEDICINE_COLORS,
  PILL,
  RIDER,
  RUN_HOME,
  SLING,
  SLING_DIMS,
  SPARKLES,
  STUDENT,
  bossPose,
  chickenPose,
  riderFoot,
  slingAngle,
  sparkleAt,
  type ChickenPose,
} from './chickenLayout';
import { makePillTexture, makeStarTexture, type ChickenTextures } from './chickenArt';
import { CHICKEN_SPEC } from './chickenConfig';
import type { ChickenState } from './chickenLogic';

/** Gà khỏi bệnh (hay vừa lọt qua cổng) đang chạy ở chỗ cũ của nó */
export interface RunnerView {
  on: boolean;
  /** 'cure': lấp lánh rồi chạy về chuồng; 'leak': tiếp tục chạy qua cổng rồi mờ dần; 'spark': chỉ lấp lánh (gà trùm đổi thẻ) */
  kind: 'cure' | 'leak' | 'spark';
  /** Đồng hồ hoạt cảnh lúc bắt đầu */
  t0: number;
  lane: number;
  /** Vị trí `pos` của logic và hệ số cỡ lúc bắt đầu; chân ở (x, y) */
  pos: number;
  x: number;
  y: number;
  scale: number;
  /** Gà trùm (to hơn) */
  boss: boolean;
  /** Số giây chạy về chuồng */
  seconds: number;
}

/** Viên thuốc đang bay: id của logic và chỗ xuất phát (đầu chạc ná lúc bắn) */
export interface PillView {
  id: number;
  sx: number;
  sy: number;
  /** Chỗ gà bị nhắm lần cuối (nếu gà biến mất giữa chừng viên thuốc vẫn bay tới đó) */
  tx: number;
  ty: number;
}

export interface VillainView {
  /** 'ride': ngồi trên gà trùm; 'fall': đứng ở (x, y) sau khi ngã; 'flee': chạy lên cuối đường */
  mode: 'hidden' | 'ride' | 'fall' | 'flee';
  t0: number;
  x: number;
  y: number;
  /** Độ cao mặt đất dưới chỗ ngã (chân gà trùm): {phanDien} rơi từ yên xuống đây */
  gy: number;
  scale: number;
}

export const RUNNERS = 8;
export const PILLS = 4;
const POOL = 12;

/** Dữ liệu chia sẻ giữa vòng lặp của game và cảnh (đổi tại chỗ, không cấp phát) */
export interface ChickenView {
  state: ChickenState;
  /** Đồng hồ hoạt cảnh (giây; chỉ chạy khi game không tạm dừng) */
  clock: number;
  reduced: boolean;
  /** Đang chạy thử các chuyển động đầu dưới màn hình tải: hiện mọi hình một lần (thu nhỏ sát 0) */
  warm: boolean;
  runners: RunnerView[];
  pills: PillView[];
  /** Con gà mà ná đang chỉ vào (id của logic; 0 là không có) */
  aimId: number;
  villain: VillainView;
}

export function createView(state: ChickenState, reduced: boolean): ChickenView {
  return {
    state,
    clock: 0,
    reduced,
    warm: false,
    runners: Array.from({ length: RUNNERS }, () => ({ on: false, kind: 'cure' as const, t0: 0, lane: 0, pos: 0, x: 0, y: 0, scale: 1, boss: false, seconds: 0 })),
    pills: Array.from({ length: PILLS }, () => ({ id: 0, sx: 0, sy: 0, tx: 0, ty: 0 })),
    aimId: 0,
    villain: { mode: 'hidden', t0: 0, x: 0, y: 0, gy: 0, scale: 1 },
  };
}

/** Lớp theo trục Z: gà thường ở sau mọi nhân vật 3D (càng gần cổng càng ở trước), tia lấp lánh trước gà, ná và viên thuốc ở trước cùng */
const Z = { chicken: -1.6, runner: -1.75, star: -1.0, sling: 0.8, pill: 1.7 } as const;
const ORDER = { sling: 8, pill: 9 } as const;
/** Nhịp lạch bạch (rad/giây), độ nảy (theo chiều cao gà) và độ nghiêng (rad) */
const WADDLE = { w: 11, bounce: 0.06, tilt: 0.1 } as const;
/** Viên thuốc bay vòng cung bắt đầu từ đầu chạc ná, kết thúc ở giữa thân gà */
const BODY_AIM = 0.5;

const STUDENT_CLIPS = ['idle'] as const;
const VILLAIN_CLIPS = ['idle', 'run'] as const;
const RIDER_HEIGHT = BOSS_HEIGHT * RIDER.heightRatio;
const POSE: ChickenPose = { x: 0, y: 0, scale: 1, height: 0, width: 0 };
const LPOSE: LanePose = { x: 0, y: 0, scale: 1 };
const SPARK = { dx: 0, dy: 0, scale: 0 };
const TIP = { x: 0, y: 0 };
const COOP = imageToWorld(COOP_POINT.u, COOP_POINT.v);

export interface ChickenStageProps {
  view: React.RefObject<ChickenView>;
  textures: ChickenTextures;
  studentAim: Aim | null;
  studentPose?: PoseRequest;
  villain: { clip: 'idle' | 'run'; n: number; pose?: PoseRequest };
}

export function ChickenStage({ view, textures, studentAim, studentPose, villain }: ChickenStageProps) {
  // Hình học và vật liệu dùng chung: tạo một lần, dọn khi rời cảnh
  const kit = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const starTex = makeStarTexture();
    const pillTex = makePillTexture();
    const basic = (map: Texture | null, color = '#ffffff', extra: Partial<ConstructorParameters<typeof MeshBasicMaterial>[0]> = {}) =>
      new MeshBasicMaterial({ map, color: new Color(color), transparent: true, depthWrite: false, toneMapped: false, ...extra });
    const benh = basic(textures.benh);
    const trum = basic(textures.trum);
    const na = basic(textures.na, '#ffffff', { depthTest: false });
    // mỗi ô gà khỏi bệnh một vật liệu riêng (đổi hình benh / khoe và độ mờ dần)
    const runner = Array.from({ length: RUNNERS }, () => basic(textures.benh));
    const star = basic(starTex, '#ffe36b', { depthTest: false });
    const pill = MEDICINE_COLORS.map((c) => basic(pillTex, c, { depthTest: false }));
    return { geo, starTex, pillTex, benh, trum, na, runner, star, pill };
  }, [textures]);
  useEffect(
    () => () => {
      kit.geo.dispose();
      kit.starTex.dispose();
      kit.pillTex.dispose();
      for (const m of [kit.benh, kit.trum, kit.na, ...kit.runner, kit.star, ...kit.pill] as Material[]) m.dispose();
    },
    [kit],
  );

  const chickenGroups = useRef<(Group | null)[]>([]);
  const slotId = useRef(new Int32Array(POOL));
  const bossGroup = useRef<Group>(null);
  const runnerGroups = useRef<(Group | null)[]>([]);
  const runnerBodies = useRef<(Group | null)[]>([]);
  const starMeshes = useRef<(Mesh | null)[]>([]);
  const pillMeshes = useRef<(Mesh | null)[]>([]);
  const slingGroup = useRef<Group>(null);
  const riderGroup = useRef<Group>(null);
  const slingNow = useRef(0);
  const warmShown = useRef(false);

  useFrame((_, dt) => {
    const v = view.current;
    if (!v) return;
    const s = v.state;
    const reduced = v.reduced;
    const t = v.clock;

    // ---- chạy thử dưới màn hình tải: vẽ một lần mỗi hình (thu nhỏ sát 0) để texture lên GPU trước, không khựng khi hình đó xuất hiện lần đầu
    if (v.warm) {
      const g0 = chickenGroups.current[0];
      if (g0 && slotId.current[0] === 0) {
        g0.position.set(0, 0, Z.chicken);
        g0.scale.set(0.02, 0.02, 1);
        g0.visible = true;
      }
      const bg = bossGroup.current;
      if (bg) {
        bg.position.set(0, 0, Z.chicken);
        bg.scale.set(0.02, 0.02, 1);
        bg.visible = true;
      }
      const rg = runnerGroups.current[0];
      const rb = runnerBodies.current[0];
      if (rg && rb && !v.runners[0].on) {
        rg.position.set(0, 0, Z.runner);
        rb.scale.set(0.02, 0.02, 1);
        (rb.children[0] as Mesh).material = kit.runner[0];
        rg.visible = true;
        const sm = starMeshes.current[0];
        if (sm) {
          sm.position.set(0, 0, Z.star);
          sm.scale.set(0.02, 0.02, 1);
          sm.visible = true;
        }
      }
      const pm = pillMeshes.current[0];
      if (pm && v.pills[0].id === 0) {
        pm.position.set(0, 0, Z.pill);
        pm.scale.set(0.02, 0.02, 1);
        pm.visible = true;
      }
      warmShown.current = true;
    } else if (warmShown.current) {
      warmShown.current = false;
      const g0 = chickenGroups.current[0];
      if (g0 && slotId.current[0] === 0) g0.visible = false;
      const bg = bossGroup.current;
      if (bg) bg.visible = false;
      const rg = runnerGroups.current[0];
      if (rg && !v.runners[0].on) rg.visible = false;
      const sm = starMeshes.current[0];
      if (sm) sm.visible = false;
      const pm = pillMeshes.current[0];
      if (pm && v.pills[0].id === 0) pm.visible = false;
    }

    // ---- gà thường: gán mỗi con một ô trong pool (giữ ô theo id), giải phóng ô của con đã biến mất
    const ids = slotId.current;
    for (let k = 0; k < POOL; k++) {
      if (ids[k] === 0) continue;
      let alive = false;
      for (let i = 0; i < s.chickens.length; i++) {
        if (s.chickens[i].id === ids[k] && !s.chickens[i].boss) {
          alive = true;
          break;
        }
      }
      if (!alive) {
        ids[k] = 0;
        const g = chickenGroups.current[k];
        if (g) g.visible = false;
      }
    }
    let bossSeen = false;
    for (let i = 0; i < s.chickens.length; i++) {
      const c = s.chickens[i];
      if (c.boss) {
        bossSeen = true;
        const bg = bossGroup.current;
        if (!bg) continue;
        const p = bossPose(c.lane, c.pos, POSE);
        const phase = t * WADDLE.w * 0.8;
        const bounce = reduced ? 0 : Math.abs(Math.sin(phase)) * WADDLE.bounce * p.height;
        bg.position.set(p.x, p.y + bounce, Z.chicken + (c.pos / CHICKEN_SPEC.laneLength) * 0.5);
        bg.rotation.z = reduced ? 0 : Math.sin(phase) * WADDLE.tilt * 0.6;
        bg.scale.set(FACING * p.scale, p.scale, 1);
        bg.visible = true;
        // {phanDien} ngồi trên yên, đi theo gà trùm (cùng độ nảy)
        const rg = riderGroup.current;
        if (rg && v.villain.mode === 'ride') {
          riderFoot(p, TIP);
          rg.position.set(TIP.x, TIP.y + bounce, 0);
          rg.scale.setScalar(p.scale);
          rg.rotation.y = 0;
          rg.visible = true;
        }
        continue;
      }
      let k = -1;
      let free = -1;
      for (let j = 0; j < POOL; j++) {
        if (ids[j] === c.id) {
          k = j;
          break;
        }
        if (ids[j] === 0 && free < 0) free = j;
      }
      if (k < 0) {
        if (free < 0) continue; // pool đầy (không xảy ra với luật hiện tại)
        k = free;
        ids[k] = c.id;
      }
      const g = chickenGroups.current[k];
      if (!g) continue;
      const p = chickenPose(c.lane, c.pos, POSE);
      const phase = t * WADDLE.w + c.id * 1.7;
      const bounce = reduced ? 0 : Math.abs(Math.sin(phase)) * WADDLE.bounce * p.height;
      g.position.set(p.x, p.y + bounce, Z.chicken + (c.pos / CHICKEN_SPEC.laneLength) * 0.5);
      g.rotation.z = reduced ? 0 : Math.sin(phase) * WADDLE.tilt;
      g.scale.set(FACING * p.scale, p.scale, 1);
      g.visible = true;
    }
    if (!bossSeen) {
      const bg = bossGroup.current;
      if (bg && !v.warm) bg.visible = false;
    }

    // ---- {phanDien} sau khi gà trùm khỏi bệnh: ngã tại chỗ, rồi chạy lên cuối đường
    const rg = riderGroup.current;
    const vl = v.villain;
    if (rg) {
      if (vl.mode === 'ride') {
        if (!bossSeen) rg.visible = false;
      } else if (vl.mode === 'hidden') {
        // chạy thử dưới màn hình tải: đứng giữa khung, thu nhỏ sát 0 (để model, clip run và tư thế hurt lên GPU trước)
        rg.visible = v.warm;
        if (v.warm) {
          rg.position.set(0, 0, 0);
          rg.scale.setScalar(0.02);
          rg.rotation.y = 0;
        }
      } else {
        const age = t - vl.t0;
        if (vl.mode === 'fall') {
          // rơi từ yên xuống đất trong 0,35 giây ("Giảm chuyển động": ở thẳng dưới đất)
          const drop = reduced ? 1 : Math.min(1, age / 0.35);
          rg.position.set(vl.x, vl.y + (vl.gy - vl.y) * drop * drop, 0);
          rg.scale.setScalar(vl.scale);
          rg.rotation.y = 0;
        } else {
          // chạy ngược lên cuối đường (quay lưng lại), nhỏ dần
          const run = Math.min(1, age / 1.4);
          rg.position.set(vl.x - run * 2.2 * 0.2, vl.gy + run * 3.2, 0);
          rg.scale.setScalar(vl.scale * (1 - 0.55 * run));
          rg.rotation.y = Math.PI;
        }
        rg.visible = true;
      }
    }

    // ---- gà khỏi bệnh / lọt qua cổng / lấp lánh
    for (let r = 0; r < RUNNERS; r++) {
      const rv = v.runners[r];
      const group = runnerGroups.current[r];
      const body = runnerBodies.current[r];
      if (!group || !body) continue;
      if (!rv.on) {
        if (!v.warm || r !== 0) group.visible = false;
        for (let i = 0; i < SPARKLES; i++) {
          const sm = starMeshes.current[r * SPARKLES + i];
          if (sm && !(v.warm && r === 0 && i === 0)) sm.visible = false;
        }
        continue;
      }
      const age = t - rv.t0;
      const mat = kit.runner[r];
      const dims = rv.boss ? BOSS_HEIGHT / CHICKEN_HEIGHT : 1;
      let x = rv.x;
      let y = rv.y;
      let k = rv.scale * dims;
      let opacity = 1;
      let moving = false;
      let flip: 1 | -1 = FACING;
      let showBody = true;
      if (rv.kind === 'spark') {
        showBody = false;
        if (age > RUN_HOME.sparkle) rv.on = false;
      } else if (rv.kind === 'leak') {
        const span = 0.5;
        if (age >= span) {
          rv.on = false;
          continue;
        }
        lanePose(rv.lane, rv.pos + age * 4, LPOSE);
        x = LPOSE.x;
        y = LPOSE.y;
        k = LPOSE.scale * dims;
        opacity = 1 - age / span;
        moving = true;
        if (mat.map !== textures.benh) mat.map = textures.benh;
      } else {
        const swap = RUN_HOME.sparkle * 0.35;
        const tex = age < swap ? textures.benh : textures.khoe;
        if (mat.map !== tex) mat.map = tex;
        if (age > RUN_HOME.sparkle) {
          const p = Math.min(1, (age - RUN_HOME.sparkle) / Math.max(rv.seconds, 0.05));
          if (p >= 1) {
            rv.on = false;
            continue;
          }
          x = rv.x + (COOP.x - rv.x) * p;
          y = rv.y + (COOP.y - rv.y) * p;
          k = (rv.scale * dims * RUN_HOME.scale) * (1 - p) + RUN_HOME.endScale * dims * p;
          opacity = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;
          moving = true;
          flip = COOP.x < rv.x ? FACING : ((-FACING) as 1 | -1);
        }
      }
      group.visible = true;
      group.position.set(x, y, Z.runner);
      body.visible = showBody;
      if (showBody) {
        mat.opacity = opacity;
        const phase = t * WADDLE.w * 1.3 + r * 2.1;
        const hop = reduced ? 0 : Math.abs(Math.sin(phase)) * WADDLE.bounce * CHICKEN_HEIGHT * k * (moving ? 1.6 : 0.8);
        body.position.set(0, hop, 0);
        body.rotation.z = reduced || !moving ? 0 : Math.sin(phase) * WADDLE.tilt;
        body.scale.set(flip * k, k, 1);
      }
      // tia lấp lánh quanh gà (đứng yên khi "Giảm chuyển động": vẫn hiện, không tỏa ra)
      for (let i = 0; i < SPARKLES; i++) {
        const sm = starMeshes.current[r * SPARKLES + i];
        if (!sm) continue;
        sparkleAt(i, age, SPARK);
        const on = SPARK.scale > 0.02 && rv.kind !== 'leak';
        sm.visible = on;
        if (!on) continue;
        const h = CHICKEN_HEIGHT * k;
        const sp = reduced ? 0.6 : SPARK.scale;
        sm.position.set(SPARK.dx * h, SPARK.dy * h, Z.star - Z.runner);
        const size = 0.42 * Math.max(0.5, k) * sp;
        sm.scale.set(size, size, 1);
        sm.rotation.z = reduced ? 0 : t * 4 + i;
      }
    }

    // ---- ná cao su: xoay (mượt) về con gà được chọn; không có thì về thẳng đứng
    const sg = slingGroup.current;
    if (sg) {
      let target = 0;
      if (v.aimId !== 0) {
        for (let i = 0; i < s.chickens.length; i++) {
          if (s.chickens[i].id !== v.aimId) continue;
          const c = s.chickens[i];
          const p = c.boss ? bossPose(c.lane, c.pos, POSE) : chickenPose(c.lane, c.pos, POSE);
          target = slingAngle(p.x, p.y + p.height * BODY_AIM);
          break;
        }
      }
      const kk = reduced ? 1 : Math.min(1, dt * 12);
      slingNow.current += (target - slingNow.current) * kk;
      sg.rotation.z = -slingNow.current;
    }

    // ---- viên thuốc bay vòng cung
    for (let q = 0; q < PILLS; q++) {
      const pv = v.pills[q];
      const mesh = pillMeshes.current[q];
      if (!mesh) continue;
      if (pv.id === 0) {
        if (!(v.warm && q === 0)) mesh.visible = false;
        continue;
      }
      let pr = null as (typeof s.projectiles)[number] | null;
      for (let i = 0; i < s.projectiles.length; i++) {
        if (s.projectiles[i].id === pv.id) {
          pr = s.projectiles[i];
          break;
        }
      }
      if (!pr) {
        pv.id = 0;
        mesh.visible = false;
        continue;
      }
      for (let i = 0; i < s.chickens.length; i++) {
        if (s.chickens[i].id !== pr.chickenId) continue;
        const c = s.chickens[i];
        const p = c.boss ? bossPose(c.lane, c.pos, POSE) : chickenPose(c.lane, c.pos, POSE);
        pv.tx = p.x;
        pv.ty = p.y + p.height * BODY_AIM;
        break;
      }
      const f = Math.min(1, Math.max(0, 1 - pr.left / CHICKEN_SPEC.flight));
      const arc = reduced ? 0 : Math.sin(Math.PI * f) * PILL.arc;
      mesh.position.set(pv.sx + (pv.tx - pv.sx) * f, pv.sy + (pv.ty - pv.sy) * f + arc, Z.pill);
      const size = PILL.size * (1 - 0.35 * f);
      mesh.scale.set(size, size, 1);
      mesh.rotation.z = reduced ? 0 : f * 18;
      const med = Math.min(Math.max(pr.medicine, 0), MEDICINE_COLORS.length - 1);
      if (mesh.material !== kit.pill[med]) mesh.material = kit.pill[med];
      mesh.visible = true;
    }
  });

  return (
    <>
      {Array.from({ length: POOL }, (_, k) => (
        <group
          key={`c${k}`}
          ref={(g) => {
            chickenGroups.current[k] = g;
          }}
          visible={false}
        >
          <mesh geometry={kit.geo} material={kit.benh} position={[-CHICKEN_DIMS.centerDx, CHICKEN_DIMS.centerUp, 0]} scale={[CHICKEN_DIMS.quadW, CHICKEN_DIMS.quadH, 1]} />
        </group>
      ))}

      <group ref={bossGroup} visible={false}>
        <mesh geometry={kit.geo} material={kit.trum} position={[-BOSS_DIMS.centerDx, BOSS_DIMS.centerUp, 0]} scale={[BOSS_DIMS.quadW, BOSS_DIMS.quadH, 1]} />
      </group>

      {Array.from({ length: RUNNERS }, (_, r) => (
        <group
          key={`r${r}`}
          ref={(g) => {
            runnerGroups.current[r] = g;
          }}
          visible={false}
        >
          <group
            ref={(g) => {
              runnerBodies.current[r] = g;
            }}
          >
            <mesh geometry={kit.geo} material={kit.runner[r]} position={[-CHICKEN_DIMS.centerDx, CHICKEN_DIMS.centerUp, 0]} scale={[CHICKEN_DIMS.quadW, CHICKEN_DIMS.quadH, 1]} />
          </group>
          {Array.from({ length: SPARKLES }, (_, i) => (
            <mesh
              key={`s${i}`}
              ref={(m) => {
                starMeshes.current[r * SPARKLES + i] = m;
              }}
              geometry={kit.geo}
              material={kit.star}
              visible={false}
              renderOrder={ORDER.pill}
            />
          ))}
        </group>
      ))}

      <group ref={slingGroup} position={[SLING.x, SLING.baseY, Z.sling]}>
        <mesh geometry={kit.geo} material={kit.na} position={[-SLING_DIMS.centerDx, SLING_DIMS.centerUp, 0]} scale={[SLING_DIMS.quadW, SLING_DIMS.quadH, 1]} renderOrder={ORDER.sling} />
      </group>

      {Array.from({ length: PILLS }, (_, q) => (
        <mesh
          key={`p${q}`}
          ref={(m) => {
            pillMeshes.current[q] = m;
          }}
          geometry={kit.geo}
          material={kit.pill[0]}
          visible={false}
          renderOrder={ORDER.pill}
        />
      ))}

      <group ref={riderGroup} visible={false}>
        <Actor25D x={0} y={0} height={RIDER_HEIGHT} layer="actors">
          <Character id="characters/ti" animation={villain.clip} trigger={villain.n} returnTo="idle" clips={VILLAIN_CLIPS} pose={villain.pose} />
        </Actor25D>
      </group>

      <Actor25D x={STUDENT.x} y={STUDENT.feetY} height={STUDENT.height} layer="actorsFront">
        <Character id="characters/hoc-sinh-nam" clips={STUDENT_CLIPS} pose={studentPose} aim={studentAim} />
      </Actor25D>
    </>
  );
}
