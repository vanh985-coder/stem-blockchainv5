import { memo } from 'react';
import { MAP_COLORS as C } from './MapGlyphs';
import type { MapGeometry } from './mapGeometry';

/**
 * Phần tĩnh của bản đồ (mốc 2, bước X4): chợ, đường, sông, cầu, ao, nhà, viền các làng, vẽ bằng tọa độ thế giới (x, z). Nơi dùng bọc trong một nhóm có `transform` đưa tọa độ thế giới lên màn hình
 * (bản đồ nhỏ đổi `transform` mười lần mỗi giây, bản đồ lớn đặt một lần). Chỉ vẽ lại khi hình học đổi (đã `memo`). Không dùng đổ bóng hay bộ lọc; nét viền dùng `non-scaling-stroke` nên độ dày giữ nguyên khi thu phóng.
 */
export const MapStaticLayer = memo(function MapStaticLayer({ geo }: { geo: MapGeometry }) {
  return (
    <g data-testid="ban-do-tinh">
      {geo.outlines.map((o) => (
        <circle key={o.village} cx={o.cx} cy={o.cz} r={o.r} fill={o.built ? C.villageFill : 'none'} stroke={o.built ? C.outlineBuilt : C.outlineUnbuilt} strokeWidth={o.built ? 2.2 : 1.6} strokeDasharray={o.built ? undefined : '5 4'} vectorEffect="non-scaling-stroke" />
      ))}
      <circle r={geo.market.r} fill={C.market} />
      <circle r={geo.market.plaza} fill={C.plaza} />
      {geo.river.map((d, i) => (
        <path key={i} d={d} fill={C.river} />
      ))}
      {geo.ponds.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.z} r={p.r} fill={C.river} />
      ))}
      {geo.roads.map((r, i) => (
        <path key={i} d={r.d} fill="none" stroke={r.kind === 'gach' ? C.roadGach : C.roadDat} strokeWidth={r.width} strokeLinecap="butt" />
      ))}
      <rect x={geo.bridge.x0} y={geo.bridge.z0} width={geo.bridge.x1 - geo.bridge.x0} height={geo.bridge.z1 - geo.bridge.z0} fill={C.bridge} />
      {geo.houses && <path d={geo.houses} fill={C.house} />}
    </g>
  );
});
