/**
 * Bộ điều khiển AnimationMixer của một nhân vật có xương, không phụ thuộc React (để test được bằng three thật).
 *
 * Lỗi từng gặp ("Cannot set properties of undefined (setting '_cacheIndex')", làm sập Canvas): gọi `action.play()` trên hành động của một mixer đã `uncacheRoot`.
 * Trong React, khi model hay clip đổi thì effect dựng rig chạy lại (dọn mixer cũ, dựng mixer mới) NHƯNG hàm `play` cũ (giữ rig cũ trong state) vẫn được gọi trong cùng lần commit.
 * Cách sửa: mọi hành động đều sinh ra từ mixer hiện tại và chỉ nằm trong đối tượng này; `build` dọn rig cũ trước khi dựng rig mới, `dispose` xóa sạch (không còn tham chiếu tới
 * hành động của mixer đã dọn), và `play`, `update`... luôn tra rig HIỆN TẠI, nên một lệnh đến muộn chỉ là không làm gì.
 */
import { AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction, type Object3D } from 'three';
import type { PlayableClip } from './clipPlayback';
import { CLIP_NAMES, type ClipName } from './clips';
import type { Aim, PoseName } from './poses';

/** Phần của PoseLayer mà bộ điều khiển dùng (thật là `PoseLayer`; test dùng bản giả). */
export interface PoseLayerLike {
  restore(): void;
  update(now: number, dt: number): void;
  play(name: PoseName): void;
  setAim(aim: Aim | null): void;
}

export type PlayableClips = Partial<Record<ClipName, PlayableClip>>;

/**
 * Phát thử mọi hành động một khung với trọng số 0 rồi dừng, để mixer kết nối trước (không đổi tư thế nhân vật: trọng số 0, thời gian 0). Không cấp phát lúc chơi.
 */
export function primeActions(mixer: AnimationMixer, actions: Partial<Record<ClipName, AnimationAction>>): void {
  const list = Object.values(actions) as AnimationAction[];
  for (const a of list) {
    a.enabled = true;
    a.setEffectiveWeight(0);
    a.play();
  }
  mixer.update(0);
  for (const a of list) a.stop();
}

export class CharacterRig<L extends PoseLayerLike = PoseLayerLike> {
  /** Mixer hiện tại (null khi chưa dựng hay đã dọn) */
  private mixer: AnimationMixer | null = null;
  private actions: Partial<Record<ClipName, AnimationAction>> = {};
  private scene: Object3D | null = null;
  private current: { name: ClipName; action: AnimationAction } | null = null;
  private onFinished: ((e: { action: AnimationAction }) => void) | null = null;
  /** Lớp tư thế của rig hiện tại */
  layer: L | null = null;
  /** Gọi khi một clip chạy một lần xong (kèm tên clip) */
  onClipEnd: ((name: ClipName) => void) | null = null;

  /** Đã dựng và chưa dọn. */
  get alive(): boolean {
    return this.mixer !== null;
  }

  /** Tên clip đang phát (null nếu chưa phát gì). */
  get playing(): ClipName | null {
    return this.current?.name ?? null;
  }

  /**
   * Dựng rig mới cho `scene` từ các clip đã sẵn sàng: dọn rig cũ (nếu còn), tạo mixer và hành động mới, phát thử để nạp trước kết nối xương rồi dừng.
   * Dựng lại bao nhiêu lần cũng được; lỗi giữa chừng thì rig ở trạng thái đã dọn (không bao giờ nửa vời).
   */
  build(scene: Object3D, playable: PlayableClips, makeLayer: () => L): void {
    this.dispose();
    const mixer = new AnimationMixer(scene);
    const actions: Partial<Record<ClipName, AnimationAction>> = {};
    try {
      for (const c of CLIP_NAMES) {
        const p = playable[c];
        if (p) actions[c] = mixer.clipAction(p.clip);
      }
      primeActions(mixer, actions);
      const layer = makeLayer();
      const onFinished = (e: { action: AnimationAction }) => {
        const cur = this.current;
        if (this.mixer !== mixer || !cur || e.action !== cur.action) return;
        this.onClipEnd?.(cur.name);
      };
      mixer.addEventListener('finished', onFinished as never);
      this.mixer = mixer;
      this.actions = actions;
      this.scene = scene;
      this.layer = layer;
      this.onFinished = onFinished;
    } catch (err) {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      throw err;
    }
  }

  /** Dọn rig: dừng mọi hành động, gỡ khỏi bộ nhớ đệm và xóa mọi tham chiếu tới chúng. An toàn khi gọi nhiều lần. */
  dispose(): void {
    const mixer = this.mixer;
    if (mixer) {
      if (this.onFinished) mixer.removeEventListener('finished', this.onFinished as never);
      mixer.stopAllAction();
      if (this.scene) mixer.uncacheRoot(this.scene);
    }
    this.mixer = null;
    this.actions = {};
    this.scene = null;
    this.layer = null;
    this.current = null;
    this.onFinished = null;
  }

  /**
   * Phát clip `name` (chuyển mượt từ clip đang phát nếu có). Không có rig hay không có clip đó thì không làm gì và trả về false.
   * `p` là clip đã chuẩn bị (để biết lặp hay một lần), `timeScale` và `fade` (giây) như cấu hình.
   */
  play(name: ClipName, p: PlayableClip | undefined, timeScale: number, fade: number): boolean {
    const next = this.actions[name];
    if (!this.mixer || !next || !p) return false;
    next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(timeScale);
    next.setEffectiveWeight(1);
    if (p.loop) {
      next.setLoop(LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    } else {
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = true;
    }
    next.play();
    const prev = this.current?.action;
    if (prev && prev !== next) prev.crossFadeTo(next, fade, false);
    this.current = { name, action: next };
    return true;
  }

  setTimeScale(timeScale: number): void {
    this.current?.action.setEffectiveTimeScale(timeScale);
  }

  /** Mỗi khung hình: trả xương về giá trị gốc, cho mixer chạy, rồi cộng độ lệch của các tư thế. */
  update(now: number, dt: number): void {
    if (!this.mixer || !this.layer) return;
    this.layer.restore();
    this.mixer.update(dt);
    this.layer.update(now, dt);
  }
}
