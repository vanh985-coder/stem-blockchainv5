import { useState } from 'react';
import { GUIDE_ART_IDS, GUIDE_SECTIONS, GuideArt, GuideDialog, type GuideDevice } from '@so-chung/core';

/** /dev/guide: xem mọi hình minh họa SVG của "Hướng dẫn chơi" và mở hộp hướng dẫn theo từng thiết bị (chỉ khi chạy dev). */
export default function DevGuide() {
  const [open, setOpen] = useState<{ device: GuideDevice; section?: string } | null>(null);
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl">/dev/guide</h1>
      <div className="flex flex-wrap gap-2">
        {(['may', 'dt'] as const).flatMap((device) =>
          GUIDE_SECTIONS.map((s) => (
            <button key={device + s.id} type="button" className="rounded border-2 border-nau-go bg-giay px-2 py-1" onClick={() => setOpen({ device, section: s.id })}>
              {device}:{s.id}
            </button>
          )),
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="art-grid">
        {GUIDE_ART_IDS.map((id) => (
          <figure key={id} className="space-y-1">
            <div className="aspect-video overflow-hidden rounded-2xl border-4 border-nau-go bg-giay">
              <GuideArt id={id} className="block size-full" />
            </div>
            <figcaption className="text-sm">{id}</figcaption>
          </figure>
        ))}
      </div>
      {open && <GuideDialog section={open.section} device={open.device} onClose={() => setOpen(null)} />}
    </main>
  );
}
