import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { asset, useManifest } from '../../assets/store';
import { useAuth } from '../../auth/AuthProvider';
import { canSeeTeacherPage } from '../../auth/roles';
import { CHARACTERS, fmt, speakerLabel } from '../../content/characters';
import { BI_NHAC_LAI, BI_NHAC_NHIEM, MARKET_TALKERS, NHIEM_VU } from '../../content/dialogues';
import { GUIDE_FIRST_SECTION } from '../../content/huongDan';
import { VILLAGE_ORDER, levelById, levelsOfVillage } from '../../content/levels';
import { STORY } from '../../content/story';
import { ui } from '../../content/ui';
import { VILLAGE_SCENE } from '../../content/villageScene';
import { villageKnowCards } from '../../content/villageCards';
import { knowScrollUi } from '../../content/knowScrolls';
import { banDoNho } from '../../content/minimap';
import { MERGED, URLS, levelUrl } from '../../config/urls';
import { shouldAutoOpenGuide } from '../../progress/guideFlags';
import { countKnowCards, effectiveKnowMask } from '../../progress/knowCards';
import { useProgress } from '../../progress/ProgressProvider';
import type { LevelState } from '../../progress/unlock';
import { hasSeenKnow, pendingGateOpening, shouldShowGolden, shouldShowKnow, shouldShowScene } from '../../progress/villageIntro';
import { useSettings } from '../../settings/SettingsProvider';
import { EmCoBietDialog } from '../../ui/EmCoBietDialog';
import { KnowCollectionDialog } from '../../ui/KnowCollectionDialog';
import { GuideDialog } from '../../ui/GuideDialog';
import { VnDialog, type VnTurn } from '../../ui/VnDialog';
import type { VillageId } from '../../village';
import { Scene3D } from '../Scene3D';
import { WalkControls } from '../WalkControls';
import { WalkLockOverlay } from '../WalkLockOverlay';
import { isQualityChoice, type QualityChoice } from '../quality';
import { useQuality } from '../useQuality';
import { useWalkSession } from '../useWalkSession';
import { createWalkApi } from '../walkApi';
import { MarketHud } from '../cho/MarketHud';
import { MarketMenu } from '../cho/MarketMenu';
import { GATE_VILLAGE, gateOpenedAfter, gateStates, previousVillage, questGate, questIndex } from '../cho/marketQuest';
import { densityFor, type GateId } from '../cho/marketLayout';
import { GoldenPagesRow } from '../village/GoldenPagesRow';
import { guideTopic, lockedBy, nextLevel } from '../village/villageQuest';
import { BigMap } from './map/BigMap';
import { MiniMap } from './map/MiniMap';
import { buildMapGeometry } from './map/mapGeometry';
import { mapMarkers } from './map/mapMarkers';
import { miniMapSize } from './map/mapProjection';
import { villageProgress } from './map/mapProgress';
import { WorldScene } from './WorldScene';
import type { LoadedZones } from './WorldTracker';
import { assembleWorld, gateApproachSpawn, villageSpawn } from './worldLayout';
import { effectivePages, lastGiver, targetNodeId } from './worldQuest';
import { composeTargets, createWorldBase, createZoneTargets, parseWorldTarget, withoutCollectedScrolls, type WorldTarget } from './worldTargets';
import { PROBE } from '../../lib/dev';

const DIRT_TEXTURE = 'ui/textures/duong-dat';
const BRICK_TEXTURE = 'ui/textures/san-gach';
/** Sương: trong vùng đi lại gần như không có, ngoài ruộng thì nhạt dần vào chân trời (làng ở xa 70 đến 130 vẫn thấy rõ). */
const FOG: [number, number] = [90, 300];
const NONE_LOADED: LoadedZones = { 'lang-giay': false, 'lang-det': false, 'lang-khac-dau': false, 'lang-bac': false };

/** Mức chất lượng ép bằng ?q=low|medium|high (để kiểm tra hiệu năng); không có thì theo Cài đặt. */
function forcedQuality(): QualityChoice | undefined {
  if (typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search).get('q');
  return isQualityChoice(q) ? q : undefined;
}

/** Góc nhìn cố định ép bằng ?cam=top|oblique|free (chụp ảnh toàn cảnh, kiểm tra); không có thì camera bám theo người chơi. */
function forcedOverview(): 'top' | 'oblique' | 'free' | undefined {
  if (typeof location === 'undefined') return undefined;
  const c = new URLSearchParams(location.search).get('cam');
  return c === 'top' || c === 'oblique' || c === 'free' ? c : undefined;
}

/** `?debug=colliders`: vẽ khung xem vùng va chạm (chỉ để kiểm tra bằng mắt). */
function forcedDebugColliders(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === 'colliders';
}

