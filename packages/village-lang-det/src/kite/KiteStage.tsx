/**
 * Cảnh 2.5D của màn 6 (Scene25D nhìn ngang): 3 lớp nền cuộn, cột tre theo cặp, diều đen, trang bản sao, cổng làng, diều và học sinh treo dưới diều. DÙNG POOL: hình học, vật liệu, mesh tạo sẵn một lần, mỗi khung hình chỉ đổi vị trí,
 * cỡ, UV, hiện/ẩn; không tạo object mới trong `useFrame`. Vị trí mọi thứ đọc từ `KiteView` (đối tượng đổi tại chỗ do vòng lặp của `KiteGame` giữ) qua `kiteLayout.ts`; ở đây không có luật chơi.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Material, type Texture } from 'three';
import { Actor25D, Character } from '@so-chung/core/three/index';
import { HANG } from '@so-chung/core/three/poses';
import { KITE_SPEC as C } from './kiteConfig';
import type { KiteTextures } from './kiteArt';
import {
  BACK_LAYERS,
  BUILD_MARGIN,
  DELIVER_SECONDS,
  KITE_SCREEN_X,
  PAGE_BODY,
  POLE_TILE,
  POOL,
  STUDENT_HEIGHT,
  UNIT,
  blackSprite,
  bookProgress,
  doorOpen,
  gateSprite,
  invOpacity,
  kiteSprite,
  kiteTilt,
  knotOffset,
  layerOffset,
  layerSize,
  pillarSpans,
  poleRepeat,
  shakeOffset,
  visibleRange,
  worldX,
  worldY,
} from './kiteLayout';
import { blackBox, gateXOf, type KiteState } from './kiteLogic';

/** Cảnh giao sổ khi trả lời một câu ở cổng: `t` giây kể từ lúc trả lời; `ok` đúng thì có bản sao sổ bay vào cổng */
export interface DeliverView {
  active: boolean;
  t: number;
  ok: boolean;
}

/** Dữ liệu chia sẻ giữa vòng lặp của game và cảnh (đổi tại chỗ, không cấp phát) */
export interface KiteView {
  state: KiteState;
  /** Đồng hồ hoạt cảnh (giây; chỉ chạy khi game không tạm dừng): lắc cánh diều đen, nhịp trang */
  clock: number;
  reduced: boolean;
  /** Rung màn khi mất tim: 1 rồi giảm về 0 trong `SHAKE_SECONDS` */
  shake: number;
  shakeClock: number;
  deliver: DeliverView;
  /** Đang chạy thử dưới màn hình tải: hiện mọi hình trong pool rất nhỏ để texture lên GPU trước */
  warm: boolean;
}

export function createView(state: KiteState, reduced: boolean): KiteView {
  return { state, clock: 0, reduced, shake: 0, shakeClock: 0, deliver: { active: false, t: 0, ok: false }, warm: false };
}

/** Thứ tự vẽ (renderOrder) và độ sâu (z) của từng thứ: nền xa nhất, rồi cổng, cột, diều đen, trang, diều, sổ */
const ORDER = { troi: -30, doiXa: -29, treGan: -28, cong: -20, cua: -19, cot: -15, den: -12, trang: -11, dieu: -5, so: -4 } as const;
const Z = { troi: -10, doiXa: -9, treGan: -8, cong: -4, cua: -3.9, cot: -3, den: -2, trang: -1.5, dieu: -0.5, so: 0.3 } as const;

const CLIPS = ['idle'] as const;
const KNOT = knotOffset();
const KITE = kiteSprite();
const BLACK = blackSprite();
const GATE = gateSprite();
const BOOK_SIZE = 0.9;
const TINY = 0.02;

const FALLBACK = { troi: '#9fd3f0', doiXa: '#86c46f', treGan: '#3f8f4a', cot: '#8cbf55', dieu: '#f0b429', dieuDen: '#33333c', cong: '#b9714a' } as const;

export interface KiteStageProps {
  view: React.RefObject<KiteView>;
  textures: KiteTextures;
  /** "Giảm chuyển động": học sinh treo đứng yên (không đung đưa) */
  reduced: boolean;
}

