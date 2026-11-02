import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshBasicMaterial, PlaneGeometry, type Group, type Mesh, type Texture } from 'three';
import { Actor25D, Character, type ClipName } from '@so-chung/core/three/index';
import { CROWN, LEAF_FAKE, PLAYER, ROOT, SIGN, STEP, TRUNK, VILLAIN, WORLD, cameraY, crackAlpha, crownY, rootY, signY, stepCenterY, stepLift, trunkTiles, villainY, type ClimbFrame } from './climbLayout';
import { makeCrackTexture, makeSkyTexture, type ClimbLabels, type ClimbTextures } from './climbArt';
import { choiceX, nodeValue, siblingValue, siblingX, standX, tierY, type ClimbState } from './climbLogic';

// ---------------------------------------------------------------------------
// Hoạt cảnh dùng chung giữa màn chơi (ghi) và cảnh (đọc mỗi khung, không cấp phát)

export interface ClimbAnim {
  /** Hình dịch từ (fromX, fromY) về chỗ thật của người chơi trong `dur` ms kể từ `start` (performance.now); dur 0 là không dịch */
  tween: { fromX: number; fromY: number; start: number; dur: number };
  /** Chiều quay mặt lần cuối: −1 trái, +1 phải */
  facing: -1 | 1;
  /** Lá giả rơi khỏi tay {phanDien} lúc `leafStart` (ms); 0 là chưa rơi */
  leafStart: number;
}

export const newAnim = (): ClimbAnim => ({ tween: { fromX: 0, fromY: 0, start: 0, dur: 0 }, facing: 1, leafStart: 0 });

const LEAF_FALL_MS = 700;
const TURN_RATE = 14;

const Z = { trunk: -3, sign: -2.7, step: -1.2, crack: -1.1, villain: -1, leaf: 0.4 } as const;
const PLACEHOLDER = { trunk: '#8a5a32', root: '#7a5536', crown: '#5f9e3a', leaf: '#555b66', step: '#b8803f' } as const;

function mat(map: Texture | null, color: string): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, color: map ? '#ffffff' : color, transparent: true, toneMapped: false, depthWrite: false });
}

export interface ClimbStageProps {
  state: ClimbState;
  anim: ClimbAnim;
  frame: ClimbFrame;
  textures: ClimbTextures;
  /** Bậc gỗ có số và biển ngọn cây của vòng (vẽ theo cỡ khung) */
  labels: ClimbLabels | null;
  /** Đổi khi sang vòng mới hay làm lại ván (để gắn lại số lên bậc) */
  version: number;
  reduced: boolean;
  studentClip: ClipName;
  studentTrigger: number;
  /** Phát lại tư thế rơi (đổi số để phát lại) */
  fallTrigger: number;
  villainClip: ClipName;
  villainTrigger: number;
}

const STUDENT_CLIPS: readonly ClipName[] = ['idle', 'run', 'jump'];
const VILLAIN_CLIPS: readonly ClipName[] = ['idle', 'cheer', 'jump'];
const MAX_CHOICES = 3;

/**
 * Cảnh màn 12 trong Scene25D: trời (dải màu chuyển, đứng yên), cả cây trong một nhóm dời xuống theo camera (camera đi theo tầng em đang đứng; "Giảm chuyển động" thì nhảy thẳng, không lắc).
 * Mọi tấm hình dùng chung một hình học (mặt phẳng 1 × 1). Bậc nút và bậc anh em mỗi tầng có sẵn (hiện khi em đã tới tầng đó); ba bậc lựa chọn và ba lớp vết nứt là bể dùng lại.
 * Vị trí cập nhật mỗi khung từ trạng thái logic, không cấp phát. Rời màn thì giải phóng hình học, vật liệu và texture.
 */
