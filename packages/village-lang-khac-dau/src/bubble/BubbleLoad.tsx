import { useLayoutEffect, useRef, useState } from 'react';
import { Button, bubbleUi, fmt, plainPower, rich } from '@so-chung/core';
import type { BubbleImages } from './bubbleArt';
import { EggIcon } from './EggIcon';
import { slotOf, slotsOfPlan } from './bubbleSlots';
import { loadComplete, planOf, type BubbleState } from './bubbleLogic';

export interface BubbleLoadProps {
  state: BubbleState;
  images: BubbleImages;
  reduced: boolean;
  /** Em bấm một trứng ở khay; trả về kết quả của luật ('dung', 'sai', 'bo-qua') */
  onPick: (id: number) => 'dung' | 'sai' | 'bo-qua';
  onStart: () => void;
}

/**
 * Bước nạp trứng (trước mỗi đợt, không tính giờ): khay có các trứng ghi mẫu công khai đúng lẫn trứng nhiễu; bấm trứng đúng thì trứng bay vào máy bắn, bấm sai thì bật ra
 * (rung) và đợt đó mất thưởng nạp. Hình trứng vẽ bằng canvas (`EggIcon`); khung HTML để bàn phím và trình đọc màn hình dùng được.
 */
export function BubbleLoad({ state, images, reduced, onPick, onStart }: BubbleLoadProps) {
  const plan = planOf(state);
  const slots = slotsOfPlan(plan);
  const need = plan.keys.length;
  const done = loadComplete(state);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const trayEls = useRef(new Map<number, HTMLButtonElement>());
  const slotEls = useRef<(HTMLSpanElement | null)[]>([]);
  const fromRect = useRef(new Map<number, DOMRect>());

  // trứng đúng bay từ khay vào chỗ nạp
  const picked = state.load.picked.length;
  useLayoutEffect(() => {
    if (picked === 0 || reduced) return;
    const id = state.load.picked[picked - 1];
    const from = fromRect.current.get(id);
    const slot = slotEls.current[picked - 1];
    if (!from || !slot || typeof slot.animate !== 'function') return;
    const to = slot.getBoundingClientRect();
    slot.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(1.1)` }, { transform: 'translate(0, 0) scale(1)' }], { duration: 280, easing: 'ease-out' });
  }, [picked, reduced, state.load.picked]);

  const pick = (id: number, value: number, el: HTMLButtonElement) => {
    fromRect.current.set(id, el.getBoundingClientRect());
    const r = onPick(id);
    if (r === 'dung') setMsg({ text: fmt(bubbleUi.napDung, { y: value }), ok: true });
    else if (r === 'sai') {
      setMsg({ text: fmt(bubbleUi.napSai, { y: value }), ok: false });
      if (!reduced && typeof el.animate === 'function') el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-1 sm:p-2" data-testid="nap-trung">
      <h2 className="font-display text-lg font-extrabold leading-tight sm:text-xl">{fmt(bubbleUi.napTieuDe, { so: state.round + 1, max: state.spec.rounds.length })}</h2>
      <p className="text-sm font-bold leading-snug sm:text-base">{rich(bubbleUi.napHuongDan)}</p>

      <div id="tutorial-man9-tray" role="group" aria-label={bubbleUi.khayDoc} className="rounded-2xl border-[3px] border-nau-go bg-white/60 p-2" data-testid="khay-nap">
        <p className="mb-1 font-display text-sm font-extrabold">{bubbleUi.khay}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {plan.tray.map((e) => {
            const taken = state.load.picked.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                data-testid="trung-khay"
                data-value={e.value}
                data-taken={taken ? '1' : '0'}
                disabled={taken}
                aria-label={fmt(bubbleUi.trungKhay, { y: e.value })}
                ref={(el) => {
                  if (el) trayEls.current.set(e.id, el);
                  else trayEls.current.delete(e.id);
                }}
                onClick={(ev) => pick(e.id, e.value, ev.currentTarget)}
                className={`grid size-[4.25rem] min-h-11 min-w-11 cursor-pointer place-items-center rounded-2xl border-[3px] border-nau-go bg-giay outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${taken ? 'invisible' : ''}`}
              >
                <EggIcon value={e.value} slot={slotOf(slots, e.value)} size={56} images={images} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border-[3px] border-nau-go bg-white/60 p-2" data-testid="may-nap">
        <p className="mb-1 font-display text-sm font-extrabold">{bubbleUi.mayBan}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: need }, (_, i) => {
            const id = state.load.picked[i];
            const egg = plan.tray.find((t) => t.id === id);
            return (
              <span
                key={i}
                ref={(el) => {
                  slotEls.current[i] = el;
                }}
                role="img"
                aria-label={egg ? fmt(bubbleUi.chonNap, { so: i + 1, y: egg.value }) : fmt(bubbleUi.chonTrong, { so: i + 1 })}
                data-testid="cho-nap"
                data-filled={egg ? '1' : '0'}
                className={`grid size-[4.25rem] place-items-center rounded-full border-[3px] ${egg ? 'border-nau-go bg-giay' : 'border-dashed border-nau-go/60'}`}
              >
                {egg && <EggIcon value={egg.value} slot={slotOf(slots, egg.value)} size={56} images={images} />}
              </span>
            );
          })}
        </div>
      </div>

      <p role="status" aria-live="polite" className={`min-h-[2.5rem] text-sm font-extrabold leading-snug sm:text-base ${msg && !msg.ok ? 'text-do-son-dam' : 'text-xanh-la-dam'}`} data-testid="nap-thong-bao">
        {msg ? (
          <>
            <span className="sr-only">{plainPower(msg.text)}</span>
            <span aria-hidden="true">{rich(msg.text)}</span>
          </>
        ) : done ? (
          fmt(bubbleUi.napXong, { so: state.round + 1 })
        ) : (
          fmt(bubbleUi.napCon, { so: need - picked })
        )}
      </p>

      <Button size="lg" className="min-h-11 self-center" disabled={!done} onClick={onStart} data-testid="nut-bat-dau">
        {fmt(bubbleUi.batDau, { so: state.round + 1 })}
      </Button>
    </div>
  );
}
