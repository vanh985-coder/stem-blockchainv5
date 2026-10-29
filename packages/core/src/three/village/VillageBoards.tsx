import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three';
import { asset } from '../../assets/store';
import { ui } from '../../content/ui';
import { PROBE } from '../../lib/dev';
import type { LevelState } from '../../progress/unlock';
import { createEmblemGeometry } from './boardEmblems';
import { EMBLEM_SCALE, EMBLEM_Y, PILLAR, PILLAR_DISC_RADIUS, PILLAR_RADIUS_BASE, PILLAR_RADIUS_TOP, emblemMotion, pillarKindOf, type PillarKind } from './boardPillar';
import { BOARD_HEIGHT, type VillageBoardDef } from './villageLayout';
import { boardBadge, type BoardBadge } from './villageQuest';

const W = 512;
const H = 256;

function badgeText(b: BoardBadge | 'mo'): string | null {
  return b === 'xong' ? ui.langScene.bienDaXong : b === 'khoa' ? ui.langScene.bienKhoa : b === 'sap' ? ui.langScene.bienSapRaMat2 : b === 'mo' ? ui.langScene.bienMo : null;
}

/** Vẽ mặt trước biển gỗ: nền ván, icon bên trái, chữ (từ content/) bên phải, dải trạng thái; biển khóa hay sắp ra mắt thì tối đi. */
function paint(c: HTMLCanvasElement, label: string, icon: HTMLImageElement | null, state: LevelState | undefined): void {
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#C99A5B';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(95,60,25,0.35)';
  g.lineWidth = 3;
  for (let y = 40; y < H; y += 52) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y + 4);
    g.stroke();
  }
  g.strokeStyle = '#6B4526';
  g.lineWidth = 14;
  g.strokeRect(7, 7, W - 14, H - 14);
  // icon
  g.fillStyle = 'rgba(246,235,211,0.92)';
  g.beginPath();
  g.arc(92, H / 2, 66, 0, Math.PI * 2);
  g.fill();
  if (icon) g.drawImage(icon, 92 - 50, H / 2 - 50, 100, 100);
  // chữ, tự xuống dòng
  g.fillStyle = '#3B2412';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  let size = 44;
  const words = label.split(' ');
  const lines: string[] = [];
  for (;;) {
    g.font = `800 ${size}px 'Baloo 2', 'Be Vietnam Pro', sans-serif`;
    lines.length = 0;
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (g.measureText(next).width > W - 200 - 24 && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    lines.push(line);
    if (lines.length <= 3 || size <= 26) break;
    size -= 4;
  }
  const lh = size * 1.1;
  lines.forEach((l, i) => g.fillText(l, 176, H / 2 - ((lines.length - 1) * lh) / 2 + i * lh));
  // dải trạng thái
  const kind: BoardBadge | 'mo' = state === 'open' ? 'mo' : boardBadge(state);
  const badge = badgeText(kind);
  if (kind === 'khoa' || kind === 'sap') {
    g.fillStyle = 'rgba(40,28,20,0.55)';
    g.fillRect(0, 0, W, H);
  }
  if (badge) {
    g.fillStyle = kind === 'xong' ? '#3FA34D' : kind === 'khoa' ? '#7A7A7A' : kind === 'mo' ? '#8A6508' : '#C0463A';
    g.beginPath();
    g.roundRect(W - 190, H - 70, 170, 50, 14);
    g.fill();
    g.fillStyle = '#FFFFFF';
    g.textAlign = 'center';
    g.font = `800 28px 'Baloo 2', 'Be Vietnam Pro', sans-serif`;
    g.fillText(badge, W - 105, H - 45);
  }
}

export interface VillageBoardsProps {
  boards: readonly VillageBoardDef[];
  /** Chữ trên biển từng màn (đã qua fmt) */
  labels: Readonly<Record<number, string>>;
  /** Đường dẫn icon (không đuôi, trong manifest) từng màn */
  icons: Readonly<Record<number, string>>;
  states: Readonly<Record<number, LevelState | undefined>>;
  /** false (Giảm chuyển động) thì vật nổi và cột sáng đứng yên */
  animate?: boolean;
}

