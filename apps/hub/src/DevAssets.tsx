import { ASSETS_URL, AssetImage, PORTRAIT_IDS, Portrait, fmt, ui, useManifest } from '@so-chung/core';

const kb = (b: number) => (b / 1024).toFixed(1);

/** Trang kiểm tra đồ họa, chỉ có khi chạy dev. */
export default function DevAssets() {
  const manifest = useManifest();
  const entries = manifest ? Object.entries(manifest) : [];
  const total = entries.reduce((s, [, m]) => s + m.bytes, 0);

  return (
    <main className="space-y-6 p-4">
      <h1 className="text-xl">{ui.dev.dodoHoaTieuDe}</h1>
      <p className="text-sm">
        {ui.dev.nguon} <code>{ASSETS_URL}/manifest.json</code> —{' '}
        {manifest ? fmt(ui.dev.anhVaDungLuong, { so: entries.length, kb: kb(total) }) : ui.dev.dangTai}
        {manifest && entries.length === 0 && ui.dev.manifestTrong}
      </p>

      <section>
        <h2 className="mb-2 text-lg">{ui.dev.chanDung}</h2>
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
        <h2 className="mb-2 text-lg">{ui.dev.moiAnh}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {entries.map(([key, m]) => (
            <figure key={key} className="break-all text-xs">
              <AssetImage path={key} alt={key} loading="lazy" className="h-28 w-full bg-stone-200 object-contain" />
              <figcaption>
                {key}
                <br />
                {m.width}×{m.height} · {kb(m.bytes)} KB
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
