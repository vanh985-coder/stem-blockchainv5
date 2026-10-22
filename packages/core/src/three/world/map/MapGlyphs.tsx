import type { ReactNode } from 'react';
import type { MapMarker } from './mapMarkers';

/** Màu bản đồ (cùng tông với theme: xanh lá, vàng, đỏ son, nâu gỗ). Ngoài những màu này, ký hiệu còn khác nhau về HÌNH để không chỉ dựa vào màu. */
export const MAP_COLORS = {
  ground: '#cfe2a6',
  groundBig: '#cfe2a6',
  market: '#ead9aa',
  plaza: '#dcc78f',
  roadDat: '#c9915b',
  roadGach: '#d9a98a',
  river: '#6fb7d8',
  bridge: '#8a5a3b',
  house: '#a35f3f',
  outlineBuilt: '#2f7d3a',
  outlineUnbuilt: '#7a9d57',
  villageFill: '#d6e9b2',
  green: '#3fa34d',
  gold: '#f2b33d',
  grey: '#9a948a',
  red: '#d94a38',
  wood: '#8a5a3b',
  ink: '#3b2a20',
  purple: '#5b3fd6',
  white: '#ffffff',
} as const;

const C = MAP_COLORS;

/** Ổ khóa nhỏ màu trắng (thân và quai), vẽ quanh gốc, cỡ theo `r`. */
function Lock({ r }: { r: number }) {
  return (
    <>
      <rect x={-0.42 * r} y={-0.05 * r} width={0.84 * r} height={0.62 * r} rx={0.1 * r} fill={C.white} />
      <path d={`M${-0.26 * r} ${-0.05 * r} v${-0.26 * r} a${0.26 * r} ${0.26 * r} 0 0 1 ${0.52 * r} 0 v${0.26 * r}`} fill="none" stroke={C.white} strokeWidth={0.2 * r} />
    </>
  );
}

export interface GlyphProps {
  marker: MapMarker;
  /** Bán kính ký hiệu (đơn vị của khung vẽ: pixel ở bản đồ nhỏ, đơn vị thế giới ở bản đồ lớn) */
  r: number;
  /** Tên làng theo mã làng (chỉ dùng cho ký hiệu tên) */
  names?: Readonly<Record<string, string>>;
  /** Cỡ chữ tên làng (css, ví dụ "0.62rem") */
  fontSize?: string;
  /** Bỏ hiệu ứng nhấp nháy (Giảm chuyển động) */
  still?: boolean;
}

/** Ký hiệu một điểm trên bản đồ, vẽ quanh gốc (0, 0). Không có chữ tiếng Việt cứng: tên lấy từ `names`. */
export function MapGlyph({ marker, r, names, fontSize = '0.62rem', still = true }: GlyphProps): ReactNode {
  switch (marker.kind) {
    case 'gate':
      return (
        <g data-glyph="gate" data-open={marker.open ? '1' : '0'}>
          <rect x={-r} y={-r} width={2 * r} height={2 * r} rx={0.3 * r} fill={marker.open ? C.green : C.grey} stroke={C.ink} strokeWidth={1} />
          {marker.open ? <path d={`M${-0.45 * r} ${0.6 * r} v${-0.55 * r} a${0.45 * r} ${0.45 * r} 0 0 1 ${0.9 * r} 0 v${0.55 * r}`} fill="none" stroke={C.white} strokeWidth={0.22 * r} /> : <Lock r={r} />}
        </g>
      );
    case 'board':
      return (
        <g data-glyph="board" data-mark={marker.mark}>
          {marker.mark === 'soon' ? (
            <>
              <circle r={r} fill={C.white} stroke={C.wood} strokeWidth={1.2} strokeDasharray="2 2" />
              <circle cx={-0.45 * r} r={0.14 * r} fill={C.wood} />
              <circle r={0.14 * r} fill={C.wood} />
              <circle cx={0.45 * r} r={0.14 * r} fill={C.wood} />
            </>
          ) : (
            <>
              <circle r={r} fill={marker.mark === 'done' ? C.green : marker.mark === 'open' ? C.gold : C.grey} stroke={C.ink} strokeWidth={1} />
              {marker.mark === 'done' && <path d={`M${-0.45 * r} ${0.02 * r} l${0.3 * r} ${0.32 * r} l${0.6 * r} ${-0.62 * r}`} fill="none" stroke={C.white} strokeWidth={0.24 * r} strokeLinecap="round" strokeLinejoin="round" />}
              {marker.mark === 'open' && <path d={`M${-0.25 * r} ${-0.45 * r} L${0.5 * r} 0 L${-0.25 * r} ${0.45 * r} Z`} fill={C.ink} />}
              {marker.mark === 'locked' && <Lock r={r} />}
            </>
          )}
        </g>
      );
    case 'scroll':
      return (
        <g data-glyph="scroll">
          <rect x={-0.78 * r} y={-0.78 * r} width={1.56 * r} height={1.56 * r} transform="rotate(45)" fill={C.gold} stroke={C.wood} strokeWidth={1.2} />
          <path d={`M${-0.35 * r} ${-0.1 * r} h${0.7 * r} M${-0.3 * r} ${0.15 * r} h${0.55 * r}`} stroke={C.white} strokeWidth={0.2 * r} strokeLinecap="round" />
        </g>
      );
    case 'target':
      return (
        <g data-glyph="target">
          <circle r={1.25 * r} fill="none" stroke={C.red} strokeWidth={2.2} className={still ? undefined : 'animate-pulse'} />
          <circle r={0.6 * r} fill={C.red} stroke={C.white} strokeWidth={1.2} />
        </g>
      );
    case 'name':
      return (
        <text textAnchor="middle" dominantBaseline="middle" data-glyph="name" style={{ fontSize, fontWeight: 800, fill: C.ink, stroke: C.white, strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' }}>
          {names?.[marker.village] ?? ''}
        </text>
      );
  }
}

/** Mũi tên chỉ hướng em đang nhìn (đỉnh mũi tên ở phía trên, vẽ quanh gốc), cỡ theo `r`. */
export function StudentArrow({ r }: { r: number }): ReactNode {
  return (
    <path d={`M0 ${-1.3 * r} L${r} ${r} L0 ${0.45 * r} L${-r} ${r} Z`} fill={C.purple} stroke={C.white} strokeWidth={1.6} strokeLinejoin="round" data-glyph="student" />
  );
}
