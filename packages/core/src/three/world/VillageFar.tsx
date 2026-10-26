import { Suspense, useEffect, useMemo } from 'react';
import { VILLAGE_ORDER } from '../../content/levels';
import { ModelInstances } from '../cho/ModelInstances';
import type { Placement } from '../cho/marketLayout';
import type { QualityLevel } from '../quality';
import type { LoadedZones } from './WorldTracker';
import type { WorldVillage } from './worldLayout';

/** Xa nhất còn vẽ hình dáng làng từ xa ở mức Thấp (các mức khác vẽ hết trong khung nhìn). Tâm làng cách chợ 89,5: từ chợ thấy cả 4 làng, từ trong một làng thì không thấy làng đối diện. */
export const FAR_VIEW_LOW = 130;
/**
 * Xa nhất còn vẽ nhà, lều và bụi tre ở xa (hình dáng các làng và chợ) ở mức Vừa (bước L6): sương ở mức Vừa gần kín ở 260 (kín hẳn từ 300) nên xa hơn thế hầu như không thấy; đứng sâu trong Làng Bạc nhìn về phía chợ thì cả chợ và hình dáng ba làng kia
 * lọt khung nhìn (mỗi bản xa 8.000 tam giác): đo trước khi giới hạn là 1.046.415 tam giác ở (0; 52) nhìn bắc, vượt 1.000.000. Mức Cao không giới hạn (dưới 1.500.000).
 */
export const FAR_VIEW_MEDIUM = 260;
/** Tầm vẽ xa nhất của các model ở xa (hình dáng làng, chợ) theo mức chất lượng; undefined là vẽ hết trong khung nhìn. */
export function farViewDistance(level: QualityLevel): number | undefined {
  return level === 'low' ? FAR_VIEW_LOW : level === 'medium' ? FAR_VIEW_MEDIUM : undefined;
}

/** Tối đa bấy nhiêu nhà và bụi tre của MỖI làng được vẽ từ xa (bản xa 8.000 tam giác mỗi cái): Làng Giấy có 12 nhà nhưng từ xa chỉ cần thấy vài nhà; mức Thấp bớt thêm. */
export const FAR_HOUSES: Readonly<Record<QualityLevel, number>> = { low: 4, medium: 6, high: 6 };
export const FAR_BAMBOO = 4;

/** Chọn `n` phần tử rải đều trong danh sách (giữ thứ tự); `n` từ độ dài danh sách trở lên thì lấy hết. */
export function pickEvenly<T>(items: readonly T[], n: number): T[] {
  if (n >= items.length) return [...items];
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => items[Math.floor(((i + 0.5) * items.length) / n)]);
}

/** Hình dáng một làng nhìn từ xa ở mức `level`: nhà (và bụi tre, trừ mức Thấp) thưa bớt đều theo thứ tự. */
export function farSilhouette(silhouette: readonly Placement[], level: QualityLevel): Placement[] {
  const houses = silhouette.filter((p) => p.model.startsWith('env/nha-mai'));
  const bamboo = silhouette.filter((p) => p.model === 'env/bui-tre');
  return [...pickEvenly(houses, FAR_HOUSES[level]), ...(level === 'low' ? [] : pickEvenly(bamboo, FAR_BAMBOO))];
}

/**
 * Hình dáng các làng nhìn từ xa (mốc 2, bước W1): nhà và vài bụi tre của 4 làng, chỉ bản xa (nhẹ), mỗi model một InstancedMesh dùng chung cho cả 4 làng (không tải bản chính, không đổ bóng). Làng nào đã tải vùng
 * thì ẩn phần của làng đó (vùng đã vẽ đủ bản xa lẫn bản gần) bằng mặt nạ `skip`, không dựng lại gì. Đặt trong <WalkWorld>.
 */
export function VillageFar({ villages, level, loaded }: { villages: readonly WorldVillage[]; level: QualityLevel; loaded: LoadedZones }) {
  const groups = useMemo(() => {
    const byModel = new Map<string, { items: Placement[]; owners: number[] }>();
    villages.forEach((v) => {
      const owner = VILLAGE_ORDER.indexOf(v.id);
      for (const p of farSilhouette(v.silhouette, level)) {
        const g = byModel.get(p.model) ?? { items: [], owners: [] };
        g.items.push(p);
        g.owners.push(owner);
        byModel.set(p.model, g);
      }
    });
    return [...byModel.entries()].map(([id, g]) => ({ id, items: g.items, owners: g.owners, skip: new Uint8Array(g.items.length) }));
  }, [villages, level]);
  useEffect(() => {
    for (const g of groups) g.owners.forEach((o, i) => (g.skip[i] = loaded[VILLAGE_ORDER[o]] ? 1 : 0));
  }, [groups, loaded]);
  return (
    <>
      {groups.map((g) => (
        <Suspense key={g.id} fallback={null}>
          <ModelInstances id={g.id} items={g.items} level={level} farOnly maxDistance={farViewDistance(level)} skip={g.skip} />
        </Suspense>
      ))}
    </>
  );
}
