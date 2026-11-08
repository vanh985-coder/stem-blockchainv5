/**
 * Bộ quản lý nhạc nền và âm ngắn (thắng, thua, câu hỏi): MỘT nơi duy nhất cho cả game, mọi màn chỉ báo "cảnh này cần bài nào"
 * (`setTrack`) và "đang có câu hỏi/lời thoại" (`duck`). Logic chọn bài và tính âm lượng là hàm thuần ở `musicLogic.ts`.
 *
 * - Chỉ phát sau cử chỉ đầu tiên của người chơi (chạm, bấm chuột, bấm phím): trình duyệt chặn tự phát.
 * - Hai "bàn" phát (HTMLAudioElement qua Web Audio) để chuyển bài mượt: bài cũ giảm dần, bài mới tăng dần khoảng 1 giây.
 * - Chỉ tải bài của cảnh hiện tại khi vào cảnh. Ba đoạn âm ngắn (vài chục KB) được tải sẵn.
 * - Thiếu file, thiếu manifest, trình duyệt không có Web Audio: im lặng, không lỗi.
 */
import { ASSETS_URL, getManifest, loadManifest } from '../assets/store';
import { lookupAsset } from '../assets/manifest';
import {
  MUSIC_ASSET,
  MUSIC_DUCK_FADE_SEC,
  MUSIC_FADE_SEC,
  MUSIC_VOLUME_DEFAULT,
  SFX_ASSET,
  SFX_KEYS,
  SFX_VOLUME,
  effectiveTrack,
  musicGain,
  sfxDue,
  trackChange,
  type MusicTrack,
  type SfxKey,
} from './musicLogic';

interface Deck {
  el: HTMLAudioElement;
  gain: GainNode;
  /** Bài đang nằm trong bàn này (kể cả đang giảm dần). */
  track: MusicTrack | null;
  /** Số thứ tự lần nạp; bỏ qua sự kiện của lần nạp cũ. */
  token: number;
}

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ?? null;
}