const KINDS: readonly PillarKind[] = ['open', 'done', 'locked'];

/** Hình học và vật liệu của cột sáng, dùng chung cho mọi biển (cũng dùng để biên dịch trước shader, xem `ZonePrewarm`): mỗi dáng (mở, xong, khóa) một cột, một vầng sáng, một vật nổi. */
export function createBoardPillarResources() {
  const beam = {} as Record<PillarKind, BufferGeometry>;
  const emblem = {} as Record<PillarKind, BufferGeometry>;
  const beamMat = {} as Record<PillarKind, MeshBasicMaterial>;
  const discMat = {} as Record<PillarKind, MeshBasicMaterial>;
  const emblemMat = {} as Record<PillarKind, MeshStandardMaterial>;
  for (const k of KINDS) {
    const d = PILLAR[k];
    beam[k] = new CylinderGeometry(PILLAR_RADIUS_TOP, PILLAR_RADIUS_BASE, d.height, 14, 1, true);
    emblem[k] = createEmblemGeometry(k);
    beamMat[k] = new MeshBasicMaterial({ color: d.glow, transparent: true, opacity: d.beam, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false });
    discMat[k] = new MeshBasicMaterial({ color: d.glow, transparent: true, opacity: d.disc, blending: AdditiveBlending, depthWrite: false, fog: false });
    emblemMat[k] = new MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, emissive: d.emissive, emissiveIntensity: d.emissiveIntensity, roughness: 0.7 });
  }
  return { beam, emblem, disc: new CircleGeometry(PILLAR_DISC_RADIUS, 24), beamMat, discMat, emblemMat };
}

export function disposeBoardPillarResources(r: ReturnType<typeof createBoardPillarResources>): void {
  r.disc.dispose();
  for (const k of KINDS) {
    r.beam[k].dispose();
    r.emblem[k].dispose();
    r.beamMat[k].dispose();
    r.discMat[k].dispose();
    r.emblemMat[k].dispose();
  }
}

/**
 * 3 biển chọn màn của làng, do code dựng (spec 03 mục 6): tấm biển có icon, chữ tên màn và dải trạng thái (Đã mở, Đã xong, Khóa, Sắp ra mắt) vẽ bằng canvas, dưới một CỘT SÁNG như cuộn "Em có biết?"
 * (cột mảnh cộng sáng, vầng sáng dưới chân, vật nổi, không bóng đổ, không đèn thật). Dáng khác nhau theo trạng thái, không chỉ khác màu: mở = cuộn giấy vàng trên cột cao 20; xong = vòng tích xanh
 * trên cột cao 8; khóa hay sắp ra mắt = ổ khóa xám trên cột thấp 2,8 (không che tầm nhìn). Vị trí, vật cản và vùng tương tác của biển giữ nguyên. Dùng chung cho mọi làng. Rời cảnh thì giải phóng.
 */
