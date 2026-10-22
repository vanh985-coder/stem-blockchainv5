import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshBasicMaterial, PlaneGeometry, type Group, type Mesh, type Texture } from 'three';
import { Actor25D, Character, type ClipName } from '@so-chung/core/three/index';
import { CLIMB_SPEC } from './climbConfig';
import {
  BAR,
  COIN,
  CROWN,
  HANDLE,
  LABEL,
  LEAF,
  PLAYER,
  ROOT,
  TRUNK,
  VILLAIN,
  WORLD,
  barY,
  cameraY,
  coinSpots,
  feetY,
  handleY,
  heldLabelVisible,
  labelY,
  rootY,
  topY,
  trunkTiles,
  villainY,
  type ClimbFrame,
} from './climbLayout';
import { labelKey, makeSkyTexture, type ClimbTextures } from './climbArt';
import { nextCenter, type ClimbState } from './climbLogic';

// ---------------------------------------------------------------------------
// Hoạt cảnh dùng chung giữa màn chơi (ghi) và cảnh (đọc mỗi khung, không cấp phát)

/** Một đoạn chuyển động từ y0 tới y1 bắt đầu lúc `start` (ms, performance.now), dài `dur` ms; `ease`: 0 đều, 1 chậm dần, 2 nhanh dần. */
export interface Tween {
  y0: number;
  y1: number;
  start: number;
  dur: number;
  ease: 0 | 1 | 2;
}

export function tweenAt(t: Tween, now: number): number {
  const u = t.dur <= 0 ? 1 : Math.min(1, Math.max(0, (now - t.start) / t.dur));
  const e = t.ease === 1 ? 1 - (1 - u) * (1 - u) : t.ease === 2 ? u * u : u;
  return t.y0 + (t.y1 - t.y0) * e;
}

/** Tiền đồng: 0 đang treo, 1 bay vào ô đếm, 2 rơi mờ dần, 3 đã hết. */
export interface CoinAnim {
  mode: 0 | 1 | 2 | 3;
  start: number;
}

export interface ClimbAnim {
  /** Độ cao chân người chơi (hệ của cây) */
  player: Tween;
  /** Tay nắm vừa nắm được kéo về giữa thân: tầng, x lúc nắm, lúc bắt đầu (ms) */
  pull: { level: number; fromX: number; start: number };
  coins: CoinAnim[];
}

/** Độ cao chân người chơi khi treo ở tầng k (hai bàn tay nắm tay nắm). */
export const hangFeetY = (k: number): number => feetY(k);
export const PULL_MS = 300;
const FLY_MS = 450;
const FALL_MS = 800;

export function newAnim(depth: number): ClimbAnim {
  const y = hangFeetY(0);
  return {
    player: { y0: y, y1: y, start: 0, dur: 0, ease: 0 },
    pull: { level: -1, fromX: 0, start: 0 },
    coins: Array.from({ length: depth * CLIMB_SPEC.coinsPerGap }, () => ({ mode: 0 as const, start: 0 })),
  };
}

// ---------------------------------------------------------------------------

const Z = { trunk: -3, bar: -2.6, coin: -2.4, handle: -2.2, villain: -1, player: 0, label: 0.6 } as const;
const PLACEHOLDER = { trunk: '#8a5a32', bar: '#7a4a28', handle: '#d9573b', root: '#7a5536', crown: '#5f9e3a', coin: '#b8862e', leaf: '#4f8f3a', fakeLeaf: '#555b66' } as const;

function mat(map: Texture | null, color: string): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, color: map ? '#ffffff' : color, transparent: true, toneMapped: false, depthWrite: false });
}

export interface ClimbStageProps {
  state: ClimbState;
  anim: ClimbAnim;
  frame: ClimbFrame;
  textures: ClimbTextures;
  /** Nhãn "Sổ / Nay" của vòng (khóa `level:index`) */
  labels: Map<string, Texture> | null;
  /** Đổi khi người chơi lên tầng, sang vòng mới (để dựng lại nhãn đang hiện) */
  version: number;
  reduced: boolean;
  studentClip: ClipName;
  studentTrigger: number;
  /** Đang treo tay (tư thế `hang`); false lúc bật lên */
  hanging: boolean;
  villainClip: ClipName;
  villainTrigger: number;
}

/** Lúc treo dùng clip `idle` cộng tư thế `hang` dựng bằng code (clip `hang` trong file model sai: ngồi co ôm mặt, xem spec 03 mục 3.2); lúc bật dùng clip `jump`. */
const STUDENT_CLIPS: readonly ClipName[] = ['idle', 'jump'];
const VILLAIN_CLIPS: readonly ClipName[] = ['idle', 'cheer', 'jump'];

/**
 * Cảnh màn 12 trong Scene25D: trời (dải màu chuyển, đứng yên), và cả cây trong một nhóm dời xuống theo camera (camera đi theo người chơi lên trên; "Giảm chuyển động" thì nhảy thẳng).
 * Mọi tấm hình dùng chung một hình học (mặt phẳng 1 × 1); thân, cành, tay nắm, đồng mỗi loại một vật liệu. Tay nắm tầng trên trượt theo `nextCenter` của logic; vị trí cập nhật mỗi khung,
 * không cấp phát. Rời màn thì giải phóng hình học, vật liệu và texture trời.
 */
