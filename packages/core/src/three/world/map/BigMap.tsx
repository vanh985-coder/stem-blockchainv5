import { useEffect, useRef } from 'react';
import { fmt } from '../../../content/characters';
import { banDoNho } from '../../../content/minimap';
import type { VillageId } from '../../../village';
import { Panel } from '../../../ui/Panel';
import { MapGlyph, MAP_COLORS as C, StudentArrow } from './MapGlyphs';
import { MapStaticLayer } from './MapStaticLayer';
import type { MapGeometry } from './mapGeometry';
import type { MapMarker } from './mapMarkers';
import type { VillageProgress } from './mapProgress';
import { WORLD_BOUNDS } from '../worldFrames';

/** Ký hiệu mẫu cho phần chú thích. */
const SAMPLES: { key: keyof typeof banDoNho.chuThich; marker: MapMarker | null }[] = [
  { key: 'congMo', marker: { id: 'x1', kind: 'gate', x: 0, z: 0, village: 'lang-giay', open: true } },
  { key: 'congKhoa', marker: { id: 'x2', kind: 'gate', x: 0, z: 0, village: 'lang-giay', open: false } },
  { key: 'manXong', marker: { id: 'x3', kind: 'board', x: 0, z: 0, village: 'lang-giay', level: 1, mark: 'done' } },
  { key: 'manMo', marker: { id: 'x4', kind: 'board', x: 0, z: 0, village: 'lang-giay', level: 1, mark: 'open' } },
  { key: 'manKhoa', marker: { id: 'x5', kind: 'board', x: 0, z: 0, village: 'lang-giay', level: 1, mark: 'locked' } },
  { key: 'sapRaMat', marker: { id: 'x6', kind: 'board', x: 0, z: 0, village: 'lang-giay', level: 1, mark: 'soon' } },
  { key: 'the', marker: { id: 'x7', kind: 'scroll', x: 0, z: 0, village: 'lang-giay', index: 0 } },
  { key: 'diemDen', marker: { id: 'x8', kind: 'target', x: 0, z: 0 } },
  { key: 'em', marker: null },
];

export interface BigMapProps {
  geo: MapGeometry;
  /** Ký hiệu của bản đồ lớn (xem `mapMarkers`, phạm vi "big") */
  markers: readonly MapMarker[];
  names: Readonly<Record<VillageId, string>>;
  /** Vị trí và hướng nhìn của em lúc mở bản đồ (game đang tạm dừng nên không đổi), hoặc null */
  player: { x: number; z: number; yaw: number } | null;
  progress: readonly VillageProgress[];
  /** Dòng nhiệm vụ đã qua fmt (không kèm chữ "Nhiệm vụ:") */
  quest: string;
  touch: boolean;
  reducedMotion: boolean;
  onClose: () => void;
}

const VIEW = WORLD_BOUNDS;

/**
 * Bản đồ lớn (mốc 2, bước X4): toàn thế giới nhìn từ trên xuống, hướng bắc ở trên, kèm chú thích ký hiệu, tiến độ từng làng (màn đã xong, thẻ "Em có biết?", Trang Sổ Vàng) và dòng "Việc tiếp theo".
 * Mở bằng phím M hoặc chạm bản đồ nhỏ; đóng bằng Esc, M hay nút Đóng. Nơi gọi tạm dừng điều khiển và nhả khóa chuột khi mở. Vẽ SVG 2D từ cùng hình học với bản đồ nhỏ (đặt một lần, không cập nhật).
 */
export function BigMap({ geo, markers, names, player, progress, quest, touch, reducedMotion, onClose }: BigMapProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyM') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-3" data-testid="ban-do-lon" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl">
        <Panel role="dialog" aria-modal="true" aria-labelledby="ban-do-lon-tieu-de" padded={false} className="space-y-2 p-3 sm:p-4" style={{ boxShadow: 'none' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="ban-do-lon-tieu-de" className="text-xl sm:text-2xl">
              {banDoNho.tieuDe}
            </h2>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label={banDoNho.dongNhan}
              className="min-h-11 min-w-11 cursor-pointer rounded-nut border-2 border-nau-go bg-giay px-3 font-display text-base font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
            >
              {banDoNho.dong}
            </button>
          </div>
          <p className="rounded-nut border-2 border-vang-dam bg-vang/30 px-3 py-1 font-display text-sm font-extrabold sm:py-2 sm:text-base" data-testid="viec-tiep-theo">
            {fmt(banDoNho.viecTiepTheo, { nd: quest })}
          </p>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_19rem]">
            <svg viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`} role="img" aria-label={banDoNho.tieuDe} className="mx-auto block aspect-square w-full max-w-[min(100%,60vh)] rounded-bang border-2 border-nau-go" style={{ background: C.ground }}>
              <g transform="scale(-1 -1)">
                <MapStaticLayer geo={geo} />
              </g>
              {markers.map((m) => (
                <g key={m.id} transform={`translate(${-m.x} ${-m.z})`}>
                  <MapGlyph marker={m} r={m.kind === 'name' ? 0 : 7} names={names} fontSize="1.05rem" still={reducedMotion} />
                </g>
              ))}
              <text x={0} y={-VIEW + 18} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '1.05rem', fontWeight: 800, fill: C.ink, stroke: C.white, strokeWidth: 3, paintOrder: 'stroke' }}>
                {banDoNho.bac}
              </text>
              <text x={0} y={0} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.8rem', fontWeight: 800, fill: C.ink, stroke: C.white, strokeWidth: 3, paintOrder: 'stroke' }}>
                {banDoNho.cho}
              </text>
              {player && (
                <g transform={`translate(${-player.x} ${-player.z}) rotate(${((-player.yaw * 180) / Math.PI).toFixed(0)})`} data-testid="ban-do-lon-em">
                  <StudentArrow r={9} />
                </g>
              )}
            </svg>
            <div className="space-y-3">
              <section aria-labelledby="ban-do-tien-do">
                <h3 id="ban-do-tien-do" className="mb-1 text-base">
                  {banDoNho.tienDoTieuDe}
                </h3>
                <ul className="space-y-1.5">
                  {progress.map((p) => (
                    <li key={p.id} className="rounded-nut border-2 border-nau-go/50 bg-giay/70 px-2 py-1 text-xs leading-snug" data-testid={`tien-do-${p.id}`}>
                      <p className="font-display text-sm font-extrabold">{names[p.id]}</p>
                      <p>{fmt(banDoNho.tienDoMan, { xong: p.levelsDone, tong: p.levelsTotal })}</p>
                      {p.cards && <p>{fmt(banDoNho.tienDoThe, { xong: p.cards.got, tong: p.cards.total })}</p>}
                      <p>{p.page ? banDoNho.tienDoTrangCo : banDoNho.tienDoTrangChua}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="ban-do-chu-thich">
                <h3 id="ban-do-chu-thich" className="mb-1 text-base">
                  {banDoNho.chuThichTieuDe}
                </h3>
                <ul className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2 md:grid-cols-1">
                  {SAMPLES.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <svg width={22} height={22} viewBox="-11 -11 22 22" aria-hidden="true" className="shrink-0">
                        {s.marker ? <MapGlyph marker={s.marker} r={7} still /> : <StudentArrow r={8} />}
                      </svg>
                      <span>{banDoNho.chuThich[s.key]}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <span className="grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-nau-go bg-white text-[11px] font-extrabold">{banDoNho.bac}</span>
                    <span>{banDoNho.chuThich.bac}</span>
                  </li>
                </ul>
              </section>
              <p className="text-xs text-nau-go-dam">{touch ? banDoNho.huongDanDt : banDoNho.huongDan}</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
