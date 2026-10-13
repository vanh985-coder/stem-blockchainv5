import { useEffect, useMemo } from 'react';
import { BoxGeometry, CanvasTexture, CylinderGeometry, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { asset } from '../../assets/store';
import { ui } from '../../content/ui';
import type { LevelState } from '../../progress/unlock';
import { BOARD_HEIGHT, type VillageBoardDef } from './villageLayout';
import { boardBadge, type BoardBadge } from './villageQuest';

const W = 512;
const H = 256;

function badgeText(b: BoardBadge): string | null {
  return b === 'xong' ? ui.langScene.bienDaXong : b === 'khoa' ? ui.langScene.bienKhoa : b === 'sap' ? ui.langScene.bienSapRaMat2 : null;
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
  const badge = badgeText(boardBadge(state));
  const kind = boardBadge(state);
  if (kind === 'khoa' || kind === 'sap') {
    g.fillStyle = 'rgba(40,28,20,0.55)';
    g.fillRect(0, 0, W, H);
  }
  if (badge) {
    g.fillStyle = kind === 'xong' ? '#3FA34D' : kind === 'khoa' ? '#7A7A7A' : '#C0463A';
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
}

/**
 * 3 biển gỗ của làng, do code dựng (spec 03 mục 6): hai cột gỗ và tấm biển có icon, chữ và dải trạng thái (đã xong, khóa, sắp ra mắt) vẽ bằng canvas. Dùng chung cho mọi làng. Rời cảnh thì giải phóng.
 */
export function VillageBoards({ boards, labels, icons, states }: VillageBoardsProps) {
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

  return (
    <>
      {boards.map((b, i) => (
        <group key={b.level} position={[b.x, 0, b.z]} rotation={[0, b.yaw, 0]}>
          <mesh geometry={res.post} material={res.wood} position={[-0.7, BOARD_HEIGHT / 2, -0.17]} castShadow />
          <mesh geometry={res.post} material={res.wood} position={[0.7, BOARD_HEIGHT / 2, -0.17]} castShadow />
          <mesh geometry={res.plank} material={res.plankMat} position={[0, 1.4, 0]} castShadow />
          <mesh geometry={res.face} material={faces[i].mat} position={[0, 1.4, 0.065]} />
        </group>
      ))}
    </>
  );
}