export function KiteStage({ view, textures, reduced }: KiteStageProps) {
  const kit = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const mat = (map: Texture | null, fallback: string, extra: Partial<ConstructorParameters<typeof MeshBasicMaterial>[0]> = {}) =>
      new MeshBasicMaterial({ map, color: new Color(map ? '#ffffff' : fallback), transparent: true, depthWrite: false, toneMapped: false, ...extra });
    const layers = [mat(textures.troi, FALLBACK.troi), mat(textures.doiXa, FALLBACK.doiXa), mat(textures.treGan, FALLBACK.treGan)];
    const pole = mat(textures.cot, FALLBACK.cot);
    const kite = mat(textures.dieu, FALLBACK.dieu);
    const black = mat(textures.dieuDen, FALLBACK.dieuDen);
    const gate = mat(textures.cong, FALLBACK.cong);
    const page = mat(textures.trang, '#f8ecc9');
    const book = mat(textures.so, '#5b3fd6');
    const door = new MeshBasicMaterial({ color: new Color('#2b1a10'), transparent: true, depthWrite: false, toneMapped: false });
    // mỗi cột có hình học riêng (4 đỉnh) để ghi UV theo chiều cao mỗi khung hình
    const poleGeo = Array.from({ length: POOL.gaps * 2 }, () => {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
      g.setAttribute('uv', new BufferAttribute(new Float32Array(8), 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      return g;
    });
    return { geo, layers, pole, kite, black, gate, page, book, door, poleGeo };
  }, [textures]);
  useEffect(
    () => () => {
      kit.geo.dispose();
      for (const g of kit.poleGeo) g.dispose();
      for (const m of [...kit.layers, kit.pole, kit.kite, kit.black, kit.gate, kit.page, kit.book, kit.door] as Material[]) m.dispose();
    },
    [kit],
  );

  const world = useRef<Group>(null);
  const layerMeshes = useRef<(Mesh | null)[]>([]);
  const poleMeshes = useRef<(Mesh | null)[]>([]);
  const pageMeshes = useRef<(Mesh | null)[]>([]);
  const blackMeshes = useRef<(Mesh | null)[]>([]);
  const gateMeshes = useRef<(Mesh | null)[]>([]);
  const doorMeshes = useRef<(Mesh | null)[]>([]);
  const bookMesh = useRef<Mesh>(null);
  const kiteGroup = useRef<Group>(null);
  const kiteMesh = useRef<Mesh>(null);
  const studentGroup = useRef<Group>(null);

  const kiteMat = kit.kite;
  useFrame(() => {
    const v = view.current;
    if (!v) return;
    const s = v.state;
    const cam = s.x;
    const reducedNow = v.reduced;

    // ---- rung màn khi mất tim (đơn vị thế giới; "Giảm chuyển động" thì không rung)
    const so = shakeOffset(v.shake, v.shakeClock, reducedNow);
    world.current?.position.set(so.x, so.y, 0);

    // ---- 3 lớp nền cuộn ngang, lặp kiểu soi gương
    for (let i = 0; i < BACK_LAYERS.length; i++) {
      const tex = [textures.troi, textures.doiXa, textures.treGan][i];
      if (tex) tex.offset.x = layerOffset(BACK_LAYERS[i], cam * UNIT, reducedNow);
    }

    const warm = v.warm;
    const [a, b] = visibleRange(cam, BUILD_MARGIN);
    const i0 = Math.max(0, Math.floor((a - C.firstGapX) / C.gapSpacing));
    // ---- cột, trang, diều đen: ô j ứng với khe i0 + j
    for (let j = 0; j < POOL.gaps; j++) {
      const gi = i0 + j;
      const g = s.gaps[gi];
      const shown = !!g && g.x >= a && g.x <= b;
      const lowMesh = poleMeshes.current[j * 2];
      const highMesh = poleMeshes.current[j * 2 + 1];
      const pageMesh = pageMeshes.current[j];
      const blackMesh = blackMeshes.current[j];
      if (!shown || !g) {
        if (lowMesh) lowMesh.visible = warm;
        if (highMesh) highMesh.visible = warm;
        if (pageMesh) pageMesh.visible = warm;
        if (blackMesh) blackMesh.visible = warm;
        if (warm) {
          for (const m of [lowMesh, highMesh, pageMesh, blackMesh]) if (m) m.scale.set(TINY, TINY, 1);
        }
        continue;
      }
      const wx = worldX(g.x, cam);
      const spans = pillarSpans(g.bottom, g.top);
      for (let k = 0; k < 2; k++) {
        const m = k === 0 ? lowMesh : highMesh;
        if (!m) continue;
        const [y0, y1] = spans[k];
        const h = Math.max(0.001, y1 - y0);
        m.visible = true;
        m.position.set(wx, worldY((y0 + y1) / 2), Z.cot);
        m.scale.set(POLE_TILE.width * UNIT, h * UNIT, 1);
        // UV: cột dưới đứng thẳng (v tăng dần lên trên); cột trên lật ngược (v giảm dần lên trên)
        const r = poleRepeat(h);
        const uv = (m.geometry.attributes.uv as BufferAttribute).array as Float32Array;
        const bottomV = k === 0 ? 0 : r;
        const topV = k === 0 ? r : 0;
        uv[0] = 0;
        uv[1] = bottomV;
        uv[2] = 1;
        uv[3] = bottomV;
        uv[4] = 1;
        uv[5] = topV;
        uv[6] = 0;
        uv[7] = topV;
        (m.geometry.attributes.uv as BufferAttribute).needsUpdate = true;
      }
      if (pageMesh) {
        const has = g.pageY !== null && !s.pageTaken[gi];
        pageMesh.visible = has;
        if (has && g.pageY !== null) {
          const bob = reducedNow ? 0 : Math.sin(v.clock * 4 + g.k) * 0.06;
          pageMesh.position.set(wx, worldY(g.pageY + bob), Z.trang);
          pageMesh.scale.set(PAGE_BODY * UNIT * 0.8, PAGE_BODY * UNIT, 1);
        }
      }
      if (blackMesh) {
        const bb = g.black ? blackBox(g, s.time) : null;
        blackMesh.visible = !!bb;
        if (bb) {
          blackMesh.position.set(wx, worldY((bb.y0 + bb.y1) / 2), Z.den);
          blackMesh.scale.set(BLACK.width * UNIT, BLACK.height * UNIT, 1);
          blackMesh.rotation.z = reducedNow ? 0 : Math.sin(v.clock * 3 + (g.black?.phase ?? 0)) * 0.1;
        }
      }
    }

    // ---- cổng làng: ô 0 là cổng sắp tới (hay vừa tới), ô 1 là cổng vừa qua
    for (let slot = 0; slot < 2; slot++) {
      const gate = s.gatesDone - slot;
      const gm = gateMeshes.current[slot];
      const dm = doorMeshes.current[slot];
      const valid = gate >= 0 && gate < s.gateAfter.length;
      const gx = valid ? gateXOf(s, gate) : 0;
      const shown = valid && gx >= a - 2 && gx <= b + 2;
      if (gm) gm.visible = shown || warm;
      if (!shown) {
        if (dm) dm.visible = false;
        if (warm && gm) gm.scale.set(TINY, TINY, 1);
        continue;
      }
      const wx = worldX(gx, cam);
      if (gm) {
        gm.position.set(wx, worldY(0) + GATE.centerY * UNIT, Z.cong);
        gm.scale.set(GATE.width * UNIT, GATE.height * UNIT, 1);
      }
      if (dm) {
        const open = slot === 1 ? 1 : v.deliver.active ? doorOpen(v.deliver.t) : 0;
        dm.visible = open > 0.01;
        dm.position.set(wx + GATE.door.cx * UNIT, worldY(GATE.door.cy), Z.cua);
        dm.scale.set(GATE.door.w * UNIT * open, GATE.door.h * UNIT, 1);
      }
    }

    // ---- diều: xoay quanh nút buộc theo vận tốc đứng; chớp nhẹ lúc bất tử
    const knotX = KITE_SCREEN_X + KNOT.x * UNIT;
    const knotY = worldY(s.y) + KNOT.y * UNIT;
    const kg = kiteGroup.current;
    if (kg) {
      kg.position.set(knotX, knotY, Z.dieu);
      kg.rotation.z = kiteTilt(s.vy);
    }
    kiteMat.opacity = invOpacity(s.inv, v.clock, reducedNow);
    const sg = studentGroup.current;
    if (sg) sg.position.set(knotX, knotY - HANG.handsRatio * STUDENT_HEIGHT, 0);

    // ---- bản sao sổ bay từ tay diều vào cánh cửa cổng (cảnh giao sổ khi trả lời đúng)
    const bk = bookMesh.current;
    if (bk) {
      const d = v.deliver;
      const p = d.active && d.ok ? bookProgress(d.t) : 0;
      const flying = d.active && d.ok && d.t < DELIVER_SECONDS;
      bk.visible = flying || warm;
      if (warm) bk.scale.set(TINY, TINY, 1);
      else if (flying) {
        const e = p * p * (3 - 2 * p);
        const gx = worldX(gateXOf(s, Math.min(s.gatesDone, s.gateAfter.length - 1)), cam);
        const tx = gx + GATE.door.cx * UNIT;
        const ty = worldY(GATE.door.cy);
        const k = BOOK_SIZE * (1 - 0.5 * e);
        bk.position.set(knotX + (tx - knotX) * e, knotY + (ty - knotY) * e + Math.sin(Math.PI * e) * 0.9, Z.so);
        bk.scale.set(k * 1.25, k, 1);
        bk.rotation.z = reducedNow ? 0 : e * 0.6;
        (bk.material as MeshBasicMaterial).opacity = p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1;
      }
    }
  });

  const kiteW = KITE.width * UNIT;
  const kiteH = KITE.height * UNIT;
  return (
    <group ref={world}>
      {BACK_LAYERS.map((l, i) => {
        const size = layerSize(l);
        return (
          <mesh
            key={l.id}
            ref={(m) => {
              layerMeshes.current[i] = m;
            }}
            geometry={kit.geo}
            material={kit.layers[i]}
            position={[0, l.bottom + size.height / 2, [Z.troi, Z.doiXa, Z.treGan][i]]}
            scale={[size.width, size.height, 1]}
            renderOrder={[ORDER.troi, ORDER.doiXa, ORDER.treGan][i]}
          />
        );
      })}
      {[0, 1].map((slot) => (
        <mesh
          key={`g${slot}`}
          ref={(m) => {
            gateMeshes.current[slot] = m;
          }}
          geometry={kit.geo}
          material={kit.gate}
          visible={false}
          renderOrder={ORDER.cong}
        />
      ))}
      {[0, 1].map((slot) => (
        <mesh
          key={`d${slot}`}
          ref={(m) => {
            doorMeshes.current[slot] = m;
          }}
          geometry={kit.geo}
          material={kit.door}
          visible={false}
          renderOrder={ORDER.cua}
        />
      ))}
      {kit.poleGeo.map((geo, i) => (
        <mesh
          key={`p${i}`}
          ref={(m) => {
            poleMeshes.current[i] = m;
          }}
          geometry={geo}
          material={kit.pole}
          visible={false}
          renderOrder={ORDER.cot}
        />
      ))}
      {Array.from({ length: POOL.gaps }, (_, j) => (
        <mesh
          key={`b${j}`}
          ref={(m) => {
            blackMeshes.current[j] = m;
          }}
          geometry={kit.geo}
          material={kit.black}
          visible={false}
          renderOrder={ORDER.den}
        />
      ))}
      {Array.from({ length: POOL.gaps }, (_, j) => (
        <mesh
          key={`t${j}`}
          ref={(m) => {
            pageMeshes.current[j] = m;
          }}
          geometry={kit.geo}
          material={kit.page}
          visible={false}
          renderOrder={ORDER.trang}
        />
      ))}
      <group ref={kiteGroup}>
        <mesh ref={kiteMesh} geometry={kit.geo} material={kit.kite} position={[KITE.fromKnotX * UNIT, KITE.fromKnotY * UNIT, 0]} scale={[kiteW, kiteH, 1]} renderOrder={ORDER.dieu} />
      </group>
      <mesh ref={bookMesh} geometry={kit.geo} material={kit.book} visible={false} renderOrder={ORDER.so} />
      <group ref={studentGroup}>
        <Actor25D x={0} y={0} height={STUDENT_HEIGHT} layer="actorsFront">
          <Character id="characters/hoc-sinh-nam" clips={CLIPS} hang hangSway={!reduced} />
        </Actor25D>
      </group>
    </group>
  );
}
