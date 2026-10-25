import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS } from '../../content/characters';
import type { LevelState } from '../../progress/unlock';
import type { VillageId } from '../../village';
import { Character } from '../Character';
import { Villager } from '../Villager';
import { VILLAGER_CULL } from '../cullDistance';
import type { CircleObstacle } from '../collision';
import { MarketProps } from '../cho/MarketProcedural';
import { KnowScrolls } from '../village/KnowScrolls';
import { VillageFeatures } from '../village/VillageFeatures';
import { ScatterProps } from '../village/ScatterProps';
import { SCATTER_CELL } from '../village/ScatterProps';
import { PROPS_MAX_DISTANCE, SCATTER_KINDS, VILLAGE_MODEL_MAX_DISTANCE } from '../village/scatter';
import { ModelInstances } from '../cho/ModelInstances';
import type { Placement } from '../cho/marketLayout';
import type { QualityLevel } from '../quality';
import { preloadModel, releaseModel, retainModel } from '../modelLoader';
import { VillageBoards } from '../village/VillageBoards';
import { isModelWarm, markModelWarm, usableTextures, warmTextures } from './warm';
import type { VillageGuideDef } from '../village/villageLayout';
import type { WorldVillage } from './worldLayout';
import { PROBE } from '../../lib/dev';

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
  /** Vật cản tròn đi theo từng dân làng của làng (cùng thứ tự `layout.villagers`); `Villager` ghi vị trí vào đây mỗi khung hình */
  villagerColliders: readonly CircleObstacle[];
  /** Mặt nạ bit các thẻ "Em có biết?" đã nhặt (bước X3): thẻ chưa nhặt hiện cuộn giấy và cột sáng */
  collected: number;
  /** false ("Giảm chuyển động") thì cuộn giấy không xoay */
  animate: boolean;
  /** Làng đã chuẩn bị xong (xem `ZonePrewarm`): chưa xong thì vùng chờ, tối đa `ZONE_PREWARM_WAIT` giây, rồi mới bắt đầu dựng */
  prewarmed: boolean;
  /** Gọi một lần khi mọi phần của vùng đã dựng xong */
  onReady: (village: VillageId) => void;
}

/** Model dân làng theo thứ tự đi lại (bà cụ, chú nông dân xen kẽ). */
export const ZONE_VILLAGER_MODELS = ['characters/dan-lang-ba-cu', 'characters/dan-lang-nong-dan'];

/** Chờ làng chuẩn bị xong tối đa chừng này giây trước khi dựng vùng (mạng chậm thì vẫn dựng, có thể khựng). */
export const ZONE_PREWARM_WAIT = 12;

/** Cứ bấy nhiêu khung hình dựng thêm một phần (chia nhỏ để không khựng). */
const FRAMES_PER_STAGE = 2;

/**
 * Làm ấm model nhân vật của người dẫn trước khi dựng: thường `ZonePrewarm` đã làm sẵn từ khi người chơi còn xa (`isModelWarm`); chưa kịp thì tự làm (tải, rồi đẩy từng texture lên GPU mỗi khung hình
 * một cái, chờ sau texture 2048: xem `warmTextures`). Trả true khi xong. Giữ model trong lúc làm ấm.
 */
function useWarmModel(id: string | null): boolean {
  const gl = useThree((s) => s.gl);
  const [done, setDone] = useState<string | null>(id !== null && isModelWarm(id) ? id : null);
  useEffect(() => {
    if (!id) return;
    if (isModelWarm(id)) {
      setDone(id);
      return;
    }
    let cancelled = false;
    const promise = preloadModel(id);
    retainModel(id);
    void promise
      .then((data) => warmTextures(gl, usableTextures([data.scene]), () => cancelled))
      .then(() => {
        if (cancelled) return;
        markModelWarm(id);
        setDone(id);
      });
    return () => {
      cancelled = true;
      releaseModel(id);
    };
  }, [id, gl]);
  return id !== null && done === id;
}

/** Người đứng yên thêm ở khu giữa làng (cô Chi bên cạnh cụ Bình): dựng khi model đã làm ấm xong, không nói chuyện. */
function Companion({ def }: { def: VillageGuideDef }) {
  const model = `characters/${CHARACTERS[def.character].portrait}`;
  const warm = useWarmModel(model);
  if (!warm) return null;
  return (
    <Suspense fallback={null}>
      <Character id={model} position={[def.x, 0, def.z]} rotation={[0, def.yaw, 0]} mood="idle" seed={9} />
    </Suspense>
  );
}

/**
 * Vùng làng đã tải (mốc 2, bước W1): đồ vật của làng (model nhân bản có đủ 3 bậc, đồ nhỏ, biển gỗ, người dẫn) dựng DẦN, mỗi vài khung hình một phần (đồ nhỏ, biển, từng model, người dẫn) thay vì cả cụm
 * trong một khung hình, để không khựng khi người chơi tới gần. Gỡ vùng (xa quá) thì mọi hình học, vật liệu riêng và texture biển được giải phóng bởi chính từng phần. Mặt đất, cổng và hình dáng nhìn từ xa
 * (bản xa) nằm ngoài vùng nên luôn có. Đặt trong <WalkWorld>.
 */
