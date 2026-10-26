import { useThree } from '@react-three/fiber';
import { PlaneGeometry, type BufferGeometry, type Material, type MeshStandardMaterial, type Texture } from 'three';
import { useEffect, useRef } from 'react';
import { CHARACTERS } from '../../content/characters';
import { CRAFT_KINDS, acquireCraftGeometry, craftMaterial, releaseCraftGeometry } from '../cho/MarketProcedural';
import { createScrollResources } from '../village/KnowScrolls';
import { scatterMaterial, stoneHillMaterial } from '../village/ScatterProps';
import { acquireTagAtlas, createGear, gearMaterial, readyTagAtlas, releaseTagAtlas, tagDigitMaterial } from '../village/VillageFeatures';
import { SCATTER_KINDS } from '../village/scatter';
import { createScatterGeometry, createStoneHill } from '../village/scatterGeometry';
import { createPartsPrewarm, instanceModelIds, type PartsPrewarm } from '../cho/ModelInstances';
import { lodId } from '../modelIds';
import { preloadModel, releaseModel, retainModel, type ModelData } from '../modelLoader';
import type { QualityLevel } from '../quality';
import { PROBE } from '../../lib/dev';
import { compileAhead, markModelWarm, materialsOf, unmarkModelWarm, usableTextures, warmTextures } from './warm';
import type { WorldVillage } from './worldLayout';

/** Ngân sách thời gian (ms) cho việc nướng hình học trong một khung hình rảnh. */
const BAKE_BUDGET_MS = 6;

export interface ZonePrewarmProps {
  village: WorldVillage;
  level: QualityLevel;
  /** Báo khi chuẩn bị xong (true) hay bị bỏ giữa chừng / bỏ chuẩn bị (false): vùng làng chờ tín hiệu này mới dựng, để không khung hình nào phải làm việc nặng */
  onDone?: (village: WorldVillage['id'], done: boolean) => void;
}

/** Tải tối đa bấy nhiêu model cùng lúc: model giải mã xong là phân tích (parse) ở luồng chính, tải dồn một lúc thì phân tích dồn vào một khung hình. */
const PRELOAD_CONCURRENCY = 2;
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Id model nhân vật của người dẫn làng (null nếu làng không có người dẫn). */
export function guideModelOf(village: Pick<WorldVillage, 'layout'>): string | null {
  const g = village.layout.guide;
  return g ? `characters/${CHARACTERS[g.character].portrait}` : null;
}

/** Id model nhân vật của những người đứng yên thêm ở khu giữa làng (cô Chi...), không trùng người dẫn. */
export function companionModelsOf(village: Pick<WorldVillage, 'layout'>): string[] {
  const guide = guideModelOf(village);
  const ids = (village.layout.companions ?? []).map((c) => `characters/${CHARACTERS[c.character].portrait}`);
  return [...new Set(ids)].filter((id) => id !== guide);
}

/**
 * Chuẩn bị sẵn một vùng làng khi người chơi còn ở xa (rìa làng dưới `ZONE_PREWARM_DISTANCE`), để lúc vùng thật sự tải không có việc nặng nào còn lại (mốc 2, bước W2):
 * 1. tải và giải mã mọi model của làng (bản chính, vừa, xa) cùng model người dẫn, ở luồng phụ (meshopt) và qua mạng, không chặn khung hình;
 * 2. nướng hình học (\`createPartsPrewarm\`): từng model, mỗi lần một mesh, trong ngân sách vài ms của khung hình rảnh (bộ nhớ đệm dùng chung nên vùng dựng sau chỉ lấy lại);
 * 3. đẩy texture lên GPU, mỗi khung hình tối đa một cái và chờ GPU sau texture 2048 (\`warmTextures\`).
 * Giữ các model và phần đã nướng cho tới khi bỏ chuẩn bị (người chơi đi xa), rồi trả lại. Không vẽ gì. Đặt trong <WalkWorld>.
 */
