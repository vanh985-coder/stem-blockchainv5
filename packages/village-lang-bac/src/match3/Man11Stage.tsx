import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Texture } from 'three';
import { Actor25D, Character, type ClipName, type PoseRequest } from '@so-chung/core/three/index';
import { coverSize } from '@so-chung/core/three/scene25d/layout25d';
import { FACE_COLORS, LOTUS_COLOR, TREE_COLOR, makeGroundTexture, useSharedTextures, type Man11Textures } from './man11Art';
import { FAKE_FACE, faceId, newSample, sampleTrack, villainAt, type Mark, type Sample } from './man11Anim';
import type { Man11Engine } from './man11Engine';
import { FACE_QUAD, GRID, LOTUS_QUAD, PANEL_PAD, SLOT_QUAD, WORLD, nodePoint, slotPoint, treePoint, type Man11Layout } from './man11Layout';
import { TREE_ROOT } from './man11Slots';

/** Lớp theo trục Z (thấp hơn lớp của {phanDien}, để {phanDien} ló ra che lên bàn) và thứ tự vẽ của các hình trong suốt. */
const Z = { ground: -10.4, backdrop: -10.2, shadow: -1.85, panel: -1.7, tree: -1.8, slotBg: -1.5, slot: -1.45, seg: -1.4, node: -1.35, glow: -1.3, tile: -1, lotus: -0.95, burst: -0.9, flight: 3 } as const;
const ORDER = { ground: -12, backdrop: -11, shadow: 0, panel: 0, tree: 1, slotBg: 2, slot: 3, seg: 4, node: 5, glow: 6, tile: 10, lotus: 11, burst: 12, flight: 20 } as const;
const BURSTS = 24;
const FLIGHTS = 12;
const MAX_SLOTS = 8;
const MAX_SEGS = 14;
const MAX_NODES = 7;
const BURST_MS = 340;
const SLOT_POP_MS = 300;
const GROW_MS = 260;

const VILLAIN_CLIPS: readonly ClipName[] = ['idle', 'cheer'];
const WHITE = new Color('#ffffff');

/** `tint`: hình trắng dùng chung (chấm, đoạn nối) nhuộm theo `color`; không thì `color` chỉ là màu thay thế khi thiếu hình. */
function mat(map: Texture | null, color: string, extra: { opacity?: number; tint?: boolean } = {}): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, color: map && !extra.tint ? '#ffffff' : color, transparent: true, toneMapped: false, depthWrite: false, opacity: extra.opacity ?? 1 });
}

export interface Man11StageProps {
  layout: Man11Layout;
  engine: Man11Engine;
  textures: Man11Textures;
  /** Loại lá cần của từng ô cây (vòng hiện tại) */
  needs: readonly number[];
  /** Đổi khi sang vòng mới hay đổi cỡ cây: để dựng lại phần cây */
  version: number;
  reduced: boolean;
  /** Tạm dừng thật ("?" mở, tab ẩn): đồng hồ hoạt cảnh đứng yên */
  paused: boolean;
  /** Mốc thời gian của hoạt cảnh vừa tới (âm thanh, lời nói, hết vòng) */
  onMark: (m: Mark) => void;
  /** Hoạt cảnh vừa xong */
  onIdle: () => void;
  villainClip: ClipName;
  villainTrigger: number;
  pose: PoseRequest | undefined;
}

interface Seg {
  level: number;
  index: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  len: number;
  angle: number;
}

/**
 * Cảnh màn 11 trong Scene25D: khay bàn, 49 miếng (mỗi miếng một hình lá và một hình hoa sen phủ lên), cây (ô cây mờ hình lá cần, cành nối, nút gộp, vầng sáng gốc), vòng nổ, lá bay, và {phanDien} 3D ló ra mép khung.
 * Mọi vị trí lấy mẫu từ `engine` (dòng thời gian do `man11Anim` lập từ danh sách sự kiện của logic) mỗi khung hình, không cấp phát; mọi hình chung một hình học (mặt phẳng 1 × 1) và mỗi miếng một vật liệu riêng
 * (độ trong riêng). Hình thiếu thì dùng ô màu thay thế. Rời màn thì giải phóng hình học, vật liệu và texture tự vẽ.
 */