export function ClimbStage({ state, anim, frame, textures, labels, version, reduced, studentClip, studentTrigger, hanging, villainClip, villainTrigger }: ClimbStageProps) {
  const depth = state.tree.depth;
  const tree = useRef<Group>(null);
  const player = useRef<Group>(null);
  const pairL = useRef<Group>(null);
  const pairR = useRef<Group>(null);
  const held = useRef<Group>(null);
  const heldLabel = useRef<Mesh>(null);
  const coinRefs = useRef<(Mesh | null)[]>([]);
  const cam = useRef(cameraY(frame, 0));

  const geo = useMemo(() => new PlaneGeometry(1, 1), []);
  const sky = useMemo(() => makeSkyTexture(), []);
  const mats = useMemo(
    () => ({
      sky: new MeshBasicMaterial({ map: sky, toneMapped: false, depthWrite: false }),
      trunk: mat(textures.trunk, PLACEHOLDER.trunk),
      bar: mat(textures.bar, PLACEHOLDER.bar),
      handle: mat(textures.handle, PLACEHOLDER.handle),
      leaf: mat(textures.leaf, PLACEHOLDER.leaf),
      fakeLeaf: mat(textures.fakeLeaf, PLACEHOLDER.fakeLeaf),
      root: mat(textures.root, PLACEHOLDER.root),
      crown: mat(textures.crown, PLACEHOLDER.crown),
      coin: mat(textures.coin, PLACEHOLDER.coin),
      coinFade: mat(textures.coin, PLACEHOLDER.coin),
    }),
    [sky, textures],
  );
  // Nhãn đang hiện: tay nắm đang giữ, và hai tay nắm tầng trên (vật liệu riêng, đổi texture khi lên tầng)
  const labelMats = useMemo(() => [0, 1, 2].map(() => new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false })), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => sky.dispose(), [sky]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useEffect(() => () => labelMats.forEach((m) => m.dispose()), [labelMats]);

  const level = state.level;
  const index = state.index;
  const nextLevel = level + 1;
  useEffect(() => {
    const get = (k: number, i: number) => labels?.get(labelKey(k, i)) ?? null;
    const set = (m: MeshBasicMaterial, t: Texture | null) => {
      if (m.map !== t) {
        m.map = t;
        m.color.set(t ? '#ffffff' : '#fdf6e3');
        m.needsUpdate = true;
      }
    };
    set(labelMats[0], get(level, index));
    set(labelMats[1], nextLevel <= depth ? get(nextLevel, 2 * index) : null);
    set(labelMats[2], nextLevel <= depth ? get(nextLevel, 2 * index + 1) : null);
  }, [labels, labelMats, level, index, nextLevel, depth, version]);

  const tiles = useMemo(() => trunkTiles(depth), [depth]);
  const world = WORLD[frame];

  useFrame((_, dt) => {
    const now = performance.now();
    const g = tree.current;
    if (!g) return;
    // camera đi theo tầng người chơi đang giữ
    const target = cameraY(frame, state.level);
    cam.current = reduced ? target : cam.current + (target - cam.current) * (1 - Math.exp(-5 * Math.min(dt, 0.1)));
    g.position.y = -cam.current;
    // người chơi
    if (player.current) player.current.position.y = tweenAt(anim.player, now);
    // tay nắm đang giữ: kéo về giữa thân trong 0,3 giây
    if (held.current) {
      const p = anim.pull;
      const u = p.level === state.level ? Math.min(1, (now - p.start) / PULL_MS) : 1;
      held.current.position.x = p.level === state.level ? p.fromX * (1 - u) : 0;
      held.current.position.y = barY(state.level);
    }
    // nhãn của tay nắm đang giữ: ẩn từ lúc bật lên tới khi người chơi về chỗ treo (nhãn nằm trên thanh, đúng chỗ người chơi bay qua khi bật)
    if (heldLabel.current) heldLabel.current.visible = heldLabelVisible(state.peakAt, now, anim.player.start + anim.player.dur);
    // cặp tay nắm tầng trên trượt theo logic
    const show = state.level < depth;
    if (pairL.current && pairR.current) {
      pairL.current.visible = show;
      pairR.current.visible = show;
      if (show) {
        const c = nextCenter(state);
        const y = barY(state.level + 1);
        pairL.current.position.set(c - CLIMB_SPEC.halfGap, y, 0);
        pairR.current.position.set(c + CLIMB_SPEC.halfGap, y, 0);
      }
    }
    // tiền đồng
    let fade = 1;
    for (let i = 0; i < coinRefs.current.length; i++) {
      const m = coinRefs.current[i];
      const a = anim.coins[i];
      if (!m || !a) continue;
      const spot = coinSpots(Math.floor(i / 2))[i % 2];
      if (a.mode === 0) {
        m.visible = true;
        m.material = mats.coin;
        m.position.set(spot.x, spot.y, Z.coin);
        m.scale.set(COIN.size, COIN.size, 1);
      } else if (a.mode === 1) {
        const u = reduced ? 1 : Math.min(1, (now - a.start) / FLY_MS);
        if (u >= 1) {
          m.visible = false;
          a.mode = 3;
          continue;
        }
        // bay về ô đếm ở góc trên phải của khung
        const tx = world.width / 2 - 1.1;
        const ty = cam.current + world.height / 2 - 0.9;
        const e = u * u;
        m.position.set(spot.x + (tx - spot.x) * e, spot.y + (ty - spot.y) * e, Z.label + 0.2);
        const s = COIN.size * (1 - 0.4 * u);
        m.scale.set(s, s, 1);
      } else if (a.mode === 2) {
        const u = reduced ? 1 : Math.min(1, (now - a.start) / FALL_MS);
        if (u >= 1) {
          m.visible = false;
          a.mode = 3;
          continue;
        }
        m.material = mats.coinFade;
        fade = Math.min(fade, 1 - u);
        m.position.set(spot.x + (i % 2 ? 0.3 : -0.3) * u, spot.y - 2.5 * u * u, Z.coin);
      } else m.visible = false;
    }
    mats.coinFade.opacity = fade;
  });

  // nút của đường đã leo qua (dưới tầng đang giữ): tay nắm ở giữa thân
  const passed: number[] = [];
  for (let k = 0; k < level; k++) passed.push(k);
  const handleMat = (k: number) => (k === depth ? mats.leaf : mats.handle);
  const handleScale = (k: number): [number, number, number] => (k === depth ? [LEAF.size, LEAF.size, 1] : [HANDLE.width, HANDLE.height, 1]);
  const handleOffset = (k: number) => (k === depth ? -LEAF.size / 2 + 0.1 : handleY(k) - barY(k));

  return (
    <>
      <mesh geometry={geo} material={mats.sky} position={[0, 0, -10]} scale={[world.width, world.height, 1]} renderOrder={-10} />
      <group ref={tree}>
        <mesh geometry={geo} material={mats.root} position={[0, rootY(), Z.trunk + 0.05]} scale={[ROOT.width, ROOT.height, 1]} />
        {tiles.map((y, i) => (
          <mesh key={i} geometry={geo} material={mats.trunk} position={[0, y, Z.trunk]} scale={[TRUNK.width, TRUNK.tile, 1]} />
        ))}
        <mesh geometry={geo} material={mats.crown} position={[0, topY(depth), Z.trunk + 0.1]} scale={[CROWN.width, CROWN.height, 1]} />
        {Array.from({ length: depth + 1 }, (_, k) => (
          <mesh key={k} geometry={geo} material={mats.bar} position={[0, barY(k), Z.bar]} scale={[BAR.width, BAR.height, 1]} />
        ))}
        {passed.map((k) => (
          <mesh key={k} geometry={geo} material={handleMat(k)} position={[0, barY(k) + handleOffset(k), Z.handle]} scale={handleScale(k)} />
        ))}
        {/* tay nắm đang giữ và nhãn của nó */}
        <group ref={held} position={[0, barY(level), 0]}>
          <mesh geometry={geo} material={handleMat(level)} position={[0, handleOffset(level), Z.handle]} scale={handleScale(level)} />
          <mesh ref={heldLabel} geometry={geo} material={labelMats[0]} position={[0, labelY(level) - barY(level), Z.label]} scale={[LABEL.width, LABEL.height, 1]} />
        </group>
        {/* cặp tay nắm tầng trên */}
        {[pairL, pairR].map((ref, j) => (
          <group key={j} ref={ref} visible={false}>
            <mesh geometry={geo} material={handleMat(nextLevel)} position={[0, handleOffset(nextLevel), Z.handle]} scale={handleScale(nextLevel)} />
            <mesh geometry={geo} material={labelMats[j + 1]} position={[0, LABEL.above, Z.label]} scale={[LABEL.width, LABEL.height, 1]} />
          </group>
        ))}
        {anim.coins.map((_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              coinRefs.current[i] = m;
            }}
            geometry={geo}
            material={mats.coin}
          />
        ))}
        {/* {phanDien} trên ngọn cây, ôm lá giả */}
        <Actor25D x={1.0} y={villainY(depth)} layer="actorsBack" height={VILLAIN.height}>
          <Character id="characters/ti" animation={villainClip} trigger={villainTrigger} returnTo="idle" clips={VILLAIN_CLIPS} />
        </Actor25D>
        <mesh geometry={geo} material={mats.fakeLeaf} position={[0.55, villainY(depth) + 0.85, Z.villain + 1.4]} scale={[0.95, 0.95, 1]} rotation-z={0.3} />
        {/* học sinh treo ở x = 0, dưới tay nắm đang giữ */}
        <group ref={player} position={[0, hangFeetY(0), 0]}>
          <Actor25D x={0} y={0} layer="actors" height={PLAYER.height}>
            <Character id="characters/hoc-sinh-nam" animation={studentClip} trigger={studentTrigger} returnTo="idle" clips={STUDENT_CLIPS} hang={hanging} hangSway={!reduced} />
          </Actor25D>
        </group>
      </group>
    </>
  );
}
