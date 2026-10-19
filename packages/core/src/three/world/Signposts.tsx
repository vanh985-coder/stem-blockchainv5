import { useEffect, useMemo } from 'react';
import { BoxGeometry, CanvasTexture, CylinderGeometry, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { fmt } from '../../content/characters';
import { ui } from '../../content/ui';
import { SIGNPOST_HALF_WIDTH, SIGNPOST_HEIGHT, type SignpostDef } from './worldLayout';

const W = 512;
const H = 256;
const PLANK_Y = 1.55;

/** Vẽ mặt biển: nền ván, mũi tên chỉ thẳng phía trước (vẽ bằng nét, không phải chữ) và tên (từ content/) ở giữa. */
function paintFace(c: HTMLCanvasElement, label: string): void {
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
  // mũi tên chỉ lên (đi thẳng)
  g.fillStyle = '#3B2412';
  g.beginPath();
  g.moveTo(84, 58);
  g.lineTo(134, 128);
  g.lineTo(104, 128);
  g.lineTo(104, 200);
  g.lineTo(64, 200);
  g.lineTo(64, 128);
  g.lineTo(34, 128);
  g.closePath();
  g.fill();
  // tên, tự co chữ cho vừa
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  let size = 60;
  g.font = `800 ${size}px 'Baloo 2', 'Be Vietnam Pro', sans-serif`;
  while (g.measureText(label).width > W - 190 - 24 && size > 28) {
    size -= 4;
    g.font = `800 ${size}px 'Baloo 2', 'Be Vietnam Pro', sans-serif`;
  }
  g.fillText(label, 160, H / 2 + 4);
}

/**
 * Biển chỉ đường bằng gỗ ở lối ra chợ (mốc 2, bước W1; do code dựng): hai cột và tấm biển hai mặt. Mặt trước (quay về chợ) ghi tên làng kèm mũi tên chỉ thẳng phía trước,
 * mặt sau (cho người đi về) ghi "Chợ phiên". Chữ lấy từ content/. Có vật cản (xem `signpostColliders`). Rời cảnh thì giải phóng.
 */
export function Signposts({ signposts }: { signposts: readonly SignpostDef[] }) {
  const res = useMemo(
    () => ({
      post: new CylinderGeometry(0.09, 0.11, SIGNPOST_HEIGHT, 10),
      plank: new BoxGeometry(SIGNPOST_HALF_WIDTH * 2, 0.95, 0.12),
      face: new PlaneGeometry(SIGNPOST_HALF_WIDTH * 2 - 0.14, 0.82),
      wood: new MeshStandardMaterial({ color: '#7A5230', roughness: 0.9 }),
      plankMat: new MeshStandardMaterial({ color: '#B98A4E', roughness: 0.9 }),
    }),
    [],
  );
  const faces = useMemo(
    () =>
      signposts.map((s) => {
        const make = (label: string) => {
          const canvas = document.createElement('canvas');
          canvas.width = W;
          canvas.height = H;
          paintFace(canvas, label);
          const tex = new CanvasTexture(canvas);
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = 4;
          return { tex, mat: new MeshStandardMaterial({ map: tex, roughness: 0.85 }) };
        };
        return { front: make(fmt(ui.lang[s.village])), back: make(ui.thegioi.bienChoPhien) };
      }),
    [signposts],
  );
  useEffect(
    () => () => {
      for (const o of [res.post, res.plank, res.face, res.wood, res.plankMat]) o.dispose();
    },
    [res],
  );
  useEffect(
    () => () => {
      for (const f of faces) for (const side of [f.front, f.back]) {
        side.tex.dispose();
        side.mat.dispose();
      }
    },
    [faces],
  );
  // phông chữ web có thể tải sau: vẽ lại khi đã sẵn sàng
  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      signposts.forEach((s, i) => {
        for (const [side, label] of [
          [faces[i].front, fmt(ui.lang[s.village])],
          [faces[i].back, ui.thegioi.bienChoPhien],
        ] as const) {
          paintFace(side.tex.image as HTMLCanvasElement, label);
          side.tex.needsUpdate = true;
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [faces, signposts]);

  return (
    <>
      {signposts.map((s, i) => (
        <group key={s.gate} position={[s.x, 0, s.z]} rotation={[0, s.yaw, 0]}>
          <mesh geometry={res.post} material={res.wood} position={[-0.7, SIGNPOST_HEIGHT / 2, 0]} castShadow />
          <mesh geometry={res.post} material={res.wood} position={[0.7, SIGNPOST_HEIGHT / 2, 0]} castShadow />
          <mesh geometry={res.plank} material={res.plankMat} position={[0, PLANK_Y, 0]} castShadow />
          <mesh geometry={res.face} material={faces[i].front.mat} position={[0, PLANK_Y, 0.065]} />
          <mesh geometry={res.face} material={faces[i].back.mat} position={[0, PLANK_Y, -0.065]} rotation-y={Math.PI} />
        </group>
      ))}
    </>
  );
}
