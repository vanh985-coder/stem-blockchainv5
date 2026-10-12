import { Bounds, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { useManifest } from '../assets/store';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { Panel } from '../ui/Panel';
import { Character, type PoseRequest } from './Character';
import { ReactionStage } from './ReactionStage';
import { DevCharacterGroup } from './DevCharacterGroup';
import { Model, type ModelLod } from './Model';
import { Scene3D } from './Scene3D';
import { CLIP_CONFIG, formatClipConfig, type ClipConfigTable } from './clipConfig';
import { CLIP_NAMES, type ClipName } from './clips';
import { isLodId, lodId, modelPath } from './modelIds';
import { modelCacheStats, preloadModel } from './modelLoader';
import { choiceReactions } from './choiceReactions';
import { POSE_NAMES, isPoseAllowed, type Aim } from './poses';
import { RIGGED_CHARACTER_IDS, isCharacterId } from './modelSizes';
import { QUALITY_CHOICES, lodDistance, type QualityChoice } from './quality';
import type { Mood } from './staticMotion';
import { useQuality } from './useQuality';
import { useChoiceHandlers } from './useReaction';

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

/** Đặt lại camera khi đổi giữa "từng model" và "cả nhóm" (giữ nguyên khung vẽ, nên model cũ phải được giải phóng). */
function CameraPreset({ group }: { group: boolean }) {
  const camera = useThree((st) => st.camera);
  const controls = useThree((st) => st.controls) as { target: { set(x: number, y: number, z: number): void }; update(): void } | null;
  useEffect(() => {
    if (!group) return;
    camera.position.set(0, 2.6, 12);
    controls?.target.set(0, 0.9, 2);
    controls?.update();
  }, [group, camera, controls]);
  return null;
}

/** Số liệu dev để kiểm tra rò rỉ bộ nhớ (chỉ khi chạy dev): window.__sochung3d. */
interface DevProbe {
  gl: RootState['gl'];
  cache: typeof modelCacheStats;
}
const exposeProbe = (st: RootState) => {
  if (import.meta.env.DEV) (window as unknown as { __sochung3d?: DevProbe }).__sochung3d = { gl: st.gl, cache: modelCacheStats };
};

const ANSWERS = ['A', 'B', 'C', 'D'] as const;

/** Bốn nút đáp án giả: rê chuột, Tab, bấm hoặc chạm đều phát sự kiện vào kho, giống QuizCard. */
function FakeAnswers() {
  const reactions = useChoiceHandlers();
  const [result, setResult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = (el: HTMLElement) => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    void reactions.select(el).then(() => {
      const ok = Math.random() < 0.5;
      setResult(ok);
      reactions.result(ok);
      setBusy(false);
    });
  };
  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-2 gap-2">
        {ANSWERS.map((a) => (
          <li key={a}>
            <button
              type="button"
              disabled={busy}
              {...reactions.bindChoice()}
              onClick={(e) => choose(e.currentTarget)}
              className="min-h-14 w-full cursor-pointer rounded-nut border-2 border-nau-go bg-giay px-3 font-bold hover:brightness-105 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
            >
              {fmt(ui.dev3d.phanUngDapAn, { x: a })}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm font-bold" role="status">
        {result === null ? ui.dev3d.phanUngChon : result ? ui.dev3d.phanUngDung : ui.dev3d.phanUngSai}
      </p>
    </div>
  );
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

const MOOD_LABEL: Record<Mood | 'happy', string> = {
  idle: ui.dev3d.trangThaiDung,
  talking: ui.dev3d.trangThaiNoi,
  happy: ui.dev3d.trangThaiVui,
};

const BTN = 'min-h-11 cursor-pointer rounded-nut border-2 px-3 font-bold';
const on = (active: boolean) => (active ? 'border-xanh-la-dam bg-xanh-la text-white' : 'border-nau-go bg-giay');

/**
 * Trang /dev/3d (spec 03 mục 10): chọn model trong manifest, xoay và phóng to xem, bật tắt bản xa, chọn mức chất lượng,
 * bộ đếm FPS, tên clip; nhân vật có xương có nút phát từng clip và thanh trượt đoạn phát jump, cheer (xuất ra
 * clipConfig.ts); nhân vật đứng yên có nút trạng thái; nút "Xem cả nhóm" đặt 10 nhân vật và Bi cạnh nhau.
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
  const [group, setGroup] = useState(false);
  const [lod, setLod] = useState<ModelLod>('auto');
  const [choice, setChoice] = useState<QualityChoice>('low');
  const [stats, setStats] = useState<Stats | null>(null);
  const [clips, setClips] = useState<string[] | null>(null);
  const [placeholder, setPlaceholder] = useState(false);
  const [anim, setAnim] = useState<{ clip: ClipName; n: number }>({ clip: 'idle', n: 0 });
  const [mood, setMood] = useState<Mood>('idle');
  const [happyN, setHappyN] = useState<number | undefined>(undefined);
  const [config, setConfig] = useState<ClipConfigTable>(CLIP_CONFIG);
  const [poseReq, setPoseReq] = useState<PoseRequest | undefined>(undefined);
  const [pointOn, setPointOn] = useState(false);
  const [exported, setExported] = useState<{ text: string; copied: boolean } | null>(null);
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
  const isChar = isCharacterId(id);
  const rigged = RIGGED_CHARACTER_IDS.includes(id);
  /** Điểm chỉ thử: bên phải và hơi cao hơn tầm mắt (giống đáp án nằm bên phải khung). */
  const sampleAim: Aim = { az: 0.9, el: 0.15 };

  const setJump = (patch: { from?: number; to?: number }) => setConfig((c) => ({ ...c, jump: { ...c.jump, ...patch } }));
  const exportConfig = () => {
    const text = formatClipConfig(config);
    const done = (copied: boolean) => setExported({ text, copied });
    if (navigator.clipboard) void navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    else done(false);
  };

  return (
    <main className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[22rem_1fr]">
      <Panel className="space-y-3">
        <h1 className="text-2xl">{ui.dev3d.tieuDe}</h1>
        <button type="button" aria-pressed={group} onClick={() => setGroup((g) => !g)} className={`${BTN} w-full ${on(group)}`}>
          {group ? ui.dev3d.xemTungModel : ui.dev3d.xemNhom}
        </button>
        {group && <p className="text-sm">{ui.dev3d.nhomMoTa}</p>}

        {!group && (
          <>
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

            {!isChar && (
              <fieldset>
                <legend className="font-bold">{ui.dev3d.banXa}</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(['auto', 'near', 'far'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={activeLod === m} disabled={!hasLod && m !== 'near'} onClick={() => setLod(m)} className={`${BTN} ${on(activeLod === m)} disabled:opacity-40`}>
                      {LOD_LABEL[m]}
                    </button>
                  ))}
                </div>
                {!hasLod && <p className="mt-1 text-sm">{ui.dev3d.khongCoBanXa}</p>}
              </fieldset>
            )}

            {rigged && (
              <>
                <fieldset>
                  <legend className="font-bold">{ui.dev3d.phatClip}</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {CLIP_NAMES.map((c) => (
                      <button key={c} type="button" aria-pressed={anim.clip === c} onClick={() => setAnim((a) => ({ clip: c, n: a.n + 1 }))} className={`${BTN} ${on(anim.clip === c)}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-sm">{ui.dev3d.clipBorMuon}</p>
                </fieldset>

                <fieldset>
                  <legend className="font-bold">{ui.dev3d.tuThe}</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {POSE_NAMES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={!isPoseAllowed(id, p)}
                        onClick={() => setPoseReq((r) => ({ name: p, n: (r?.n ?? 0) + 1 }))}
                        className={`${BTN} ${on(poseReq?.name === p)} disabled:opacity-40`}
                      >
                        {p}
                      </button>
                    ))}
                    <button type="button" aria-pressed={pointOn} onClick={() => setPointOn((v) => !v)} className={`${BTN} ${on(pointOn)}`}>
                      {ui.dev3d.tuThePoint}
                    </button>
                  </div>
                  <p className="mt-1 text-sm">{ui.dev3d.tuTheGhiChu}</p>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="font-bold">{ui.dev3d.doanPhat}</legend>

                  <label className="block text-sm">
                    {fmt(ui.dev3d.jumpTu, { so: Math.round(config.jump.from * 100) })}
                    <input type="range" min={0} max={100} value={Math.round(config.jump.from * 100)} onChange={(e) => setJump({ from: Number(e.target.value) / 100 })} className="w-full" />
                  </label>
                  <label className="block text-sm">
                    {fmt(ui.dev3d.jumpDen, { so: Math.round((config.jump.to ?? 1) * 100) })}
                    <input type="range" min={0} max={100} value={Math.round((config.jump.to ?? 1) * 100)} onChange={(e) => setJump({ to: Number(e.target.value) / 100 })} className="w-full" />
                  </label>
                  <label className="block text-sm">
                    {fmt(ui.dev3d.cheerGiay, { so: (config.cheer.seconds ?? 2.5).toFixed(1) })}
                    <input type="range" min={0.5} max={12} step={0.1} value={config.cheer.seconds ?? 2.5} onChange={(e) => setConfig((c) => ({ ...c, cheer: { ...c.cheer, seconds: Number(e.target.value) } }))} className="w-full" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={exportConfig} className={`${BTN} ${on(false)}`}>
                      {ui.dev3d.xuatClipConfig}
                    </button>
                    <button type="button" onClick={() => setConfig(CLIP_CONFIG)} className={`${BTN} ${on(false)}`}>
                      {ui.dev3d.datLaiDoan}
                    </button>
                  </div>
                  {exported && (
                    <div className="text-sm">
                      <p>{exported.copied ? ui.dev3d.daChep : ui.dev3d.khongChep}</p>
                      <textarea readOnly rows={8} value={exported.text} className="mt-1 w-full rounded-nut border-2 border-nau-go bg-white p-2 font-mono text-xs" />
                    </div>
                  )}
                </fieldset>
              </>
            )}

            {isChar && !rigged && (
              <fieldset>
                <legend className="font-bold">{ui.dev3d.trangThai}</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(['idle', 'talking'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={mood === m} onClick={() => setMood(m)} className={`${BTN} ${on(mood === m)}`}>
                      {MOOD_LABEL[m]}
                    </button>
                  ))}
                  <button type="button" onClick={() => setHappyN((n) => (n ?? 0) + 1)} className={`${BTN} ${on(false)}`}>
                    {MOOD_LABEL.happy}
                  </button>
                </div>
              </fieldset>
            )}
          </>
        )}

        <fieldset>
          <legend className="font-bold">{ui.dev3d.chatLuong}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUALITY_CHOICES.map((q) => (
              <button key={q} type="button" aria-pressed={choice === q} onClick={() => setChoice(q)} className={`${BTN} ${on(choice === q)}`}>
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

        {!group && (
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
        )}
        <p className="text-sm text-nau-go-dam">{ui.dev3d.huongDan}</p>
      </Panel>

      <div className="space-y-4">
      <div className="h-[70vh] min-h-[360px] overflow-hidden rounded-bang border-2 border-nau-go">
        <Scene3D quality={choice} autoDowngrade={false} camera={{ position: [0, 3, 8] }} shadowExtent={14} onCreated={exposeProbe}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[40, 48]} />
            <meshStandardMaterial color="#9bc47a" roughness={1} />
          </mesh>
          {group ? (
            <DevCharacterGroup />
          ) : (
            <Bounds key={id} fit margin={1.6}>
              {isChar ? (
                <Character id={id} animation={anim.clip} trigger={anim.n} clipConfig={config} pose={poseReq} aim={pointOn ? sampleAim : null} mood={mood} happyTrigger={happyN} lookAt={[0, 1, 10]} />
              ) : (
                <Model id={id} lod={activeLod} castShadow receiveShadow />
              )}
            </Bounds>
          )}
          <OrbitControls makeDefault enableDamping target={group ? [0, 0.9, 2] : undefined} maxDistance={80} maxPolarAngle={Math.PI / 2 - 0.02} />
          <CameraPreset group={group} />
          <StatsProbe onStats={setStats} />
        </Scene3D>
      </div>

      <Panel className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <div className="md:col-span-2">
          <h2 className="text-xl">{ui.dev3d.phanUngTieuDe}</h2>
          <p className="text-sm">{ui.dev3d.phanUngHuongDan}</p>
        </div>
        <ReactionStage className="h-[340px] overflow-hidden rounded-bang border-2 border-nau-go" quality={choice} store={choiceReactions} />
        <FakeAnswers />
      </Panel>
      </div>
    </main>

  );
}
