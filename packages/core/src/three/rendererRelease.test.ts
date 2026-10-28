import { BoxGeometry, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { ownedListenerCount, releaseRendererListeners, trackRenderer } from './rendererRelease';

/** Renderer giả: lúc "vẽ" đăng ký người nghe lên đồ dùng chung như WebGLTextures của three. */
function fakeRenderer(onRender: (listener: () => void) => void) {
  const state = { disposed: 0, listener: () => undefined };
  const r = {
    dispose: () => {
      state.disposed++;
    },
    render() {
      onRender(state.listener);
    },
    compile() {
      onRender(state.listener);
    },
  };
  return { r, state };
}

describe('trackRenderer: gỡ người nghe dispose của renderer khi dispose', () => {
  it('người nghe đăng ký lúc render bị gỡ khi renderer dispose, người nghe của chỗ khác còn nguyên', () => {
    const shared = new Texture();
    const mine = () => undefined;
    shared.addEventListener('dispose', mine); // ngoài renderer: không được đụng tới
    const { r, state } = fakeRenderer((l) => shared.addEventListener('dispose', l));
    trackRenderer(r as never);
    r.render();
    expect(shared.hasEventListener('dispose', state.listener)).toBe(true);
    expect(ownedListenerCount(r)).toBe(1);
    r.dispose();
    expect(state.disposed).toBe(1);
    expect(shared.hasEventListener('dispose', state.listener)).toBe(false);
    expect(shared.hasEventListener('dispose', mine)).toBe(true);
    expect(ownedListenerCount(r)).toBe(0);
  });

  it('hai renderer cùng dùng một texture: dispose renderer A không gỡ người nghe của renderer B', () => {
    const shared = new Texture();
    const a = fakeRenderer((l) => shared.addEventListener('dispose', l));
    const b = fakeRenderer((l) => shared.addEventListener('dispose', l));
    trackRenderer(a.r as never);
    trackRenderer(b.r as never);
    a.r.render();
    b.r.compile();
    a.r.dispose();
    expect(shared.hasEventListener('dispose', a.state.listener)).toBe(false);
    expect(shared.hasEventListener('dispose', b.state.listener)).toBe(true);
    b.r.dispose();
    expect(shared.hasEventListener('dispose', b.state.listener)).toBe(false);
  });

  it('gỡ cả trên hình học; sự kiện khác dispose không ghi; ngoài lúc renderer chạy không ghi', () => {
    const geo = new BoxGeometry();
    const other = () => undefined;
    const { r, state } = fakeRenderer((l) => {
      geo.addEventListener('dispose', l);
      new Texture().addEventListener('dispose', other);
    });
    trackRenderer(r as never);
    geo.addEventListener('dispose', other); // ngoài render
    expect(ownedListenerCount(r)).toBe(0);
    r.render();
    expect(ownedListenerCount(r)).toBe(2);
    r.dispose();
    expect(geo.hasEventListener('dispose', state.listener)).toBe(false);
    expect(geo.hasEventListener('dispose', other)).toBe(true);
  });

  it('gọi gỡ nhiều lần không lỗi; chủ được trả lại sau khi hàm bọc ném lỗi', () => {
    const shared = new Texture();
    const { r, state } = fakeRenderer((l) => {
      shared.addEventListener('dispose', l);
      throw new Error('hỏng giữa chừng');
    });
    trackRenderer(r as never);
    expect(() => r.render()).toThrow();
    // ngoài renderer, đăng ký không bị tính cho renderer nữa
    shared.addEventListener('dispose', () => undefined);
    expect(ownedListenerCount(r)).toBe(1);
    releaseRendererListeners(r);
    releaseRendererListeners(r);
    expect(shared.hasEventListener('dispose', state.listener)).toBe(false);
  });
});