export function ZonePrewarm({ village, level, onDone }: ZonePrewarmProps) {
  const done = useRef(onDone);
  done.current = onDone;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const models = village.layout.models; // gồm cả model cổng (cổng chỉ vẽ bản xa cho tới khi làng được chuẩn bị)
    const guide = guideModelOf(village);
    const companions = companionModelsOf(village);
    const groups = models.map((id) => ({ id, ids: instanceModelIds(id, level) }));
    const allIds = [...new Set([...groups.flatMap((g) => g.ids), ...(guide ? [guide] : []), ...companions])];
    for (const id of allIds) retainModel(id);
    const tasks: PartsPrewarm[] = [];
    const crafts: { kind: string; geometry: BufferGeometry; material: MeshStandardMaterial }[] = [];
    /** Đồ rải dựng bằng code và thẻ "Em có biết?" (bước X3): vật liệu mẫu để biên dịch trước shader, giữ tới khi bỏ chuẩn bị */
    const extras: { geometry: BufferGeometry; material: Material; plain?: boolean }[] = [];
    let tagAtlasHeld = false;
    let tagTexture: Texture | null = null;
    let scrollRes: ReturnType<typeof createScrollResources> | null = null;
    let raf = 0;

    const mark = (phase: string) => {
      if (PROBE) ((window as unknown as { __prewarmLog?: unknown[] }).__prewarmLog ??= []).push([village.id, phase, Math.round(performance.now())]);
    };
    const run = async () => {
      mark('start');
      const loaded = new Map<string, ModelData>();
      // tải từng đợt nhỏ, mỗi model xong nghỉ một khung hình
      let next = 0;
      const worker = async () => {
        while (!cancelled && next < allIds.length) {
          const id = allIds[next++];
          loaded.set(id, await preloadModel(id));
          await nextFrame();
        }
      };
      await Promise.all(Array.from({ length: PRELOAD_CONCURRENCY }, worker));
      if (cancelled) return;
      mark('loaded');
      // nướng hình học, từng model một, mỗi khung hình rảnh một ít
      const queue = groups.map((g) => ({ id: g.id, near: loaded.get(g.id) ?? null, mid: g.ids.length === 3 ? (loaded.get(g.ids[1]) ?? null) : null, far: loaded.get(lodId(g.id)) as ModelData }));
      await new Promise<void>((resolve) => {
        let current: PartsPrewarm | null = null;
        const tick = () => {
          if (cancelled) return resolve();
          if (!current) {
            const q = queue.shift();
            if (!q) return resolve();
            current = createPartsPrewarm(q.id, q.near, q.mid, q.far);
            tasks.push(current);
          }
          if (current.step(BAKE_BUDGET_MS)) current = null;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
      if (cancelled) return;
      mark('baked');
      // biên dịch trước shader: vật liệu các model của làng (kể cả người dẫn) và các đồ nhỏ do code dựng có trong làng (vật liệu màu theo đỉnh là chương trình mới)
      const kinds = new Set(village.layout.props.map((p) => p.kind));
      // giữ vật liệu mẫu tới khi bỏ chuẩn bị: vật liệu bị giải phóng thì three bỏ luôn chương trình shader vừa biên dịch (hết nơi dùng), và vùng dựng sau phải biên dịch lại
      for (const k of CRAFT_KINDS) if (kinds.has(k)) crafts.push({ kind: k, geometry: acquireCraftGeometry(k), material: craftMaterial(k, level) as MeshStandardMaterial });
      // đồ rải của làng lớn: mỗi loại có mặt trong làng một vật liệu (màu theo đỉnh) là một chương trình shader mới; thẻ Em có biết: cuộn phát sáng, cột sáng và vầng sáng (vật liệu cộng sáng)
      const scat = new Set((village.layout.scatter ?? []).map((p) => p.kind));
      for (const k of SCATTER_KINDS) if (scat.has(k)) extras.push({ geometry: createScatterGeometry(k), material: scatterMaterial(k) });
      if (kinds.has('may-soi-dau')) extras.push({ geometry: createGear(0.5, 12, 0.14), material: gearMaterial(level), plain: true }); // bánh răng của máy: mesh thường có texture, chương trình shader riêng
      if ((village.layout.scatter ?? []).some((p) => p.kind === 'doi' && p.stone)) extras.push({ geometry: createStoneHill(), material: stoneHillMaterial() });
      if (kinds.has('cay-the')) {
        // chữ trên thẻ gỗ của cây đa: ảnh chữ chung (chờ phông chữ của game, vẽ một lần) và mặt phẳng vật liệu cơ bản có ảnh (chương trình shader riêng, như chữ bảng mẫu dấu); ảnh được đẩy lên GPU ở bước texture bên dưới
        const atlas = acquireTagAtlas();
        tagAtlasHeld = true;
        tagTexture = atlas.texture;
        await readyTagAtlas();
        if (cancelled) return;
        extras.push({ geometry: new PlaneGeometry(1, 1), material: tagDigitMaterial(atlas.texture), plain: true });
      }
      if ((village.layout.scrolls ?? []).length > 0) {
        scrollRes = createScrollResources();
        extras.push({ geometry: scrollRes.scroll, material: scrollRes.scrollMat, plain: true }, { geometry: scrollRes.beam, material: scrollRes.beamMat, plain: true }, { geometry: scrollRes.disc, material: scrollRes.discMat, plain: true });
      }
      await compileAhead(gl, camera, scene, [...crafts, ...extras, ...materialsOf([...loaded.values()].map((d) => d.scene))], isCancelled);
      if (cancelled) return;
      mark('compiled');
      // texture: người dẫn trước (cần cho cảnh đầu tiên), rồi các model của làng
      if (guide) {
        const gd = loaded.get(guide);
        if (gd) await warmTextures(gl, usableTextures([gd.scene]), isCancelled);
        if (!cancelled) markModelWarm(guide);
      }
      const scenes = [...loaded.entries()].filter(([id]) => id !== guide).map(([, d]) => d.scene);
      await warmTextures(gl, [...(tagTexture ? [tagTexture] : []), ...usableTextures(scenes)], isCancelled);
      if (!cancelled) for (const id of companions) markModelWarm(id);
      mark('done');
      if (!cancelled) done.current?.(village.id, true);
    };
    void run();

    return () => {
      cancelled = true;
      done.current?.(village.id, false);
      cancelAnimationFrame(raf);
      for (const t of tasks) t.release();
      for (const c of crafts) {
        releaseCraftGeometry(c.kind);
        c.material.dispose();
      }
      for (const e of extras) {
        e.geometry.dispose();
        e.material.dispose();
      }
      if (tagAtlasHeld) releaseTagAtlas();
      void scrollRes;
      if (guide) unmarkModelWarm(guide);
      for (const id of companions) unmarkModelWarm(id);
      for (const id of allIds) releaseModel(id);
    };
  }, [village, level, gl, scene, camera]);
  return null;
}
