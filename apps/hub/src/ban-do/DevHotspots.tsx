import { useRef, useState, type PointerEvent } from 'react';
import {
  AssetImage,
  BAN_DO_HOTSPOTS,
  Button,
  VILLAGE_ORDER,
  fmt,
  formatHotspotsBlock,
  ui,
  useManifest,
  type Hotspot,
  type VillageId,
} from '@so-chung/core';

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Trang dev: kéo thả 4 điểm làng trên ảnh bản đồ, hiện tọa độ %, nút "Chép" để dán vào banDoHotspots.ts. */
export default function DevHotspots() {
  const manifest = useManifest();
  const dim = manifest?.['ui/ban-do'];
  const aspect = dim ? `${dim.width} / ${dim.height}` : '1920 / 1047';
  const [spots, setSpots] = useState<Record<VillageId, Hotspot>>({ ...BAN_DO_HOTSPOTS });
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<VillageId | null>(null);

  const move = (e: PointerEvent) => {
    const id = drag.current;
    const el = box.current;
    if (!id || !el) return;
    const r = el.getBoundingClientRect();
    setSpots((s) => ({
      ...s,
      [id]: { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) },
    }));
  };

  const block = formatHotspotsBlock(spots);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block);
      setNote(ui.dev.hotspotDaChep);
    } catch {
      setNote(ui.dev.hotspotKhongChepDuoc);
    }
  };

  return (
    <main className="mx-auto max-w-[1100px] space-y-4 p-4">
      <h1 className="text-2xl">{ui.dev.hotspotTieuDe}</h1>
      <p>{ui.dev.hotspotHuongDan}</p>

      <div
        ref={box}
        className="relative touch-none select-none overflow-hidden rounded-bang border-4 border-nau-go"
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <AssetImage path="ui/ban-do" alt="" className="block h-auto w-full" style={{ width: '100%', aspectRatio: aspect }} />
        {VILLAGE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            aria-label={ui.lang[id]}
            style={{ left: `${spots[id].x}%`, top: `${spots[id].y}%` }}
            onPointerDown={(e) => {
              drag.current = id;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            className="absolute min-h-11 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-nut border-4 border-muc-tim bg-giay px-2 font-display text-sm font-extrabold active:cursor-grabbing"
          >
            {ui.lang[id]}
          </button>
        ))}
      </div>

      <ul className="font-mono text-sm">
        {VILLAGE_ORDER.map((id) => (
          <li key={id}>{fmt(ui.dev.hotspotToaDo, { lang: ui.lang[id], x: spots[id].x.toFixed(1), y: spots[id].y.toFixed(1) })}</li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={copy}>
          {ui.dev.hotspotChep}
        </Button>
        {note && <span role="status">{note}</span>}
      </div>
      <pre className="overflow-x-auto rounded-xl border-2 border-nau-go bg-white/70 p-3 text-sm">{block}</pre>
    </main>
  );
}