export const Man11Stage = memo(function Man11Stage({ layout, engine, textures, needs, version, reduced, paused, onMark, onIdle, villainClip, villainTrigger, pose }: Man11StageProps) {
  const count = engine.count;
  const shared = useSharedTextures(layout.cell, PANEL_PAD, GRID);
  const geo = useMemo(() => new PlaneGeometry(1, 1), []);
  const blank = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 4, 4);
    }
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => blank.dispose(), [blank]);

  // mặt đất vẽ bằng code (nằm sau ảnh nền đã bóc nền trắng), cùng tông với cỏ của ảnh
  const grass = textures.backdrop?.grass;
  const ground = useMemo(() => makeGroundTexture(grass ?? [140, 190, 90], !textures.backdrop), [grass, textures.backdrop]);
  useEffect(() => () => ground.dispose(), [ground]);
  const faceColors = useMemo(() => FACE_COLORS.map((c) => new Color(c)), []);
  const lotusColor = useMemo(() => new Color(LOTUS_COLOR), []);

  const mats = useMemo(
    () => ({
      ground: mat(ground, '#8cbe5a'),
      backdrop: textures.backdrop ? mat(textures.backdrop.texture, '#ffffff') : null,
      shadow: mat(shared.dot, '#1d2b12', { opacity: 0.3, tint: true }),
      panel: mat(shared.panel, '#fdf4dc'),
      tree: mat(textures.tree, TREE_COLOR),
      tiles: Array.from({ length: GRID * GRID }, () => mat(blank, '#ffffff')),
      lotus: Array.from({ length: GRID * GRID }, () => mat(textures.lotus, LOTUS_COLOR)),
      slotBg: Array.from({ length: MAX_SLOTS }, () => mat(shared.dot, '#fff6dc', { opacity: 0.85, tint: true })),
      slots: Array.from({ length: MAX_SLOTS }, () => mat(blank, '#ffffff')),
      segs: Array.from({ length: MAX_SEGS }, () => mat(shared.line, '#4f9a3c', { tint: true })),
      nodes: Array.from({ length: MAX_NODES }, () => mat(shared.dot, '#3f8a34', { tint: true })),
      glow: mat(shared.dot, '#ffd24a', { opacity: 0.6, tint: true }),
      bursts: Array.from({ length: BURSTS }, () => mat(shared.ring, '#ffffff', { tint: true })),
      flights: Array.from({ length: FLIGHTS }, () => mat(blank, '#ffffff')),
    }),
    [shared, textures.tree, textures.lotus, textures.backdrop, ground, blank],
  );
  useEffect(
    () => () => {
      mats.panel.dispose();
      mats.tree.dispose();
      mats.glow.dispose();
      mats.ground.dispose();
      mats.backdrop?.dispose();
      mats.shadow.dispose();
      for (const list of [mats.tiles, mats.lotus, mats.slotBg, mats.slots, mats.segs, mats.nodes, mats.bursts, mats.flights]) for (const m of list) m.dispose();
    },
    [mats],
  );

  const tileMeshes = useRef<(Mesh | null)[]>([]);
  const lotusMeshes = useRef<(Mesh | null)[]>([]);
  const slotBgMeshes = useRef<(Mesh | null)[]>([]);
  const slotMeshes = useRef<(Mesh | null)[]>([]);
  const segMeshes = useRef<(Mesh | null)[]>([]);
  const nodeMeshes = useRef<(Mesh | null)[]>([]);
  const glowMesh = useRef<Mesh>(null);
  const burstMeshes = useRef<(Mesh | null)[]>([]);
  const flightMeshes = useRef<(Mesh | null)[]>([]);
  const villain = useRef<Group>(null);
  const applied = useRef<Int8Array>(new Int8Array(GRID * GRID).fill(-1));
  const appliedSlot = useRef<Int8Array>(new Int8Array(MAX_SLOTS).fill(-2));
  const appliedFlight = useRef<Int8Array>(new Int8Array(FLIGHTS).fill(-1));
  // hình lá nạp xong (hay vật liệu dựng lại) thì áp lại hình cho mọi miếng
  useEffect(() => {
    applied.current.fill(-1);
    appliedSlot.current.fill(-2);
    appliedFlight.current.fill(-1);
  }, [textures, mats]);
  const sample = useMemo<Sample>(() => newSample(), []);

  // Cành nối và nút gộp của cây `count` ô (đổi theo vòng và theo khung)
  const levels = Math.round(Math.log2(count));
  const geometry = useMemo(() => {
    const segs: Seg[] = [];
    const nodes: { level: number; index: number; x: number; y: number }[] = [];
    for (let level = 1; level <= levels; level++) {
      for (let index = 0; index < count >> level; index++) {
        const at = nodePoint(layout, count, level, index);
        nodes.push({ level, index, x: at.x, y: at.y });
        for (const k of [2 * index, 2 * index + 1]) {
          const from = level === 1 ? slotPoint(layout, count, k) : nodePoint(layout, count, level - 1, k);
          segs.push({ level, index, from, to: at, len: Math.hypot(at.x - from.x, at.y - from.y), angle: Math.atan2(at.y - from.y, at.x - from.x) });
        }
      }
    }
    const slotPts = Array.from({ length: count }, (_, i) => slotPoint(layout, count, i));
    return { segs, nodes, slotPts, root: nodePoint(layout, count, levels, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, count, levels, version]);

  const latest = useRef({ paused, onMark, onIdle, reduced, needs });
  latest.current = { paused, onMark, onIdle, reduced, needs };

  useFrame((_, dt) => {
    const { paused: isPaused, onMark: markFn, onIdle: idleFn, reduced: calm, needs: need } = latest.current;
    const finished = engine.update(dt * 1000, isPaused, markFn);
    if (finished) idleFn();
    const playing = engine.playing;
    const tl = engine.timeline;
    const clock = engine.clock;
    const cell = layout.cell;
    const now = engine.now;

    // 49 miếng
    for (let i = 0; i < GRID * GRID; i++) {
      const mesh = tileMeshes.current[i];
      const lotus = lotusMeshes.current[i];
      if (!mesh || !lotus) continue;
      const tr = engine.trackOf[i];
      const t = engine.view.tiles[i];
      if (tr && playing) sampleTrack(tr, clock, sample);
      else {
        sample.r = t.r;
        sample.c = t.c;
        sample.s = t.s;
        sample.a = t.a;
        sample.face = faceId(t);
        sample.lotus = t.lotus;
      }
      const visible = sample.a > 0.01 && sample.s > 0.01;
      mesh.visible = visible;
      lotus.visible = visible && sample.lotus;
      if (!visible) continue;
      const x = layout.board.x0 + (sample.c + 0.5) * cell;
      const y = layout.board.y1 - (sample.r + 0.5) * cell;
      const q = FACE_QUAD[sample.face];
      mesh.position.set(x, y, Z.tile);
      mesh.scale.set(q.w * cell * sample.s, q.h * cell * sample.s, 1);
      const m = mats.tiles[i];
      m.opacity = sample.a;
      if (applied.current[i] !== sample.face) {
        applied.current[i] = sample.face;
        const tex = textures.faces[sample.face];
        m.map = tex ?? blank;
        m.color.copy(tex ? WHITE : faceColors[sample.face]);
      }
      if (sample.lotus) {
        lotus.position.set(x, y, Z.lotus);
        const ls = LOTUS_QUAD * cell * sample.s;
        lotus.scale.set(ls, ls, 1);
        mats.lotus[i].opacity = sample.a;
      }
    }

    // vòng nổ
    const bursts = tl.bursts;
    for (let k = 0; k < BURSTS; k++) {
      const mesh = burstMeshes.current[k];
      if (!mesh) continue;
      const b = playing && k < bursts.length ? bursts[k] : null;
      const age = b ? clock - b.t0 : -1;
      if (!b || age < 0 || age > BURST_MS) {
        mesh.visible = false;
        continue;
      }
      const u = age / BURST_MS;
      mesh.visible = true;
      mesh.position.set(layout.board.x0 + (b.c + 0.5) * cell, layout.board.y1 - (b.r + 0.5) * cell, Z.burst);
      const s = cell * (0.7 + 1.5 * u) * (b.lotus ? 1.5 : 1);
      mesh.scale.set(s, s, 1);
      mats.bursts[k].opacity = (1 - u) * 0.9;
      mats.bursts[k].color.copy(b.lotus ? lotusColor : b.leaf >= 0 ? faceColors[b.leaf] : WHITE);
    }

    // lá bay: lá lên ô cây, lá giả {phanDien} ném vào bàn
    const vk = playing ? villainAt(tl.villain, clock) : 0;
    const vy = layout.villain.hiddenY + (layout.villain.peekY - layout.villain.hiddenY) * vk;
    const flights = tl.flights;
    for (let k = 0; k < FLIGHTS; k++) {
      const mesh = flightMeshes.current[k];
      if (!mesh) continue;
      const f = playing && k < flights.length ? flights[k] : null;
      if (!f || clock < f.t0 || clock > f.t1) {
        mesh.visible = false;
        continue;
      }
      const u = (clock - f.t0) / Math.max(1, f.t1 - f.t0);
      let fx: number;
      let fy: number;
      if (f.from) {
        fx = layout.board.x0 + (f.from.c + 0.5) * cell;
        fy = layout.board.y1 - (f.from.r + 0.5) * cell;
      } else {
        fx = layout.villain.x - 0.4;
        fy = vy + layout.villain.height * 0.75;
      }
      let tx: number;
      let ty: number;
      if (f.kind === 'slot') {
        const p = geometry.slotPts[f.slot] ?? geometry.root;
        tx = p.x;
        ty = p.y;
      } else {
        tx = layout.board.x0 + ((f.to?.c ?? 0) + 0.5) * cell;
        ty = layout.board.y1 - ((f.to?.r ?? 0) + 0.5) * cell;
      }
      const e = f.kind === 'slot' ? 1 - (1 - u) * (1 - u) : u;
      mesh.visible = true;
      mesh.position.set(fx + (tx - fx) * e, fy + (ty - fy) * e + f.arc * 4 * u * (1 - u), Z.flight);
      mesh.rotation.z = calm ? 0 : u * (f.kind === 'fake' ? 9 : 4);
      const face = f.kind === 'fake' ? FAKE_FACE : f.leaf;
      const q = FACE_QUAD[face] ?? FACE_QUAD[0];
      const sc = f.kind === 'slot' ? 1.0 - 0.35 * u : 1.0;
      mesh.scale.set(q.w * cell * sc * 0.9, q.h * cell * sc * 0.9, 1);
      const m = mats.flights[k];
      if (appliedFlight.current[k] !== face) {
        appliedFlight.current[k] = face;
        const tex = textures.faces[face];
        m.map = tex ?? blank;
        m.color.copy(tex ? WHITE : faceColors[face]);
      }
    }

    // {phanDien} ló ra mép khung
    const v = villain.current;
    if (v) {
      v.visible = vk > 0.001;
      v.position.set(layout.villain.x, vy, 0);
    }

    // cây: ô cây, cành nối, nút gộp, vầng sáng gốc
    for (let i = 0; i < MAX_SLOTS; i++) {
      const bg = slotBgMeshes.current[i];
      const mesh = slotMeshes.current[i];
      if (!bg || !mesh) continue;
      const p = geometry.slotPts[i];
      if (i >= engine.count || !p) {
        bg.visible = false;
        mesh.visible = false;
        continue;
      }
      const filled = engine.filled[i];
      const face = need[i] ?? 0;
      let pop = 1;
      if (filled && !calm) {
        const age = now - engine.slotAt[i];
        if (age >= 0 && age < SLOT_POP_MS) pop = 1 + 0.4 * Math.sin((age / SLOT_POP_MS) * Math.PI);
      }
      bg.visible = true;
      bg.position.set(p.x, p.y, Z.slotBg);
      bg.scale.set(1.2 * pop, 1.2 * pop, 1);
      mats.slotBg[i].color.copy(filled ? lotusColor : WHITE);
      mats.slotBg[i].opacity = filled ? 0.5 : 0.8;
      mesh.visible = true;
      mesh.position.set(p.x, p.y, Z.slot);
      const q = FACE_QUAD[face] ?? FACE_QUAD[0];
      const base = SLOT_QUAD / FACE_QUAD[0].w;
      mesh.scale.set(q.w * base * pop, q.h * base * pop, 1);
      const m = mats.slots[i];
      m.opacity = filled ? 1 : 0.42;
      if (appliedSlot.current[i] !== face) {
        appliedSlot.current[i] = face;
        const tex = textures.faces[face];
        m.map = tex ?? blank;
        m.color.copy(tex ? WHITE : faceColors[face]);
      }
    }
    const segs = geometry.segs;
    for (let k = 0; k < MAX_SEGS; k++) {
      const mesh = segMeshes.current[k];
      if (!mesh) continue;
      const sg = k < segs.length ? segs[k] : null;
      if (!sg || !engine.merged[sg.level - 1]?.[sg.index]) {
        if (mesh.visible) mesh.visible = false;
        continue;
      }
      const g = calm ? 1 : Math.min(1, (now - engine.branchAt[sg.level - 1][sg.index]) / GROW_MS);
      mesh.visible = true;
      mesh.position.set(sg.from.x + ((sg.to.x - sg.from.x) * g) / 2, sg.from.y + ((sg.to.y - sg.from.y) * g) / 2, Z.seg);
      mesh.rotation.z = sg.angle;
      mesh.scale.set(Math.max(0.01, sg.len * g), 0.22, 1);
    }
    const nodes = geometry.nodes;
    for (let k = 0; k < MAX_NODES; k++) {
      const mesh = nodeMeshes.current[k];
      if (!mesh) continue;
      const nd = k < nodes.length ? nodes[k] : null;
      if (!nd || !engine.merged[nd.level - 1]?.[nd.index]) {
        if (mesh.visible) mesh.visible = false;
        continue;
      }
      const g = calm ? 1 : Math.min(1, Math.max(0, (now - engine.branchAt[nd.level - 1][nd.index] - GROW_MS * 0.6) / 200));
      mesh.visible = g > 0;
      mesh.position.set(nd.x, nd.y, Z.node);
      const s = (nd.level === levels ? 0.62 : 0.42) * g;
      mesh.scale.set(s, s, 1);
    }
    const glow = glowMesh.current;
    if (glow) {
      glow.visible = engine.treeAt >= 0;
      if (glow.visible) {
        const pulse = calm ? 1 : 1 + 0.12 * Math.sin(now / 170);
        const age = Math.min(1, (now - engine.treeAt) / 400);
        const s = 2.4 * pulse * (calm ? 1 : 0.4 + 0.6 * age);
        glow.position.set(geometry.root.x, geometry.root.y, Z.glow);
        glow.scale.set(s, s, 1);
      }
    }
  });

  const world = WORLD[layout.frame];
  const backdropSize = coverSize({ width: textures.backdrop?.width ?? 0, height: textures.backdrop?.height ?? 0 }, world);
  const rootX = treePoint(layout, TREE_ROOT).x;
  const panelW = layout.panel.x1 - layout.panel.x0;
  const panelH = layout.panel.y1 - layout.panel.y0;
  const treeW = layout.tree.x1 - layout.tree.x0;
  const treeH = layout.tree.y1 - layout.tree.y0;

  return (
    <>
      <mesh geometry={geo} material={mats.ground} position={[0, 0, Z.ground]} scale={[world.width, world.height, 1]} renderOrder={ORDER.ground} />
      {mats.backdrop && textures.backdrop && <mesh geometry={geo} material={mats.backdrop} position={[0, 0, Z.backdrop]} scale={[backdropSize.width, backdropSize.height, 1]} renderOrder={ORDER.backdrop} />}
      <mesh geometry={geo} material={mats.shadow} position={[rootX, layout.tree.y0 + 0.14, Z.shadow]} scale={[2.8, 0.6, 1]} renderOrder={ORDER.shadow} />
      <mesh geometry={geo} material={mats.panel} position={[(layout.panel.x0 + layout.panel.x1) / 2, (layout.panel.y0 + layout.panel.y1) / 2, Z.panel]} scale={[panelW, panelH, 1]} renderOrder={ORDER.panel} />
      <mesh geometry={geo} material={mats.tree} position={[(layout.tree.x0 + layout.tree.x1) / 2, (layout.tree.y0 + layout.tree.y1) / 2, Z.tree]} scale={[treeW, treeH, 1]} renderOrder={ORDER.tree} />
      {Array.from({ length: MAX_SLOTS }, (_, i) => (
        <group key={`slot${i}`}>
          <mesh
            ref={(m) => {
              slotBgMeshes.current[i] = m;
            }}
            geometry={geo}
            material={mats.slotBg[i]}
            renderOrder={ORDER.slotBg}
            visible={false}
          />
          <mesh
            ref={(m) => {
              slotMeshes.current[i] = m;
            }}
            geometry={geo}
            material={mats.slots[i]}
            renderOrder={ORDER.slot}
            visible={false}
          />
        </group>
      ))}
      {Array.from({ length: MAX_SEGS }, (_, k) => (
        <mesh
          key={`seg${k}`}
          ref={(m) => {
            segMeshes.current[k] = m;
          }}
          geometry={geo}
          material={mats.segs[k]}
          renderOrder={ORDER.seg}
          visible={false}
        />
      ))}
      {Array.from({ length: MAX_NODES }, (_, k) => (
        <mesh
          key={`node${k}`}
          ref={(m) => {
            nodeMeshes.current[k] = m;
          }}
          geometry={geo}
          material={mats.nodes[k]}
          renderOrder={ORDER.node}
          visible={false}
        />
      ))}
      <mesh ref={glowMesh} geometry={geo} material={mats.glow} renderOrder={ORDER.glow} visible={false} />
      {Array.from({ length: GRID * GRID }, (_, i) => (
        <group key={`tile${i}`}>
          <mesh
            ref={(m) => {
              tileMeshes.current[i] = m;
            }}
            geometry={geo}
            material={mats.tiles[i]}
            renderOrder={ORDER.tile}
          />
          <mesh
            ref={(m) => {
              lotusMeshes.current[i] = m;
            }}
            geometry={geo}
            material={mats.lotus[i]}
            renderOrder={ORDER.lotus}
            visible={false}
          />
        </group>
      ))}
      {Array.from({ length: BURSTS }, (_, k) => (
        <mesh
          key={`burst${k}`}
          ref={(m) => {
            burstMeshes.current[k] = m;
          }}
          geometry={geo}
          material={mats.bursts[k]}
          renderOrder={ORDER.burst}
          visible={false}
        />
      ))}
      {Array.from({ length: FLIGHTS }, (_, k) => (
        <mesh
          key={`flight${k}`}
          ref={(m) => {
            flightMeshes.current[k] = m;
          }}
          geometry={geo}
          material={mats.flights[k]}
          renderOrder={ORDER.flight}
          visible={false}
        />
      ))}
      {/* {phanDien} ló ra từ mép dưới khung (nhóm dời lên xuống theo dòng thời gian) */}
      <group ref={villain} visible={false}>
        <mesh geometry={geo} material={mats.shadow} position={[0, 0.06, 0.9]} scale={[1.7, 0.42, 1]} renderOrder={ORDER.shadow} />
        <Actor25D x={0} y={0} height={layout.villain.height} layer="actorsFront">
          <Character id="characters/ti" animation={villainClip} trigger={villainTrigger} returnTo="idle" clips={VILLAIN_CLIPS} pose={pose} />
        </Actor25D>
      </group>
    </>
  );
});
