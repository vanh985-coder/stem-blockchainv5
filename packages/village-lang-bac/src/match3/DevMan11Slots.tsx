import { useMemo, useState } from 'react';
import { AssetImage } from '@so-chung/core';
import { TREE_ART, TREE_SLOTS, nodeUv, slotsSource, type Uv } from './man11Slots';

/**
 * Dev page /dev/man-11-slots (only in dev): the 8 leaf slots drawn over the tree image. Pick a slot with its button (or drag a marker), click the image to move the selected slot, then copy the exported
 * source into `man11Slots.ts`. The dashed box is the cropped tree art the layout draws; "4 slots" shows round 1 (the two lowest pairs) with the merge nodes.
 */
const PAIR_COLORS = ['#e23b3b', '#3d6bd8', '#e8b020', '#2f9e5b'];

export default function DevMan11Slots() {
  const [slots, setSlots] = useState<Uv[]>(() => TREE_SLOTS.map((s) => ({ ...s })));
  const [sel, setSel] = useState(0);
  const [drag, setDrag] = useState(false);
  const [four, setFour] = useState(false);
  const source = useMemo(() => slotsSource(slots), [slots]);
  const shown = four ? [0, 1, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];

  const place = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setSlots((cur) => cur.map((s, i) => (i === sel ? { u, v } : s)));
  };
  const count = four ? 4 : 8;
  const levels = Math.round(Math.log2(count));
  const nodes: { level: number; index: number; at: Uv }[] = [];
  for (let level = 1; level <= levels; level++) for (let index = 0; index < count >> level; index++) nodes.push({ level, index, at: nodeUv(count, level, index, slots) });

  return (
    <div className="space-y-3 p-3">
      <h1 className="text-xl font-bold">Level 11 tree slots (sprites/man-11-ghep-la/cay-ghep-la)</h1>
      <div className="flex flex-wrap items-center gap-2">
        {slots.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSel(i)}
            className="rounded border-2 px-2 py-1 text-sm font-bold"
            style={{ borderColor: PAIR_COLORS[i >> 1], background: sel === i ? PAIR_COLORS[i >> 1] : 'white', color: sel === i ? 'white' : 'black' }}
          >
            slot {i}
          </button>
        ))}
        <button type="button" className="rounded border-2 px-2 py-1 text-sm" onClick={() => setFour((f) => !f)} data-testid="toggle-four">
          {four ? '8 slots' : '4 slots'}
        </button>
        <button type="button" className="rounded border-2 px-2 py-1 text-sm" onClick={() => setSlots(TREE_SLOTS.map((s) => ({ ...s })))}>
          reset
        </button>
      </div>
      <div
        className="relative w-full max-w-[1100px] cursor-crosshair select-none bg-[#cfe8f5]"
        style={{ aspectRatio: `${TREE_ART.aspect}`, touchAction: 'none' }}
        onPointerDown={(e) => {
          setDrag(true);
          place(e);
        }}
        onPointerMove={(e) => drag && place(e)}
        onPointerUp={() => setDrag(false)}
        onPointerLeave={() => setDrag(false)}
        data-testid="tree-image"
      >
        <AssetImage path="sprites/man-11-ghep-la/cay-ghep-la" alt="" className="absolute inset-0 size-full object-fill" />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
          <rect x={TREE_ART.u0} y={TREE_ART.v0} width={TREE_ART.u1 - TREE_ART.u0} height={TREE_ART.v1 - TREE_ART.v0} fill="none" stroke="#222" strokeWidth={0.003} strokeDasharray="0.01 0.008" />
        </svg>
        {nodes.map((n) => (
          <span key={`n${n.level}-${n.index}`} className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/70" style={{ left: `${n.at.u * 100}%`, top: `${n.at.v * 100}%` }} />
        ))}
        {shown.map((i, k) => (
          <span
            key={i}
            className="pointer-events-none absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] bg-white/80 text-sm font-extrabold"
            style={{ left: `${slots[i].u * 100}%`, top: `${slots[i].v * 100}%`, borderColor: PAIR_COLORS[i >> 1], outline: sel === i ? '3px solid #000' : 'none' }}
          >
            {four ? k : i}
          </span>
        ))}
      </div>
      <p className="text-sm">Slots 2k and 2k+1 are siblings (they merge into a branch). Black dots are merge nodes; the last one is the root.</p>
      <textarea readOnly value={source} rows={10} className="w-full max-w-xl rounded border-2 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} data-testid="slots-source" />
    </div>
  );
}
