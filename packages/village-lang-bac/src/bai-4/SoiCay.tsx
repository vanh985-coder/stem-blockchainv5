import type { ReactNode } from 'react';
import { fmt } from '@so-chung/core';
import { bai4Texts } from '@so-chung/core/content/lessons/bai-4';
import { formatNumber } from '@so-chung/core/lib/format';
import { cellKey, TOP_LEVEL, type InspectCell, type InspectState } from '@so-chung/core/lessons/bai-4/inspect';

const T = bai4Texts.tramTb;

const CELL_H = 64;
const ROW_GAP = 28;
const TREE_H = CELL_H * 3 + ROW_GAP * 2;
const CELL_W_PERCENT = [21, 30, 34] as const; // lá, T12/T34, gốc
const LEAVES = 4;

const cellName = (level: number, index: number) =>
  level === TOP_LEVEL ? T.goc : level === 1 ? `T${index * 2 + 1}${index * 2 + 2}` : `T${index + 1}`;

/** Vị trí một ô trong khung cây: tâm theo %, mép trên theo px. Gốc ở trên, lá ở dưới. */
function place(level: number, index: number) {
  const count = LEAVES >> level;
  return { x: ((index + 0.5) / count) * 100, top: (TOP_LEVEL - level) * (CELL_H + ROW_GAP) };
}

const ALL_CELLS: InspectCell[] = [0, 1, 2].flatMap((level) => Array.from({ length: LEAVES >> level }, (_, index) => ({ level, index })));