/**
 * Chỗ xuất hiện theo địa chỉ: `?tu=<làng>` (từ bài học về làng, và nút "Về làng" cuối màn): trong làng đó cạnh các biển gỗ; `?mo=<làng>`: cách cổng làng kế tiếp 8,5 đơn vị, nhìn thẳng vào cổng
 * (chỉ để kiểm tra hiệu ứng mở cổng); không có thì chỗ mặc định ở chợ.
 */
function forcedSpawn(world: ReturnType<typeof assembleWorld>) {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search);
  const mo = VILLAGE_ORDER.find((v) => v === q.get('mo'));
  const gate = mo ? gateOpenedAfter(mo) : null;
  if (gate) return gateApproachSpawn(world, gate);
  return villageSpawn(world, q.get('tu'));
}

/** Hội thoại đang mở. */
interface DialogState {
  turns: VnTurn[];
  /** Dân làng đang được nói chuyện (đứng yên quay mặt về người chơi) */
  villager: number | null;
  /** Làng mà cảnh mở đầu / cảnh trao trang thuộc về, và người dẫn đang nói chuyện */
  village?: VillageId;
  guideTalking?: boolean;
  /** Cảnh mở đầu: có "Bỏ qua" và đánh dấu đã xem khi xong */
  cutscene?: boolean;
  /** Cảnh người dẫn trao Trang Sổ Vàng: có "Bỏ qua", đánh dấu đã xem khi xong */
  golden?: boolean;
}

type Seq = 'idle' | 'wait' | 'fall' | 'talk' | 'done';

/**
 * Trang thế giới mở `/cho` (mốc 2, bước W1): chợ ở giữa và 4 làng trong MỘT cảnh 3D. HUD (nhiệm vụ, 4 ô Trang Sổ Vàng, nút ? hướng dẫn, nút menu), mũi tên dưới chân chỉ theo đường, cổng làng
 * mở/khóa theo tiến độ (giáo viên mở hết), Bi và dân làng nói chuyện, biển gỗ vào màn (sang tên miền của làng), người dẫn nhắc việc, và các cảnh theo tiến độ: cảnh mở đầu làng, "Em có biết?",
 * trao Trang Sổ Vàng (khi bước qua cổng làng lần đầu), hiệu ứng mở cổng (khi tới gần cổng làng kế tiếp lần đầu sau khi nhận trang). Mỗi cảnh chỉ chiếu một lần, lưu theo tiến độ.
 */
