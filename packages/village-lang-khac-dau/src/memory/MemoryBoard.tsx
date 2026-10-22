import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshBasicMaterial, PlaneGeometry, type Group, type Texture } from 'three';
import { Actor25D, Character, type ClipName } from '@so-chung/core/three/index';
import { LAYERS } from '@so-chung/core/three/scene25d/layout25d';
import { BACK_CELL, FACE_COUNT, atlasCell, faceIndex } from './memoryFaces';
import type { MemoryCard } from './memoryLogic';
import { VILLAIN_SPOT, type MemoryFrame } from './memoryLayout';

/** Lật 180° trong chừng này giây; thẻ trượt về chỗ mới theo hệ số này mỗi giây (càng lớn càng nhanh). */
const FLIP_SECONDS = 0.28;
const MOVE_RATE = 9;
const CARD_Z = LAYERS.actorsFront;
const GLOW_COLOR = '#c77dff';
const MATCHED_COLOR = '#3fae5a';

export interface BoardCard {
  card: MemoryCard;
  /** Tâm chỗ đang hiện (đơn vị thế giới) */
  x: number;
  y: number;
  glow: boolean;
}

interface Shared {
  geo: PlaneGeometry;
  back: MeshBasicMaterial;
  faces: MeshBasicMaterial[];
  glow: MeshBasicMaterial;
  tint: MeshBasicMaterial;
  matched: MeshBasicMaterial;
}

/**
 * Một thẻ: hai mặt phẳng quay lưng vào nhau trong một nhóm; nhóm xoay quanh trục đứng 180° để lật. Vị trí và góc tiến dần về đích trong `useFrame` (không cấp phát);
 * "Giảm chuyển động" thì đổi mặt và đổi chỗ ngay. Thẻ bị {phanDien} tráo có quầng tím phía sau và lớp tím phủ lên mặt; thẻ đã khớp có viền xanh phía sau.
 */
function CardMesh({ item, size, shared, reduced }: { item: BoardCard; size: number; shared: Shared; reduced: boolean }) {
  const group = useRef<Group>(null);
  const flipper = useRef<Group>(null);
  const target = useRef({ x: item.x, y: item.y, rot: 0 });
  const up = item.card.isFlipped || item.card.isMatched;
  target.current.x = item.x;
  target.current.y = item.y;
  target.current.rot = up ? Math.PI : 0;

  useEffect(() => {
    // thẻ mới (vòng mới): đặt thẳng vào chỗ, úp
    const g = group.current;
    if (g) g.position.set(target.current.x, target.current.y, CARD_Z);
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    const f = flipper.current;
    if (!g || !f) return;
    const t = target.current;
    if (reduced) {
      g.position.x = t.x;
      g.position.y = t.y;
      f.rotation.y = t.rot;
      return;
    }
    const k = 1 - Math.exp(-MOVE_RATE * Math.min(dt, 0.1));
    g.position.x += (t.x - g.position.x) * k;
    g.position.y += (t.y - g.position.y) * k;
    const d = t.rot - f.rotation.y;
    const step = (Math.PI / FLIP_SECONDS) * Math.min(dt, 0.1);
    f.rotation.y = Math.abs(d) <= step ? t.rot : f.rotation.y + Math.sign(d) * step;
  });

  return (
    <group ref={group} position={[item.x, item.y, CARD_Z]}>
      <mesh geometry={shared.geo} material={shared.glow} scale={[size * 1.24, size * 1.24, 1]} position-z={-0.06} visible={item.glow} />
      <mesh geometry={shared.geo} material={shared.tint} scale={[size * 0.98, size * 0.98, 1]} position-z={0.05} visible={item.glow} />
      <mesh geometry={shared.geo} material={shared.matched} scale={[size * 1.07, size * 1.07, 1]} position-z={-0.04} visible={item.card.isMatched} />
      <group ref={flipper} scale={[size, size, 1]}>
        <mesh geometry={shared.geo} material={shared.back} />
        <mesh geometry={shared.geo} material={shared.faces[faceIndex(item.card)]} rotation-y={Math.PI} />
      </group>
    </group>
  );
}

