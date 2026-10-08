import { useEffect } from 'react';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';
import { Button } from './Button';
import { Panel } from './Panel';
import { PortraitFrame } from './PortraitFrame';

export interface LevelFailedProps {
  /** Mẹo cho lượt chơi sau */
  tip: string;
  onRetry: () => void;
  onExit?: () => void;
}

/** Màn hết tim: lời động viên, mẹo cho lần sau, nút "Thử lại" và "Về bản đồ". */
export function LevelFailed({ tip, onRetry, onExit }: LevelFailedProps) {
  useEffect(() => {
    sound.playWrong();
  }, []);

  return (
    <Panel className="mx-auto w-full max-w-md space-y-4 text-center" role="alert">
      <div className="flex justify-center">
        <PortraitFrame portrait="bi" size={96} />
      </div>
      <h2 className="text-3xl text-do-son-dam">{ui.hetTim.tieuDe}</h2>
      <p className="text-base">{ui.hetTim.loiDongVien}</p>
      <div className="rounded-2xl border-2 border-do-son/40 bg-do-son/10 p-4 text-left">
        <div className="mb-1 text-sm font-bold uppercase tracking-wider text-do-son-dam">
          <span aria-hidden="true">💡 </span>
          {ui.hetTim.meoTieuDe}
        </div>
        <p className="text-lg font-semibold leading-relaxed">{tip}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        {onExit && (
          <Button variant="secondary" onClick={onExit}>
            {ui.hetTim.veBanDo}
          </Button>
        )}
        <Button variant="danger" autoFocus onClick={onRetry}>
          {ui.hetTim.thuLai}
        </Button>
      </div>
    </Panel>
  );
}