export function VillageZone({ village, level, labels, icons, states, guideTalking, talkAt, villagerColliders, collected, animate, prewarmed, onReady }: VillageZoneProps) {
  const layout = village.layout;
  const byModel = useMemo(() => {
    const out: { id: string; items: Placement[] }[] = [];
    for (const id of layout.models) if (id !== layout.gate.model) out.push({ id, items: layout.placements.filter((p) => p.model === id) });
    return out.filter((m) => m.items.length > 0);
  }, [layout]);
  const guide = layout.guide;
  const guideModel = guide ? `characters/${CHARACTERS[guide.character].portrait}` : null;
  const guideWarm = useWarmModel(guideModel);
  const loops = layout.villagers ?? [];
  // các phần theo thứ tự: 1 đồ nhỏ, 2 biển, 3 thẻ "Em có biết?", rồi từng loại đồ rải dựng bằng code (mỗi loại một phần: dựng hình học và các mảnh của cả loại trong một khung hình tốn chừng 15 đến 40 ms), rồi từng model, rồi người dẫn (chỉ khi model đã làm ấm xong), cuối cùng dân làng đi lại
  const scatterKinds = useMemo(() => SCATTER_KINDS.filter((k) => layout.scatter?.some((p) => p.kind === k)), [layout]);
  // đồ có chuyển động hay chữ riêng (máy soi dấu, bảng mẫu dấu của Làng Khắc Dấu) là một phần dựng riêng sau thẻ; làng không có thì không thêm phần nào (số phần các làng cũ không đổi)
  const featureProps = useMemo(() => layout.props.filter((p) => p.kind === 'may-soi-dau' || p.kind === 'bang-mau'), [layout]);
  const featureStage = featureProps.length > 0 ? 1 : 0;
  const firstModel = 4 + featureStage + scatterKinds.length;
  const guideStage = firstModel + byModel.length;
  const total = firstModel - 1 + byModel.length + (guide ? 1 : 0) + loops.length; // mỗi dân làng một phần riêng (dựng một nhân vật có xương mất chừng 15 ms)
  const [stage, setStage] = useState(0);
  const frames = useRef(0);
  const ready = useRef(false);
  const waited = useRef(0);
  useFrame((_, dt) => {
    if (stage === 0 && !prewarmed && (waited.current += dt) < ZONE_PREWARM_WAIT) return; // chờ chuẩn bị xong rồi mới dựng (quá hạn thì dựng luôn)
    if (guide && stage === guideStage - 1 && !guideWarm) return; // chờ model người dẫn làm ấm xong rồi mới dựng
    if (stage >= total) return;
    if (++frames.current >= FRAMES_PER_STAGE) {
      frames.current = 0;
      setStage((s) => s + 1);
    }
  });
  useEffect(() => {
    if (PROBE) {
      const w = window as unknown as { __zoneLog?: [string, number, number][] };
      (w.__zoneLog ??= []).push([village.id, stage, performance.now()]);
    }
  }, [stage, village.id]);
  useEffect(() => {
    if (stage >= total && !ready.current) {
      ready.current = true;
      onReady(village.id);
    }
  }, [stage, total, village.id, onReady]);
  if (PROBE) (window as unknown as { __zoneStage?: Record<string, number> }).__zoneStage = { ...((window as unknown as { __zoneStage?: Record<string, number> }).__zoneStage ?? {}), [village.id]: stage };

  return (
    <group>
      {stage >= 1 && <MarketProps layout={layout} cull={{ cell: SCATTER_CELL, maxDistance: PROPS_MAX_DISTANCE[level] }} />}
      {stage >= 2 && <VillageBoards boards={layout.boards} labels={labels} icons={icons} states={states} />}
      {stage >= 3 && layout.scrolls && layout.scrolls.length > 0 && <KnowScrolls scrolls={layout.scrolls} collected={collected} animate={animate} />}
      {featureStage > 0 && stage >= 4 && <VillageFeatures props={featureProps} animate={animate} />}
      {layout.scatter && scatterKinds.map((k, j) => (stage >= 4 + featureStage + j ? <ScatterProps key={k} scatter={layout.scatter ?? []} level={level} only={k} animate={animate} /> : null))}
      {byModel.map(({ id, items }, i) =>
        stage >= firstModel + i ? (
          <Suspense key={id} fallback={null}>
            <ModelInstances id={id} items={items} level={level} maxDistance={level === 'low' ? undefined : VILLAGE_MODEL_MAX_DISTANCE[level]} />
          </Suspense>
        ) : null,
      )}
      {guide && guideModel && guideWarm && stage >= guideStage && (
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
      {stage >= guideStage && (layout.companions ?? []).map((c, i) => <Companion key={i} def={c} />)}
      {loops.map((path, i) =>
        stage >= total - loops.length + 1 + i ? (
          <Villager
            key={i}
            id={ZONE_VILLAGER_MODELS[i % ZONE_VILLAGER_MODELS.length]}
            waypoints={path}
            seed={211 + i * 23}
            start={i % path.length}
            collider={villagerColliders[i]}
            cullDistance={VILLAGER_CULL[level]}
          />
        ) : null,
      )}
    </group>
  );
}
