import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { asset, useManifest } from '../../assets/store';
import { useAuth } from '../../auth/AuthProvider';
import { CHARACTERS, fmt, speakerLabel } from '../../content/characters';
import { VILLAGE_ORDER, levelById, levelsOfVillage } from '../../content/levels';
import { STORY } from '../../content/story';
import { ui } from '../../content/ui';
import { VILLAGE_SCENE } from '../../content/villageScene';
import { MERGED, URLS, hubPageUrl } from '../../config/urls';
import { canSeeTeacherPage } from '../../auth/roles';
import { villageKnowCards } from '../../content/villageCards';
import { shouldShowGolden, shouldShowKnow, shouldShowScene } from '../../progress/villageIntro';
import { gateOpenedAfter } from '../cho/marketQuest';
import { useProgress } from '../../progress/ProgressProvider';
import { useSettings } from '../../settings/SettingsProvider';
import { EmCoBietDialog } from '../../ui/EmCoBietDialog';
import { GuideDialog } from '../../ui/GuideDialog';
import { VnDialog, type VnTurn } from '../../ui/VnDialog';
import { Character } from '../Character';
import { Scene3D } from '../Scene3D';
import { FreeCamera } from '../FreeCamera';
import { StatsProbe } from '../StatsProbe';
import { SceneWarmup } from '../SceneWarmup';
import { WalkControls } from '../WalkControls';
import { WalkLockOverlay } from '../WalkLockOverlay';
import { WalkWorld } from '../WalkWorld';
import { isQualityChoice, type QualityChoice } from '../quality';
import { useQuality } from '../useQuality';
import { useWalkSession } from '../useWalkSession';
import { createWalkApi } from '../walkApi';
import { ColliderDebug } from '../cho/ColliderDebug';
import { GuideArrow } from '../cho/GuideArrow';
import { MarketHud } from '../cho/MarketHud';
import { MarketMenu } from '../cho/MarketMenu';
import { MarketProps } from '../cho/MarketProcedural';
import { ModelInstances } from '../cho/ModelInstances';
import { GoldenPagesRow } from './GoldenPagesRow';
import { VillageBoards } from './VillageBoards';
import { VillageTerrain } from './VillageTerrain';
import { assembleVillage, createVillageInteractables, parseVillageTarget, villageBiSlot, type VillageLayoutInput, type VillageTarget } from './villageLayout';
import { guideTopic, lockedBy, nextLevel } from './villageQuest';

const DIRT_TEXTURE = 'ui/textures/duong-dat';
const FOG: [number, number] = [70, 260];

function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}
const forcedDebug = (): boolean => typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === 'colliders';
function forcedCam(): 'free' | undefined {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).get('cam') === 'free' ? 'free' : undefined;
}

export interface VillageSceneProps {
  /** Dữ liệu bố cục của làng (gói làng cung cấp) */
  input: VillageLayoutInput;
}

interface DialogState {
  turns: VnTurn[];
  /** Người dẫn đang được nói chuyện (đứng yên quay mặt về người chơi) */
  guideTalking: boolean;
  /** Cảnh mở đầu: có nút "Bỏ qua" và đánh dấu đã xem khi xong */
  cutscene?: boolean;
  /** Cảnh người dẫn trao Trang Sổ Vàng: lượt cuối có nút "Về chợ" (sang chợ xem cổng mở), "Bỏ qua" ở lại làng; đánh dấu đã xem khi xong */
  golden?: boolean;
}

/**
 * Cảnh làng 3D dùng chung cho 4 làng (spec 03 mục 6, mốc 2 bước 9): khu đi lại bán kính khoảng 20 do gói làng bố trí, 3 biển gỗ (mở màn), người dẫn đứng yên (nói chuyện bằng E thì nhắc
 * việc tiếp theo), Bi, HUD (nhiệm vụ, mũi tên chỉ tới biển cần làm tiếp, Trang Sổ Vàng), menu có "Về chợ", cảnh mở đầu lần đầu vào làng (ảnh truyện và lời người dẫn, bỏ qua được,
 * lưu "đã xem" theo tiến độ). Dùng lại `WalkWorld`, vật cản theo chân thật, 3 bậc model, nạp trước cảnh.
 */
