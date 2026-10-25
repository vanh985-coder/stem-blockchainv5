import { useMemo, useState } from 'react';
import { AssetImage } from '@so-chung/core';
import { COOP_POINT, IMAGE_WORLD, LANE_SCALE, MAN09_IMAGE, MAN09_LANES, laneQuad, lanesSource, worldToImage, type LaneSegment } from './man09Lanes';
import { CHICKEN_SPEC } from './chickenConfig';

/**
 * Dev page /dev/man-09-lanes (only in dev): click the background image to place the end points of the 3 lanes, then copy the exported source into `man09Lanes.ts`.
 * Pick a handle (lane + top / bottom end, or the half width at that end) with the buttons, then click the image (or drag). The trapezoid is the lane area (what the layout test keeps clear in its lower half),
 * the dashed line is the path the chickens run along (pos 0 to 10, one dot per pos unit, dot size follows the perspective scale).
 */
const COLORS = ['#e23b3b', '#3d6bd8', '#e8b020'];

type Handle = { lane: number; part: 'top' | 'bottom' | 'wTop' | 'wBottom' };
const PARTS: readonly { part: Handle['part']; label: string }[] = [
  { part: 'top', label: 'top' },
  { part: 'bottom', label: 'bottom' },
  { part: 'wTop', label: 'width top' },
  { part: 'wBottom', label: 'width bottom' },
];

function clone(lanes: readonly LaneSegment[]): LaneSegment[] {
  return lanes.map((l) => ({ top: { ...l.top }, bottom: { ...l.bottom }, half: { ...l.half } }));
}

export default function DevMan09Lanes() {
  const [lanes, setLanes] = useState<LaneSegment[]>(() => clone(MAN09_LANES));
  const [sel, setSel] = useState<Handle>({ lane: 0, part: 'top' });
  const [drag, setDrag] = useState(false);
  const W = MAN09_IMAGE.width;
  const H = MAN09_IMAGE.height;
  const source = useMemo(() => lanesSource(lanes), [lanes]);

  const place = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setLanes((cur) => {
      const next = clone(cur);
      const l = next[sel.lane];
      if (sel.part === 'top' || sel.part === 'bottom') l[sel.part] = { u, v };
      else if (sel.part === 'wTop') l.half.top = Math.abs(u - l.top.u);
      else l.half.bottom = Math.abs(u - l.bottom.u);
      return next;
    });
  };
  const at = (l: LaneSegment, t: number) => ({ x: (l.top.u + (l.bottom.u - l.top.u) * t) * W, y: (l.top.v + (l.bottom.v - l.top.v) * t) * H });
  const lowerFrom = 5;

  return (
    <div className="space-y-3 p-3">
      <h1 className="text-xl font-bold">Level 9 lanes (scenes/man-09-duong-lang)</h1>
      <div className="flex flex-wrap items-center gap-2">
        {lanes.flatMap((_, lane) =>
          PARTS.map(({ part, label }) => (
            <button
              key={`${lane}${part}`}
              type="button"
              onClick={() => setSel({ lane, part })}
              className="rounded border-2 px-2 py-1 text-sm font-bold"
              style={{ borderColor: COLORS[lane], background: sel.lane === lane && sel.part === part ? COLORS[lane] : 'white', color: sel.lane === lane && sel.part === part ? 'white' : 'black' }}
            >
              lane {lane + 1} {label}
            </button>
          )),
        )}
        <button type="button" className="rounded border-2 px-2 py-1 text-sm" onClick={() => setLanes(clone(MAN09_LANES))}>
          reset
        </button>
      </div>
      <div
        className="relative w-full max-w-[1376px] cursor-crosshair select-none"
        style={{ aspectRatio: `${W} / ${H}`, touchAction: 'none' }}
        onPointerDown={(e) => {
          setDrag(true);
          place(e);
        }}
        onPointerMove={(e) => drag && place(e)}
        onPointerUp={() => setDrag(false)}
        onPointerLeave={() => setDrag(false)}
        data-testid="lanes-image"
      >
        <AssetImage path="scenes/man-09-duong-lang" alt="" className="absolute inset-0 size-full object-fill" />
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
          {lanes.map((l, i) => {
            const a = at(l, 0);
            const b = at(l, 1);
            const poly = (from: number, to: number) =>
              laneQuad(i, from, to, lanes)
                .map((p) => worldToImage(p.x, p.y))
                .map((p) => `${p.u * W},${p.v * H}`)
                .join(' ');
            return (
              <g key={i}>
                <polygon points={poly(0, CHICKEN_SPEC.laneLength)} fill={COLORS[i]} fillOpacity={0.12} stroke={COLORS[i]} strokeWidth={1.5} strokeDasharray="4 4" />
                <polygon points={poly(lowerFrom, CHICKEN_SPEC.laneLength)} fill="#ffffff" fillOpacity={0.22} stroke={COLORS[i]} strokeWidth={2.5} />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLORS[i]} strokeWidth={3} strokeDasharray="10 6" />
                {Array.from({ length: 11 }, (_, p) => {
                  const q = at(l, p / 10);
                  const s = LANE_SCALE.top + (LANE_SCALE.bottom - LANE_SCALE.top) * (p / 10);
                  return <circle key={p} cx={q.x} cy={q.y} r={5 * s + 2} fill={COLORS[i]} stroke="#fff" strokeWidth={1.5} />;
                })}
                <circle cx={a.x} cy={a.y} r={11} fill="none" stroke={COLORS[i]} strokeWidth={4} />
                <circle cx={b.x} cy={b.y} r={11} fill="none" stroke={COLORS[i]} strokeWidth={4} />
                <text x={a.x + 14} y={a.y - 10} fontSize={26} fontWeight={800} fill={COLORS[i]} stroke="#fff" strokeWidth={4} paintOrder="stroke">
                  {i + 1}
                </text>
              </g>
            );
          })}
          <circle cx={COOP_POINT.u * W} cy={COOP_POINT.v * H} r={9} fill="#ffffff" stroke="#222" strokeWidth={3} />
        </svg>
      </div>
      <p className="text-sm">
        Image world size {IMAGE_WORLD.width.toFixed(2)} x {IMAGE_WORLD.height} units. Bold trapezoid = lower half of each lane (pos {lowerFrom} to {CHICKEN_SPEC.laneLength}), where chickens are shot; white dot = chicken coop door.
      </p>
      <textarea readOnly value={source} rows={6} className="w-full max-w-3xl rounded border-2 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} data-testid="lanes-source" />
    </div>
  );
}
