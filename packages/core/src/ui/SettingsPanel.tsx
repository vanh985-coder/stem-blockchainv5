import { useId } from 'react';
import { ui } from '../content/ui';
import { useSettings } from '../settings/SettingsProvider';
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

/** Bảng cài đặt "Giảm chuyển động" và "Chữ to"; dùng ở các trang sau. */
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
    </Panel>
  );
}
