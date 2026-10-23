/**
 * Hình của màn 5: nạp hình rời theo manifest (thiếu file thì null, cảnh vẽ ô màu thay thế), dải sáng vùng đập vẽ bằng canvas, quạt nan dựng bằng code (gắn vào xương tay phải của học sinh).
 * Mọi thứ do hook hay hàm tạo ra đều có hàm dọn (giải phóng texture, hình học, vật liệu) để rời cảnh dựng lại 6 lần không tăng bộ nhớ GPU.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, LinearFilter, Mesh, MeshStandardMaterial, SRGBColorSpace, Texture, TorusGeometry } from 'three';
import { ASSETS_URL, lookupAsset, useManifest } from '@so-chung/core';

export const ART = {
  thuong: 'sprites/man-05-dap-ti/chuot-giay-thuong',
  doiLan: 'sprites/man-05-dap-ti/chuot-giay-doi-lan',
  nhanh: 'sprites/man-05-dap-ti/chuot-giay-nhanh',
  to: 'sprites/man-05-dap-ti/chuot-giay-to',
  vetMuc: 'sprites/man-05-dap-ti/vet-muc',
  dong: 'ui/icons/tien-dong',
} as const;
export type ArtKey = keyof typeof ART;
export type WhackTextures = { [K in ArtKey]: Texture | null } & { done: boolean };

/** Hình chuột gốc nằm ngang, đầu ở bên trái; mouse chiếm khoảng 79% × 56% khung ảnh 1024 × 559 (phần còn lại trong suốt). */
export const MOUSE_ASPECT = 1024 / 559;

function prepare(t: Texture): Texture {
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Nạp mọi hình của màn (một lần), giải phóng khi rời màn. */
export function useWhackTextures(): WhackTextures {
  const manifest = useManifest();
  const empty = useMemo(() => Object.fromEntries(Object.keys(ART).map((k) => [k, null])) as { [K in ArtKey]: Texture | null }, []);
  const [tex, setTex] = useState<WhackTextures>({ ...empty, done: false });
  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const made: Texture[] = [];
    const load = (key: ArtKey) =>
      new Promise<Texture | null>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, ART[key]);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          const t = prepare(new Texture(img));
          made.push(t);
          resolve(t);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    const keys = Object.keys(ART) as ArtKey[];
    void Promise.all(keys.map(load)).then((list) => {
      if (!alive) return;
      const out = { ...empty, done: true } as WhackTextures;
      keys.forEach((k, i) => (out[k] = list[i]));
      setTex(out);
    });
    return () => {
      alive = false;
      for (const t of made) t.dispose();
    };
  }, [manifest, empty]);
  return tex;
}

/**
 * Vệt sáng của vùng đập (hình thang bám dải vải, phần hình vẽ ở `zoneGeometry`): viền sáng rõ ở mép trên và mép dưới, phần trong mờ nhẹ, không tối ở hai bên (vệt không loang ra ngoài hình thang).
 * Vẽ một lần (trắng; màu do vật liệu quyết định). Trục dọc của hình: từ mép trên (đầu vùng đập) tới mép dưới.
 */
export function makeGlowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.06, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.3)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.3)');
    g.addColorStop(0.94, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
  }
  return prepare(new CanvasTexture(c)) as CanvasTexture;
}

export interface Fan {
  object: Group;
  dispose: () => void;
}

/**
 * Quạt nan dựng bằng code, đơn vị của nhân vật (cao 1,7): cán tre dọc trục Y của bàn tay, mặt quạt tròn ở đầu cán, viền tre. Gốc ở lòng bàn tay.
 * Góc quay của vật trong bàn tay chỉnh ở `FAN_TILT` (đã thử bằng ảnh chụp).
 */
export const FAN = { handle: 0.3, radius: 0.19, tiltX: 0, tiltY: 0, tiltZ: 0 } as const;

export function makeFan(): Fan {
  const bamboo = new MeshStandardMaterial({ color: new Color('#b98a45'), roughness: 0.8 });
  const paper = new MeshStandardMaterial({ color: new Color('#f1dfae'), roughness: 0.9, side: DoubleSide });
  const handleGeo = new CylinderGeometry(0.014, 0.018, FAN.handle, 8);
  const discGeo = new CircleGeometry(FAN.radius, 28);
  const rimGeo = new TorusGeometry(FAN.radius, 0.012, 6, 28);
  const handle = new Mesh(handleGeo, bamboo);
  handle.position.y = FAN.handle / 2;
  const disc = new Mesh(discGeo, paper);
  disc.position.y = FAN.handle + FAN.radius - 0.02;
  const rim = new Mesh(rimGeo, bamboo);
  rim.position.copy(disc.position);
  const object = new Group();
  object.add(handle, disc, rim);
  object.rotation.set(FAN.tiltX, FAN.tiltY, FAN.tiltZ);
  return {
    object,
    dispose: () => {
      handleGeo.dispose();
      discGeo.dispose();
      rimGeo.dispose();
      bamboo.dispose();
      paper.dispose();
    },
  };
}
