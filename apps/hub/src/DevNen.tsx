import { useSearchParams } from 'react-router';
import { NenTrangTri, Panel, type NenTheme } from '@so-chung/core';

const THEMES: readonly NenTheme[] = ['mo', 'lang', 'hoi', 'giay', 'det', 'khacdau', 'bac'];
const VARIANTS = ['full', 'sides', 'still'] as const;

/**
 * Trang thu /dev/nen (chi co khi chay dev): xem nen trang tri theo bo icon va kieu bo tri.
 * Vi du: /dev/nen?theme=det&variant=sides&sparkle=1&board=1
 */
export default function DevNen() {
  const [params, setParams] = useSearchParams();
  const theme = (THEMES.find((t) => t === params.get('theme')) ?? 'lang') as NenTheme;
  const variant = VARIANTS.find((v) => v === params.get('variant')) ?? 'full';
  const sparkle = params.get('sparkle') === '1';
  const board = params.get('board') === '1';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };
  return (
    <>
      <NenTrangTri theme={theme} variant={variant} sparkle={sparkle} image={variant === 'sides' ? null : undefined} />
      <main className="mx-auto min-h-screen max-w-[1200px] p-4">
        <Panel className="space-y-3">
          <h1 className="text-2xl">Dev: nen trang tri</h1>
          <p className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button key={t} className="min-h-11 rounded-nut border-2 border-nau-go px-3" onClick={() => set('theme', t)}>
                {t}
              </button>
            ))}
          </p>
          <p className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <button key={v} className="min-h-11 rounded-nut border-2 border-nau-go px-3" onClick={() => set('variant', v)}>
                {v}
              </button>
            ))}
            <button className="min-h-11 rounded-nut border-2 border-nau-go px-3" onClick={() => set('sparkle', sparkle ? '0' : '1')}>
              sparkle
            </button>
          </p>
          <p>
            theme={theme} variant={variant} sparkle={String(sparkle)}
          </p>
          {board && <p className="h-[60vh]">Bang noi dung dac, chu van doc ro tren nen.</p>}
        </Panel>
      </main>
    </>
  );
}