export function VillageScene({ input }: VillageSceneProps) {
  const manifest = useManifest();
  const { settings } = useSettings();
  const { profile } = useAuth();
  const progress = useProgress();
  const { unlock, mode, synced } = progress;
  const navigate = useNavigate();
  const ten = profile?.display_name;
  const text = VILLAGE_SCENE[input.id];
  const layout = useMemo(() => assembleVillage(input), [input]);
  const api = useMemo(() => createWalkApi(input.start.yaw), [input.start.yaw]);
  const forced = useMemo(forcedQuality, []);
  const debugColliders = useMemo(forcedDebug, []);
  const freeCam = useMemo(forcedCam, []);
  const { level } = useQuality(forced);
  const [near, setNear] = useState(-1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  // Thẻ "Em có biết?" của làng (tự hiện lần đầu vào làng, xem lại ở menu) và "Hướng dẫn chơi"
  const [know, setKnow] = useState<{ auto: boolean } | null>(null);
  const [guide, setGuide] = useState<{ section?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [talkAt, setTalkAt] = useState<readonly [number, number, number]>([0, 1.4, 0]);
  const session = useWalkSession(api, dialog !== null || know !== null || guide !== null);
  const dirtUrl = useMemo(() => (manifest ? asset(DIRT_TEXTURE) : null), [manifest]);

  const levelIds = useMemo(() => levelsOfVillage(input.id).map((l) => l.id), [input.id]);
  const stateOf = useCallback((id: number) => unlock.levels.find((u) => u.id === id)?.state, [unlock.levels]);
  const states = useMemo(() => Object.fromEntries(levelIds.map((id) => [id, stateOf(id)])), [levelIds, stateOf]);
  const next = nextLevel(levelIds, stateOf);
  const langName = ui.lang[input.id];

  const labels = useMemo(() => Object.fromEntries(levelIds.map((id) => [id, fmt(levelById(id)?.bien ?? '')])), [levelIds]);
  const icons = useMemo(() => Object.fromEntries(input.boards.map((b) => [b.level, b.icon])), [input.boards]);

  // Dòng nhiệm vụ và đích của mũi tên: biển của việc tiếp theo, hoặc cổng (về chợ) khi cả làng đã xong
  const quest = next !== null ? fmt(ui.langScene.nhiemVuMan, { bien: labels[next] }) : fmt(ui.langScene.nhiemVuXong, { lang: langName });
  const arrowTarget = useMemo(() => {
    const b = next !== null ? input.boards.find((q) => q.level === next) : null;
    return b ? { x: b.x, z: b.z } : { x: input.gate.x, z: input.gate.z };
  }, [next, input.boards, input.gate.x, input.gate.z]);

  // Vật tương tác: biển, người dẫn, cổng, Bi (vị trí Bi do cảnh cập nhật)
  const interactables = useMemo(() => createVillageInteractables(layout), [layout]);
  const targets = useMemo<(VillageTarget | null)[]>(() => interactables.map((i) => parseVillageTarget(i.id)), [interactables]);
  if (import.meta.env.DEV) Object.assign(window, { __villageLayout: layout, __villageInteractables: interactables, __progress: progress, __walkApi: api });

  const labelOf = (t: VillageTarget | null): string | null => {
    if (!t) return null;
    if (t.kind === 'bi') return fmt(ui.cho.nhanNoiChuyen, { nguoi: fmt(CHARACTERS.bi.name) });
    if (t.kind === 'guide') return fmt(ui.cho.nhanNoiChuyen, { nguoi: fmt(CHARACTERS[text?.guide ?? 'bacAn'].name) });
    if (t.kind === 'gate') return ui.langScene.nhanCong;
    const st = stateOf(t.level);
    return fmt(st === 'open' || st === 'done' ? ui.langScene.nhanBien : ui.langScene.nhanBienKhoa, { bien: labels[t.level] });
  };
  const label = near >= 0 ? labelOf(targets[near]) : null;

  const nearRef = useRef(near);
  nearRef.current = near;
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;
  const live = useRef({ targets, states, next, ten, labels });
  live.current = { targets, states, next, ten, labels };

  const bi = useCallback((t: string): VnTurn => ({ speaker: speakerLabel('bi'), portrait: CHARACTERS.bi.portrait, text: t }), []);

  const goMarket = useCallback((opening = false) => {
    api.lock.exit();
    // sau khi nhận Trang Sổ Vàng: về chợ và đứng trước cổng vừa mở để xem hiệu ứng (?mo=); thường: ngay trước cổng làng này (?tu=)
    const path = opening && gateOpenedAfter(input.id) ? `/cho?mo=${input.id}` : `/cho?tu=${input.id}`;
    if (MERGED) navigate(path);
    else window.location.assign(hubPageUrl(URLS, path));
  }, [api, input.id, navigate]);

  const goHub = useCallback(
    (path: string) => {
      // Hồ sơ có ở mọi vỏ làng; các trang khác (truyện, bản đồ, trang chủ) nằm ở hub
      if (MERGED || path === '/ho-so') navigate(path);
      else window.location.assign(hubPageUrl(URLS, path));
    },
    [navigate],
  );

  const interact = useCallback(() => {
    if (dialogRef.current !== null || nearRef.current < 0) return;
    const l = live.current;
    const t = l.targets[nearRef.current];
    if (!t) return;
    if (t.kind === 'gate') {
      goMarket();
      return;
    }
    if (t.kind === 'board') {
      const st = l.states[t.level];
      if (st === 'open' || st === 'done') {
        api.lock.exit();
        navigate(`/lang/${input.id}/man/${t.level}`);
        return;
      }
      const bien = l.labels[t.level];
      if (st === 'coming-soon') {
        setDialog({ turns: [bi(fmt(ui.langScene.bienSapRaMat, { bien, ten: l.ten }))], guideTalking: false });
      } else {
        const by = lockedBy(t.level, unlock.levels);
        const def = by !== undefined ? levelById(by) : undefined;
        setDialog({ turns: [bi(fmt(ui.moKhoa.hoanThanh, { so: by ?? '', man: def ? fmt(def.ten) : '', ten: l.ten }))], guideTalking: false });
      }
    } else if (t.kind === 'guide') {
      const g = text?.guideNext;
      const topic = guideTopic(levelIds, l.next);
      const line = g ? g[topic] : '';
      const portrait = CHARACTERS[text?.guide ?? 'bacAn'].portrait;
      setDialog({ turns: [{ speaker: speakerLabel(text?.guide ?? 'bacAn'), portrait, text: fmt(line, { ten: l.ten }) }], guideTalking: true });
    } else {
      const n = l.next;
      setDialog({ turns: [bi(n !== null ? fmt(ui.langScene.biNhacMan, { lang: langName, bien: l.labels[n], ten: l.ten }) : fmt(ui.langScene.biNhacXong, { lang: langName, ten: l.ten }))], guideTalking: false });
    }
    // chỗ người dẫn quay mặt về: vị trí người chơi lúc mở hộp thoại
    const p = (window as unknown as { __walkPlayer?: { x: number; z: number } }).__walkPlayer;
    if (p) setTalkAt([p.x, 1.4, p.z]);
    api.lock.exit();
  }, [api, bi, goMarket, input.id, langName, levelIds, navigate, text, unlock.levels]);

  const closeDialog = useCallback(() => {
    const d = dialogRef.current;
    setDialog(null);
    if (d?.cutscene) progress.markVillageSceneSeen(input.id);
    if (d?.golden) progress.markGoldenSeen(input.id);
    session.dialogClosed();
  }, [input.id, progress, session]);

  // Cuối cảnh trao trang: ghi cờ rồi sang chợ xem cổng làng kế tiếp mở
  const finishGolden = useCallback(() => {
    setDialog(null);
    progress.markGoldenSeen(input.id);
    goMarket(true);
  }, [goMarket, input.id, progress]);

  // Cảnh mở đầu lần đầu vào làng: sau khi màn hình tải tắt và đã biết chắc cờ "đã xem" (chơi thử, hoặc đã kéo xong tiến độ từ máy chủ)
  const flagKnown = mode === 'guest' || (mode === 'user' && synced);
  const cutDone = useRef(false);
  useEffect(() => {
    if (!ready || !flagKnown || cutDone.current || !text) return;
    cutDone.current = true;
    if (!shouldShowScene(progress.progress.game.data, input.id)) return;
    const frame = STORY.find((s) => s.n === text.storyFrame);
    const turns: VnTurn[] = [];
    if (frame) turns.push({ image: frame.image, background: frame.image, text: fmt(frame.text, { ten }) });
    turns.push({ speaker: speakerLabel(text.guide), portrait: CHARACTERS[text.guide].portrait, text: fmt(text.opening, { ten }) });
    setDialog({ turns, guideTalking: false, cutscene: true });
    api.lock.exit();
  }, [ready, flagKnown, text, progress.progress.game.data, input.id, ten, api]);

  // Thẻ "Em có biết?" của làng: lần đầu vào làng, ngay sau cảnh mở đầu (ảnh truyện, lời người dẫn), mỗi lần một thẻ "n/tổng", thẻ cuối có nút "Vào làng". Chiếu một lần, lưu theo tiến độ.
  // Chờ xong cảnh mở đầu; cảnh trao Trang Sổ Vàng (nếu có) chờ tiếp tới khi đóng thẻ.
  const knowChecked = useRef(false);
  const knowOn = useRef(false);
  const knowCards = useMemo(() => villageKnowCards(input.id), [input.id]);
  useEffect(() => {
    if (!ready || !flagKnown || knowChecked.current || !text || dialog !== null) return;
    if (shouldShowScene(progress.progress.game.data, input.id)) return;
    knowChecked.current = true;
    if (knowCards.length === 0 || !shouldShowKnow(progress.progress.game.data, input.id)) return;
    knowOn.current = true;
    progress.markKnowSeen(input.id);
    api.lock.exit();
    setKnow({ auto: true });
  }, [ready, flagKnown, text, dialog, progress, input.id, knowCards, api]);
  const closeKnow = useCallback(() => {
    knowOn.current = false;
    setKnow(null);
    session.dialogClosed();
  }, [session]);
  const openKnow = useCallback(() => {
    api.lock.exit();
    setKnow({ auto: false });
  }, [api]);
  const openGuide = useCallback(() => {
    api.lock.exit();
    setGuide({});
  }, [api]);
  const closeGuide = useCallback(() => {
    setGuide(null);
    session.dialogClosed();
  }, [session]);

  // Cảnh trao Trang Sổ Vàng: về làng sau khi nhận trang (xong màn ready cuối của làng), chiếu một lần, sau cảnh mở đầu nếu đó cũng là lần đầu. Bỏ qua được.
  const [glow, setGlow] = useState<number | undefined>(undefined);
  const goldenDone = useRef(false);
  const isTeacher = canSeeTeacherPage(profile?.role);
  useEffect(() => {
    if (!ready || !flagKnown || goldenDone.current || !text || dialog !== null || know !== null || knowOn.current || isTeacher) return;
    if (shouldShowScene(progress.progress.game.data, input.id)) return;
    goldenDone.current = true;
    const pages = progress.progress.game.goldenPages;
    if (!shouldShowGolden(progress.progress.game.data, input.id, pages)) return;
    const index = VILLAGE_ORDER.indexOf(input.id);
    const portrait = CHARACTERS[text.guide].portrait;
    const turns: VnTurn[] = text.award.loi.map((line, i) => ({
      speaker: speakerLabel(text.guide),
      portrait,
      mood: 'vui' as const,
      text: fmt(line, { ten }),
      extra: i === 0 ? <GoldenPagesRow arriving={index} reducedMotion={settings.reducedMotion} /> : undefined,
    }));
    setGlow(index);
    setDialog({ turns, guideTalking: true, golden: true });
    api.lock.exit();
  }, [ready, flagKnown, text, dialog, know, isTeacher, progress.progress.game.data, progress.progress.game.goldenPages, input.id, ten, settings.reducedMotion, api]);

  useEffect(() => {
    document.title = langName;
  }, [langName]);

  const onNearest = useCallback((i: number) => setNear(i), []);
  const start: readonly [number, number] = [input.start.x, input.start.z];
  const camPos: [number, number, number] = [input.start.x - Math.sin(input.start.yaw) * 7, 4, input.start.z - Math.cos(input.start.yaw) * 7];

  return (
    <div className="fixed inset-0 bg-giay">
      <WalkControls
        api={api}
        paused={session.paused}
        lockMode={session.lockMode}
        mouseSensitivity={settings.mouseSensitivity}
        onLockChange={session.onLockChange}
        onLockError={session.onLockError}
        interactLabel={label}
        onInteract={interact}
        onMenu={session.toggleMenu}
        className="size-full"
      >
        <Scene3D
          errorCovers
          quality={forced}
          camera={{ position: camPos, fov: 50 }}
          lookAt={[input.start.x, 1.3, input.start.z]}
          fog={freeCam ? false : FOG}
          sunPosition={[26, 46, 18]}
          shadowFollowPlayer
          onReady={() => setReady(true)}
        >
          <VillageWorld
            layout={layout}
            api={api}
            paused={session.paused}
            level={level}
            dirtUrl={dirtUrl}
            interactables={interactables}
            onNearestChange={onNearest}
            start={start}
            startYaw={input.start.yaw}
            boards={{ labels, icons, states }}
            arrowTarget={arrowTarget}
            guideTalking={dialog?.guideTalking ?? false}
            talkAt={talkAt}
            animate={!settings.reducedMotion}
            debugColliders={debugColliders}
            freeCamera={!!freeCam}
          />
        </Scene3D>

        <MarketHud quest={quest} pages={unlock.goldenPages} glow={glow} onMenu={session.openMenu} onGuide={openGuide} />

        {label && !session.paused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 hidden justify-center [@media(pointer:fine)]:flex">
            <span className="rounded-nut bg-black/70 px-4 py-2 font-display text-lg font-extrabold text-white" role="status">
              {fmt(ui.dungDi.nhacTuongTac, { vat: label })}
            </span>
          </div>
        )}
        {session.lockMode && session.locked && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-black/40" />}
      </WalkControls>

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3">
          <div className="flex w-full max-w-[960px] justify-center">
            <VnDialog
              turns={dialog.turns}
              onFinish={dialog.golden ? finishGolden : closeDialog}
              onSkip={dialog.cutscene || dialog.golden ? closeDialog : undefined}
              finishLabel={dialog.golden && gateOpenedAfter(input.id) ? ui.langScene.traoVeCho : undefined}
              label={langName}
            />
          </div>
        </div>
      )}

      {know && <EmCoBietDialog cards={knowCards} onClose={closeKnow} finishLabel={know.auto ? ui.baiHoc.vaoLang : undefined} />}
      {guide && <GuideDialog section={guide.section} onClose={closeGuide} />}

      <WalkLockOverlay session={session} hideMenu />
      <MarketMenu
        session={session}
        onGo={goHub}
        onGuide={openGuide}
        extraItems={[
          ...(knowCards.length > 0 ? [{ label: ui.baiHoc.emCoBiet, onClick: openKnow }] : []),
          { label: ui.cho.menu.veCho, onClick: () => goMarket() },
        ]}
      />
    </div>
  );
}