function Lines({ tone }: { tone: string }) {
  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let level = 1; level <= TOP_LEVEL; level++) {
    for (let i = 0; i < LEAVES >> level; i++) {
      const p = place(level, i);
      for (const child of [i * 2, i * 2 + 1]) {
        const c = place(level - 1, child);
        lines.push({ key: `${level}-${i}-${child}`, x1: p.x, y1: p.top + CELL_H, x2: c.x, y2: c.top });
      }
    }
  }
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${TREE_H}`} preserveAspectRatio="none" aria-hidden="true">
      {lines.map((l) => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={tone} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function Box({ level, index, className, children }: { level: number; index: number; className: string; children: ReactNode }) {
  const { x, top } = place(level, index);
  return (
    <div style={{ left: `${x}%`, top, width: `${CELL_W_PERCENT[level]}%`, height: CELL_H, transform: 'translateX(-50%)' }} className={`absolute ${className}`}>
      {children}
    </div>
  );
}

const CELL_BASE =
  'flex h-full w-full flex-col items-center justify-center rounded-[12px] border-2 px-0.5 text-center font-display text-sm leading-tight';

export interface SoiCayProps {
  /** Cây đã ghi trong sổ, lúc em dựng */
  recorded: number[][];
  /** Trạng thái soi (gốc cây mới đã hiện sẵn) */
  inspected: InspectState;
  /** Ô vừa soi gần nhất */
  last: InspectCell | null;
  /** Ô "?" này bấm được không (theo trạng thái soi) */
  canInspect: (cell: InspectCell) => boolean;
  onInspect: (cell: InspectCell) => void;
  /** Các ô đang chạy hiệu ứng đỏ lan từ lá lên gốc */
  pulse: InspectCell[];
}

/**
 * Hai cây của phần 3 "Khám phá bí mật": cây trong sổ (hiện đủ số, viền xanh) và cây bây giờ
 * (chỉ có số gốc, các ô khác là "?"; chỉ bấm được ô mà ô cha đã soi và "khác").
 * Hai cây xếp cạnh nhau từ 640px, xếp trên–dưới ở màn hình hẹp; cây co theo bề rộng nên không phải cuộn ngang.
 */
export function SoiCay({ recorded, inspected, last, canInspect, onInspect, pulse }: SoiCayProps) {
  const isPulse = (c: InspectCell) => pulse.some((p) => p.level === c.level && p.index === c.index);
  const lastKey = last ? cellKey(last) : null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
      {/* Cây trong sổ */}
      <section aria-label={T.soiCayCu} className="space-y-2">
        <h4 className="text-center font-display text-base font-extrabold text-xanh-la-dam">{T.soiCayCu}</h4>
        <div className="relative w-full" style={{ height: TREE_H }}>
          <Lines tone="var(--color-xanh-la-dam)" />
          {ALL_CELLS.map((c) => {
            const key = cellKey(c);
            const seen = Boolean(inspected[key]) && c.level < TOP_LEVEL;
            const ring = key === lastKey ? 'ring-4 ring-vang' : seen ? 'ring-2 ring-vang' : '';
            return (
              <Box key={key} level={c.level} index={c.index} className="z-10">
                <div
                  role="img"
                  aria-label={fmt(T.soiNhanCuaO, { nhan: cellName(c.level, c.index), so: recorded[c.level][c.index] })}
                  className={`${CELL_BASE} border-xanh-la-dam bg-xanh-la/10 text-chu ${ring}`}
                >
                  <span className="font-extrabold uppercase">{cellName(c.level, c.index)}</span>
                  <span className="text-base font-extrabold">{formatNumber(recorded[c.level][c.index])}</span>
                  {c.level === TOP_LEVEL && <span className="font-extrabold text-xanh-la-dam">{T.soiDung}</span>}
                </div>
              </Box>
            );
          })}
        </div>
      </section>

      {/* Cây bây giờ */}
      <section aria-label={fmt(T.soiCayMoi)} className="space-y-2">
        <h4 className="text-center font-display text-base font-extrabold text-do-son-dam">{fmt(T.soiCayMoi)}</h4>
        <div className="relative w-full" style={{ height: TREE_H }}>
          <Lines tone="var(--color-nau-go)" />
          {ALL_CELLS.map((c) => {
            const key = cellKey(c);
            const r = inspected[key];
            const name = cellName(c.level, c.index);
            const pulsing = isPulse(c) ? 'ring-4 ring-do-son/40 animate-pulse' : '';

            if (r) {
              const tone = r.match ? 'border-xanh-la-dam bg-xanh-la/10 text-xanh-la-dam' : 'border-do-son-dam bg-do-son/10 text-do-son-dam';
              return (
                <Box key={key} level={c.level} index={c.index} className="z-10">
                  <div
                    role="img"
                    aria-label={fmt(T.soiNhanKetQua, {
                      nhan: name,
                      so: r.recorded,
                      so2: r.recomputed,
                      ketQua: r.match ? T.soiNhanKhop : T.soiNhanLech,
                    })}
                    className={`${CELL_BASE} ${tone} ${pulsing}`}
                  >
                    <span className="font-extrabold uppercase">{name}</span>
                    <span className="text-base font-extrabold">{formatNumber(r.recomputed)}</span>
                    <span className="font-extrabold">{r.match ? T.soiKhop : T.soiLech}</span>
                  </div>
                </Box>
              );
            }

            const open = canInspect(c);
            return (
              <Box key={key} level={c.level} index={c.index} className="z-10">
                <button
                  type="button"
                  aria-disabled={!open}
                  aria-label={fmt(open ? T.soiNhanChuaSoi : T.soiNhanChuaMo, { nhan: name })}
                  onClick={() => open && onInspect(c)}
                  className={`${CELL_BASE} focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${
                    open
                      ? 'cursor-pointer border-muc-tim bg-white/90 text-chu ring-2 ring-muc-tim/30 hover:bg-muc-tim/10'
                      : 'cursor-default border-dashed border-nau-go/50 bg-giay/60 text-nau-go-dam opacity-70'
                  } ${pulsing}`}
                >
                  <span className="font-extrabold uppercase">{name}</span>
                  <span className="text-base font-extrabold">?</span>
                </button>
              </Box>
            );
          })}
        </div>
      </section>
    </div>
  );
}
