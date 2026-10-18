import { AssetImage } from '../../assets/AssetImage';
import { fmt } from '../../content/characters';
import { VILLAGE_ORDER } from '../../content/levels';
import { ui } from '../../content/ui';

/**
 * Hàng 4 ô Trang Sổ Vàng trong cảnh trao trang (spec 05 "Kết thúc làng", spec 04 mục 5): các trang đã có sáng, trang vừa nhận (`arriving`, thứ tự từ 0) bay vào ô của nó
 * (bật "Giảm chuyển động" thì nằm sẵn trong ô, không bay). Đặt làm `extra` của một lượt VnDialog.
 */
export function GoldenPagesRow({ arriving, reducedMotion }: { arriving: number; reducedMotion: boolean }) {
  return (
    <ul className="mt-2 flex items-center justify-center gap-2" aria-label={fmt(ui.moKhoa.trangSoVang, { so: arriving + 1, max: VILLAGE_ORDER.length })} data-testid="hang-trang-vang">
      {VILLAGE_ORDER.map((id, i) => {
        const got = i <= arriving;
        const flying = i === arriving && !reducedMotion;
        return (
          <li key={id} className={`relative grid size-14 place-items-center overflow-visible rounded-2xl border-2 ${got ? 'border-vang-dam bg-vang/40' : 'border-dashed border-nau-go bg-giay/60'}`}>
            <AssetImage path="ui/icons/trang-vang" alt="" className={`size-11 object-contain ${got ? '' : 'opacity-30 grayscale'} ${flying ? 'animate-golden-fly' : ''}`} />
            <span className="sr-only">
              {fmt(ui.banDo.trangSo, { so: i + 1 })}: {got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
