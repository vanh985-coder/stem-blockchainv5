import { Bounds, OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { useManifest } from '../assets/store';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { Panel } from '../ui/Panel';
import { Model, type ModelLod } from './Model';
import { Scene3D } from './Scene3D';
import { isLodId, lodId, modelPath } from './modelIds';
import { preloadModel } from './modelLoader';
import { QUALITY_CHOICES, lodDistance, type QualityChoice } from './quality';
import { useQuality } from './useQuality';

interface Stats {
  fps: number;
  distance: number;
}

/** Đo FPS và khoảng cách camera, báo ra ngoài mỗi nửa giây. Không cấp phát trong useFrame (chỉ cấp phát khi báo). */
function StatsProbe({ onStats }: { onStats: (s: Stats) => void }) {
  const clock = useMemo(() => ({ last: performance.now(), frames: 0 }), []);
  useFrame((state) => {
    clock.frames++;
    const now = performance.now();
    const elapsed = now - clock.last;
    if (elapsed >= 500) {
      onStats({ fps: (clock.frames * 1000) / elapsed, distance: state.camera.position.length() });
      clock.last = now;
      clock.frames = 0;
    }
  });
  return null;
}

const QUALITY_LABEL: Record<QualityChoice, string> = {
  auto: ui.caiDat.chatLuongTuDong,
  low: ui.caiDat.chatLuongThap,
  medium: ui.caiDat.chatLuongVua,
  high: ui.caiDat.chatLuongCao,
};

const LOD_LABEL: Record<ModelLod, string> = {
  auto: ui.dev3d.banXaTuDong,
  near: ui.dev3d.banXaChinh,
  far: ui.dev3d.banXaXa,
};

const BTN = 'min-h-11 cursor-pointer rounded-nut border-2 px-3 font-bold';

/**
 * Trang /dev/3d bản đầu (spec 03 mục 10): chọn model trong manifest, xoay và phóng to xem, bật tắt bản xa, chọn mức
 * chất lượng, bộ đếm FPS, liệt kê tên clip. Chưa phát clip (bước sau).
 */
export function DevModelViewer() {
  const manifest = useManifest();
  const ids = useMemo(
    () =>
      manifest
        ? Object.keys(manifest)
            .filter((k) => k.startsWith('models/'))
            .map((k) => k.slice('models/'.length))
            .filter((id) => !isLodId(id))
            .sort()
        : [],
    [manifest],
  );
  const [id, setId] = useState('characters/bac-an');
  const [lod, setLod] = useState<ModelLod>('auto');
  const [choice, setChoice] = useState<QualityChoice>('low');
  const [stats, setStats] = useState<Stats | null>(null);
  const [clips, setClips] = useState<string[] | null>(null);
  const [placeholder, setPlaceholder] = useState(false);
  const { level } = useQuality(choice);

  useEffect(() => {
    let cancelled = false;
    setClips(null);
    void preloadModel(id).then((d) => {
      if (cancelled) return;
      setClips(d.animations.map((a) => a.name));
      setPlaceholder(d.placeholder);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const entry = manifest?.[modelPath(id)];
  const hasLod = !!manifest?.[modelPath(lodId(id))];
  // Model không có bản xa thì luôn dùng bản chính, bất kể nút đã chọn.
  const activeLod: ModelLod = hasLod ? lod : 'near';

  return (
    <main className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[22rem_1fr]">
      <Panel className="space-y-3">
        <h1 className="text-2xl">{ui.dev3d.tieuDe}</h1>
        <label className="block">
          <span className="font-bold">{ui.dev3d.chonModel}</span>
          <select className="mt-1 min-h-11 w-full rounded-nut border-2 border-nau-go bg-giay px-2" value={id} onChange={(e) => setId(e.target.value)}>
            {(ids.length ? ids : [id]).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {entry && <p className="text-sm">{fmt(ui.dev3d.thongTin, { so: entry.tris ?? 0, kb: Math.round(entry.bytes / 1024) })}</p>}
        {placeholder && <p className="text-sm font-bold text-do-son">{ui.dev3d.hinhThayThe}</p>}

        <fieldset>
          <legend className="font-bold">{ui.dev3d.banXa}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(['auto', 'near', 'far'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={activeLod === m}
                disabled={!hasLod && m !== 'near'}
                onClick={() => setLod(m)}
                className={`${BTN} ${activeLod === m ? 'border-xanh-la-dam bg-xanh-la text-white' : 'border-nau-go bg-giay'} disabled:opacity-40`}
              >
                {LOD_LABEL[m]}
              </button>
            ))}
          </div>
          {!hasLod && <p className="mt-1 text-sm">{ui.dev3d.khongCoBanXa}</p>}
        </fieldset>

        <fieldset>
          <legend className="font-bold">{ui.dev3d.chatLuong}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUALITY_CHOICES.map((q) => (
              <button
                key={q}
                type="button"
                aria-pressed={choice === q}
                onClick={() => setChoice(q)}
                className={`${BTN} ${choice === q ? 'border-xanh-la-dam bg-xanh-la text-white' : 'border-nau-go bg-giay'}`}
              >
                {QUALITY_LABEL[q]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm">{fmt(ui.dev3d.mucDangDung, { muc: QUALITY_LABEL[level], m: lodDistance(level) })}</p>
        </fieldset>

        <div className="font-display text-xl font-bold" aria-live="off">
          <p>{fmt(ui.dev3d.fps, { so: stats ? stats.fps.toFixed(0) : '–' })}</p>
          <p className="text-base">{fmt(ui.dev3d.khoangCach, { so: stats ? stats.distance.toFixed(1) : '–' })}</p>
        </div>

        <div>
          <p className="font-bold">{ui.dev3d.clip}</p>
          {clips && clips.length > 0 ? (
            <ul className="list-disc pl-5 text-sm">
              {clips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">{clips ? ui.dev3d.khongCoClip : ui.chung.dangTai}</p>
          )}
        </div>
        <p className="text-sm text-nau-go-dam">{ui.dev3d.huongDan}</p>
      </Panel>

      <div className="h-[70vh] min-h-[360px] overflow-hidden rounded-bang border-2 border-nau-go">
        <Scene3D quality={choice} autoDowngrade={false} camera={{ position: [0, 3, 8] }} shadowExtent={12}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[40, 48]} />
            <meshStandardMaterial color="#9bc47a" roughness={1} />
          </mesh>
          <Bounds key={id} fit margin={1.6}>
            <Model id={id} lod={activeLod} castShadow receiveShadow />
          </Bounds>
          <OrbitControls makeDefault enableDamping maxDistance={80} maxPolarAngle={Math.PI / 2 - 0.02} />
          <StatsProbe onStats={setStats} />
        </Scene3D>
      </div>
    </main>
  );
}
