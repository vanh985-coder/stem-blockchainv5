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
 * Hình dáng các làng nhìn từ xa (mốc 2, bước W1): nhà và vài bụi tre của 4 làng, chỉ bản xa (nhẹ), mỗi model một InstancedMesh dùng chung cho cả 4 làng (không tải bản chính, không đổ bóng). Làng nào đã tải vùng
 * thì ẩn phần của làng đó (vùng đã vẽ đủ bản xa lẫn bản gần) bằng mặt nạ `skip`, không dựng lại gì. Đặt trong <WalkWorld>.
 */
export function VillageFar({ villages, level, loaded }: { villages: readonly WorldVillage[]; level: QualityLevel; loaded: LoadedZones }) {
  const groups = useMemo(() => {
    const byModel = new Map<string, { items: Placement[]; owners: number[] }>();
    villages.forEach((v) => {
      const owner = VILLAGE_ORDER.indexOf(v.id);
      for (const p of v.silhouette) {
        if (level === 'low' && p.model === 'env/bui-tre') continue; // mức Thấp: từ xa chỉ thấy nhà (giữ dưới 300.000 tam giác)
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
          <ModelInstances id={g.id} items={g.items} level={level} farOnly maxDistance={level === 'low' ? FAR_VIEW_LOW : undefined} skip={g.skip} />
        </Suspense>
      ))}
    </>
  );
}