export class MusicManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private decks: Deck[] = [];
  /** Bàn đang giữ bài hiện tại (đang phát hoặc đang tăng dần). */
  private active: Deck | null = null;

  private unlocked = false;
  private wanted: MusicTrack | null = null;
  private enabled = true;
  private volume = MUSIC_VOLUME_DEFAULT;
  private sfxEnabled = true;
  private hidden = false;
  private duckCount = 0;
  private token = 0;
  private started = false;
  /** Bàn hiện tại đang tạm dừng vì ẩn tab. */
  private suspended = false;

  private sfxBytes = new Map<SfxKey, ArrayBuffer>();
  private sfxBuffers = new Map<SfxKey, AudioBuffer>();
  private sfxLast = new Map<SfxKey, number>();
  private sfxFetching = false;

  // ---- Khởi động (gọi một lần từ SettingsProvider) --------------------------------------------------------------

  /** Gắn bộ nghe cử chỉ đầu tiên và việc ẩn tab; tải sẵn ba đoạn âm ngắn. Gọi nhiều lần cũng chỉ làm một lần. */
  init(): void {
    if (this.started || typeof window === 'undefined' || !audioCtor()) return;
    this.started = true;
    const onGesture = () => {
      if (this.unlock()) {
        for (const ev of GESTURES) window.removeEventListener(ev, onGesture, true);
      }
    };
    for (const ev of GESTURES) window.addEventListener(ev, onGesture, true);
    document.addEventListener('visibilitychange', () => this.setHidden(document.visibilityState === 'hidden'));
    this.setHidden(document.visibilityState === 'hidden');
    void this.prefetchSfx();
  }

  /** Tạo AudioContext trong cử chỉ của người chơi. Trả true khi đã mở khóa. */
  private unlock(): boolean {
    if (this.unlocked) return true;
    const Ctor = audioCtor();
    if (!Ctor) return false;
    try {
      const ctx = new Ctor();
      void ctx.resume();
      const master = ctx.createGain();
      master.gain.value = musicGain({ enabled: this.enabled, volume: this.volume, duckCount: this.duckCount });
      master.connect(ctx.destination);
      const sfxGain = ctx.createGain();
      sfxGain.gain.value = SFX_VOLUME;
      sfxGain.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.sfxGain = sfxGain;
      this.unlocked = true;
    } catch {
      return false;
    }
    void loadManifest().then(() => this.sync());
    this.sync();
    void this.decodeSfx();
    return true;
  }

  // ---- Đầu vào từ ứng dụng --------------------------------------------------------------------------------------

  /** Bài cảnh hiện tại cần (null: cảnh không có nhạc). Cùng bài thì không làm gì. */
  setTrack(track: MusicTrack | null): void {
    if (this.wanted === track) return;
    this.wanted = track;
    this.sync();
  }

  /** Nhạc nền bật/tắt (cài đặt). */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.sync();
    this.applyGain();
  }

  /** Âm lượng nhạc nền 0 đến 1 (cài đặt). */
  setVolume(volume: number): void {
    this.volume = volume;
    this.applyGain();
  }

  /** Các đoạn âm ngắn theo cài đặt "Âm thanh". */
  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  /** Báo có câu hỏi hoặc lời thoại đang hiện: nhạc nhỏ xuống. Trả hàm gọi khi đóng (gọi nhiều lần cũng chỉ trả một lần). */
  duck(): () => void {
    let released = false;
    this.duckCount++;
    this.applyGain();
    return () => {
      if (released) return;
      released = true;
      this.duckCount = Math.max(0, this.duckCount - 1);
      this.applyGain();
    };
  }

  /**
   * Phát một đoạn âm ngắn. Trả true nếu đoạn âm đã phát hoặc vừa phát cách đây chưa lâu (không cần âm thay thế);
   * false nếu không phát được (chưa có cử chỉ đầu tiên, tắt âm thanh, thiếu file) để nơi gọi dùng âm tổng hợp cũ.
   */
  playSfx(key: SfxKey): boolean {
    if (!this.unlocked || !this.sfxEnabled || !this.ctx || !this.sfxGain) return false;
    const buffer = this.sfxBuffers.get(key);
    if (!buffer) return false;
    const now = Date.now();
    if (!sfxDue(this.sfxLast.get(key), now)) return true;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.sfxGain);
      src.start();
      this.sfxLast.set(key, now);
      return true;
    } catch {
      return false;
    }
  }

  /** Bài đang được yêu cầu cho cảnh (để kiểm tra). */
  getWantedTrack(): MusicTrack | null {
    return this.wanted;
  }

  // ---- Bên trong ------------------------------------------------------------------------------------------------

  private setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    this.sync();
  }

  private gainNow(): number {
    return musicGain({ enabled: this.enabled, volume: this.volume, duckCount: this.duckCount });
  }

  private applyGain(): void {
    if (!this.ctx || !this.master) return;
    ramp(this.ctx, this.master.gain, this.gainNow(), MUSIC_DUCK_FADE_SEC);
  }

  /** Đưa trạng thái phát về đúng bài cần phát. */
  private sync(): void {
    if (!this.unlocked || !this.ctx) return;
    if (this.hidden) {
      // Ẩn tab: tạm dừng ngay, giữ vị trí để phát tiếp khi quay lại.
      this.pauseHard();
      return;
    }
    const next = effectiveTrack({ wanted: this.wanted, enabled: this.enabled, unlocked: this.unlocked, hidden: false });
    const change = trackChange(this.active?.track ?? null, next);
    if (change === 'keep') {
      if (this.suspended) this.resumeActive();
    } else if (change === 'stop') {
      this.fadeOutActive();
    } else if (next) {
      this.startTrack(next);
    }
  }

  private startTrack(track: MusicTrack): void {
    const url = lookupAsset(getManifest(), ASSETS_URL, MUSIC_ASSET[track]);
    if (!url) {
      // Manifest chưa tải xong hoặc thiếu file: đợi manifest (nếu chưa), còn thiếu thật thì im lặng.
      this.fadeOutActive();
      return;
    }
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.fadeOutActive();
    this.suspended = false;
    const deck = this.idleDeck();
    if (!deck) return;
    const token = ++this.token;
    deck.token = token;
    deck.track = track;
    this.active = deck;
    const el = deck.el;
    ramp(ctx, deck.gain.gain, 0, 0);
    el.loop = true;
    el.src = url;
    const onPlaying = () => {
      if (deck.token !== token) return;
      ramp(ctx, deck.gain.gain, 1, MUSIC_FADE_SEC);
    };
    el.addEventListener('playing', onPlaying, { once: true });
    el.addEventListener('error', () => void 0, { once: true });
    try {
      void el.play()?.catch(() => void 0);
    } catch {
      // Im lặng
    }
  }

  private resumeActive(): void {
    const deck = this.active;
    if (!deck || !this.ctx) return;
    this.suspended = false;
    const token = ++this.token;
    deck.token = token;
    try {
      void deck.el.play()?.catch(() => void 0);
    } catch {
      // Im lặng
    }
    ramp(this.ctx, deck.gain.gain, 1, MUSIC_FADE_SEC);
  }

  private fadeOutActive(): void {
    const deck = this.active;
    if (!deck || !this.ctx) return;
    const token = ++this.token;
    deck.token = token;
    ramp(this.ctx, deck.gain.gain, 0, MUSIC_FADE_SEC);
    window.setTimeout(() => {
      if (deck.token === token) deck.el.pause();
    }, MUSIC_FADE_SEC * 1000 + 60);
    this.active = null;
    this.suspended = false;
  }

  private pauseHard(): void {
    const deck = this.active;
    if (!deck || this.suspended) return;
    this.suspended = true;
    deck.token = ++this.token;
    deck.el.pause();
  }

  private idleDeck(): Deck | null {
    if (!this.ctx || !this.master) return null;
    for (const d of this.decks) if (d !== this.active && d.el.paused) return d;
    if (this.decks.length < 2) {
      try {
        const el = new Audio();
        el.crossOrigin = 'anonymous';
        el.preload = 'auto';
        const src = this.ctx.createMediaElementSource(el);
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(this.master);
        const deck: Deck = { el, gain, track: null, token: 0 };
        this.decks.push(deck);
        return deck;
      } catch {
        return null;
      }
    }
    // Cả hai bàn đang bận (bài cũ còn giảm dần): lấy bàn không phải bàn hiện tại, cắt bài cũ.
    return this.decks.find((d) => d !== this.active) ?? null;
  }

  // ---- Âm ngắn --------------------------------------------------------------------------------------------------

  private async prefetchSfx(): Promise<void> {
    if (this.sfxFetching) return;
    this.sfxFetching = true;
    try {
      const manifest = await loadManifest();
      for (const key of SFX_KEYS) {
        const url = lookupAsset(manifest, ASSETS_URL, SFX_ASSET[key]);
        if (!url) continue;
        try {
          const res = await fetch(url);
          if (res.ok) this.sfxBytes.set(key, await res.arrayBuffer());
        } catch {
          // Thiếu file: im lặng
        }
      }
      await this.decodeSfx();
    } catch {
      // Im lặng
    }
  }

  private async decodeSfx(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const [key, bytes] of [...this.sfxBytes]) {
      if (this.sfxBuffers.has(key)) continue;
      try {
        this.sfxBuffers.set(key, await ctx.decodeAudioData(bytes.slice(0)));
      } catch {
        // File hỏng: im lặng
      }
    }
  }
}

const GESTURES = ['pointerdown', 'keydown', 'touchend', 'click'] as const;

/** Đổi độ lợi mượt từ giá trị hiện tại sang `target` trong `sec` giây. */
function ramp(ctx: AudioContext, param: AudioParam, target: number, sec: number): void {
  const now = ctx.currentTime;
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (sec <= 0) param.setValueAtTime(target, now);
    else param.linearRampToValueAtTime(target, now + sec);
  } catch {
    param.value = target;
  }
}

/** Bộ quản lý duy nhất của cả game. */
export const music = new MusicManager();
