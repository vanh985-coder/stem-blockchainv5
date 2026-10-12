import { useId } from 'react';
import { ui } from '../content/ui';
import { useSettings } from '../settings/SettingsProvider';
import { QUALITY_CHOICES, type QualityChoice } from '../three/quality';
import { Panel } from './Panel';

interface SwitchRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

/** Công tắc bật/tắt: có chữ "Bật"/"Tắt" cạnh nút gạt, không chỉ dựa vào màu. */
function SwitchRow({ label, hint, checked, onChange }: SwitchRowProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p id={`${id}-l`} className="font-display text-lg font-extrabold">
          {label}
        </p>
        <p id={`${id}-d`} className="text-sm text-nau-go-dam">
          {hint}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center gap-2 rounded-nut focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
      >
        <span className="w-8 text-right text-sm font-bold">{checked ? ui.caiDat.bat : ui.caiDat.tat}</span>
        <span
          aria-hidden="true"
          className={`relative h-8 w-14 rounded-full border-2 transition-colors ${
            checked ? 'border-xanh-la-dam bg-xanh-la' : 'border-nau-go bg-giay'
          }`}
        >
          <span
            className={`absolute top-0.5 size-6 rounded-full border-2 border-nau-go bg-white transition-all ${
              checked ? 'left-[26px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
    </div>
  );
}

const QUALITY_LABEL: Record<QualityChoice, string> = {
  auto: ui.caiDat.chatLuongTuDong,
  low: ui.caiDat.chatLuongThap,
  medium: ui.caiDat.chatLuongVua,
  high: ui.caiDat.chatLuongCao,
};

/** Chọn một trong bốn mức chất lượng đồ họa 3D (Tự động, Thấp, Vừa, Cao). */
function QualityRow({ value, onChange }: { value: QualityChoice; onChange: (value: QualityChoice) => void }) {
  const id = useId();
  return (
    <div className="py-2">
      <p id={`${id}-l`} className="font-display text-lg font-extrabold">
        {ui.caiDat.chatLuong}
      </p>
      <p id={`${id}-d`} className="mb-2 text-sm text-nau-go-dam">
        {ui.caiDat.chatLuongGhiChu}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-l`} aria-describedby={`${id}-d`} className="flex flex-wrap gap-2">
        {QUALITY_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={value === choice}
            onClick={() => onChange(choice)}
            className={`min-h-11 min-w-11 cursor-pointer rounded-nut border-2 px-3 font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${
              value === choice ? 'border-xanh-la-dam bg-xanh-la text-white' : 'border-nau-go bg-giay'
            }`}
          >
            {QUALITY_LABEL[choice]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bảng cài đặt "Giảm chuyển động", "Âm thanh", "Chữ to" và "Chất lượng đồ họa"; dùng ở các trang sau. */
export function SettingsPanel({ className = '' }: { className?: string }) {
  const { settings, update } = useSettings();
  return (
    <Panel className={['w-full max-w-md', className].join(' ')} role="group" aria-label={ui.caiDat.tieuDe}>
      <h2 className="mb-2 text-2xl">{ui.caiDat.tieuDe}</h2>
      <SwitchRow
        label={ui.caiDat.giamChuyenDong}
        hint={ui.caiDat.giamChuyenDongGhiChu}
        checked={settings.reducedMotion}
        onChange={(v) => update({ reducedMotion: v })}
      />
      <SwitchRow
        label={ui.caiDat.amThanh}
        hint={ui.caiDat.amThanhGhiChu}
        checked={settings.soundEnabled}
        onChange={(v) => update({ soundEnabled: v })}
      />
      <SwitchRow
        label={ui.caiDat.chuTo}
        hint={ui.caiDat.chuToGhiChu}
        checked={settings.largeText}
        onChange={(v) => update({ largeText: v })}
      />
      <QualityRow value={settings.quality} onChange={(v) => update({ quality: v })} />
    </Panel>
  );
}
