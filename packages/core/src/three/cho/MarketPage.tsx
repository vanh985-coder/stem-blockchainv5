import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { asset, useManifest } from '../../assets/store';
import { canSeeTeacherPage } from '../../auth/roles';
import { useAuth } from '../../auth/AuthProvider';
import { CHARACTERS, fmt, speakerLabel, type CharacterId } from '../../content/characters';
import { BI_NHAC_LAI, BI_NHAC_NHIEM, MARKET_TALKERS, NHIEM_VU } from '../../content/dialogues';
import { ui } from '../../content/ui';
import { MERGED, URLS, gateUrl } from '../../config/urls';
import { useProgress } from '../../progress/ProgressProvider';
import { useSettings } from '../../settings/SettingsProvider';
import { VnDialog, type VnTurn } from '../../ui/VnDialog';
import { Scene3D } from '../Scene3D';
import { WalkControls } from '../WalkControls';
import { WalkLockOverlay } from '../WalkLockOverlay';
import { isQualityChoice, type QualityChoice } from '../quality';
import { useQuality } from '../useQuality';
import { useWalkSession } from '../useWalkSession';
import { createWalkApi } from '../walkApi';
import { MarketHud } from './MarketHud';
import { MarketMenu } from './MarketMenu';
import { MarketScene } from './MarketScene';
import { PLAYER_START } from './marketLayout';
import { GATE_VILLAGE, gateStates, previousVillage, questGate, questIndex } from './marketQuest';
import { createInteractables, parseTarget, type MarketTarget } from './marketTargets';

const DIRT_TEXTURE = 'ui/textures/duong-dat';
/** Sương: trong vùng đi lại gần như không có, ngoài ruộng thì nhạt dần vào chân trời. */
const FOG: [number, number] = [70, 260];

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

/** Hội thoại đang mở: các lượt, và (nếu là dân làng) người đang được nói chuyện để họ đứng yên quay mặt về người chơi. */
interface DialogState {
  turns: VnTurn[];
  villager: number | null;
}

/**
 * Trang chợ phiên 3D `/cho` (mốc 2, bước 7 và 8): cảnh đi lại trong chợ có HUD (nhiệm vụ, 4 ô Trang Sổ Vàng, nút menu), mũi tên chỉ đường tới cổng cần tới, cổng làng mở/khóa
 * theo tiến độ (tài khoản giáo viên mở hết), Bi và dân làng nói chuyện bằng E (hộp thoại VnDialog có chân dung), và menu thật. Máy tính bấm vào khung để khóa chuột, rê chuột
 * xoay camera; điện thoại dùng cần điều khiển. Chưa có cảnh mở đầu (mốc 4) và hiệu ứng nhận trang (bước 15).
 */
