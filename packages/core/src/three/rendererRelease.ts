import { ACESFilmicToneMapping, EventDispatcher, WebGLRenderer, type WebGLRendererParameters } from 'three';

/**
 * Gỡ người nghe 'dispose' mà một renderer đã đăng ký lên các đồ dùng chung sống lâu hơn nó.
 *
 * Vì sao cần: lúc vẽ, three đăng ký một người nghe 'dispose' lên mỗi texture, hình học, vật liệu nó dùng
 * (WebGLTextures, WebGLGeometries, WebGLPrograms...). Người nghe là hàm đóng chứa cả bộ máy của renderer
 * (context WebGL, canvas, cả cây DOM bao quanh). `renderer.dispose()` không gỡ chúng. Đồ dùng chung thì sống qua nhiều
 * lần dựng cảnh: texture DFG_LUT bên trong three, texture và hình học model đã cache ở `modelLoader`... Mỗi lần vào rồi
 * ra một cảnh, một renderer cũ cùng canvas và DOM của nó bị giữ lại mãi (đo ở bản build: vào/ra làng 8 vòng còn 59 renderer
 * và 90 canvas, DOM tăng đều 1.200 nút mỗi vòng, heap không đứng yên).
 *
 * Cách làm: bọc các hàm của renderer có thể khiến three đăng ký người nghe (`render`, `compile`, `initTexture`...), trong lúc
 * chúng chạy thì coi renderer này là "chủ"; hàm `addEventListener('dispose')` của EventDispatcher (vá một lần) ghi lại cặp
 * (đối tượng, người nghe) cho chủ đó, giữ đối tượng bằng WeakRef. Khi renderer bị dispose thì gỡ hết các người nghe đó.
 */

type Listener = (event: unknown) => void;
interface Entry {
  target: WeakRef<EventDispatcher>;
  listener: Listener;
}

const entries = new WeakMap<object, Entry[]>();
let owner: object | null = null;
let patched = false;

type AddListener = (this: EventDispatcher, type: string, listener: Listener) => void;

function patchEventDispatcher(): void {
  if (patched) return;
  patched = true;
  const proto = EventDispatcher.prototype as unknown as { addEventListener: AddListener };
  const original = proto.addEventListener;
  proto.addEventListener = function addEventListenerOwned(this: EventDispatcher, type: string, listener: Listener): void {
    original.call(this, type, listener);
    if (type !== 'dispose' || owner === null) return;
    let list = entries.get(owner);
    if (!list) {
      list = [];
      entries.set(owner, list);
    }
    list.push({ target: new WeakRef(this), listener });
  };
}

/** Số người nghe đang ghi cho một renderer (dùng cho test). */
export function ownedListenerCount(renderer: object): number {
  return entries.get(renderer)?.length ?? 0;
}

/** Gỡ mọi người nghe 'dispose' mà `renderer` đã đăng ký lên đồ dùng khác. Gọi lại được nhiều lần. */
export function releaseRendererListeners(renderer: object): void {
  const list = entries.get(renderer);
  if (!list) return;
  entries.delete(renderer);
  for (const e of list) {
    const target = e.target.deref();
    if (target) target.removeEventListener('dispose' as never, e.listener as never);
  }
}

type AnyFn = (this: unknown, a?: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown) => unknown;

/** Bọc một hàm của renderer để trong lúc nó chạy, renderer là chủ (cố định số tham số: không cấp phát mỗi khung hình). */
function ownedBy(renderer: object, name: string): void {
  const target = renderer as Record<string, unknown>;
  const original = target[name];
  if (typeof original !== 'function') return;
  const fn = original as AnyFn;
  target[name] = function owned(this: unknown, a?: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown): unknown {
    const previous = owner;
    owner = renderer;
    try {
      return fn.call(this, a, b, c, d, e);
    } finally {
      owner = previous;
    }
  };
}

const OWNED_METHODS = ['render', 'compile', 'compileAsync', 'initTexture', 'initRenderTarget', 'setRenderTarget', 'copyTextureToTexture', 'copyFramebufferToTexture'];

/**
 * Bắt đầu theo dõi một renderer vừa tạo (trước khi vẽ lần đầu) và gỡ người nghe của nó khi bị dispose.
 * Dùng trong `gl={(defaults) => trackRenderer(new WebGLRenderer({ ...defaults, ... }))}` của <Canvas>.
 */
export function trackRenderer<T extends Pick<WebGLRenderer, 'dispose'>>(renderer: T): T {
  patchEventDispatcher();
  for (const name of OWNED_METHODS) ownedBy(renderer, name);
  const target: Pick<WebGLRenderer, 'dispose'> = renderer;
  const dispose = target.dispose.bind(renderer);
  target.dispose = () => {
    dispose();
    releaseRendererListeners(renderer);
  };
  return renderer;
}

/**
 * Giá trị cho prop `gl` của <Canvas>: tạo WebGLRenderer như R3F vẫn làm (mặc định của R3F cộng tùy chọn của cảnh, tone mapping
 * ACES của R3F) nhưng có theo dõi người nghe để dọn khi rời cảnh.
 */
export function trackedGl(options: WebGLRendererParameters = {}): (defaults: WebGLRendererParameters) => WebGLRenderer {
  return (defaults) => {
    const renderer = new WebGLRenderer({ ...defaults, ...options });
    renderer.toneMapping = ACESFilmicToneMapping;
    return trackRenderer(renderer);
  };
}