/**
 * Bàn thẻ trong Scene25D: dùng chung một hình học (mặt phẳng 1 × 1), một vật liệu mặt sau và 24 vật liệu mặt trước cắt từ cùng một atlas (một lần đẩy ảnh lên GPU), các vật liệu
 * quầng tím, lớp tím và viền xanh. Rời cảnh hay đổi atlas thì giải phóng hết.
 */
export function MemoryBoard({ items, cardSize, atlas, reduced }: { items: readonly BoardCard[]; cardSize: number; atlas: Texture | null; reduced: boolean }) {
  const geo = useMemo(() => new PlaneGeometry(1, 1), []);
  const glow = useMemo(() => new MeshBasicMaterial({ color: GLOW_COLOR, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }), []);
  const tint = useMemo(() => new MeshBasicMaterial({ color: GLOW_COLOR, transparent: true, opacity: 0.4, toneMapped: false, depthWrite: false }), []);
  const matched = useMemo(() => new MeshBasicMaterial({ color: MATCHED_COLOR, toneMapped: false }), []);
  // 24 mặt trước rồi mặt sau (ô BACK_CELL), cùng cắt từ một atlas
  const cells = useMemo(() => {
    const list: MeshBasicMaterial[] = [];
    for (let f = 0; f <= BACK_CELL; f++) {
      const c = atlasCell(f);
      const map = atlas ? atlas.clone() : null;
      if (map) {
        map.offset.set(c.offsetX, c.offsetY);
        map.repeat.set(c.repeatX, c.repeatY);
        map.needsUpdate = true;
      }
      list.push(new MeshBasicMaterial({ map, color: map ? '#ffffff' : '#e8d9b5', transparent: true, toneMapped: false }));
    }
    return list;
  }, [atlas]);

  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => glow.dispose(), [glow]);
  useEffect(() => () => tint.dispose(), [tint]);
  useEffect(() => () => matched.dispose(), [matched]);
  useEffect(
    () => () => {
      for (const m of cells) {
        m.map?.dispose();
        m.dispose();
      }
    },
    [cells],
  );

  // Viền tím nhấp nháy (Giảm chuyển động: đứng yên)
  useFrame(({ clock }) => {
    glow.opacity = reduced ? 0.9 : 0.65 + 0.3 * Math.sin(clock.elapsedTime * 9);
    tint.opacity = reduced ? 0.4 : 0.3 + 0.15 * Math.sin(clock.elapsedTime * 9);
  });

  const shared: Shared = { geo, back: cells[BACK_CELL], faces: cells.slice(0, FACE_COUNT), glow, tint, matched };
  return (
    <>
      {items.map((it) => (
        <CardMesh key={it.card.id} item={it} size={cardSize} shared={shared} reduced={reduced} />
      ))}
    </>
  );
}

const VILLAIN_CLIPS: readonly ClipName[] = ['idle', 'cheer'];

/**
 * {phanDien} (model 3D) nấp ngoài mép phải; mỗi lần tráo bài thì ló vào và cười (cheer), xong lại nấp. Vị trí tiến dần trong `useFrame` (không cấp phát).
 * "Giảm chuyển động" thì không ló ra (vẫn có trong cảnh, ẩn, để model tải sẵn).
 */
export function MemoryVillain({ frame, peek, n, reduced }: { frame: MemoryFrame; peek: boolean; n: number; reduced: boolean }) {
  const group = useRef<Group>(null);
  const spot = VILLAIN_SPOT[frame];
  const show = peek && !reduced;
  const target = useRef(spot.hiddenX);
  target.current = show ? spot.x : spot.hiddenX;

  useEffect(() => {
    const g = group.current;
    if (g) g.position.x = spot.hiddenX;
  }, [spot.hiddenX]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-8 * Math.min(dt, 0.1));
    g.position.x += (target.current - g.position.x) * k;
    g.visible = g.position.x < spot.hiddenX - 0.05;
  });

  return (
    <group ref={group} visible={false}>
      <Actor25D x={0} y={spot.y} layer="actorsBack" height={spot.height} facing="left">
        <Character id="characters/ti" animation={show ? 'cheer' : 'idle'} trigger={n} returnTo="idle" clips={VILLAIN_CLIPS} />
      </Actor25D>
    </group>
  );
}

