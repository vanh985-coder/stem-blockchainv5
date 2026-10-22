import { useEffect, useRef } from 'react';
import { banDoNho } from '../../../content/minimap';
import type { VillageId } from '../../../village';
import type { WalkApi } from '../../walkApi';
import { MapGlyph, MAP_COLORS as C, StudentArrow } from './MapGlyphs';
import { MapStaticLayer } from './MapStaticLayer';
import type { MapGeometry } from './mapGeometry';
import type { MapMarker } from './mapMarkers';
import { arrowAngleDeg, northPoint, staticTransform, type MapView, type Point } from './mapProjection';
import { newScratch, placeMarker, placeView, type MarkerPlacement } from './miniMapFrame';

/** Cập nhật vị trí mười lần mỗi giây (không render lại React mỗi khung hình). */
export const MINIMAP_TICK_MS = 100;
/** Cỡ ký hiệu (pixel) trên bản đồ nhỏ. */
const GLYPH_R = 5.5;

export interface MiniMapProps {
  geo: MapGeometry;
  /** Ký hiệu của bản đồ nhỏ (xem `mapMarkers`, phạm vi "mini") */
  markers: readonly MapMarker[];
  /** Tên làng theo mã làng */
  names: Readonly<Record<VillageId, string>>;
  api: WalkApi;
  /** Làng em đang ở trong (thu phóng vào bán kính 60), hoặc null */
  inside: VillageId | null;
  /** Bật "Bản đồ xoay theo hướng nhìn" (Cài đặt) */
  rotate: boolean;
  /** Cạnh khung bản đồ (pixel) */
  size: number;
  /** Điện thoại: lời nhãn nút nói "chạm" thay vì "bấm" */
  touch: boolean;
  /** Giảm chuyển động: điểm đến không nhấp nháy */
  reducedMotion: boolean;
  onOpen: () => void;
}

/**
 * Bản đồ nhỏ ở góc trên trái (mốc 2, bước X4), vẽ SVG 2D từ dữ liệu bố cục có sẵn, không dùng camera 3D thứ hai. Phần tĩnh (`MapStaticLayer`) dựng một lần; mười lần mỗi giây một vòng
 * đọc vị trí và hướng nhìn từ `api` rồi chỉ đổi thuộc tính `transform` của các nhóm qua ref (React không render lại). Ký hiệu nằm ở tọa độ màn hình nên không bị xoay theo bản đồ; điểm đến của
 * nhiệm vụ nằm ngoài vòng thì được kéo về mép. Là một nút bấm: bấm (hoặc phím M) mở bản đồ lớn. Có `data-walk-ui` để bấm vào không kéo camera.
 */
export function MiniMap({ geo, markers, names, api, inside, rotate, size, touch, reducedMotion, onOpen }: MiniMapProps) {
  const staticRef = useRef<SVGGElement>(null);
  const arrowRef = useRef<SVGGElement>(null);
  const northRef = useRef<SVGGElement>(null);
  const markerRefs = useRef(new Map<string, SVGGElement>());
  const pinRefs = useRef(new Map<string, SVGGElement>());
  const tickRef = useRef<() => void>(() => undefined);
  const live = useRef({ markers, inside, rotate, size });
  live.current = { markers, inside, rotate, size };

  useEffect(() => {
    const view: MapView = { cx: 0, cz: 0, radius: 1, size, rotation: 0 };
    const pt: Point = { x: 0, y: 0 };
    const scratch = newScratch();
    const placed: MarkerPlacement = { transform: '', pinned: false, pinAngle: 0 };
    const tick = () => {
      const p = api.player;
      if (!p) return;
      const l = live.current;
      placeView(view, p, api.camera.yaw, l.rotate, l.inside !== null, l.size);
      staticRef.current?.setAttribute('transform', staticTransform(view));
      for (const m of l.markers) {
        const el = markerRefs.current.get(m.id);
        if (!el) continue;
        placeMarker(view, m.kind === 'target', m.x, m.z, scratch, placed);
        el.setAttribute('transform', placed.transform);
        if (m.kind === 'target') {
          const pr = pinRefs.current.get(m.id);
          if (pr) {
            pr.setAttribute('display', placed.pinned ? 'inline' : 'none');
            pr.setAttribute('transform', `rotate(${placed.pinAngle.toFixed(0)})`);
          }
        }
      }
      const half = l.size / 2;
      arrowRef.current?.setAttribute('transform', `translate(${half} ${half}) rotate(${arrowAngleDeg(l.rotate, api.camera.yaw).toFixed(0)})`);
      northPoint(view, half - 9, pt);
      northRef.current?.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    };
    tickRef.current = tick;
    tick();
    const id = window.setInterval(tick, MINIMAP_TICK_MS);
    return () => window.clearInterval(id);
  }, [api, size]);
  // ký hiệu mới, đổi thu phóng hay đổi kiểu xoay: đặt đúng chỗ ngay, không đợi nhịp kế tiếp
  useEffect(() => tickRef.current(), [markers, inside, rotate]);

  const half = size / 2;
  return (
    <button
      type="button"
      data-walk-ui
      data-testid="ban-do-nho"
      onClick={onOpen}
      aria-label={touch ? banDoNho.nhanDt : banDoNho.nhan}
      title={touch ? banDoNho.nhanDt : banDoNho.nhan}
      className="pointer-events-auto block shrink-0 cursor-pointer rounded-full border-2 border-nau-go bg-giay p-0 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
      style={{ width: size + 4, height: size + 4 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true" className="block rounded-full">
        <defs>
          <clipPath id="ban-do-nho-cat">
            <circle cx={half} cy={half} r={half} />
          </clipPath>
        </defs>
        <g clipPath="url(#ban-do-nho-cat)">
          <rect width={size} height={size} fill={C.ground} />
          <g ref={staticRef}>
            <MapStaticLayer geo={geo} />
          </g>
          {markers.map((m) => (
            <g
              key={m.id}
              ref={(el) => {
                if (el) markerRefs.current.set(m.id, el);
                else markerRefs.current.delete(m.id);
              }}
              transform={`translate(${half} ${half})`}
            >
              <MapGlyph marker={m} r={GLYPH_R} names={names} fontSize="0.6rem" still={reducedMotion} />
              {m.kind === 'target' && (
                <g
                  display="none"
                  ref={(el) => {
                    if (el) pinRefs.current.set(m.id, el);
                    else pinRefs.current.delete(m.id);
                  }}
                >
                  <path d={`M0 ${-GLYPH_R * 2.6} L${GLYPH_R * 0.9} ${-GLYPH_R * 1.6} L${-GLYPH_R * 0.9} ${-GLYPH_R * 1.6} Z`} fill={C.red} stroke={C.white} strokeWidth={1} />
                </g>
              )}
            </g>
          ))}
          <g ref={arrowRef} transform={`translate(${half} ${half})`}>
            <StudentArrow r={GLYPH_R * 0.95} />
          </g>
        </g>
        <circle cx={half} cy={half} r={half - 1} fill="none" stroke={C.wood} strokeWidth={2} />
        <g ref={northRef} transform={`translate(${half} ${9})`}>
          <circle r={7} fill={C.white} stroke={C.wood} strokeWidth={1} />
          <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.6rem', fontWeight: 800, fill: C.ink }}>
            {banDoNho.bac}
          </text>
        </g>
      </svg>
    </button>
  );
}
