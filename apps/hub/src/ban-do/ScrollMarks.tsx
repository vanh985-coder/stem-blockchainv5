import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapGlyph, VILLAGE_ORDER, banDoThe, fmt, ui, type VillageId } from '@so-chung/core';
import { banDoScrollPoints, layoutScrollIcons, remainingByVillage, worldScrollSpots } from '@so-chung/core/three/world/map/banDoScrolls';

/** Hình thẻ trên bản đồ vẽ tay: cỡ theo bản đồ, không nhỏ hơn 20px (đủ nhìn rõ trên điện thoại). */
export function scrollGlyphSize(mapW: number): number {
  return Math.round(Math.min(30, Math.max(20, mapW / 36)));
}

/** Khoảng hở giữa hình thẻ và khung chữ tên làng (px). */
const LABEL_PAD = 4;

export interface ScrollMarksProps {
  /** Mặt nạ thẻ đã nhặt (hiệu lực) theo làng, cùng nguồn với bảng làng */
  masks: Readonly<Partial<Record<VillageId, number>>>;
  /** Rộng / cao của ảnh bản đồ */
  ratio: number;
  /** Bề rộng bản đồ (px) khi đã biết, để chọn cỡ hình; không biết thì dùng cỡ vừa */
  mapW?: number;
  /** Nơi đặt chú thích khi bản đồ nhỏ (màn hẹp: chú thích nằm NGOÀI bản đồ để không đè lên làng); null thì chú thích nằm góc dưới trái bản đồ */
  legendIn?: HTMLElement | null;
}

interface Layout {
  w: number;
  h: number;
  /** Khung chữ tên của từng làng, tính bằng pixel trong khung bản đồ */
  labels: Partial<Record<VillageId, { cx: number; cy: number; hw: number; hh: number }>>;
}

/**
 * Thẻ "Em có biết?" chưa nhặt trên /ban-do (P2b): hình thoi vàng viền nâu có hai nét trắng, cùng ký hiệu với bản đồ trong game; thẻ đã nhặt không có.
 * Vị trí: quanh điểm làng theo vị trí thật trong làng (`banDoScrollPoints`); thẻ nào vướng chữ tên làng, mép bản đồ hay thẻ khác thì dời lên mép khung chữ của làng mình theo hướng gần hướng thật nhất còn trống (`layoutScrollIcons`).
 * Kèm chú thích có chữ (không chỉ dựa vào màu) và lời đọc màn hình theo từng làng. Lớp phủ không bắt chuột/chạm nên không cản bấm vào làng. Tải lười (chỉ trang này cần dữ liệu bố cục làng).
 */
export default function ScrollMarks({ masks, ratio, mapW = 0, legendIn = null }: ScrollMarksProps) {
  const spots = useMemo(() => worldScrollSpots(), []);
  const points = useMemo(() => banDoScrollPoints({ spots, masks, ratio }), [spots, masks, ratio]);
  const left = useMemo(() => remainingByVillage(points), [points]);
  const layer = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  // Đo khung chữ tên làng (nút làng nằm cùng khung bản đồ) để đẩy thẻ ra khỏi chữ; đo lại khi bản đồ đổi cỡ.
  useLayoutEffect(() => {
    const box = layer.current?.parentElement;
    if (!box) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      const labels: Layout['labels'] = {};
      for (const el of box.querySelectorAll<HTMLElement>('button[data-village]')) {
        const r = el.getBoundingClientRect();
        labels[el.dataset.village as VillageId] = { cx: r.left + r.width / 2 - b.left, cy: r.top + r.height / 2 - b.top, hw: r.width / 2, hh: r.height / 2 };
      }
      setLayout({ w: b.width, h: b.height, labels });
    };
    measure();
    // Đo lại khi khung bản đồ HOẶC chữ tên làng đổi cỡ (ví dụ phông chữ tải xong làm tên làng rộng ra) hoặc phông chữ sẵn sàng.
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    for (const el of box.querySelectorAll('button[data-village]')) ro.observe(el);
    let alive = true;
    void document.fonts?.ready.then(() => { if (alive) measure(); });
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  const px = mapW > 0 ? scrollGlyphSize(mapW) : 20;
  const placed = useMemo(() => {
    // Chưa đo được (khung bản đồ chưa có kích thước thật) thì tạm đặt theo %, đo xong sẽ xếp lại.
    if (!layout || layout.w < 50 || layout.h < 30) return points.map((p) => ({ ...p, left: `${p.x}%`, top: `${p.y}%` }));
    const out = layoutScrollIcons({
      icons: points.map((p) => ({ id: p.id, village: p.village, x: (p.x / 100) * layout.w, y: (p.y / 100) * layout.h })),
      labels: layout.labels,
      w: layout.w,
      h: layout.h,
      glyph: px,
      pad: LABEL_PAD,
    });
    return points.map((p, i) => ({ ...p, left: `${out[i].x}px`, top: `${out[i].y}px` }));
  }, [points, layout, px]);
  const total = spots.length;
  const legend = (
    <div className={`pointer-events-none flex items-center gap-2 rounded-nut border-2 border-nau-go bg-giay px-2 py-1 text-sm font-bold leading-snug ${legendIn ? 'w-fit max-w-full' : 'absolute bottom-2 left-2 max-w-[calc(100%-1rem)]'}`} data-testid="ban-do-chu-thich-the">
      <svg width={22} height={22} viewBox="-11 -11 22 22" aria-hidden="true" className="shrink-0">
        <MapGlyph marker={{ id: 'chu-thich', kind: 'scroll', x: 0, z: 0, village: 'lang-giay', index: 0 }} r={8} />
      </svg>
      <span>
        {banDoThe.chuThich}: {points.length > 0 ? fmt(banDoThe.conLai, { n: points.length, tong: total }) : banDoThe.het}
      </span>
    </div>
  );
  return (
    <>
      <div ref={layer} className="pointer-events-none absolute inset-0" data-testid="ban-do-lop-the" aria-hidden="true">
        {placed.map((p) => (
          <span key={p.id} data-testid="ban-do-the" data-village={p.village} data-index={p.index} style={{ left: p.left, top: p.top, width: px, height: px }} className="absolute -translate-x-1/2 -translate-y-1/2">
            <svg width={px} height={px} viewBox="-10 -10 20 20" className="block">
              <MapGlyph marker={{ id: p.id, kind: 'scroll', x: 0, z: 0, village: p.village, index: p.index }} r={8} />
            </svg>
          </span>
        ))}
      </div>
      {legendIn ? createPortal(legend, legendIn) : legend}
      <ul className="sr-only" data-testid="ban-do-the-doc">
        <li>{banDoThe.viTri}</li>
        {VILLAGE_ORDER.map((id) => (
          <li key={id}>{fmt(banDoThe.theoLang, { lang: ui.lang[id], n: left[id] })}</li>
        ))}
      </ul>
    </>
  );
}
