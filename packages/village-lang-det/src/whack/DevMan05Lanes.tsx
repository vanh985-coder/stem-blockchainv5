import { useMemo, useState } from 'react';
import { AssetImage } from '@so-chung/core';
import { IMAGE_WORLD, LANE_SCALE, MAN05_IMAGE, MAN05_LANES, laneQuad, lanesSource, worldToImage, type LaneSegment } from './man05Lanes';
import { WHACK_SPEC } from './whackConfig';

/**
 * Dev page /dev/man-05-lanes (only in dev): click the background image to place the end points of the 4 lanes, then copy the exported source into `man05Lanes.ts`.
 * Pick a handle (lane + top/bottom) with the buttons, then click the image (or drag the handle). The thick part of each lane is the hit zone (pos 6.5 to 9), dots every pos unit.
 */
const COLORS = ['#e23b3b', '#4a56c8', '#e8b020', '#35a34a'];

type Handle = { lane: number; end: 'top' | 'bottom' };

function clone(lanes: readonly LaneSegment[]): LaneSegment[] {
  return lanes.map((l) => ({ top: { ...l.top }, bottom: { ...l.bottom } }));
}

export default function DevMan05Lanes() {
  const [lanes, setLanes] = useState<LaneSegment[]>(() => clone(MAN05_LANES));
  const [sel, setSel] = useState<Handle>({ lane: 0, end: 'top' });
  const [drag, setDrag] = useState(false);
  const W = MAN05_IMAGE.width;
  const H = MAN05_IMAGE.height;
  const source = useMemo(() => lanesSource(lanes), [lanes]);

  const place = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setLanes((cur) => {
      const next = clone(cur);
      next[sel.lane][sel.end] = { u, v };
      return next;
    });
  };
  const at = (l: LaneSegment, t: number) => ({ x: (l.top.u + (l.bottom.u - l.top.u) * t) * W, y: (l.top.v + (l.bottom.v - l.top.v) * t) * H });

  return (
    <div className="space-y-3 p-3">
      <h1 className="text-xl font-bold">Level 5 lanes (scenes/man-05-san-det)</h1>
      <div className="flex flex-wrap items-center gap-2">
        {lanes.flatMap((_, lane) =>
          (['top', 'bottom'] as const).map((end) => (
            <button
              key={`${lane}${end}`}
              type="button"
              onClick={() => setSel({ lane, end })}
              className="rounded border-2 px-2 py-1 text-sm font-bold"
              style={{ borderColor: COLORS[lane], background: sel.lane === lane && sel.end === end ? COLORS[lane] : 'white', color: sel.lane === lane && sel.end === end ? 'white' : 'black' }}
            >
              lane {lane + 1} {end}
            </button>
          )),
        )}
        <button type="button" className="rounded border-2 px-2 py-1 text-sm" onClick={() => setLanes(clone(MAN05_LANES))}>
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
        <AssetImage path="scenes/man-05-san-det" alt="" className="absolute inset-0 size-full object-fill" />
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
          {lanes.map((l, i) => {
            const a = at(l, 0);
            const b = at(l, 1);
            const z0 = at(l, WHACK_SPEC.zoneStart / WHACK_SPEC.laneLength);
            const z1 = at(l, WHACK_SPEC.zoneEnd / WHACK_SPEC.laneLength);
            // hit-zone glow quad as drawn in the game (follows the cloth edges from `MAN05_CLOTH`, not the lane line)
            const quad = laneQuad(i, WHACK_SPEC.zoneStart, WHACK_SPEC.zoneEnd, 0.05, lanes).map((p) => worldToImage(p.x, p.y));
            return (
              <g key={i}>
                <polygon points={quad.map((p) => `${p.u * W},${p.v * H}`).join(' ')} fill="#ffffff" fillOpacity={0.22} stroke={COLORS[i]} strokeWidth={2} />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLORS[i]} strokeWidth={3} strokeDasharray="10 6" />
                <line x1={z0.x} y1={z0.y} x2={z1.x} y2={z1.y} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={14} strokeLinecap="round" />
                <line x1={z0.x} y1={z0.y} x2={z1.x} y2={z1.y} stroke={COLORS[i]} strokeWidth={6} strokeLinecap="round" />
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
        </svg>
      </div>
      <p className="text-sm">
        Image world size {IMAGE_WORLD.width.toFixed(2)} x {IMAGE_WORLD.height} units; thick segment = hit zone (pos {WHACK_SPEC.zoneStart} to {WHACK_SPEC.zoneEnd}).
      </p>
      <textarea readOnly value={source} rows={6} className="w-full max-w-3xl rounded border-2 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} data-testid="lanes-source" />
    </div>
  );
}
