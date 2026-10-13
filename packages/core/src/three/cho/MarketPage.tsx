import { useEffect, useMemo } from 'react';
import { asset, useManifest } from '../../assets/store';
import { ui } from '../../content/ui';
import { useSettings } from '../../settings/SettingsProvider';
import { MouseSensitivityRow } from '../../ui/SettingsPanel';
import { Scene3D } from '../Scene3D';
import { WalkControls } from '../WalkControls';
import { WalkLockOverlay } from '../WalkLockOverlay';
import { isQualityChoice, type QualityChoice } from '../quality';
import { useQuality } from '../useQuality';
import { useWalkSession } from '../useWalkSession';
import { createWalkApi } from '../walkApi';
import { MarketScene } from './MarketScene';
import { PLAYER_START, WORLD_RADIUS } from './marketLayout';

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
function forcedOverview(): "top" | "oblique" | "free" | undefined {
  if (typeof location === "undefined") return undefined;
  const c = new URLSearchParams(location.search).get("cam");
  return c === "top" || c === "oblique" || c === "free" ? c : undefined;
}

/** `?debug=colliders`: vẽ khung xem vùng va chạm (chỉ để kiểm tra bằng mắt). */
function forcedDebugColliders(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === 'colliders';
}

/**
 * Trang chợ phiên 3D `/cho` (mốc 2, bước 7): cảnh đi lại trong chợ. Máy tính bấm vào khung để khóa chuột, rê chuột xoay camera;
 * điện thoại dùng cần điều khiển. Chưa có HUD, cổng mở/khóa, hội thoại hay menu thật (bước 8).
 */
export function MarketPage() {
  const manifest = useManifest();
  const { settings, update } = useSettings();
  const api = useMemo(() => createWalkApi(0), []);
  const forced = useMemo(forcedQuality, []);
  const overview = useMemo(forcedOverview, []);
  const debugColliders = useMemo(forcedDebugColliders, []);
  const { level } = useQuality(forced);
  const session = useWalkSession(api, false);
  const dirtUrl = useMemo(() => (manifest ? asset(DIRT_TEXTURE) : null), [manifest]);
  if (import.meta.env.DEV) (window as unknown as { __walkApi?: typeof api }).__walkApi = api;

  useEffect(() => {
    document.title = ui.cho.tieuDe;
  }, []);

  return (
    <div className="fixed inset-0 bg-giay">
      <WalkControls
        api={api}
        paused={session.paused}
        lockMode={session.lockMode}
        mouseSensitivity={settings.mouseSensitivity}
        onLockChange={session.onLockChange}
        onLockError={session.onLockError}
        interactLabel={null}
        onInteract={noop}
        onMenu={session.toggleMenu}
        className="size-full"
      >
        <Scene3D
          quality={forced}
          camera={{ position: [PLAYER_START[0], 4, PLAYER_START[1] - 7], fov: 50 }}
          lookAt={[PLAYER_START[0], 1.3, PLAYER_START[1]]}
          fog={overview ? false : FOG}
          sunPosition={[26, 46, 18]}
          shadowExtent={WORLD_RADIUS + 4}
        >
          <MarketScene api={api} paused={session.paused} level={level} dirtUrl={dirtUrl} animate={!settings.reducedMotion} overview={overview} debugColliders={debugColliders} />
        </Scene3D>
      </WalkControls>
      <WalkLockOverlay session={session}>
        <MouseSensitivityRow value={settings.mouseSensitivity} onChange={(v) => update({ mouseSensitivity: v })} />
      </WalkLockOverlay>
    </div>
  );
}

function noop() {
  /* chưa có vật tương tác */
}
