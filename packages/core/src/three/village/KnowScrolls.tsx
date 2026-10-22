import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial, type BufferGeometry, type Group, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hasKnowCard } from '../../progress/knowCards';
import { BEAM_HEIGHT, SCROLL_HOVER_Y } from './scrollTargets';
import type { VillageScroll } from './villageLayout';

/** Cuộn giấy: ống giấy dài 0,9 bán kính 0,16 nằm ngang (trục x) và hai núm gỗ ở hai đầu; ghép thành MỘT hình học (màu theo đỉnh). 100 tam giác. */
export function createScrollGeometry(): BufferGeometry {
  const paint = (g: BufferGeometry, r: number, gr: number, b: number): BufferGeometry => {
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([r, gr, b], i * 3);
    g.setAttribute('color', new Float32BufferAttribute(c, 3));
    g.deleteAttribute('uv');
    return g;
  };
  const paper = new CylinderGeometry(0.16, 0.16, 0.9, 10, 1, false);
  paper.rotateZ(Math.PI / 2);
  const parts: BufferGeometry[] = [paint(paper, 1, 0.93, 0.74)];
  for (const sx of [-1, 1]) {
    const knob = new CylinderGeometry(0.1, 0.1, 0.1, 8, 1, false);
    knob.rotateZ(Math.PI / 2);
    knob.translate(sx * 0.5, 0, 0);
    parts.push(paint(knob, 0.62, 0.35, 0.16));
  }
  const merged = mergeGeometries(
    parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  ) as BufferGeometry;
  for (const p of parts) p.dispose();
  return merged;
}

/** Màu cột sáng và vầng sáng dưới chân (vàng nhạt). */
const GLOW = '#FFC83D';

export interface KnowScrollsProps {
  scrolls: readonly VillageScroll[];
  /** Mặt nạ bit các thẻ đã nhặt: thẻ nào đã nhặt thì không vẽ (cột sáng tắt) */
  collected: number;
  /** false (Giảm chuyển động) thì cuộn không xoay và không nhấp nhô */
  animate: boolean;
}

/** Hình học và vật liệu dùng chung cho mọi thẻ (cũng dùng để biên dịch trước shader, xem `ZonePrewarm`). */
export function createScrollResources() {
  return {
    scroll: createScrollGeometry(),
    beam: new CylinderGeometry(0.85, 1.7, BEAM_HEIGHT, 14, 1, true),
    disc: new CircleGeometry(1.7, 24),
    scrollMat: new MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, emissive: '#FFC94A', emissiveIntensity: 0.85, roughness: 0.7 }),
    beamMat: new MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0.26, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false }),
    discMat: new MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false, fog: false }),
  };
}

/**
 * Các thẻ "Em có biết?" rải trong làng (bước X3, do code dựng): mỗi thẻ là một cuộn giấy phát sáng lơ lửng, vầng sáng trên mặt đất và một cột sáng mờ cao 36 nhìn thấy từ xa (rẻ: không đổ bóng,
 * không đèn thật, hơn 200 tam giác mỗi thẻ). Thẻ đã nhặt thì bỏ khỏi cảnh. Cuộn xoay chậm và nhấp nhô, cột sáng thở nhẹ (tắt khi "Giảm chuyển động"); không cấp phát trong useFrame. Rời cảnh thì
 * giải phóng. Đặt trong <WalkWorld>.
 */
export function KnowScrolls({ scrolls, collected, animate }: KnowScrollsProps) {
  const res = useMemo(createScrollResources, []);
  useEffect(
    () => () => {
      for (const o of [res.scroll, res.beam, res.disc, res.scrollMat, res.beamMat, res.discMat] as { dispose(): void }[]) o.dispose();
    },
    [res],
  );
  const shown = useMemo(() => scrolls.filter((s) => !hasKnowCard(collected, s.index)), [scrolls, collected]);
  const bodies = useRef<(Group | null)[]>([]);
  const t0 = useMemo(() => ({ t: 0 }), []);
  useFrame((_, dt) => {
    if (!animate) return;
    t0.t += dt;
    for (let i = 0; i < shown.length; i++) {
      const g = bodies.current[i];
      if (!g) continue;
      g.rotation.y = t0.t * 0.9 + i;
      g.position.y = SCROLL_HOVER_Y + Math.sin(t0.t * 2 + i * 1.7) * 0.12;
    }
    res.beamMat.opacity = 0.23 + Math.sin(t0.t * 1.6) * 0.04;
  });
  return (
    <group>
      {shown.map((s, i) => (
        <group key={s.index} position={[s.x, 0, s.z]} data-scroll={s.index}>
          <mesh geometry={res.disc} material={res.discMat as Material} rotation-x={-Math.PI / 2} position-y={0.06} renderOrder={2} />
          <mesh geometry={res.beam} material={res.beamMat as Material} position-y={BEAM_HEIGHT / 2} renderOrder={3} />
          <group
            ref={(g) => {
              bodies.current[i] = g;
            }}
            position-y={SCROLL_HOVER_Y}
          >
            <mesh geometry={res.scroll} material={res.scrollMat as Material} scale={1.5} />
          </group>
        </group>
      ))}
    </group>
  );
}
