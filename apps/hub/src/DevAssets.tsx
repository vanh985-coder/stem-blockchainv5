import { ASSETS_URL, AssetImage, PORTRAIT_IDS, Portrait, useManifest } from '@so-chung/core';

const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;

/** Trang kiểm tra đồ họa, chỉ có khi chạy dev. */
export default function DevAssets() {
  const manifest = useManifest();
  const entries = manifest ? Object.entries(manifest) : [];
  const total = entries.reduce((s, [, m]) => s + m.bytes, 0);

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Đồ họa (dev)</h1>
      <p className="text-sm">
        Nguồn: <code>{ASSETS_URL}/manifest.json</code> —{' '}
        {manifest ? `${entries.length} ảnh, ${kb(total)}` : 'đang tải…'}
        {manifest && entries.length === 0 && ' (manifest trống hoặc không tải được, kiểm tra pnpm dev:assets)'}
      </p>

      <section>
        <h2 className="font-semibold mb-2">Chân dung ({PORTRAIT_IDS.length}: 10 ảnh + Bi)</h2>
        <div className="flex flex-wrap gap-3">
          {PORTRAIT_IDS.map((id) => (
            <figure key={id} className="text-center text-xs">
              <Portrait id={id} size={96} />
              <figcaption>{id}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Mọi ảnh trong manifest</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {entries.map(([key, m]) => (
            <figure key={key} className="text-xs break-all">
              <AssetImage
                path={key}
                alt={key}
                loading="lazy"
                className="w-full h-28 object-contain bg-stone-200"
              />
              <figcaption>
                {key}
                <br />
                {m.width}×{m.height} · {kb(m.bytes)}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
