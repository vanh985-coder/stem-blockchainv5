import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS } from '../../content/characters';
import type { LevelState } from '../../progress/unlock';
import type { VillageId } from '../../village';
import { Character } from '../Character';
import { MarketProps } from '../cho/MarketProcedural';
import { ModelInstances } from '../cho/ModelInstances';
import type { Placement } from '../cho/marketLayout';
import type { QualityLevel } from '../quality';
import { preloadModel, releaseModel, retainModel } from '../modelLoader';
import { sceneTextures, textureUsable } from '../SceneWarmup';
import { VillageBoards } from '../village/VillageBoards';
import type { WorldVillage } from './worldLayout';

export interface VillageZoneProps {
  village: WorldVillage;
  level: QualityLevel;
  /** Chữ trên biển từng màn (đã qua fmt), icon và trạng thái */
  labels: Readonly<Record<number, string>>;
  icons: Readonly<Record<number, string>>;
  states: Readonly<Record<number, LevelState | undefined>>;
  /** Người dẫn đang được nói chuyện (đứng yên quay mặt về người chơi) */
  guideTalking: boolean;
  talkAt: readonly [number, number, number];
  /** Gọi một lần khi mọi phần của vùng đã dựng xong */
  onReady: (village: VillageId) => void;
}

/** Cứ bấy nhiêu khung hình dựng thêm một phần (chia nhỏ để không khựng). */
const FRAMES_PER_STAGE = 2;

/**
 * Làm ấm một model nhân vật trước khi dựng: tải và giải mã (chạy ngầm), rồi đẩy từng texture lên GPU MỖI KHUNG HÌNH MỘT CÁI (`initTexture`), để lúc dựng nhân vật thật không phải tải hay đẩy texture 2048 trong
 * một khung hình (đó là chỗ khựng ~100 ms khi bác An hiện ra). Trả true khi xong. Giữ model trong lúc làm ấm.
 */
function useWarmModel(id: string | null): boolean {
  const gl = useThree((s) => s.gl);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const promise = preloadModel(id);
    retainModel(id);
    void promise.then((data) => {
      if (cancelled) return;
      const textures = sceneTextures(data.scene).filter(textureUsable);
      let i = 0;
      const step = () => {
        if (cancelled) return;
        if (i < textures.length) {
          gl.initTexture(textures[i++]);
          requestAnimationFrame(step);
        } else setDone(id);
      };
      requestAnimationFrame(step);
    });
    return () => {
      cancelled = true;
      releaseModel(id);
    };
  }, [id, gl]);
  return id !== null && done === id;
}

/**
 * Vùng làng đã tải (mốc 2, bước W1): đồ vật của làng (model nhân bản có đủ 3 bậc, đồ nhỏ, biển gỗ, người dẫn) dựng DẦN, mỗi vài khung hình một phần (đồ nhỏ, biển, từng model, người dẫn) thay vì cả cụm
 * trong một khung hình, để không khựng khi người chơi tới gần. Gỡ vùng (xa quá) thì mọi hình học, vật liệu riêng và texture biển được giải phóng bởi chính từng phần. Mặt đất, cổng và hình dáng nhìn từ xa
 * (bản xa) nằm ngoài vùng nên luôn có. Đặt trong <WalkWorld>.
 */
export function VillageZone({ village, level, labels, icons, states, guideTalking, talkAt, onReady }: VillageZoneProps) {
  const layout = village.layout;
  const byModel = useMemo(() => {
    const out: { id: string; items: Placement[] }[] = [];
    for (const id of layout.models) if (id !== layout.gate.model) out.push({ id, items: layout.placements.filter((p) => p.model === id) });
    return out.filter((m) => m.items.length > 0);
  }, [layout]);
  const guide = layout.guide;
  const guideModel = guide ? `characters/${CHARACTERS[guide.character].portrait}` : null;
  const guideWarm = useWarmModel(guideModel);
  // các phần theo thứ tự: 1 đồ nhỏ, 2 biển, 3.. từng model, cuối cùng người dẫn (chỉ khi model đã làm ấm xong)
  const total = 2 + byModel.length + (guide ? 1 : 0);
  const [stage, setStage] = useState(0);
  const frames = useRef(0);
  const ready = useRef(false);
  useFrame(() => {
    if (guide && stage === total - 1 && !guideWarm) return; // chờ model người dẫn làm ấm xong rồi mới dựng
    if (stage >= total) return;
    if (++frames.current >= FRAMES_PER_STAGE) {
      frames.current = 0;
      setStage((s) => s + 1);
    }
  });
  useEffect(() => {
    if (stage >= total && !ready.current) {
      ready.current = true;
      onReady(village.id);
    }
  }, [stage, total, village.id, onReady]);
  if (import.meta.env.DEV) (window as unknown as { __zoneStage?: Record<string, number> }).__zoneStage = { ...((window as unknown as { __zoneStage?: Record<string, number> }).__zoneStage ?? {}), [village.id]: stage };

  return (
    <group>
      {stage >= 1 && <MarketProps layout={layout} />}
      {stage >= 2 && <VillageBoards boards={layout.boards} labels={labels} icons={icons} states={states} />}
      {byModel.map(({ id, items }, i) =>
        stage >= 3 + i ? (
          <Suspense key={id} fallback={null}>
            <ModelInstances id={id} items={items} level={level} />
          </Suspense>
        ) : null,
      )}
      {guide && guideModel && guideWarm && stage >= 3 + byModel.length && (
        <Suspense fallback={null}>
          <Character
            id={guideModel}
            position={[guide.x, 0, guide.z]}
            rotation={[0, guide.yaw, 0]}
            mood={guideTalking ? 'talking' : 'idle'}
            lookAt={guideTalking ? talkAt : undefined}
            seed={7}
          />
        </Suspense>
      )}
    </group>
  );
}