export function WorldPage() {
  const manifest = useManifest();
  const { settings } = useSettings();
  const { profile } = useAuth();
  const progress = useProgress();
  const { unlock, mode, synced } = progress;
  const navigate = useNavigate();
  const ten = profile?.display_name;
  const isTeacher = canSeeTeacherPage(profile?.role);
  const forced = useMemo(forcedQuality, []);
  const overview = useMemo(forcedOverview, []);
  const debugColliders = useMemo(forcedDebugColliders, []);
  const { level } = useQuality(forced);
  const world = useMemo(() => assembleWorld(densityFor(level)), [level]);
  const spawn = useMemo(() => forcedSpawn(world), []); // eslint-disable-line react-hooks/exhaustive-deps
  const api = useMemo(() => createWalkApi(spawn?.yaw ?? 0), [spawn]);
  const camStart = spawn ?? { x: 0, z: -10, yaw: 0 };

  const [near, setNear] = useState(-1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [know, setKnow] = useState<{ village: VillageId; auto: boolean; /** thẻ nhặt được (chỉ số), đọc xong thì cất vào sổ */ scroll?: number } | null>(null);
  const [collection, setCollection] = useState<VillageId | null>(null);
  const [scrollIdx, setScrollIdx] = useState(-1);
  const [toast, setToast] = useState<string | null>(null);
  const [guide, setGuide] = useState<{ section?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState<LoadedZones>(NONE_LOADED);
  const [zoneReady, setZoneReady] = useState<ReadonlySet<VillageId>>(new Set());
  const [inside, setInside] = useState<VillageId | null>(null);
  const [nearGate, setNearGate] = useState<GateId | null>(null);
  const [talkAt, setTalkAt] = useState<readonly [number, number, number]>([0, 1.4, 0]);
  const [glow, setGlow] = useState<number | undefined>(undefined);
  const [seq, setSeq] = useState<Seq>('idle');
  const [giver, setGiver] = useState<VillageId | null>(null);
  const seqRef = useRef<Seq>('idle');
  seqRef.current = seq;
  const giverRef = useRef(giver);
  giverRef.current = giver;
  const entering = inside !== null && !zoneReady.has(inside);
  const [bigMap, setBigMap] = useState(false);
  const [mapPlayer, setMapPlayer] = useState<{ x: number; z: number; yaw: number } | null>(null);
  const session = useWalkSession(api, dialog !== null || know !== null || collection !== null || guide !== null || entering || bigMap);
  const dirtUrl = useMemo(() => (manifest ? asset(DIRT_TEXTURE) : null), [manifest]);
  const brickUrl = useMemo(() => (manifest ? asset(BRICK_TEXTURE) : null), [manifest]);
  if (PROBE) Object.assign(window, { __walkApi: api, __progress: progress, __worldInside: inside, __worldSeq: seq });

  // ---- tiến độ: cổng, trang, nhiệm vụ
  const data = progress.progress.game.data;
  const pages = unlock.goldenPages;
  const flagKnown = mode === 'guest' || (mode === 'user' && synced);
  const giverVillage = lastGiver(pages);
  // Cảnh trao trang của làng vừa trao trang cuối chưa chiếu: nhiệm vụ và mũi tên chưa tính trang mới (đổi ngay sau cảnh trao trang)
  // (chỉ làng đã có cảnh trao trang, xem VILLAGE_SCENE: làng chưa dựng thì trang đã được trao ở bài học nên không có gì để chờ)
  const ceremonyPending = !isTeacher && giverVillage !== null && VILLAGE_SCENE[giverVillage] !== undefined && shouldShowGolden(data, giverVillage, pages);
  const effPages = effectivePages(pages, ceremonyPending);
  // Hiệu ứng mở cổng còn chờ (cổng của làng kế tiếp vẫn đóng cho tới khi chiếu xong)
  const openingGiver = isTeacher ? null : pendingGateOpening(data, pages);
  const openingGate = openingGiver ? gateOpenedAfter(openingGiver) : null;
  const gateOpenBase = useMemo(() => gateStates(unlock.villageOpen, isTeacher), [unlock.villageOpen, isTeacher]);
  const seqActive = seq === 'wait' || seq === 'fall' || seq === 'talk';
  const gateOpen = useMemo(() => (openingGate ? { ...gateOpenBase, [openingGate]: false } : gateOpenBase), [gateOpenBase, openingGate]);
  const fallingGate = seq === 'fall' ? openingGate : null;

  const stateOf = useCallback((id: number) => unlock.levels.find((u) => u.id === id)?.state, [unlock.levels]);
  // ---- thẻ "Em có biết?" rải trong làng (bước X3): mặt nạ hiệu lực theo làng (đã nhặt, hoặc coi như đủ nếu đã xong màn 1 hay đã xem hộp cũ), số thẻ cần nhặt và việc có chặn biển hay không
  const scrollTotals = useMemo(() => Object.fromEntries(world.villages.map((v) => [v.id, v.layout.scrolls?.length ?? 0])) as Record<VillageId, number>, [world.villages]);
  const knowMasks = useMemo(
    () =>
      Object.fromEntries(
        VILLAGE_ORDER.map((id) => {
          const first = levelsOfVillage(id)[0]?.id;
          return [id, effectiveKnowMask({ data, village: id, total: scrollTotals[id], lessonDone: first !== undefined && stateOf(first) === 'done', seenOld: hasSeenKnow(data, id) })];
        }),
      ) as Record<VillageId, number>,
    [data, scrollTotals, stateOf],
  );
  const knowGot = (id: VillageId): number => countKnowCards(knowMasks[id], scrollTotals[id]);
  /** Làng còn thẻ phải nhặt trước khi vào màn (giáo viên không bị chặn) */
  const knowGated = (id: VillageId): boolean => !isTeacher && scrollTotals[id] > 0 && knowGot(id) < scrollTotals[id];
  const levelStates = useMemo(
    () =>
      Object.fromEntries(
        unlock.levels.map((u) => {
          const gated = u.state === 'open' && !isTeacher && VILLAGE_ORDER.some((id) => scrollTotals[id] > 0 && knowGot(id) < scrollTotals[id] && levelsOfVillage(id).some((l) => l.id === u.id));
          return [u.id, gated ? 'locked' : u.state];
        }),
      ) as Record<number, LevelState | undefined>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unlock.levels, isTeacher, scrollTotals, knowMasks],
  );
  const insideGated = inside !== null && knowGated(inside);
  const insideLevelIds = useMemo(() => (inside ? levelsOfVillage(inside).map((l) => l.id) : []), [inside]);
  const nextBoard = inside ? nextLevel(insideLevelIds, stateOf) : null;
  const insideName = inside ? ui.lang[inside] : '';
  const qPages = seqActive ? Math.max(0, effPages - 1) : effPages;
  const questText = useMemo(() => {
    if (inside && insideGated) return fmt(knowScrollUi.nhiemVu, { n: knowGot(inside), tong: scrollTotals[inside] });
    if (inside && nextBoard !== null) return fmt(ui.langScene.nhiemVuMan, { bien: fmt(levelById(nextBoard)?.bien ?? '') });
    if (inside && ceremonyPending) return fmt(ui.langScene.nhiemVuXong, { lang: insideName });
    return fmt(NHIEM_VU[questIndex(qPages)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inside, insideGated, knowMasks, scrollTotals, nextBoard, ceremonyPending, insideName, qPages]);
  // làng của nhiệm vụ: đang ở trong làng nào thì làng đó, không thì làng có cổng của nhiệm vụ theo số Trang Sổ Vàng
  const questG = questGate(effPages);
  const missionVillage: VillageId | null = inside ?? (questG ? GATE_VILLAGE[questG] : null);
  const arrowTarget = seqActive ? null : targetNodeId({ inVillage: inside, nextBoard, pages: effPages, scroll: insideGated ? scrollIdx : null });

  // ---- bản đồ nhỏ và bản đồ lớn (bước X4): vẽ 2D từ bố cục có sẵn; ký hiệu và tiến độ tính bằng hàm thuần ở ./map
  const mapGeo = useMemo(() => buildMapGeometry(world), [world]);
  const mapNames = useMemo(() => Object.fromEntries(VILLAGE_ORDER.map((id) => [id, ui.lang[id]])) as Record<VillageId, string>, []);
  const miniNames = banDoNho.tenNgan as Record<VillageId, string>;
  const touch = useMemo(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches, []);
  const targetPoint = useMemo(() => {
    const n = arrowTarget ? world.graph.nodes.find((q) => q.id === arrowTarget) : undefined;
    return n ? { x: n.x, z: n.z } : null;
  }, [arrowTarget, world.graph]);
  const markerInput = useMemo(() => ({ villages: world.villages, gateOpen, levelStates, inside, knowMasks, target: targetPoint }), [world.villages, gateOpen, levelStates, inside, knowMasks, targetPoint]);
  const miniMarkers = useMemo(() => mapMarkers(markerInput, 'mini'), [markerInput]);
  const bigMarkers = useMemo(() => (bigMap ? mapMarkers(markerInput, 'big') : []), [bigMap, markerInput]);
  const mapProgress = useMemo(() => villageProgress({ levelStates, knowMasks, scrollTotals, goldenPages: pages }), [levelStates, knowMasks, scrollTotals, pages]);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const mapLive = useRef({ bigMap, blocked: false });
  mapLive.current = { bigMap, blocked: dialog !== null || know !== null || collection !== null || guide !== null || entering || seqActive || !ready || session.menuOpen };
  const openMap = useCallback(() => {
    const p = api.player;
    setMapPlayer(p ? { x: p.x, z: p.z, yaw: api.camera.yaw } : null);
    api.lock.exit(); // nhả khóa chuột để bấm được bản đồ; điều khiển tạm dừng vì `bigMap` tính như một hộp thoại đang mở
    setBigMap(true);
  }, [api]);
  const closeMap = useCallback(() => {
    setBigMap(false);
    sessionRef.current.dialogClosed(); // đóng bằng phím M hay cú bấm thì khóa chuột lại ngay (Esc không cho khóa lại: hiện lời nhắc như các hộp thoại khác)
  }, []);
  const toggleMap = useCallback(() => {
    if (mapLive.current.bigMap) closeMap();
    else if (!mapLive.current.blocked) openMap();
  }, [openMap, closeMap]);

  // ---- vật tương tác
  const base = useMemo(() => createWorldBase(world.villages), [world.villages]);
  const zoneTargets = useMemo(() => Object.fromEntries(world.villages.map((v) => [v.id, createZoneTargets(v)])) as Record<VillageId, ReturnType<typeof createZoneTargets>>, [world.villages]);
  const interactables = useMemo(() => {
    const closed = new Set(world.gates.filter((g) => !gateOpen[g.id]).map((g) => g.id));
    return composeTargets(
      base,
      VILLAGE_ORDER.filter((id) => loaded[id]).map((id) => withoutCollectedScrolls(zoneTargets[id], knowMasks[id])),
      closed,
    );
  }, [base, zoneTargets, loaded, gateOpen, world.gates, knowMasks]);
  if (PROBE) Object.assign(window, { __worldInteractables: interactables });
  const targets = useMemo<(WorldTarget | null)[]>(() => interactables.map((i) => parseWorldTarget(i.id)), [interactables]);

  const labelOf = (t: WorldTarget | null): string | null => {
    if (!t) return null;
    if (t.kind === 'bi') return fmt(ui.cho.nhanNoiChuyen, { nguoi: fmt(CHARACTERS.bi.name) });
    if (t.kind === 'villager') return fmt(ui.cho.nhanNoiChuyen, { nguoi: fmt(CHARACTERS[MARKET_TALKERS[t.index].speaker].name) });
    if (t.kind === 'gate') return fmt(ui.cho.nhanCongDong, { lang: ui.lang[GATE_VILLAGE[t.gate]] });
    if (t.kind === 'guide') return fmt(ui.cho.nhanNoiChuyen, { nguoi: fmt(CHARACTERS[VILLAGE_SCENE[t.village]?.guide ?? 'bacAn'].name) });
    if (t.kind === 'scroll') return knowScrollUi.nhanThe;
    const st = stateOf(t.level);
    return fmt((st === 'open' || st === 'done') && !knowGated(t.village) ? ui.langScene.nhanBien : ui.langScene.nhanBienKhoa, { bien: fmt(levelById(t.level)?.bien ?? '') });
  };
  const label = near >= 0 ? labelOf(targets[near] ?? null) : null;

  const nearRef = useRef(near);
  nearRef.current = near;
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;
  const live = useRef({ gateOpen, pages: effPages, ten, targets, inside, nextBoard, gated: insideGated, got: 0, total: 0, scrollIdx, knowMasks, scrollsOf: (id: VillageId) => world.villages.find((v) => v.id === id)?.layout.scrolls ?? [], knowGated });
  live.current = { gateOpen, pages: effPages, ten, targets, inside, nextBoard, gated: insideGated, got: inside ? knowGot(inside) : 0, total: inside ? scrollTotals[inside] : 0, scrollIdx, knowMasks, scrollsOf: (id: VillageId) => world.villages.find((v) => v.id === id)?.layout.scrolls ?? [], knowGated };

  const biTurn = useCallback((text: string): VnTurn => ({ speaker: speakerLabel('bi'), portrait: CHARACTERS.bi.portrait, text }), []);

  const interact = useCallback(() => {
    if (dialogRef.current !== null || nearRef.current < 0) return;
    const l = live.current;
    const t = l.targets[nearRef.current];
    if (!t) return;
    if (t.kind === 'gate') {
      const before = previousVillage(t.gate);
      setDialog({ turns: [biTurn(fmt(ui.cho.congDong, { truoc: before ? ui.lang[before] : '', ten: l.ten }))], villager: null });
    } else if (t.kind === 'villager') {
      const talker = MARKET_TALKERS[t.index];
      const portrait = CHARACTERS[talker.speaker].portrait;
      setDialog({ turns: talker.lines.map((line) => ({ speaker: speakerLabel(talker.speaker), portrait, text: fmt(line, { ten: l.ten }) })), villager: t.index });
    } else if (t.kind === 'scroll') {
      setKnow({ village: t.village, auto: false, scroll: t.index });
    } else if (t.kind === 'board' && (stateOf(t.level) === 'open' || stateOf(t.level) === 'done') && l.knowGated(t.village)) {
      // chưa đủ thẻ "Em có biết?" của làng: biển gỗ báo, chưa vào được màn (giáo viên không bị chặn)
      setDialog({ turns: [{ speaker: knowScrollUi.bienNguoiNoi, text: fmt(knowScrollUi.bienBao, { n: l.got, tong: l.total }) }], villager: null });
    } else if (t.kind === 'board') {
      const st = stateOf(t.level);
      if (st === 'open' || st === 'done') {
        // vào màn: sang tên miền của làng (bài học và game); gộp web thì đường dẫn nội bộ
        api.lock.exit();
        if (MERGED) navigate(`/lang/${t.village}/man/${t.level}`);
        else window.location.assign(levelUrl(URLS, t.village, t.level));
        return;
      }
      const bien = fmt(levelById(t.level)?.bien ?? '');
      if (st === 'coming-soon') setDialog({ turns: [biTurn(fmt(ui.langScene.bienSapRaMat, { bien, ten: l.ten }))], villager: null });
      else {
        const by = lockedBy(t.level, unlock.levels);
        const def = by !== undefined ? levelById(by) : undefined;
        setDialog({ turns: [biTurn(fmt(ui.moKhoa.hoanThanh, { so: by ?? '', man: def ? fmt(def.ten) : '', ten: l.ten }))], villager: null });
      }
    } else if (t.kind === 'guide') {
      const text = VILLAGE_SCENE[t.village];
      const ids = levelsOfVillage(t.village).map((x) => x.id);
      const line = text ? text.guideNext[guideTopic(ids, nextLevel(ids, stateOf))] : '';
      const portrait = CHARACTERS[text?.guide ?? 'bacAn'].portrait;
      setDialog({ turns: [{ speaker: speakerLabel(text?.guide ?? 'bacAn'), portrait, text: fmt(line, { ten: l.ten }) }], villager: null, village: t.village, guideTalking: true });
    } else {
      const k = questIndex(l.pages);
      if (l.inside && l.gated) {
        // Bi gợi ý khu có thẻ "Em có biết?" gần nhất chưa nhặt (không chỉ đúng chỗ)
        const sc = l.scrollsOf(l.inside).find((q) => q.index === l.scrollIdx);
        const khu = sc ? ((knowScrollUi.khu as Record<string, string>)[sc.zone] ?? sc.zone) : '';
        setDialog({ turns: [biTurn(fmt(knowScrollUi.biGoiY, { con: l.total - l.got, khu, ten: l.ten }))], villager: null });
      } else if (l.inside) {
        const n = l.nextBoard;
        const lang = ui.lang[l.inside];
        setDialog({ turns: [biTurn(n !== null ? fmt(ui.langScene.biNhacMan, { lang, bien: fmt(levelById(n)?.bien ?? ''), ten: l.ten }) : fmt(ui.langScene.biNhacXong, { lang, ten: l.ten }))], villager: null });
      } else setDialog({ turns: [biTurn(fmt(BI_NHAC_NHIEM[k], { ten: l.ten })), biTurn(fmt(BI_NHAC_LAI, { ten: l.ten, nd: fmt(NHIEM_VU[k]) }))], villager: null });
    }
    // chỗ người dẫn quay mặt về: vị trí người chơi lúc mở hộp thoại
    const p = (window as unknown as { __walkPlayer?: { x: number; z: number } }).__walkPlayer;
    if (p) setTalkAt([p.x, 1.4, p.z]);
    api.lock.exit(); // nhả khóa để bấm được hộp thoại
  }, [api, navigate, biTurn, stateOf, unlock.levels]);

  const closeDialog = useCallback(() => {
    const d = dialogRef.current;
    setDialog(null);
    if (d?.cutscene && d.village) progress.markVillageSceneSeen(d.village);
    if (d?.golden && d.village) progress.markGoldenSeen(d.village);
    if (seqRef.current === 'talk') {
      // Bi nói xong: ghi cờ "đã chiếu" và hiện nhiệm vụ mới
      if (giverRef.current) progress.markGateOpenSeen(giverRef.current);
      setSeq('done');
    }
    session.dialogClosed(); // đóng bằng cú bấm thì khóa lại ngay trong chính sự kiện bấm đó
  }, [session, progress]);

  // ---- cảnh theo tiến độ khi bước qua cổng vào làng: mở đầu → Em có biết? → trao Trang Sổ Vàng (mỗi bước chỉ chiếu một lần, cờ lưu theo tiến độ; xong bước nào thì bước sau tự chạy)
  useEffect(() => {
    if (!inside || !ready || !flagKnown || dialog !== null || know !== null || guide !== null || seqActive) return;
    const text = VILLAGE_SCENE[inside];
    if (!text) return;
    const cards = villageKnowCards(inside);
    if (shouldShowScene(data, inside)) {
      const frame = STORY.find((s) => s.n === text.storyFrame);
      const turns: VnTurn[] = [];
      if (frame) turns.push({ image: frame.image, background: frame.image, text: fmt(frame.text, { ten }) });
      turns.push({ speaker: speakerLabel(text.guide), portrait: CHARACTERS[text.guide].portrait, text: fmt(text.opening, { ten }) });
      setDialog({ turns, villager: null, village: inside, guideTalking: false, cutscene: true });
      api.lock.exit();
      return;
    }
    if (cards.length > 0 && scrollTotals[inside] === 0 && shouldShowKnow(data, inside)) {
      progress.markKnowSeen(inside);
      setKnow({ village: inside, auto: true });
      api.lock.exit();
      return;
    }
    if (!isTeacher && shouldShowGolden(data, inside, pages)) {
      const index = VILLAGE_ORDER.indexOf(inside);
      const portrait = CHARACTERS[text.guide].portrait;
      const turns: VnTurn[] = text.award.loi.map((line, i) => ({
        speaker: speakerLabel(text.guide),
        portrait,
        mood: 'vui' as const,
        text: fmt(line, { ten }),
        extra: i === 0 ? <GoldenPagesRow arriving={index} reducedMotion={settings.reducedMotion} /> : undefined,
      }));
      setGlow(index);
      setDialog({ turns, villager: null, village: inside, guideTalking: true, golden: true });
      api.lock.exit();
    }
  }, [inside, ready, flagKnown, dialog, know, guide, seqActive, data, pages, isTeacher, ten, settings.reducedMotion, progress, api, scrollTotals]);

  // ---- hiệu ứng mở cổng: tới gần cổng làng kế tiếp lần đầu sau khi nhận trang (và đã xem cảnh trao trang): chờ → then gỗ và dây đỏ rơi → Bi nói → nhiệm vụ mới
  useEffect(() => {
    if (!ready || !flagKnown || isTeacher || seq !== 'idle' || dialog !== null || know !== null || guide !== null || ceremonyPending) return;
    if (!openingGiver || !openingGate || nearGate !== openingGate) return;
    setGiver(openingGiver);
    setSeq('wait');
  }, [ready, flagKnown, isTeacher, seq, dialog, know, guide, ceremonyPending, openingGiver, openingGate, nearGate]);
  useEffect(() => {
    if (seq !== 'wait') return;
    const t = setTimeout(() => setSeq('fall'), 900);
    return () => clearTimeout(t);
  }, [seq]);
  const onGateFallen = useCallback(() => {
    if (seqRef.current !== 'fall') return;
    setSeq('talk');
    const k = questIndex(live.current.pages);
    setDialog({ turns: [biTurn(fmt(BI_NHAC_NHIEM[k], { ten: live.current.ten })), biTurn(fmt(BI_NHAC_LAI, { ten: live.current.ten, nd: fmt(NHIEM_VU[k]) }))], villager: null });
    api.lock.exit();
  }, [biTurn, api]);

  // ---- Em có biết? (xem lại ở menu làng), Hướng dẫn chơi
  const openKnow = useCallback(() => {
    const v = live.current.inside;
    if (!v) return;
    api.lock.exit();
    if (live.current.scrollsOf(v).length > 0) setCollection(v);
    else setKnow({ village: v, auto: false });
  }, [api]);
  const knowRef = useRef(know);
  knowRef.current = know;
  const closeKnow = useCallback(() => {
    const k = knowRef.current;
    setKnow(null);
    if (k && k.scroll !== undefined) {
      // đọc xong thẻ nhặt được: cất vào sổ, cột sáng tắt, báo số thẻ
      const total = live.current.scrollsOf(k.village).length;
      const mask = live.current.knowMasks[k.village] | (1 << k.scroll);
      progress.markKnowCard(k.village, k.scroll);
      const n = countKnowCards(mask, total);
      setToast(fmt(n >= total ? knowScrollUi.nhatDu : knowScrollUi.nhatXong, { n, tong: total }));
    }
    session.dialogClosed();
  }, [session, progress]);
  const closeCollection = useCallback(() => {
    setCollection(null);
    session.dialogClosed();
  }, [session]);
  // thông báo nhặt thẻ tự tắt sau vài giây
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  const openGuide = useCallback(
    (section?: string) => {
      api.lock.exit();
      setGuide({ section });
    },
    [api],
  );
  const closeGuide = useCallback(() => {
    setGuide(null);
    session.dialogClosed();
  }, [session]);
  // Lần đầu vào chợ tự mở phần "Đi lại và camera" (một lần, lưu theo tiến độ). Chờ chuỗi mở cổng (nếu có) xong, và không chen lên hộp thoại khác.
  const guideChecked = useRef(false);
  useEffect(() => {
    if (!ready || !flagKnown || guideChecked.current || dialog !== null || guide !== null || know !== null || inside !== null) return;
    if (seq !== 'idle' && seq !== 'done') return;
    guideChecked.current = true;
    if (!shouldAutoOpenGuide(data, GUIDE_FIRST_SECTION)) return;
    progress.markGuideSeen(GUIDE_FIRST_SECTION);
    openGuide(GUIDE_FIRST_SECTION);
  }, [ready, flagKnown, seq, dialog, guide, know, inside, data, progress, openGuide]);

  // ---- báo từ cảnh 3D
  const onZones = useCallback((next: LoadedZones) => {
    setLoaded(next);
    // vùng đã dọn thì bỏ khỏi danh sách đã dựng xong
    setZoneReady((prev) => {
      let changed = false;
      const out = new Set(prev);
      for (const id of prev) if (!next[id]) (out.delete(id), (changed = true));
      return changed ? out : prev;
    });
  }, []);
  const onZoneReady = useCallback((id: VillageId) => setZoneReady((prev) => (prev.has(id) ? prev : new Set(prev).add(id))), []);
  const onNearest = useCallback((i: number) => setNear(i), []);

  useEffect(() => {
    document.title = ui.cho.tieuDe;
  }, []);

  const allKnowCards = know ? villageKnowCards(know.village) : [];
  const knowCards = know && know.scroll !== undefined ? allKnowCards.slice(know.scroll, know.scroll + 1) : allKnowCards;
  const menuKnow = inside && villageKnowCards(inside).length > 0 && VILLAGE_SCENE[inside] ? [{ label: ui.baiHoc.emCoBiet, onClick: openKnow }] : [];

  return (
    <div className="fixed inset-0 bg-giay" data-testid="cho" data-seq={seq} data-inside={inside ?? ''} data-ready={ready ? 'true' : 'false'}>
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
        onMap={toggleMap}
        className="size-full"
      >
        <Scene3D
          errorCovers
          quality={forced}
          camera={{ position: [camStart.x - Math.sin(camStart.yaw) * 7, 4, camStart.z - Math.cos(camStart.yaw) * 7], fov: 50 }}
          lookAt={[camStart.x, 1.3, camStart.z]}
          fog={overview ? false : FOG}
          sunPosition={[26, 46, 18]}
          shadowFollowPlayer
          onReady={() => setReady(true)}
        >
          <WorldScene
            world={world}
            api={api}
            paused={session.paused}
            level={level}
            dirtUrl={dirtUrl}
            brickUrl={brickUrl}
            animate={!settings.reducedMotion}
            overview={overview}
            debugColliders={debugColliders}
            gateOpen={gateOpen}
            interactables={interactables}
            biTrack={base.bi}
            villagerTracks={base.villagers}
            onNearestChange={onNearest}
            talkingVillager={dialog?.villager ?? null}
            talkingGuide={dialog?.guideTalking ? (dialog.village ?? null) : null}
            talkAt={talkAt}
            spawn={spawn ?? undefined}
            fallingGate={fallingGate}
            onGateFallen={onGateFallen}
            arrowTarget={arrowTarget}
            mission={missionVillage}
            loaded={loaded}
            levelStates={levelStates}
            onZones={onZones}
            onInside={setInside}
            onNearGate={setNearGate}
            onZoneReady={onZoneReady}
            knowMasks={knowMasks}
            inside={inside}
            onNearestScroll={setScrollIdx}
          />
        </Scene3D>

        <MarketHud
          quest={questText}
          pages={pages}
          glow={glow}
          onMenu={session.openMenu}
          onGuide={() => openGuide()}
          map={<MiniMap geo={mapGeo} markers={miniMarkers} names={miniNames} api={api} inside={inside} rotate={settings.rotateMap} size={miniMapSize(touch, settings.largeText)} touch={touch} reducedMotion={settings.reducedMotion} onOpen={() => !mapLive.current.blocked && !mapLive.current.bigMap && openMap()} />}
        />

        {/* Lời nhắc tương tác ở máy tính (điện thoại hiện trên nút ✋) */}
        {label && !session.paused && (
          <div data-hud className="pointer-events-none absolute inset-x-0 bottom-8 z-10 hidden justify-center [@media(pointer:fine)]:flex">
            <span className="rounded-nut bg-black/70 px-4 py-2 font-display text-lg font-extrabold text-white" role="status">
              {fmt(ui.dungDi.nhacTuongTac, { vat: label })}
            </span>
          </div>
        )}
        {/* Tới cổng làng mà vùng làng chưa dựng xong */}
        {entering && (
          <div data-hud className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            <span className="rounded-nut bg-black/70 px-5 py-3 font-display text-xl font-extrabold text-white" role="status" data-testid="dang-vao-lang">
              {ui.thegioi.dangVaoLang}
            </span>
          </div>
        )}

        {/* Dấu chấm giữa màn hình khi đã khóa chuột (con trỏ bị ẩn) */}
        {session.lockMode && session.locked && <div data-hud aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-black/40" />}
      </WalkControls>

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3">
          <div className="flex w-full max-w-[960px] justify-center">
            <VnDialog turns={dialog.turns} onFinish={closeDialog} onSkip={dialog.cutscene || dialog.golden ? closeDialog : undefined} label={dialog.village ? ui.lang[dialog.village] : undefined} />
          </div>
        </div>
      )}

      {know && <EmCoBietDialog cards={knowCards} onClose={closeKnow} finishLabel={know.scroll !== undefined ? knowScrollUi.catVaoSo : know.auto ? ui.baiHoc.vaoLang : undefined} />}
      {collection && <KnowCollectionDialog cards={villageKnowCards(collection)} mask={knowMasks[collection]} total={scrollTotals[collection]} onClose={closeCollection} />}
      {toast && (
        <div data-hud className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-3">
          <span role="status" data-testid="thong-bao-the" className="rounded-nut border-2 border-vang bg-black/75 px-4 py-2 text-center font-display text-lg font-extrabold text-white">
            {toast}
          </span>
        </div>
      )}
      {guide && <GuideDialog section={guide.section} onClose={closeGuide} />}
      {bigMap && <BigMap geo={mapGeo} markers={bigMarkers} names={mapNames} player={mapPlayer} progress={mapProgress} quest={questText} touch={touch} reducedMotion={settings.reducedMotion} onClose={closeMap} />}

      <WalkLockOverlay session={session} hideMenu />
      <MarketMenu session={session} onGuide={() => openGuide()} extraItems={menuKnow} />
    </div>
  );
}
