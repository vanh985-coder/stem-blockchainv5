import { useState } from 'react';
import { AssetImage } from '../assets/AssetImage';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { VILLAGE_ORDER } from '../content/levels';
import { useSettings } from '../settings/SettingsProvider';
import { Button } from '../ui/Button';
import { DialogueBox } from '../ui/DialogueBox';
import { Panel } from '../ui/Panel';
import type { VillageId } from '../village';
import { withMoods } from './flow';
import type { GoldenAward } from './types';

/**
 * Cảnh trao Trang Sổ Vàng (spec 04 mục 5, ở mốc 1): trang giấy vàng bay vào ô Trang Sổ Vàng của làng,
 * người dẫn nói lời "Kết thúc làng", rồi nút "Về bản đồ". Bật "Giảm chuyển động" thì trang hiện ngay trong ô, không bay.
 */
export function GoldenPageScene({
  villageId,
  award,
  onLeave,
}: {
  villageId: VillageId;
  award: GoldenAward;
  onLeave: () => void;
}) {
  const { settings } = useSettings();
  const [talked, setTalked] = useState(false);
  const index = VILLAGE_ORDER.indexOf(villageId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Panel className="space-y-4 text-center">
        <h2 className="text-2xl">{award.chuThich}</h2>
        <ul className="flex items-center justify-center gap-2" aria-label={fmt(ui.moKhoa.trangSoVang, { so: index + 1, max: VILLAGE_ORDER.length })}>
          {VILLAGE_ORDER.map((id, i) => {
            const got = i <= index;
            const arriving = i === index;
            return (
              <li
                key={id}
                className={`relative grid size-16 place-items-center overflow-visible rounded-2xl border-2 ${
                  got ? 'border-vang-dam bg-vang/40' : 'border-dashed border-nau-go bg-giay/60'
                }`}
              >
                <AssetImage
                  path="ui/icons/trang-vang"
                  alt=""
                  className={`size-12 object-contain ${got ? '' : 'grayscale opacity-30'} ${
                    arriving && !settings.reducedMotion ? 'animate-golden-fly' : ''
                  }`}
                />
                <span className="sr-only">
                  {fmt(ui.banDo.trangSo, { so: i + 1 })}: {got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {!talked ? (
        <DialogueBox turns={withMoods(award.loi, 'award')} onFinish={() => setTalked(true)} />
      ) : (
        <div className="flex flex-col items-center gap-3">
          {award.ghiChuCuoi && <p className="text-center font-display text-2xl font-extrabold">{award.ghiChuCuoi}</p>}
          <Button size="lg" autoFocus onClick={onLeave}>
            {ui.baiHoc.veBanDo}
          </Button>
        </div>
      )}
    </div>
  );
}