export function VillageBoards({ boards, labels, icons, states, animate = true }: VillageBoardsProps) {
  const res = useMemo(
    () => ({
      post: new CylinderGeometry(0.09, 0.11, BOARD_HEIGHT, 10),
      plank: new BoxGeometry(1.9, 0.95, 0.12),
      face: new PlaneGeometry(1.76, 0.88),
      wood: new MeshStandardMaterial({ color: '#7A5230', roughness: 0.9 }),
      plankMat: new MeshStandardMaterial({ color: '#B98A4E', roughness: 0.9 }),
    }),
    [],
  );
  const pillar = useMemo(createBoardPillarResources, []);
  const faces = useMemo(
    () =>
      boards.map((b) => {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const tex = new CanvasTexture(canvas);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        return { level: b.level, canvas, tex, mat: new MeshStandardMaterial({ map: tex, roughness: 0.85 }), icon: null as HTMLImageElement | null };
      }),
    [boards],
  );
  useEffect(
    () => () => {
      for (const o of [res.post, res.plank, res.face, res.wood, res.plankMat]) o.dispose();
    },
    [res],
  );
  useEffect(() => () => disposeBoardPillarResources(pillar), [pillar]);
  useEffect(
    () => () => {
      for (const f of faces) {
        f.tex.dispose();
        f.mat.dispose();
      }
    },
    [faces],
  );
  // icon tải một lần cho mỗi biển rồi vẽ lại; trạng thái hay chữ đổi thì vẽ lại
  useEffect(() => {
    let cancelled = false;
    for (const f of faces) {
      const url = asset(icons[f.level]);
      if (!url || f.icon) continue;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        f.icon = img;
        paint(f.canvas, labels[f.level] ?? '', f.icon, states[f.level]);
        f.tex.needsUpdate = true;
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
  }, [faces, icons, labels, states]);
  useEffect(() => {
    for (const f of faces) {
      paint(f.canvas, labels[f.level] ?? '', f.icon, states[f.level]);
      f.tex.needsUpdate = true;
    }
  }, [faces, labels, states]);

  const kinds = useMemo(() => boards.map((b) => pillarKindOf(states[b.level])), [boards, states]);
  useEffect(() => {
    if (!PROBE) return;
    const w = window as unknown as { __boardKinds?: Record<number, PillarKind> };
    w.__boardKinds = { ...(w.__boardKinds ?? {}), ...Object.fromEntries(boards.map((b, i) => [b.level, kinds[i]])) };
  }, [boards, kinds]);

  // vật nổi chuyển động theo dáng; "Giảm chuyển động" thì đứng yên, hướng thẳng ra phía trước biển
  const emblems = useRef<(Group | null)[]>([]);
  const clock = useMemo(() => ({ t: 0 }), []);
  useEffect(() => {
    if (animate) return;
    for (const g of emblems.current) {
      if (!g) continue;
      g.rotation.y = 0;
      g.position.y = EMBLEM_Y;
    }
  }, [animate, kinds]);
  useFrame((_, dt) => {
    if (!animate) return;
    clock.t += dt;
    for (let i = 0; i < kinds.length; i++) {
      const g = emblems.current[i];
      if (!g) continue;
      const m = emblemMotion(kinds[i], clock.t, i);
      g.rotation.y = m.yaw;
      g.position.y = EMBLEM_Y + m.bob;
    }
    pillar.beamMat.open.opacity = PILLAR.open.beam - 0.01 + Math.sin(clock.t * 1.6) * 0.03;
  });

  return (
    <>
      {boards.map((b, i) => {
        const kind = kinds[i];
        return (
          <group key={b.level} position={[b.x, 0, b.z]} rotation={[0, b.yaw, 0]} name={`bien-${b.level}`}>
            <mesh geometry={res.post} material={res.wood} position={[-0.7, BOARD_HEIGHT / 2, -0.17]} castShadow />
            <mesh geometry={res.post} material={res.wood} position={[0.7, BOARD_HEIGHT / 2, -0.17]} castShadow />
            <mesh geometry={res.plank} material={res.plankMat} position={[0, 1.4, 0]} castShadow />
            <mesh geometry={res.face} material={faces[i].mat} position={[0, 1.4, 0.065]} />
            <mesh geometry={pillar.disc} material={pillar.discMat[kind] as Material} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} renderOrder={2} />
            <mesh geometry={pillar.beam[kind]} material={pillar.beamMat[kind] as Material} position={[0, PILLAR[kind].height / 2, -0.1]} renderOrder={3} />
            <group
              ref={(g) => {
                emblems.current[i] = g;
              }}
              position={[0, EMBLEM_Y, -0.1]}
              scale={EMBLEM_SCALE}
            >
              <mesh geometry={pillar.emblem[kind]} material={pillar.emblemMat[kind] as Material} />
            </group>
          </group>
        );
      })}
    </>
  );
}