export function ClimbStage({ state, anim, frame, textures, labels, version, reduced, studentClip, studentTrigger, fallTrigger, villainClip, villainTrigger }: ClimbStageProps) {
  const depth = state.tree.depth;
  const tree = useRef<Group>(null);
  const player = useRef<Group>(null);
  const leaf = useRef<Mesh>(null);
  const nodeRefs = useRef<(Mesh | null)[]>([]);
  const sibRefs = useRef<(Mesh | null)[]>([]);
  const choiceRefs = useRef<(Mesh | null)[]>([]);
  const crackRefs = useRef<(Mesh | null)[]>([]);
  const cam = useRef(cameraY(frame, 0));
  const vis = useRef({ x: 0, y: 0 });

  const geo = useMemo(() => new PlaneGeometry(1, 1), []);
  const sky = useMemo(() => makeSkyTexture(), []);
  const crackTex = useMemo(() => (textures.stepCrack ? null : makeCrackTexture()), [textures.stepCrack]);
  const mats = useMemo(
    () => ({
      sky: new MeshBasicMaterial({ map: sky, toneMapped: false, depthWrite: false }),
      trunk: mat(textures.trunk, PLACEHOLDER.trunk),
      root: mat(textures.root, PLACEHOLDER.root),
      crown: mat(textures.crown, PLACEHOLDER.crown),
      leaf: mat(textures.fakeLeaf, PLACEHOLDER.leaf),
      crack: mat(textures.stepCrack ?? crackTex, '#2b1808'),
      sign: mat(null, PLACEHOLDER.step),
    }),
    [sky, textures, crackTex],
  );
  // mỗi bậc một vật liệu riêng (số khác nhau; bậc lựa chọn còn mờ dần khi nứt)
  const stepMats = useMemo(() => Array.from({ length: (depth + 1) * 2 + MAX_CHOICES }, () => mat(null, PLACEHOLDER.step)), [depth]);
  const crackMats = useMemo(() => Array.from({ length: MAX_CHOICES }, () => mat(textures.stepCrack ?? crackTex, '#2b1808')), [textures.stepCrack, crackTex]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => sky.dispose(), [sky]);
  useEffect(() => () => crackTex?.dispose(), [crackTex]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useEffect(() => () => stepMats.forEach((m) => m.dispose()), [stepMats]);
  useEffect(() => () => crackMats.forEach((m) => m.dispose()), [crackMats]);

  // dùng ảnh bậc gỗ thì nâng hình lên cho mặt ván trùng mặt đứng (chỗ đứng không đổi)
  const lift = textures.step ? stepLift() : 0;
  const nodeMat = (k: number) => stepMats[2 * k];
  const sibMat = (k: number) => stepMats[2 * k + 1];
  const choiceMat = (i: number) => stepMats[(depth + 1) * 2 + i];

  // gắn số lên bậc nút / bậc anh em / biển ngọn khi nhãn hay vòng đổi
  useEffect(() => {
    const set = (m: MeshBasicMaterial, t: Texture | null) => {
      if (m.map !== t) {
        m.map = t;
        m.color.set(t ? '#ffffff' : PLACEHOLDER.step);
        m.needsUpdate = true;
      }
    };
    for (let k = 0; k <= depth; k++) {
      set(nodeMat(k), labels?.steps.get(nodeValue(state.tree, k)) ?? null);
      if (k < depth) set(sibMat(k), labels?.steps.get(siblingValue(state.tree, k)) ?? null);
    }
    set(mats.sign, labels?.sign ?? null);
    for (let i = 0; i < MAX_CHOICES; i++) {
      choiceRefs.current[i] && (choiceRefs.current[i]!.userData.v = -1);
    }
  }, [labels, version, depth]); // eslint-disable-line react-hooks/exhaustive-deps

  const tiles = useMemo(() => trunkTiles(depth), [depth]);
  const world = WORLD[frame];

  useFrame((_, dt) => {
    const now = performance.now();
    const g = tree.current;
    if (!g) return;
    const p = state.player;
    // camera đi theo tầng em đang đứng
    const target = cameraY(frame, state.level);
    cam.current = reduced ? target : cam.current + (target - cam.current) * (1 - Math.exp(-5 * Math.min(dt, 0.1)));
    g.position.y = -cam.current;
    // người chơi: theo logic, dịch mượt sau khi bị dời (lên tầng, rơi về bậc cũ)
    const tw = anim.tween;
    let px = p.x;
    let py = p.y;
    if (tw.dur > 0) {
      const u = Math.min(1, Math.max(0, (now - tw.start) / tw.dur));
      const e = 1 - (1 - u) * (1 - u);
      px = tw.fromX + (p.x - tw.fromX) * e;
      py = tw.fromY + (p.y - tw.fromY) * e;
      if (u >= 1) tw.dur = 0;
    }
    vis.current.x = px;
    vis.current.y = py;
    const pg = player.current;
    if (pg) {
      pg.position.x = px;
      pg.position.y = py;
      if (p.move !== 0 && state.mode === 'free') anim.facing = p.move;
      const yaw = p.move !== 0 && state.mode === 'free' ? 1.1 * anim.facing : 0.5 * anim.facing;
      pg.rotation.y += (yaw - pg.rotation.y) * Math.min(1, TURN_RATE * Math.min(dt, 0.1));
    }
    // bậc nút và bậc anh em: hiện khi em đã tới tầng đó
    for (let k = 0; k <= depth; k++) {
      const n = nodeRefs.current[k];
      if (n) n.visible = k <= state.level;
      const s = sibRefs.current[k];
      if (s) s.visible = k < depth && k <= state.level;
    }
    // bậc lựa chọn (tầng trên): vị trí theo logic, mờ dần khi nứt
    const cy = stepCenterY(tierY(state.level + 1)) + lift;
    for (let i = 0; i < MAX_CHOICES; i++) {
      const m = choiceRefs.current[i];
      const cr = crackRefs.current[i];
      const c = state.choices[i];
      if (!m || !cr) continue;
      if (!c) {
        m.visible = false;
        cr.visible = false;
        continue;
      }
      const cx = choiceX(state, c);
      m.visible = true;
      m.position.x = cx;
      m.position.y = cy;
      const cracked = c.crack !== null;
      // có ảnh bac-go-nut thì bậc nứt ĐỔI sang tấm ván nứt (thay bac-go), không phủ thêm lớp vết nứt
      const crackedMap = cracked ? labels?.cracked.get(c.value) ?? null : null;
      const swap = crackedMap !== null;
      if (m.userData.v !== c.value || m.userData.k !== swap) {
        m.userData.v = c.value;
        m.userData.k = swap;
        const mm = choiceMat(i);
        mm.map = crackedMap ?? labels?.steps.get(c.value) ?? null;
        mm.color.set(mm.map ? '#ffffff' : PLACEHOLDER.step);
        mm.needsUpdate = true;
      }
      const a = cracked ? crackAlpha(c.crack ?? 0) : 1;
      choiceMat(i).opacity = a;
      m.rotation.z = cracked && !reduced ? (1 - a) * 0.2 * (i % 2 ? 1 : -1) : 0;
      cr.visible = cracked && !swap;
      if (cracked && !swap) {
        cr.position.x = cx;
        cr.position.y = cy;
        crackMats[i].opacity = a;
      }
    }
    // lá giả rơi khi lộ
    const lf = leaf.current;
    if (lf) {
      const t0 = anim.leafStart;
      const u = t0 > 0 ? (reduced ? 1 : Math.min(1, (now - t0) / LEAF_FALL_MS)) : 0;
      const hx = 0.62;
      const hy = villainY(depth) + 0.5;
      const ex = 1.5;
      const ey = tierY(depth) + 0.6;
      lf.position.x = hx + (ex - hx) * u + (reduced ? 0 : Math.sin(u * 9) * 0.25 * (1 - u));
      lf.position.y = hy + (ey - hy) * u * u;
      lf.rotation.z = 0.3 + u * 1.2;
    }
  });

  const rootStep = depth;
  return (
    <>
      <mesh geometry={geo} material={mats.sky} position={[0, 0, -10]} scale={[world.width, world.height, 1]} renderOrder={-10} />
      <group ref={tree}>
        <mesh geometry={geo} material={mats.root} position={[0, rootY(), Z.trunk + 0.05]} scale={[ROOT.width, ROOT.height, 1]} />
        {tiles.map((y, i) => (
          <mesh key={i} geometry={geo} material={mats.trunk} position={[0, y, Z.trunk]} scale={[TRUNK.width, TRUNK.tile, 1]} />
        ))}
        <mesh geometry={geo} material={mats.crown} position={[0, crownY(depth), Z.trunk + 0.1]} scale={[CROWN.width, CROWN.height, 1]} />
        <mesh geometry={geo} material={mats.sign} position={[0, signY(depth), Z.sign]} scale={[SIGN.width, SIGN.height, 1]} />
        {Array.from({ length: depth + 1 }, (_, k) => (
          <group key={k}>
            <mesh
              ref={(m) => {
                nodeRefs.current[k] = m;
              }}
              geometry={geo}
              material={nodeMat(k)}
              position={[standX(state.tree, k), stepCenterY(tierY(k)) + lift, Z.step]}
              scale={[STEP.width, STEP.height, 1]}
              visible={k === 0}
            />
            {k < rootStep && (
              <mesh
                ref={(m) => {
                  sibRefs.current[k] = m;
                }}
                geometry={geo}
                material={sibMat(k)}
                position={[siblingX(state.tree, k), stepCenterY(tierY(k)) + lift, Z.step]}
                scale={[STEP.width, STEP.height, 1]}
                visible={k === 0}
              />
            )}
          </group>
        ))}
        {Array.from({ length: MAX_CHOICES }, (_, i) => (
          <group key={i}>
            <mesh
              ref={(m) => {
                choiceRefs.current[i] = m;
              }}
              geometry={geo}
              material={choiceMat(i)}
              position={[0, 0, Z.step]}
              scale={[STEP.width, STEP.height, 1]}
              visible={false}
            />
            <mesh
              ref={(m) => {
                crackRefs.current[i] = m;
              }}
              geometry={geo}
              material={crackMats[i]}
              position={[0, 0, Z.crack]}
              scale={[STEP.width, STEP.height, 1]}
              visible={false}
            />
          </group>
        ))}
        {/* {phanDien} ngồi trên biển ngọn cây, ôm lá giả */}
        <Actor25D x={0} y={villainY(depth)} layer="actorsBack" height={VILLAIN.height}>
          <Character id="characters/ti" animation={villainClip} trigger={villainTrigger} returnTo="idle" clips={VILLAIN_CLIPS} />
        </Actor25D>
        <mesh ref={leaf} geometry={geo} material={mats.leaf} position={[0.62, villainY(depth) + 0.5, Z.leaf]} scale={[LEAF_FAKE.size, LEAF_FAKE.size, 1]} rotation-z={0.3} />
        {/* học sinh: chân ở độ cao logic */}
        <group ref={player} position={[0, 0, 0]}>
          <Actor25D x={0} y={0} layer="actors" height={PLAYER.height}>
            <Character id="characters/hoc-sinh-nam" animation={studentClip} trigger={studentTrigger} returnTo="idle" clips={STUDENT_CLIPS} pose={fallTrigger > 0 ? { name: 'sad', n: fallTrigger } : undefined} />
          </Actor25D>
        </group>
      </group>
    </>
  );
}