interface VillageWorldProps {
  layout: ReturnType<typeof assembleVillage>;
  api: ReturnType<typeof createWalkApi>;
  paused: boolean;
  level: ReturnType<typeof useQuality>['level'];
  dirtUrl: string | null;
  interactables: ReturnType<typeof createVillageInteractables>;
  onNearestChange: (i: number) => void;
  start: readonly [number, number];
  startYaw: number;
  boards: { labels: Record<number, string>; icons: Record<number, string>; states: Record<number, import('../../progress/unlock').LevelState | undefined> };
  arrowTarget: { x: number; z: number };
  guideTalking: boolean;
  talkAt: readonly [number, number, number];
  animate: boolean;
  debugColliders: boolean;
  freeCamera: boolean;
}

/** Phần bên trong khung 3D: mặt đất, đồ vật nhân bản, đồ nhỏ, biển gỗ, người dẫn, mũi tên, nạp trước. */
function VillageWorld({ layout, api, paused, level, dirtUrl, interactables, onNearestChange, start, startYaw, boards, arrowTarget, guideTalking, talkAt, animate, debugColliders, freeCamera }: VillageWorldProps) {
  const byModel = useMemo(() => layout.models.map((id) => ({ id, items: id === layout.gate.model ? [{ model: id, x: layout.gate.x, z: layout.gate.z, yaw: layout.gate.yaw, scale: 1, tint: [1, 1, 1] as const }] : layout.placements.filter((p) => p.model === id) })), [layout]);
  const guide = layout.guide;
  return (
    <WalkWorld
      api={api}
      paused={paused}
      obstacles={layout.obstacles}
      boundsRadius={layout.radius}
      interactables={interactables}
      biTrack={interactables[villageBiSlot(layout)]}
      cameraBlockers={layout.blockers}
      onNearestChange={onNearestChange}
      groundUrl={null}
      showGround={false}
      start={start}
      startYaw={startYaw}
      freeCamera={freeCamera}
    >
      {freeCamera && <FreeCamera />}
      <VillageTerrain layout={layout} dirtUrl={dirtUrl} />
      {byModel.map(({ id, items }) => (items.length > 0 ? <ModelInstances key={id} id={id} items={items} level={level} /> : null))}
      <MarketProps layout={layout} />
      <VillageBoards boards={layout.boards} labels={boards.labels} icons={boards.icons} states={boards.states} />
      <Character
        id={`characters/${CHARACTERS[guide.character].portrait}`}
        position={[guide.x, 0, guide.z]}
        rotation={[0, guide.yaw, 0]}
        mood={guideTalking ? 'talking' : 'idle'}
        lookAt={guideTalking ? talkAt : undefined}
        seed={7}
      />
      <GuideArrow target={arrowTarget} animate={animate} />
      {debugColliders && <ColliderDebug colliders={layout.colliders} dynamic={[]} />}
      <StatsProbe />
      <SceneWarmup key={level} />
    </WalkWorld>
  );
}
