import { useMemo } from 'react';
import { MAP_COLORS, MapGlyph, MapStaticLayer, banDoThe, fmt, knowScrollUi, staticTransform, ui, type VillageId } from '@so-chung/core';
import { VILLAGE_MAP_SIZE, villageMapData } from '@so-chung/core/three/world/map/banDoScrolls';

/** Bán kính hình thẻ trong khung vẽ (đơn vị khung; khung nở theo bề rộng bảng làng). */
const GLYPH_R = 11;

const khuOf = (zone: string): string => (knowScrollUi.khu as Record<string, string>)[zone] ?? zone;

export interface VillageScrollMapProps {
  village: VillageId;
  /** Mặt nạ thẻ đã nhặt (hiệu lực), cùng nguồn với bảng làng */
  mask: number;
}

/**
 * Vùng bản đồ làng trên /ban-do (P2b): bố cục THẬT của làng (cùng hình học `buildMapGeometry` và phép chiếu `project` của bản đồ trong game, bắc ở trên), phóng to vừa làng.
 * Thẻ "Em có biết?" chưa nhặt là hình thoi vàng đặt ĐÚNG tọa độ trong làng (không dịch để tránh chữ); số thứ tự nằm sát hình, tên khu ghi ở danh sách bên dưới nên không có nhãn nào đè lên bản đồ.
 * Thẻ nhặt xong không còn trên bản đồ (mặt nạ cùng nguồn với bảng làng). Không dựng cảnh 3D. Tải lười. Không dùng bóng hay bộ lọc, không chuyển động.
 */
export default function VillageScrollMap({ village, mask }: VillageScrollMapProps) {
  const data = useMemo(() => villageMapData(village, mask), [village, mask]);
  const left = data.scrolls.filter((s) => !s.got);
  const lang = fmt(ui.lang[village]);
  if (left.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-xanh-la bg-xanh-la/15 p-3 text-sm font-semibold" data-testid="ban-do-the-het" data-village={village}>
        {fmt(banDoThe.het, { lang })}
      </p>
    );
  }
  return (
    <section className="space-y-2 rounded-2xl border-2 border-vang bg-vang/15 p-3" data-testid="ban-do-lang-the" data-village={village} aria-label={fmt(banDoThe.docVung, { lang })}>
      <h3 className="font-display text-lg font-extrabold leading-snug">{banDoThe.tieuDe}</h3>
      <p className="text-sm font-semibold">{fmt(banDoThe.conLai, { n: left.length, tong: data.scrolls.length, lang })}</p>
      <svg
        viewBox={`0 0 ${VILLAGE_MAP_SIZE} ${VILLAGE_MAP_SIZE}`}
        className="block w-full rounded-xl border-2 border-nau-go"
        style={{ background: MAP_COLORS.ground, aspectRatio: '1 / 1' }}
        role="img"
        aria-label={fmt(banDoThe.docVung, { lang })}
        data-testid="ban-do-ban-do-lang"
        data-size={VILLAGE_MAP_SIZE}
      >
        <g transform={staticTransform(data.view)}>
          <MapStaticLayer geo={data.geo} />
        </g>
        <text x={VILLAGE_MAP_SIZE / 2} y={14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 800, fill: MAP_COLORS.ink, stroke: MAP_COLORS.white, strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' }}>
          {banDoThe.bac}
        </text>
        {left.map((s) => (
          <g key={s.index} transform={`translate(${s.px.toFixed(2)} ${s.py.toFixed(2)})`} data-testid="ban-do-the" data-village={village} data-index={s.index} data-px={s.px.toFixed(2)} data-py={s.py.toFixed(2)}>
            <MapGlyph marker={{ id: `scroll:${village}:${s.index}`, kind: 'scroll', x: s.x, z: s.z, village, index: s.index }} r={GLYPH_R} />
            <circle cx={GLYPH_R * 1.15} cy={-GLYPH_R * 1.15} r={GLYPH_R * 0.62} fill={MAP_COLORS.ink} stroke={MAP_COLORS.white} strokeWidth={1.2} />
            <text x={GLYPH_R * 1.15} y={-GLYPH_R * 1.15} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 800, fill: MAP_COLORS.white }}>
              {s.index + 1}
            </text>
          </g>
        ))}
      </svg>
      <ul className="space-y-1 text-sm font-semibold" data-testid="ban-do-the-ds">
        {left.map((s) => (
          <li key={s.index} className="flex items-center gap-2">
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-chu text-xs font-extrabold text-white">
              {s.index + 1}
            </span>
            <span className="sr-only">{fmt(banDoThe.docThe, { so: s.index + 1, khu: khuOf(s.zone) })}</span>
            <span aria-hidden="true">{fmt(banDoThe.dong, { khu: khuOf(s.zone) })}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-xs font-semibold text-nau-go-dam" data-testid="ban-do-chu-thich-the">
        <svg width="22" height="22" viewBox="-14 -14 28 28" aria-hidden="true">
          <MapGlyph marker={{ id: 'chu-thich', kind: 'scroll', x: 0, z: 0, village, index: 0 }} r={11} />
        </svg>
        <span>{banDoThe.chuThich}. {banDoThe.viTri}</span>
      </p>
    </section>
  );
}