export function MarketPage() {
  const manifest = useManifest();
  const { settings } = useSettings();
  const { profile } = useAuth();
  const progress = useProgress();
  const { unlock } = progress;
  const navigate = useNavigate();
  const ten = profile?.display_name;
  const isTeacher = canSeeTeacherPage(profile?.role);
  const api = useMemo(() => createWalkApi(0), []);
  const forced = useMemo(forcedQuality, []);
  const overview = useMemo(forcedOverview, []);
  const debugColliders = useMemo(forcedDebugColliders, []);
  const { level } = useQuality(forced);
  const [near, setNear] = useState(-1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const session = useWalkSession(api, dialog !== null);
  const dirtUrl = useMemo(() => (manifest ? asset(DIRT_TEXTURE) : null), [manifest]);
  if (import.meta.env.DEV) (window as unknown as { __walkApi?: typeof api }).__walkApi = api;

  // Cổng mở/khóa và nhiệm vụ theo số Trang Sổ Vàng (unlock.ts); giáo viên mở hết các cổng.
  const pages = unlock.goldenPages;
  const gateOpen = useMemo(() => gateStates(unlock.villageOpen, isTeacher), [unlock.villageOpen, isTeacher]);
  const questText = useMemo(() => fmt(NHIEM_VU[questIndex(pages)]), [pages]);
  const targetGate = questGate(pages);

  // Vật tương tác: cổng, dân làng, Bi (vị trí sống, do cảnh cập nhật mỗi khung hình)
  const interactables = useMemo(createInteractables, []);
  // Chỉ khi chạy dev: mở vật tương tác và tiến độ ra window để kiểm tra bằng trình duyệt.
  if (import.meta.env.DEV) Object.assign(window, { __marketInteractables: interactables, __progress: progress });
  const targets = useMemo<(MarketTarget | null)[]>(() => interactables.map((i) => parseTarget(i.id)), [interactables]);
  const nameOf = (id: CharacterId) => fmt(CHARACTERS[id].name);
  const labelOf = (t: MarketTarget | null): string | null => {
    if (!t) return null;
    if (t.kind === 'bi') return fmt(ui.cho.nhanNoiChuyen, { nguoi: nameOf('bi') });
    if (t.kind === 'villager') return fmt(ui.cho.nhanNoiChuyen, { nguoi: nameOf(MARKET_TALKERS[t.index].speaker) });
    const village = ui.lang[GATE_VILLAGE[t.gate]];
    return fmt(gateOpen[t.gate] ? ui.cho.nhanCongMo : ui.cho.nhanCongDong, { lang: village });
  };
  const label = near >= 0 ? labelOf(targets[near]) : null;

  const nearRef = useRef(near);
  nearRef.current = near;
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;
  const live = useRef({ gateOpen, pages, ten, targets });
  live.current = { gateOpen, pages, ten, targets };

  const biTurn = useCallback((text: string): VnTurn => ({ speaker: speakerLabel('bi'), portrait: CHARACTERS.bi.portrait, text }), []);

  const interact = useCallback(() => {
    if (dialogRef.current !== null || nearRef.current < 0) return;
    const l = live.current;
    const t = l.targets[nearRef.current];
    if (!t) return;
    if (t.kind === 'gate') {
      const village = GATE_VILLAGE[t.gate];
      if (l.gateOpen[t.gate]) {
        // Cổng mở: chuyển sang làng (lúc dev là địa chỉ của làng; gộp web thì nội bộ /lang/<id>)
        api.lock.exit();
        const url = gateUrl(URLS, village, MERGED);
        if (MERGED) navigate(url);
        else window.location.assign(url);
        return;
      }
      const before = previousVillage(t.gate);
      setDialog({ turns: [biTurn(fmt(ui.cho.congDong, { truoc: before ? ui.lang[before] : '', ten: l.ten }))], villager: null });
    } else if (t.kind === 'villager') {
      const talker = MARKET_TALKERS[t.index];
      const portrait = CHARACTERS[talker.speaker].portrait;
      setDialog({ turns: talker.lines.map((line) => ({ speaker: speakerLabel(talker.speaker), portrait, text: fmt(line, { ten: l.ten }) })), villager: t.index });
    } else {
      const k = questIndex(l.pages);
      setDialog({ turns: [biTurn(fmt(BI_NHAC_NHIEM[k], { ten: l.ten })), biTurn(fmt(BI_NHAC_LAI, { ten: l.ten, nd: fmt(NHIEM_VU[k]) }))], villager: null });
    }
    api.lock.exit(); // nhả khóa để bấm được hộp thoại
  }, [api, navigate, biTurn]);

  const closeDialog = useCallback(() => {
    setDialog(null);
    session.dialogClosed(); // đóng bằng cú bấm thì khóa lại ngay trong chính sự kiện bấm đó
  }, [session]);

  useEffect(() => {
    document.title = ui.cho.tieuDe;
  }, []);

  const onNearest = useCallback((i: number) => setNear(i), []);

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
          quality={forced}
          camera={{ position: [PLAYER_START[0], 4, PLAYER_START[1] - 7], fov: 50 }}
          lookAt={[PLAYER_START[0], 1.3, PLAYER_START[1]]}
          fog={overview ? false : FOG}
          sunPosition={[26, 46, 18]}
          shadowFollowPlayer
        >
          <MarketScene
            api={api}
            paused={session.paused}
            level={level}
            dirtUrl={dirtUrl}
            animate={!settings.reducedMotion}
            overview={overview}
            debugColliders={debugColliders}
            gateOpen={gateOpen}
            interactables={interactables}
            onNearestChange={onNearest}
            targetGate={targetGate}
            talkingVillager={dialog?.villager ?? null}
          />
        </Scene3D>

        <MarketHud quest={questText} pages={pages} onMenu={session.openMenu} />

        {/* Lời nhắc tương tác ở máy tính (điện thoại hiện trên nút ✋) */}
        {label && !session.paused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 hidden justify-center [@media(pointer:fine)]:flex">
            <span className="rounded-nut bg-black/70 px-4 py-2 font-display text-lg font-extrabold text-white" role="status">
              {fmt(ui.dungDi.nhacTuongTac, { vat: label })}
            </span>
          </div>
        )}

        {/* Dấu chấm giữa màn hình khi đã khóa chuột (con trỏ bị ẩn) */}
        {session.lockMode && session.locked && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-black/40" />}
      </WalkControls>

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3">
          <div className="flex w-full max-w-[960px] justify-center">
            <VnDialog turns={dialog.turns} onFinish={closeDialog} />
          </div>
        </div>
      )}

      <WalkLockOverlay session={session} hideMenu />
      <MarketMenu session={session} />
    </div>
  );
}
